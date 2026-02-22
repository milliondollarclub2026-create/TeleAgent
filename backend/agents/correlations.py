"""
Correlations Engine — Cross-entity analysis for prescriptive recommendations.

Pure SQL/Python, $0 cost. Runs 6 correlation queries against CRM data and
produces actionable findings with estimated impact.

Correlation functions:
  1. Rep Performance Matrix
  2. Activity-to-Outcome Correlation
  3. Deal Velocity Analysis
  4. Pipeline Concentration by Rep
  5. Deal Size vs Velocity
  6. Source Effectiveness

Cost: $0 (no LLM calls).
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from pydantic import BaseModel, Field

from agents.bobur_tools import build_rep_name_map, resolve_rep_name

logger = logging.getLogger(__name__)

# ── Cache ──────────────────────────────────────────────────────────────

_correlation_cache: dict[str, tuple[list, float]] = {}
CACHE_TTL = 900  # 15 minutes


# ── Data Model ─────────────────────────────────────────────────────────

class CorrelationResult(BaseModel):
    correlation_type: str          # "rep_performance", "activity_outcome", etc.
    title: str
    finding: str                   # Specific numbers
    prescriptive_action: str       # What to DO
    estimated_impact: str          # "+15% win rate"
    effort_level: str              # "low", "medium", "high"
    confidence: float = 0.0        # 0-1 based on data volume
    evidence: dict = Field(default_factory=dict)


# ── Entry Point ────────────────────────────────────────────────────────

async def compute_correlations(
    supabase, tenant_id: str, crm_source: str,
) -> list[CorrelationResult]:
    """
    Run all 6 correlation analyses. Returns up to 6 results sorted by
    confidence descending. Cached for 15 minutes per tenant.
    """
    cache_key = f"{tenant_id}:{crm_source}"
    now = time.time()
    if cache_key in _correlation_cache:
        cached, ts = _correlation_cache[cache_key]
        if now - ts < CACHE_TTL:
            return cached

    # Build rep name map once
    rep_map = await build_rep_name_map(supabase, tenant_id, crm_source)

    # Run all 6 in parallel
    tasks = [
        _rep_performance_matrix(supabase, tenant_id, crm_source, rep_map),
        _activity_outcome_correlation(supabase, tenant_id, crm_source, rep_map),
        _deal_velocity_analysis(supabase, tenant_id, crm_source, rep_map),
        _pipeline_concentration(supabase, tenant_id, crm_source, rep_map),
        _deal_size_vs_velocity(supabase, tenant_id, crm_source),
        _source_effectiveness(supabase, tenant_id, crm_source),
    ]

    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    results: list[CorrelationResult] = []
    for r in raw_results:
        if isinstance(r, CorrelationResult):
            results.append(r)
        elif isinstance(r, Exception):
            logger.debug("Correlation function failed: %s", r)

    results.sort(key=lambda x: x.confidence, reverse=True)
    results = results[:6]

    _correlation_cache[cache_key] = (results, now)
    return results


# ── 1. Rep Performance Matrix ─────────────────────────────────────────

async def _rep_performance_matrix(
    supabase, tenant_id: str, crm_source: str, rep_map: dict,
) -> Optional[CorrelationResult]:
    try:
        result = (
            supabase.table("crm_deals")
            .select("assigned_to,won,value,created_at,closed_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .not_.is_("assigned_to", "null")
            .limit(5000)
            .execute()
        )
        rows = result.data or []
        if len(rows) < 10:
            return None

        # Per-rep stats
        rep_stats: dict[str, dict] = {}
        for r in rows:
            rep_id = str(r.get("assigned_to", "")).strip()
            if not rep_id:
                continue
            if rep_id not in rep_stats:
                rep_stats[rep_id] = {"won": 0, "total": 0, "value": 0.0}
            rep_stats[rep_id]["total"] += 1
            if r.get("won") is True:
                rep_stats[rep_id]["won"] += 1
            val = r.get("value")
            if val is not None:
                try:
                    rep_stats[rep_id]["value"] += float(val)
                except (ValueError, TypeError):
                    pass

        # Filter reps with enough deals
        qualified = {k: v for k, v in rep_stats.items() if v["total"] >= 3}
        if len(qualified) < 2:
            return None

        # Compute win rates
        for stats in qualified.values():
            stats["win_rate"] = (stats["won"] / stats["total"] * 100) if stats["total"] > 0 else 0

        total_deals = sum(v["total"] for v in qualified.values())
        avg_deal_value = sum(v["value"] for v in qualified.values()) / max(total_deals, 1)

        # Find top and bottom by win rate
        sorted_reps = sorted(qualified.items(), key=lambda x: x[1]["win_rate"])
        bottom_id, bottom = sorted_reps[0]
        top_id, top = sorted_reps[-1]

        if top["win_rate"] - bottom["win_rate"] < 5:
            return None  # Not enough difference

        top_name = resolve_rep_name(top_id, rep_map)
        bottom_name = resolve_rep_name(bottom_id, rep_map)

        win_rate_gap = top["win_rate"] - bottom["win_rate"]
        estimated_revenue = win_rate_gap / 100 * avg_deal_value * bottom["total"]

        return CorrelationResult(
            correlation_type="rep_performance",
            title="Rep Performance Gap",
            finding=(
                f"{top_name} has a {top['win_rate']:.0f}% win rate ({top['total']} deals) "
                f"vs {bottom_name} at {bottom['win_rate']:.0f}% ({bottom['total']} deals)."
            ),
            prescriptive_action=(
                f"Pair {bottom_name} with {top_name} for deal reviews and coaching sessions. "
                f"Analyze {top_name}'s approach for replicable patterns."
            ),
            estimated_impact=f"+${estimated_revenue:,.0f} potential revenue",
            effort_level="low",
            confidence=min(1.0, total_deals / 50),
            evidence={
                "top_rep": top_name, "top_win_rate": f"{top['win_rate']:.0f}%",
                "bottom_rep": bottom_name, "bottom_win_rate": f"{bottom['win_rate']:.0f}%",
                "total_deals": total_deals,
            },
        )
    except Exception as e:
        logger.debug("Rep performance matrix failed: %s", e)
        return None


# ── 2. Activity-to-Outcome Correlation ────────────────────────────────

async def _activity_outcome_correlation(
    supabase, tenant_id: str, crm_source: str, rep_map: dict,
) -> Optional[CorrelationResult]:
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()

        # Activities per rep
        act_result = (
            supabase.table("crm_activities")
            .select("employee_id")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("started_at", cutoff)
            .not_.is_("employee_id", "null")
            .limit(5000)
            .execute()
        )
        act_rows = act_result.data or []

        # Deals per rep (last 90d)
        deal_result = (
            supabase.table("crm_deals")
            .select("assigned_to,won")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .gte("created_at", cutoff)
            .not_.is_("assigned_to", "null")
            .limit(5000)
            .execute()
        )
        deal_rows = deal_result.data or []

        # Count activities per rep
        act_counts: dict[str, int] = {}
        for r in act_rows:
            eid = str(r.get("employee_id", "")).strip()
            if eid:
                act_counts[eid] = act_counts.get(eid, 0) + 1

        # Win rate per rep
        rep_deals: dict[str, dict] = {}
        for r in deal_rows:
            rid = str(r.get("assigned_to", "")).strip()
            if not rid:
                continue
            if rid not in rep_deals:
                rep_deals[rid] = {"won": 0, "total": 0}
            rep_deals[rid]["total"] += 1
            if r.get("won") is True:
                rep_deals[rid]["won"] += 1

        # Find reps with both activity and deal data
        common_reps = set(act_counts.keys()) & set(rep_deals.keys())
        common_reps = {r for r in common_reps if rep_deals[r]["total"] >= 3}
        if len(common_reps) < 3:
            return None

        # Simple rank correlation: sort by activities, sort by win rate
        rep_list = list(common_reps)
        by_activity = sorted(rep_list, key=lambda r: act_counts.get(r, 0))
        by_winrate = sorted(
            rep_list,
            key=lambda r: rep_deals[r]["won"] / rep_deals[r]["total"]
        )

        # Spearman-like: compare ranks
        n = len(rep_list)
        rank_act = {r: i for i, r in enumerate(by_activity)}
        rank_win = {r: i for i, r in enumerate(by_winrate)}
        d_sq_sum = sum((rank_act[r] - rank_win[r]) ** 2 for r in rep_list)
        rho = 1 - (6 * d_sq_sum) / (n * (n**2 - 1)) if n > 1 else 0

        # Get top activity rep stats
        top_act_rep = by_activity[-1]
        low_act_rep = by_activity[0]
        top_name = resolve_rep_name(top_act_rep, rep_map)
        low_name = resolve_rep_name(low_act_rep, rep_map)
        top_wr = rep_deals[top_act_rep]["won"] / rep_deals[top_act_rep]["total"] * 100
        low_wr = rep_deals[low_act_rep]["won"] / rep_deals[low_act_rep]["total"] * 100

        if rho > 0.3:
            return CorrelationResult(
                correlation_type="activity_outcome",
                title="Activity Volume Drives Wins",
                finding=(
                    f"Reps with more activities win more deals (correlation: {rho:.2f}). "
                    f"{top_name} ({act_counts[top_act_rep]} activities, {top_wr:.0f}% win rate) "
                    f"vs {low_name} ({act_counts[low_act_rep]} activities, {low_wr:.0f}% win rate)."
                ),
                prescriptive_action=(
                    f"Set minimum activity targets. {low_name} should increase activity "
                    f"volume to match top performers."
                ),
                estimated_impact=f"+{abs(top_wr - low_wr) * 0.5:.0f}% win rate improvement",
                effort_level="medium",
                confidence=min(1.0, len(common_reps) / 5),
                evidence={
                    "correlation": round(rho, 2),
                    "reps_analyzed": len(common_reps),
                    "timeframe": "last 90 days",
                },
            )
        elif rho < -0.3:
            return CorrelationResult(
                correlation_type="activity_outcome",
                title="Activity Quality Over Quantity",
                finding=(
                    f"More activities don't correlate with more wins (correlation: {rho:.2f}). "
                    f"Focus on activity quality, not volume."
                ),
                prescriptive_action=(
                    "Review which activity types (calls, meetings, emails) lead to closed deals. "
                    "Reduce low-value activities and focus on high-conversion touchpoints."
                ),
                estimated_impact="+10-15% team efficiency",
                effort_level="medium",
                confidence=min(1.0, len(common_reps) / 5),
                evidence={
                    "correlation": round(rho, 2),
                    "reps_analyzed": len(common_reps),
                    "timeframe": "last 90 days",
                },
            )
        return None
    except Exception as e:
        logger.debug("Activity-outcome correlation failed: %s", e)
        return None


# ── 3. Deal Velocity Analysis ─────────────────────────────────────────

async def _deal_velocity_analysis(
    supabase, tenant_id: str, crm_source: str, rep_map: dict,
) -> Optional[CorrelationResult]:
    try:
        result = (
            supabase.table("crm_deals")
            .select("assigned_to,won,value,created_at,closed_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .not_.is_("closed_at", "null")
            .limit(5000)
            .execute()
        )
        rows = result.data or []
        if len(rows) < 10:
            return None

        won_days = []
        lost_days = []
        for r in rows:
            created = r.get("created_at")
            closed = r.get("closed_at")
            if not created or not closed:
                continue
            try:
                c_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                cl_dt = datetime.fromisoformat(closed.replace("Z", "+00:00"))
                days = (cl_dt - c_dt).days
                if days < 0:
                    continue
                if r.get("won") is True:
                    won_days.append(days)
                else:
                    lost_days.append(days)
            except (ValueError, TypeError):
                continue

        if len(won_days) < 5:
            return None

        avg_won = sum(won_days) / len(won_days)
        avg_lost = sum(lost_days) / len(lost_days) if lost_days else avg_won

        # Calculate what % of deals open > avg_won days end up lost
        threshold = avg_won * 1.5
        long_deals_won = sum(1 for d in won_days if d > threshold)
        long_deals_lost = sum(1 for d in lost_days if d > threshold)
        total_long = long_deals_won + long_deals_lost
        long_loss_rate = (long_deals_lost / total_long * 100) if total_long > 0 else 0

        total_deals = len(won_days) + len(lost_days)

        return CorrelationResult(
            correlation_type="deal_velocity",
            title="Deal Velocity Insight",
            finding=(
                f"Won deals close in avg {avg_won:.0f} days vs {avg_lost:.0f} days for lost. "
                f"Deals open >{threshold:.0f} days have a {long_loss_rate:.0f}% loss rate."
            ),
            prescriptive_action=(
                f"Flag deals older than {avg_won:.0f} days for urgent review. "
                f"Consider a fast-track process for deals showing buying signals early."
            ),
            estimated_impact=f"+{min(20, long_loss_rate * 0.3):.0f}% conversion on aging deals",
            effort_level="low",
            confidence=min(1.0, total_deals / 30),
            evidence={
                "avg_won_days": round(avg_won, 1),
                "avg_lost_days": round(avg_lost, 1),
                "threshold_days": round(threshold, 0),
                "total_closed_deals": total_deals,
            },
        )
    except Exception as e:
        logger.debug("Deal velocity analysis failed: %s", e)
        return None


# ── 4. Pipeline Concentration by Rep ──────────────────────────────────

async def _pipeline_concentration(
    supabase, tenant_id: str, crm_source: str, rep_map: dict,
) -> Optional[CorrelationResult]:
    try:
        result = (
            supabase.table("crm_deals")
            .select("assigned_to,value")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .not_.is_("assigned_to", "null")
            .limit(5000)
            .execute()
        )
        # Filter to open deals (won IS NOT TRUE)
        rows = [r for r in (result.data or []) if r.get("won") is not True]
        if len(rows) < 5:
            return None

        # Per-rep pipeline value
        rep_pipeline: dict[str, float] = {}
        for r in rows:
            rep_id = str(r.get("assigned_to", "")).strip()
            if not rep_id:
                continue
            val = r.get("value")
            try:
                rep_pipeline[rep_id] = rep_pipeline.get(rep_id, 0) + float(val or 0)
            except (ValueError, TypeError):
                rep_pipeline[rep_id] = rep_pipeline.get(rep_id, 0)

        if len(rep_pipeline) < 2:
            return None

        total_pipeline = sum(rep_pipeline.values())
        if total_pipeline <= 0:
            return None

        # Find top rep
        top_rep_id = max(rep_pipeline, key=rep_pipeline.get)
        top_value = rep_pipeline[top_rep_id]
        top_pct = top_value / total_pipeline * 100
        top_name = resolve_rep_name(top_rep_id, rep_map)

        # Find rep with lowest pipeline (capacity)
        low_rep_id = min(rep_pipeline, key=rep_pipeline.get)
        low_name = resolve_rep_name(low_rep_id, rep_map)

        if top_pct < 40:
            return None  # Well distributed

        target_pct = 100 / len(rep_pipeline)

        return CorrelationResult(
            correlation_type="pipeline_concentration",
            title="Pipeline Concentration Risk",
            finding=(
                f"{top_pct:.0f}% of pipeline value (${top_value:,.0f}) depends on {top_name}. "
                f"{low_name} has capacity for more deals."
            ),
            prescriptive_action=(
                f"Redistribute upcoming leads to {low_name} and other reps with capacity. "
                f"Implement round-robin assignment for new inbound deals."
            ),
            estimated_impact=f"Reduce single-rep dependency from {top_pct:.0f}% to ~{target_pct:.0f}%",
            effort_level="low",
            confidence=min(1.0, len(rows) / 20),
            evidence={
                "top_rep": top_name,
                "top_rep_share": f"{top_pct:.0f}%",
                "total_pipeline": f"${total_pipeline:,.0f}",
                "num_reps": len(rep_pipeline),
            },
        )
    except Exception as e:
        logger.debug("Pipeline concentration failed: %s", e)
        return None


# ── 5. Deal Size vs Velocity ──────────────────────────────────────────

async def _deal_size_vs_velocity(
    supabase, tenant_id: str, crm_source: str,
) -> Optional[CorrelationResult]:
    try:
        result = (
            supabase.table("crm_deals")
            .select("value,created_at,closed_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .is_("won", True)
            .not_.is_("closed_at", "null")
            .not_.is_("value", "null")
            .limit(5000)
            .execute()
        )
        rows = result.data or []
        if len(rows) < 15:
            return None

        # Parse deals with value and velocity
        deals = []
        for r in rows:
            try:
                val = float(r["value"])
                created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
                closed = datetime.fromisoformat(r["closed_at"].replace("Z", "+00:00"))
                days = (closed - created).days
                if days >= 0 and val > 0:
                    deals.append({"value": val, "days": days})
            except (ValueError, TypeError, KeyError):
                continue

        if len(deals) < 15:
            return None

        # Sort by value, split into quartiles
        deals.sort(key=lambda d: d["value"])
        q_size = len(deals) // 4
        if q_size < 2:
            return None

        quartiles = []
        for i in range(4):
            start = i * q_size
            end = start + q_size if i < 3 else len(deals)
            q_deals = deals[start:end]
            avg_val = sum(d["value"] for d in q_deals) / len(q_deals)
            avg_days = sum(d["days"] for d in q_deals) / len(q_deals)
            quartiles.append({
                "avg_value": avg_val, "avg_days": avg_days, "count": len(q_deals),
            })

        # Compare Q1 (smallest) vs Q4 (largest)
        q1 = quartiles[0]
        q4 = quartiles[3]

        if q1["avg_days"] == 0:
            return None

        velocity_ratio = q4["avg_days"] / q1["avg_days"]

        # Find sweet spot (best value/day ratio)
        best_q_idx = max(range(4), key=lambda i: quartiles[i]["avg_value"] / max(quartiles[i]["avg_days"], 1))
        best_q = quartiles[best_q_idx]

        return CorrelationResult(
            correlation_type="deal_size_velocity",
            title="Deal Size Sweet Spot",
            finding=(
                f"Large deals (>${q4['avg_value']:,.0f}) take {velocity_ratio:.1f}x longer "
                f"than small deals (${q1['avg_value']:,.0f} avg, {q1['avg_days']:.0f}d). "
                f"Sweet spot: ~${best_q['avg_value']:,.0f} range closes in {best_q['avg_days']:.0f}d with best ROI."
            ),
            prescriptive_action=(
                f"Focus prospecting on the ${best_q['avg_value']:,.0f} deal range for fastest revenue. "
                f"For large deals >${q4['avg_value']:,.0f}, assign dedicated resources and longer timelines."
            ),
            estimated_impact="Revenue optimization from deal size focus",
            effort_level="medium",
            confidence=min(1.0, len(deals) / 40),
            evidence={
                "small_deal_avg": f"${q1['avg_value']:,.0f}",
                "large_deal_avg": f"${q4['avg_value']:,.0f}",
                "velocity_ratio": f"{velocity_ratio:.1f}x",
                "total_won_deals": len(deals),
            },
        )
    except Exception as e:
        logger.debug("Deal size vs velocity failed: %s", e)
        return None


# ── 6. Source Effectiveness ───────────────────────────────────────────

async def _source_effectiveness(
    supabase, tenant_id: str, crm_source: str,
) -> Optional[CorrelationResult]:
    try:
        now = datetime.now(timezone.utc)
        cutoff_30 = (now - timedelta(days=30)).isoformat()
        cutoff_60 = (now - timedelta(days=60)).isoformat()

        result = (
            supabase.table("crm_leads")
            .select("source,created_at")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .not_.is_("source", "null")
            .gte("created_at", cutoff_60)
            .limit(2000)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return None

        # Split into current 30d and previous 30d
        current: dict[str, int] = {}
        previous: dict[str, int] = {}
        for r in rows:
            src = r.get("source") or "Unknown"
            created = r.get("created_at", "")
            if created >= cutoff_30:
                current[src] = current.get(src, 0) + 1
            else:
                previous[src] = previous.get(src, 0) + 1

        # Find sources with enough data in both periods
        all_sources = set(current.keys()) | set(previous.keys())
        significant = {s for s in all_sources if current.get(s, 0) + previous.get(s, 0) >= 5}
        if len(significant) < 2:
            return None

        # Compute trends
        trends = {}
        for src in significant:
            cur = current.get(src, 0)
            prev = previous.get(src, 0)
            if prev > 0:
                change_pct = ((cur - prev) / prev) * 100
            elif cur > 0:
                change_pct = 100
            else:
                change_pct = 0
            trends[src] = {"current": cur, "previous": prev, "change_pct": change_pct}

        # Find fastest growing and declining
        growing = max(trends.items(), key=lambda x: x[1]["change_pct"])
        declining = min(trends.items(), key=lambda x: x[1]["change_pct"])

        if growing[1]["change_pct"] < 10 and declining[1]["change_pct"] > -10:
            return None  # No significant trends

        parts = []
        if growing[1]["change_pct"] >= 10:
            parts.append(
                f"'{growing[0]}' grew {growing[1]['change_pct']:.0f}% MoM "
                f"({growing[1]['previous']}→{growing[1]['current']} leads)"
            )
        if declining[1]["change_pct"] <= -10:
            parts.append(
                f"'{declining[0]}' declined {abs(declining[1]['change_pct']):.0f}% "
                f"({declining[1]['previous']}→{declining[1]['current']} leads)"
            )

        finding = ". ".join(parts) + "."

        action_parts = []
        if growing[1]["change_pct"] >= 10:
            action_parts.append(f"Double down on '{growing[0]}' — it's your fastest growing source.")
        if declining[1]["change_pct"] <= -10:
            action_parts.append(f"Investigate '{declining[0]}' decline — check campaigns or channel health.")

        return CorrelationResult(
            correlation_type="source_effectiveness",
            title="Lead Source Trends",
            finding=finding,
            prescriptive_action=" ".join(action_parts),
            estimated_impact=f"Optimize lead acquisition mix",
            effort_level="low",
            confidence=min(1.0, sum(len(v) for v in [current, previous]) / 30),
            evidence={
                "sources_analyzed": len(significant),
                "timeframe": "30d vs previous 30d",
                "growing_source": growing[0] if growing[1]["change_pct"] >= 10 else None,
                "declining_source": declining[0] if declining[1]["change_pct"] <= -10 else None,
            },
        )
    except Exception as e:
        logger.debug("Source effectiveness failed: %s", e)
        return None
