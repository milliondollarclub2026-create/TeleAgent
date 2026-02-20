-- =============================================================================
-- Migration 010: Revenue Snapshots & Alerts
-- =============================================================================
-- revenue_snapshots: One row per (tenant, crm_source, timeframe).
--   Upserted on each /revenue/recompute call.  Holds the full metric
--   results (snapshot_json) plus an overall trust_score for the UI to
--   show a data-quality badge.
--
-- revenue_alerts: One row per alert instance.  status = 'open' | 'dismissed'.
--   Before each recompute the engine deletes all OPEN alerts for the tenant
--   and inserts a fresh set.  Dismissed alerts are kept permanently for audit.
--
-- Apply after: 009_revenue_models.sql
-- Idempotent — safe to re-run.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- revenue_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revenue_snapshots (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source      TEXT        NOT NULL,
    timeframe       TEXT        NOT NULL DEFAULT '30d',
    -- '7d' | '30d' | '90d' | '365d'  — matches the MetricQuery time_range_days presets
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Full metric results keyed by metric_key.
    -- Shape: { pipeline_value: {available, value, data, evidence}, ... }
    snapshot_json   JSONB       NOT NULL DEFAULT '{}',
    trust_score     FLOAT       NOT NULL DEFAULT 0.0,  -- mean data_trust_score across metrics
    alert_count     INTEGER     NOT NULL DEFAULT 0     -- open alerts at time of compute
);

-- One snapshot per (tenant, source, timeframe) — upserted each run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_snapshots_tenant_source_timeframe
    ON revenue_snapshots (tenant_id, crm_source, timeframe);

CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_tenant_computed
    ON revenue_snapshots (tenant_id, computed_at DESC);


-- ---------------------------------------------------------------------------
-- revenue_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revenue_alerts (
    id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source               TEXT        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Alert classification
    alert_type               TEXT        NOT NULL,
    -- 'pipeline_stall' | 'conversion_drop' | 'rep_slip' | 'forecast_risk' | 'concentration_risk'

    severity                 TEXT        NOT NULL,
    -- 'critical' | 'warning' | 'info'

    status                   TEXT        NOT NULL DEFAULT 'open',
    -- 'open' | 'dismissed'

    -- Human-readable one-liner (displayed in InsightsPanel)
    summary                  TEXT        NOT NULL,

    -- Machine-readable evidence:
    -- {
    --   metric_ids: ["pipeline_stall_risk"],
    --   record_counts: {total_open: 45, stalled: 8, PROPOSAL: 5},
    --   baseline_period: "p75 of all open deals (32 days)",
    --   implicated: {stages: ["PROPOSAL"], worst_stage: "PROPOSAL"},
    --   confidence: 0.82,
    --   timeframe: "All open deals"
    -- }
    evidence_json            JSONB       NOT NULL DEFAULT '{}',

    -- Ordered list of suggested actions (displayed under the alert)
    recommended_actions_json JSONB       NOT NULL DEFAULT '[]',

    -- Populated when status is set to 'dismissed'
    dismissed_at             TIMESTAMPTZ
);

-- Fast lookup of open/recent alerts per tenant
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_tenant_open
    ON revenue_alerts (tenant_id, crm_source, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_alerts_tenant_type
    ON revenue_alerts (tenant_id, crm_source, alert_type);

-- Check constraints to keep values canonical
ALTER TABLE revenue_alerts
    ADD CONSTRAINT IF NOT EXISTS chk_revenue_alerts_severity
    CHECK (severity IN ('critical', 'warning', 'info'));

ALTER TABLE revenue_alerts
    ADD CONSTRAINT IF NOT EXISTS chk_revenue_alerts_status
    CHECK (status IN ('open', 'dismissed'));


-- =============================================================================
-- Verification queries — run after applying:
-- =============================================================================
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('revenue_snapshots', 'revenue_alerts')
--   ORDER BY table_name;
--   -- Expected: 2 rows
--
--   SELECT COUNT(*) FROM revenue_snapshots WHERE status IS NOT NULL;
--   -- Expected: 0 (table has no status column — confirm column list is correct)
--
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'revenue_alerts'
--   ORDER BY ordinal_position;
-- =============================================================================
