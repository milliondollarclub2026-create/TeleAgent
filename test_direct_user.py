#!/usr/bin/env python3
"""
Test Supabase connection and create test user directly
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from datetime import datetime, timezone
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{password_hash}"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def create_test_user():
    """Create a test user directly in the database"""
    print("🚀 Creating test user directly...")
    
    try:
        # First create a tenant
        tenant_id = str(uuid.uuid4())
        tenant = {
            "id": tenant_id,
            "name": "Test Business LLC",
            "timezone": "Asia/Tashkent",
            "created_at": now_iso()
        }
        
        print("   Creating tenant...")
        result = supabase.table('tenants').insert(tenant).execute()
        print(f"   ✅ Tenant created: {tenant_id}")
        
        # Create user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": "test@teleagent.com",
            "password_hash": hash_password("TestPass123!"),
            "name": "Test User",
            "tenant_id": tenant_id,
            "role": "admin",
            "email_confirmed": True,
            "created_at": now_iso()
        }
        
        print("   Creating user...")
        result = supabase.table('users').insert(user).execute()
        print(f"   ✅ User created: {user_id}")
        
        # Create tenant config
        config = {
            "tenant_id": tenant_id,
            "business_name": "Test Business LLC",
            "collect_phone": True,
            "agent_tone": "professional",
            "primary_language": "uz",
            "vertical": "default"
        }
        
        print("   Creating tenant config...")
        result = supabase.table('tenant_configs').insert(config).execute()
        print(f"   ✅ Config created for tenant: {tenant_id}")
        
        return True, {"email": "test@teleagent.com", "password": "TestPass123!"}
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, None

def test_login(email, password):
    """Test login with the created user"""
    print(f"\n🔍 Testing login with {email}...")
    
    import requests
    
    try:
        response = requests.post(
            "https://teleagent.preview.emergentagent.com/api/auth/login",
            json={"email": email, "password": password},
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Login successful!")
            print(f"   Token: {data.get('token', 'N/A')[:50]}...")
            return True, data.get('token')
        else:
            print(f"   ❌ Login failed: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"   ❌ Login error: {str(e)}")
        return False, None

def main():
    print("TeleAgent Direct User Creation Test")
    print("=" * 50)
    
    # Try to create test user
    success, credentials = create_test_user()
    
    if success and credentials:
        # Test login
        login_success, token = test_login(credentials["email"], credentials["password"])
        
        if login_success:
            print("\n🎉 Database and authentication working!")
            return True
        else:
            print("\n⚠️  User created but login failed")
            return False
    else:
        print("\n❌ Failed to create test user")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)