"""
CRM Context Builder — Pre-computed data summary for Bobur's context-aware chat.
================================================================================
After each CRM sync, compute a ~2KB JSON summary of the tenant's entire CRM:
  - Entity counts
  - Pipeline breakdown by stage
  - Leads by source / status
  - Rep performance (deals, pipeline, win rate, activities)
  - Cross-entity source → conversion rates (the killer feature)
  - Activity stats
  - Top deals + stale records
  - Period trends (7d, 30d)

Cost: $0 (pure Supabase SDK queries, no LLM).
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from agents.bobur_tools import build_rep_name_map, resolve_rep_name

logger = logging.getLogger(__name__)


async def compute_crm_context(
    supabase,
    tenant_id: str,
    crm_source: str,
) -> dict:
    """
    Compute a comprehensive CRM data summary (~2KB JSON).
    Designed to be injected into Bobur's system prompt for context-aware chat.
    """
    ctx: dict = {}
    now = datetime.now(timezone.utc)

    # Build rep name map once — used throughout
    rep_map = await build_rep_name_map(supabase, tenant_id, crm_source)

    try:
        ctx["counts"] = await _compute_counts(supabase, tenant_id, crm_source)
    except Exception as e:
        logger.warning("crm_context counts: %s", e)
        ctx["counts"] = {}

    try:
        ctx["pipeline"] = await _compute_pipeline(supabase, tenant_id, crm_source, rep_map)
    except Exception as e:
        logger.warning("crm_context pipeline: %s", e)
        ctx["pipeline"] = {}

    try:
        ctx["leads"] = await _compute_leads(supabase, tenant_id, crm_source, now)
    except Exception as e:
        logger.warning("crm_context leads: %s", e)
        ctx["leads"] = {}

    try:
        ctx["reps"] = await _compute_reps(supabase, tenant_id, crm_source, rep_map, now)
    except Exception as e:
        logger.warning("crm_context reps: %s", e)
        ctx["reps"] = []

    try:
        ctx["source_conversion"] = await _compute_source_conversion(
            supabase, tenant_id, crm_source
        )
    except Exception as e:
        logger.warning("crm_context source_conversion: %s", e)
        ctx["source_conversion"] = []

    try:
        ctx["activities"] = await _compute_activities(supabase, tenant_id, crm_source, rep_map, now)
    except Exception as e:
        logger.warning("crm_context activities: %s", e)
        ctx["activities"] = {}

    try:
        ctx["top_deals"] = await _compute_top_deals(supabase, tenant_id, crm_source, rep_map, now)
    except Exception as e:
        logger.warning("crm_context top_deals: %s", e)
        ctx["top_deals"] = []

    try:
        ctx["stale"] = await _compute_stale(supabase, tenant_id, crm_source, now)
    except Exception as e:
        logger.warning("crm_context stale: %s", e)
        ctx["stale"] = {}

    ctx["computed_at"] = now.isoformat()
    return ctx


# ---------------------------------------------------------------------------
# Sub-computations
# ---------------------------------------------------------------------------

async def _compute_counts(supabase, tenant_id, crm_source) -> dict:
    counts = {}
    for entity in ("leads", "deals", "contacts", "companies", "activities"):
        try:
            result = supabase.table(f"crm_{entity}").select(
                "*", count="exact"
            ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(0).execute()
            counts[entity] = result.count or 0
        except Exception:
            counts[entity] = 0
    return counts


async def _compute_pipeline(supabase, tenant_id, crm_source, rep_map) -> dict:
    result = supabase.table("crm_deals").select(
        "stage,value,won,assigned_to"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    rows = result.data or []
    if not rows:
        return {}

    by_stage: dict[str, dict] = defaultdict(lambda: {"count": 0, "value": 0})
    won_count = 0
    lost_count = 0
    total_value = 0

    for r in rows:
        stage = r.get("stage") or "Unknown"
        val = float(r.get("value") or 0)
        won = r.get("won")

        by_stage[stage]["count"] += 1
        by_stage[stage]["value"] += val
        total_value += val

        if won is True:
            won_count += 1
        elif won is False and stage and ("LOSE" in stage.upper() or "LOST" in stage.upper()):
            lost_count += 1

    total_closed = won_count + lost_count
    win_rate = round((won_count / total_closed) * 100, 1) if total_closed > 0 else None

    return {
        "by_stage": [
            {"stage": s, "count": d["count"], "value": round(d["value"], 2)}
            for s, d in sorted(by_stage.items(), key=lambda x: x[1]["value"], reverse=True)
        ][:10],
        "won_count": won_count,
        "lost_count": lost_count,
        "win_rate": win_rate,
        "total_value": round(total_value, 2),
        "total_deals": len(rows),
    }


async def _compute_leads(supabase, tenant_id, crm_source, now) -> dict:
    result = supabase.table("crm_leads").select(
        "source,status,created_at"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    rows = result.data or []
    if not rows:
        return {}

    by_source: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    recent_7d = 0
    recent_30d = 0

    cutoff_7d = (now - timedelta(days=7)).isoformat()
    cutoff_30d = (now - timedelta(days=30)).isoformat()

    for r in rows:
        src = r.get("source") or "Unknown"
        status = r.get("status") or "Unknown"
        by_source[src] += 1
        by_status[status] += 1

        created = r.get("created_at") or ""
        if created >= cutoff_7d:
            recent_7d += 1
        if created >= cutoff_30d:
            recent_30d += 1

    return {
        "by_source": [
            {"source": s, "count": c}
            for s, c in sorted(by_source.items(), key=lambda x: x[1], reverse=True)
        ][:8],
        "by_status": [
            {"status": s, "count": c}
            for s, c in sorted(by_status.items(), key=lambda x: x[1], reverse=True)
        ][:8],
        "recent_7d": recent_7d,
        "recent_30d": recent_30d,
        "total": len(rows),
    }


async def _compute_reps(supabase, tenant_id, crm_source, rep_map, now) -> list:
    """Per-rep stats: deals, pipeline value, win rate, activities in 30d."""
    deal_result = supabase.table("crm_deals").select(
        "assigned_to,value,won,stage"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    deals = deal_result.data or []
    if not deals:
        return []

    rep_stats: dict[str, dict] = defaultdict(lambda: {
        "deals": 0, "pipeline_value": 0, "won": 0, "lost": 0,
    })

    for d in deals:
        rep_raw = d.get("assigned_to") or "Unassigned"
        rep = resolve_rep_name(rep_raw, rep_map)
        val = float(d.get("value") or 0)

        rep_stats[rep]["deals"] += 1
        rep_stats[rep]["pipeline_value"] += val
        if d.get("won") is True:
            rep_stats[rep]["won"] += 1
        elif d.get("stage") and ("LOSE" in str(d["stage"]).upper() or "LOST" in str(d["stage"]).upper()):
            rep_stats[rep]["lost"] += 1

    # Activity counts per rep (last 30d)
    cutoff_30d = (now - timedelta(days=30)).isoformat()
    try:
        act_result = supabase.table("crm_activities").select(
            "employee_name,employee_id"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).gte("started_at", cutoff_30d).limit(5000).execute()

        for a in (act_result.data or []):
            name = a.get("employee_name") or resolve_rep_name(
                a.get("employee_id", ""), rep_map
            )
            if name and name in rep_stats:
                rep_stats[name].setdefault("activities_30d", 0)
                rep_stats[name]["activities_30d"] += 1
    except Exception:
        pass

    result = []
    for name, stats in sorted(rep_stats.items(), key=lambda x: x[1]["pipeline_value"], reverse=True):
        closed = stats["won"] + stats["lost"]
        win_rate = round((stats["won"] / closed) * 100, 1) if closed > 0 else None
        result.append({
            "name": name,
            "deals": stats["deals"],
            "pipeline_value": round(stats["pipeline_value"], 2),
            "won": stats["won"],
            "win_rate": win_rate,
            "activities_30d": stats.get("activities_30d", 0),
        })

    return result[:10]


async def _compute_source_conversion(supabase, tenant_id, crm_source) -> list:
    """
    Cross-entity source conversion: leads → contacts → deals.
    Match leads to deals via contact_id or email.
    """
    # 1. Leads with source + contact info
    lead_result = supabase.table("crm_leads").select(
        "source,contact_name,contact_email"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    leads = lead_result.data or []
    if not leads:
        return []

    # 2. Contacts (bridge entity)
    contact_result = supabase.table("crm_contacts").select(
        "external_id,name,email"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    contacts = contact_result.data or []

    # Build email → contact_id map
    email_to_contact: dict[str, str] = {}
    name_to_contact: dict[str, str] = {}
    for c in contacts:
        cid = c.get("external_id", "")
        email = (c.get("email") or "").strip().lower()
        name = (c.get("name") or "").strip().lower()
        if email and cid:
            email_to_contact[email] = cid
        if name and cid:
            name_to_contact[name] = cid

    # 3. Deals with contact_id + won status
    deal_result = supabase.table("crm_deals").select(
        "contact_id,won,value"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    deals = deal_result.data or []

    # Build contact_id → deal stats
    contact_deals: dict[str, dict] = defaultdict(lambda: {"count": 0, "won": 0, "value": 0})
    for d in deals:
        cid = str(d.get("contact_id") or "").strip()
        if not cid:
            continue
        contact_deals[cid]["count"] += 1
        if d.get("won") is True:
            contact_deals[cid]["won"] += 1
            contact_deals[cid]["value"] += float(d.get("value") or 0)

    # 4. Match leads → contacts → deals, aggregate by source
    source_stats: dict[str, dict] = defaultdict(lambda: {
        "leads": 0, "deals": 0, "won": 0, "won_value": 0,
    })

    for lead in leads:
        src = lead.get("source") or "Unknown"
        source_stats[src]["leads"] += 1

        # Try to find matching contact via email or name
        email = (lead.get("contact_email") or "").strip().lower()
        name = (lead.get("contact_name") or "").strip().lower()

        cid = email_to_contact.get(email) or name_to_contact.get(name)
        if cid and cid in contact_deals:
            cd = contact_deals[cid]
            source_stats[src]["deals"] += cd["count"]
            source_stats[src]["won"] += cd["won"]
            source_stats[src]["won_value"] += cd["value"]

    result = []
    for src, stats in sorted(source_stats.items(), key=lambda x: x[1]["leads"], reverse=True):
        lead_count = stats["leads"]
        conv_rate = round((stats["deals"] / lead_count) * 100, 1) if lead_count > 0 else 0
        result.append({
            "source": src,
            "leads": lead_count,
            "deals": stats["deals"],
            "won": stats["won"],
            "conversion_rate": conv_rate,
            "won_value": round(stats["won_value"], 2),
        })

    return result[:8]


async def _compute_activities(supabase, tenant_id, crm_source, rep_map, now) -> dict:
    cutoff_30d = (now - timedelta(days=30)).isoformat()

    result = supabase.table("crm_activities").select(
        "type,employee_name,employee_id,completed,started_at"
    ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(5000).execute()

    rows = result.data or []
    if not rows:
        return {}

    by_type: dict[str, int] = defaultdict(int)
    total_30d = 0
    completed_count = 0
    total_count = len(rows)

    for r in rows:
        act_type = r.get("type") or "other"
        by_type[act_type] += 1
        if r.get("completed") is True:
            completed_count += 1
        started = r.get("started_at") or ""
        if started >= cutoff_30d:
            total_30d += 1

    completion_rate = round((completed_count / total_count) * 100, 1) if total_count > 0 else 0

    return {
        "by_type": [
            {"type": t, "count": c}
            for t, c in sorted(by_type.items(), key=lambda x: x[1], reverse=True)
        ][:6],
        "total_30d": total_30d,
        "completion_rate": completion_rate,
        "total": total_count,
    }


async def _compute_top_deals(supabase, tenant_id, crm_source, rep_map, now) -> list:
    result = supabase.table("crm_deals").select(
        "title,value,stage,assigned_to,modified_at"
    ).eq("tenant_id", tenant_id).eq(
        "crm_source", crm_source
    ).is_("won", False).not_.is_(
        "value", "null"
    ).order("value", desc=True).limit(5).execute()

    deals = result.data or []
    top = []
    for d in deals:
        modified = d.get("modified_at") or ""
        days_in_stage = None
        if modified:
            try:
                mod_dt = datetime.fromisoformat(modified.replace("Z", "+00:00"))
                days_in_stage = (now - mod_dt).days
            except Exception:
                pass

        rep_raw = d.get("assigned_to") or ""
        top.append({
            "title": d.get("title") or "(Untitled)",
            "value": d.get("value"),
            "stage": d.get("stage") or "",
            "rep": resolve_rep_name(rep_raw, rep_map),
            "days_in_stage": days_in_stage,
        })

    return top


async def _compute_stale(supabase, tenant_id, crm_source, now) -> dict:
    cutoff_30d = (now - timedelta(days=30)).isoformat()
    cutoff_14d = (now - timedelta(days=14)).isoformat()

    stale_deals = 0
    stale_leads = 0

    try:
        result = supabase.table("crm_deals").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).is_("won", False).lt("modified_at", cutoff_30d).limit(0).execute()
        stale_deals = result.count or 0
    except Exception:
        pass

    try:
        result = supabase.table("crm_leads").select(
            "*", count="exact"
        ).eq("tenant_id", tenant_id).eq(
            "crm_source", crm_source
        ).lt("modified_at", cutoff_14d).limit(0).execute()
        stale_leads = result.count or 0
    except Exception:
        pass

    return {
        "deals_stale_30d": stale_deals,
        "leads_stale_14d": stale_leads,
    }
