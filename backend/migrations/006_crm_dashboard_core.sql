-- =============================================================================
-- Migration 006: CRM Dashboard Core Tables
-- =============================================================================
-- Creates all production tables used by the CRM sync engine (Karim),
-- dashboard onboarding (Farid/Dima), widget hydration (Anvar/KPI Resolver),
-- AI chat (Bobur), insights (Nilufar), and agent observability (AgentTrace).
--
-- These tables existed only in Supabase directly; this migration makes the
-- schema version-controlled and reproducible from scratch.
--
-- Safe to run on an existing database — all statements use IF NOT EXISTS
-- or CREATE INDEX IF NOT EXISTS to avoid errors on re-application.
--
-- Apply order: after 005_unique_active_instagram_account.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. crm_connections
-- Stores one row per active CRM integration per tenant.
-- Credentials are encrypted at application layer (crypto_utils.encrypt_value)
-- before storage. Never store plaintext secrets.
--
-- Code refs:
--   backend/crm_manager.py  → store_connection, get_connection, remove_connection
--   backend/sync_engine.py  → trigger_full_sync (reads credentials)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_connections (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_type     TEXT        NOT NULL,                   -- 'bitrix24' | 'hubspot' | 'zoho' | 'freshsales'
    credentials  JSONB       NOT NULL DEFAULT '{}',      -- encrypted: webhook_url, access_token, refresh_token, api_key
    config       JSONB       NOT NULL DEFAULT '{}',      -- portal_user, crm_mode, domain, etc.
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    connected_at TIMESTAMPTZ,                            -- set by crm_manager.store_connection
    last_sync_at TIMESTAMPTZ,                            -- updated after every sync cycle
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active row per (tenant, CRM type). Inactive/historical rows share tenant+type.
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_connections_tenant_crm_type
    ON crm_connections (tenant_id, crm_type);

CREATE INDEX IF NOT EXISTS idx_crm_connections_tenant_id
    ON crm_connections (tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_connections_active
    ON crm_connections (tenant_id, is_active);


-- ---------------------------------------------------------------------------
-- 2. crm_sync_status
-- One row per (tenant, crm_source, entity) — tracks ETL progress per entity.
-- Written by SyncEngine._update_sync_status() via upsert.
--
-- Code refs:
--   backend/sync_engine.py  → _update_sync_status, _get_sync_cursor
--   backend/server.py       → POST /crm/sync/start, GET /crm/sync/status
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sync_status (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source          TEXT        NOT NULL,       -- 'bitrix24' | 'hubspot' etc.
    entity              TEXT        NOT NULL,       -- 'leads' | 'deals' | 'contacts' | 'companies' | 'activities'
    status              TEXT        NOT NULL,       -- 'syncing' | 'complete' | 'error'
    total_records       INTEGER,
    synced_records      INTEGER,
    last_sync_cursor    TEXT,                       -- ISO datetime string; used as incremental sync bookmark
    last_full_sync_at   TIMESTAMPTZ,
    last_incremental_at TIMESTAMPTZ,
    error_message       TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_sync_status_tenant_source_entity
    ON crm_sync_status (tenant_id, crm_source, entity);

CREATE INDEX IF NOT EXISTS idx_crm_sync_status_tenant_id
    ON crm_sync_status (tenant_id, crm_source);


-- ---------------------------------------------------------------------------
-- 3. crm_leads
-- Normalized leads synced from the CRM.
-- Upserted by SyncEngine via BitrixAdapter._normalize_lead().
--
-- Code refs:
--   backend/crm_adapters/bitrix_adapter.py → _normalize_lead
--   backend/sync_engine.py                 → _batch_upsert('crm_leads', ...)
--   backend/agents/anvar.py                → ALLOWED_FIELDS['crm_leads']
--   backend/agents/nilufar.py              → _check_lead_velocity, _check_source_effectiveness
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_leads (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source    TEXT        NOT NULL,
    external_id   TEXT        NOT NULL,             -- CRM-native ID (e.g. Bitrix lead ID as string)
    title         TEXT,
    status        TEXT,                             -- CRM status string (e.g. Bitrix STATUS_ID)
    source        TEXT,                             -- CRM source string (e.g. Bitrix SOURCE_ID)
    assigned_to   TEXT,                             -- CRM user ID string (Bitrix ASSIGNED_BY_ID)
    contact_name  TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    value         NUMERIC(15, 2),
    currency      TEXT        DEFAULT 'USD',
    created_at    TIMESTAMPTZ,                      -- from CRM DATE_CREATE
    modified_at   TIMESTAMPTZ,                      -- from CRM DATE_MODIFY; used as incremental sync cursor
    synced_at     TIMESTAMPTZ                       -- set by sync engine on each upsert
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_tenant_source_external
    ON crm_leads (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant_modified
    ON crm_leads (tenant_id, crm_source, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant_created
    ON crm_leads (tenant_id, crm_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to
    ON crm_leads (tenant_id, crm_source, assigned_to);


-- ---------------------------------------------------------------------------
-- 4. crm_deals
-- Normalized deals/opportunities synced from the CRM.
-- NOTE: `won` is derived from stage string prefix ("WON"), not a native CRM boolean.
--       `closed_at` maps to Bitrix CLOSEDATE (user-entered, not auto-stamped).
--
-- Code refs:
--   backend/crm_adapters/bitrix_adapter.py → _normalize_deal
--   backend/agents/anvar.py                → ALLOWED_FIELDS['crm_deals']
--   backend/agents/nilufar.py              → _check_stagnant_deals, _check_conversion_trend, _check_pipeline_health
--   backend/agents/kpi_resolver.py         → resolve_kpi (deals queries)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_deals (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source  TEXT        NOT NULL,
    external_id TEXT        NOT NULL,
    title       TEXT,
    stage       TEXT,                               -- raw CRM stage string (e.g. Bitrix STAGE_ID)
    value       NUMERIC(15, 2),                     -- deal amount (Bitrix OPPORTUNITY)
    currency    TEXT        DEFAULT 'USD',
    assigned_to TEXT,                               -- CRM user ID string (Bitrix ASSIGNED_BY_ID)
    contact_id  TEXT,                               -- FK to CRM contact (external ID string)
    company_id  TEXT,                               -- FK to CRM company (external ID string)
    won         BOOLEAN,                            -- derived: stage prefix "WON" for Bitrix; adapter-specific
    created_at  TIMESTAMPTZ,
    closed_at   TIMESTAMPTZ,                        -- Bitrix CLOSEDATE (expected/actual close, user-entered)
    modified_at TIMESTAMPTZ,
    synced_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_deals_tenant_source_external
    ON crm_deals (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant_modified
    ON crm_deals (tenant_id, crm_source, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant_created
    ON crm_deals (tenant_id, crm_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_deals_won
    ON crm_deals (tenant_id, crm_source, won);

CREATE INDEX IF NOT EXISTS idx_crm_deals_closed_at
    ON crm_deals (tenant_id, crm_source, closed_at);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage
    ON crm_deals (tenant_id, crm_source, stage);


-- ---------------------------------------------------------------------------
-- 5. crm_contacts
-- Normalized contact records synced from the CRM.
-- NOTE: `company` stores CRM COMPANY_ID as a string, not the company name.
--
-- Code refs:
--   backend/crm_adapters/bitrix_adapter.py → _normalize_contact
--   backend/agents/anvar.py                → ALLOWED_FIELDS['crm_contacts']
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_contacts (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source  TEXT        NOT NULL,
    external_id TEXT        NOT NULL,
    name        TEXT,
    phone       TEXT,
    email       TEXT,
    company     TEXT,                               -- CRM company ID string (not company name)
    created_at  TIMESTAMPTZ,
    modified_at TIMESTAMPTZ,
    synced_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_tenant_source_external
    ON crm_contacts (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_modified
    ON crm_contacts (tenant_id, crm_source, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_created
    ON crm_contacts (tenant_id, crm_source, created_at DESC);


-- ---------------------------------------------------------------------------
-- 6. crm_companies
-- Normalized company records synced from the CRM.
-- NOTE: `revenue` and `employee_count` are user-entered in Bitrix (REVENUE, EMPLOYEES).
--
-- Code refs:
--   backend/crm_adapters/bitrix_adapter.py → _normalize_company
--   backend/agents/anvar.py                → ALLOWED_FIELDS['crm_companies']
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_companies (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source     TEXT        NOT NULL,
    external_id    TEXT        NOT NULL,
    name           TEXT,
    industry       TEXT,
    employee_count INTEGER,
    revenue        NUMERIC(18, 2),
    created_at     TIMESTAMPTZ,
    modified_at    TIMESTAMPTZ,
    synced_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_companies_tenant_source_external
    ON crm_companies (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_modified
    ON crm_companies (tenant_id, crm_source, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_created
    ON crm_companies (tenant_id, crm_source, created_at DESC);


-- ---------------------------------------------------------------------------
-- 7. crm_activities
-- Normalized activity records (calls, emails, meetings, tasks) from the CRM.
--
-- KNOWN GAPS (documented, not masked):
--   - employee_name: always NULL in current BitrixAdapter._normalize_activity().
--     Bitrix provides RESPONSIBLE_ID (int); name lookup not yet implemented.
--   - modified_at: not populated by current normalize function.
--     _get_max_modified() reads this column; it will always return NULL for activities.
--     Incremental sync for activities therefore falls back to full re-fetch.
--   - No deal/lead FK: activities cannot be joined to deals via this table.
--
-- Code refs:
--   backend/crm_adapters/bitrix_adapter.py → _normalize_activity
--   backend/agents/anvar.py                → ALLOWED_FIELDS['crm_activities']
--   backend/agents/nilufar.py              → _check_activity_drop, _check_team_imbalance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_activities (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source       TEXT        NOT NULL,
    external_id      TEXT        NOT NULL,
    type             TEXT,                           -- 'call' | 'email' | 'meeting' | 'task'
    subject          TEXT,
    employee_id      TEXT,                           -- CRM user ID string (Bitrix RESPONSIBLE_ID)
    employee_name    TEXT,                           -- NULL in current ETL; reserved for future name resolution
    duration_seconds INTEGER,
    completed        BOOLEAN,
    started_at       TIMESTAMPTZ,                    -- Bitrix START_TIME, fallback to CREATED
    modified_at      TIMESTAMPTZ,                    -- not currently populated; reserved for future ETL fix
    synced_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_activities_tenant_source_external
    ON crm_activities (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant_started
    ON crm_activities (tenant_id, crm_source, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant_modified
    ON crm_activities (tenant_id, crm_source, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_activities_employee_id
    ON crm_activities (tenant_id, crm_source, employee_id);

CREATE INDEX IF NOT EXISTS idx_crm_activities_type
    ON crm_activities (tenant_id, crm_source, type);


-- ---------------------------------------------------------------------------
-- 8. dashboard_configs
-- One row per tenant. Tracks onboarding state and CRM analysis profile.
-- Upserted on conflict (tenant_id) — PK doubles as unique tenant key.
--
-- State machine: not_started → categories → refinement → complete
--
-- Code refs:
--   backend/server.py → dashboard_onboarding_start, select, refine, getConfig
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dashboard_configs (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    onboarding_state    TEXT        NOT NULL DEFAULT 'not_started',   -- not_started | categories | refinement | complete
    crm_profile         JSONB       DEFAULT '{}',     -- Farid's CRMProfile: categories[], entity stats, data_quality_score
    selected_categories JSONB       DEFAULT '[]',     -- array of category ID strings chosen by user
    refinement_answers  JSONB       DEFAULT '{}',     -- {question_id: answer_value}
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_tenant_id
    ON dashboard_configs (tenant_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboard_configs_updated_at
    BEFORE UPDATE ON dashboard_configs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- 9. dashboard_widgets
-- Widget configs per tenant. Each row = one chart or KPI card on the dashboard.
-- Soft-deleted via deleted_at (never hard deleted).
-- Source widgets (is_standard=true) created by Dima during onboarding.
-- Chat widgets (is_standard=false, source='chat') created by user via chat.
--
-- Code refs:
--   backend/server.py      → GET/POST/PUT/DELETE /api/dashboard/widgets
--   backend/agents/dima.py → _standard_widgets (onboarding path)
--   backend/agents/anvar.py → execute_chart_query (hydration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source      TEXT,                           -- populated for chat-created widgets; may be null for standard
    chart_type      TEXT        NOT NULL,           -- 'kpi' | 'metric' | 'bar' | 'line' | 'pie' | 'table'
    title           TEXT        NOT NULL,
    description     TEXT,
    data_source     TEXT        NOT NULL,           -- crm_leads | crm_deals | crm_contacts | crm_companies | crm_activities
    x_field         TEXT,                           -- must match ALLOWED_FIELDS[data_source]
    y_field         TEXT,                           -- 'count' or a NUMERIC_FIELD
    aggregation     TEXT        DEFAULT 'count',    -- 'count' | 'sum' | 'avg'
    group_by        TEXT,
    filter_field    TEXT,
    filter_value    TEXT,
    time_range_days INTEGER,
    sort_order      TEXT        DEFAULT 'desc',
    item_limit      INTEGER     DEFAULT 10,
    position        INTEGER     NOT NULL DEFAULT 0,
    size            TEXT        DEFAULT 'medium',   -- 'small' | 'medium' | 'large'
    is_standard     BOOLEAN     NOT NULL DEFAULT FALSE,
    source          TEXT,                           -- 'onboarding' | 'chat'
    deleted_at      TIMESTAMPTZ,                    -- soft delete; NULL = visible
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query pattern: load visible widgets ordered by position
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_tenant_active_position
    ON dashboard_widgets (tenant_id, deleted_at, position ASC);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_tenant_id
    ON dashboard_widgets (tenant_id);


-- ---------------------------------------------------------------------------
-- 10. dashboard_chat_messages
-- Persisted chat history per tenant. Both user and assistant turns are stored.
-- charts column holds an array of ChartResult objects from assistant turns.
--
-- Code refs:
--   backend/server.py → POST /api/dashboard/chat (insert both user + assistant)
--                       GET  /api/dashboard/chat/history
--                       DELETE /api/dashboard/chat/history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dashboard_chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    charts      JSONB       DEFAULT '[]',    -- array of ChartResult objects; null for user messages
    agent_used  TEXT,                        -- e.g. 'anvar', 'kpi_resolver', 'nilufar'; null for user messages
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- History load + clear pattern: filter by tenant, order by time
CREATE INDEX IF NOT EXISTS idx_dashboard_chat_messages_tenant_created
    ON dashboard_chat_messages (tenant_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 11. agent_traces
-- Observability log for every Data Team agent invocation.
-- Written fire-and-forget via asyncio.create_task — never blocks agent logic.
-- request_id is a per-invocation UUID generated by AgentTrace.__init__.
--
-- Code refs:
--   backend/agent_trace.py → AgentTrace._insert_trace
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_traces (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id    UUID        NOT NULL,              -- per-invocation UUID (uuid4 in AgentTrace.__init__)
    agent_name    TEXT        NOT NULL,              -- 'bobur' | 'farid' | 'dima' | 'anvar' | 'nilufar' | 'kpi_resolver'
    model         TEXT,                              -- OpenAI model ID; NULL for $0-cost agents (Anvar, KPI Resolver)
    tokens_in     INTEGER     NOT NULL DEFAULT 0,
    tokens_out    INTEGER     NOT NULL DEFAULT 0,
    cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
    duration_ms   INTEGER,
    success       BOOLEAN     NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_tenant_created
    ON agent_traces (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_traces_agent_name
    ON agent_traces (tenant_id, agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_traces_request_id
    ON agent_traces (request_id);
