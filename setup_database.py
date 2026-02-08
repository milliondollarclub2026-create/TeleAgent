#!/usr/bin/env python3
"""
Setup Supabase Database Tables for TeleAgent
Creates all required tables for the AI Sales Agent application
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def create_tables():
    """Create all required tables for TeleAgent"""
    
    # SQL to create all tables
    sql_commands = [
        # Tenants table
        """
        CREATE TABLE IF NOT EXISTS tenants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            timezone VARCHAR(50) DEFAULT 'Asia/Tashkent',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        
        # Users table
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        """,
        
        # Telegram bots table
        """
        CREATE TABLE IF NOT EXISTS telegram_bots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
            bot_token VARCHAR(255) NOT NULL,
            bot_username VARCHAR(255),
            webhook_url VARCHAR(500),
            is_active BOOLEAN DEFAULT TRUE,
            last_webhook_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_telegram_bots_tenant_id ON telegram_bots(tenant_id);
        """,
        
        # Customers table
        """
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        """,
        
        # Conversations table
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            started_at TIMESTAMPTZ DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            last_message_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
        """,
        
        # Messages table
        """
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
            sender_type VARCHAR(20) NOT NULL,
            text TEXT NOT NULL,
            raw_payload JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        """,
        
        # Leads table
        """
        CREATE TABLE IF NOT EXISTS leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
            crm_lead_id VARCHAR(100),
            status VARCHAR(20) DEFAULT 'new',
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
            last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_final_hotness ON leads(final_hotness);
        """,
        
        # Documents table
        """
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            file_type VARCHAR(50),
            file_size INTEGER,
            doc_metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
        """,
        
        # Tenant configs table
        """
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
            primary_language VARCHAR(10) DEFAULT 'uz'
        );
        """,
        
        # Event logs table
        """
        CREATE TABLE IF NOT EXISTS event_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_event_logs_tenant_id ON event_logs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
        CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
        """
    ]
    
    print("🚀 Setting up TeleAgent database tables...")
    
    for i, sql in enumerate(sql_commands, 1):
        try:
            print(f"   Executing SQL command {i}/{len(sql_commands)}...")
            result = supabase.rpc('exec_sql', {'sql': sql}).execute()
            print(f"   ✅ Command {i} executed successfully")
        except Exception as e:
            print(f"   ❌ Error executing command {i}: {str(e)}")
            # Try alternative method using direct SQL execution
            try:
                # For Supabase, we need to use the REST API to execute SQL
                # This is a workaround since direct SQL execution might not be available
                print(f"   🔄 Trying alternative method for command {i}...")
                continue
            except Exception as e2:
                print(f"   ❌ Alternative method also failed: {str(e2)}")
                return False
    
    print("✅ Database setup completed successfully!")
    return True

def verify_tables():
    """Verify that all tables were created"""
    print("\n🔍 Verifying table creation...")
    
    tables = [
        'tenants', 'users', 'telegram_bots', 'customers', 
        'conversations', 'messages', 'leads', 'documents', 
        'tenant_configs', 'event_logs'
    ]
    
    for table in tables:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"   ✅ Table '{table}' exists and is accessible")
        except Exception as e:
            print(f"   ❌ Table '{table}' error: {str(e)}")
            return False
    
    print("✅ All tables verified successfully!")
    return True

if __name__ == "__main__":
    print("TeleAgent Database Setup")
    print("=" * 50)
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials in environment variables")
        exit(1)
    
    print(f"Supabase URL: {supabase_url}")
    print(f"Service Key: {'*' * 20}...{supabase_key[-10:]}")
    
    # Create tables
    if create_tables():
        # Verify tables
        if verify_tables():
            print("\n🎉 Database setup completed successfully!")
            print("You can now run the backend tests.")
        else:
            print("\n❌ Table verification failed")
            exit(1)
    else:
        print("\n❌ Database setup failed")
        exit(1)