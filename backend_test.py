#!/usr/bin/env python3
"""
AI Sales Agent Backend API Testing Suite
Tests all endpoints for the Telegram + Bitrix24 CRM application
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Optional, Tuple

class TeleAgentAPITester:
    def __init__(self, base_url: str = "https://aisales-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data
        self.test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Test User"
        self.test_business = "Test Business LLC"

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, {"error": response.text}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name,
            "business_name": self.test_business
        }
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.log(f"   Registered user: {self.user_data.get('email')}")
        
        return success, response

    def test_user_login(self):
        """Test user login"""
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        success, response = self.run_test("User Login", "POST", "auth/login", 200, data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.log(f"   Logged in user: {self.user_data.get('email')}")
        
        return success, response

    def test_get_current_user(self):
        """Test get current user endpoint"""
        if not self.token:
            self.log("❌ No token available for auth test", "ERROR")
            return False, {}
        
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            self.log("❌ No token available for dashboard stats", "ERROR")
            return False, {}
        
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_leads_per_day(self):
        """Test leads per day endpoint"""
        if not self.token:
            self.log("❌ No token available for leads per day", "ERROR")
            return False, {}
        
        return self.run_test("Leads Per Day", "GET", "dashboard/leads-per-day", 200)

    def test_get_leads(self):
        """Test get leads endpoint"""
        if not self.token:
            self.log("❌ No token available for get leads", "ERROR")
            return False, {}
        
        return self.run_test("Get Leads", "GET", "leads", 200)

    def test_get_tenant_config(self):
        """Test get tenant config"""
        if not self.token:
            self.log("❌ No token available for config", "ERROR")
            return False, {}
        
        return self.run_test("Get Tenant Config", "GET", "config", 200)

    def test_update_tenant_config(self):
        """Test update tenant config"""
        if not self.token:
            self.log("❌ No token available for config update", "ERROR")
            return False, {}
        
        data = {
            "business_name": "Updated Test Business",
            "agent_tone": "friendly",
            "primary_language": "uz"
        }
        return self.run_test("Update Tenant Config", "PUT", "config", 200, data)

    def test_get_documents(self):
        """Test get documents endpoint"""
        if not self.token:
            self.log("❌ No token available for documents", "ERROR")
            return False, {}
        
        return self.run_test("Get Documents", "GET", "documents", 200)

    def test_create_document(self):
        """Test create document"""
        if not self.token:
            self.log("❌ No token available for document creation", "ERROR")
            return False, {}
        
        data = {
            "title": "Test Document",
            "content": "This is a test document for the knowledge base."
        }
        success, response = self.run_test("Create Document", "POST", "documents", 200, data)
        
        if success and 'id' in response:
            self.document_id = response['id']
            self.log(f"   Created document ID: {self.document_id}")
        
        return success, response

    def test_delete_document(self):
        """Test delete document"""
        if not self.token:
            self.log("❌ No token available for document deletion", "ERROR")
            return False, {}
        
        if not hasattr(self, 'document_id'):
            self.log("❌ No document ID available for deletion", "ERROR")
            return False, {}
        
        return self.run_test("Delete Document", "DELETE", f"documents/{self.document_id}", 200)

    def test_integrations_status(self):
        """Test integrations status endpoint"""
        if not self.token:
            self.log("❌ No token available for integrations", "ERROR")
            return False, {}
        
        return self.run_test("Integrations Status", "GET", "integrations/status", 200)

    def test_connect_telegram_bot(self):
        """Test connect Telegram bot"""
        if not self.token:
            self.log("❌ No token available for bot connection", "ERROR")
            return False, {}
        
        # Using the provided bot token from credentials
        data = {
            "bot_token": "8056986547:AAGEVED3LWFDJglAeTtuHFYqckcm8BGrb44"
        }
        return self.run_test("Connect Telegram Bot", "POST", "telegram/bot", 200, data)

    def test_get_telegram_bot(self):
        """Test get Telegram bot status"""
        if not self.token:
            self.log("❌ No token available for bot status", "ERROR")
            return False, {}
        
        return self.run_test("Get Telegram Bot", "GET", "telegram/bot", 200)

    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("🚀 Starting TeleAgent API Test Suite")
        self.log(f"   Base URL: {self.base_url}")
        self.log(f"   API URL: {self.api_url}")
        
        # Basic health checks
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Dashboard endpoints
        self.test_dashboard_stats()
        self.test_leads_per_day()
        
        # Leads management
        self.test_get_leads()
        
        # Configuration
        self.test_get_tenant_config()
        self.test_update_tenant_config()
        
        # Knowledge base
        self.test_get_documents()
        self.test_create_document()
        if hasattr(self, 'document_id'):
            self.test_delete_document()
        
        # Integrations
        self.test_integrations_status()
        self.test_connect_telegram_bot()
        self.test_get_telegram_bot()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        self.log("=" * 60)
        self.log("📊 TEST SUMMARY")
        self.log(f"   Total Tests: {self.tests_run}")
        self.log(f"   Passed: {self.tests_passed}")
        self.log(f"   Failed: {len(self.failed_tests)}")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Status {test.get('actual')} != {test.get('expected')}")
                self.log(f"   • {test['test']}: {error_msg}")
        
        self.log("=" * 60)
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = TeleAgentAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())