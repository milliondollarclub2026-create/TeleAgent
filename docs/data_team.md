# LeadRelay CRM Data Team — Architecture & Strategy

*The blueprint for an AI consulting team that turns raw CRM data into actionable business intelligence.*

---

## Vision

Most CRM analytics tools show you what happened. **We tell you what to DO.**

A call center owner doesn't want pie charts. They want someone to say: *"Your agent Ahmed closed 3x more deals than average, but his response time is the slowest. He's cherry-picking leads. Implement round-robin assignment — estimated +15% conversion."*

That's a $200/hour consultant. We deliver it for $79/month.

### Product Positioning
- **Acquisition hook**: "See all your CRM data in one place" (unified multi-CRM view)
- **Retention hook**: "We're too valuable to cancel" (AI-driven recommendations)
- **Upsell hook**: "Compare your teams across CRMs" (cross-CRM benchmarking)

---

## 1. Architecture Overview

### ETL-First: Copy Once, Query Forever

Our clients have **massive datasets** — 5+ years of call center data, 200K+ leads, 500K+ activities. Querying CRM APIs live is impossible (200K leads at 50/page at 2 req/sec = 33 minutes per query).

Instead, we **sync CRM data into our own database**, then run all analytics on our copy.

```
CRM (Bitrix24, HubSpot, etc.)
  |
  | [Karim - Sync Engine] (one-time full sync + incremental every 15 min)
  |
  v
Supabase PostgreSQL (normalized crm_* tables)
  |
  | [SQL queries — milliseconds, not minutes]
  |
  v
Agent Team → Dashboard + Chat
```

**Why this is better than live API queries:**

| Factor | Live API | ETL Sync |
|--------|----------|----------|
| Query speed (200K leads) | 33 minutes | < 500ms |
| API calls per dashboard view | 50-4,000 | 0 |
| 5-year historical analysis | Impossible | Trivial SQL |
| Dashboard works if CRM is down | No | Yes |
| Cross-CRM joins | Impossible | Standard SQL JOIN |
| Cost per view | API calls every time | Sync once, query free |

---

### The Agent Team

```
User
  |
  v
[Bobur - Team Lead / Router]  ← Rule-based (90%) + GPT-4o-mini (10%)
  |
  ├── [Karim - Sync Engine]        ← No LLM (pure code ETL pipeline)
  ├── [Farid - Schema Analyst]     ← GPT-4o (runs once per CRM, cached)
  ├── [Dima - Chart Architect]     ← GPT-4o Structured Outputs
  ├── [Anvar - Data Querier]       ← SQL queries (no LLM)
  ├── [Nilufar - Insight Engine]   ← Rule-based (95%) + GPT-4o-mini (5%)
  └── [KPI Resolver]               ← No LLM (pattern matching)
```

**Cost design principle**: The most common operations cost $0. LLMs are only used when reasoning is genuinely needed.

---

## 2. Karim — Sync Engine

The foundation. Everything depends on this working reliably.

| Property | Value |
|----------|-------|
| Model | None (pure Python/SQL) |
| Cost | $0 LLM. Only CRM API calls + DB storage |
| When called | On CRM connect (full sync), then every 15 min (incremental) |

### Normalized Data Schema

All CRMs map to the same tables. Bitrix24's `STATUS_ID` and HubSpot's `lifecyclestage` both become `status`. This is what makes multi-CRM work.

```sql
CREATE TABLE crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,           -- "bitrix24", "hubspot", "zoho"
    external_id TEXT NOT NULL,          -- ID in the source CRM
    title TEXT,
    status TEXT,                        -- Normalized from CRM-specific field
    source TEXT,                        -- Lead source (web, phone, ad, etc.)
    assigned_to TEXT,                   -- Employee name or ID
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    value DECIMAL(15, 2),
    currency TEXT DEFAULT 'USD',
    custom_fields JSONB DEFAULT '{}',   -- CRM-specific fields we don't normalize
    created_at TIMESTAMPTZ,
    modified_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, crm_source, external_id)
);

CREATE TABLE crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT,
    stage TEXT,                         -- Normalized pipeline stage
    value DECIMAL(15, 2),
    currency TEXT DEFAULT 'USD',
    assigned_to TEXT,
    contact_id TEXT,                    -- External contact ID
    company_id TEXT,                    -- External company ID
    won BOOLEAN,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    modified_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, crm_source, external_id)
);

CREATE TABLE crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    type TEXT,                          -- "call", "email", "meeting", "task"
    subject TEXT,
    employee_id TEXT,
    employee_name TEXT,
    duration_seconds INT,
    completed BOOLEAN,
    started_at TIMESTAMPTZ,
    custom_fields JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, crm_source, external_id)
);

CREATE TABLE crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    company TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ,
    modified_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, crm_source, external_id)
);

CREATE TABLE crm_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name TEXT,
    industry TEXT,
    employee_count INT,
    revenue DECIMAL(15, 2),
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ,
    modified_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, crm_source, external_id)
);

-- Indexes for fast analytics queries
CREATE INDEX idx_leads_tenant_source ON crm_leads(tenant_id, crm_source);
CREATE INDEX idx_leads_tenant_created ON crm_leads(tenant_id, created_at);
CREATE INDEX idx_leads_status ON crm_leads(tenant_id, status);
CREATE INDEX idx_deals_tenant_source ON crm_deals(tenant_id, crm_source);
CREATE INDEX idx_deals_tenant_stage ON crm_deals(tenant_id, stage);
CREATE INDEX idx_deals_tenant_created ON crm_deals(tenant_id, created_at);
CREATE INDEX idx_activities_tenant ON crm_activities(tenant_id, crm_source);
CREATE INDEX idx_activities_employee ON crm_activities(tenant_id, employee_id);
CREATE INDEX idx_activities_started ON crm_activities(tenant_id, started_at);

-- Sync tracking
CREATE TABLE crm_sync_status (
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL,
    entity TEXT NOT NULL,                -- "leads", "deals", "activities", etc.
    status TEXT DEFAULT 'pending',       -- "pending", "syncing", "complete", "error"
    total_records INT,
    synced_records INT DEFAULT 0,
    last_sync_cursor TIMESTAMPTZ,        -- Last modified_at we synced
    last_full_sync_at TIMESTAMPTZ,
    last_incremental_at TIMESTAMPTZ,
    error_message TEXT,
    PRIMARY KEY(tenant_id, crm_source, entity)
);
```

### Sync Flow

**Initial Full Sync** (background job, 5-60 min depending on data volume):
```
1. User connects CRM → queue full sync job
2. Show progress: "Syncing your CRM data... 12,450 / 200,000 leads"
3. Paginate through ALL records (50/page at 2 req/sec for Bitrix24)
4. Transform each record to normalized schema
5. Batch UPSERT into crm_* tables (500 records per batch)
6. Store sync_cursor = max(modified_at)
7. Mark sync complete → user sees dashboard
```

**Incremental Sync** (every 15 min, 1-5 seconds):
```
1. Query CRM: "records modified since {last_sync_cursor}"
2. Typically 0-50 records = 1-2 API calls
3. UPSERT changed records
4. Update sync_cursor
5. Dashboard auto-refreshes with new data
```

### CRM Adapter Interface

Every CRM-specific detail lives behind this abstraction:

```python
class CRMAdapter(ABC):
    """One implementation per CRM. Dashboard/agents never see CRM-specific fields."""

    @abstractmethod
    async def test_connection(self) -> dict: ...

    @abstractmethod
    async def get_field_definitions(self, entity: str) -> dict: ...

    @abstractmethod
    async def fetch_page(self, entity: str, cursor: str, limit: int) -> tuple[list[dict], str]:
        """Fetch one page of records. Returns (records, next_cursor)."""

    @abstractmethod
    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        """Fetch records modified since timestamp (for incremental sync)."""

    @abstractmethod
    def normalize(self, entity: str, raw_record: dict) -> dict:
        """Transform CRM-specific record to normalized schema."""

class BitrixAdapter(CRMAdapter): ...
class HubSpotAdapter(CRMAdapter): ...
class ZohoAdapter(CRMAdapter): ...
class FreshsalesAdapter(CRMAdapter): ...
```

### Field Normalization Map

```python
NORMALIZATION = {
    "bitrix24": {
        "leads": {"STATUS_ID": "status", "SOURCE_ID": "source", "DATE_CREATE": "created_at",
                  "DATE_MODIFY": "modified_at", "ASSIGNED_BY_ID": "assigned_to", "TITLE": "title"},
        "deals": {"STAGE_ID": "stage", "OPPORTUNITY": "value", "CURRENCY_ID": "currency",
                  "DATE_CREATE": "created_at", "CLOSEDATE": "closed_at", "DATE_MODIFY": "modified_at"},
    },
    "hubspot": {
        "deals": {"dealstage": "stage", "amount": "value", "createdate": "created_at",
                  "closedate": "closed_at", "hs_lastmodifieddate": "modified_at"},
        "contacts": {"firstname": "name", "email": "email", "phone": "phone"},
    }
}
```

Dima, Anvar, and Nilufar ONLY work with normalized field names. They never see `STATUS_ID` or `dealstage` — just `status`.

---

## 3. Agent Specifications

### 3.1 Bobur — Team Lead & Router

Routes user messages to the right specialist. Mostly rule-based (no LLM for 90% of messages).

| Property | Value |
|----------|-------|
| Model | Rule-based (90%), GPT-4o-mini fallback (10%) |
| Cost per call | $0 (rules) or ~$0.0001 (mini fallback) |
| When called | Every user message |

**Rule-based routing** (handles most messages with zero LLM cost):
```python
ROUTING_RULES = [
    (r"total|how many|count", "kpi_query"),
    (r"chart|plot|graph|visualize|show me", "chart_request"),
    (r"add to dashboard|pin this|save this", "dashboard_action"),
    (r"remove|delete widget", "dashboard_action"),
    (r"trend|anomaly|why|compare|insight|what happened", "insight_request"),
    (r"hello|hi|hey|thanks|thank you", "general_chat"),
]
# If no rule matches → GPT-4o-mini classifier (fallback)
# If classifier confidence < 0.6 → route to Anvar as safe default
```

**Bobur also composes the final response**: Takes raw data/charts from specialist agents and wraps them in conversational text.

---

### 3.2 Farid — Schema Analyst

Analyzes a user's CRM structure AFTER initial sync. Runs against our local DB (not CRM API).

| Property | Value |
|----------|-------|
| Model | GPT-4o |
| Cost per call | ~$0.01-0.03 (one-time per CRM connection) |
| When called | After initial sync completes. Re-runs if user connects another CRM. |

**Key difference from v1 plan**: Farid now queries our Supabase `crm_*` tables, not the CRM API. With 200K records locally, profiling is instant SQL:

```sql
-- Cardinality check
SELECT status, COUNT(*) FROM crm_leads WHERE tenant_id = X GROUP BY status;
-- Null rate
SELECT COUNT(*) FILTER (WHERE source IS NULL)::float / COUNT(*) FROM crm_leads WHERE tenant_id = X;
-- Date range
SELECT MIN(created_at), MAX(created_at) FROM crm_leads WHERE tenant_id = X;
```

**Data quality scoring** — Farid checks what's actually usable:
```python
class DataQualityScore(BaseModel):
    entity: str
    record_count: int
    completeness: float         # % of non-null key fields
    has_temporal_data: bool     # Date ranges for time-series?
    has_categorical_variety: bool  # Multiple distinct values?
    recommendation: str         # "excellent", "usable", "insufficient", "empty"
```

Categories with `insufficient` data are shown grayed out during onboarding — not hidden, so the user knows what's possible if they improve their CRM usage.

**Bitrix24 Simple vs Classic mode**: Farid detects this. In Simple mode (no Leads module), lead-based categories are replaced with contact-based equivalents.

**Output**: `CRMProfile` cached in `dashboard_configs.crm_profile`, structured as:
```json
{
    "bitrix24": {
        "entities": { "leads": {...}, "deals": {...}, ... },
        "data_quality": { "leads": "excellent", "activities": "insufficient" },
        "suggested_categories": [...]
    },
    "hubspot": { ... }
}
```

---

### 3.3 Dima — Chart Architect

Generates chart configurations using GPT-4o Structured Outputs. Guaranteed valid JSON every time.

| Property | Value |
|----------|-------|
| Model | GPT-4o with `response_format=ChartResponse` |
| Temperature | 0.4 |
| Cost per call | ~$0.005-0.015 |
| When called | Chart requests from chat, onboarding chart generation |

**Output schema** (Pydantic — enforced by Structured Outputs):
```python
class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    AREA = "area"
    PIE = "pie"
    DONUT = "donut"
    STACKED_BAR = "stacked_bar"
    FUNNEL = "funnel"
    KPI = "kpi"

class ChartConfig(BaseModel):
    chart_id: str
    title: str
    description: str
    chart_type: ChartType
    data_source: str            # "leads", "deals", "activities", etc.
    crm_source: str             # "bitrix24", "hubspot", "all"
    x_field: Optional[str]      # Normalized field name
    y_field: Optional[str]
    aggregation: str            # "count", "sum", "average"
    group_by: Optional[str]
    time_range_days: int = 30
    filter_field: Optional[str]
    filter_value: Optional[str]
    sort_order: str = "desc"
    limit: Optional[int]
    size: str = "medium"        # "small" (KPI), "medium" (half), "large" (full)

class KPIConfig(BaseModel):
    chart_id: str
    title: str
    data_source: str
    crm_source: str
    metric_field: str
    aggregation: str
    format: str = "number"      # "number", "currency", "percentage"
    time_range_days: int = 30
    comparison_period_days: int = 7
    size: str = "small"

class ChartResponse(BaseModel):
    charts: list[ChartConfig | KPIConfig]
    explanation: str
```

**Post-validation**: Between Dima and Anvar, a validator checks that all field references exist in the CRM profile. Fuzzy-matches close names, rejects invalid ones. This catches LLM hallucinations.

---

### 3.4 Anvar — Data Querier

Executes SQL queries against our Supabase `crm_*` tables. **No LLM needed** — chart configs map directly to SQL.

| Property | Value |
|----------|-------|
| Model | None (SQL generation from ChartConfig) |
| Cost | $0 |
| Response time | < 500ms for most queries |
| When called | After Dima generates a config, on dashboard load, on refresh |

**How it works**: ChartConfig → SQL → Chart data
```python
async def execute_chart_query(config: ChartConfig, supabase) -> list[dict]:
    """Translate chart config to SQL and execute"""

    table = f"crm_{config.data_source}"  # crm_leads, crm_deals, etc.

    # Build WHERE clause
    where = ["tenant_id = :tenant_id"]
    if config.crm_source != "all":
        where.append("crm_source = :crm_source")
    if config.time_range_days:
        where.append(f"created_at > NOW() - INTERVAL '{config.time_range_days} days'")
    if config.filter_field and config.filter_value:
        where.append(f"{config.filter_field} = :filter_value")

    # Build aggregation
    if config.aggregation == "count":
        select = f"SELECT {config.x_field} as label, COUNT(*) as value"
        group_by = f"GROUP BY {config.x_field}"
    elif config.aggregation == "sum":
        select = f"SELECT {config.x_field} as label, SUM({config.y_field}) as value"
        group_by = f"GROUP BY {config.x_field}"
    # ... etc

    query = f"{select} FROM {table} WHERE {' AND '.join(where)} {group_by} ORDER BY value {config.sort_order}"
    if config.limit:
        query += f" LIMIT {config.limit}"

    return await supabase.rpc("execute_analytics_query", {"q": query})
```

**Key: Anvar uses parameterized queries** — no SQL injection risk from LLM-generated field names (they're validated against the CRM profile before reaching Anvar).

---

### 3.5 Nilufar — Insight Engine

**90% rule-based, 10% LLM.** Detects anomalies with Python, only calls GPT-4o-mini to write human-readable explanations for critical alerts.

| Property | Value |
|----------|-------|
| Model | Rule-based detection ($0) + GPT-4o-mini for critical alerts only |
| Cost per check | $0 (rules) or ~$0.0003 (mini, rare) |
| When called | Every 2 hours (background), or on-demand via chat |

**Rule-based detection** ($0, instant):
```python
INSIGHT_RULES = [
    ThresholdRule("conversion_rate", change_pct=0.20, direction="any"),
    ThresholdRule("total_leads", change_pct=0.25, direction="down"),
    ThresholdRule("pipeline_value", change_pct=0.30, direction="down"),
    ThresholdRule("won_deals", change_pct=0.20, direction="up"),
    InactivityRule("employee_activity", inactive_days=7),
    StagnationRule("deal_stage", stuck_days=30),
]
```

**LLM enrichment** (only for warning/critical severity):
```python
async def generate_insight(raw: RawInsight) -> Insight:
    if raw.severity in ("warning", "critical"):
        # GPT-4o-mini writes a 2-sentence explanation + recommendation
        text = await call_mini(f"Explain this CRM anomaly: {raw.data}")
    else:
        # Template: "Your {metric} {increased/decreased} by {pct}% this week"
        text = raw.template.format(**raw.data)
    return Insight(title=raw.title, description=text, severity=raw.severity)
```

**Output**:
```python
class Insight(BaseModel):
    id: str
    severity: str           # "info", "positive", "warning", "critical"
    title: str              # "Conversion rate dropped 23% this week"
    description: str        # "Deal win rate fell from 34% to 26%..."
    suggested_action: str   # "Review deals stuck in Evaluation stage"
    related_chart: Optional[ChartConfig]
    created_at: datetime
    expires_at: datetime    # Auto-expire after 24h
```

---

### 3.6 KPI Resolver — Zero-Cost Pattern Matcher

Handles simple metric queries instantly via SQL. No LLM.

| Property | Value |
|----------|-------|
| Model | None |
| Cost | $0 |
| Response time | < 100ms |

```python
KPI_PATTERNS = {
    r"total leads?":                ("crm_leads", "COUNT(*)", "number"),
    r"total deals?":                ("crm_deals", "COUNT(*)", "number"),
    r"pipeline value":              ("crm_deals", "SUM(value)", "currency"),
    r"conversion rate":             ("computed", "won/total*100", "percentage"),
    r"won deals?":                  ("crm_deals", "COUNT(*) WHERE won=true", "number"),
    r"average deal (size|value)":   ("crm_deals", "AVG(value)", "currency"),
    r"leads? today":                ("crm_leads", "COUNT(*) WHERE created_at > today", "number"),
}
```

---

## 4. Multi-CRM Strategy

### Why This Matters (Differentiation)

Every analytics tool works with ONE CRM. We work with ALL of them simultaneously. This unlocks three value plays no competitor offers:

### 4.1 Unified View (Single Pane of Glass)

**Scenario**: Call center uses Bitrix24 for inbound sales + HubSpot for outbound marketing. Manager currently opens two tabs, mentally adds numbers.

**With LeadRelay**:
```
Dashboard KPIs:
  Total Leads: 12,450 (Bitrix: 8,200 | HubSpot: 4,250)
  Pipeline Value: $2.4M (Bitrix: $1.6M | HubSpot: $800K)
  Conversion Rate: 28% (Bitrix: 32% | HubSpot: 22%)
```

This works because all data lives in normalized `crm_*` tables:
```sql
-- Unified query (crm_source = "all")
SELECT status, COUNT(*) FROM crm_leads WHERE tenant_id = X GROUP BY status;

-- Per-CRM query
SELECT status, COUNT(*) FROM crm_leads WHERE tenant_id = X AND crm_source = 'bitrix24' GROUP BY status;
```

### 4.2 CRM Migration Assistant

**Scenario**: Client switching from Zoho to Bitrix24. Currently a $10-50K consulting project.

**With LeadRelay**:
```
Bobur: "I've compared your Bitrix24 and Zoho accounts:
  Bitrix24: 45,000 leads, 12,000 deals, data quality: 87%
  Zoho:     38,000 leads, 9,500 deals, data quality: 72%

  Differences:
  - 15 custom fields in Bitrix not mapped in Zoho
  - 3,200 contacts exist in Bitrix but not Zoho
  - Zoho deal stages don't map 1:1 to Bitrix stages

  Want me to generate a migration readiness report?"
```

Built on top of ETL — we already have both datasets normalized. Comparison is just SQL.

### 4.3 Cross-CRM Benchmarking

**Scenario**: Company with two teams using different CRMs.

```
Bobur: "Cross-team comparison (Jan 2026):

  Inbound Team (Bitrix24):
    Conversion: 32% | Avg Deal: $4,200 | Response Time: 12 min

  Outbound Team (HubSpot):
    Conversion: 22% | Avg Deal: $6,800 | Response Time: 45 min

  Insight: Outbound closes bigger deals but inbound converts 45% more.
  Recommendation: Route high-value prospects to outbound, let inbound handle volume."
```

THIS is the $200/hour consultant insight. Delivered automatically.

### How `crm_source` Flows Through the System

Every data layer carries `crm_source`:
- `crm_leads.crm_source` — which CRM this record came from
- `dashboard_widgets.crm_source` — which CRM(s) this widget queries ("bitrix24", "hubspot", "all")
- `dashboard_configs.crm_profile` — per-CRM profiles: `{"bitrix24": {...}, "hubspot": {...}}`

When a user has 2 CRMs, Farid runs for each. Onboarding shows data availability per CRM. Standard KPIs default to `crm_source = "all"` (unified).

---

## 5. Onboarding Flow

### Trigger
User connects a CRM → Karim syncs data → sync complete → user opens Analytics page.

### State Machine
```
not_started → syncing → analyzing → categories → refining → generating → complete
```

### Step 1: Sync Progress (Karim)
```
"Syncing your Bitrix24 data..."
[Progress bar: 45,000 / 200,000 leads synced]
"This usually takes 15-30 minutes for large accounts. We'll notify you when it's ready."
```

### Step 2: Schema Analysis (Farid) — after sync complete
```
Bobur: "Your CRM data is ready! Here's what I found:
  - 200,000 leads across 8 statuses (5 years of data)
  - 80,000 deals worth $12M total pipeline
  - 45,000 contacts at 8,500 companies
  - 12 team members with 890,000 activities

  Data quality: Excellent (leads: 94%, deals: 91%, activities: 87%)"
```

### Step 3: Category Selection (user picks 2-4)
```
Bobur: "What would you like to track?"

[Multi-select cards — data-quality aware:]

  [x] Employee Performance          ← "Excellent data (890K activities)"
  [x] Leads & Sales Pipeline        ← "Excellent data (200K leads, 80K deals)"
  [ ] Product Analytics             ← "Good data (1,200 products)"
  [ ] Ad & Source Performance       ← "Usable (65% of leads have source data)"
  [ ] Customer Insights             ← grayed: "Insufficient (company data is sparse)"
```

### Step 4: Refinement (1-2 questions per category)
```
Bobur: "For Employee Performance — detail level?"
  [a] Individual agent metrics    [b] Team overview    [c] Both

Bobur: "For Sales Pipeline — default time range?"
  [a] 7 days    [b] 30 days    [c] 90 days
```

### Step 5: Dashboard Generated (Dima)
```
Bobur: "Building your dashboard..."
[Progress: Generating Employee Performance charts... done]
[Progress: Generating Sales Pipeline charts... done]
[Auto-toggle to Dashboard view]
```

### Onboarding Re-entry
If a user connects a second CRM later, or wants to change categories:
- `POST /api/dashboard/reconfigure` re-runs Farid for the new CRM
- Category selector shows again, pre-checked with current selections
- New widgets are added, existing ones are kept

---

## 6. Dashboard Architecture

### Widget Storage

```sql
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    crm_source TEXT NOT NULL DEFAULT 'all',   -- "bitrix24", "hubspot", "all"

    -- What to render
    chart_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,

    -- How to get data (maps to SQL query via Anvar)
    data_source TEXT NOT NULL,               -- "leads", "deals", "activities"
    x_field TEXT,
    y_field TEXT,
    aggregation TEXT DEFAULT 'count',
    group_by TEXT,
    filter_field TEXT,
    filter_value TEXT,
    time_range_days INT DEFAULT 30,
    sort_order TEXT DEFAULT 'desc',
    item_limit INT,

    -- Layout
    position INT NOT NULL,
    size TEXT DEFAULT 'medium',

    -- Metadata
    is_standard BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'onboarding',        -- "onboarding", "chat", "insight"
    deleted_at TIMESTAMPTZ,                  -- Soft delete, 30-day recovery

    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_widgets_tenant ON dashboard_widgets(tenant_id) WHERE deleted_at IS NULL;
```

### Dashboard Config

```sql
CREATE TABLE dashboard_configs (
    tenant_id UUID PRIMARY KEY,
    onboarding_state TEXT DEFAULT 'not_started',
    selected_categories JSONB DEFAULT '[]',
    refinement_answers JSONB DEFAULT '{}',
    crm_profile JSONB,                       -- Per-CRM profiles from Farid
    timezone TEXT DEFAULT 'UTC',
    display_currency TEXT DEFAULT 'USD',
    last_refreshed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Chat Messages (separate table, not JSONB blob)

```sql
CREATE TABLE dashboard_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    role TEXT NOT NULL,                       -- "user" | "assistant"
    content TEXT NOT NULL,
    charts JSONB,                            -- Inline chart configs
    agent_used TEXT,                          -- "dima", "anvar", "nilufar", etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_tenant_time ON dashboard_chat_messages(tenant_id, created_at DESC);
```

### Standard KPI Widgets (always present, adapts to CRM mode)

| Widget | Source | Query | Format |
|--------|--------|-------|--------|
| Total Leads (or Contacts in Simple mode) | crm_leads / crm_contacts | COUNT(*) | number |
| Total Deals | crm_deals | COUNT(*) | number |
| Pipeline Value | crm_deals | SUM(value) WHERE won IS NULL | currency |
| Conversion Rate | computed | won_deals / total_leads * 100 | percentage |

### Smart Grid Layout
```
1. Standard KPIs → top row (4 equal cards)
2. "large" widgets → full width
3. "medium" widgets → 2 per row
4. "small" widgets → 3 per row
Responsive: tablet = max 2/row, mobile = stacked
```

---

## 7. Chat ↔ Dashboard Toggle

```
┌─────────────────────────────────────────────────────────┐
│  [Chat] [Dashboard]                    [Refresh] [...]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CHAT MODE:              OR       DASHBOARD MODE:       │
│  ┌──────────────────┐            ┌──────────────────┐   │
│  │  Conversation    │            │ [KPI][KPI][KPI]  │   │
│  │  history...      │            │ [KPI]            │   │
│  │                  │            │ ┌──────────────┐ │   │
│  │  [chart]         │            │ │ Line Chart   │ │   │
│  │  [+ Add to       │            │ └──────────────┘ │   │
│  │   Dashboard]     │            │ ┌──────┐┌──────┐│   │
│  │                  │            │ │ Pie  ││ Bar  ││   │
│  ├──────────────────┤            │ └──────┘└──────┘│   │
│  │ [Type message..] │            └──────────────────┘   │
│  └──────────────────┘                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Add to Dashboard**: Button under each chat chart → saves ChartConfig as widget
- **Remove from Dashboard**: "x" on non-standard widgets → soft delete (recoverable 30 days)
- **Chat persists**: Stored in `dashboard_chat_messages`, loads last 50 on mount, infinite scroll for history
- **Both modes share state**: Adding a chart in chat appears on dashboard. Removing from dashboard doesn't delete from chat history.

---

## 8. Observability & Tracing

Every agent call is logged. Non-negotiable from day 1.

```sql
CREATE TABLE agent_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    request_id UUID NOT NULL,            -- Groups all agent calls for one user message
    agent_name TEXT NOT NULL,             -- "bobur", "karim", "farid", "dima", "anvar", "nilufar"
    model TEXT,                           -- "gpt-4o", "gpt-4o-mini", "none"
    tokens_in INT,
    tokens_out INT,
    cost_usd DECIMAL(10, 6),
    duration_ms INT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traces_tenant ON agent_traces(tenant_id, created_at DESC);
CREATE INDEX idx_traces_request ON agent_traces(request_id);
```

This gives us:
- Per-request waterfall: Bobur 50ms → Dima 3.4s → Anvar 200ms
- Cost tracking per agent and per tenant
- Error rate monitoring
- Model performance comparisons

---

## 9. Privacy & Data Security

### What We Store
- **CRM credentials**: Encrypted with Fernet (AES-128-CBC) via `crypto_utils.py`
- **CRM data**: Synced into `crm_*` tables — contains PII (names, phones, emails, deal values)
- **Chat history**: User conversations with the data team

### Protections Already In Place
- **Row-Level Security (RLS)** on all 17 existing tables — tenant_id isolation at the database layer
- **JWT-based tenant isolation** — every RLS policy checks `auth.jwt() ->> 'tenant_id'`
- **Fernet encryption** for all credentials (API keys, webhook URLs, OAuth tokens)
- **Supabase TDE** (Transparent Data Encryption) — data encrypted at rest
- **TLS in transit** — enforced by Supabase

### Required Before First B2B Sale

**1. Upgrade Supabase to Pro ($25/month)**
- Free tier = 500MB (one large client can fill this)
- Pro = 8GB + daily backups + better connection pool
- Do this immediately

**2. RLS policies on ALL new `crm_*` tables**
```sql
-- Same pattern as existing tables
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON crm_leads FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- Repeat for crm_deals, crm_activities, crm_contacts, crm_companies,
-- crm_sync_status, dashboard_widgets, dashboard_configs,
-- dashboard_chat_messages, agent_traces
```

**3. Data deletion policy**
- On CRM disconnect: Stop syncing, keep data (user might reconnect)
- On account deletion: 30-day grace period, then hard delete ALL tenant data
- "Delete all my data" button in settings (right to erasure)
- Document in Terms of Service

**4. Data access logging**
```sql
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    accessed_by TEXT NOT NULL,          -- "system:karim_sync", "system:anvar_query", "user:{id}"
    action TEXT NOT NULL,               -- "sync_full", "sync_incremental", "query_dashboard"
    entity TEXT,
    record_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**5. Minimal data sync** — Only sync structured fields needed for analytics. Skip:
- Free-text notes/comments (could contain anything sensitive)
- File attachments
- Internal CRM system fields

### What We Can Tell Clients
- "All credentials are AES-128 encrypted"
- "Every database table has row-level security — your data is isolated at the database layer, not just application layer"
- "All data encrypted at rest and in transit"
- "We never share data between accounts"
- "You can delete all your data at any time with one click"

### What We Don't Need Yet
- SOC2 certification (when revenue justifies ~$10K investment)
- Data residency / regional hosting (until legally required by a client)
- Customer-managed encryption keys (enterprise feature)

---

## 10. API Endpoints

```
# Sync
POST   /api/crm/sync/start              → Queue full sync for connected CRM
GET    /api/crm/sync/status              → Sync progress per entity
POST   /api/crm/sync/refresh             → Force incremental sync now

# Dashboard onboarding
POST   /api/dashboard/onboarding/start   → Trigger Farid → returns CRM profile + categories
POST   /api/dashboard/onboarding/select  → Submit selected categories → returns refinement Qs
POST   /api/dashboard/onboarding/refine  → Submit answers → Dima generates dashboard
POST   /api/dashboard/reconfigure        → Re-enter onboarding (add CRM, change categories)

# Dashboard data
GET    /api/dashboard/widgets            → All active widgets + their data
POST   /api/dashboard/widgets            → Add widget (from chat "Add to Dashboard")
DELETE /api/dashboard/widgets/{id}       → Soft-delete widget
GET    /api/dashboard/data               → Refresh all widget data
GET    /api/dashboard/insights           → Active insights from Nilufar

# Chat
POST   /api/dashboard/chat              → Send message → Bobur routes → response + charts
GET    /api/dashboard/chat/history       → Paginated chat history (last 50 default)

# Data management
POST   /api/data/delete-all             → Delete all tenant CRM data (right to erasure)
GET    /api/data/usage                  → Storage usage, record counts per entity
```

---

## 11. Cost Model

### Per-Query Costs

| Scenario | Agents | LLM Cost |
|----------|--------|----------|
| Simple KPI ("total leads?") | Bobur (rule) → KPI Resolver (SQL) | **$0** |
| Dashboard load/refresh | Anvar (SQL) | **$0** |
| Chart request | Bobur (rule) → Dima (4o structured) → Anvar (SQL) | **~$0.008** |
| Data question | Bobur (mini) → Anvar (SQL) | **~$0.0003** |
| Insight check | Nilufar (rules) | **$0** |
| Critical alert text | Nilufar → GPT-4o-mini | **~$0.0003** |
| Onboarding (one-time) | Farid (4o) + Dima (4o) | **~$0.03** |

### Monthly Cost Per Tenant

| Component | Free | Pro ($29) | Business ($79) |
|-----------|------|-----------|----------------|
| Karim sync (API calls) | $0 | $0 | $0 |
| Farid schema | $0.03 | $0.12 | $0.24 |
| Dima charts | $0.80 | $3.00 | $8.00 |
| Anvar queries | $0 | $0 | $0 |
| Nilufar insights | $0.02 | $0.05 | $0.10 |
| Bobur routing | $0 | $0.50 | $1.00 |
| **Total LLM** | **$0.85** | **$3.67** | **$9.34** |
| DB storage (~2GB/client) | ~$0.10 | ~$0.10 | ~$0.10 |
| **Total cost** | **$0.95** | **$3.77** | **$9.44** |
| **Revenue** | $0 | $29 | $79 |
| **Margin** | -$0.95 | **87%** | **88%** |

### At 200 Clients (realistic mix: 120 free, 60 pro, 20 business)
```
Cost:    120×$0.95 + 60×$3.77 + 20×$9.44 = $114 + $226 + $189 = $529/month
Revenue: 60×$29 + 20×$79 = $1,740 + $1,580 = $3,320/month
Margin:  84%
```

---

## 12. Error Handling

```
Karim fails (sync):
  → Show last successful sync time: "Data as of 2 hours ago"
  → Auto-retry in 5 minutes
  → Dashboard keeps working with existing data

Farid fails (schema analysis):
  → Fall back to generic categories (not data-driven)
  → Log error, retry in 5 minutes

Dima fails (chart generation):
  → Show predefined chart templates instead
  → "I couldn't generate a custom chart. Here's a standard view."

Anvar fails (SQL query):
  → Show "Data temporarily unavailable" on affected widget
  → Other widgets unaffected

Nilufar fails (insights):
  → Silently skip. Insights are enhancement, not core.

Bobur fails (routing):
  → Default to Anvar (safest handler)
  → "Could you rephrase that?"

CRM connection lost:
  → Dashboard keeps working (data is local!)
  → Show badge: "Sync paused — CRM connection issue"
  → Incremental sync resumes automatically when connection restores
```

---

## 13. Implementation Phases

### Phase 1: ETL Foundation
1. Create `crm_*` normalized tables + `crm_sync_status` + indexes
2. Implement `CRMAdapter` abstraction + `BitrixAdapter`
3. Build Karim sync engine (full sync + incremental)
4. Sync status API endpoints
5. RLS policies on all new tables

### Phase 2: Analytics Core
1. Farid schema analyst (queries local DB, not CRM API)
2. Anvar data querier (ChartConfig → SQL)
3. KPI Resolver (pattern matching → SQL)
4. Dima chart architect (GPT-4o Structured Outputs + post-validation)
5. Agent traces table + logging

### Phase 3: Dashboard UI
1. DynamicChart renderer (maps ChartConfig → Recharts)
2. KPICard component (with currency/timezone)
3. DashboardGrid (smart layout)
4. Chat ↔ Dashboard toggle
5. "Add to Dashboard" / remove widget flows

### Phase 4: Onboarding + Chat
1. Onboarding state machine
2. Category selector (data-quality aware)
3. Refinement chat flow
4. Persistent chat (DB-backed, paginated)
5. Bobur router (rule-based + mini fallback)

### Phase 5: Intelligence + Multi-CRM
1. Nilufar insight engine (rule-based + mini enrichment)
2. Dashboard soft-delete + recovery
3. Onboarding re-entry for second CRM
4. Cross-CRM unified views
5. CRM migration comparison report

---

## Appendix: Bitrix24 API Methods

### Currently Used
```
crm.lead.list / .add / .update / .get    → Lead CRUD
crm.deal.list / .get                      → Deal reads
crm.product.list / .get                   → Product reads
crm.contact.list                          → Contact search
crm.status.list                           → Lead statuses / deal stages
crm.settings.mode.get                     → Simple vs Classic mode
user.current                              → Connection test
```

### To Add (for ETL + Dashboard)
```
crm.lead.fields        → Field definitions for normalization
crm.deal.fields         → Field definitions
crm.contact.fields      → Field definitions
crm.company.fields      → Field definitions
crm.company.list        → Company data
crm.activity.list       → Employee activities (calls, emails, meetings)
crm.stagehistory.list   → Deal stage movement history
crm.dealcategory.list   → Pipeline definitions
crm.deal.productrows.get → Products per deal
```

### Rate Limits (Official)
| Plan | Requests/sec | Burst Buffer | Execution Time Limit |
|------|-------------|--------------|---------------------|
| Standard | 2 | 50 before block | 480 sec / 10 min window |
| Enterprise | 5 | 250 before block | 480 sec / 10 min window |

Incremental sync (15 min) stays well within limits: 1-5 API calls per cycle.
Full sync respects rate limiter: paginate at 2 req/sec with existing `BitrixRateLimiter`.

---

*Last updated: 2026-02-17*
*Author: LeadRelay Engineering*
