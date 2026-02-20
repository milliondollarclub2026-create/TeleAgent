"""
Revenue Compute Engine
======================
compute_snapshot(): runs all 12 metrics and persists to revenue_snapshots.
compute_alerts():   deterministic 5-rule alert engine — no LLM calls.

Both functions are called by POST /api/revenue/recompute.
compute_snapshot() also invokes compute_alerts() internally so the snapshot
and alert records are always in sync.

Alert rules
-----------
  pipeline_stall      — deals with modified_at older than p75 of all open deals
  conversion_drop     — period-over-period win-rate decline > 10 pp
  rep_slip            — activity count down ≥ 20% while pipeline value grew
  forecast_risk       — late-stage open deals missing close date or amount
  concentration_risk  — single deal or single rep > 60% of total pipeline value

Each alert carries full evidence: metric_ids, record_counts, baseline_period,
implicated entities, and a confidence score computed from the data signal.
"""

from __future__ import annotations

import logging
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Timeframe preset → time_range_days
TIMEFRAME_DAYS: dict[str, int] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
}


# ---------------------------------------------------------------------------
# Alert record
# ---------------------------------------------------------------------------

@dataclass
class AlertRecord:
    """One alert instance to be written to revenue_alerts."""
    alert_type: str          # 'pipeline_stall' | 'conversion_drop' | 'rep_slip'
                             # | 'forecast_risk' | 'concentration_risk'
    severity: str            # 'critical' | 'warning' | 'info'
    summary: str             # Human-readable one-liner shown in InsightsPanel
    evidence: dict = field(default_factory=dict)
    recommended_actions: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Shared helpers
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


def _days_ago(dt: Optional[datetime], now: datetime) -> Optional[float]:
    if not dt:
        return None
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0.0, (now - dt).total_seconds() / 86400)


async def _load_revenue_model(supabase, tenant_id: str, crm_source: str) -> dict:
    """Return the confirmed revenue model or an empty dict."""
    try:
        result = (
            supabase.table("revenue_models")
            .select("won_stage_values,lost_stage_values,stage_order")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .not_.is_("confirmed_at", "null")
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.warning("_load_revenue_model: %s", e)
    return {}


async def _fetch_open_deals(
    supabase,
    tenant_id: str,
    crm_source: str,
    fields: list[str],
    won_stages: set[str],
    lost_stages: set[str],
    limit: int = 2000,
) -> list[dict]:
    """Fetch all open (not won, not lost) deals for this tenant/source."""
    try:
        unique_fields = list(dict.fromkeys(["stage", "won"] + fields))
        result = (
            supabase.table("crm_deals")
            .select(",".join(unique_fields))
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .limit(limit)
            .execute()
        )
        rows = result.data or []
    except Exception as e:
        logger.warning("_fetch_open_deals: %s", e)
        return []

    open_deals = []
    for r in rows:
        stage = r.get("stage") or ""
        if won_stages or lost_stages:
            if stage in won_stages or stage in lost_stages:
                continue
        elif r.get("won"):
            continue
        open_deals.append(r)
    return open_deals


# ---------------------------------------------------------------------------
# Alert rule: pipeline_stall
# ---------------------------------------------------------------------------

async def _alert_pipeline_stall(
    supabase,
    tenant_id: str,
    crm_source: str,
    won_stages: set[str],
    lost_stages: set[str],
) -> Optional[AlertRecord]:
    """
    Open deals whose modified_at age exceeds the p75 of all open deal ages.
    Fired when at least 2 deals are stalled AND stalled count ≥ 15% of open pipeline.
    """
    now = datetime.now(timezone.utc)
    fields = ["stage", "modified_at", "won", "title", "value"]
    open_deals = await _fetch_open_deals(
        supabase, tenant_id, crm_source, fields, won_stages, lost_stages
    )

    if len(open_deals) < 3:
        return None

    ages: list[float] = []
    for r in open_deals:
        age = _days_ago(_parse_iso(r.get("modified_at")), now)
        if age is not None:
            ages.append(age)

    if len(ages) < 3:
        return None

    p75 = statistics.quantiles(ages, n=4)[2]  # index 2 = 75th percentile

    stalled = [
        r for r in open_deals
        if (_days_ago(_parse_iso(r.get("modified_at")), now) or 0) > p75
    ]

    if len(stalled) < 2 or len(stalled) / len(open_deals) < 0.15:
        return None

    stage_counts: dict[str, int] = {}
    for r in stalled:
        s = r.get("stage") or "Unknown"
        stage_counts[s] = stage_counts.get(s, 0) + 1

    worst_stage = max(stage_counts, key=stage_counts.__getitem__)
    stall_rate = len(stalled) / len(open_deals)
    severity = "critical" if stall_rate > 0.35 else "warning"
    confidence = round(min(0.95, 0.60 + stall_rate), 2)

    return AlertRecord(
        alert_type="pipeline_stall",
        severity=severity,
        summary=(
            f"{len(stalled)} of {len(open_deals)} open deals stalled "
            f"(no updates for >{p75:.0f} days — pipeline p75 baseline)"
        ),
        evidence={
            "metric_ids": ["pipeline_stall_risk"],
            "record_counts": {
                "total_open": len(open_deals),
                "stalled": len(stalled),
                **{f"stalled_in_{s}": c for s, c in stage_counts.items()},
            },
            "baseline_period": f"p75 of all open deals ({p75:.0f} days)",
            "implicated": {
                "stages": list(stage_counts.keys()),
                "worst_stage": worst_stage,
            },
            "confidence": confidence,
            "timeframe": "All open deals",
        },
        recommended_actions=[
            f"Review {len(stalled)} stalled deals — prioritize '{worst_stage}'",
            "Update deal notes or advance stage to show progress",
            f"Schedule follow-up calls for deals not updated in >{p75:.0f} days",
        ],
    )


# ---------------------------------------------------------------------------
# Alert rule: conversion_drop
# ---------------------------------------------------------------------------

async def _alert_conversion_drop(
    supabase,
    tenant_id: str,
    crm_source: str,
    time_range_days: int,
) -> Optional[AlertRecord]:
    """
    Win rate in current period vs same-length previous period.
    Fired when drop > 10 percentage points.
    """
    now = datetime.now(timezone.utc)
    cutoff_cur = now - timedelta(days=time_range_days)
    cutoff_prev = cutoff_cur - timedelta(days=time_range_days)

    try:
        result = (
            supabase.table("crm_deals")
            .select("won,created_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("created_at", cutoff_prev.isoformat())
            .limit(3000)
            .execute()
        )
        rows = result.data or []
    except Exception as e:
        logger.warning("_alert_conversion_drop: %s", e)
        return None

    cur_total = cur_won = prev_total = prev_won = 0
    for r in rows:
        dt = _parse_iso(r.get("created_at"))
        if not dt:
            continue
        if dt >= cutoff_cur:
            cur_total += 1
            if r.get("won"):
                cur_won += 1
        elif dt >= cutoff_prev:
            prev_total += 1
            if r.get("won"):
                prev_won += 1

    if cur_total < 5 or prev_total < 5:
        return None  # Insufficient data

    cur_rate = cur_won / cur_total
    prev_rate = prev_won / prev_total
    drop = prev_rate - cur_rate

    if drop < 0.10:
        return None  # Not a significant decline

    severity = "critical" if drop >= 0.20 else "warning"
    confidence = round(min(0.95, 0.50 + drop * 2), 2)

    return AlertRecord(
        alert_type="conversion_drop",
        severity=severity,
        summary=(
            f"Win rate dropped from {prev_rate:.0%} to {cur_rate:.0%} "
            f"({drop:.0%} decline vs previous {time_range_days}-day period)"
        ),
        evidence={
            "metric_ids": ["win_rate"],
            "record_counts": {
                "current_total": cur_total,
                "current_won": cur_won,
                "previous_total": prev_total,
                "previous_won": prev_won,
            },
            "baseline_period": f"Previous {time_range_days} days",
            "implicated": {
                "current_win_rate": round(cur_rate, 3),
                "previous_win_rate": round(prev_rate, 3),
                "absolute_drop": round(drop, 3),
            },
            "confidence": confidence,
            "timeframe": f"Last {time_range_days} days vs prior {time_range_days} days",
        },
        recommended_actions=[
            "Review deals lost in the current period — identify common objections",
            "Compare deal quality (value, source) between the two periods",
            "Check if stage definitions or rep assignments changed recently",
        ],
    )


# ---------------------------------------------------------------------------
# Alert rule: rep_slip
# ---------------------------------------------------------------------------

async def _alert_rep_slip(
    supabase,
    tenant_id: str,
    crm_source: str,
    time_range_days: int,
) -> Optional[AlertRecord]:
    """
    Reps whose activity count dropped ≥ 20% period-over-period while their
    assigned pipeline value grew ≥ 10% (leading indicator of disengagement).
    """
    now = datetime.now(timezone.utc)
    cutoff_cur = now - timedelta(days=time_range_days)
    cutoff_prev = cutoff_cur - timedelta(days=time_range_days)

    try:
        act_result = (
            supabase.table("crm_activities")
            .select("employee_name,started_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("started_at", cutoff_prev.isoformat())
            .limit(5000)
            .execute()
        )
        act_rows = act_result.data or []
    except Exception as e:
        logger.warning("_alert_rep_slip activities: %s", e)
        return None

    try:
        deal_result = (
            supabase.table("crm_deals")
            .select("assigned_to,value,won,created_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("created_at", cutoff_prev.isoformat())
            .limit(3000)
            .execute()
        )
        deal_rows = deal_result.data or []
    except Exception as e:
        logger.warning("_alert_rep_slip deals: %s", e)
        return None

    # Activities per rep, by period
    rep_acts_cur: dict[str, int] = {}
    rep_acts_prev: dict[str, int] = {}
    for r in act_rows:
        rep = r.get("employee_name") or "Unknown"
        dt = _parse_iso(r.get("started_at"))
        if not dt:
            continue
        if dt >= cutoff_cur:
            rep_acts_cur[rep] = rep_acts_cur.get(rep, 0) + 1
        elif dt >= cutoff_prev:
            rep_acts_prev[rep] = rep_acts_prev.get(rep, 0) + 1

    # Open pipeline value per rep, by period
    rep_pipe_cur: dict[str, float] = {}
    rep_pipe_prev: dict[str, float] = {}
    for r in deal_rows:
        if r.get("won"):
            continue
        rep = r.get("assigned_to") or "Unknown"
        val = float(r.get("value") or 0)
        dt = _parse_iso(r.get("created_at"))
        if not dt:
            continue
        if dt >= cutoff_cur:
            rep_pipe_cur[rep] = rep_pipe_cur.get(rep, 0) + val
        elif dt >= cutoff_prev:
            rep_pipe_prev[rep] = rep_pipe_prev.get(rep, 0) + val

    # Find reps with activity drop ≥ 20% AND pipeline growth ≥ 10%
    slipping: list[dict] = []
    all_reps = set(rep_acts_cur) | set(rep_acts_prev)
    for rep in all_reps:
        acts_cur = rep_acts_cur.get(rep, 0)
        acts_prev = rep_acts_prev.get(rep, 0)
        pipe_cur = rep_pipe_cur.get(rep, 0)
        pipe_prev = rep_pipe_prev.get(rep, 0)

        if acts_prev < 3:
            continue  # Insufficient baseline

        act_change = (acts_cur - acts_prev) / acts_prev
        pipe_change = (pipe_cur - pipe_prev) / max(pipe_prev, 1)

        if act_change <= -0.20 and pipe_change >= 0.10:
            slipping.append({
                "rep": rep,
                "activity_change_pct": round(act_change * 100, 1),
                "pipeline_change_pct": round(pipe_change * 100, 1),
                "acts_cur": acts_cur,
                "acts_prev": acts_prev,
            })

    if not slipping:
        return None

    slipping.sort(key=lambda x: x["activity_change_pct"])  # Most declined first
    worst = slipping[0]
    severity = "critical" if len(slipping) >= 3 or worst["activity_change_pct"] <= -40 else "warning"

    return AlertRecord(
        alert_type="rep_slip",
        severity=severity,
        summary=(
            f"{len(slipping)} rep(s) showing activity decline while pipeline grew: "
            + ", ".join(r["rep"] for r in slipping[:3])
        ),
        evidence={
            "metric_ids": ["rep_activity_count", "pipeline_value"],
            "record_counts": {"slipping_reps": len(slipping)},
            "baseline_period": f"Previous {time_range_days} days",
            "implicated": {"reps": slipping[:5]},
            "confidence": round(min(0.90, 0.55 + len(slipping) * 0.10), 2),
            "timeframe": f"Last {time_range_days} days vs prior {time_range_days} days",
        },
        recommended_actions=[
            f"Check in with {worst['rep']} — activity down {abs(worst['activity_change_pct']):.0f}%",
            "Verify CRM logging habits — are all activities being recorded?",
            "Assess deal quality for reps with high pipeline but low engagement",
        ],
    )


# ---------------------------------------------------------------------------
# Alert rule: forecast_risk
# ---------------------------------------------------------------------------

async def _alert_forecast_risk(
    supabase,
    tenant_id: str,
    crm_source: str,
    won_stages: set[str],
    lost_stages: set[str],
    stage_order: list[str],
) -> Optional[AlertRecord]:
    """
    Open deals in the final 25% of pipeline stages that are missing
    closed_at or value — these distort forecast accuracy.
    """
    fields = ["stage", "value", "closed_at", "won", "title"]
    open_deals = await _fetch_open_deals(
        supabase, tenant_id, crm_source, fields, won_stages, lost_stages
    )

    if not open_deals:
        return None

    # Identify late stages: last 25% of stage_order (excluding terminal stages)
    open_stage_order = [s for s in stage_order if s not in won_stages and s not in lost_stages]
    n_late = max(1, len(open_stage_order) // 4)
    late_stages = set(open_stage_order[-n_late:]) if open_stage_order else set()

    risky: list[dict] = []
    for r in open_deals:
        stage = r.get("stage") or ""
        # If we have late stage info, only flag deals in late stages
        if late_stages and stage not in late_stages:
            continue
        no_close = r.get("closed_at") is None
        no_value = r.get("value") is None
        if no_close or no_value:
            risky.append({
                "title": r.get("title") or "Unnamed",
                "stage": stage,
                "missing_close": no_close,
                "missing_value": no_value,
            })

    if len(risky) < 2:
        return None

    risk_rate = len(risky) / max(len(open_deals), 1)
    severity = "critical" if risk_rate > 0.40 else "warning"
    confidence = round(min(0.92, 0.55 + risk_rate), 2)

    missing_close = sum(1 for r in risky if r["missing_close"])
    missing_value = sum(1 for r in risky if r["missing_value"])

    return AlertRecord(
        alert_type="forecast_risk",
        severity=severity,
        summary=(
            f"{len(risky)} late-stage deals missing close date or value — "
            "forecast accuracy is compromised"
        ),
        evidence={
            "metric_ids": ["forecast_hygiene"],
            "record_counts": {
                "total_open": len(open_deals),
                "risky_deals": len(risky),
                "missing_close_date": missing_close,
                "missing_value": missing_value,
            },
            "baseline_period": "All open deals in late pipeline stages",
            "implicated": {
                "late_stages": list(late_stages) if late_stages else ["(all stages — no model configured)"],
                "examples": risky[:5],
            },
            "confidence": confidence,
            "timeframe": "All open deals",
        },
        recommended_actions=[
            f"Add expected close dates to {missing_close} deal(s)",
            f"Add deal value to {missing_value} deal(s) missing amount",
            "Run a CRM data quality sprint before the next forecast review",
        ],
    )


# ---------------------------------------------------------------------------
# Alert rule: concentration_risk
# ---------------------------------------------------------------------------

async def _alert_concentration_risk(
    supabase,
    tenant_id: str,
    crm_source: str,
    won_stages: set[str],
    lost_stages: set[str],
) -> Optional[AlertRecord]:
    """
    A single deal or single rep accounts for > 60% of total open pipeline value.
    """
    fields = ["title", "value", "won", "assigned_to"]
    open_deals = await _fetch_open_deals(
        supabase, tenant_id, crm_source, fields, won_stages, lost_stages
    )

    if len(open_deals) < 3:
        return None

    values = [float(r.get("value") or 0) for r in open_deals]
    total_pipeline = sum(values)
    if total_pipeline <= 0:
        return None

    # Top deal concentration
    max_deal_val = max(values)
    deal_concentration = max_deal_val / total_pipeline
    worst_deal = next(
        (r for r in open_deals if float(r.get("value") or 0) == max_deal_val),
        None,
    )

    # Top rep concentration
    rep_values: dict[str, float] = {}
    for r in open_deals:
        rep = r.get("assigned_to") or "Unknown"
        rep_values[rep] = rep_values.get(rep, 0) + float(r.get("value") or 0)
    worst_rep = max(rep_values, key=rep_values.__getitem__) if rep_values else None
    rep_concentration = rep_values.get(worst_rep, 0) / total_pipeline if worst_rep else 0.0

    deal_concentrated = deal_concentration >= 0.60
    rep_concentrated = rep_concentration >= 0.60

    if not deal_concentrated and not rep_concentrated:
        return None

    concentration_pct = max(deal_concentration, rep_concentration)
    severity = "critical" if concentration_pct >= 0.75 else "warning"
    confidence = round(min(0.95, concentration_pct), 2)

    if deal_concentrated and rep_concentrated:
        summary = (
            f"Top deal accounts for {deal_concentration:.0%} and "
            f"'{worst_rep}' owns {rep_concentration:.0%} of pipeline"
        )
    elif deal_concentrated:
        summary = (
            f"'{worst_deal.get('title', 'Top deal') if worst_deal else 'Top deal'}' accounts for "
            f"{deal_concentration:.0%} of total pipeline value"
        )
    else:
        summary = f"'{worst_rep}' owns {rep_concentration:.0%} of total pipeline value"

    return AlertRecord(
        alert_type="concentration_risk",
        severity=severity,
        summary=summary,
        evidence={
            "metric_ids": ["pipeline_value"],
            "record_counts": {
                "total_open_deals": len(open_deals),
                "total_pipeline_value": round(total_pipeline, 2),
            },
            "baseline_period": "All open deals",
            "implicated": {
                "top_deal": {
                    "title": worst_deal.get("title") if worst_deal else None,
                    "value": max_deal_val,
                    "concentration_pct": round(deal_concentration * 100, 1),
                } if deal_concentrated else None,
                "top_rep": {
                    "name": worst_rep,
                    "pipeline_value": round(rep_values.get(worst_rep, 0), 2),
                    "concentration_pct": round(rep_concentration * 100, 1),
                } if rep_concentrated else None,
            },
            "confidence": confidence,
            "timeframe": "All open deals",
        },
        recommended_actions=[
            "Diversify pipeline — add mid-market deals to reduce single-deal dependency",
            "Redistribute accounts or cross-train reps to reduce concentration risk",
            "Advance backup deals in parallel with the high-value opportunity",
        ],
    )


# ---------------------------------------------------------------------------
# Public API: compute_alerts
# ---------------------------------------------------------------------------

async def compute_alerts(
    supabase,
    tenant_id: str,
    crm_source: str,
    timeframe: str = "30d",
) -> list[AlertRecord]:
    """
    Run all 5 alert rules and return fired alerts.

    The caller is responsible for DB writes (delete open alerts → insert fresh).
    compute_snapshot() handles this automatically when it calls compute_alerts().
    """
    time_range_days = TIMEFRAME_DAYS.get(timeframe, 30)
    revenue_model = await _load_revenue_model(supabase, tenant_id, crm_source)
    won_stages: set[str] = set(revenue_model.get("won_stage_values") or [])
    lost_stages: set[str] = set(revenue_model.get("lost_stage_values") or [])
    stage_order: list[str] = revenue_model.get("stage_order") or []

    rule_args = [
        # (coroutine, label)
        (_alert_pipeline_stall(supabase, tenant_id, crm_source, won_stages, lost_stages), "pipeline_stall"),
        (_alert_conversion_drop(supabase, tenant_id, crm_source, time_range_days), "conversion_drop"),
        (_alert_rep_slip(supabase, tenant_id, crm_source, time_range_days), "rep_slip"),
        (_alert_forecast_risk(supabase, tenant_id, crm_source, won_stages, lost_stages, stage_order), "forecast_risk"),
        (_alert_concentration_risk(supabase, tenant_id, crm_source, won_stages, lost_stages), "concentration_risk"),
    ]

    alerts: list[AlertRecord] = []
    for coro, label in rule_args:
        try:
            result = await coro
            if result:
                alerts.append(result)
        except Exception as e:
            logger.error("compute_alerts rule '%s' failed: %s", label, e)

    return alerts


# ---------------------------------------------------------------------------
# Public API: compute_snapshot
# ---------------------------------------------------------------------------

async def compute_snapshot(
    supabase,
    tenant_id: str,
    crm_source: str,
    timeframe: str = "30d",
) -> dict:
    """
    Run all 12 metrics at scalar (no dimension) level and write results to
    revenue_snapshots (upsert by tenant+source+timeframe).

    Also runs compute_alerts() and persists the fresh alert set:
    - Deletes all OPEN alerts for this tenant/source
    - Inserts a fresh set from the 5 rules
    - Dismissed alerts are never touched

    Returns the snapshot row dict (from the upsert or the in-memory object).
    """
    time_range_days = TIMEFRAME_DAYS.get(timeframe, 30)

    from revenue.metric_catalog import METRIC_CATALOG, compute_metric, MetricValidator

    validator = MetricValidator()
    snapshot_json: dict[str, dict] = {}
    trust_scores: list[float] = []

    for metric_key, defn in METRIC_CATALOG.items():
        ok, reason, _ = await validator.validate(supabase, tenant_id, crm_source, metric_key)
        if not ok:
            snapshot_json[metric_key] = {
                "available": False,
                "reason": reason,
                "value": None,
                "data": [],
                "evidence": None,
            }
            continue

        try:
            result = await compute_metric(
                metric_key=metric_key,
                supabase=supabase,
                tenant_id=tenant_id,
                crm_source=crm_source,
                time_range_days=time_range_days,
            )
            ev = result.evidence
            snapshot_json[metric_key] = {
                "available": True,
                "value": result.value,
                "chart_type": result.chart_type,
                "data": result.data,
                "evidence": {
                    "row_count": ev.row_count,
                    "sampled_rows": ev.sampled_rows,
                    "fields_evaluated": ev.fields_evaluated,
                    "null_rates": ev.null_rates,
                    "data_trust_score": ev.data_trust_score,
                    "timeframe": ev.timeframe,
                    "computation_notes": ev.computation_notes,
                },
                "warnings": result.warnings,
            }
            trust_scores.append(ev.data_trust_score)
        except Exception as e:
            logger.error("compute_snapshot: metric '%s' failed: %s", metric_key, e)
            snapshot_json[metric_key] = {
                "available": False,
                "reason": str(e),
                "value": None,
                "data": [],
                "evidence": None,
            }

    mean_trust = round(sum(trust_scores) / len(trust_scores), 3) if trust_scores else 0.0

    # --- Compute and persist alerts ---
    alerts = await compute_alerts(supabase, tenant_id, crm_source, timeframe)

    try:
        # Delete open alerts (preserve dismissed ones)
        (
            supabase.table("revenue_alerts")
            .delete()
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .eq("status", "open")
            .execute()
        )
    except Exception as e:
        logger.warning("compute_snapshot: failed to delete open alerts: %s", e)

    for alert in alerts:
        try:
            supabase.table("revenue_alerts").insert({
                "tenant_id": tenant_id,
                "crm_source": crm_source,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "status": "open",
                "summary": alert.summary,
                "evidence_json": alert.evidence,
                "recommended_actions_json": alert.recommended_actions,
            }).execute()
        except Exception as e:
            logger.error(
                "compute_snapshot: failed to insert alert '%s': %s",
                alert.alert_type, e,
            )

    # --- Upsert snapshot ---
    snapshot_row = {
        "tenant_id": tenant_id,
        "crm_source": crm_source,
        "timeframe": timeframe,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_json": snapshot_json,
        "trust_score": mean_trust,
        "alert_count": len(alerts),
    }

    try:
        result = (
            supabase.table("revenue_snapshots")
            .upsert(snapshot_row, on_conflict="tenant_id,crm_source,timeframe")
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error("compute_snapshot: upsert failed: %s", e)

    return snapshot_row
