"""
Analytics Context Builder for CRM Intelligence

Provides pre-aggregated analytics for instant responses and reduced API costs.
Pattern matching enables $0 responses for common queries.
Background refresh keeps data current.
"""

import asyncio
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


# ============ Pattern Matching Configuration ============
# These patterns enable instant, $0 responses for common analytics queries

INSTANT_PATTERNS = [
    # NOTE: Pattern matching is now DISABLED for most queries to allow richer AI responses
    # We only use pattern matching for simple KPI lookups that don't benefit from AI analysis
    # Complex queries should go through GPT-4o-mini with full CRM context
]

# Patterns that SHOULD use instant response (simple metrics that don't need AI depth)
SIMPLE_KPI_PATTERNS = [
    {
        "patterns": ["total leads", "how many leads total"],
        "aggregation_key": "total_leads",
        "chart_type": "kpi",
        "title": "Total Leads",
        "text_template": "You have **{value}** total leads in your CRM.",
        "is_single_value": True
    },
    {
        "patterns": ["total deals", "how many deals total"],
        "aggregation_key": "total_deals",
        "chart_type": "kpi",
        "title": "Total Deals",
        "text_template": "You have **{value}** total deals in your pipeline.",
        "is_single_value": True
    },
]


def match_pattern(query: str, aggregations: Dict) -> Optional[Tuple[str, List[Dict]]]:
    """
    Try to match the user query against instant patterns.

    NOTE: We've intentionally reduced pattern matching scope. Most queries should
    go through GPT-4o-mini with full CRM context for richer, more insightful responses.

    Only simple KPI lookups use instant pattern matching (e.g., "total leads").
    Complex queries like "leads by status", "overview", etc. now use AI for depth.

    Returns:
        (response_text, charts) if matched, None otherwise
    """
    query_lower = query.lower().strip()

    # Only match very simple KPI queries - let AI handle everything else
    for pattern_config in SIMPLE_KPI_PATTERNS:
        # Check if any pattern matches EXACTLY (more restrictive)
        if any(p in query_lower for p in pattern_config["patterns"]):
            agg_key = pattern_config["aggregation_key"]

            # Get the aggregation data
            agg_data = aggregations.get(agg_key)
            if agg_data is None:
                continue

            # Build KPI response for simple metrics
            if pattern_config.get("is_single_value"):
                return _build_kpi_response(pattern_config, agg_data, aggregations)

    # Return None for everything else - let GPT-4o-mini handle with full context
    return None


def _build_kpi_response(config: Dict, value: Any, aggregations: Dict) -> Tuple[str, List[Dict]]:
    """Build a KPI card response."""
    # Format the text
    if config.get("format_currency"):
        text = config["text_template"].format(value=value)
    else:
        text = config["text_template"].format(value=value)

    # Build KPI chart
    chart = {
        "type": "kpi",
        "title": config["title"],
        "value": value if not config.get("format_currency") else f"{value:,.0f}"
    }

    # Add change indicator if available
    change_key = f"{config['aggregation_key']}_change"
    if change_key in aggregations:
        change = aggregations[change_key]
        chart["change"] = f"{change:+.1f}%"
        chart["changeDirection"] = "up" if change > 0 else "down"

    return text, [chart]


def _build_chart_response(config: Dict, data: List[Dict], aggregations: Dict) -> Tuple[str, List[Dict]]:
    """Build a chart response (bar, pie, line, funnel)."""
    # Calculate total for template
    total = sum(item.get("value", 0) for item in data) if isinstance(data, list) else 0

    text = config["text_template"].format(total=total, value=total)

    chart = {
        "type": config["chart_type"],
        "title": config["title"],
        "data": data
    }

    # Add orientation for bar charts
    if config["chart_type"] == "bar":
        chart["orientation"] = "vertical"

    return text, [chart]


def _build_overview_response(aggregations: Dict) -> Tuple[str, List[Dict]]:
    """Build a multi-chart overview response."""
    charts = []

    # KPI cards for key metrics
    if aggregations.get("total_leads") is not None:
        charts.append({
            "type": "kpi",
            "title": "Total Leads",
            "value": aggregations["total_leads"]
        })

    if aggregations.get("conversion_rate") is not None:
        charts.append({
            "type": "kpi",
            "title": "Conversion Rate",
            "value": f"{aggregations['conversion_rate']:.1f}%"
        })

    if aggregations.get("total_pipeline_value") is not None:
        charts.append({
            "type": "kpi",
            "title": "Pipeline Value",
            "value": f"{aggregations['total_pipeline_value']:,.0f}"
        })

    # Leads by status bar chart
    if aggregations.get("leads_by_status"):
        charts.append({
            "type": "bar",
            "title": "Leads by Status",
            "data": aggregations["leads_by_status"],
            "orientation": "vertical"
        })

    # Lead sources pie chart
    if aggregations.get("leads_by_source"):
        charts.append({
            "type": "pie",
            "title": "Lead Sources",
            "data": aggregations["leads_by_source"]
        })

    # Sales funnel
    if aggregations.get("deals_by_stage"):
        charts.append({
            "type": "funnel",
            "title": "Sales Pipeline",
            "data": aggregations["deals_by_stage"]
        })

    text = f"""Here's your CRM analytics overview:

**Key Metrics:**
- **{aggregations.get('total_leads', 0)}** total leads
- **{aggregations.get('total_deals', 0)}** total deals
- **{aggregations.get('conversion_rate', 0):.1f}%** conversion rate
- **{aggregations.get('total_pipeline_value', 0):,.0f}** pipeline value"""

    return text, charts


class AnalyticsContextBuilder:
    """
    Builds and maintains pre-aggregated analytics context for a tenant.

    Features:
    - Schema discovery (lead statuses, deal stages, employees)
    - Pre-computed aggregations for common queries
    - Background refresh to keep data current
    - Pattern matching for instant responses
    """

    def __init__(self, tenant_id: str, supabase_client, bitrix_client):
        self.tenant_id = tenant_id
        self.supabase = supabase_client
        self.bitrix = bitrix_client
        self._refresh_task: Optional[asyncio.Task] = None
        self._is_running = False

    async def initialize(self) -> Dict:
        """
        Full initialization: schema discovery + aggregation.
        Called when Bobur is hired.

        Returns:
            Dict with status and aggregations
        """
        logger.info(f"Initializing analytics context for tenant {self.tenant_id}")

        try:
            # Discover CRM schema
            lead_statuses = await self._discover_lead_statuses()
            deal_stages = await self._discover_deal_stages()
            employees = await self._discover_employees()

            # Compute aggregations
            aggregations = await self._compute_aggregations(lead_statuses, deal_stages)

            # Store in Supabase
            context_data = {
                "tenant_id": self.tenant_id,
                "lead_statuses": lead_statuses,
                "deal_stages": deal_stages,
                "employees": employees,
                "aggregations": aggregations,
                "total_leads": aggregations.get("total_leads", 0),
                "total_deals": aggregations.get("total_deals", 0),
                "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }

            # Upsert (insert or update if exists)
            await self._upsert_context(context_data)

            logger.info(f"Analytics context initialized for tenant {self.tenant_id}")

            return {
                "status": "initialized",
                "total_leads": context_data["total_leads"],
                "total_deals": context_data["total_deals"],
                "aggregations_count": len(aggregations)
            }

        except Exception as e:
            logger.error(f"Failed to initialize analytics context for {self.tenant_id}: {e}")
            raise

    async def refresh(self) -> Dict:
        """
        Refresh aggregations with latest CRM data.
        Called periodically by background task.
        """
        logger.debug(f"Refreshing analytics context for tenant {self.tenant_id}")

        try:
            # Fetch current schema from stored context
            existing = await self._get_context()
            if not existing:
                # Context doesn't exist, do full init
                return await self.initialize()

            lead_statuses = existing.get("lead_statuses", [])
            deal_stages = existing.get("deal_stages", [])

            # Re-compute aggregations
            aggregations = await self._compute_aggregations(lead_statuses, deal_stages)

            # Update in Supabase
            update_data = {
                "aggregations": aggregations,
                "total_leads": aggregations.get("total_leads", 0),
                "total_deals": aggregations.get("total_deals", 0),
                "last_refreshed_at": datetime.now(timezone.utc).isoformat()
            }

            self.supabase.table("crm_analytics_context").update(
                update_data
            ).eq("tenant_id", self.tenant_id).execute()

            logger.debug(f"Analytics context refreshed for tenant {self.tenant_id}")

            return {
                "status": "refreshed",
                "total_leads": update_data["total_leads"],
                "total_deals": update_data["total_deals"]
            }

        except Exception as e:
            logger.error(f"Failed to refresh analytics context for {self.tenant_id}: {e}")
            return {"status": "error", "message": str(e)}

    async def start_background_refresh(self, interval_seconds: int = 120):
        """
        Start background refresh loop.
        Runs every `interval_seconds` (default: 2 minutes).
        """
        if self._is_running:
            logger.warning(f"Background refresh already running for tenant {self.tenant_id}")
            return

        self._is_running = True
        self._refresh_task = asyncio.create_task(
            self._background_refresh_loop(interval_seconds)
        )
        logger.info(f"Started background refresh for tenant {self.tenant_id}, interval={interval_seconds}s")

    async def stop_background_refresh(self):
        """
        Stop background refresh and mark context as inactive.
        Called when Bobur is fired.
        """
        self._is_running = False

        if self._refresh_task:
            self._refresh_task.cancel()
            try:
                await self._refresh_task
            except asyncio.CancelledError:
                pass
            self._refresh_task = None

        # Mark as inactive in database
        try:
            self.supabase.table("crm_analytics_context").update({
                "is_active": False
            }).eq("tenant_id", self.tenant_id).execute()
        except Exception as e:
            logger.error(f"Failed to mark context inactive for {self.tenant_id}: {e}")

        logger.info(f"Stopped background refresh for tenant {self.tenant_id}")

    async def get_aggregations(self) -> Optional[Dict]:
        """
        Get current aggregations for pattern matching.

        Returns:
            Aggregations dict if context exists and is active, None otherwise
        """
        context = await self._get_context()
        if context and context.get("is_active"):
            return context.get("aggregations", {})
        return None

    # ============ Private Methods ============

    async def _background_refresh_loop(self, interval: int):
        """Background refresh loop that runs until stopped."""
        while self._is_running:
            try:
                await asyncio.sleep(interval)
                if self._is_running:  # Check again after sleep
                    await self.refresh()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background refresh loop for {self.tenant_id}: {e}")
                # Continue running despite errors

    async def _discover_lead_statuses(self) -> List[Dict]:
        """Discover all lead statuses from CRM."""
        try:
            statuses = await self.bitrix.get_lead_statuses()
            return [
                {"id": s.get("STATUS_ID"), "name": s.get("NAME")}
                for s in statuses
            ]
        except Exception as e:
            logger.warning(f"Failed to discover lead statuses: {e}")
            return []

    async def _discover_deal_stages(self) -> List[Dict]:
        """Discover all deal stages from CRM."""
        try:
            stages = await self.bitrix.get_deal_stages()
            return [
                {"id": s.get("STATUS_ID"), "name": s.get("NAME")}
                for s in stages
            ]
        except Exception as e:
            logger.warning(f"Failed to discover deal stages: {e}")
            return []

    async def _discover_employees(self) -> List[Dict]:
        """Discover employees/users from CRM."""
        try:
            # Try to get users if available
            # This depends on Bitrix24 permissions
            return []  # Placeholder - implement if user.list is available
        except Exception as e:
            logger.warning(f"Failed to discover employees: {e}")
            return []

    async def _compute_aggregations(self, lead_statuses: List[Dict], deal_stages: List[Dict]) -> Dict:
        """
        Compute all aggregations from CRM data.
        """
        aggregations = {}

        # Fetch raw data
        try:
            leads = await self.bitrix.list_leads(limit=500)
            deals = await self.bitrix.list_deals(limit=500)
        except Exception as e:
            logger.error(f"Failed to fetch CRM data: {e}")
            return aggregations

        # Build status/stage lookup maps
        status_map = {s["id"]: s["name"] for s in lead_statuses}
        stage_map = {s["id"]: s["name"] for s in deal_stages}

        # ---- Lead Aggregations ----
        aggregations["total_leads"] = len(leads)

        # Leads by status
        status_counts = defaultdict(int)
        for lead in leads:
            status_id = lead.get("STATUS_ID", "UNKNOWN")
            status_name = status_map.get(status_id, status_id)
            status_counts[status_name] += 1

        aggregations["leads_by_status"] = [
            {"label": status, "value": count}
            for status, count in sorted(status_counts.items(), key=lambda x: -x[1])
        ]

        # Leads by source
        source_counts = defaultdict(int)
        for lead in leads:
            source = lead.get("SOURCE_ID", "Other")
            source_counts[source] += 1

        aggregations["leads_by_source"] = [
            {"label": source, "value": count}
            for source, count in sorted(source_counts.items(), key=lambda x: -x[1])
        ]

        # Leads by day (last 7 days)
        now = datetime.now(timezone.utc)
        day_counts = defaultdict(int)
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        for lead in leads:
            created = lead.get("DATE_CREATE", "")
            if created:
                try:
                    # Parse date (Bitrix format: 2026-02-10T12:30:00+00:00)
                    if "T" in created:
                        date_str = created.split("T")[0]
                    else:
                        date_str = created[:10]
                    lead_date = datetime.strptime(date_str, "%Y-%m-%d")
                    days_ago = (now.date() - lead_date.date()).days
                    if 0 <= days_ago < 7:
                        day_name = day_names[lead_date.weekday()]
                        day_counts[day_name] += 1
                except Exception:
                    pass

        # Order by day of week (Mon-Sun)
        aggregations["leads_by_day"] = [
            {"label": day, "value": day_counts.get(day, 0)}
            for day in day_names
        ]

        # Leads this week / this month
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        this_week = 0
        this_month = 0

        for lead in leads:
            created = lead.get("DATE_CREATE", "")
            if created:
                try:
                    if "T" in created:
                        date_str = created.split("T")[0]
                    else:
                        date_str = created[:10]
                    lead_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    if lead_date >= week_ago:
                        this_week += 1
                    if lead_date >= month_ago:
                        this_month += 1
                except Exception:
                    pass

        aggregations["this_week_leads"] = this_week
        aggregations["this_month_leads"] = this_month

        # ---- Deal Aggregations ----
        aggregations["total_deals"] = len(deals)

        # Deals by stage (for funnel)
        stage_data = defaultdict(lambda: {"count": 0, "value": 0})
        total_pipeline = 0
        won_count = 0
        won_value = 0

        for deal in deals:
            stage_id = deal.get("STAGE_ID", "UNKNOWN")
            stage_name = stage_map.get(stage_id, stage_id)
            value = float(deal.get("OPPORTUNITY", 0) or 0)

            stage_data[stage_name]["count"] += 1
            stage_data[stage_name]["value"] += value
            total_pipeline += value

            # Check for won deals
            if "WON" in str(stage_id).upper():
                won_count += 1
                won_value += value

        aggregations["deals_by_stage"] = [
            {"label": stage, "value": data["count"]}
            for stage, data in sorted(stage_data.items(), key=lambda x: -x[1]["count"])
        ]

        aggregations["total_pipeline_value"] = total_pipeline
        aggregations["won_deals"] = won_count
        aggregations["won_value"] = won_value

        # Conversion rate
        if len(leads) > 0:
            aggregations["conversion_rate"] = round((won_count / len(leads)) * 100, 1)
        else:
            aggregations["conversion_rate"] = 0.0

        return aggregations

    async def _get_context(self) -> Optional[Dict]:
        """Get existing context from database."""
        try:
            result = self.supabase.table("crm_analytics_context").select("*").eq(
                "tenant_id", self.tenant_id
            ).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.error(f"Failed to get context for {self.tenant_id}: {e}")
        return None

    async def _upsert_context(self, context_data: Dict):
        """Insert or update context in database."""
        try:
            # Check if exists
            existing = await self._get_context()

            if existing:
                # Update
                self.supabase.table("crm_analytics_context").update(
                    context_data
                ).eq("tenant_id", self.tenant_id).execute()
            else:
                # Insert
                self.supabase.table("crm_analytics_context").insert(
                    context_data
                ).execute()
        except Exception as e:
            logger.error(f"Failed to upsert context for {self.tenant_id}: {e}")
            raise


# ============ Global State Management ============
# Track active analytics builders per tenant

_active_builders: Dict[str, AnalyticsContextBuilder] = {}


def get_active_builder(tenant_id: str) -> Optional[AnalyticsContextBuilder]:
    """Get the active analytics builder for a tenant."""
    return _active_builders.get(tenant_id)


def register_builder(tenant_id: str, builder: AnalyticsContextBuilder):
    """Register an active builder for a tenant."""
    _active_builders[tenant_id] = builder


def unregister_builder(tenant_id: str):
    """Unregister a builder for a tenant."""
    if tenant_id in _active_builders:
        del _active_builders[tenant_id]
