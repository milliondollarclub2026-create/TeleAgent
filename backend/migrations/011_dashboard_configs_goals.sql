-- Migration 011: Add selected_goals + revenue_model_confirmed to dashboard_configs
-- Purpose: Replace legacy selected_categories (old Farid category IDs) with
--          goal-based tracking from the Metric Catalog. Keep selected_categories
--          for backward compatibility with existing tenants.

ALTER TABLE dashboard_configs
    ADD COLUMN IF NOT EXISTS selected_goals          JSONB        DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS revenue_model_confirmed TIMESTAMPTZ;

-- Backfill comment only — actual data migration is done at read-time in server.py
-- (selected_categories values are mapped to goal IDs on first GET /dashboard/config)

COMMENT ON COLUMN dashboard_configs.selected_goals IS
    'Goal IDs chosen during Revenue Analyst onboarding (e.g. ["pipeline_health","forecast_accuracy"]). '
    'Replaces the legacy selected_categories field that stored Farid category IDs.';

COMMENT ON COLUMN dashboard_configs.revenue_model_confirmed IS
    'Timestamp when the tenant explicitly confirmed their won/lost stage mapping. '
    'NULL means the default proposal values were accepted without user confirmation.';

COMMENT ON COLUMN dashboard_configs.selected_categories IS
    'DEPRECATED — legacy Farid category IDs (lead_pipeline, deal_analytics, …). '
    'Kept for backward compatibility; auto-migrated to selected_goals on first config read.';
