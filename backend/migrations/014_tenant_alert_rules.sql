-- Migration 014: tenant_alert_rules — configurable alert rules per tenant
-- Phase 2: Dynamic Metrics, Alerts & Recommendations

CREATE TABLE IF NOT EXISTS tenant_alert_rules (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source      TEXT NOT NULL,
    pattern         TEXT NOT NULL,
    metric_key      TEXT,
    entity          TEXT,
    config          JSONB NOT NULL,
    severity_rules  JSONB,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_alert_rules_tenant
    ON tenant_alert_rules (tenant_id, crm_source, active);

ALTER TABLE tenant_alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_alert_rules" ON tenant_alert_rules
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);
