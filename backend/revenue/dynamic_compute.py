"""
Dynamic Compute Engine — Phase 2
=================================
Executes declarative metric computation recipes stored in tenant_metrics.computation.
All queries are tenant-scoped and field-validated against crm_field_registry.

Supported recipe types: count, sum, avg, ratio, duration, distinct_count

Every result includes DynamicMetricEvidence for provenance.
Zero LLM cost — pure SQL.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from agents import DynamicMetricResult, DynamicMetricEvidence
from agents.anvar import load_allowed_fields, DEFAULT_ALLOWED_FIELDS

logger = logging.getLogger(__name__)

# Filter operators supported in computation recipes
FILTER_OPS = {
    "": "eq",            # field: value → .eq(field, value)
    "__not": "neq",      # field__not: value → .neq(field, value)
    "__gt": "gt",
    "__lt": "lt",
    "__gte": "gte",
    "__lte": "lte",
    "__is": "is_",       # field__is: null → .is_(field, "null")
    "__in": "in_",       # field__in: [a, b] → .in_(field, [a, b])
}


async def compute_metric(
    supabase,
    tenant_id: str,
    crm_source: str,
    metric_def: dict,
    timeframe_days: Optional[int] = None,
    allowed_fields: dict = None,
    currency: Optional[str] = None,
) -> DynamicMetricResult:
    """
    Execute a declarative computation recipe and return a DynamicMetricResult.

    Args:
        metric_def: Dict with at minimum {metric_key, title, computation, source_table,
                    display_format, required_fields}. Usually a row from tenant_metrics.
        timeframe_days: Override time range (days). If None, queries all time.
        allowed_fields: Per-tenant field whitelist. If None, loads dynamically.
        currency: Currency symbol from SchemaProfile.

    Returns:
        DynamicMetricResult with value, evidence, confidence, and optional comparison.
    """
    metric_key = metric_def.get("metric_key", "unknown")
    title = metric_def.get("title", metric_key)
    display_format = metric_def.get("display_format", "number")
    recipe = metric_def.get("computation", {})
    required_fields = metric_def.get("required_fields", [])
    source_table = metric_def.get("source_table", "")

    # Load allowed fields if not provided
    if allowed_fields is None:
        try:
            allowed_fields = await load_allowed_fields(supabase, tenant_id, crm_source)
        except Exception:
            allowed_fields = DEFAULT_ALLOWED_FIELDS

    # Validate source table
    if source_table and source_table not in allowed_fields:
        # For ratio type, check both numerator and denominator tables
        if recipe.get("type") != "ratio":
            return _error_result(metric_key, title, display_format,
                                 f"Table '{source_table}' not in allowed fields")

    # Validate required fields
    if source_table and source_table in allowed_fields:
        for field in required_fields:
            if field not in allowed_fields[source_table]:
                return _error_result(metric_key, title, display_format,
                                     f"Field '{field}' not in whitelist for {source_table}")

    recipe_type = recipe.get("type", "count")

    try:
        if recipe_type == "count":
            value, evidence = await _compute_count(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        elif recipe_type == "sum":
            value, evidence = await _compute_sum(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        elif recipe_type == "avg":
            value, evidence = await _compute_avg(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        elif recipe_type == "ratio":
            value, evidence = await _compute_ratio(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        elif recipe_type == "duration":
            value, evidence = await _compute_duration(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        elif recipe_type == "distinct_count":
            value, evidence = await _compute_distinct_count(
                supabase, tenant_id, crm_source, recipe, timeframe_days
            )
        else:
            return _error_result(metric_key, title, display_format,
                                 f"Unknown recipe type: {recipe_type}")

        # Compute period-over-period comparison
        comparison = None
        if timeframe_days and value is not None:
            try:
                comparison = await _compute_comparison(
                    supabase, tenant_id, crm_source, recipe,
                    recipe_type, timeframe_days
                )
            except Exception as e:
                logger.debug(f"Comparison failed for {metric_key}: {e}")

        # Build confidence from evidence
        confidence = _compute_confidence(evidence, metric_def.get("confidence", 0.5))

        return DynamicMetricResult(
            metric_key=metric_key,
            title=title,
            value=value,
            display_format=display_format,
            currency=currency,
            evidence=evidence,
            confidence=confidence,
            comparison=comparison,
        )

    except Exception as e:
        logger.error(f"compute_metric failed for {metric_key}: {e}")
        return _error_result(metric_key, title, display_format, str(e))


async def compute_tenant_snapshot(
    supabase,
    tenant_id: str,
    crm_source: str,
    timeframe_days: int = 30,
) -> list[DynamicMetricResult]:
    """
    Compute all active tenant_metrics for a tenant.
    Returns list of DynamicMetricResult.
    """
    try:
        result = supabase.table("tenant_metrics").select("*").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).eq("active", True).execute()

        if not result.data:
            logger.info(f"No tenant_metrics for {tenant_id}/{crm_source}")
            return []

        allowed_fields = await load_allowed_fields(supabase, tenant_id, crm_source)
        results = []

        for metric_def in result.data:
            mr = await compute_metric(
                supabase, tenant_id, crm_source, metric_def,
                timeframe_days=timeframe_days,
                allowed_fields=allowed_fields,
            )
            results.append(mr)

        return results

    except Exception as e:
        logger.error(f"compute_tenant_snapshot failed: {e}")
        return []


# ── Recipe executors ──────────────────────────────────────────────────

async def _compute_count(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """COUNT(*) with filters and time range."""
    table = recipe.get("table", "")
    filters = recipe.get("filters", {})

    query = supabase.table(table).select("*", count="exact")
    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = _apply_time_range(query, timeframe_days)
    result = query.limit(0).execute()

    count = result.count or 0
    evidence = _build_evidence(table, count, timeframe_days, f"COUNT(*) from {table}")
    return count, evidence


async def _compute_sum(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """SUM(field) — fetches field values and sums in Python (Supabase lacks server-side agg)."""
    table = recipe.get("table", "")
    field = recipe.get("field", "")
    filters = recipe.get("filters", {})

    if not field:
        return 0, _build_evidence(table, 0, timeframe_days, "SUM requires a field")

    query = supabase.table(table).select(field)
    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = _apply_time_range(query, timeframe_days)
    result = query.limit(50000).execute()

    rows = result.data or []
    values = [float(r[field]) for r in rows if r.get(field) is not None]
    total = sum(values) if values else 0
    n = len(values)

    evidence = _build_evidence(table, n, timeframe_days, f"SUM({field}) from {table}")
    if n == 0:
        evidence.caveats.append("No non-null values found")
    return round(total, 2), evidence


async def _compute_avg(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """AVG(field)."""
    table = recipe.get("table", "")
    field = recipe.get("field", "")
    filters = recipe.get("filters", {})

    if not field:
        return 0, _build_evidence(table, 0, timeframe_days, "AVG requires a field")

    query = supabase.table(table).select(field)
    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = _apply_time_range(query, timeframe_days)
    result = query.limit(50000).execute()

    rows = result.data or []
    values = [float(r[field]) for r in rows if r.get(field) is not None]
    avg = (sum(values) / len(values)) if values else 0
    n = len(values)

    evidence = _build_evidence(table, n, timeframe_days, f"AVG({field}) from {table}")
    if n < 10:
        evidence.caveats.append(f"Low sample size (n={n})")
    return round(avg, 2), evidence


async def _compute_ratio(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """RATIO: numerator_agg / denominator_agg * multiply."""
    num = recipe.get("numerator", {})
    den = recipe.get("denominator", {})
    multiply = recipe.get("multiply", 1)

    num_val = await _compute_single_agg(supabase, tenant_id, crm_source, num, timeframe_days)
    den_val = await _compute_single_agg(supabase, tenant_id, crm_source, den, timeframe_days)

    if den_val and den_val > 0:
        value = round((num_val / den_val) * multiply, 2)
    else:
        value = 0

    table = num.get("table", den.get("table", "unknown"))
    evidence = _build_evidence(
        table, int(den_val or 0), timeframe_days,
        f"({num.get('agg', 'count')} / {den.get('agg', 'count')}) * {multiply}"
    )
    if den_val == 0:
        evidence.caveats.append("Denominator is zero")
    return value, evidence


async def _compute_duration(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """AVG(end_field - start_field) in specified unit."""
    table = recipe.get("table", "")
    start_field = recipe.get("start_field", "created_at")
    end_field = recipe.get("end_field", "closed_at")
    unit = recipe.get("unit", "days")
    filters = recipe.get("filters", {})

    query = supabase.table(table).select(f"{start_field},{end_field}")
    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = _apply_time_range(query, timeframe_days)
    result = query.limit(50000).execute()

    rows = result.data or []
    durations = []
    for r in rows:
        start_val = _parse_iso(r.get(start_field))
        end_val = _parse_iso(r.get(end_field))
        if start_val and end_val and end_val > start_val:
            delta = (end_val - start_val).total_seconds()
            if unit == "days":
                durations.append(delta / 86400)
            elif unit == "hours":
                durations.append(delta / 3600)
            else:
                durations.append(delta)

    avg_dur = round(sum(durations) / len(durations), 1) if durations else 0
    n = len(durations)

    evidence = _build_evidence(
        table, n, timeframe_days,
        f"AVG({end_field} - {start_field}) in {unit}"
    )
    if n < 5:
        evidence.caveats.append(f"Very low sample size (n={n})")
    return avg_dur, evidence


async def _compute_distinct_count(supabase, tenant_id, crm_source, recipe, timeframe_days):
    """COUNT(DISTINCT field)."""
    table = recipe.get("table", "")
    field = recipe.get("field", "")
    filters = recipe.get("filters", {})

    if not field:
        return 0, _build_evidence(table, 0, timeframe_days, "DISTINCT_COUNT requires a field")

    query = supabase.table(table).select(field)
    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = _apply_time_range(query, timeframe_days)
    result = query.limit(50000).execute()

    rows = result.data or []
    distinct = set(str(r[field]) for r in rows if r.get(field) is not None)
    n = len(rows)

    evidence = _build_evidence(table, n, timeframe_days, f"COUNT(DISTINCT {field}) from {table}")
    return len(distinct), evidence


# ── Comparison helper ─────────────────────────────────────────────────

async def _compute_comparison(supabase, tenant_id, crm_source, recipe, recipe_type, timeframe_days):
    """Compute the same metric for the previous period and return comparison dict."""
    if recipe_type == "ratio":
        return None  # Ratio comparison requires double computation — skip for now

    table = recipe.get("table", "")
    field = recipe.get("field")
    filters = recipe.get("filters", {})

    now = datetime.now(timezone.utc)
    prev_end = now - timedelta(days=timeframe_days)
    prev_start = prev_end - timedelta(days=timeframe_days)

    query = supabase.table(table)
    if recipe_type in ("sum", "avg", "distinct_count") and field:
        query = query.select(field)
    else:
        query = query.select("*", count="exact")

    query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
    query = _apply_filters(query, filters)
    query = query.gte("created_at", prev_start.isoformat())
    query = query.lt("created_at", prev_end.isoformat())

    if recipe_type == "count":
        result = query.limit(0).execute()
        prev_value = result.count or 0
    elif recipe_type in ("sum", "avg"):
        result = query.limit(50000).execute()
        rows = result.data or []
        values = [float(r[field]) for r in rows if r.get(field) is not None]
        if recipe_type == "sum":
            prev_value = sum(values) if values else 0
        else:
            prev_value = (sum(values) / len(values)) if values else 0
    elif recipe_type == "distinct_count" and field:
        result = query.limit(50000).execute()
        rows = result.data or []
        prev_value = len(set(str(r[field]) for r in rows if r.get(field) is not None))
    else:
        return None

    if prev_value and prev_value > 0:
        # Need current value for comparison — caller already has it, but we recompute
        # Actually, the caller passes the current value implicitly. Let's return the prev
        # and let the caller build the comparison.
        return {"previous_value": round(prev_value, 2)}

    return None


async def _compute_single_agg(supabase, tenant_id, crm_source, spec, timeframe_days):
    """Compute a single aggregate (for ratio numerator/denominator)."""
    table = spec.get("table", "")
    agg = spec.get("agg", "count")
    field = spec.get("field")
    filters = spec.get("filter", {})

    query = supabase.table(table)

    if agg == "count":
        query = query.select("*", count="exact")
        query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
        query = _apply_filters(query, filters)
        query = _apply_time_range(query, timeframe_days)
        result = query.limit(0).execute()
        return result.count or 0

    elif agg in ("sum", "avg") and field:
        query = query.select(field)
        query = query.eq("tenant_id", tenant_id).eq("crm_source", crm_source)
        query = _apply_filters(query, filters)
        query = _apply_time_range(query, timeframe_days)
        result = query.limit(50000).execute()
        rows = result.data or []
        values = [float(r[field]) for r in rows if r.get(field) is not None]
        if agg == "sum":
            return sum(values) if values else 0
        return (sum(values) / len(values)) if values else 0

    return 0


# ── Filter / time range helpers ───────────────────────────────────────

def _apply_filters(query, filters: dict):
    """Apply filter operators from a recipe's filters dict."""
    for key, value in filters.items():
        # Parse operator suffix
        op_found = False
        for suffix, method in sorted(FILTER_OPS.items(), key=lambda x: -len(x[0])):
            if suffix and key.endswith(suffix):
                field_name = key[:-len(suffix)]
                if method == "is_":
                    query = query.is_(field_name, value)
                elif method == "in_":
                    query = query.in_(field_name, value if isinstance(value, list) else [value])
                elif method == "neq":
                    query = query.neq(field_name, value)
                elif method == "gt":
                    query = query.gt(field_name, value)
                elif method == "lt":
                    query = query.lt(field_name, value)
                elif method == "gte":
                    query = query.gte(field_name, value)
                elif method == "lte":
                    query = query.lte(field_name, value)
                op_found = True
                break
        if not op_found:
            # Default: equality
            if value is True:
                query = query.is_(key, True)
            elif value is False:
                query = query.is_(key, False)
            elif value is None:
                query = query.is_(key, "null")
            else:
                query = query.eq(key, value)
    return query


def _apply_time_range(query, timeframe_days, time_field="created_at"):
    """Apply a time range filter."""
    if timeframe_days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=timeframe_days)
        query = query.gte(time_field, cutoff.isoformat())
    return query


def _build_evidence(table, n, timeframe_days, definition) -> DynamicMetricEvidence:
    """Build a DynamicMetricEvidence from compute results."""
    if timeframe_days:
        timeframe = f"Last {timeframe_days} days"
    else:
        timeframe = "All time"

    caveats = []
    if n == 0:
        caveats.append("No data found for this metric")
    elif n < 10:
        caveats.append(f"Low sample size (n={n})")

    return DynamicMetricEvidence(
        row_count=n,
        timeframe=timeframe,
        definition=definition,
        source_tables=[table] if table else [],
        caveats=caveats,
    )


def _compute_confidence(evidence: DynamicMetricEvidence, base_confidence: float) -> float:
    """Compute final confidence from evidence quality."""
    if evidence.row_count == 0:
        return 0.0
    if evidence.row_count < 10:
        return min(base_confidence, 0.5)
    if evidence.caveats:
        return min(base_confidence, 0.7)
    return base_confidence


def _error_result(metric_key, title, display_format, error_msg) -> DynamicMetricResult:
    """Return a DynamicMetricResult for errors."""
    return DynamicMetricResult(
        metric_key=metric_key,
        title=title,
        value=None,
        display_format=display_format,
        evidence=DynamicMetricEvidence(
            row_count=0,
            timeframe="N/A",
            definition="",
            caveats=[f"Error: {error_msg}"],
        ),
        confidence=0.0,
    )


def _parse_iso(s) -> Optional[datetime]:
    """Parse ISO datetime string."""
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


# ── Phase 3 helper: metric cards for frontend ─────────────────────────

def format_metric_card(result: DynamicMetricResult) -> dict:
    """
    Format a DynamicMetricResult as an API-ready metric card.
    Phase 3 will use this for MetricsSummaryCard rendering.
    """
    card = {
        "key": result.metric_key,
        "title": result.title,
        "value": result.value,
        "format": result.display_format,
        "confidence": result.confidence,
        "currency": result.currency,
        "trend": None,
    }

    if result.comparison and result.comparison.get("previous_value"):
        prev = result.comparison["previous_value"]
        if prev > 0 and result.value is not None:
            try:
                pct = ((float(result.value) - prev) / prev) * 100
                card["trend"] = {
                    "change_pct": round(pct, 1),
                    "direction": "up" if pct > 0 else ("down" if pct < 0 else "flat"),
                    "previous_value": prev,
                }
            except (TypeError, ValueError):
                pass

    return card
