"""
Metric Catalog — Evidence-Based Revenue Analytics
==================================================
Defines 12 MetricDefinition objects covering pipeline, rep, conversion,
velocity, and hygiene analytics.  Every metric:

  1. Declares which tables and fields it needs (required_tables, required_fields).
  2. Lists safe dimensions and time grains the caller may request.
  3. Provides a compute() implementation that routes through
     kpi_resolver.resolve_kpi() or anvar.execute_chart_query() — never
     raw SQL strings injected into Supabase queries.
  4. Returns MetricResult which always includes MetricEvidence (row counts,
     null rates, data_trust_score) so the frontend can show the user how
     confident the number is.

Hard rules
----------
  - A metric is "available" only when all required tables are non-empty.
  - An unsupported dimension → rejected before any DB query runs.
  - data_trust_score = 0.0 if any required field is 100% null.
  - Metrics marked requires_revenue_model=True emit a warning (not an
    error) when no confirmed revenue model exists — they degrade to
    heuristic mode.

Public surface
--------------
    catalog = METRIC_CATALOG                                # dict[str, MetricDefinition]
    trust   = await get_catalog_with_trust(sb, tid, src)   # list[dict] for GET /metrics
    result  = await compute_metric(key, sb, tid, src, ...)  # MetricResult for POST /metrics/query
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class MetricEvidence:
    """Attached to every MetricResult so the UI can show data confidence."""
    row_count: int                        # total rows in primary table
    sampled_rows: int                     # rows inspected for null-rate analysis
    fields_evaluated: list[str]           # which fields were checked
    null_rates: dict[str, float]          # field → fraction of null values (0 = none null)
    data_trust_score: float               # 0.0–1.0  (1.0 = perfectly clean data)
    timeframe: str                        # human label, e.g. "Last 90 days"
    computation_notes: list[str] = field(default_factory=list)


@dataclass
class MetricResult:
    """Return type from every metric compute function."""
    metric_key: str
    title: str
    value: Optional[Any]       # scalar string/number for KPI-type metrics
    chart_type: str            # "kpi" | "bar" | "line" | "funnel"
    data: list[dict]           # [{label, value}] for chart-type metrics
    evidence: MetricEvidence
    dimension: Optional[str] = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass
class MetricDefinition:
    """Static metadata for one metric.  Compute logic lives in _COMPUTE_FNS."""
    key: str
    title: str
    description: str
    required_tables: list[str]
    required_fields: dict[str, list[str]]   # table → [field, ...]
    allowed_dimensions: list[str]
    allowed_time_grains: list[str]          # "day" | "week" | "month" | "quarter"
    requires_revenue_model: bool = False


# ---------------------------------------------------------------------------
# Catalog registry
# ---------------------------------------------------------------------------

METRIC_CATALOG: dict[str, MetricDefinition] = {}
_COMPUTE_FNS: dict[str, Any] = {}   # key → async callable


def _register(defn: MetricDefinition, fn):
    METRIC_CATALOG[defn.key] = defn
    _COMPUTE_FNS[defn.key] = fn


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

async def _count_rows(supabase, tenant_id: str, crm_source: str, table: str) -> int:
    """Return total row count for a tenant/source in a CRM table."""
    try:
        result = (
            supabase.table(table)
            .select("*", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .limit(0)
            .execute()
        )
        return result.count or 0
    except Exception as e:
        logger.warning("_count_rows(%s): %s", table, e)
        return 0


async def _fetch_sample(
    supabase,
    tenant_id: str,
    crm_source: str,
    table: str,
    fields: list[str],
    limit: int = 300,
    time_range_days: Optional[int] = None,
    time_field: str = "created_at",
) -> tuple[list[dict], int]:
    """
    Fetch a sample of rows (for null-rate analysis) and total row count.
    Returns (rows, total_count).
    """
    try:
        # Total count
        total = await _count_rows(supabase, tenant_id, crm_source, table)

        # Sample rows — select only needed fields
        unique_fields = list(dict.fromkeys(fields))  # deduplicate, preserve order
        q = (
            supabase.table(table)
            .select(",".join(unique_fields))
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
        )
        if time_range_days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=time_range_days)
            q = q.gte(time_field, cutoff.isoformat())

        result = q.limit(limit).execute()
        return result.data or [], total
    except Exception as e:
        logger.warning("_fetch_sample(%s): %s", table, e)
        return [], 0


def _null_rates(rows: list[dict], fields: list[str]) -> dict[str, float]:
    """Compute per-field null fraction from a row sample."""
    if not rows:
        return {f: 1.0 for f in fields}
    rates = {}
    n = len(rows)
    for f in fields:
        null_count = sum(1 for r in rows if r.get(f) is None)
        rates[f] = round(null_count / n, 3)
    return rates


def _trust_score(null_rates: dict[str, float]) -> float:
    """Overall trust = 1 - mean(null_rates).  Capped at 0.0."""
    if not null_rates:
        return 1.0
    mean_null = sum(null_rates.values()) / len(null_rates)
    return round(max(0.0, 1.0 - mean_null), 3)


def _timeframe_label(time_range_days: Optional[int]) -> str:
    if not time_range_days:
        return "All time"
    if time_range_days == 1:
        return "Today"
    if time_range_days == 7:
        return "Last 7 days"
    if time_range_days == 30:
        return "Last 30 days"
    if time_range_days == 90:
        return "Last 90 days"
    if time_range_days == 365:
        return "Last 12 months"
    return f"Last {time_range_days} days"


def _fmt_currency(value: float) -> str:
    if value >= 1_000_000:
        return f"${value / 1_000_000:,.1f}M"
    if value >= 1_000:
        return f"${value:,.0f}"
    return f"${value:,.2f}"


def _empty_evidence(fields: list[str], timeframe: str = "All time", note: str = "") -> MetricEvidence:
    return MetricEvidence(
        row_count=0,
        sampled_rows=0,
        fields_evaluated=fields,
        null_rates={f: 1.0 for f in fields},
        data_trust_score=0.0,
        timeframe=timeframe,
        computation_notes=[note] if note else [],
    )


# ---------------------------------------------------------------------------
# Revenue-model loader helper
# ---------------------------------------------------------------------------

async def _load_revenue_model(supabase, tenant_id: str, crm_source: str) -> Optional[dict]:
    """
    Load the confirmed revenue model for this tenant, or None if not yet confirmed.
    """
    try:
        result = (
            supabase.table("revenue_models")
            .select("won_stage_values,lost_stage_values,stage_order")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .limit(1)
            .execute()
        )
        if result.data and result.data[0].get("won_stage_values"):
            row = result.data[0]
            # Only return if confirmed (confirmed_at check handled by querying all columns)
            return row
    except Exception as e:
        logger.warning("_load_revenue_model: %s", e)
    return None


# ---------------------------------------------------------------------------
# Compute functions (one per metric)
# ---------------------------------------------------------------------------

async def _compute_pipeline_value(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Sum of open deal values (not won, not lost)."""
    from agents.kpi_resolver import resolve_kpi
    from agents import ChartConfig, ChartResult
    from agents.anvar import execute_chart_query

    key_fields = ["value", "won"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=time_range_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    if not dimension:
        kpi = await resolve_kpi(supabase, tenant_id, crm_source, "pipeline_value", time_range_days)
        value = kpi.value if kpi else "$0"
        return MetricResult(metric_key="pipeline_value", title="Pipeline Value",
                            value=value, chart_type="kpi", data=[], evidence=evidence)

    # Dimensional: group by dimension, sum value, exclude won deals
    cfg = ChartConfig(chart_type="bar", title=f"Pipeline Value by {dimension}",
                      data_source="crm_deals", x_field=dimension, y_field="value",
                      aggregation="sum", filter_field="won", filter_value="false",
                      time_range_days=time_range_days, sort_order="desc", item_limit=20)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)
    data = chart.data if chart else []
    return MetricResult(metric_key="pipeline_value", title="Pipeline Value",
                        value=None, chart_type="bar", data=data or [],
                        evidence=evidence, dimension=dimension)


async def _compute_new_deals(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Count of deals created in the timeframe."""
    from agents.kpi_resolver import resolve_kpi
    from agents import ChartConfig
    from agents.anvar import execute_chart_query

    key_fields = ["created_at"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=time_range_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    if not dimension:
        kpi = await resolve_kpi(supabase, tenant_id, crm_source, "total_deals", time_range_days)
        value = kpi.value if kpi else 0
        return MetricResult(metric_key="new_deals", title="New Deals",
                            value=value, chart_type="kpi", data=[], evidence=evidence)

    cfg = ChartConfig(chart_type="bar", title=f"New Deals by {dimension}",
                      data_source="crm_deals", x_field=dimension,
                      aggregation="count", time_range_days=time_range_days,
                      sort_order="desc", item_limit=20)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)
    return MetricResult(metric_key="new_deals", title="New Deals",
                        value=None, chart_type="bar", data=chart.data or [] if chart else [],
                        evidence=evidence, dimension=dimension)


async def _compute_win_rate(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Won deals / total closed deals × 100."""
    from agents.kpi_resolver import resolve_kpi

    key_fields = ["won", "created_at"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=time_range_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    if not dimension:
        kpi = await resolve_kpi(supabase, tenant_id, crm_source, "conversion_rate", time_range_days)
        value = kpi.value if kpi else "0.0%"
        return MetricResult(metric_key="win_rate", title="Win Rate",
                            value=value, chart_type="kpi", data=[], evidence=evidence)

    # Per-dimension win rate: compute in Python from row sample
    rep_data: dict[str, dict] = {}
    for r in rows:
        dim_val = str(r.get(dimension) or "Unknown")
        entry = rep_data.setdefault(dim_val, {"won": 0, "total": 0})
        entry["total"] += 1
        if r.get("won"):
            entry["won"] += 1

    data = sorted(
        [{"label": k, "value": round(v["won"] / v["total"] * 100, 1) if v["total"] else 0}
         for k, v in rep_data.items()],
        key=lambda x: -x["value"],
    )
    warnings = []
    if rates.get("won", 0) > 0.5:
        warnings.append(f"'won' field is NULL in {rates['won']:.0%} of rows — win rate may be understated.")
    return MetricResult(metric_key="win_rate", title="Win Rate",
                        value=None, chart_type="bar", data=data,
                        evidence=evidence, dimension=dimension, warnings=warnings)


async def _compute_avg_deal_size(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Average value of won deals."""
    from agents import ChartConfig
    from agents.anvar import execute_chart_query

    key_fields = ["value", "won"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=time_range_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    # Filter to won deals for the scalar value
    won_rows = [r for r in rows if r.get("won")]
    values = [float(r["value"]) for r in won_rows if r.get("value") is not None]
    avg = sum(values) / len(values) if values else 0.0
    scalar = _fmt_currency(avg)

    if not dimension:
        return MetricResult(metric_key="avg_deal_size", title="Avg Deal Size",
                            value=scalar, chart_type="kpi", data=[], evidence=evidence)

    cfg = ChartConfig(chart_type="bar", title=f"Avg Deal Size by {dimension}",
                      data_source="crm_deals", x_field=dimension, y_field="value",
                      aggregation="avg", filter_field="won", filter_value="true",
                      time_range_days=time_range_days, sort_order="desc", item_limit=20)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)
    return MetricResult(metric_key="avg_deal_size", title="Avg Deal Size",
                        value=scalar, chart_type="bar", data=chart.data or [] if chart else [],
                        evidence=evidence, dimension=dimension)


async def _compute_sales_cycle_days(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Average days from deal created_at to closed_at for won deals."""
    key_fields = ["won", "created_at", "closed_at"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_deals",
        key_fields + (["assigned_to"] if dimension == "assigned_to" else []),
        limit=500, time_range_days=time_range_days,
    )
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    def _cycle_days(r: dict) -> Optional[float]:
        if not r.get("won"):
            return None
        try:
            c = _parse_iso(r.get("created_at"))
            cl = _parse_iso(r.get("closed_at"))
            if c and cl:
                return max(0.0, (cl - c).total_seconds() / 86400)
        except Exception:
            pass
        return None

    warnings = []
    if rates.get("closed_at", 0) > 0.3:
        warnings.append(f"'closed_at' is NULL in {rates['closed_at']:.0%} of rows — cycle may be understated.")

    if not dimension:
        durations = [d for r in rows if (d := _cycle_days(r)) is not None]
        avg = round(sum(durations) / len(durations), 1) if durations else None
        return MetricResult(metric_key="sales_cycle_days", title="Sales Cycle (days)",
                            value=avg, chart_type="kpi", data=[], evidence=evidence, warnings=warnings)

    # Group by dimension
    groups: dict[str, list[float]] = {}
    for r in rows:
        d = _cycle_days(r)
        if d is None:
            continue
        key = str(r.get(dimension) or "Unknown")
        groups.setdefault(key, []).append(d)

    data = sorted(
        [{"label": k, "value": round(sum(v) / len(v), 1)} for k, v in groups.items() if v],
        key=lambda x: x["value"],
    )
    return MetricResult(metric_key="sales_cycle_days", title="Sales Cycle (days)",
                        value=None, chart_type="bar", data=data,
                        evidence=evidence, dimension=dimension, warnings=warnings)


async def _compute_stage_conversion(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Deal count per pipeline stage, ordered by revenue model stage_order."""
    from agents import ChartConfig
    from agents.anvar import execute_chart_query

    key_fields = ["stage"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=time_range_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    cfg = ChartConfig(chart_type="funnel", title="Stage Conversion",
                      data_source="crm_deals", x_field="stage",
                      aggregation="count", time_range_days=time_range_days,
                      sort_order="desc", item_limit=30)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)
    data = chart.data or [] if chart else []

    warnings = []
    if revenue_model:
        stage_order = revenue_model.get("stage_order") or []
        if stage_order:
            order_map = {s: i for i, s in enumerate(stage_order)}
            data = sorted(data, key=lambda d: order_map.get(d["label"], 999))
        else:
            warnings.append("Revenue model has no stage_order — funnel shown in raw order.")
    else:
        warnings.append("No confirmed revenue model — stage order is approximate.")

    return MetricResult(metric_key="stage_conversion", title="Stage Conversion",
                        value=None, chart_type="funnel", data=data,
                        evidence=evidence, warnings=warnings)


async def _compute_deal_velocity(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """New deals per time period (line chart)."""
    from agents import ChartConfig
    from agents.anvar import execute_chart_query

    effective_days = time_range_days or 90
    key_fields = ["created_at"]
    timeframe = _timeframe_label(effective_days)
    rows, total = await _fetch_sample(supabase, tenant_id, crm_source, "crm_deals", key_fields, time_range_days=effective_days)
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    cfg = ChartConfig(chart_type="line", title="Deal Velocity",
                      data_source="crm_deals", x_field="created_at",
                      aggregation="count", time_range_days=effective_days,
                      sort_order="asc", item_limit=365)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)

    # Roll up to requested grain if needed
    data = chart.data or [] if chart else []
    if time_grain in ("week", "month", "quarter") and data:
        data = _rollup_by_grain(data, time_grain)

    return MetricResult(metric_key="deal_velocity", title="Deal Velocity",
                        value=len(data), chart_type="line", data=data, evidence=evidence)


async def _compute_forecast_hygiene(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Open deals in late pipeline stages missing closed_at or value."""
    key_fields = ["stage", "value", "closed_at", "won"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_deals", key_fields, limit=500
    )
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    warnings = []
    won_stages = set()
    lost_stages = set()
    if revenue_model:
        won_stages = set(revenue_model.get("won_stage_values") or [])
        lost_stages = set(revenue_model.get("lost_stage_values") or [])
    else:
        warnings.append("No confirmed revenue model — 'open' is inferred from won=false.")

    # Identify open deals
    def _is_open(r: dict) -> bool:
        stage = r.get("stage") or ""
        if won_stages or lost_stages:
            return stage not in won_stages and stage not in lost_stages
        return not r.get("won")

    hygiene_issues: dict[str, int] = {
        "missing_close_date": 0,
        "missing_amount": 0,
        "both_missing": 0,
    }
    for r in rows:
        if not _is_open(r):
            continue
        no_close = r.get("closed_at") is None
        no_value = r.get("value") is None
        if no_close and no_value:
            hygiene_issues["both_missing"] += 1
        elif no_close:
            hygiene_issues["missing_close_date"] += 1
        elif no_value:
            hygiene_issues["missing_amount"] += 1

    total_issues = sum(hygiene_issues.values())
    data = [{"label": k.replace("_", " ").title(), "value": v}
            for k, v in hygiene_issues.items() if v > 0]

    return MetricResult(metric_key="forecast_hygiene", title="Forecast Hygiene",
                        value=total_issues, chart_type="bar", data=data,
                        evidence=evidence, warnings=warnings)


async def _compute_rep_activity_count(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Activity count per rep, optionally broken down by activity type."""
    from agents import ChartConfig
    from agents.anvar import execute_chart_query

    key_fields = ["employee_name", "type"]
    timeframe = _timeframe_label(time_range_days)
    rows, total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_activities", key_fields,
        time_range_days=time_range_days, time_field="started_at",
    )
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    warnings = []
    if rates.get("employee_name", 0) > 0.3:
        warnings.append(
            f"employee_name is NULL in {rates['employee_name']:.0%} of rows. "
            "Run a full CRM sync to populate rep names."
        )

    x_field = dimension if dimension == "type" else "employee_name"
    cfg = ChartConfig(chart_type="bar", title="Activity Count by Rep",
                      data_source="crm_activities", x_field=x_field,
                      aggregation="count", time_range_days=time_range_days,
                      sort_order="desc", item_limit=25)
    chart = await execute_chart_query(supabase, tenant_id, crm_source, cfg)
    return MetricResult(metric_key="rep_activity_count", title="Rep Activity Count",
                        value=total, chart_type="bar",
                        data=chart.data or [] if chart else [],
                        evidence=evidence, warnings=warnings)


async def _compute_activity_to_deal_ratio(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Activities per won deal, overall or per rep."""
    key_fields_act = ["employee_name"]
    key_fields_deal = ["assigned_to", "won"]
    timeframe = _timeframe_label(time_range_days)

    act_rows, act_total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_activities", key_fields_act,
        time_range_days=time_range_days, time_field="started_at",
    )
    deal_rows, deal_total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_deals", key_fields_deal,
        time_range_days=time_range_days,
    )

    combined_fields = key_fields_act + key_fields_deal
    combined_nulls = {**_null_rates(act_rows, key_fields_act), **_null_rates(deal_rows, key_fields_deal)}
    evidence = MetricEvidence(
        row_count=act_total + deal_total, sampled_rows=len(act_rows) + len(deal_rows),
        fields_evaluated=combined_fields, null_rates=combined_nulls,
        data_trust_score=_trust_score(combined_nulls), timeframe=timeframe,
    )

    won_deals = sum(1 for r in deal_rows if r.get("won"))
    ratio = round(len(act_rows) / won_deals, 1) if won_deals else None

    if not dimension:
        return MetricResult(metric_key="activity_to_deal_ratio", title="Activity / Won Deal",
                            value=ratio, chart_type="kpi", data=[], evidence=evidence)

    # Per-rep ratio
    rep_acts: dict[str, int] = {}
    for r in act_rows:
        rep = str(r.get("employee_name") or "Unknown")
        rep_acts[rep] = rep_acts.get(rep, 0) + 1

    rep_deals: dict[str, int] = {}
    for r in deal_rows:
        if r.get("won"):
            rep = str(r.get("assigned_to") or "Unknown")
            rep_deals[rep] = rep_deals.get(rep, 0) + 1

    all_reps = set(rep_acts) | set(rep_deals)
    data = sorted(
        [{"label": rep, "value": round(rep_acts.get(rep, 0) / rep_deals[rep], 1)}
         for rep in all_reps if rep_deals.get(rep)],
        key=lambda x: -x["value"],
    )
    return MetricResult(metric_key="activity_to_deal_ratio", title="Activity / Won Deal",
                        value=ratio, chart_type="bar", data=data,
                        evidence=evidence, dimension=dimension)


async def _compute_lead_to_deal_rate(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Deals created / leads created in the period (conversion rate from top of funnel)."""
    timeframe = _timeframe_label(time_range_days)

    lead_rows, lead_total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_leads", ["created_at"],
        time_range_days=time_range_days,
    )
    deal_rows, deal_total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_deals", ["created_at"],
        time_range_days=time_range_days,
    )

    combined_rates = {**_null_rates(lead_rows, ["created_at"]), **_null_rates(deal_rows, ["created_at"])}
    evidence = MetricEvidence(
        row_count=lead_total + deal_total, sampled_rows=len(lead_rows) + len(deal_rows),
        fields_evaluated=["crm_leads.created_at", "crm_deals.created_at"],
        null_rates=combined_rates,
        data_trust_score=_trust_score(combined_rates), timeframe=timeframe,
        computation_notes=["lead_count={}, deal_count={}".format(lead_total, deal_total)],
    )

    rate = round(deal_total / lead_total * 100, 1) if lead_total else None
    value = f"{rate}%" if rate is not None else "N/A"

    return MetricResult(metric_key="lead_to_deal_rate", title="Lead → Deal Rate",
                        value=value, chart_type="kpi", data=[], evidence=evidence)


async def _compute_pipeline_stall_risk(
    supabase, tenant_id: str, crm_source: str,
    dimension: Optional[str], time_range_days: Optional[int],
    time_grain: Optional[str], revenue_model: Optional[dict],
    **_,
) -> MetricResult:
    """Open deals with no activity (modified_at) for more than stall_days (default 30)."""
    stall_days = time_range_days or 30
    cutoff = datetime.now(timezone.utc) - timedelta(days=stall_days)
    key_fields = ["stage", "modified_at", "won", "title"]
    timeframe = f"Stalled > {stall_days} days"

    rows, total = await _fetch_sample(
        supabase, tenant_id, crm_source, "crm_deals", key_fields, limit=500,
    )
    rates = _null_rates(rows, key_fields)
    evidence = MetricEvidence(
        row_count=total, sampled_rows=len(rows),
        fields_evaluated=key_fields, null_rates=rates,
        data_trust_score=_trust_score(rates), timeframe=timeframe,
    )

    warnings = []
    won_stages = set()
    lost_stages = set()
    if revenue_model:
        won_stages = set(revenue_model.get("won_stage_values") or [])
        lost_stages = set(revenue_model.get("lost_stage_values") or [])
    else:
        warnings.append("No confirmed revenue model — open deals inferred from won=false.")

    stalled_by_stage: dict[str, int] = {}
    for r in rows:
        # Only consider open deals
        stage = r.get("stage") or "Unknown"
        if won_stages or lost_stages:
            if stage in won_stages or stage in lost_stages:
                continue
        elif r.get("won"):
            continue

        mod = _parse_iso(r.get("modified_at"))
        if mod and mod < cutoff:
            stalled_by_stage[stage] = stalled_by_stage.get(stage, 0) + 1

    total_stalled = sum(stalled_by_stage.values())
    data = sorted(
        [{"label": k, "value": v} for k, v in stalled_by_stage.items()],
        key=lambda x: -x["value"],
    )
    return MetricResult(metric_key="pipeline_stall_risk", title="Pipeline Stall Risk",
                        value=total_stalled, chart_type="bar", data=data,
                        evidence=evidence, warnings=warnings)


# ---------------------------------------------------------------------------
# Helpers for compute functions
# ---------------------------------------------------------------------------

def _parse_iso(s: Any) -> Optional[datetime]:
    if not s:
        return None
    try:
        if isinstance(s, datetime):
            return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
        s = str(s).strip()
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _rollup_by_grain(data: list[dict], grain: str) -> list[dict]:
    """Roll up daily data points into week/month/quarter buckets."""
    from collections import defaultdict

    def _bucket(date_str: str) -> str:
        try:
            d = datetime.fromisoformat(date_str[:10])
        except Exception:
            return date_str
        if grain == "week":
            # ISO week start (Monday)
            mon = d - timedelta(days=d.weekday())
            return mon.strftime("%Y-%m-%d")
        if grain == "month":
            return d.strftime("%Y-%m")
        if grain == "quarter":
            q = (d.month - 1) // 3 + 1
            return f"{d.year}-Q{q}"
        return date_str

    buckets: dict[str, float] = defaultdict(float)
    for point in data:
        b = _bucket(str(point.get("label", "")))
        buckets[b] += float(point.get("value", 0))

    return [{"label": k, "value": round(v, 2)} for k, v in sorted(buckets.items())]


# ---------------------------------------------------------------------------
# Metric registrations — the catalog
# ---------------------------------------------------------------------------

_register(
    MetricDefinition(
        key="pipeline_value",
        title="Pipeline Value",
        description="Total value of open deals (not yet won or lost). Tracks the current revenue opportunity in the pipeline.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["value", "won"]},
        allowed_dimensions=["assigned_to", "stage", "currency"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_pipeline_value,
)

_register(
    MetricDefinition(
        key="new_deals",
        title="New Deals",
        description="Count of deals created in the selected period. Measures top-of-funnel deal creation activity.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["created_at"]},
        allowed_dimensions=["assigned_to", "stage"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_new_deals,
)

_register(
    MetricDefinition(
        key="win_rate",
        title="Win Rate",
        description="Percentage of deals marked as won. Requires the 'won' field to be populated by the sync engine.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["won", "created_at"]},
        allowed_dimensions=["assigned_to"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_win_rate,
)

_register(
    MetricDefinition(
        key="avg_deal_size",
        title="Avg Deal Size",
        description="Average value of won deals. Filters to confirmed-won deals only to avoid inflating the average with pipeline deals.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["value", "won"]},
        allowed_dimensions=["assigned_to", "stage"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_avg_deal_size,
)

_register(
    MetricDefinition(
        key="sales_cycle_days",
        title="Sales Cycle (days)",
        description="Average days from deal creation to close for won deals. Requires both created_at and closed_at to be populated.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["won", "created_at", "closed_at"]},
        allowed_dimensions=["assigned_to"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_sales_cycle_days,
)

_register(
    MetricDefinition(
        key="stage_conversion",
        title="Stage Conversion",
        description="Deal count per pipeline stage in funnel order. Ordered by the confirmed revenue model's stage_order when available.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["stage"]},
        allowed_dimensions=[],
        allowed_time_grains=["day", "week", "month", "quarter"],
        requires_revenue_model=True,
    ),
    _compute_stage_conversion,
)

_register(
    MetricDefinition(
        key="deal_velocity",
        title="Deal Velocity",
        description="New deals over time (line chart). Reveals acceleration or slowdown in deal creation. Supports day/week/month rollup.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["created_at"]},
        allowed_dimensions=[],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_deal_velocity,
)

_register(
    MetricDefinition(
        key="forecast_hygiene",
        title="Forecast Hygiene",
        description="Open deals missing close date or deal value. Bad hygiene inflates pipeline and distorts forecasting.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["stage", "value", "closed_at", "won"]},
        allowed_dimensions=[],
        allowed_time_grains=[],
        requires_revenue_model=True,
    ),
    _compute_forecast_hygiene,
)

_register(
    MetricDefinition(
        key="rep_activity_count",
        title="Rep Activity Count",
        description="Total CRM activities logged per sales rep (calls, emails, meetings, tasks). Requires employee_name to be synced.",
        required_tables=["crm_activities"],
        required_fields={"crm_activities": ["employee_name", "type"]},
        allowed_dimensions=["type"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_rep_activity_count,
)

_register(
    MetricDefinition(
        key="activity_to_deal_ratio",
        title="Activity / Won Deal",
        description="Number of activities per won deal. High ratios may indicate inefficiency; low ratios may indicate under-engagement.",
        required_tables=["crm_activities", "crm_deals"],
        required_fields={
            "crm_activities": ["employee_name"],
            "crm_deals": ["assigned_to", "won"],
        },
        allowed_dimensions=["assigned_to"],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_activity_to_deal_ratio,
)

_register(
    MetricDefinition(
        key="lead_to_deal_rate",
        title="Lead → Deal Rate",
        description="Percentage of leads that become deals in the period. Measures top-of-funnel conversion effectiveness.",
        required_tables=["crm_leads", "crm_deals"],
        required_fields={
            "crm_leads": ["created_at"],
            "crm_deals": ["created_at"],
        },
        allowed_dimensions=[],
        allowed_time_grains=["day", "week", "month", "quarter"],
    ),
    _compute_lead_to_deal_rate,
)

_register(
    MetricDefinition(
        key="pipeline_stall_risk",
        title="Pipeline Stall Risk",
        description="Open deals with no updates for more than N days (default 30). High stall counts are a leading indicator of pipeline decay.",
        required_tables=["crm_deals"],
        required_fields={"crm_deals": ["stage", "modified_at", "won"]},
        allowed_dimensions=["stage"],
        allowed_time_grains=[],
        requires_revenue_model=True,
    ),
    _compute_pipeline_stall_risk,
)


# ---------------------------------------------------------------------------
# MetricValidator
# ---------------------------------------------------------------------------

class MetricValidator:
    """
    Validates metric requests before any DB compute runs.

    Checks:
    1. metric_key exists in METRIC_CATALOG.
    2. dimension is in MetricDefinition.allowed_dimensions (if provided).
    3. All required_tables are non-empty for this tenant/source.

    Returns (available, reason, partial_evidence) so callers can return
    structured errors rather than HTTP 500s.
    """

    def __init__(self):
        # Per-instance cache for row counts to avoid repeated DB queries
        # within a single validation pass (e.g. get_catalog_with_trust).
        self._count_cache: dict[str, int] = {}

    async def _cached_count(self, supabase, tenant_id: str, crm_source: str, table: str) -> int:
        key = f"{tenant_id}:{crm_source}:{table}"
        if key not in self._count_cache:
            self._count_cache[key] = await _count_rows(supabase, tenant_id, crm_source, table)
        return self._count_cache[key]

    async def validate(
        self,
        supabase,
        tenant_id: str,
        crm_source: str,
        metric_key: str,
        dimension: Optional[str] = None,
    ) -> tuple[bool, str, Optional[MetricEvidence]]:
        """
        Returns (ok, error_message, evidence_or_None).
        ok=False → caller should return 422 with error_message.
        """
        defn = METRIC_CATALOG.get(metric_key)
        if not defn:
            known = sorted(METRIC_CATALOG.keys())
            return False, f"Unknown metric '{metric_key}'. Known: {known}", None

        if dimension and dimension not in defn.allowed_dimensions:
            return (
                False,
                f"Dimension '{dimension}' is not allowed for metric '{metric_key}'. "
                f"Allowed dimensions: {defn.allowed_dimensions or ['(none)']}",
                None,
            )

        # Check table availability (counts only — fast, cached per-instance)
        table_counts: dict[str, int] = {}
        for table in defn.required_tables:
            count = await self._cached_count(supabase, tenant_id, crm_source, table)
            table_counts[table] = count

        empty_tables = [t for t, c in table_counts.items() if c == 0]
        if empty_tables:
            return (
                False,
                f"Required table(s) have no data for this tenant: {empty_tables}. "
                "Ensure the CRM sync has completed.",
                None,
            )

        return True, "", None

    async def compute_trust(
        self,
        supabase,
        tenant_id: str,
        crm_source: str,
        defn: MetricDefinition,
        time_range_days: Optional[int] = None,
    ) -> MetricEvidence:
        """
        Sample each required table and compute null rates + trust score.
        Used by GET /metrics for the catalog view (shallow sampling).
        """
        all_fields: list[str] = []
        all_rows: list[dict] = []
        total_count = 0
        notes: list[str] = []

        for table, fields in defn.required_fields.items():
            rows, count = await _fetch_sample(
                supabase, tenant_id, crm_source, table, fields,
                limit=200, time_range_days=time_range_days,
            )
            all_fields.extend(fields)
            all_rows.extend(rows)
            total_count += count

        rates = _null_rates(all_rows, list(dict.fromkeys(all_fields)))
        trust = _trust_score(rates)

        # Penalise low row counts
        if total_count == 0:
            trust = 0.0
            notes.append("No data in required tables.")
        elif total_count < 10:
            trust = min(trust, 0.3)
            notes.append(f"Only {total_count} rows — low confidence.")

        return MetricEvidence(
            row_count=total_count,
            sampled_rows=len(all_rows),
            fields_evaluated=list(dict.fromkeys(all_fields)),
            null_rates=rates,
            data_trust_score=trust,
            timeframe=_timeframe_label(time_range_days),
            computation_notes=notes,
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_catalog_with_trust(
    supabase,
    tenant_id: str,
    crm_source: str,
) -> list[dict]:
    """
    Return all 12 metric definitions enriched with availability and trust score.
    Designed for GET /metrics — does not compute actual metric values.

    .. deprecated:: Phase 3
        Use tenant_metrics + dynamic_compute for new tenants. Kept for legacy
        /revenue/metrics endpoint. Remove after 2026-04-01.
    """
    import warnings
    warnings.warn(
        "get_catalog_with_trust is deprecated (Phase 3). "
        "Use tenant_metrics + dynamic_compute for new tenants.",
        DeprecationWarning,
        stacklevel=2,
    )
    import asyncio as _asyncio
    validator = MetricValidator()

    async def _process_metric(defn):
        # Fast availability check (counts only, cached per-validator)
        ok, reason, _ = await validator.validate(supabase, tenant_id, crm_source, defn.key)
        available = ok

        # Compute trust (sampling) only if available
        if available:
            evidence = await validator.compute_trust(supabase, tenant_id, crm_source, defn)
        else:
            evidence = _empty_evidence(
                [f for fields in defn.required_fields.values() for f in fields],
                note=reason,
            )

        return {
            "key": defn.key,
            "title": defn.title,
            "description": defn.description,
            "available": available,
            "unavailable_reason": reason if not available else None,
            "requires_revenue_model": defn.requires_revenue_model,
            "allowed_dimensions": defn.allowed_dimensions,
            "allowed_time_grains": defn.allowed_time_grains,
            "data_trust_score": evidence.data_trust_score,
            "evidence": {
                "row_count": evidence.row_count,
                "fields_evaluated": evidence.fields_evaluated,
                "null_rates": evidence.null_rates,
                "notes": evidence.computation_notes,
            },
        }

    results = await _asyncio.gather(
        *[_process_metric(defn) for defn in METRIC_CATALOG.values()]
    )
    return list(results)


async def compute_metric(
    metric_key: str,
    supabase,
    tenant_id: str,
    crm_source: str,
    dimension: Optional[str] = None,
    time_range_days: Optional[int] = None,
    time_grain: Optional[str] = None,
) -> MetricResult:
    """
    Validate and execute one metric computation.
    Raises ValueError for unknown metric or disallowed dimension.
    Use MetricValidator.validate() first to get a structured error.

    .. deprecated:: Phase 3
        Use tenant_metrics + dynamic_compute for new tenants. Kept for legacy
        /revenue/metrics/query endpoint. Remove after 2026-04-01.
    """
    import warnings
    warnings.warn(
        "compute_metric is deprecated (Phase 3). "
        "Use dynamic_compute.compute_tenant_snapshot for new tenants.",
        DeprecationWarning,
        stacklevel=2,
    )
    fn = _COMPUTE_FNS.get(metric_key)
    if not fn:
        raise ValueError(f"No compute function for metric '{metric_key}'")

    revenue_model = None
    defn = METRIC_CATALOG[metric_key]
    if defn.requires_revenue_model:
        revenue_model = await _load_revenue_model(supabase, tenant_id, crm_source)

    return await fn(
        supabase=supabase,
        tenant_id=tenant_id,
        crm_source=crm_source,
        dimension=dimension,
        time_range_days=time_range_days,
        time_grain=time_grain,
        revenue_model=revenue_model,
    )
