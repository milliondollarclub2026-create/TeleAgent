-- Migration: Telegram Business Connections
-- Adds telegram_business_connections table for Telegram Premium Business integration
-- Allows a single shared @LeadRelayBot to serve multiple business accounts

-- New table: telegram_business_connections
CREATE TABLE IF NOT EXISTS telegram_business_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL until linked via code
    connection_id TEXT UNIQUE NOT NULL,                        -- From Telegram (business_connection.id)
    telegram_user_id BIGINT NOT NULL,                         -- Business owner's Telegram user ID
    telegram_username TEXT,                                     -- Business owner's Telegram username
    telegram_first_name TEXT,                                   -- Business owner's first name
    can_reply BOOLEAN DEFAULT TRUE,                            -- Whether bot can send messages
    is_enabled BOOLEAN DEFAULT TRUE,                           -- Whether connection is active
    is_linked BOOLEAN DEFAULT FALSE,                           -- Whether tenant_id is confirmed via link code
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,                               -- When connection was disabled (null if active)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast webhook routing (most critical query)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tg_biz_conn_connection_id
    ON telegram_business_connections(connection_id);

-- Index for tenant lookups (settings page, admin queries)
CREATE INDEX IF NOT EXISTS idx_tg_biz_conn_tenant_id
    ON telegram_business_connections(tenant_id);

-- Index for preventing duplicate active connections per Telegram user
CREATE UNIQUE INDEX IF NOT EXISTS idx_tg_biz_conn_telegram_user
    ON telegram_business_connections(telegram_user_id)
    WHERE is_enabled = TRUE;

-- Row Level Security (matches existing codebase pattern from instagram_accounts, tenant_alert_rules)
ALTER TABLE telegram_business_connections ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (frontend/authenticated queries use JWT tenant_id)
CREATE POLICY "tenant_isolation_business_connections" ON telegram_business_connections
    FOR ALL USING (
        tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid
        OR tenant_id IS NULL  -- Allow unlinked connections to be visible during linking
    );

-- Service role bypass for webhook handler (backend uses service_role key, bypasses RLS)
-- Supabase service_role automatically bypasses RLS, but explicit policy for clarity
