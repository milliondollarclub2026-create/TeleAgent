-- =============================================================================
-- Migration 009: Revenue Models
-- =============================================================================
-- Stores a tenant's authoritative definition of what "won" and "lost" mean
-- for their CRM pipeline.  The model must be explicitly confirmed by the user
-- (confirmed_at IS NOT NULL) before the system will compute revenue metrics.
--
-- Hard rule enforced in application layer:
--   - Never silently assume won/lost.
--   - won_stage_values ∩ lost_stage_values must be empty.
--   - Queries that need won/lost MUST check confirmed_at IS NOT NULL.
--
-- Apply after: 008_fix_sync_status_values.sql
-- This migration is idempotent — safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS revenue_models (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_source          TEXT        NOT NULL,   -- 'bitrix24' | 'hubspot' | 'zoho' | 'freshsales'

    -- ---- Field name mappings (defaults match normalized crm_deals column names) ----
    deal_stage_field    TEXT        NOT NULL DEFAULT 'stage',
    amount_field        TEXT        NOT NULL DEFAULT 'value',
    close_date_field    TEXT        NOT NULL DEFAULT 'closed_at',
    created_date_field  TEXT        NOT NULL DEFAULT 'created_at',
    owner_field         TEXT        NOT NULL DEFAULT 'assigned_to',
    currency_field      TEXT        NOT NULL DEFAULT 'currency',

    -- ---- Stage semantics ----
    -- Array of crm_deals.stage values that indicate a deal was WON.
    -- E.g., ["WON", "C2:WON", "SUCCESS"]
    won_stage_values    TEXT[]      NOT NULL DEFAULT '{}',

    -- Array of crm_deals.stage values that indicate a deal was LOST.
    -- E.g., ["LOST", "C2:LOSE", "REJECTED"]
    lost_stage_values   TEXT[]      NOT NULL DEFAULT '{}',

    -- Ordered array of all known stages (earliest → latest in pipeline).
    -- Determines how conversion funnel and stage velocity are computed.
    -- E.g., ["NEW", "PREPARATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]
    stage_order         TEXT[]      NOT NULL DEFAULT '{}',

    -- ---- Confidence + rationale (set by model_builder, read by UI) ----
    -- JSON object: { "won_classification": 0.95, "lost_classification": 0.80,
    --               "stage_order": 0.6, "overall": 0.80 }
    confidence_json     JSONB       NOT NULL DEFAULT '{}',

    -- JSON object: { "won_classification": "Pattern 'WON' matched 3 stages with 100% score",
    --               "stage_order": "Ordered by pipeline hint vocabulary" }
    rationale_json      JSONB       NOT NULL DEFAULT '{}',

    -- ---- Confirmation gate ----
    -- NULL = model proposed but NOT confirmed by user.
    -- NOT NULL = user explicitly confirmed or edited the model.
    -- Revenue queries MUST NOT run when confirmed_at IS NULL.
    confirmed_at        TIMESTAMPTZ,

    -- ---- Timestamps ----
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One model per (tenant, CRM source). If the user reconnects the same CRM,
-- the existing model is updated rather than duplicated.
CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_models_tenant_source
    ON revenue_models (tenant_id, crm_source);

CREATE INDEX IF NOT EXISTS idx_revenue_models_tenant_id
    ON revenue_models (tenant_id);

-- Automatically bump updated_at on every row change.
-- Reuse set_updated_at() if it already exists from migration 006.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'set_updated_at'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$;
    END IF;
END;
$$;

CREATE OR REPLACE TRIGGER trg_revenue_models_updated_at
    BEFORE UPDATE ON revenue_models
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Verification queries — run after applying:
-- =============================================================================
--
-- Confirm table exists with expected columns:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'revenue_models'
--   ORDER BY ordinal_position;
--
-- Confirm unique index:
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'revenue_models';
--
-- Confirm no revenue queries can run without confirmation (example check):
--   SELECT COUNT(*) FROM revenue_models WHERE confirmed_at IS NOT NULL;
--   -- Expected: 0 on a fresh install (no models confirmed yet)
-- =============================================================================
