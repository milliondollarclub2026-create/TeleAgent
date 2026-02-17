"""
Data Team Agents — Shared Pydantic models for inter-agent communication.

Agent roster:
  Bobur   — Router + orchestrator  (rules + GPT-4o-mini)
  Farid   — Schema analyst         (GPT-4o)
  Dima    — Chart architect        (GPT-4o)
  Anvar   — Data querier           ($0 SQL builder)
  Nilufar — Insight engine         (rules + GPT-4o-mini)
  KPI Resolver — Pattern matcher   ($0)
"""

from pydantic import BaseModel, Field
from typing import Any, Optional


class ChartConfig(BaseModel):
    """Dima's output — describes how to build one chart."""
    chart_type: str          # "bar", "pie", "line", "funnel", "kpi"
    title: str
    data_source: str         # "crm_leads", "crm_deals", etc.
    x_field: str             # Column for grouping (e.g. "status", "stage")
    y_field: str = "count"   # "count", "sum", "avg"
    aggregation: str = "count"
    group_by: Optional[str] = None
    filter_field: Optional[str] = None
    filter_value: Optional[str] = None
    time_range_days: Optional[int] = None
    sort_order: str = "desc"
    item_limit: int = 10


class KPIConfig(BaseModel):
    """Configuration for a single KPI query."""
    title: str
    data_source: str
    aggregation: str         # "count", "sum", "avg"
    field: Optional[str] = None
    filter_field: Optional[str] = None
    filter_value: Optional[str] = None
    time_range_days: Optional[int] = None
    comparison_days: Optional[int] = None  # For change calculation


class ChartResult(BaseModel):
    """Frontend-compatible chart/KPI result.
    Must match ChartRenderer.js expected format:
      Charts: {type, title, data: [{label, value}]}
      KPIs:   {type: 'kpi', title, value, change, changeDirection}
    """
    type: str
    title: str
    data: Optional[list] = None         # [{label, value}] for charts
    value: Optional[Any] = None         # For KPIs
    change: Optional[str] = None        # e.g. "+15%"
    changeDirection: Optional[str] = None  # "up" | "down" | "flat"


class CRMProfile(BaseModel):
    """Farid's output — tenant's CRM data profile."""
    crm_source: str
    entities: dict = Field(default_factory=dict)
    # {entity: {count, fields, date_range, null_rates, sample_values}}
    categories: list = Field(default_factory=list)
    # [{id, name, description, data_quality, recommended}]
    data_quality_score: float = 0.0


class InsightResult(BaseModel):
    """Nilufar's output — one insight or anomaly."""
    severity: str            # "info", "warning", "critical"
    title: str
    description: str
    suggested_action: Optional[str] = None


class RouterResult(BaseModel):
    """Bobur's routing decision."""
    intent: str              # "kpi_query", "chart_request", "insight_query", "general_chat"
    agent: str               # "kpi_resolver", "dima", "anvar", "nilufar", "bobur"
    filters: dict = Field(default_factory=dict)
    confidence: float = 1.0
