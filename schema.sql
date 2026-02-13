-- TeleAgent Database Schema for Supabase PostgreSQL
-- Creates all required tables for the AI Sales Agent application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Tashkent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    email_confirmed BOOLEAN DEFAULT FALSE,
    confirmation_token VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Telegram bots table
CREATE TABLE IF NOT EXISTS telegram_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    bot_token VARCHAR(255) NOT NULL,
    bot_username VARCHAR(255),
    webhook_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_webhook_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_tenant_id ON telegram_bots(tenant_id);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    telegram_user_id VARCHAR(50),
    telegram_username VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),
    primary_language VARCHAR(10) DEFAULT 'uz',
    segments JSONB DEFAULT '[]',
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_telegram_user_id ON customers(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_telegram ON customers(tenant_id, telegram_user_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    crm_lead_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'new',
    sales_stage VARCHAR(50) DEFAULT 'awareness',
    llm_hotness_suggestion VARCHAR(20),
    final_hotness VARCHAR(20) DEFAULT 'warm',
    score INTEGER DEFAULT 50,
    close_probability FLOAT,
    source_channel VARCHAR(50) DEFAULT 'telegram',
    llm_explanation TEXT,
    intent VARCHAR(255),
    product VARCHAR(255),
    budget VARCHAR(100),
    timeline VARCHAR(100),
    additional_notes TEXT,
    fields_collected JSONB DEFAULT '{}',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_final_hotness ON leads(final_hotness);
CREATE INDEX IF NOT EXISTS idx_leads_sales_stage ON leads(sales_stage);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_customer ON leads(tenant_id, customer_id);
-- Unique constraint to prevent duplicate leads per customer (race condition fix)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_tenant_customer_unique ON leads(tenant_id, customer_id);

-- Documents table (supports both tenant-specific and global documents)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for global docs
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_type VARCHAR(50),
    file_size INTEGER,
    doc_metadata JSONB DEFAULT '{}',
    is_global BOOLEAN DEFAULT false,       -- true = available to all agents
    global_order INTEGER DEFAULT 0,         -- ordering for global docs
    category VARCHAR(50) DEFAULT 'knowledge', -- 'knowledge' or 'policy'
    chunks_data JSONB,                      -- chunked content with embeddings
    chunk_count INTEGER DEFAULT 0,          -- number of chunks
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_global ON documents(is_global) WHERE is_global = true;

-- Agent document overrides (tracks disabled global docs per agent)
CREATE TABLE IF NOT EXISTS agent_document_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,  -- false = disabled for this agent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_doc_overrides_tenant ON agent_document_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_doc_overrides_document ON agent_document_overrides(document_id);

-- Tenant configs table
CREATE TABLE IF NOT EXISTS tenant_configs (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE PRIMARY KEY,
    vertical VARCHAR(50) DEFAULT 'default',
    business_name VARCHAR(255),
    business_description TEXT,
    products_services TEXT,
    faq_objections TEXT,
    collect_phone BOOLEAN DEFAULT TRUE,
    lead_fields_json JSONB DEFAULT '{}',
    qualification_rules_json JSONB DEFAULT '{}',
    greeting_message TEXT,
    agent_tone VARCHAR(50) DEFAULT 'professional',
    primary_language VARCHAR(10) DEFAULT 'uz',
    -- Advanced customization columns
    emoji_usage VARCHAR(20) DEFAULT 'moderate',
    response_length VARCHAR(20) DEFAULT 'medium',
    secondary_languages JSONB DEFAULT '[]',
    closing_message TEXT,
    min_response_delay INTEGER DEFAULT 0,
    max_messages_per_minute INTEGER DEFAULT 20,
    -- Bitrix24 CRM integration columns
    bitrix_webhook_url VARCHAR(500),
    bitrix_connected_at TIMESTAMPTZ,
    -- Prebuilt agent type (e.g., 'sales' for Jasur)
    prebuilt_type VARCHAR(50)
);

-- Event logs table
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_tenant_id ON event_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);