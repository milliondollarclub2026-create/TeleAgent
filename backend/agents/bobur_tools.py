"""
Bobur Tools — Server-side data-fetching functions for the Revenue Analyst agent.
=================================================================================
Five async tool functions Bobur can invoke during chat to fetch real, evidence-
backed data.  Each returns a structured dict (never raises) so the caller can
always inspect the 'error' key.

Tools
-----
  get_revenue_overview(supabase, tenant_id, crm_source, timeframe)
  list_revenue_alerts(supabase, tenant_id, crm_source, status)
  query_metric(supabase, tenant_id, crm_source, metric_key, dimension, time_range_days)
  explain_alert(supabase, tenant_id, crm_source, alert_id)
  recommend_actions(supabase, tenant_id, crm_source, alert_id)
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Rep name resolution utilities
# ---------------------------------------------------------------------------

async def build_rep_name_map(supabase, tenant_id: str, crm_source: str) -> dict[str, str]:
    """
    Build a mapping of CRM user IDs → display names from crm_users or
    crm_activities (employee_name). Returns e.g. {"1": "John Smith", "3": "Alice Jones"}.
    """
    name_map: dict[str, str] = {}
    try:
        # Primary: crm_users table (if populated by sync)
        result = supabase.table("crm_users").select(
            "external_id,name"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).limit(500).execute()

        for row in (result.data or []):
            uid = str(row.get("external_id", "")).strip()
            name = (row.get("name") or "").strip()
            if uid and name:
                name_map[uid] = name
    except Exception:
        pass  # Table may not exist yet

    if name_map:
        return name_map

    # Fallback: extract distinct employee names from crm_activities
    try:
        result = supabase.table("crm_activities").select(
            "employee_id,employee_name"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).not_.is_("employee_name", "null").limit(1000).execute()

        for row in (result.data or []):
            uid = str(row.get("employee_id", "")).strip()
            name = (row.get("employee_name") or "").strip()
            if uid and name:
                name_map[uid] = name
    except Exception:
        pass

    return name_map


def resolve_rep_name(value: str, rep_map: dict[str, str]) -> str:
    """Look up a rep ID in the name map, return display name or original value.
    Falls back to 'Rep #X' if the resolved value is still a raw numeric ID."""
    if not value:
        return value
    resolved = rep_map.get(str(value).strip(), value)
    if resolved == value and str(resolved).strip().isdigit():
        return f"Rep #{resolved}"
    return resolved


TIMEFRAME_LABEL = {
    "7d":  "last 7 days",
    "30d": "last 30 days",
    "90d": "last 90 days",
    "365d": "last 12 months",
}


# ---------------------------------------------------------------------------
# Tool 1 — Revenue overview
# ---------------------------------------------------------------------------

async def get_revenue_overview(
    supabase,
    tenant_id: str,
    crm_source: str,
    timeframe: str = "30d",
) -> dict:
    """
    Return the most recent revenue snapshot for this tenant/timeframe.
    Triggers a fresh compute() if no snapshot exists yet.

    Returns
    -------
    {
        snapshot: dict | None,
        timeframe: str,
        timeframe_label: str,
        metrics: dict,            # key → {value, row_count, trust_score}
        alert_count: int,
        overall_trust: float,
        error: str | None,
    }
    """
    try:
        result = (
            supabase.table("revenue_snapshots")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .eq("timeframe", timeframe)
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )
        snap = result.data[0] if result.data else None

        if not snap:
            # Compute on demand (first time)
            from revenue.compute import compute_snapshot
            snap = await compute_snapshot(supabase, tenant_id, crm_source, timeframe)

        metrics_raw = snap.get("snapshot_json") or {}
        # Build compact metrics dict for reply formatting
        metrics = {}
        for key, val in metrics_raw.items():
            if isinstance(val, dict):
                metrics[key] = {
                    "value": val.get("value"),
                    "row_count": val.get("evidence", {}).get("row_count", 0),
                    "trust_score": val.get("evidence", {}).get("data_trust_score", 0.0),
                }

        return {
            "snapshot": snap,
            "timeframe": timeframe,
            "timeframe_label": TIMEFRAME_LABEL.get(timeframe, timeframe),
            "metrics": metrics,
            "alert_count": snap.get("alert_count", 0),
            "overall_trust": snap.get("trust_score", 0.0),
            "error": None,
        }

    except Exception as e:
        logger.warning("get_revenue_overview: %s", e)
        return {
            "snapshot": None,
            "timeframe": timeframe,
            "timeframe_label": TIMEFRAME_LABEL.get(timeframe, timeframe),
            "metrics": {},
            "alert_count": 0,
            "overall_trust": 0.0,
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# Tool 2 — Revenue alerts list
# ---------------------------------------------------------------------------

async def list_revenue_alerts(
    supabase,
    tenant_id: str,
    crm_source: str,
    status: str = "open",
) -> list[dict]:
    """
    Fetch revenue alerts for this tenant.

    Returns a list of alert dicts (up to 20).  Each dict includes:
      id, alert_type, severity, summary, evidence_json,
      recommended_actions_json, created_at, status.
    Returns [] on error.
    """
    try:
        result = (
            supabase.table("revenue_alerts")
            .select("id,alert_type,severity,summary,evidence_json,recommended_actions_json,created_at,status")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .eq("status", status)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.warning("list_revenue_alerts: %s", e)
        return []


# ---------------------------------------------------------------------------
# Tool 3 — Query a metric from the catalog
# ---------------------------------------------------------------------------

async def query_metric(
    supabase,
    tenant_id: str,
    crm_source: str,
    metric_key: str,
    dimension: Optional[str] = None,
    time_range_days: Optional[int] = None,
) -> dict:
    """
    Validate and compute one metric from the Metric Catalog.

    Rejects unknown metric_key or unsupported dimension BEFORE any DB query.

    Returns
    -------
    On success:
        {metric_key, title, chart_type, value, data, trust_score,
         trust_notes, timeframe, warnings, errors, error: None}
    On failure:
        {metric_key, error: str}
    """
    from revenue.metric_catalog import METRIC_CATALOG, MetricValidator, compute_metric

    # ── Validate metric key ──────────────────────────────────────────────────
    if metric_key not in METRIC_CATALOG:
        valid_keys = sorted(METRIC_CATALOG.keys())
        return {
            "metric_key": metric_key,
            "error": (
                f"Unknown metric '{metric_key}'. "
                f"Valid keys: {', '.join(valid_keys)}"
            ),
        }

    defn = METRIC_CATALOG[metric_key]

    # ── Validate dimension ───────────────────────────────────────────────────
    if dimension and dimension not in defn.allowed_dimensions:
        return {
            "metric_key": metric_key,
            "error": (
                f"Dimension '{dimension}' is not allowed for '{metric_key}'. "
                f"Allowed dimensions: {defn.allowed_dimensions or ['(none)']}"
            ),
        }

    # ── Check availability ───────────────────────────────────────────────────
    validator = MetricValidator()
    ok, reason, _ = await validator.validate(supabase, tenant_id, crm_source, metric_key)
    if not ok:
        return {
            "metric_key": metric_key,
            "error": f"Metric '{metric_key}' unavailable: {reason}",
        }

    # ── Compute ──────────────────────────────────────────────────────────────
    try:
        result = await compute_metric(
            metric_key,
            supabase,
            tenant_id,
            crm_source,
            dimension=dimension,
            time_range_days=time_range_days,
        )
        return {
            "metric_key": metric_key,
            "title": result.title,
            "chart_type": result.chart_type,
            "value": result.value,
            "data": result.data,
            "trust_score": result.evidence.data_trust_score,
            "trust_notes": result.evidence.computation_notes,
            "timeframe": result.evidence.timeframe,
            "warnings": result.warnings,
            "errors": result.errors,
            "error": None,
        }
    except Exception as e:
        logger.warning("query_metric(%s): %s", metric_key, e)
        return {"metric_key": metric_key, "error": str(e)}


# ---------------------------------------------------------------------------
# Tool 4 — Explain one alert
# ---------------------------------------------------------------------------

async def explain_alert(
    supabase,
    tenant_id: str,
    crm_source: str,
    alert_id: str,
) -> dict:
    """
    Return full evidence for one revenue alert.

    Returns {alert: dict | None, error: str | None}
    """
    try:
        result = (
            supabase.table("revenue_alerts")
            .select("*")
            .eq("id", alert_id)
            .eq("tenant_id", tenant_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return {"alert": result.data[0], "error": None}
        return {"alert": None, "error": f"Alert '{alert_id}' not found"}
    except Exception as e:
        logger.warning("explain_alert: %s", e)
        return {"alert": None, "error": str(e)}


# ---------------------------------------------------------------------------
# Tool 5 — Recommend actions (evidence-referenced)
# ---------------------------------------------------------------------------

async def recommend_actions(
    supabase,
    tenant_id: str,
    crm_source: str,
    alert_id: str,
) -> dict:
    """
    Return recommended actions for an alert, referencing specific evidence counts.
    Actions come from the alert's recommended_actions_json — no LLM dependency.

    Returns
    -------
    {
        actions: list[str],
        evidence_bullets: list[str],   # cited counts from evidence_json
        alert_type: str,
        severity: str,
        error: str | None,
    }
    """
    info = await explain_alert(supabase, tenant_id, crm_source, alert_id)
    alert = info.get("alert")
    if not alert:
        return {
            "actions": [],
            "evidence_bullets": [],
            "alert_type": None,
            "severity": None,
            "error": info.get("error"),
        }

    evidence = alert.get("evidence_json") or {}
    actions = alert.get("recommended_actions_json") or []

    # Build cited evidence bullets
    bullets: list[str] = []
    counts = evidence.get("record_counts") or {}
    for k, v in list(counts.items())[:3]:
        bullets.append(f"• {k.replace('_', ' ')}: {v}")

    baseline = evidence.get("baseline_period")
    if baseline:
        bullets.append(f"• Baseline: {baseline}")

    implicated = evidence.get("implicated") or {}
    for k, v in list(implicated.items())[:2]:
        if isinstance(v, (str, int, float)):
            bullets.append(f"• {k.replace('_', ' ')}: {v}")

    confidence = evidence.get("confidence")
    if confidence:
        bullets.append(f"• Alert confidence: {confidence:.0%}")

    return {
        "actions": actions,
        "evidence_bullets": bullets,
        "alert_type": alert.get("alert_type"),
        "severity": alert.get("severity"),
        "error": None,
    }


# ---------------------------------------------------------------------------
# Evidence formatting helpers (used by bobur.py)
# ---------------------------------------------------------------------------

async def get_analytics_overview(
    supabase,
    tenant_id: str,
    crm_source: str,
    timeframe_days: int = 30,
) -> dict:
    """
    Phase 2: Compute core metrics from tenant_metrics (is_core=true).
    Falls back to legacy get_revenue_overview if no tenant_metrics exist.

    Returns {metrics: list[dict], alert_count: int, error: str|None}
    """
    try:
        # Check for dynamic metrics
        tm_result = supabase.table("tenant_metrics").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).eq("is_core", True).eq("active", True).limit(0).execute()

        if (tm_result.count or 0) > 0:
            from revenue.dynamic_compute import compute_tenant_snapshot, format_metric_card
            results = await compute_tenant_snapshot(
                supabase, tenant_id, crm_source, timeframe_days=timeframe_days
            )
            cards = [format_metric_card(r) for r in results if r.confidence > 0]
            return {
                "metrics": cards,
                "timeframe_days": timeframe_days,
                "dynamic": True,
                "error": None,
            }
    except Exception as e:
        logger.warning("get_analytics_overview dynamic path failed: %s", e)

    # Fallback to legacy
    tf_map = {7: "7d", 30: "30d", 90: "90d", 365: "365d"}
    timeframe = tf_map.get(timeframe_days, "30d")
    legacy = await get_revenue_overview(supabase, tenant_id, crm_source, timeframe)
    return {
        "metrics": legacy.get("metrics", {}),
        "timeframe_days": timeframe_days,
        "dynamic": False,
        "error": legacy.get("error"),
    }


async def query_dynamic_metric(
    supabase,
    tenant_id: str,
    crm_source: str,
    metric_key: str,
    time_range_days: Optional[int] = None,
) -> dict:
    """
    Phase 2: Look up metric in tenant_metrics and compute via dynamic engine.
    Falls back to legacy query_metric if not found.
    """
    try:
        result = supabase.table("tenant_metrics").select("*").eq(
            "tenant_id", tenant_id
        ).eq("crm_source", crm_source).eq(
            "metric_key", metric_key
        ).eq("active", True).limit(1).execute()

        if result.data:
            import json as _json
            metric_def = result.data[0]
            comp = metric_def.get("computation", {})
            if isinstance(comp, str):
                metric_def["computation"] = _json.loads(comp)
            req = metric_def.get("required_fields", [])
            if isinstance(req, str):
                metric_def["required_fields"] = _json.loads(req)

            from revenue.dynamic_compute import compute_metric, format_metric_card
            mr = await compute_metric(
                supabase, tenant_id, crm_source, metric_def,
                timeframe_days=time_range_days,
            )
            card = format_metric_card(mr)
            return {
                "metric_key": metric_key,
                "title": mr.title,
                "value": mr.value,
                "format": mr.display_format,
                "confidence": mr.confidence,
                "timeframe": mr.evidence.timeframe,
                "trend": card.get("trend"),
                "evidence": {
                    "row_count": mr.evidence.row_count,
                    "definition": mr.evidence.definition,
                    "caveats": mr.evidence.caveats,
                },
                "error": None,
            }
    except Exception as e:
        logger.debug("query_dynamic_metric failed for %s: %s", metric_key, e)

    # Fall back to legacy
    return await query_metric(supabase, tenant_id, crm_source, metric_key, time_range_days=time_range_days)


def format_overview_evidence(overview: dict) -> tuple[list[str], float]:
    """
    Build evidence bullets from a get_revenue_overview() result.
    Returns (bullets, trust_score).
    """
    metrics = overview.get("metrics") or {}
    alert_count = overview.get("alert_count", 0)
    trust = overview.get("overall_trust", 0.0)
    bullets: list[str] = []

    # Pipeline value
    pv = metrics.get("pipeline_value")
    if pv and pv.get("value") is not None:
        bullets.append(f"• Pipeline value: {pv['value']} across {pv.get('row_count', '?')} open deals")

    # Win rate
    wr = metrics.get("win_rate")
    if wr and wr.get("value") is not None:
        bullets.append(f"• Win rate: {wr['value']}")

    # New deals
    nd = metrics.get("new_deals")
    if nd and nd.get("value") is not None:
        bullets.append(f"• New deals: {nd['value']}")

    # Avg deal size
    ads = metrics.get("avg_deal_size")
    if ads and ads.get("value") is not None:
        bullets.append(f"• Avg deal size: {ads['value']}")

    # Active alerts
    if alert_count:
        bullets.append(f"• {alert_count} active revenue alert{'s' if alert_count != 1 else ''} detected")

    return bullets, float(trust)


def format_alerts_evidence(alerts: list[dict]) -> tuple[list[str], float]:
    """
    Build evidence bullets from a list_revenue_alerts() result.
    Returns (bullets, avg_confidence).
    """
    if not alerts:
        return ["• No active revenue alerts — pipeline looks healthy"], 1.0

    critical = [a for a in alerts if a.get("severity") == "critical"]
    warnings = [a for a in alerts if a.get("severity") == "warning"]
    bullets: list[str] = []

    if critical:
        names = ", ".join(
            a.get("alert_type", "").replace("_", " ") for a in critical[:2]
        )
        bullets.append(f"• {len(critical)} critical alert{'s' if len(critical) > 1 else ''}: {names}")

    if warnings:
        names = ", ".join(
            a.get("alert_type", "").replace("_", " ") for a in warnings[:2]
        )
        bullets.append(f"• {len(warnings)} warning{'s' if len(warnings) > 1 else ''}: {names}")

    # First alert's evidence counts
    first_ev = (alerts[0].get("evidence_json") or {})
    counts = first_ev.get("record_counts") or {}
    for k, v in list(counts.items())[:2]:
        bullets.append(f"• {k.replace('_', ' ')}: {v}")

    confidences = [
        float((a.get("evidence_json") or {}).get("confidence", 0.7))
        for a in alerts
    ]
    avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 0.7

    return bullets, avg_conf


def format_metric_evidence(metric_result: dict) -> tuple[list[str], float]:
    """
    Build evidence bullets from a query_metric() result.
    Returns (bullets, trust_score).
    """
    bullets: list[str] = []
    title = metric_result.get("title", metric_result.get("metric_key", "Metric"))
    value = metric_result.get("value")
    timeframe = metric_result.get("timeframe", "")

    if value is not None:
        bullets.append(f"• {title}: {value}" + (f" ({timeframe})" if timeframe else ""))

    data = metric_result.get("data") or []
    if data and len(data) >= 2:
        top = data[0]
        bullets.append(f"• Top segment: {top.get('label')} = {top.get('value')}")

    warnings = metric_result.get("warnings") or []
    if warnings:
        bullets.append(f"• Note: {warnings[0]}")

    trust = float(metric_result.get("trust_score", 0.0))
    return bullets, trust


def confidence_label(trust: float) -> str:
    """Human-readable confidence label."""
    if trust >= 0.8:
        return f"high ({trust:.0%})"
    if trust >= 0.5:
        return f"moderate ({trust:.0%})"
    if trust > 0:
        return f"low ({trust:.0%}) — some required fields may be sparse"
    return "unknown"
