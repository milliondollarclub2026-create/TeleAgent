-- Prevent duplicate active Instagram accounts per tenant.
-- Only one row with is_active=TRUE can exist per tenant_id.
CREATE UNIQUE INDEX idx_ig_accounts_tenant_active
ON instagram_accounts (tenant_id)
WHERE is_active = TRUE;
