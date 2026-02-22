"""
SchemaContext — Rich schema loader + LLM prompt formatter.
============================================================
Loads the FULL field registry (entity, field_name, field_type, sample_values,
null_rate, distinct_count) plus SchemaProfile semantic roles and formats it
compactly for LLM consumption.

Replaces SchemaResolver with a richer context that lets the LLM see actual
column names, types, sample values, and semantic roles — enabling it to build
correct queries for ANY tenant schema without hardcoded field names.

Cost: $0 (pure Python, no LLM). Two Supabase queries, cached 5 min.
"""

import logging
import time
from typing import Optional

from agents import SchemaProfile
from agents.anvar import load_allowed_fields, DEFAULT_ALLOWED_FIELDS

logger = logging.getLogger(__name__)

# In-memory cache: {(tenant_id, crm_source): (SchemaContext, timestamp)}
_ctx_cache: dict[tuple, tuple] = {}
_CTX_CACHE_TTL = 300  # 5 minutes

# System columns always available (not in crm_field_registry)
_SYSTEM_COLUMNS = ["id", "external_id"]


class FieldInfo:
    """Metadata for a single field in a CRM entity."""
    __slots__ = ("name", "field_type", "sample_values", "null_rate",
                 "distinct_count", "semantic_role")

    def __init__(self, name: str, field_type: str = "text",
                 sample_values: list = None, null_rate: float = 0.0,
                 distinct_count: int = 0, semantic_role: str = None):
        self.name = name
        self.field_type = field_type
        self.sample_values = sample_values or []
        self.null_rate = null_rate
        self.distinct_count = distinct_count
        self.semantic_role = semantic_role


class SchemaContext:
    """Rich schema context for a tenant's CRM data."""

    def __init__(
        self,
        schema: SchemaProfile,
        entities: dict[str, list[FieldInfo]],
        record_counts: dict[str, int],
        allowed_fields: dict[str, list[str]],
    ):
        self._schema = schema
        self._entities = entities          # {table: [FieldInfo]}
        self._record_counts = record_counts  # {table: total_records}
        self._allowed = allowed_fields     # {table: [field_names]} for validation

    @classmethod
    async def create(
        cls,
        supabase,
        tenant_id: str,
        crm_source: str,
        schema: SchemaProfile,
    ) -> "SchemaContext":
        """Async factory — loads field registry + record counts. Cached 5 min."""
        cache_key = (tenant_id, crm_source)
        now = time.time()
        if cache_key in _ctx_cache:
            cached, ts = _ctx_cache[cache_key]
            if now - ts < _CTX_CACHE_TTL:
                return cached

        # 1. Load full field registry
        entities: dict[str, list[FieldInfo]] = {}
        try:
            result = supabase.table("crm_field_registry").select(
                "entity,field_name,field_type,sample_values,null_rate,distinct_count"
            ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).execute()

            # Tag semantic roles from schema
            role_map = {}
            if schema.stage_field:
                role_map[schema.stage_field] = "STAGE"
            if schema.amount_field:
                role_map[schema.amount_field] = "AMOUNT"
            if schema.owner_field:
                role_map[schema.owner_field] = "OWNER"

            for row in (result.data or []):
                table = f"crm_{row['entity']}"
                fname = row["field_name"]
                fi = FieldInfo(
                    name=fname,
                    field_type=row.get("field_type", "text"),
                    sample_values=row.get("sample_values") or [],
                    null_rate=float(row.get("null_rate") or 0),
                    distinct_count=int(row.get("distinct_count") or 0),
                    semantic_role=role_map.get(fname),
                )
                entities.setdefault(table, []).append(fi)
        except Exception as e:
            logger.warning("SchemaContext: failed to load field registry: %s", e)

        # 2. Load record counts from crm_sync_status
        record_counts: dict[str, int] = {}
        try:
            result = supabase.table("crm_sync_status").select(
                "entity,total_records"
            ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).execute()

            for row in (result.data or []):
                table = f"crm_{row['entity']}"
                record_counts[table] = int(row.get("total_records") or 0)
        except Exception as e:
            logger.debug("SchemaContext: failed to load sync status: %s", e)

        # 3. Load allowed fields (for validation whitelist)
        allowed = await load_allowed_fields(supabase, tenant_id, crm_source)

        ctx = cls(
            schema=schema,
            entities=entities,
            record_counts=record_counts,
            allowed_fields=allowed,
        )
        _ctx_cache[cache_key] = (ctx, now)
        return ctx

    # ── Prompt formatters ──────────────────────────────────────────────

    def for_query_prompt(self) -> str:
        """Compact schema for query generation LLM (~800 tokens).

        Example output:
          crm_deals (247 records):
            title (text, 100% filled, 245 distinct)
            stage_id (text, 98%, 6 distinct) [STAGE] → "New","Negotiation","Won","Lost"
            opportunity_amount (numeric, 85%) [AMOUNT] → 50000, 125000, 300000
            responsible_id (text, 92%, 4 distinct) [OWNER]
            date_modify (timestamp, 100%)
        """
        if not self._entities:
            # Fallback: generate from allowed_fields (no rich metadata)
            return self._fallback_schema_text()

        lines = []
        for table in sorted(self._entities.keys()):
            fields = self._entities[table]
            count = self._record_counts.get(table, 0)
            lines.append(f"{table} ({count} records):")
            for f in fields:
                fill_pct = round((1.0 - f.null_rate) * 100)
                parts = [f"  {f.name} ({f.field_type}, {fill_pct}% filled"]
                if f.distinct_count:
                    parts.append(f", {f.distinct_count} distinct)")
                else:
                    parts.append(")")

                if f.semantic_role:
                    parts.append(f" [{f.semantic_role}]")

                if f.sample_values:
                    samples = f.sample_values[:5]
                    # Format: numbers stay raw, strings get quoted
                    formatted = []
                    for s in samples:
                        if isinstance(s, (int, float)):
                            formatted.append(str(s))
                        else:
                            formatted.append(f'"{s}"')
                    parts.append(f" → {', '.join(formatted)}")

                lines.append("".join(parts))
        return "\n".join(lines)

    def for_chat_prompt(self) -> str:
        """Shorter version for conversational context (~400 tokens)."""
        if not self._entities:
            return self._fallback_schema_text()

        lines = []
        for table in sorted(self._entities.keys()):
            fields = self._entities[table]
            count = self._record_counts.get(table, 0)
            field_names = []
            for f in fields:
                tag = f" [{f.semantic_role}]" if f.semantic_role else ""
                field_names.append(f"{f.name}{tag}")
            lines.append(f"{table} ({count}): {', '.join(field_names)}")
        return "\n".join(lines)

    def _fallback_schema_text(self) -> str:
        """Generate basic schema text from allowed_fields when registry is empty."""
        lines = []
        for table, fields in sorted(self._allowed.items()):
            count = self._record_counts.get(table, 0)
            lines.append(f"{table} ({count} records): {', '.join(fields)}")
        return "\n".join(lines)

    # ── Validation API ────────────────────────────────────────────────

    def get_entities(self) -> dict[str, list[str]]:
        """{table: [field_names]} for validation."""
        return dict(self._allowed)

    def validate_field(self, table: str, field: str) -> bool:
        """Check if a field exists for this table."""
        if field in _SYSTEM_COLUMNS:
            return True
        return field in self._allowed.get(table, [])

    def get_field_type(self, table: str, field: str) -> Optional[str]:
        """Get the field type from the registry."""
        for f in self._entities.get(table, []):
            if f.name == field:
                return f.field_type
        return None

    def get_semantic_field(self, role: str) -> Optional[str]:
        """Get field name for a semantic role: 'amount' → 'opportunity_amount'."""
        role_upper = role.upper()
        if role_upper == "AMOUNT":
            return self._schema.amount_field
        elif role_upper == "STAGE":
            return self._schema.stage_field
        elif role_upper == "OWNER":
            return self._schema.owner_field
        return None

    def get_fields_by_type(self, table: str, field_type: str) -> list[str]:
        """Return field names matching a given type (e.g., 'timestamp')."""
        return [
            f.name for f in self._entities.get(table, [])
            if f.field_type == field_type
        ]

    def get_select_string(self, table: str) -> str:
        """Return comma-separated SELECT fields for a table."""
        fields = list(_SYSTEM_COLUMNS)
        for f in self._allowed.get(table, []):
            if f not in fields:
                fields.append(f)
        return ",".join(fields)

    # ── Backward-compat shims (match SchemaResolver API) ─────────────

    def get_amount_field(self) -> str:
        return self._schema.amount_field or "value"

    def get_stage_field(self) -> str:
        return self._schema.stage_field or "stage"

    def get_owner_field(self) -> str:
        return self._schema.owner_field or "assigned_to"

    def has_field(self, table: str, field: str) -> bool:
        return self.validate_field(table, field)

    def get_sort_field(self, table: str, preferred: str = "created_at") -> str:
        if self.validate_field(table, preferred):
            return preferred
        if self.validate_field(table, "created_at"):
            return "created_at"
        fields = self._allowed.get(table, [])
        return fields[0] if fields else "id"

    def get_fields_description(self) -> dict[str, list[str]]:
        return dict(self._allowed)

    def get_table_fields(self, table: str) -> list[str]:
        return list(self._allowed.get(table, []))

    def validate_filter(self, table: str, field: str) -> bool:
        return self.validate_field(table, field)

    # ── v4 additions: scoped prompt + join hints ──────────────────────────

    def for_query_prompt_scoped(self, tables: list[str] = None) -> str:
        """Scoped schema for query generation — only requested tables (saves tokens).

        If tables is None, returns all tables (same as for_query_prompt).
        """
        if not tables:
            return self.for_query_prompt()

        if not self._entities:
            return self._fallback_schema_text()

        lines = []
        for table in sorted(tables):
            fields = self._entities.get(table, [])
            if not fields:
                # Try from allowed_fields fallback
                allowed = self._allowed.get(table, [])
                if allowed:
                    count = self._record_counts.get(table, 0)
                    lines.append(f"{table} ({count} records): {', '.join(allowed)}")
                continue

            count = self._record_counts.get(table, 0)
            lines.append(f"{table} ({count} records):")
            for f in fields:
                fill_pct = round((1.0 - f.null_rate) * 100)
                parts = [f"  {f.name} ({f.field_type}, {fill_pct}% filled"]
                if f.distinct_count:
                    parts.append(f", {f.distinct_count} distinct)")
                else:
                    parts.append(")")

                if f.semantic_role:
                    parts.append(f" [{f.semantic_role}]")

                if f.sample_values:
                    samples = f.sample_values[:5]
                    formatted = []
                    for s in samples:
                        if isinstance(s, (int, float)):
                            formatted.append(str(s))
                        else:
                            formatted.append(f'"{s}"')
                    parts.append(f" → {', '.join(formatted)}")

                lines.append("".join(parts))
        return "\n".join(lines)

    def get_join_hints(self) -> str:
        """Return JOIN relationships as compact text for the LLM.

        These are the standard CRM foreign-key relationships.
        """
        hints = [
            "crm_deals.contact_id → crm_contacts.external_id",
            "crm_deals.company_id → crm_companies.external_id",
            "crm_deals.assigned_to → crm_users.external_id",
            "crm_contacts.company → crm_companies.external_id",
            "crm_activities.employee_id → crm_users.external_id",
            "crm_leads.assigned_to → crm_users.external_id",
        ]
        return "JOINs:\n" + "\n".join(hints)
