"""
KPI Resolver — Zero-cost pattern matcher (Phase 2 Refactor).

First looks up tenant_metrics WHERE is_kpi=true, executes computation recipe
via the generic compute engine. Falls back to legacy 14 hardcoded patterns
when tenant_metrics is empty.

No LLM calls. Pure Python + SQL. Cost: $0.
"""

import json
import logging
from typing import Optional

from agents import ChartResult

logger = logging.getLogger(__name__)


# DEPRECATED Phase 3 — remove after 2026-04-01. Use tenant_metrics + dynamic_compute instead.
# ── Legacy KPI Pattern Definitions (fallback) ──
# Each pattern: table, agg, title, optional field/filter/format
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

    Phase 2 flow:
    1. Look up metric in tenant_metrics WHERE metric_key=pattern AND is_kpi=true
    2. If found, execute computation recipe via generic compute engine
    3. If not found, fall back to legacy KPI_PATTERNS

    Returns ChartResult with type='kpi', or None if pattern is unknown.
    """
    # Try dynamic resolution first
    dynamic_result = await _resolve_dynamic(supabase, tenant_id, crm_source, pattern, time_range_days)
    if dynamic_result is not None:
        return dynamic_result

    # Look up tenant currency for legacy fallback
    currency = await _get_tenant_currency(supabase, tenant_id, crm_source)

    # Fall back to legacy patterns
    return await _resolve_legacy(supabase, tenant_id, crm_source, pattern, time_range_days, currency)


async def _resolve_dynamic(
    supabase,
    tenant_id: str,
    crm_source: str,
    pattern: str,
    time_range_days: Optional[int],
) -> Optional[ChartResult]:
    """
    Look up metric in tenant_metrics and compute via dynamic engine.
    Returns None if metric not found (triggering legacy fallback).
    """
    try:
        result = supabase.table("tenant_metrics").select("*").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).eq(
            "metric_key", pattern
        ).eq("is_kpi", True).eq("active", True).limit(1).execute()

        if not result.data:
            return None

        metric_def = result.data[0]

        # Parse computation if stored as string
        computation = metric_def.get("computation", {})
        if isinstance(computation, str):
            computation = json.loads(computation)
            metric_def["computation"] = computation

        # Parse required_fields if stored as string
        req_fields = metric_def.get("required_fields", [])
        if isinstance(req_fields, str):
            metric_def["required_fields"] = json.loads(req_fields)

        # Import compute engine (deferred to avoid circular imports)
        from revenue.dynamic_compute import compute_metric, format_metric_card

        metric_result = await compute_metric(
            supabase, tenant_id, crm_source, metric_def,
            timeframe_days=time_range_days,
        )

        if metric_result.value is None:
            return None

        # Convert to ChartResult format
        card = format_metric_card(metric_result)

        # Format value for display
        display_format = metric_def.get("display_format", "number")
        display_value = _format_dynamic_value(metric_result.value, display_format, metric_result.currency)

        # Build title with time range suffix
        title = metric_def.get("title", pattern)
        if time_range_days and not title.endswith(")"):
            title = _add_time_suffix(title, time_range_days)

        # Extract trend info
        change = None
        change_direction = None
        if card.get("trend"):
            trend = card["trend"]
            change = f"{trend['change_pct']:+.0f}%"
            change_direction = trend.get("direction", "flat")

        return ChartResult(
            type="kpi",
            title=title,
            value=display_value,
            change=change,
            changeDirection=change_direction,
        )

    except Exception as e:
        logger.debug(f"Dynamic KPI resolution failed for {pattern}: {e}")
        return None


async def _resolve_legacy(
    supabase,
    tenant_id: str,
    crm_source: str,
    pattern: str,
    time_range_days: Optional[int],
    currency: str = "$",
) -> Optional[ChartResult]:
    """Legacy KPI resolution using hardcoded KPI_PATTERNS."""
    config = KPI_PATTERNS.get(pattern)
    if not config:
        return None

    logger.debug(f"Using legacy KPI resolution for {pattern}")

    try:
        table = config["table"]
        agg = config["agg"]
        title = config["title"]
        fmt = config.get("format")
        field = config.get("field")
        filters = config.get("filter", {})
        days = time_range_days or config.get("time_range_days")
        time_field = config.get("time_field", "created_at")

        # Adjust title when caller provides a custom time range
        if time_range_days and not config.get("time_range_days"):
            title = _add_time_suffix(title, time_range_days)

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

        display_value = _format_value(current_value, fmt, currency)

        return ChartResult(
            type="kpi",
            title=title,
            value=display_value,
            change=change,
            changeDirection=change_direction,
        )

    except Exception as e:
        logger.error(f"Legacy KPI resolver error for pattern '{pattern}': {e}")
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
            result = query.limit(0).execute()
            return result.count if result.count is not None else 0

        elif agg in ("sum", "avg"):
            result = query.select(field).limit(50000).execute()
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
            supabase.table("crm_deals").select("*", count="exact")
            .eq("tenant_id", tenant_id).eq("crm_source", crm_source)
            .limit(0).execute()
        )
        total = total_q.count or 0

        won_q = (
            supabase.table("crm_deals").select("*", count="exact")
            .eq("tenant_id", tenant_id).eq("crm_source", crm_source)
            .is_("won", True).limit(0).execute()
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
            supabase.table("crm_deals").select("*", count="exact")
            .eq("tenant_id", tenant_id).eq("crm_source", crm_source)
            .gte("closed_at", now.isoformat()).lte("closed_at", future.isoformat())
            .is_("won", False).limit(0).execute()
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


# ── Currency Helpers ─────────────────────────────────────────────────

# Map common Bitrix24 CURRENCY_ID codes to display symbols
_CURRENCY_SYMBOLS = {
    "USD": "$", "EUR": "€", "GBP": "£", "AED": "AED ", "RUB": "₽",
    "UZS": "UZS ", "QAR": "QAR ", "AUD": "A$", "CAD": "C$", "JPY": "¥",
    "CNY": "¥", "INR": "₹", "TRY": "₺", "SAR": "SAR ", "KWD": "KWD ",
}


async def _get_tenant_currency(supabase, tenant_id: str, crm_source: str) -> str:
    """Look up currency from dashboard_configs.crm_context or crm_deals data."""
    try:
        # First check dashboard_configs for crm_context.currency
        result = supabase.table("dashboard_configs").select(
            "crm_context"
        ).eq("tenant_id", tenant_id).limit(1).execute()

        if result.data:
            ctx = result.data[0].get("crm_context") or {}
            if isinstance(ctx, str):
                ctx = json.loads(ctx)
            currency_id = ctx.get("currency") or ctx.get("currency_id")
            if currency_id:
                return _CURRENCY_SYMBOLS.get(currency_id, currency_id + " ")

        # Fallback: check the most common currency in crm_deals
        deal_result = supabase.table("crm_deals").select(
            "currency"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).not_.is_("currency", "null").limit(1).execute()

        if deal_result.data:
            currency_id = deal_result.data[0].get("currency")
            if currency_id:
                return _CURRENCY_SYMBOLS.get(currency_id, currency_id + " ")

    except Exception as e:
        logger.debug(f"Currency lookup failed for tenant {tenant_id}: {e}")

    return "$"


# ── Formatting Helpers ───────────────────────────────────────────────

def _format_value(value, fmt, currency="$"):
    """Format a numeric value for display (legacy)."""
    if value is None:
        return 0
    sym = currency or "$"
    if fmt == "currency":
        if value >= 1_000_000:
            return f"{sym}{value/1_000_000:,.1f}M"
        elif value >= 1_000:
            return f"{sym}{value:,.0f}"
        else:
            return f"{sym}{value:,.2f}"
    if fmt == "percent":
        return f"{value:.1f}%"
    if isinstance(value, float):
        return round(value, 1)
    return value


def _format_dynamic_value(value, display_format, currency=None):
    """Format a value using dynamic display_format from tenant_metrics."""
    if value is None:
        return 0
    symbol = currency or "$"
    try:
        num = float(value)
    except (TypeError, ValueError):
        return value

    if display_format == "currency":
        if num >= 1_000_000:
            return f"{symbol}{num/1_000_000:,.1f}M"
        elif num >= 1_000:
            return f"{symbol}{num:,.0f}"
        else:
            return f"{symbol}{num:,.2f}"
    elif display_format == "percentage":
        return f"{num:.1f}%"
    elif display_format == "days":
        return f"{num:.1f} days"
    elif isinstance(value, float):
        return round(value, 1)
    return value


def _add_time_suffix(title: str, days: int) -> str:
    """Add a time range suffix to a title."""
    if days == 1:
        return f"{title} (Today)"
    elif days == 7:
        return f"{title} (7d)"
    elif days == 30:
        return f"{title} (30d)"
    elif days == 90:
        return f"{title} (90d)"
    elif days == 365:
        return f"{title} (1y)"
    else:
        return f"{title} ({days}d)"
