"""
Field Profiler — SQL-based field introspection for crm_field_registry.
Zero LLM cost. Profiles each CRM entity table's columns:
  - field_type, null_rate, distinct_count, sample_values.
Results are upserted into crm_field_registry by sync_engine.
"""

import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Internal/system columns to exclude from profiling
INTERNAL_FIELDS = {
    "id", "tenant_id", "crm_source", "external_id", "synced_at",
    "source_id", "raw_data", "custom_fields",
}

# Entity → table mapping
ENTITY_TABLE_MAP = {
    "leads": "crm_leads",
    "deals": "crm_deals",
    "contacts": "crm_contacts",
    "companies": "crm_companies",
    "activities": "crm_activities",
}


async def profile_entity_fields(
    supabase,
    tenant_id: str,
    crm_source: str,
    entity: str,
) -> list[dict]:
    """
    Profile all non-internal columns in a CRM entity table for a specific tenant.

    For each column, computes:
      - field_type (PostgreSQL data type)
      - null_rate (fraction of NULL values, 0.0–1.0)
      - distinct_count (COUNT(DISTINCT field))
      - sample_values (up to 10 distinct non-null values)

    Returns:
        List of dicts ready for upsert into crm_field_registry.
        Empty list if table has no data or query fails.
    """
    table_name = ENTITY_TABLE_MAP.get(entity, f"crm_{entity}")

    try:
        # Step 1: Get column names and types from information_schema
        col_query = (
            "SELECT column_name, data_type "
            "FROM information_schema.columns "
            f"WHERE table_schema = 'public' AND table_name = '{table_name}' "
            "ORDER BY ordinal_position"
        )
        col_result = await asyncio.to_thread(lambda: supabase.rpc("exec_sql", {"query": col_query}).execute())

        # Fallback: if exec_sql RPC doesn't exist, use postgrest select approach
        # We'll get columns from the actual data instead
    except Exception:
        pass

    # Use a pragmatic approach: fetch a sample of rows and profile in Python
    try:
        # Fetch up to 1000 rows for this tenant+source (run in thread to avoid blocking event loop)
        result = await asyncio.to_thread(lambda: supabase.table(table_name).select("*").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).limit(1000).execute())

        rows = result.data or []
        if not rows:
            logger.info(f"No rows in {table_name} for tenant {tenant_id}, skipping profiling")
            return []

        # Get all column names from the first row
        all_columns = set()
        for row in rows:
            all_columns.update(row.keys())

        # Filter out internal fields
        profile_columns = sorted(all_columns - INTERNAL_FIELDS)

        total_rows = len(rows)
        now = datetime.now(timezone.utc).isoformat()
        profiles = []

        for col in profile_columns:
            # Collect values
            values = [row.get(col) for row in rows]
            non_null = [v for v in values if v is not None]

            # null_rate
            null_count = sum(1 for v in values if v is None)
            null_rate = round(null_count / total_rows, 4) if total_rows > 0 else 0.0

            # distinct_count
            try:
                distinct_vals = set(str(v) for v in non_null)
            except Exception:
                distinct_vals = set()
            distinct_count = len(distinct_vals)

            # field_type inference
            field_type = _infer_field_type(non_null)

            # sample_values (up to 10 distinct non-null values, as strings)
            sample_values = sorted(list(distinct_vals))[:10]

            profiles.append({
                "tenant_id": tenant_id,
                "crm_source": crm_source,
                "entity": entity,
                "field_name": col,
                "field_type": field_type,
                "sample_values": sample_values,
                "null_rate": null_rate,
                "distinct_count": distinct_count,
                "updated_at": now,
            })

        logger.info(
            f"Profiled {len(profiles)} fields for {table_name} "
            f"(tenant={tenant_id}, rows={total_rows})"
        )
        return profiles

    except Exception as e:
        logger.error(f"Field profiling failed for {table_name} (tenant={tenant_id}): {e}")
        return []


def _infer_field_type(values: list) -> str:
    """Infer a field type from sample non-null values."""
    if not values:
        return "unknown"

    sample = values[:50]  # check first 50

    # Check for booleans
    if all(isinstance(v, bool) for v in sample):
        return "boolean"

    # Check for numeric
    numeric_count = 0
    for v in sample:
        if isinstance(v, (int, float)):
            numeric_count += 1
        elif isinstance(v, str):
            try:
                float(v)
                numeric_count += 1
            except (ValueError, TypeError):
                pass

    if numeric_count == len(sample):
        # Check if all values are whole numbers (int or float with no fractional part)
        all_integer = True
        for v in sample:
            if isinstance(v, bool):
                all_integer = False
                break
            elif isinstance(v, int):
                continue
            elif isinstance(v, float):
                if v != int(v):
                    all_integer = False
                    break
            elif isinstance(v, str):
                try:
                    f = float(v)
                    if f != int(f):
                        all_integer = False
                        break
                except (ValueError, OverflowError):
                    all_integer = False
                    break
        return "integer" if all_integer else "numeric"

    # Check for timestamps (ISO 8601 patterns)
    timestamp_count = 0
    for v in sample:
        s = str(v)
        if len(s) >= 10 and s[4:5] == "-" and s[7:8] == "-":
            timestamp_count += 1

    if timestamp_count > len(sample) * 0.8:
        return "timestamp"

    # Check for JSON/dict/list
    if any(isinstance(v, (dict, list)) for v in sample):
        return "jsonb"

    return "text"


async def upsert_field_profiles(supabase, profiles: list[dict]):
    """Upsert a list of field profiles into crm_field_registry."""
    if not profiles:
        return

    try:
        # Batch upsert (run in thread to avoid blocking event loop)
        await asyncio.to_thread(lambda: supabase.table("crm_field_registry").upsert(
            profiles,
            on_conflict="tenant_id,crm_source,entity,field_name"
        ).execute())
        logger.info(f"Upserted {len(profiles)} field profiles into crm_field_registry")
    except Exception as e:
        logger.error(f"Failed to upsert field profiles: {e}")
        # Try one by one as fallback
        for profile in profiles:
            try:
                await asyncio.to_thread(lambda p=profile: supabase.table("crm_field_registry").upsert(
                    p,
                    on_conflict="tenant_id,crm_source,entity,field_name"
                ).execute())
            except Exception as inner_e:
                logger.warning(
                    f"Single field profile upsert failed ({profile.get('field_name')}): {inner_e}"
                )
