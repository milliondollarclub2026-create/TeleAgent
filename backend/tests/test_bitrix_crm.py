"""
Backend API Tests for Bitrix24 CRM Integration
Tests all Bitrix24 webhook-based CRM endpoints including:
- /api/bitrix-crm/status - Get CRM connection status
- /api/bitrix-crm/connect - Connect via webhook URL
- /api/bitrix-crm/test - Test connection
- /api/bitrix-crm/disconnect - Disconnect CRM
- /api/bitrix-crm/chat - CRM Chat AI endpoint
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://saleschat-ai-1.preview.emergentagent.com').rstrip('/')

# Test credentials - user with email_confirmed=true
TEST_EMAIL = "test2@teleagent.uz"
TEST_PASSWORD = "testpass123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    # First try to login with existing test user
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    
    # If login fails (user not confirmed), register a new test user
    unique_email = f"test_bitrix_{uuid.uuid4().hex[:8]}@test.com"
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": unique_email,
        "password": "testpass123",
        "name": "Test Bitrix User",
        "business_name": "Test Business"
    })
    if reg_response.status_code == 200:
        return reg_response.json()["token"]
    
    pytest.skip(f"Could not get authentication token: {reg_response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestBitrixCRMStatus:
    """Test /api/bitrix-crm/status endpoint"""
    
    def test_status_returns_connected_false_initially(self, auth_headers):
        """Test that status returns connected=false when no webhook configured"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have connected field
        assert "connected" in data
        # Initially should be false (no webhook configured)
        assert data["connected"] == False
        # Should have connected_at field (null when not connected)
        assert "connected_at" in data
        
        print(f"✓ Bitrix CRM status: connected={data['connected']}")
    
    def test_status_requires_auth(self):
        """Test that status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/status")
        assert response.status_code == 401
        print("✓ Bitrix CRM status requires authentication")


class TestBitrixCRMConnect:
    """Test /api/bitrix-crm/connect endpoint"""
    
    def test_connect_requires_webhook_url(self, auth_headers):
        """Test that connect requires webhook_url field"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/connect", 
            headers=auth_headers,
            json={}
        )
        # Should fail validation - missing required field
        assert response.status_code == 422
        print("✓ Connect requires webhook_url field")
    
    def test_connect_validates_invalid_webhook(self, auth_headers):
        """Test that connect validates webhook URL"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/connect",
            headers=auth_headers,
            json={"webhook_url": "invalid-url"}
        )
        # Should fail - invalid webhook URL
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Connect validates webhook URL: {data['detail']}")
    
    def test_connect_requires_auth(self):
        """Test that connect endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/connect",
            json={"webhook_url": "https://test.bitrix24.com/rest/1/abc123/"}
        )
        assert response.status_code == 401
        print("✓ Connect requires authentication")


class TestBitrixCRMTest:
    """Test /api/bitrix-crm/test endpoint"""
    
    def test_test_returns_not_connected_when_no_webhook(self, auth_headers):
        """Test that test endpoint returns not connected when no webhook configured"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate not connected
        assert "ok" in data
        assert data["ok"] == False
        assert "message" in data
        assert "not connected" in data["message"].lower()
        
        print(f"✓ Bitrix CRM test: {data['message']}")
    
    def test_test_requires_auth(self):
        """Test that test endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/test")
        assert response.status_code == 401
        print("✓ Test endpoint requires authentication")


class TestBitrixCRMDisconnect:
    """Test /api/bitrix-crm/disconnect endpoint"""
    
    def test_disconnect_works_even_when_not_connected(self, auth_headers):
        """Test that disconnect works even when not connected"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/disconnect", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        
        print(f"✓ Bitrix CRM disconnect: {data['message']}")
    
    def test_disconnect_requires_auth(self):
        """Test that disconnect endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/disconnect")
        assert response.status_code == 401
        print("✓ Disconnect requires authentication")


class TestBitrixCRMChat:
    """Test /api/bitrix-crm/chat endpoint"""
    
    def test_chat_returns_error_when_not_connected(self, auth_headers):
        """Test that chat returns error when CRM not connected"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            headers=auth_headers,
            json={
                "message": "What are our top selling products?",
                "conversation_history": []
            }
        )
        # Should return 400 error when not connected
        assert response.status_code == 400
        data = response.json()
        
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        
        print(f"✓ CRM Chat returns error when not connected: {data['detail']}")
    
    def test_chat_requires_message_field(self, auth_headers):
        """Test that chat requires message field"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            headers=auth_headers,
            json={}
        )
        # Should fail validation
        assert response.status_code == 422
        print("✓ CRM Chat requires message field")
    
    def test_chat_requires_auth(self):
        """Test that chat endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            json={"message": "test"}
        )
        assert response.status_code == 401
        print("✓ CRM Chat requires authentication")


class TestBitrixCRMDataEndpoints:
    """Test Bitrix CRM data endpoints (leads, deals, products, analytics)"""
    
    def test_leads_returns_error_when_not_connected(self, auth_headers):
        """Test /api/bitrix-crm/leads returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/leads", headers=auth_headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        print(f"✓ Bitrix leads endpoint: {data['detail']}")
    
    def test_deals_returns_error_when_not_connected(self, auth_headers):
        """Test /api/bitrix-crm/deals returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/deals", headers=auth_headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        print(f"✓ Bitrix deals endpoint: {data['detail']}")
    
    def test_products_returns_error_when_not_connected(self, auth_headers):
        """Test /api/bitrix-crm/products returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/products", headers=auth_headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        print(f"✓ Bitrix products endpoint: {data['detail']}")
    
    def test_analytics_returns_error_when_not_connected(self, auth_headers):
        """Test /api/bitrix-crm/analytics returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/analytics", headers=auth_headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        print(f"✓ Bitrix analytics endpoint: {data['detail']}")


class TestEmailConfirmationFlow:
    """Test email confirmation flow for registration"""
    
    def test_registration_creates_unconfirmed_user(self):
        """Test that registration creates user with email_confirmed=false"""
        unique_email = f"test_confirm_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Confirm User",
            "business_name": "Test Business"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have token and user
        assert "token" in data
        assert "user" in data
        
        # User should have email_confirmed=false
        assert data["user"]["email_confirmed"] == False
        
        # Should have message about email confirmation
        assert "message" in data
        assert "confirm" in data["message"].lower() or "email" in data["message"].lower()
        
        print(f"✓ Registration creates unconfirmed user: {data['user']['email']}")
    
    def test_login_blocked_for_unconfirmed_user(self):
        """Test that login is blocked for unconfirmed users with 403"""
        # Register a new user
        unique_email = f"test_block_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Block User",
            "business_name": "Test Business"
        })
        assert reg_response.status_code == 200
        
        # Try to login - should be blocked
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        
        # Should return 403 Forbidden
        assert login_response.status_code == 403
        data = login_response.json()
        
        assert "detail" in data
        assert "confirm" in data["detail"].lower()
        
        print(f"✓ Login blocked for unconfirmed user: {data['detail']}")
    
    def test_confirm_email_endpoint_validates_token(self):
        """Test that confirm-email endpoint validates tokens"""
        # Try with invalid token
        response = requests.get(f"{BASE_URL}/api/auth/confirm-email?token=invalid-token-123")
        assert response.status_code == 400
        data = response.json()
        
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        
        print(f"✓ Confirm email validates tokens: {data['detail']}")
    
    def test_resend_confirmation_endpoint(self):
        """Test resend-confirmation endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/resend-confirmation?email=nonexistent@test.com")
        assert response.status_code == 200
        data = response.json()
        
        # Should return generic message (doesn't reveal if email exists)
        assert "message" in data
        
        print(f"✓ Resend confirmation endpoint works: {data['message']}")


class TestLegacyBitrixEndpoints:
    """Test legacy Bitrix OAuth endpoints (demo mode)"""
    
    def test_legacy_bitrix_status(self, auth_headers):
        """Test /api/bitrix/status returns demo mode"""
        response = requests.get(f"{BASE_URL}/api/bitrix/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "connected" in data
        assert "is_demo" in data
        assert data["is_demo"] == True
        
        print(f"✓ Legacy Bitrix status: demo mode")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
