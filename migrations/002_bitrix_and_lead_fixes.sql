-- Migration: Add Bitrix24 columns and Lead unique constraint
-- Run this in Supabase SQL Editor

-- 1. Add Bitrix24 CRM integration columns to tenant_configs
ALTER TABLE tenant_configs
ADD COLUMN IF NOT EXISTS bitrix_webhook_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS bitrix_connected_at TIMESTAMPTZ;

-- 2. Add unique constraint on leads(tenant_id, customer_id)
-- This prevents duplicate leads from race conditions when customers send rapid messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_tenant_customer_unique ON leads(tenant_id, customer_id);

-- 3. Comment explaining the constraint
COMMENT ON INDEX idx_leads_tenant_customer_unique IS 'Prevents duplicate leads per customer due to race conditions in concurrent message processing';
