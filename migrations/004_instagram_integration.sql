-- Migration: Instagram DM Integration
-- Adds instagram_accounts table and Instagram columns to customers/conversations

-- New table: instagram_accounts (mirrors telegram_bots pattern)
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    instagram_page_id VARCHAR(100) NOT NULL,
    instagram_user_id VARCHAR(100),
    instagram_username VARCHAR(255),
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    token_refreshed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    last_webhook_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_tenant ON instagram_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_page_id ON instagram_accounts(instagram_page_id);

-- Enable RLS on instagram_accounts
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

-- Add Instagram columns to customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_ig ON customers(tenant_id, instagram_user_id);

-- Add source_channel to conversations (default 'telegram' for backward compat)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS source_channel VARCHAR(50) DEFAULT 'telegram';
