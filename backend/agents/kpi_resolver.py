"""
KPI Resolver — Zero-cost pattern matcher.
Maps KPI patterns to Supabase queries and returns ChartResult with type='kpi'.
No LLM calls. Pure Python + SQL.
"""

import logging
from typing import Optional

from agents import ChartResult

logger = logging.getLogger(__name__)


# ── KPI Pattern Definitions ──
# Each pattern: (query_builder_fn_name, title, comparison_mode)
# comparison_mode: "period" = compare current vs previous period, None = no comparison
KPI_PATTERNS = {
    "total_leads": {
        "table": "crm_leads",
        "agg": "count",
        "title": "Total Leads",
    },
    "total_deals": {
        "table": "crm_deals",
        "agg": "count",
        "title": "Total Deals",
    },
    "pipeline_value": {
        "table": "crm_deals",
        "agg": "sum",
        "field": "value",
        "filter": {"won": "is.not.true"},
        "title": "Pipeline Value",
        "format": "currency",
    },
    "won_deals": {
        "table": "crm_deals",
        "agg": "count",
        "filter": {"won": "is.true"},
        "title": "Won Deals",
    },
    "won_value": {
        "table": "crm_deals",
        "agg": "sum",
        "field": "value",
        "filter": {"won": "is.true"},
        "title": "Won Revenue",
        "format": "currency",
    },
    "conversion_rate": {
        "table": "crm_deals",
        "agg": "conversion_rate",
        "title": "Conversion Rate",
        "format": "percent",
    },
    "new_leads_this_week": {
        "table": "crm_leads",
        "agg": "count",
        "time_range_days": 7,
        "title": "New Leads (7d)",
    },
    "new_leads_this_month": {
        "table": "crm_leads",
        "agg": "count",
        "time_range_days": 30,
        "title": "New Leads (30d)",
    },
    "avg_deal_value": {
        "table": "crm_deals",
        "agg": "avg",
        "field": "value",
        "title": "Avg Deal Size",
        "format": "currency",
    },
    "total_contacts": {
        "table": "crm_contacts",
        "agg": "count",
        "title": "Total Contacts",
    },
    "total_companies": {
        "table": "crm_companies",
        "agg": "count",
        "title": "Total Companies",
    },
    "total_activities": {
        "table": "crm_activities",
        "agg": "count",
        "title": "Total Activities",
    },
    "calls_this_week": {
        "table": "crm_activities",
        "agg": "count",
        "filter": {"type": "eq.call"},
        "time_range_days": 7,
        "time_field": "started_at",
        "title": "Calls (7d)",
    },
    "deals_closing_soon": {
        "table": "crm_deals",
        "agg": "count",
        "closing_soon": True,
        "title": "Closing Soon (30d)",
    },
}


async def resolve_kpi(
    supabase,
    tenant_id: str,
    crm_source: str,
    pattern: str,
    time_range_days: Optional[int] = None,
) -> Optional[ChartResult]:
    """
    Resolve a KPI pattern to a ChartResult.

    Args:
        supabase: Supabase client
        tenant_id: Tenant UUID
        crm_source: CRM type (e.g. "bitrix24")
        pattern: KPI pattern key (e.g. "total_leads")
        time_range_days: Override time range if provided

    Returns:
        ChartResult with type='kpi', or None if pattern is unknown
    """
    config = KPI_PATTERNS.get(pattern)
    if not config:
        return None

    try:
        table = config["table"]
        agg = config["agg"]
        title = config["title"]
        fmt = config.get("format")
        field = config.get("field")
        filters = config.get("filter", {})
        days = time_range_days or config.get("time_range_days")
        time_field = config.get("time_field", "created_at")

        # Special aggregations
        if agg == "conversion_rate":
            return await _resolve_conversion_rate(supabase, tenant_id, crm_source, title)

        if config.get("closing_soon"):
            return await _resolve_closing_soon(supabase, tenant_id, crm_source, title)

        # Current value
        current_value = await _query_aggregate(
            supabase, tenant_id, crm_source, table, agg, field, filters, days, time_field
        )

        # Previous period for comparison
        change = None
        change_direction = None
        comparison_days = days or 30
        previous_value = await _query_aggregate(
            supabase, tenant_id, crm_source, table, agg, field, filters,
            comparison_days, time_field, offset_days=comparison_days
        )

        if previous_value is not None and previous_value > 0 and current_value is not None:
            pct = ((current_value - previous_value) / previous_value) * 100
            change = f"{pct:+.0f}%"
            if pct > 0:
                change_direction = "up"
            elif pct < 0:
                change_direction = "down"
            else:
                change_direction = "flat"

        # Format the value
        display_value = _format_value(current_value, fmt)

        return ChartResult(
            type="kpi",
            title=title,
            value=display_value,
            change=change,
            changeDirection=change_direction,
        )

    except Exception as e:
        logger.error(f"KPI resolver error for pattern '{pattern}': {e}")
        return None


async def _query_aggregate(
    supabase, tenant_id, crm_source, table, agg, field, filters,
    time_range_days=None, time_field="created_at", offset_days=None
):
    """Execute an aggregate query against a crm_* table."""
    try:
        query = supabase.table(table).select("*", count="exact")
        query = query.eq("tenant_id", tenant_id)
        query = query.eq("crm_source", crm_source)

        # Apply filters
        for col, op_val in filters.items():
            if op_val.startswith("is."):
                query = query.is_(col, op_val[3:] == "true")
            elif op_val.startswith("eq."):
                query = query.eq(col, op_val[3:])

        # Time range
        if time_range_days:
            from datetime import datetime, timezone, timedelta
            if offset_days:
                end_date = datetime.now(timezone.utc) - timedelta(days=offset_days)
                start_date = end_date - timedelta(days=time_range_days)
            else:
                start_date = datetime.now(timezone.utc) - timedelta(days=time_range_days)
                end_date = None
            query = query.gte(time_field, start_date.isoformat())
            if end_date:
                query = query.lt(time_field, end_date.isoformat())

        if agg == "count":
            # Use count=exact to get total without fetching rows
            result = query.limit(0).execute()
            return result.count if result.count is not None else 0

        elif agg in ("sum", "avg"):
            # Fetch the field values and aggregate in Python
            result = query.select(field).execute()
            rows = result.data or []
            values = [float(r[field]) for r in rows if r.get(field) is not None]
            if not values:
                return 0
            if agg == "sum":
                return sum(values)
            else:
                return sum(values) / len(values)

    except Exception as e:
        logger.error(f"Aggregate query failed on {table}: {e}")
        return None


async def _resolve_conversion_rate(supabase, tenant_id, crm_source, title):
    """Calculate deal conversion rate: won / total * 100."""
    try:
        total_q = (
            supabase.table("crm_deals")
            .select("*", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .limit(0)
            .execute()
        )
        total = total_q.count or 0

        won_q = (
            supabase.table("crm_deals")
            .select("*", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .is_("won", True)
            .limit(0)
            .execute()
        )
        won = won_q.count or 0

        rate = (won / total * 100) if total > 0 else 0

        return ChartResult(
            type="kpi",
            title=title,
            value=f"{rate:.1f}%",
            change=None,
            changeDirection=None,
        )
    except Exception as e:
        logger.error(f"Conversion rate query failed: {e}")
        return None


async def _resolve_closing_soon(supabase, tenant_id, crm_source, title):
    """Count deals with closed_at within the next 30 days."""
    try:
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        future = now + timedelta(days=30)

        result = (
            supabase.table("crm_deals")
            .select("*", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("closed_at", now.isoformat())
            .lte("closed_at", future.isoformat())
            .is_("won", False)
            .limit(0)
            .execute()
        )

        return ChartResult(
            type="kpi",
            title=title,
            value=result.count or 0,
            change=None,
            changeDirection=None,
        )
    except Exception as e:
        logger.error(f"Closing soon query failed: {e}")
        return None


def _format_value(value, fmt):
    """Format a numeric value for display."""
    if value is None:
        return 0
    if fmt == "currency":
        if value >= 1_000_000:
            return f"${value/1_000_000:,.1f}M"
        elif value >= 1_000:
            return f"${value:,.0f}"
        else:
            return f"${value:,.2f}"
    if fmt == "percent":
        return f"{value:.1f}%"
    if isinstance(value, float):
        return round(value, 1)
    return value
