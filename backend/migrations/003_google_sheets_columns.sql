-- Add Google Sheets columns to tenant_configs
-- These columns persist the Google Sheets connection across server restarts

ALTER TABLE tenant_configs
ADD COLUMN IF NOT EXISTS google_sheet_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS google_sheet_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS google_sheet_connected_at TIMESTAMPTZ;
