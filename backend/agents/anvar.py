"""
Anvar — Data Querier Agent.
Takes a ChartConfig and returns a ChartResult with live data from Supabase.
Zero LLM cost. Pure SQL builder with field whitelisting for security.
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import Counter

from agents import ChartConfig, ChartResult

logger = logging.getLogger(__name__)


# ── Security: Allowed tables and fields whitelist ──
DEFAULT_ALLOWED_FIELDS = {
    "crm_leads": [
        "status", "source", "assigned_to", "value", "currency",
        "created_at", "modified_at", "contact_name",
    ],
    "crm_deals": [
        "stage", "value", "currency", "assigned_to", "won",
        "created_at", "closed_at", "modified_at", "title",
    ],
    "crm_contacts": [
        "company", "name", "created_at", "modified_at",
    ],
    "crm_companies": [
        "industry", "employee_count", "revenue", "name",
        "created_at", "modified_at",
    ],
    "crm_activities": [
        "type", "employee_name", "employee_id", "completed", "started_at",
        "duration_seconds", "subject", "modified_at",
    ],
}

# Fields that contain date/time values
DATE_FIELDS = {
    "created_at", "modified_at", "closed_at", "started_at",
}

# Fields that contain numeric values (for sum/avg)
NUMERIC_FIELDS = {
    "value", "revenue", "employee_count", "duration_seconds",
}

# Backward-compat alias — existing imports of ALLOWED_FIELDS still work
ALLOWED_FIELDS = DEFAULT_ALLOWED_FIELDS

# ── Dynamic field loading from crm_field_registry ──

# In-memory cache: {(tenant_id, crm_source): (fields_dict, timestamp)}
_field_cache: dict[tuple, tuple] = {}
FIELD_CACHE_TTL = 300  # 5 minutes


async def load_allowed_fields(supabase, tenant_id: str, crm_source: str) -> dict:
    """Load per-tenant field whitelist from crm_field_registry.
    Falls back to DEFAULT_ALLOWED_FIELDS if registry is empty."""
    cache_key = (tenant_id, crm_source)
    now = time.time()
    if cache_key in _field_cache:
        cached, ts = _field_cache[cache_key]
        if now - ts < FIELD_CACHE_TTL:
            return cached

    try:
        result = supabase.table("crm_field_registry").select(
            "entity,field_name"
        ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).execute()

        if not result.data:
            logger.info(f"No field registry for {tenant_id}/{crm_source}, using defaults")
            return DEFAULT_ALLOWED_FIELDS

        # Group by entity → list of field names
        fields = {}
        for row in result.data:
            table = f"crm_{row['entity']}"
            fields.setdefault(table, []).append(row["field_name"])

        _field_cache[cache_key] = (fields, now)
        return fields

    except Exception as e:
        logger.warning(f"load_allowed_fields failed ({e}), using defaults")
        return DEFAULT_ALLOWED_FIELDS


async def execute_chart_query(
    supabase,
    tenant_id: str,
    crm_source: str,
    config: ChartConfig,
) -> Optional[ChartResult]:
    """
    Execute a chart query based on a ChartConfig.

    Args:
        supabase: Supabase client
        tenant_id: Tenant UUID
        crm_source: CRM type (e.g. "bitrix24")
        config: ChartConfig describing what to build

    Returns:
        ChartResult with data array [{label, value}], or None on error
    """
    try:
        # Validate table
        if config.data_source not in ALLOWED_FIELDS:
            logger.warning(f"Blocked query to disallowed table: {config.data_source}")
            return None

        allowed = ALLOWED_FIELDS[config.data_source]

        # Validate x_field
        if config.x_field not in allowed:
            logger.warning(
                f"Blocked x_field '{config.x_field}' not in whitelist for {config.data_source}"
            )
            return None

        # Validate filter_field if provided
        if config.filter_field and config.filter_field not in allowed:
            logger.warning(
                f"Blocked filter_field '{config.filter_field}' not in whitelist"
            )
            return None

        # Build select fields
        select_fields = [config.x_field]
        if config.aggregation in ("sum", "avg") and config.y_field != "count":
            if config.y_field in allowed or config.y_field in NUMERIC_FIELDS:
                select_fields.append(config.y_field)

        # Build query
        query = supabase.table(config.data_source).select(",".join(set(select_fields)))
        query = query.eq("tenant_id", tenant_id)
        query = query.eq("crm_source", crm_source)

        # Apply filter (with length limit to prevent injection via oversized values)
        if config.filter_field and config.filter_value:
            filter_val = str(config.filter_value)[:200]
            query = query.eq(config.filter_field, filter_val)

        # Apply time range — absolute dates take priority over relative days
        if config.from_date or config.to_date:
            time_field = _get_time_field(config.data_source)
            if config.from_date:
                query = query.gte(time_field, config.from_date)
            if config.to_date:
                query = query.lte(time_field, config.to_date)
        elif config.time_range_days:
            time_field = _get_time_field(config.data_source)
            cutoff = datetime.now(timezone.utc) - timedelta(days=config.time_range_days)
            query = query.gte(time_field, cutoff.isoformat())

        # Execute — fetch up to 5000 records for aggregation
        result = query.limit(5000).execute()
        rows = result.data or []

        if not rows:
            return ChartResult(
                type=config.chart_type,
                title=config.title,
                data=[],
            )

        # Aggregate in Python
        data = _aggregate_rows(rows, config)

        return ChartResult(
            type=config.chart_type,
            title=config.title,
            data=data,
        )

    except Exception as e:
        logger.error(f"Chart query failed for '{config.title}': {e}")
        return None


def _aggregate_rows(rows: list, config: ChartConfig) -> list:
    """Group rows by x_field and aggregate by aggregation type."""
    x_field = config.x_field
    agg = config.aggregation
    y_field = config.y_field if config.y_field != "count" else None
    sort_order = config.sort_order
    limit = config.item_limit or 10

    if x_field in DATE_FIELDS:
        return _aggregate_by_date(rows, x_field, agg, y_field, sort_order, limit)

    # Group by x_field value
    groups = {}
    for row in rows:
        key = row.get(x_field)
        if key is None:
            key = "Unknown"
        key = str(key)
        if key not in groups:
            groups[key] = []
        groups[key].append(row)

    # Compute aggregate for each group
    data = []
    for label, group_rows in groups.items():
        if agg == "count":
            value = len(group_rows)
        elif agg == "sum" and y_field:
            value = sum(
                float(r[y_field]) for r in group_rows
                if r.get(y_field) is not None
            )
        elif agg == "avg" and y_field:
            vals = [
                float(r[y_field]) for r in group_rows
                if r.get(y_field) is not None
            ]
            value = sum(vals) / len(vals) if vals else 0
        else:
            value = len(group_rows)

        data.append({"label": label, "value": round(value, 2) if isinstance(value, float) else value})

    # Sort
    reverse = sort_order == "desc"
    data.sort(key=lambda d: d["value"], reverse=reverse)

    # Limit
    return data[:limit]


def _aggregate_by_date(rows, date_field, agg, y_field, sort_order, limit):
    """Aggregate by date — group by day for line charts."""
    from collections import defaultdict

    by_day = defaultdict(list)
    for row in rows:
        dt_str = row.get(date_field)
        if not dt_str:
            continue
        # Extract date portion
        day = str(dt_str)[:10]
        by_day[day].append(row)

    data = []
    for day, group_rows in sorted(by_day.items()):
        if agg == "count":
            value = len(group_rows)
        elif agg == "sum" and y_field:
            value = sum(float(r[y_field]) for r in group_rows if r.get(y_field) is not None)
        elif agg == "avg" and y_field:
            vals = [float(r[y_field]) for r in group_rows if r.get(y_field) is not None]
            value = sum(vals) / len(vals) if vals else 0
        else:
            value = len(group_rows)

        data.append({"label": day, "value": round(value, 2) if isinstance(value, float) else value})

    # For date-based, usually ascending (chronological)
    if sort_order == "desc":
        data.reverse()

    return data[:limit]


def _get_time_field(table: str) -> str:
    """Return the appropriate time filter field for a table."""
    if table == "crm_activities":
        return "started_at"
    return "created_at"
