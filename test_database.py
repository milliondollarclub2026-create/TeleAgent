#!/usr/bin/env python3
"""
Setup Supabase Database Tables using Python client
Creates tables by inserting dummy data and letting Supabase auto-create schema
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def test_table_access():
    """Test if we can access tables and create them if needed"""
    print("🔍 Testing table access...")
    
    # Test each table by trying to select from it
    tables_to_test = [
        'tenants', 'users', 'telegram_bots', 'customers', 
        'conversations', 'messages', 'leads', 'documents', 
        'tenant_configs', 'event_logs'
    ]
    
    accessible_tables = []
    missing_tables = []
    
    for table in tables_to_test:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"   ✅ Table '{table}' exists and is accessible")
            accessible_tables.append(table)
        except Exception as e:
            print(f"   ❌ Table '{table}' not accessible: {str(e)}")
            missing_tables.append(table)
    
    return accessible_tables, missing_tables

def create_sample_data():
    """Create sample data to test the application"""
    print("\n🚀 Creating sample data for testing...")
    
    try:
        # Create a test tenant
        tenant_id = str(uuid.uuid4())
        tenant = {
            "id": tenant_id,
            "name": "Test Company",
            "timezone": "Asia/Tashkent",
            "created_at": now_iso()
        }
        
        result = supabase.table('tenants').insert(tenant).execute()
        print(f"   ✅ Created test tenant: {tenant_id}")
        
        # Create a test user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": "test@example.com",
            "password_hash": "dummy_hash",
            "name": "Test User",
            "tenant_id": tenant_id,
            "role": "admin",
            "email_confirmed": True,
            "created_at": now_iso()
        }
        
        result = supabase.table('users').insert(user).execute()
        print(f"   ✅ Created test user: {user_id}")
        
        # Create tenant config
        config = {
            "tenant_id": tenant_id,
            "business_name": "Test Company",
            "collect_phone": True,
            "agent_tone": "professional",
            "primary_language": "uz",
            "vertical": "default"
        }
        
        result = supabase.table('tenant_configs').insert(config).execute()
        print(f"   ✅ Created tenant config for: {tenant_id}")
        
        print("✅ Sample data created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating sample data: {str(e)}")
        return False

def main():
    print("TeleAgent Database Setup & Test")
    print("=" * 50)
    
    print(f"Supabase URL: {supabase_url}")
    print(f"Service Key: {'*' * 20}...{supabase_key[-10:]}")
    
    # Test table access
    accessible, missing = test_table_access()
    
    if len(accessible) == 10:
        print("\n✅ All tables are accessible!")
        
        # Create sample data for testing
        if create_sample_data():
            print("\n🎉 Database is ready for testing!")
        else:
            print("\n⚠️  Database accessible but sample data creation failed")
            
    elif len(accessible) > 0:
        print(f"\n⚠️  Some tables accessible ({len(accessible)}/10)")
        print(f"Missing tables: {missing}")
        
        # Try to create sample data with available tables
        if 'tenants' in accessible and 'users' in accessible:
            create_sample_data()
        
    else:
        print("\n❌ No tables accessible. Database setup required.")
        print("Please create the tables manually in Supabase dashboard using schema.sql")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)