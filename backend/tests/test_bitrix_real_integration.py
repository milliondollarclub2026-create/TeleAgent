"""
Backend API Tests for Bitrix24 CRM Integration with REAL Webhook
Tests all Bitrix24 webhook-based CRM endpoints with actual Bitrix24 data:
- /api/bitrix-crm/connect - Connect via webhook URL
- /api/bitrix-crm/status - Get CRM connection status
- /api/bitrix-crm/test - Test connection
- /api/bitrix-crm/leads - Get leads from CRM
- /api/bitrix-crm/products - Get products from CRM
- /api/bitrix-crm/analytics - Get CRM analytics
- /api/bitrix-crm/chat - CRM Chat AI endpoint
- /api/bitrix-crm/disconnect - Disconnect CRM
"""
import pytest
import requests
import os
import time

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aiagent-hub-17.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test2@teleagent.uz"
TEST_PASSWORD = "testpass123"

# Real Bitrix24 webhook URL
BITRIX_WEBHOOK_URL = "https://b24-48tcii.bitrix24.kz/rest/15/3rncfhh9z5j9opvf/"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip(f"Could not get authentication token: {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestBitrixRealConnection:
    """Test Bitrix24 CRM connection with real webhook"""
    
    def test_01_connect_with_real_webhook(self, auth_headers):
        """Test connecting to Bitrix24 with real webhook URL"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/connect",
            headers=auth_headers,
            json={"webhook_url": BITRIX_WEBHOOK_URL}
        )
        print(f"Connect response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        
        print(f"✓ Bitrix24 connected: {data['message']}")
        if "portal_user" in data:
            print(f"  Portal user: {data['portal_user']}")
    
    def test_02_status_shows_connected(self, auth_headers):
        """Test that status shows connected after connecting"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "connected" in data
        assert data["connected"] == True
        
        print(f"✓ Bitrix CRM status: connected={data['connected']}")
        if "connected_at" in data:
            print(f"  Connected at: {data['connected_at']}")
    
    def test_03_test_connection(self, auth_headers):
        """Test the connection test endpoint"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "ok" in data
        assert data["ok"] == True
        
        print(f"✓ Bitrix CRM test: ok={data['ok']}")
        if "portal_user" in data:
            print(f"  Portal user: {data['portal_user']}")


class TestBitrixRealData:
    """Test Bitrix24 CRM data endpoints with real data"""
    
    def test_04_get_leads(self, auth_headers):
        """Test getting leads from Bitrix24"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/leads?limit=10", headers=auth_headers)
        print(f"Leads response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "leads" in data
        assert "total" in data
        assert isinstance(data["leads"], list)
        
        print(f"✓ Bitrix leads: {data['total']} total")
        if data["leads"]:
            lead = data["leads"][0]
            print(f"  Sample lead: {lead.get('TITLE', 'N/A')} - Status: {lead.get('STATUS_ID', 'N/A')}")
    
    def test_05_get_products(self, auth_headers):
        """Test getting products from Bitrix24"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/products?limit=10", headers=auth_headers)
        print(f"Products response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
        
        print(f"✓ Bitrix products: {data['total']} total")
        if data["products"]:
            product = data["products"][0]
            print(f"  Sample product: {product.get('NAME', 'N/A')} - Price: {product.get('PRICE', 'N/A')}")
    
    def test_06_get_analytics(self, auth_headers):
        """Test getting analytics from Bitrix24"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/analytics", headers=auth_headers)
        print(f"Analytics response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "leads" in data
        assert "deals" in data
        assert "products" in data
        
        print(f"✓ Bitrix analytics:")
        print(f"  Total leads: {data['leads'].get('total', 0)}")
        print(f"  Total deals: {data['deals'].get('total', 0)}")
        print(f"  Pipeline value: {data['deals'].get('pipeline_value', 0)}")
        print(f"  Conversion rate: {data.get('conversion_rate', 0):.1f}%")


class TestBitrixCRMChat:
    """Test CRM Chat AI endpoint with real data"""
    
    def test_07_chat_about_leads(self, auth_headers):
        """Test CRM Chat asking about leads"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            headers=auth_headers,
            json={
                "message": "Show me recent leads",
                "conversation_history": []
            }
        )
        print(f"Chat response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "reply" in data
        assert len(data["reply"]) > 0
        
        print(f"✓ CRM Chat about leads:")
        print(f"  Reply preview: {data['reply'][:200]}...")
    
    def test_08_chat_about_top_products(self, auth_headers):
        """Test CRM Chat asking about top products"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            headers=auth_headers,
            json={
                "message": "What are our top selling products?",
                "conversation_history": []
            }
        )
        print(f"Chat response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "reply" in data
        assert len(data["reply"]) > 0
        
        print(f"✓ CRM Chat about top products:")
        print(f"  Reply preview: {data['reply'][:200]}...")
    
    def test_09_chat_crm_overview(self, auth_headers):
        """Test CRM Chat asking for CRM overview"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/chat",
            headers=auth_headers,
            json={
                "message": "Give me a CRM overview",
                "conversation_history": []
            }
        )
        print(f"Chat response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "reply" in data
        assert len(data["reply"]) > 0
        
        print(f"✓ CRM Chat overview:")
        print(f"  Reply preview: {data['reply'][:200]}...")


class TestBitrixDisconnect:
    """Test Bitrix24 disconnect"""
    
    def test_10_disconnect(self, auth_headers):
        """Test disconnecting Bitrix24"""
        response = requests.post(f"{BASE_URL}/api/bitrix-crm/disconnect", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        
        print(f"✓ Bitrix CRM disconnected: {data['message']}")
    
    def test_11_status_shows_disconnected(self, auth_headers):
        """Test that status shows disconnected after disconnecting"""
        response = requests.get(f"{BASE_URL}/api/bitrix-crm/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "connected" in data
        assert data["connected"] == False
        
        print(f"✓ Bitrix CRM status after disconnect: connected={data['connected']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
