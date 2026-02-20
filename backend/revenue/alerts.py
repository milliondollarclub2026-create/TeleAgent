"""
Alerts Engine — Phase 2
========================
Evaluates tenant_alert_rules against live CRM data.
5 generic alert patterns:
  - trend_decline: Metric dropped >X% period-over-period
  - stagnation: Records not modified in >N days
  - concentration: >X% of total attributed to single entity/rep
  - missing_data: Critical field null rate >X%
  - divergence: Two related metrics moving in opposite directions

All patterns are deterministic (no LLM). Cost: $0.
Returns list of AlertResult for consumption by Nilufar (recommendation engine).
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from agents import AlertResult, DynamicMetricResult
from agents.anvar import load_allowed_fields, DEFAULT_ALLOWED_FIELDS
from agents.bobur_tools import build_rep_name_map, resolve_rep_name

logger = logging.getLogger(__name__)


async def evaluate_alert_rules(
    supabase,
    tenant_id: str,
    crm_source: str,
    metric_results: list[DynamicMetricResult],
) -> list[AlertResult]:
    """
    Load tenant_alert_rules and evaluate each against live data/metrics.
    Returns fired alerts as AlertResult list.
    """
    try:
        result = supabase.table("tenant_alert_rules").select("*").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).eq("active", True).execute()

        if not result.data:
            logger.debug(f"No alert rules for {tenant_id}/{crm_source}")
            return []
    except Exception as e:
        logger.error(f"Failed to load alert rules: {e}")
        return []

    # Index metric results by key for quick lookup
    metric_map: dict[str, DynamicMetricResult] = {}
    for mr in metric_results:
        metric_map[mr.metric_key] = mr

    fired: list[AlertResult] = []

    for rule in result.data:
        pattern = rule.get("pattern", "")
        config = rule.get("config", {})
        severity_rules = rule.get("severity_rules", {})
        metric_key = rule.get("metric_key")
        entity = rule.get("entity")

        # Parse JSONB if stored as strings
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError:
                continue
        if isinstance(severity_rules, str):
            try:
                severity_rules = json.loads(severity_rules)
            except json.JSONDecodeError:
                severity_rules = {}

        try:
            if pattern == "trend_decline":
                alert = _evaluate_trend_decline(
                    metric_key, metric_map, config, severity_rules
                )
            elif pattern == "stagnation":
                alert = await _evaluate_stagnation(
                    supabase, tenant_id, crm_source, entity, config, severity_rules
                )
            elif pattern == "concentration":
                alert = await _evaluate_concentration(
                    supabase, tenant_id, crm_source, metric_key, metric_map,
                    config, severity_rules
                )
            elif pattern == "missing_data":
                alert = _evaluate_missing_data(
                    metric_key, entity, config, severity_rules
                )
            elif pattern == "divergence":
                alert = _evaluate_divergence(
                    config, metric_map, severity_rules
                )
            else:
                logger.debug(f"Unknown alert pattern: {pattern}")
                alert = None

            if alert:
                fired.append(alert)

        except Exception as e:
            logger.warning(f"Alert evaluation failed for {pattern}/{metric_key}: {e}")

    logger.info(f"Evaluated {len(result.data)} rules, fired {len(fired)} alerts for {tenant_id}")
    return fired


# ── Pattern Evaluators ───────────────────────────────────────────────

def _evaluate_trend_decline(
    metric_key: Optional[str],
    metric_map: dict[str, DynamicMetricResult],
    config: dict,
    severity_rules: dict,
) -> Optional[AlertResult]:
    """
    Check if a metric dropped significantly period-over-period.
    Uses the comparison field from DynamicMetricResult.
    """
    if not metric_key or metric_key not in metric_map:
        return None

    mr = metric_map[metric_key]
    if mr.value is None or mr.comparison is None:
        return None

    prev = mr.comparison.get("previous_value")
    if prev is None or prev <= 0:
        return None

    try:
        change_pct = ((float(mr.value) - prev) / prev) * 100
    except (TypeError, ValueError):
        return None

    # Only fire on decline (negative change)
    if change_pct >= 0:
        return None

    # Determine severity
    severity = _determine_severity(change_pct, severity_rules, is_decline=True)
    if not severity:
        return None

    return AlertResult(
        alert_type="trend_decline",
        severity=severity,
        title=f"{mr.title} declined {abs(change_pct):.0f}%",
        summary=(
            f"{mr.title} dropped from {prev} to {mr.value} "
            f"({change_pct:+.1f}%) compared to the previous period."
        ),
        evidence={
            "current_value": mr.value,
            "previous_value": prev,
            "change_pct": round(change_pct, 1),
            "timeframe": mr.evidence.timeframe,
            "row_count": mr.evidence.row_count,
        },
        metric_key=metric_key,
    )


async def _evaluate_stagnation(
    supabase,
    tenant_id: str,
    crm_source: str,
    entity: Optional[str],
    config: dict,
    severity_rules: dict,
) -> Optional[AlertResult]:
    """
    Check if records in an entity haven't been modified recently.
    """
    if not entity:
        return None

    table = f"crm_{entity}"
    modified_field = config.get("modified_field", "modified_at")
    warning_days = severity_rules.get("warning", {}).get("stale_days", 14)
    critical_days = severity_rules.get("critical", {}).get("stale_days", 30)

    cutoff_warning = datetime.now(timezone.utc) - timedelta(days=warning_days)

    try:
        # Count records not modified since warning threshold
        result = supabase.table(table).select("*", count="exact").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).lt(
            modified_field, cutoff_warning.isoformat()
        ).limit(0).execute()

        stale_count = result.count or 0

        # Get total count for percentage
        total_result = supabase.table(table).select("*", count="exact").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).limit(0).execute()

        total = total_result.count or 0
        if total < 5:
            return None  # Not enough data to trigger stagnation alert

        stale_pct = (stale_count / total) * 100

        if stale_pct < 20:
            return None  # Less than 20% stale — not worth alerting

        # Determine severity based on critical cutoff
        cutoff_critical = datetime.now(timezone.utc) - timedelta(days=critical_days)
        critical_result = supabase.table(table).select("*", count="exact").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).lt(
            modified_field, cutoff_critical.isoformat()
        ).limit(0).execute()
        critical_count = critical_result.count or 0

        if critical_count > total * 0.3:
            severity = "critical"
        elif stale_count > total * 0.2:
            severity = "warning"
        else:
            return None

        return AlertResult(
            alert_type="stagnation",
            severity=severity,
            title=f"{stale_count} stale {entity} records",
            summary=(
                f"{stale_count} of {total} {entity} ({stale_pct:.0f}%) "
                f"haven't been modified in {warning_days}+ days."
            ),
            evidence={
                "stale_count": stale_count,
                "total": total,
                "stale_pct": round(stale_pct, 1),
                "critical_count": critical_count,
                "threshold_days": warning_days,
            },
            entity=entity,
        )

    except Exception as e:
        logger.debug(f"Stagnation check failed for {entity}: {e}")
        return None


async def _evaluate_concentration(
    supabase,
    tenant_id: str,
    crm_source: str,
    metric_key: Optional[str],
    metric_map: dict[str, DynamicMetricResult],
    config: dict,
    severity_rules: dict,
) -> Optional[AlertResult]:
    """
    Check if a disproportionate amount is concentrated in one owner/dimension.
    Resolves rep IDs to names when dimension is assigned_to.
    """
    if not metric_key or metric_key not in metric_map:
        return None

    mr = metric_map[metric_key]
    if mr.value is None or float(mr.value) <= 0:
        return None

    dimension_field = config.get("dimension_field", "assigned_to")
    source_table = mr.evidence.source_tables[0] if mr.evidence.source_tables else None
    if not source_table:
        return None

    # Get the field we're summing from the metric (need to look at computation)
    # We query the dimension field + value field grouped by dimension
    try:
        result = supabase.table(source_table).select(
            f"{dimension_field},value"
        ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(
            50000
        ).execute()

        rows = result.data or []
        if not rows:
            return None

        # Single-rep CRM — concentration alert is meaningless
        if dimension_field == "assigned_to":
            unique_owners = set(r.get(dimension_field) for r in rows if r.get(dimension_field))
            if len(unique_owners) <= 1:
                return None

        # Aggregate by dimension
        totals: dict[str, float] = {}
        grand_total = 0.0
        for r in rows:
            dim_val = r.get(dimension_field) or "Unknown"
            val = r.get("value")
            if val is not None:
                try:
                    v = float(val)
                    totals[dim_val] = totals.get(dim_val, 0) + v
                    grand_total += v
                except (TypeError, ValueError):
                    pass

        if grand_total <= 0 or not totals:
            return None

        # Find max concentration
        max_dim_raw = max(totals, key=totals.get)
        max_val = totals[max_dim_raw]
        max_pct = (max_val / grand_total) * 100

        # Resolve rep ID to name if dimension is assigned_to
        max_dim = max_dim_raw
        if dimension_field == "assigned_to":
            try:
                rep_map = await build_rep_name_map(supabase, tenant_id, crm_source)
                max_dim = resolve_rep_name(max_dim_raw, rep_map)
            except Exception:
                pass

        warning_threshold = severity_rules.get("warning", {}).get("threshold_pct", 60)
        critical_threshold = severity_rules.get("critical", {}).get("threshold_pct", 80)

        if max_pct < warning_threshold:
            return None

        severity = "critical" if max_pct >= critical_threshold else "warning"

        return AlertResult(
            alert_type="concentration",
            severity=severity,
            title=f"{max_pct:.0f}% of {mr.title} from {max_dim}",
            summary=(
                f"{max_dim} accounts for {max_pct:.0f}% of total {mr.title} "
                f"({max_val:,.0f} of {grand_total:,.0f}). "
                f"This creates risk if this source is lost."
            ),
            evidence={
                "top_entity": max_dim,
                "top_value": round(max_val, 2),
                "total_value": round(grand_total, 2),
                "concentration_pct": round(max_pct, 1),
                "dimension_count": len(totals),
            },
            metric_key=metric_key,
        )

    except Exception as e:
        logger.debug(f"Concentration check failed for {metric_key}: {e}")
        return None


def _evaluate_missing_data(
    metric_key: Optional[str],
    entity: Optional[str],
    config: dict,
    severity_rules: dict,
) -> Optional[AlertResult]:
    """
    Fire if a critical field's fill rate is below threshold.
    The fill rate is stored in the config at generation time.
    """
    field_name = config.get("field", "")
    current_fill = config.get("current_fill_rate", 1.0)

    warning_fill = severity_rules.get("warning", {}).get("min_fill_rate", 0.8)
    critical_fill = severity_rules.get("critical", {}).get("min_fill_rate", 0.5)

    if current_fill >= warning_fill:
        return None

    null_pct = (1.0 - current_fill) * 100
    severity = "critical" if current_fill < critical_fill else "warning"

    return AlertResult(
        alert_type="missing_data",
        severity=severity,
        title=f"{null_pct:.0f}% of {field_name} values missing in {entity or 'unknown'}",
        summary=(
            f"The field '{field_name}' in {entity or 'unknown'} has a {null_pct:.0f}% null rate. "
            f"This reduces confidence in metrics that depend on it."
        ),
        evidence={
            "field": field_name,
            "entity": entity,
            "fill_rate": round(current_fill, 4),
            "null_pct": round(null_pct, 1),
        },
        metric_key=metric_key,
        entity=entity,
    )


def _evaluate_divergence(
    config: dict,
    metric_map: dict[str, DynamicMetricResult],
    severity_rules: dict,
) -> Optional[AlertResult]:
    """
    Check if two related metrics are moving in opposite directions.
    Config: {metric_a, metric_b, expected_correlation: "positive"|"negative"}
    """
    metric_a_key = config.get("metric_a", "")
    metric_b_key = config.get("metric_b", "")
    expected = config.get("expected_correlation", "positive")

    if metric_a_key not in metric_map or metric_b_key not in metric_map:
        return None

    mr_a = metric_map[metric_a_key]
    mr_b = metric_map[metric_b_key]

    if mr_a.comparison is None or mr_b.comparison is None:
        return None

    prev_a = mr_a.comparison.get("previous_value")
    prev_b = mr_b.comparison.get("previous_value")
    if prev_a is None or prev_b is None or prev_a <= 0 or prev_b <= 0:
        return None

    try:
        change_a = (float(mr_a.value) - prev_a) / prev_a
        change_b = (float(mr_b.value) - prev_b) / prev_b
    except (TypeError, ValueError):
        return None

    # Detect divergence
    if expected == "positive":
        # They should move together; fire if one up and one down
        diverging = (change_a > 0.05 and change_b < -0.05) or (change_a < -0.05 and change_b > 0.05)
    else:
        # Negative correlation expected; fire if both move same direction significantly
        diverging = (change_a > 0.05 and change_b > 0.05) or (change_a < -0.05 and change_b < -0.05)

    if not diverging:
        return None

    min_divergence = severity_rules.get("warning", {}).get("min_divergence_pct", 10)
    total_divergence = abs(change_a - change_b) * 100
    if total_divergence < min_divergence:
        return None

    severity = "critical" if total_divergence > 30 else "warning"

    return AlertResult(
        alert_type="divergence",
        severity=severity,
        title=f"{mr_a.title} and {mr_b.title} are diverging",
        summary=(
            f"{mr_a.title} changed {change_a:+.0%} while {mr_b.title} changed {change_b:+.0%}. "
            f"These metrics are expected to move {'together' if expected == 'positive' else 'inversely'}."
        ),
        evidence={
            "metric_a": metric_a_key,
            "metric_a_change": round(change_a * 100, 1),
            "metric_b": metric_b_key,
            "metric_b_change": round(change_b * 100, 1),
            "divergence_pct": round(total_divergence, 1),
        },
    )


# ── Ad-hoc health check (Step 5) ────────────────────────────────────

async def compute_adhoc_health_check(
    supabase,
    tenant_id: str,
    crm_source: str,
) -> list[AlertResult]:
    """
    Run 4 data-driven checks when no alert rules or dynamic metrics exist.
    Pure SQL, $0 cost. Returns list[AlertResult].
    """
    fired: list[AlertResult] = []

    try:
        # 1. Stale deals — not modified in 30+ days, won=false
        cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        stale_result = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).is_("won", False).lt("modified_at", cutoff_30d).limit(0).execute()
        stale_count = stale_result.count or 0

        total_open = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).is_("won", False).limit(0).execute()
        total_open_count = total_open.count or 0

        if total_open_count >= 5:
            stale_pct = (stale_count / total_open_count) * 100
            if stale_pct > 30:
                severity = "critical" if stale_pct > 60 else "warning"
                fired.append(AlertResult(
                    alert_type="stale_deals",
                    severity=severity,
                    title=f"{stale_count} deals haven't been touched in 30+ days",
                    summary=(
                        f"{stale_pct:.0f}% of your open deals ({stale_count} of {total_open_count}) "
                        f"haven't been modified in over 30 days. These may need follow-up."
                    ),
                    evidence={
                        "stale_count": stale_count,
                        "total_open": total_open_count,
                        "stale_pct": round(stale_pct, 1),
                    },
                    entity="deals",
                ))
    except Exception as e:
        logger.debug("Adhoc stale deals check: %s", e)

    try:
        # 2. Missing data — null rate on value, stage, assigned_to
        total_result = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(0).execute()
        total = total_result.count or 0

        if total >= 5:
            for field in ("value", "stage", "assigned_to"):
                null_result = supabase.table("crm_deals").select(
                    "*", count="exact"
                ).eq("tenant_id", tenant_id).eq(
                    "crm_source", crm_source
                ).is_(field, "null").limit(0).execute()
                null_count = null_result.count or 0
                null_pct = (null_count / total) * 100
                if null_pct > 30:
                    fired.append(AlertResult(
                        alert_type="missing_data",
                        severity="warning",
                        title=f"{null_pct:.0f}% of deals are missing '{field}'",
                        summary=(
                            f"{null_count} of {total} deals have no {field} set. "
                            f"This reduces the accuracy of your analytics."
                        ),
                        evidence={
                            "field": field,
                            "null_count": null_count,
                            "total": total,
                            "null_pct": round(null_pct, 1),
                        },
                        entity="deals",
                    ))
    except Exception as e:
        logger.debug("Adhoc missing data check: %s", e)

    try:
        # 3. Pipeline concentration — single rep > 60% of pipeline value
        result = supabase.table("crm_deals").select(
            "assigned_to,value"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).is_("won", False).not_.is_("value", "null").limit(5000).execute()

        rows = result.data or []
        if len(rows) >= 5:
            totals: dict[str, float] = {}
            grand_total = 0.0
            for r in rows:
                rep = r.get("assigned_to") or "Unknown"
                try:
                    v = float(r.get("value", 0))
                    totals[rep] = totals.get(rep, 0) + v
                    grand_total += v
                except (TypeError, ValueError):
                    pass

            unique_reps = set(k for k in totals if k != "Unknown")
            if grand_total > 0 and len(unique_reps) > 1:
                max_rep_raw = max(totals, key=totals.get)
                max_val = totals[max_rep_raw]
                max_pct = (max_val / grand_total) * 100

                if max_pct > 60:
                    # Resolve rep name
                    try:
                        rep_map = await build_rep_name_map(supabase, tenant_id, crm_source)
                        max_rep = resolve_rep_name(max_rep_raw, rep_map)
                    except Exception:
                        max_rep = max_rep_raw

                    fired.append(AlertResult(
                        alert_type="concentration",
                        severity="critical" if max_pct > 80 else "warning",
                        title=f"{max_pct:.0f}% of pipeline from {max_rep}",
                        summary=(
                            f"{max_rep} accounts for {max_pct:.0f}% of your total pipeline value "
                            f"(${max_val:,.0f} of ${grand_total:,.0f}). "
                            f"This creates risk if this rep leaves or underperforms."
                        ),
                        evidence={
                            "top_rep": max_rep,
                            "top_value": round(max_val, 2),
                            "total_value": round(grand_total, 2),
                            "concentration_pct": round(max_pct, 1),
                        },
                        entity="deals",
                    ))
    except Exception as e:
        logger.debug("Adhoc concentration check: %s", e)

    try:
        # 4. Win rate — fire if < 20%
        won_result = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).is_("won", True).limit(0).execute()
        won_count = won_result.count or 0

        # Total closed = won + explicitly closed/lost (approximate via non-null closed_at or won field)
        total_closed_result = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).not_.is_("closed_at", "null").limit(0).execute()
        total_closed = total_closed_result.count or 0

        if total_closed >= 10:
            win_rate = (won_count / total_closed) * 100
            if win_rate < 20:
                fired.append(AlertResult(
                    alert_type="low_win_rate",
                    severity="critical" if win_rate < 10 else "warning",
                    title=f"Win rate is only {win_rate:.0f}%",
                    summary=(
                        f"Only {won_count} of {total_closed} closed deals were won ({win_rate:.0f}%). "
                        f"Consider reviewing your qualification criteria or sales process."
                    ),
                    evidence={
                        "won_count": won_count,
                        "total_closed": total_closed,
                        "win_rate_pct": round(win_rate, 1),
                    },
                    entity="deals",
                ))
    except Exception as e:
        logger.debug("Adhoc win rate check: %s", e)

    logger.info("Adhoc health check for %s: %d alerts fired", tenant_id, len(fired))
    return fired


# ── Helpers ──────────────────────────────────────────────────────────

def _determine_severity(
    change_pct: float,
    severity_rules: dict,
    is_decline: bool = True,
) -> Optional[str]:
    """Determine severity level from change percentage and rules."""
    critical_threshold = severity_rules.get("critical", {}).get("threshold_pct", -30)
    warning_threshold = severity_rules.get("warning", {}).get("threshold_pct", -15)

    if is_decline:
        if change_pct <= critical_threshold:
            return "critical"
        if change_pct <= warning_threshold:
            return "warning"
    else:
        if change_pct >= abs(critical_threshold):
            return "critical"
        if change_pct >= abs(warning_threshold):
            return "warning"

    return None
