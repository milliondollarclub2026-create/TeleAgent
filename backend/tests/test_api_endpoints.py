"""
Backend API Tests for TeleAgent - AI Sales Agent for Telegram + Bitrix24
Tests all 15+ API endpoints with authentication and data validation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test2@teleagent.uz"
TEST_PASSWORD = "testpass123"

class TestHealthEndpoints:
    """Health check and root endpoint tests"""
    
    def test_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["database"] == "supabase"
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test /api/ root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"] == "2.0"
        assert "sales_pipeline" in data["features"]
        print(f"✓ Root endpoint passed: {data}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert "tenant_id" in data["user"]
        print(f"✓ Login success: user={data['user']['email']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid login rejected: {data['detail']}")
    
    def test_auth_me_with_token(self):
        """Test /api/auth/me with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert "tenant_id" in data
        print(f"✓ Auth me passed: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth me without token rejected correctly")
    
    def test_register_duplicate_email(self):
        """Test /api/auth/register with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": "newpassword123",
            "name": "Test User",
            "business_name": "Test Business"
        })
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()
        print(f"✓ Duplicate registration rejected: {data['detail']}")


@pytest.fixture
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardEndpoints:
    """Dashboard endpoint tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test /api/dashboard/stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "total_conversations" in data
        assert "total_leads" in data
        assert "hot_leads" in data
        assert "warm_leads" in data
        assert "cold_leads" in data
        assert "conversion_rate" in data
        assert "leads_by_stage" in data
        
        # Validate data types
        assert isinstance(data["total_leads"], int)
        assert isinstance(data["conversion_rate"], (int, float))
        assert isinstance(data["leads_by_stage"], dict)
        
        print(f"✓ Dashboard stats: {data['total_leads']} leads, {data['hot_leads']} hot")
    
    def test_leads_per_day(self, auth_headers):
        """Test /api/dashboard/leads-per-day endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/leads-per-day?days=7", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return list of 7 days
        assert isinstance(data, list)
        assert len(data) == 7
        
        # Validate each day's structure
        for day in data:
            assert "date" in day
            assert "count" in day
            assert "hot" in day
            assert "warm" in day
            assert "cold" in day
        
        print(f"✓ Leads per day: {len(data)} days of data")


class TestLeadsEndpoints:
    """Leads endpoint tests"""
    
    def test_get_leads(self, auth_headers):
        """Test /api/leads endpoint"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # If there are leads, validate structure
        if len(data) > 0:
            lead = data[0]
            assert "id" in lead
            assert "status" in lead
            assert "sales_stage" in lead
            assert "final_hotness" in lead
            assert "score" in lead
            print(f"✓ Leads list: {len(data)} leads found")
        else:
            print("✓ Leads list: empty (no leads yet)")
    
    def test_get_leads_with_filter(self, auth_headers):
        """Test /api/leads with hotness filter"""
        response = requests.get(f"{BASE_URL}/api/leads?hotness=hot", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leads filter: {len(data)} hot leads")


class TestConfigEndpoints:
    """Configuration endpoint tests"""
    
    def test_get_config(self, auth_headers):
        """Test /api/config GET endpoint"""
        response = requests.get(f"{BASE_URL}/api/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Validate config structure
        assert "objection_playbook" in data
        assert "closing_scripts" in data
        assert "required_fields" in data
        assert isinstance(data["objection_playbook"], list)
        assert isinstance(data["closing_scripts"], dict)
        
        print(f"✓ Config GET: {len(data['objection_playbook'])} objection handlers")
    
    def test_update_config(self, auth_headers):
        """Test /api/config PUT endpoint"""
        response = requests.put(f"{BASE_URL}/api/config", headers=auth_headers, json={
            "agent_tone": "friendly"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Config PUT: update successful")
    
    def test_get_config_defaults(self):
        """Test /api/config/defaults endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/config/defaults")
        assert response.status_code == 200
        data = response.json()
        
        # Validate defaults structure
        assert "objection_playbook" in data
        assert "closing_scripts" in data
        assert "required_fields" in data
        assert "sales_stages" in data
        
        # Validate sales stages
        stages = data["sales_stages"]
        assert "awareness" in stages
        assert "purchase" in stages
        assert stages["awareness"]["order"] == 1
        assert stages["purchase"]["order"] == 6
        
        print(f"✓ Config defaults: {len(stages)} sales stages")


class TestDocumentsEndpoints:
    """Documents CRUD endpoint tests"""
    
    def test_documents_crud(self, auth_headers):
        """Test documents create, get, delete flow"""
        # Create document
        doc_title = f"TEST_Doc_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/documents", headers=auth_headers, json={
            "title": doc_title,
            "content": "This is test content for the knowledge base."
        })
        assert create_response.status_code == 200
        created_doc = create_response.json()
        assert "id" in created_doc
        assert created_doc["title"] == doc_title
        doc_id = created_doc["id"]
        print(f"✓ Document created: {doc_id}")
        
        # Get documents list
        list_response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert list_response.status_code == 200
        docs = list_response.json()
        assert isinstance(docs, list)
        assert any(d["id"] == doc_id for d in docs)
        print(f"✓ Documents list: {len(docs)} documents")
        
        # Delete document
        delete_response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        print(f"✓ Document deleted: {doc_id}")
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        verify_docs = verify_response.json()
        assert not any(d["id"] == doc_id for d in verify_docs)
        print("✓ Document deletion verified")


class TestTelegramEndpoints:
    """Telegram bot endpoint tests"""
    
    def test_get_telegram_bot(self, auth_headers):
        """Test /api/telegram/bot GET endpoint"""
        response = requests.get(f"{BASE_URL}/api/telegram/bot", headers=auth_headers)
        assert response.status_code == 200
        # Response can be null or bot object
        data = response.json()
        if data:
            assert "bot_username" in data or data is None
        print(f"✓ Telegram bot GET: {'connected' if data else 'not connected'}")


class TestIntegrationsEndpoints:
    """Integrations status endpoint tests"""
    
    def test_integrations_status(self, auth_headers):
        """Test /api/integrations/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/integrations/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "telegram" in data
        assert "bitrix" in data
        assert "google_sheets" in data
        
        # Validate telegram structure
        assert "connected" in data["telegram"]
        
        # Validate bitrix structure (demo mode)
        assert "connected" in data["bitrix"]
        assert data["bitrix"]["is_demo"] == True
        
        print(f"✓ Integrations status: telegram={data['telegram']['connected']}, bitrix=demo")
    
    def test_bitrix_status(self, auth_headers):
        """Test /api/bitrix/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/bitrix/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "connected" in data
        assert "is_demo" in data
        assert data["is_demo"] == True
        
        print(f"✓ Bitrix status: demo mode")


class TestTelegramWebhook:
    """Telegram webhook endpoint tests"""
    
    def test_webhook_endpoint_exists(self):
        """Test /api/telegram/webhook endpoint accepts POST"""
        # Send empty update - should return ok
        response = requests.post(f"{BASE_URL}/api/telegram/webhook", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        print("✓ Telegram webhook endpoint accessible")


class TestAgentsEndpoints:
    """Agents endpoint tests - New agent management flow"""
    
    def test_get_agents(self, auth_headers):
        """Test /api/agents GET endpoint"""
        response = requests.get(f"{BASE_URL}/api/agents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # If there are agents, validate structure
        if len(data) > 0:
            agent = data[0]
            assert "id" in agent
            assert "name" in agent
            assert "status" in agent
            assert "leads_count" in agent
            assert "conversations_count" in agent
            print(f"✓ Agents list: {len(data)} agents found, first: {agent['name']}")
        else:
            print("✓ Agents list: empty (no agents yet)")


class TestChatTestEndpoint:
    """Test chat endpoint for browser testing"""
    
    def test_chat_test_endpoint(self, auth_headers):
        """Test /api/chat/test POST endpoint"""
        response = requests.post(f"{BASE_URL}/api/chat/test", headers=auth_headers, json={
            "message": "What products do you offer?",
            "conversation_history": []
        })
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "reply" in data
        assert "sales_stage" in data
        assert "hotness" in data
        assert "score" in data
        
        # Validate data types
        assert isinstance(data["reply"], str)
        assert data["sales_stage"] in ["awareness", "interest", "consideration", "intent", "evaluation", "purchase"]
        assert data["hotness"] in ["hot", "warm", "cold"]
        assert isinstance(data["score"], int)
        
        print(f"✓ Chat test: reply received, stage={data['sales_stage']}, hotness={data['hotness']}")
    
    def test_chat_test_with_history(self, auth_headers):
        """Test /api/chat/test with conversation history"""
        response = requests.post(f"{BASE_URL}/api/chat/test", headers=auth_headers, json={
            "message": "I'm interested in the AI Chatbot",
            "conversation_history": [
                {"role": "agent", "text": "Hello! Welcome to our store. How can I help you?"},
                {"role": "user", "text": "What products do you offer?"},
                {"role": "agent", "text": "We offer AI Chatbots and CRM Integration services."}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "reply" in data
        assert "fields_collected" in data
        
        print(f"✓ Chat test with history: reply received, fields={data.get('fields_collected', {})}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
