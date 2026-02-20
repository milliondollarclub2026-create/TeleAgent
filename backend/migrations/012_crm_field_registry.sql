-- Migration 012: Create crm_field_registry + fix RLS gaps
-- Phase 1: Schema Discovery Engine

-- ── crm_field_registry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_field_registry (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source      TEXT NOT NULL,
    entity          TEXT NOT NULL,
    field_name      TEXT NOT NULL,
    field_type      TEXT NOT NULL,
    sample_values   JSONB DEFAULT '[]',
    null_rate       NUMERIC(5,4),
    distinct_count  INTEGER,
    discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_field_registry_tenant_entity_field
    ON crm_field_registry (tenant_id, crm_source, entity, field_name);
CREATE INDEX IF NOT EXISTS idx_field_registry_tenant
    ON crm_field_registry (tenant_id, crm_source);

ALTER TABLE crm_field_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_field_registry" ON crm_field_registry
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);

-- ── Fix Phase 0 RLS gaps ────────────────────────────────────────────────────
ALTER TABLE revenue_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_revenue_models" ON revenue_models
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);

ALTER TABLE revenue_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_revenue_snapshots" ON revenue_snapshots
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);

ALTER TABLE revenue_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_revenue_alerts" ON revenue_alerts
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);
