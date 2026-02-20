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


# ── Phase 1: Schema Discovery models ───────────────────────────────────

class FieldProfile(BaseModel):
    """One field in a CRM entity — profiled from actual data."""
    field_name: str
    field_type: str
    fill_rate: float = 1.0        # 1.0 - null_rate
    distinct_count: int = 0
    sample_values: list = Field(default_factory=list)
    semantic_role: Optional[str] = None  # AI-inferred: 'status_field', 'amount_field', etc.


class EntityProfile(BaseModel):
    """One CRM entity (e.g. deals, leads) with its field profiles."""
    entity: str
    record_count: int = 0
    fields: list[FieldProfile] = Field(default_factory=list)
    business_label: str = ""      # AI-generated: "Enrollments", "Deals"
    business_interpretation: str = ""


class SchemaProfile(BaseModel):
    """Full tenant CRM schema profile — Farid's output."""
    tenant_id: str
    crm_source: str
    business_type: str = "unknown"
    business_summary: str = ""
    entities: list[EntityProfile] = Field(default_factory=list)
    suggested_goals: list[dict] = Field(default_factory=list)
    data_quality_score: float = 0.0
    stage_field: Optional[str] = None
    amount_field: Optional[str] = None
    owner_field: Optional[str] = None
    currency: Optional[str] = None
    entity_labels: dict = Field(default_factory=dict)


# ── Phase 2: Dynamic Metrics, Alerts & Recommendations ────────────────

class DynamicMetricEvidence(BaseModel):
    """Evidence attached to every computed metric — proves the number is real."""
    row_count: int = 0
    timeframe: str = "all time"
    definition: str = ""            # Human-readable recipe summary
    source_tables: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)
    data_freshness: Optional[str] = None  # e.g. "2 hours ago"
    null_rates: dict = Field(default_factory=dict)


class DynamicMetricResult(BaseModel):
    """Return type from the generic compute engine."""
    metric_key: str
    title: str
    value: Optional[Any] = None
    display_format: str = "number"    # 'number', 'currency', 'percentage', 'days'
    currency: Optional[str] = None
    evidence: DynamicMetricEvidence = Field(default_factory=DynamicMetricEvidence)
    confidence: float = 0.0
    comparison: Optional[dict] = None  # {previous_value, change_pct, direction}


class AlertResult(BaseModel):
    """One fired alert from the alerts engine."""
    alert_type: str              # 'trend_decline', 'stagnation', 'concentration', etc.
    severity: str                # 'critical', 'warning', 'info'
    title: str
    summary: str
    evidence: dict = Field(default_factory=dict)
    metric_key: Optional[str] = None
    entity: Optional[str] = None


class Recommendation(BaseModel):
    """Nilufar's output — actionable business recommendation."""
    severity: str                # 'critical', 'warning', 'info', 'opportunity'
    title: str
    finding: str                 # What happened
    impact: str = ""             # Business impact
    action: str = ""             # What to do about it
    evidence: dict = Field(default_factory=dict)
    related_metrics: list[str] = Field(default_factory=list)
