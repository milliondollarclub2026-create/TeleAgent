-- Migration 013: tenant_metrics — dynamically generated metric definitions per tenant
-- Phase 2: Dynamic Metrics, Alerts & Recommendations

CREATE TABLE IF NOT EXISTS tenant_metrics (
    id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source        TEXT NOT NULL,
    metric_key        TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    category          TEXT,
    source_table      TEXT NOT NULL,
    computation       JSONB NOT NULL,
    required_fields   JSONB NOT NULL DEFAULT '[]',
    allowed_dimensions JSONB DEFAULT '[]',
    display_format    TEXT DEFAULT 'number',
    is_core           BOOLEAN DEFAULT FALSE,
    is_kpi            BOOLEAN DEFAULT FALSE,
    confidence        NUMERIC(3,2),
    generated_by      TEXT DEFAULT 'ai',
    active            BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_metrics_key
    ON tenant_metrics (tenant_id, crm_source, metric_key);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_tenant
    ON tenant_metrics (tenant_id, crm_source, active);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_kpi
    ON tenant_metrics (tenant_id, crm_source, is_kpi, active);

ALTER TABLE tenant_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_metrics" ON tenant_metrics
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid);
