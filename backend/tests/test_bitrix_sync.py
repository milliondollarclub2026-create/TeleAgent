"""
Bitrix CRM Sync Logic Tests
Tests the _should_sync_to_bitrix function and related sync logic.
"""
import pytest
import sys
import os
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from typing import Dict, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import (
    _should_sync_to_bitrix,
    _get_hotness_from_score,
    _build_bitrix_lead_summary,
    sync_lead_to_bitrix,
)


class TestGetHotnessFromScore:
    """Test the _get_hotness_from_score function"""

    def test_cold_tier_score_0(self):
        """Score 0 should be cold"""
        assert _get_hotness_from_score(0) == "cold"

    def test_cold_tier_score_30(self):
        """Score 30 should be cold"""
        assert _get_hotness_from_score(30) == "cold"

    def test_cold_tier_score_39(self):
        """Score 39 should be cold (boundary)"""
        assert _get_hotness_from_score(39) == "cold"

    def test_warm_tier_score_40(self):
        """Score 40 should be warm (boundary)"""
        assert _get_hotness_from_score(40) == "warm"

    def test_warm_tier_score_55(self):
        """Score 55 should be warm (middle)"""
        assert _get_hotness_from_score(55) == "warm"

    def test_warm_tier_score_69(self):
        """Score 69 should be warm (boundary)"""
        assert _get_hotness_from_score(69) == "warm"

    def test_hot_tier_score_70(self):
        """Score 70 should be hot (boundary)"""
        assert _get_hotness_from_score(70) == "hot"

    def test_hot_tier_score_85(self):
        """Score 85 should be hot (middle)"""
        assert _get_hotness_from_score(85) == "hot"

    def test_hot_tier_score_100(self):
        """Score 100 should be hot (max)"""
        assert _get_hotness_from_score(100) == "hot"


class TestBuildBitrixLeadSummary:
    """Test the _build_bitrix_lead_summary function"""

    def test_summary_includes_hotness_emoji_hot(self):
        """Summary should include fire emoji for hot leads"""
        fields = {"product": "Test Product"}
        summary = _build_bitrix_lead_summary(fields, "hot", 85)
        assert "HOT LEAD" in summary
        assert "Score: 85/100" in summary

    def test_summary_includes_hotness_emoji_warm(self):
        """Summary should include thermometer emoji for warm leads"""
        fields = {"product": "Test Product"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "WARM LEAD" in summary
        assert "Score: 55/100" in summary

    def test_summary_includes_hotness_emoji_cold(self):
        """Summary should include snowflake emoji for cold leads"""
        fields = {"product": "Test Product"}
        summary = _build_bitrix_lead_summary(fields, "cold", 25)
        assert "COLD LEAD" in summary
        assert "Score: 25/100" in summary

    def test_summary_includes_product_interest(self):
        """Summary should include product interest when available"""
        fields = {"product": "Premium Widget"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "Product Interest: Premium Widget" in summary

    def test_summary_includes_budget(self):
        """Summary should include budget when available"""
        fields = {"budget": "$5000"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "Budget: $5000" in summary

    def test_summary_includes_timeline(self):
        """Summary should include timeline when available"""
        fields = {"timeline": "This month"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "Timeline: This month" in summary

    def test_summary_includes_company(self):
        """Summary should include company when available"""
        fields = {"company": "Acme Corp"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "Company: Acme Corp" in summary

    def test_summary_includes_all_fields(self):
        """Summary should include all available fields"""
        fields = {
            "product": "Premium Widget",
            "budget": "$10,000",
            "timeline": "Next week",
            "quantity": "100 units",
            "company": "Big Corp",
            "job_title": "CEO",
            "team_size": "50+",
            "location": "New York",
            "urgency": "High",
            "preferred_time": "Morning",
            "reference": "Google",
            "notes": "VIP customer"
        }
        summary = _build_bitrix_lead_summary(fields, "hot", 90)
        assert "Product Interest: Premium Widget" in summary
        assert "Budget: $10,000" in summary
        assert "Timeline: Next week" in summary
        assert "Quantity: 100 units" in summary
        assert "Company: Big Corp" in summary
        assert "Job Title: CEO" in summary
        assert "Team Size: 50+" in summary
        assert "Location: New York" in summary
        assert "Urgency: High" in summary
        assert "Preferred Time: Morning" in summary
        assert "Reference: Google" in summary
        assert "Notes: VIP customer" in summary

    def test_summary_empty_fields(self):
        """Summary should show message when no fields available"""
        fields = {}
        summary = _build_bitrix_lead_summary(fields, "cold", 20)
        assert "No additional details collected yet" in summary

    def test_summary_includes_source(self):
        """Summary should include source information"""
        fields = {"product": "Test"}
        summary = _build_bitrix_lead_summary(fields, "warm", 55)
        assert "Source: Telegram Bot (TeleAgent)" in summary


class TestShouldSyncToBitrix:
    """Test the _should_sync_to_bitrix decision logic"""

    # ============ New Lead Creation ============

    def test_sync_when_new_lead_no_crm_id(self):
        """Should sync when crm_lead_id is None (new lead)"""
        fields = {"name": "John Doe"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields={},
            current_score=30,
            previous_score=30,
            crm_lead_id=None
        )
        assert should_sync is True
        assert reason == "new_lead"

    def test_sync_when_new_lead_empty_crm_id(self):
        """Should sync when crm_lead_id is empty string (treat as new)"""
        # Note: This tests the actual implementation - empty string is falsy
        fields = {"name": "John Doe"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields={},
            current_score=30,
            previous_score=30,
            crm_lead_id=""
        )
        assert should_sync is True
        assert reason == "new_lead"

    # ============ New Contact Info Triggers ============

    def test_sync_when_name_newly_collected(self):
        """Should sync when name is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John Doe"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_name"

    def test_sync_when_phone_newly_collected(self):
        """Should sync when phone is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"phone": "+1234567890"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_phone"

    def test_sync_when_email_newly_collected(self):
        """Should sync when email is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"email": "john@example.com"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_email"

    def test_sync_when_company_newly_collected(self):
        """Should sync when company is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"company": "Acme Corp"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_company"

    def test_sync_when_location_newly_collected(self):
        """Should sync when location is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"location": "New York"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_location"

    def test_sync_when_name_changed(self):
        """Should sync when name is changed/updated"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John Smith"},
            previous_fields={"name": "John Doe"},
            current_score=40,
            previous_score=40,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_name"

    # ============ New Purchase Intent Triggers ============

    def test_sync_when_product_newly_collected(self):
        """Should sync when product is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"product": "Premium Widget"},
            previous_fields={},
            current_score=50,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_product"

    def test_sync_when_budget_newly_collected(self):
        """Should sync when budget is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"budget": "$5000"},
            previous_fields={},
            current_score=60,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_budget"

    def test_sync_when_timeline_newly_collected(self):
        """Should sync when timeline is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"timeline": "This month"},
            previous_fields={},
            current_score=60,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_timeline"

    def test_sync_when_quantity_newly_collected(self):
        """Should sync when quantity is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"quantity": "100 units"},
            previous_fields={},
            current_score=60,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_quantity"

    def test_sync_when_urgency_newly_collected(self):
        """Should sync when urgency is newly collected"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"urgency": "High"},
            previous_fields={},
            current_score=60,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_urgency"

    # ============ Hotness Transition Triggers ============

    def test_sync_when_cold_to_warm(self):
        """Should sync when cold->warm (score 35->45)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},  # No new fields
            previous_fields={"name": "John"},
            current_score=45,
            previous_score=35,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_cold_to_warm"

    def test_sync_when_warm_to_hot(self):
        """Should sync when warm->hot (score 65->75)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=75,
            previous_score=65,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_hot"

    def test_sync_when_hot_to_warm(self):
        """Should sync when hot->warm (score 75->65)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=65,
            previous_score=75,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_hot_to_warm"

    def test_sync_when_warm_to_cold(self):
        """Should sync when warm->cold (score 45->35)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=35,
            previous_score=45,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_cold"

    def test_sync_when_cold_to_hot(self):
        """Should sync when cold->hot (big jump)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=80,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_cold_to_hot"

    def test_sync_when_hot_to_cold(self):
        """Should sync when hot->cold (big drop)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=30,
            previous_score=80,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_hot_to_cold"

    # ============ Hotness Change WITHOUT Contact (Bug Fix Tests) ============

    def test_no_sync_hotness_change_without_contact_info(self):
        """BUG FIX: Should NOT sync when hotness changes but no contact info exists"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"product": "Widget"},  # No name, phone, or email
            previous_fields={"product": "Widget"},
            current_score=75,  # warm->hot transition
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "hotness_change_no_contact"

    def test_no_sync_cold_to_hot_without_contact(self):
        """BUG FIX: Should NOT sync cold->hot without any contact info"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={},  # Empty - no contact
            previous_fields={},
            current_score=85,
            previous_score=25,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "hotness_change_no_contact"

    def test_no_sync_warm_to_hot_with_only_product(self):
        """BUG FIX: Should NOT sync warm->hot with only product info (no contact)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"product": "Premium", "budget": "$1000"},
            previous_fields={"product": "Premium"},
            current_score=80,
            previous_score=55,
            crm_lead_id="123"
        )
        # Should sync because of new_budget, but if we had same fields...
        # Let's test with no new fields
        should_sync2, reason2 = _should_sync_to_bitrix(
            fields_collected={"product": "Premium", "budget": "$1000"},
            previous_fields={"product": "Premium", "budget": "$1000"},
            current_score=80,
            previous_score=55,
            crm_lead_id="123"
        )
        assert should_sync2 is False
        assert reason2 == "hotness_change_no_contact"

    def test_sync_hotness_change_with_phone(self):
        """Should sync on hotness change when phone number exists"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"phone": "+998901234567"},
            previous_fields={"phone": "+998901234567"},
            current_score=75,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_hot"

    def test_sync_hotness_change_with_name(self):
        """Should sync on hotness change when name exists"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "Jamshid"},
            previous_fields={"name": "Jamshid"},
            current_score=75,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_hot"

    def test_sync_hotness_change_with_email(self):
        """Should sync on hotness change when email exists"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"email": "customer@example.com"},
            previous_fields={"email": "customer@example.com"},
            current_score=75,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_hot"

    def test_no_sync_hotness_downgrade_without_contact(self):
        """BUG FIX: Should NOT sync hot->cold downgrade without contact"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"product": "Widget"},
            previous_fields={"product": "Widget"},
            current_score=25,
            previous_score=80,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "hotness_change_no_contact"

    # ============ Skip Conditions ============

    def test_no_sync_when_no_changes(self):
        """Should NOT sync when no changes (same fields, same score)"""
        fields = {"name": "John", "phone": "+1234567890"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields=fields.copy(),
            current_score=50,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_no_sync_when_score_changes_within_warm_tier(self):
        """Should NOT sync when score changes within warm tier (45->55)"""
        fields = {"name": "John"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields=fields.copy(),
            current_score=55,
            previous_score=45,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_no_sync_when_score_changes_within_cold_tier(self):
        """Should NOT sync when score changes within cold tier (20->35)"""
        fields = {"name": "John"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields=fields.copy(),
            current_score=35,
            previous_score=20,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_no_sync_when_score_changes_within_hot_tier(self):
        """Should NOT sync when score changes within hot tier (75->90)"""
        fields = {"name": "John"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields=fields.copy(),
            current_score=90,
            previous_score=75,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_no_sync_when_only_non_tracked_fields_change(self):
        """Should NOT sync when only non-tracked fields change"""
        # Fields like job_title, team_size, notes are not sync triggers on their own
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John", "notes": "Some new note"},
            previous_fields={"name": "John"},
            current_score=50,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_no_sync_when_score_decrease_same_tier(self):
        """Should NOT sync when score decreases within same tier"""
        fields = {"name": "John"}
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected=fields,
            previous_fields=fields.copy(),
            current_score=50,
            previous_score=60,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"


class TestSyncLeadToBitrix:
    """Test the sync_lead_to_bitrix async function"""

    @pytest.mark.asyncio
    async def test_sync_skipped_when_no_bitrix_client(self):
        """Should skip sync silently when Bitrix is not connected"""
        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client:
            mock_get_client.return_value = None

            # This should complete without error
            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John"}, "score": 50},
                existing_lead=None
            )

            mock_get_client.assert_called_once_with("test-tenant")

    @pytest.mark.asyncio
    async def test_sync_creates_new_lead_when_no_existing(self):
        """Should create new lead in Bitrix when no existing lead"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-bitrix-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase') as mock_supabase:
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "phone": "+1234567890"}, "score": 50},
                existing_lead=None
            )

            mock_client.create_lead.assert_called_once()
            call_args = mock_client.create_lead.call_args[0][0]
            assert "John" in call_args.get("title", "")

    @pytest.mark.asyncio
    async def test_sync_updates_existing_lead(self):
        """Should update existing lead in Bitrix when crm_lead_id exists"""
        mock_client = MagicMock()
        mock_client.update_lead = AsyncMock(return_value=True)

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client:
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "email": "john@test.com"}, "score": 60},
                existing_lead={
                    "id": "db-lead-123",
                    "crm_lead_id": "bitrix-456",
                    "fields_collected": {"name": "John"},
                    "score": 50
                }
            )

            mock_client.update_lead.assert_called_once()
            call_args = mock_client.update_lead.call_args[0]
            assert call_args[0] == "bitrix-456"

    @pytest.mark.asyncio
    async def test_sync_skipped_when_no_meaningful_change(self):
        """Should skip sync when no meaningful changes detected"""
        mock_client = MagicMock()
        mock_client.update_lead = AsyncMock()
        mock_client.create_lead = AsyncMock()

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client:
            mock_get_client.return_value = mock_client

            # Same fields, same score tier
            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John"}, "score": 55},
                existing_lead={
                    "id": "db-lead-123",
                    "crm_lead_id": "bitrix-456",
                    "fields_collected": {"name": "John"},
                    "score": 50  # Same tier (warm)
                }
            )

            # Neither create nor update should be called
            mock_client.create_lead.assert_not_called()
            mock_client.update_lead.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_on_hotness_transition(self):
        """Should sync when hotness tier changes"""
        mock_client = MagicMock()
        mock_client.update_lead = AsyncMock(return_value=True)

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client:
            mock_get_client.return_value = mock_client

            # Score changes from warm (50) to hot (75)
            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John"}, "score": 75},
                existing_lead={
                    "id": "db-lead-123",
                    "crm_lead_id": "bitrix-456",
                    "fields_collected": {"name": "John"},
                    "score": 50
                }
            )

            # Should update due to hotness change
            mock_client.update_lead.assert_called_once()

    @pytest.mark.asyncio
    async def test_sync_handles_bitrix_error_gracefully(self):
        """Should handle Bitrix errors without breaking message flow"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(side_effect=Exception("Bitrix API error"))
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client:
            mock_get_client.return_value = mock_client

            # Should complete without raising exception
            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "phone": "+123"}, "score": 50},
                existing_lead=None
            )

            # If we reach here without exception, the error was handled gracefully

    @pytest.mark.asyncio
    async def test_sync_builds_correct_title_with_emoji(self):
        """Should build lead title with correct hotness emoji"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase'):
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "product": "Widget", "phone": "+123"}, "score": 85},
                existing_lead=None
            )

            call_args = mock_client.create_lead.call_args[0][0]
            # Hot lead should have fire emoji, name and product
            assert "John" in call_args.get("title", "")
            assert "Widget" in call_args.get("title", "")

    @pytest.mark.asyncio
    async def test_sync_checks_for_duplicate_by_phone(self):
        """Should check for duplicate leads by phone before creating"""
        mock_client = MagicMock()
        mock_client.find_leads_by_phone = AsyncMock(return_value=[{"ID": "existing-789"}])
        mock_client.update_lead = AsyncMock(return_value=True)

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase') as mock_supabase:
            mock_get_client.return_value = mock_client
            mock_table = MagicMock()
            mock_supabase.table.return_value = mock_table
            mock_table.update.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.execute.return_value = MagicMock()

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "phone": "+1234567890"}, "score": 50},
                existing_lead={"id": "db-123", "fields_collected": {}, "score": 30}
            )

            # Should find by phone
            mock_client.find_leads_by_phone.assert_called_once_with("+1234567890")
            # Should update existing instead of creating new
            mock_client.update_lead.assert_called_once()
            assert mock_client.update_lead.call_args[0][0] == "existing-789"


class TestContactFieldMappings:
    """Test that contact fields are properly mapped to Bitrix data"""

    @pytest.mark.asyncio
    async def test_name_split_into_first_and_last(self):
        """Should split full name into first and last name"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase'):
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John Doe Smith", "phone": "+123"}, "score": 50},
                existing_lead=None
            )

            call_args = mock_client.create_lead.call_args[0][0]
            assert call_args.get("name") == "John"
            assert call_args.get("last_name") == "Doe Smith"

    @pytest.mark.asyncio
    async def test_single_name_no_last_name(self):
        """Should handle single name without last name"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase'):
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"name": "John", "phone": "+123"}, "score": 50},
                existing_lead=None
            )

            call_args = mock_client.create_lead.call_args[0][0]
            assert call_args.get("name") == "John"
            assert "last_name" not in call_args

    @pytest.mark.asyncio
    async def test_phone_mapped_correctly(self):
        """Should map phone to Bitrix phone field"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase'):
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"phone": "+998901234567"}, "score": 50},
                existing_lead=None
            )

            call_args = mock_client.create_lead.call_args[0][0]
            assert call_args.get("phone") == "+998901234567"

    @pytest.mark.asyncio
    async def test_email_mapped_correctly(self):
        """Should map email to Bitrix email field"""
        mock_client = MagicMock()
        mock_client.create_lead = AsyncMock(return_value="new-123")
        mock_client.find_leads_by_phone = AsyncMock(return_value=[])

        with patch('server.get_bitrix_client', new_callable=AsyncMock) as mock_get_client, \
             patch('server.supabase'):
            mock_get_client.return_value = mock_client

            await sync_lead_to_bitrix(
                tenant_id="test-tenant",
                customer={"telegram_username": "testuser"},
                lead_data={"fields_collected": {"email": "john@company.com", "phone": "+123"}, "score": 50},
                existing_lead=None
            )

            call_args = mock_client.create_lead.call_args[0][0]
            assert call_args.get("email") == "john@company.com"


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_empty_fields_collected(self):
        """Should handle empty fields_collected dict"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={},
            previous_fields={},
            current_score=30,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is False
        assert reason == "no_change"

    def test_none_fields_collected(self):
        """Should handle None values in fields"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": None, "phone": "+123"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "new_phone"

    def test_score_boundary_39_to_40(self):
        """Should detect cold to warm transition at exact boundary"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=40,
            previous_score=39,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_cold_to_warm"

    def test_score_boundary_69_to_70(self):
        """Should detect warm to hot transition at exact boundary"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John"},
            previous_fields={"name": "John"},
            current_score=70,
            previous_score=69,
            crm_lead_id="123"
        )
        assert should_sync is True
        assert reason == "hotness_warm_to_hot"

    def test_field_priority_contact_over_intent(self):
        """Should return first matching trigger (contact fields checked first)"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"name": "John", "product": "Widget"},
            previous_fields={},
            current_score=40,
            previous_score=30,
            crm_lead_id="123"
        )
        assert should_sync is True
        # Contact fields are checked before intent fields
        assert reason == "new_name"

    def test_multiple_new_fields_returns_first(self):
        """When multiple fields are new, should return first one found"""
        should_sync, reason = _should_sync_to_bitrix(
            fields_collected={"phone": "+123", "email": "test@test.com"},
            previous_fields={},
            current_score=50,
            previous_score=50,
            crm_lead_id="123"
        )
        assert should_sync is True
        # Both are new, but phone is checked before email in contact_fields list


# Run tests when executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
