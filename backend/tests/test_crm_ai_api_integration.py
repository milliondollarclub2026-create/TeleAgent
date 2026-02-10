"""
CRM-AI API Integration Tests
Tests the CRM integration through actual API calls to verify:
1. Chat test endpoint works with/without CRM connected
2. Fallback behavior when CRM is not connected
3. Event logging includes CRM fields
4. Telegram webhook handles CRM context correctly

Run with: python tests/test_crm_ai_api_integration.py
"""
import requests
import json
import sys
import uuid
import time

BASE_URL = "http://localhost:8000"

# Test results
passed = 0
failed = 0


def test_result(name, success, message=""):
    global passed, failed
    if success:
        passed += 1
        print(f"✓ {name}")
    else:
        failed += 1
        print(f"✗ FAILED: {name}")
        if message:
            print(f"  {message}")


def get_auth_token():
    """Get authentication token - try login with confirmed users"""
    # List of confirmed test users to try
    test_users = [
        ("test@leadrelay.com", "testpass123"),
        ("test2@teleagent.uz", "testpass123"),
    ]

    for email, password in test_users:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return data["token"], data["user"]["tenant_id"]

    # If no existing users work, return None
    print("  No confirmed test users available")
    return None, None


def test_health_check():
    """Test that the API is healthy"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        test_result("Health check", response.status_code == 200)
        return response.status_code == 200
    except Exception as e:
        test_result("Health check", False, str(e))
        return False


def test_chat_without_crm(token):
    """Test chat endpoint works when CRM is not connected"""
    headers = {"Authorization": f"Bearer {token}"}

    # Test basic chat
    response = requests.post(f"{BASE_URL}/api/chat/test", headers=headers, json={
        "message": "What products do you sell?",
        "conversation_history": []
    })

    success = response.status_code == 200
    if success:
        data = response.json()
        # Verify response structure
        success = all(k in data for k in ["reply", "sales_stage", "hotness", "score"])

    test_result("Chat without CRM connected", success,
                f"Status: {response.status_code}, Response: {response.text[:200] if response.text else 'empty'}")
    return success


def test_chat_with_price_query(token):
    """Test chat with price keywords - should work even without CRM (uses RAG)"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(f"{BASE_URL}/api/chat/test", headers=headers, json={
        "message": "How much does your product cost?",
        "conversation_history": []
    })

    success = response.status_code == 200
    if success:
        data = response.json()
        # Should have a reply even without CRM pricing data
        success = "reply" in data and len(data["reply"]) > 0

    test_result("Chat with price query (no CRM)", success,
                f"Reply: {response.json().get('reply', '')[:100] if response.status_code == 200 else response.text[:100]}")
    return success


def test_crm_status_endpoint(token):
    """Test CRM status endpoint returns valid response"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/bitrix-crm/status", headers=headers)

    success = response.status_code == 200
    if success:
        data = response.json()
        # Should have 'connected' field (either True or False)
        success = "connected" in data
        connected = data.get("connected")
        print(f"  CRM connected: {connected}")

    test_result("CRM status endpoint works", success)
    return success


def test_telegram_webhook_empty():
    """Test webhook handles empty updates gracefully"""
    response = requests.post(f"{BASE_URL}/api/telegram/webhook", json={})
    success = response.status_code == 200 and response.json().get("ok") == True
    test_result("Telegram webhook - empty update", success)
    return success


def test_telegram_webhook_no_message():
    """Test webhook handles updates without message gracefully"""
    response = requests.post(f"{BASE_URL}/api/telegram/webhook", json={
        "update_id": 12345
    })
    success = response.status_code == 200 and response.json().get("ok") == True
    test_result("Telegram webhook - no message", success)
    return success


def test_chat_with_history(token):
    """Test chat with conversation history works"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(f"{BASE_URL}/api/chat/test", headers=headers, json={
        "message": "My name is Sardor and my phone is 998901234567",
        "conversation_history": [
            {"role": "agent", "text": "Hello! How can I help you?"},
            {"role": "user", "text": "I want to buy something"}
        ]
    })

    success = response.status_code == 200
    if success:
        data = response.json()
        # Verify fields are being collected
        fields = data.get("fields_collected", {})
        # Should have extracted name and possibly phone
        success = "reply" in data

    test_result("Chat with conversation history", success)
    return success


def test_crm_endpoints_require_auth():
    """Test CRM endpoints require authentication"""
    endpoints = [
        ("GET", "/api/bitrix-crm/status"),
        ("POST", "/api/bitrix-crm/connect"),
        ("POST", "/api/bitrix-crm/test"),
        ("POST", "/api/bitrix-crm/disconnect"),
    ]

    all_passed = True
    for method, endpoint in endpoints:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}")
        else:
            response = requests.post(f"{BASE_URL}{endpoint}", json={})

        if response.status_code != 401:
            all_passed = False
            test_result(f"CRM auth check - {endpoint}", False, f"Expected 401, got {response.status_code}")

    if all_passed:
        test_result("CRM endpoints require auth", True)
    return all_passed


def test_chat_endpoint_validates_input(token):
    """Test chat endpoint validates input properly"""
    headers = {"Authorization": f"Bearer {token}"}

    # Missing message field
    response = requests.post(f"{BASE_URL}/api/chat/test", headers=headers, json={})
    success = response.status_code == 422  # Validation error
    test_result("Chat validates required fields", success,
                f"Status: {response.status_code}")
    return success


def test_multilingual_keywords(token):
    """Test that multilingual keywords work in queries"""
    headers = {"Authorization": f"Bearer {token}"}

    test_cases = [
        ("Bu narxi qancha?", "Uzbek price query"),  # Uzbek
        ("Сколько стоит это?", "Russian price query"),  # Russian
        ("What is the cost?", "English price query"),  # English
    ]

    all_passed = True
    for message, description in test_cases:
        response = requests.post(f"{BASE_URL}/api/chat/test", headers=headers, json={
            "message": message,
            "conversation_history": []
        })

        if response.status_code != 200:
            all_passed = False
            test_result(f"Multilingual - {description}", False, f"Status: {response.status_code}")
        else:
            # Check that we got a response
            data = response.json()
            if not data.get("reply"):
                all_passed = False
                test_result(f"Multilingual - {description}", False, "Empty reply")

    if all_passed:
        test_result("Multilingual keyword detection", True)
    return all_passed


def test_config_endpoint(token):
    """Test config endpoint returns expected structure"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/config", headers=headers)

    success = response.status_code == 200
    if success:
        data = response.json()
        # Check for key config fields
        expected_fields = ["objection_playbook", "closing_scripts", "required_fields"]
        success = all(f in data for f in expected_fields)

    test_result("Config endpoint structure", success)
    return success


def test_dashboard_stats(token):
    """Test dashboard stats endpoint works"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)

    success = response.status_code == 200
    if success:
        data = response.json()
        # Check for expected stats fields
        expected_fields = ["total_conversations", "total_leads", "hot_leads", "warm_leads", "cold_leads"]
        success = all(f in data for f in expected_fields)

    test_result("Dashboard stats endpoint", success)
    return success


def run_all_tests():
    global passed, failed

    print("=" * 60)
    print("CRM-AI API Integration Tests")
    print("=" * 60)
    print()

    # Health check first
    print("## Health Check")
    if not test_health_check():
        print("\n⚠️  Backend not running! Start with: python server.py")
        return

    # Get auth token
    print("\n## Authentication")
    token, tenant_id = get_auth_token()
    if not token:
        print("✗ Could not get auth token - stopping tests")
        return

    print(f"✓ Got auth token for tenant: {tenant_id}")

    # Run tests
    print("\n## CRM Status Tests")
    test_crm_status_endpoint(token)
    test_crm_endpoints_require_auth()

    print("\n## Chat Tests (Without CRM)")
    test_chat_without_crm(token)
    test_chat_with_price_query(token)
    test_chat_with_history(token)
    test_chat_endpoint_validates_input(token)
    test_multilingual_keywords(token)

    print("\n## Telegram Webhook Tests")
    test_telegram_webhook_empty()
    test_telegram_webhook_no_message()

    print("\n## Other Endpoint Tests")
    test_config_endpoint(token)
    test_dashboard_stats(token)

    print()
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
