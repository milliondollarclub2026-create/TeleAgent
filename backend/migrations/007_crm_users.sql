-- =============================================================================
-- Migration 007: CRM User Directory Table
-- =============================================================================
-- Stores the resolved user/rep directory fetched from CRM user.get API.
-- Used by BitrixAdapter.prepare_user_cache() to populate employee_name on
-- crm_activities rows, enabling rep-level analytics without repeated API calls.
--
-- Apply after: 006_crm_dashboard_core.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_users (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source  TEXT        NOT NULL,           -- 'bitrix24' | 'hubspot' etc.
    external_id TEXT        NOT NULL,           -- CRM user ID (Bitrix: user.ID as string)
    name        TEXT        NOT NULL,           -- "First Last" display name
    email       TEXT,                           -- user email (optional, for reference)
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_users_tenant_source_external
    ON crm_users (tenant_id, crm_source, external_id);

CREATE INDEX IF NOT EXISTS idx_crm_users_tenant_source
    ON crm_users (tenant_id, crm_source);

-- Verification query:
-- SELECT COUNT(*) FROM crm_users;  -- 0 until first full sync runs
