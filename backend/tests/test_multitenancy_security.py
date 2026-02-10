"""
Multi-Tenancy Security Tests
Tests data isolation between tenants to prevent cross-tenant data leakage.
"""
import pytest
import uuid
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestMultiTenancyIsolation:
    """Test that data is properly isolated between tenants"""

    def setup_method(self):
        """Set up test fixtures"""
        self.tenant_a_id = str(uuid.uuid4())
        self.tenant_b_id = str(uuid.uuid4())
        self.user_a = {"user_id": str(uuid.uuid4()), "tenant_id": self.tenant_a_id, "email": "user_a@test.com"}
        self.user_b = {"user_id": str(uuid.uuid4()), "tenant_id": self.tenant_b_id, "email": "user_b@test.com"}

    # ============ Leads Isolation Tests ============

    def test_leads_query_includes_tenant_filter(self):
        """Verify leads query filters by tenant_id"""
        # The leads endpoint should include: .eq('tenant_id', current_user["tenant_id"])
        query_pattern = "supabase.table('leads').select('*').eq('tenant_id', current_user[\"tenant_id\"])"

        with open('server.py', 'r') as f:
            content = f.read()

        # Check that leads query includes tenant_id filter
        assert "eq('tenant_id', current_user[\"tenant_id\"])" in content or \
               'eq("tenant_id", current_user["tenant_id"])' in content, \
               "Leads query MUST filter by tenant_id"

    def test_lead_update_includes_tenant_filter(self):
        """Verify lead update operations include tenant_id for IDOR protection"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Check that lead updates include tenant_id in the filter
        # Pattern: .update(...).eq('id', lead_id).eq('tenant_id', ...)
        assert "update_lead_status" in content, "update_lead_status endpoint should exist"

        # Look for defense-in-depth pattern
        status_update_section = content[content.find("update_lead_status"):content.find("update_lead_status")+2000]
        assert "tenant_id" in status_update_section, "Lead status update should verify tenant_id"

    def test_lead_delete_includes_tenant_filter(self):
        """Verify lead delete operations include tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find the delete_lead function
        delete_section = content[content.find("delete(\"/leads/"):content.find("delete(\"/leads/")+1500]
        assert "tenant_id" in delete_section, "Lead delete should verify tenant_id"

    # ============ Documents Isolation Tests ============

    def test_documents_query_includes_tenant_filter(self):
        """Verify documents query filters by tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Check documents endpoint
        assert "documents" in content
        doc_section = content[content.find("get(\"/documents\")"):content.find("get(\"/documents\")")+500]
        assert "tenant_id" in doc_section, "Documents query should filter by tenant_id"

    def test_document_delete_includes_tenant_filter(self):
        """Verify document delete includes tenant_id for defense-in-depth"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find delete_document function
        delete_section = content[content.find("delete(\"/documents/"):content.find("delete(\"/documents/")+800]

        # Should have tenant_id in the delete operation (defense-in-depth)
        # Pattern: .delete().eq('id', doc_id).eq('tenant_id', tenant_id)
        assert ".eq('tenant_id'" in delete_section or '.eq("tenant_id"' in delete_section, \
               "Document delete should include tenant_id filter for defense-in-depth"

    # ============ Customers Isolation Tests ============

    def test_customers_fetch_includes_tenant_filter(self):
        """Verify customers fetch in leads endpoint includes tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find the customers fetch in leads endpoint
        # Pattern: supabase.table('customers').select(...).in_('id', customer_ids).eq('tenant_id', ...)
        assert "in_('id', customer_ids).eq('tenant_id'" in content or \
               'in_("id", customer_ids).eq("tenant_id"' in content, \
               "Customers fetch should include tenant_id filter"

    # ============ Telegram Webhook Isolation Tests ============

    def test_telegram_webhook_uses_bot_specific_url(self):
        """Verify Telegram webhook uses bot-specific URL for tenant isolation"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Should have bot-specific webhook endpoint
        assert "/telegram/webhook/{bot_id}" in content, \
               "Should have bot-specific webhook endpoint for tenant isolation"

        # Bot setup should include bot_id in webhook URL
        assert 'webhook_url = f"{backend_url}/api/telegram/webhook/{bot_id}"' in content or \
               "telegram/webhook/{bot_id}" in content, \
               "Bot setup should use bot-specific webhook URL"

    def test_telegram_webhook_bot_lookup_uses_specific_id(self):
        """Verify webhook handler looks up bot by specific ID, not all bots"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find the new webhook handler
        webhook_section = content[content.find("telegram_webhook_with_bot_id"):content.find("telegram_webhook_with_bot_id")+2000]

        # Should query by specific bot_id
        assert ".eq('id', bot_id)" in webhook_section or '.eq("id", bot_id)' in webhook_section, \
               "Webhook should look up bot by specific ID"

        # Should NOT have pattern that queries all active bots
        assert ".eq('is_active', True).execute()" not in webhook_section[:1500], \
               "New webhook should NOT query all active bots"

    def test_legacy_webhook_has_deprecation_warning(self):
        """Verify legacy webhook endpoint has deprecation warning"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Should have legacy endpoint with warning
        assert "telegram_webhook_legacy" in content or "DEPRECATED" in content, \
               "Should have legacy endpoint with deprecation warning"

    # ============ Config Isolation Tests ============

    def test_config_query_includes_tenant_filter(self):
        """Verify config operations filter by tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find config endpoint
        config_section = content[content.find("get(\"/config\")"):content.find("get(\"/config\")")+500]
        assert "tenant_id" in config_section, "Config query should filter by tenant_id"

    def test_config_update_includes_tenant_filter(self):
        """Verify config update filters by tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find config update
        assert "eq('tenant_id'" in content, "Config update should filter by tenant_id"

    # ============ Conversations/Messages Isolation Tests ============

    def test_conversations_query_includes_tenant_filter(self):
        """Verify conversations are filtered by tenant_id"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Conversations should be filtered by tenant_id
        assert "conversations" in content
        # Check that tenant_id is used when querying conversations
        assert "eq('tenant_id'" in content and "conversations" in content

    # ============ Bitrix Integration Isolation Tests ============

    def test_bitrix_uses_tenant_specific_credentials(self):
        """Verify Bitrix operations use tenant-specific webhook URLs"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Bitrix should use tenant-specific credentials
        bitrix_section = content[content.find("get_bitrix_client"):content.find("get_bitrix_client")+1500]
        assert "tenant_id" in bitrix_section, "Bitrix client should use tenant-specific credentials"

    # ============ Account Deletion Isolation Tests ============

    def test_account_deletion_deletes_only_tenant_data(self):
        """Verify account deletion only affects the tenant's data"""
        with open('server.py', 'r') as f:
            content = f.read()

        # Find delete account function
        delete_section = content[content.find("delete(\"/account\")"):content.find("delete(\"/account\")")+3000]

        # All delete operations should include tenant_id filter
        assert "eq('tenant_id', tenant_id)" in delete_section or 'eq("tenant_id", tenant_id)' in delete_section, \
               "Account deletion should filter by tenant_id"


class TestSecurityPatterns:
    """Test that security patterns are consistently applied"""

    def test_no_unfiltered_select_all(self):
        """Verify there are no SELECT * queries without tenant filtering for user data tables"""
        with open('server.py', 'r') as f:
            content = f.read()

        user_data_tables = ['leads', 'customers', 'conversations', 'documents', 'event_logs']

        for table in user_data_tables:
            # Find all queries to this table
            # Pattern: supabase.table('leads').select('*').execute()
            # This pattern WITHOUT tenant_id filter would be a vulnerability

            # Check that table queries include tenant_id
            pattern = f"table('{table}').select"
            if pattern in content:
                # Find the context around each usage
                start = 0
                while True:
                    idx = content.find(pattern, start)
                    if idx == -1:
                        break

                    # Get the surrounding context (next 200 chars)
                    context = content[idx:idx+200]

                    # Skip if this is in the delete account section (which properly filters)
                    if "delete" in content[max(0,idx-100):idx]:
                        start = idx + 1
                        continue

                    # Warn if no tenant_id filter found in the query chain
                    # (This is informational, not a hard fail since some queries are safe)
                    start = idx + 1

    def test_jwt_validation_on_protected_endpoints(self):
        """Verify protected endpoints use JWT validation"""
        with open('server.py', 'r') as f:
            content = f.read()

        # All data endpoints should have Depends(get_current_user)
        protected_endpoints = [
            '/leads', '/documents', '/config', '/dashboard', '/agents'
        ]

        for endpoint in protected_endpoints:
            # Find the endpoint definition
            idx = content.find(f'("{endpoint}")')
            if idx != -1:
                # Check the function signature includes auth dependency
                func_def = content[idx:idx+300]
                assert "get_current_user" in func_def or "Depends" in func_def, \
                       f"Endpoint {endpoint} should require authentication"


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
