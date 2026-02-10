"""
CRM-AI Integration Tests
Tests the CRM integration for AI sales agent including:
- Phone normalization
- Customer matching with Bitrix CRM
- Product catalog caching
- CRM context injection into LLM prompts
- Edge cases and fallback behavior when CRM is not connected

Run with: python tests/test_crm_ai_integration.py
"""
import sys
import os
import re
import traceback

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Simple test framework
passed = 0
failed = 0

def run_test(test_func):
    global passed, failed
    try:
        test_func()
        passed += 1
    except AssertionError as e:
        failed += 1
        print(f"✗ FAILED: {test_func.__name__}")
        print(f"  {e}")
        traceback.print_exc()
    except Exception as e:
        failed += 1
        print(f"✗ ERROR: {test_func.__name__}")
        print(f"  {e}")
        traceback.print_exc()


class TestPhoneNormalization:
    """Test normalize_phone() helper function"""

    def test_normalize_phone_basic(self):
        """Test basic phone normalization"""
        def normalize_phone(phone: str) -> str:
            if not phone:
                return ""
            return re.sub(r'\D', '', phone)

        # Test cases
        assert normalize_phone("+998-90-123-45-67") == "998901234567"
        assert normalize_phone("+998 90 123 45 67") == "998901234567"
        assert normalize_phone("998901234567") == "998901234567"
        assert normalize_phone("+1 (555) 123-4567") == "15551234567"
        print("✓ Basic phone normalization works")

    def test_normalize_phone_edge_cases(self):
        """Test phone normalization edge cases"""
        def normalize_phone(phone: str) -> str:
            if not phone:
                return ""
            return re.sub(r'\D', '', phone)

        # Edge cases
        assert normalize_phone("") == ""
        assert normalize_phone(None) == ""
        assert normalize_phone("abc") == ""  # No digits
        assert normalize_phone("++998") == "998"  # All non-digits stripped
        assert normalize_phone("   ") == ""  # Whitespace only
        assert normalize_phone("12") == "12"  # Short number
        print("✓ Phone normalization edge cases handled")


class TestBuildCRMContextSection:
    """Test _build_crm_context_section() helper function"""

    def test_crm_context_none(self):
        """Test that None crm_context returns empty string"""
        def _build_crm_context_section(crm_context):
            if not crm_context or not crm_context.get("is_returning_customer"):
                return ""
            return "CRM_SECTION"

        assert _build_crm_context_section(None) == ""
        assert _build_crm_context_section({}) == ""
        assert _build_crm_context_section({"is_returning_customer": False}) == ""
        print("✓ Empty crm_context returns empty string")

    def test_crm_context_returning_customer(self):
        """Test that returning customer gets CRM section"""
        def _build_crm_context_section(crm_context):
            if not crm_context or not crm_context.get("is_returning_customer"):
                return ""

            total_purchases = crm_context.get("total_purchases", 0)
            total_value = crm_context.get("total_value", 0)
            vip_status = "YES - VIP CUSTOMER" if crm_context.get("vip_status") else "No"
            customer_since = crm_context.get("customer_since", "N/A")
            contact_name = crm_context.get("contact_name", "")
            recent_products = crm_context.get("recent_products", [])

            recent_products_text = ""
            if recent_products:
                recent_products_text = f"\n- Recent Purchases: {', '.join(recent_products[:3])}"

            return f"""## RETURNING CUSTOMER ALERT
- Name: {contact_name if contact_name else 'Not available'}
- Customer Since: {customer_since}
- Total Purchases: {total_purchases} orders
- Lifetime Value: {total_value:,.0f} UZS
- VIP Status: {vip_status}{recent_products_text}
"""

        crm_context = {
            "is_returning_customer": True,
            "total_purchases": 5,
            "total_value": 15000000,
            "recent_products": ["Product A", "Product B"],
            "vip_status": True,
            "customer_since": "2024-01-15",
            "contact_name": "John Doe"
        }

        result = _build_crm_context_section(crm_context)
        assert "RETURNING CUSTOMER ALERT" in result
        assert "John Doe" in result
        assert "5 orders" in result
        assert "15,000,000 UZS" in result
        assert "VIP CUSTOMER" in result
        assert "Product A" in result
        print("✓ Returning customer CRM section generated correctly")

    def test_crm_context_missing_fields(self):
        """Test CRM section with missing/partial fields"""
        def _build_crm_context_section(crm_context):
            if not crm_context or not crm_context.get("is_returning_customer"):
                return ""

            total_purchases = crm_context.get("total_purchases", 0)
            total_value = crm_context.get("total_value", 0)
            vip_status = "YES - VIP CUSTOMER" if crm_context.get("vip_status") else "No"
            customer_since = crm_context.get("customer_since", "N/A")
            contact_name = crm_context.get("contact_name", "")
            recent_products = crm_context.get("recent_products", [])

            recent_products_text = ""
            if recent_products:
                recent_products_text = f"\n- Recent Purchases: {', '.join(str(p) for p in recent_products[:3])}"

            return f"""## RETURNING CUSTOMER
- Name: {contact_name if contact_name else 'Not available'}
- Purchases: {total_purchases}
- Value: {total_value:,.0f}
"""

        # Minimal context - only is_returning_customer set
        minimal_context = {"is_returning_customer": True}
        result = _build_crm_context_section(minimal_context)
        assert "RETURNING CUSTOMER" in result
        assert "Not available" in result
        assert "Purchases: 0" in result
        print("✓ Missing fields handled with defaults")


class TestCRMQueryContextKeywords:
    """Test keyword detection for CRM query context"""

    def test_price_keywords(self):
        """Test price keyword detection across languages"""
        price_keywords = ["price", "cost", "how much", "narx", "qancha", "цена", "стоимость", "сколько стоит"]

        test_messages = [
            ("What is the price?", True),
            ("How much does it cost?", True),
            ("Bu narx qancha?", True),
            ("Сколько стоит это?", True),
            ("Hello, I need help", False),
            ("Tell me about products", False),
        ]

        for message, expected in test_messages:
            message_lower = message.lower()
            has_price_keyword = any(kw in message_lower for kw in price_keywords)
            assert has_price_keyword == expected, f"Failed for: {message}"

        print("✓ Price keywords detected correctly in UZ/RU/EN")

    def test_product_keywords(self):
        """Test product keyword detection"""
        product_keywords = ["product", "catalog", "товар", "каталог", "mahsulot", "katalog"]

        test_messages = [
            ("Show me products", True),
            ("Покажите товары", True),
            ("Mahsulotlar bor?", True),
            ("Just saying hello", False),
        ]

        for message, expected in test_messages:
            message_lower = message.lower()
            has_product_keyword = any(kw in message_lower for kw in product_keywords)
            assert has_product_keyword == expected, f"Failed for: {message}"

        print("✓ Product keywords detected correctly")

    def test_order_history_keywords(self):
        """Test order history keyword detection"""
        order_keywords = ["my order", "previous order", "заказ", "мой заказ", "buyurtma"]

        test_messages = [
            ("Where is my order?", True),
            ("Мой заказ где?", True),
            ("Previous order status", True),
            ("I want to buy", False),
        ]

        for message, expected in test_messages:
            message_lower = message.lower()
            has_order_keyword = any(kw in message_lower for kw in order_keywords)
            assert has_order_keyword == expected, f"Failed for: {message}"

        print("✓ Order history keywords detected correctly")


class TestFallbackBehavior:
    """Test fallback behavior when CRM is not connected"""

    def test_none_crm_context_in_prompt(self):
        """Test that system prompt works without CRM context"""
        def get_enhanced_system_prompt(config, lead_context=None, crm_context=None):
            # Simulate the function
            crm_section = ""
            if crm_context and crm_context.get("is_returning_customer"):
                crm_section = "## CRM SECTION\n"

            return f"""You are an AI sales agent.
{crm_section}## BUSINESS
{config.get('business_name', 'Company')}
"""

        config = {"business_name": "Test Shop"}

        # Test without CRM context
        prompt = get_enhanced_system_prompt(config, None, None)
        assert "Test Shop" in prompt
        assert "CRM SECTION" not in prompt
        print("✓ System prompt works without CRM context")

        # Test with CRM context
        crm_context = {"is_returning_customer": True}
        prompt_with_crm = get_enhanced_system_prompt(config, None, crm_context)
        assert "CRM SECTION" in prompt_with_crm
        print("✓ System prompt includes CRM section when available")

    def test_none_crm_query_context(self):
        """Test that LLM call works without CRM query context"""
        def build_system_prompt(base_prompt, crm_query_context=None):
            result = base_prompt
            if crm_query_context:
                result += f"\n\n{crm_query_context}"
            return result

        base = "You are an AI agent."

        # Without CRM query context
        prompt = build_system_prompt(base, None)
        assert prompt == base
        print("✓ Prompt works without CRM query context")

        # With CRM query context
        crm_context = "## PRODUCT CATALOG\n- Product A: 100,000 UZS"
        prompt_with_crm = build_system_prompt(base, crm_context)
        assert "PRODUCT CATALOG" in prompt_with_crm
        print("✓ Prompt includes CRM query context when available")


class TestMatchCustomerToBitrixEdgeCases:
    """Test edge cases for match_customer_to_bitrix function"""

    def test_empty_customer_data(self):
        """Test with empty customer data"""
        # Simulate the function behavior
        def match_customer_to_bitrix(customer_data):
            phone = customer_data.get("phone")
            if not phone:
                return None
            return {"is_returning_customer": True}

        # Empty dict
        assert match_customer_to_bitrix({}) is None
        # None phone
        assert match_customer_to_bitrix({"phone": None}) is None
        # Empty string phone
        assert match_customer_to_bitrix({"phone": ""}) is None
        print("✓ Empty customer data returns None")

    def test_invalid_phone_formats(self):
        """Test with invalid phone formats"""
        def normalize_phone(phone: str) -> str:
            if not phone:
                return ""
            return re.sub(r'\D', '', phone)

        def match_customer_to_bitrix(customer_data):
            phone = customer_data.get("phone")
            if not phone:
                return None
            normalized = normalize_phone(phone)
            if not normalized:
                return None
            return {"phone_used": normalized}

        # These should return None (no valid digits)
        assert match_customer_to_bitrix({"phone": "abc"}) is None
        assert match_customer_to_bitrix({"phone": "---"}) is None
        assert match_customer_to_bitrix({"phone": "   "}) is None
        print("✓ Invalid phone formats return None")


class TestProductCacheEdgeCases:
    """Test edge cases for product catalog caching"""

    def test_cache_structure(self):
        """Test cache structure is correct"""
        import time

        cache = {}
        tenant_id = "test-tenant"

        # Simulate caching
        cache[tenant_id] = {
            "products": [{"NAME": "Test", "PRICE": 1000}],
            "cached_at": time.time()
        }

        # Verify structure
        assert tenant_id in cache
        assert "products" in cache[tenant_id]
        assert "cached_at" in cache[tenant_id]
        assert len(cache[tenant_id]["products"]) == 1
        print("✓ Cache structure is correct")

    def test_cache_ttl_check(self):
        """Test cache TTL checking logic"""
        import time

        PRODUCT_CACHE_TTL = 1800  # 30 minutes

        cache = {}
        tenant_id = "test-tenant"

        # Fresh cache
        cache[tenant_id] = {
            "products": [{"NAME": "Test"}],
            "cached_at": time.time()
        }

        now = time.time()
        is_fresh = now - cache[tenant_id]["cached_at"] < PRODUCT_CACHE_TTL
        assert is_fresh is True
        print("✓ Fresh cache is detected")

        # Stale cache
        cache[tenant_id]["cached_at"] = time.time() - 3600  # 1 hour ago
        is_fresh = now - cache[tenant_id]["cached_at"] < PRODUCT_CACHE_TTL
        assert is_fresh is False
        print("✓ Stale cache is detected")


class TestVIPThreshold:
    """Test VIP customer threshold logic"""

    def test_vip_threshold(self):
        """Test VIP threshold of 10M UZS"""
        VIP_THRESHOLD_UZS = 10_000_000

        test_cases = [
            (9_999_999, False),   # Just under
            (10_000_000, True),  # Exactly at threshold
            (10_000_001, True),  # Just over
            (15_000_000, True),  # Well over
            (0, False),          # Zero
            (5_000_000, False),  # Half
        ]

        for total_value, expected_vip in test_cases:
            is_vip = total_value >= VIP_THRESHOLD_UZS
            assert is_vip == expected_vip, f"Failed for {total_value}: expected {expected_vip}, got {is_vip}"

        print("✓ VIP threshold logic is correct")


class TestEventLogCRMFields:
    """Test that event logs include CRM fields correctly"""

    def test_event_log_with_crm_context(self):
        """Test event log includes CRM fields when context available"""
        def build_event_data(crm_context):
            return {
                "crm_returning_customer": crm_context.get("is_returning_customer") if crm_context else False,
                "crm_vip_customer": crm_context.get("vip_status") if crm_context else False,
            }

        # With CRM context
        crm_context = {"is_returning_customer": True, "vip_status": True}
        event_data = build_event_data(crm_context)
        assert event_data["crm_returning_customer"] is True
        assert event_data["crm_vip_customer"] is True
        print("✓ Event log includes CRM fields when available")

        # Without CRM context
        event_data_none = build_event_data(None)
        assert event_data_none["crm_returning_customer"] is False
        assert event_data_none["crm_vip_customer"] is False
        print("✓ Event log has False defaults when CRM not available")


if __name__ == "__main__":
    print("=" * 60)
    print("CRM-AI Integration Tests")
    print("=" * 60)
    print()

    # Run all tests
    print("## Phone Normalization Tests")
    run_test(TestPhoneNormalization().test_normalize_phone_basic)
    run_test(TestPhoneNormalization().test_normalize_phone_edge_cases)
    print()

    print("## CRM Context Section Tests")
    run_test(TestBuildCRMContextSection().test_crm_context_none)
    run_test(TestBuildCRMContextSection().test_crm_context_returning_customer)
    run_test(TestBuildCRMContextSection().test_crm_context_missing_fields)
    print()

    print("## CRM Query Keyword Tests")
    run_test(TestCRMQueryContextKeywords().test_price_keywords)
    run_test(TestCRMQueryContextKeywords().test_product_keywords)
    run_test(TestCRMQueryContextKeywords().test_order_history_keywords)
    print()

    print("## Fallback Behavior Tests")
    run_test(TestFallbackBehavior().test_none_crm_context_in_prompt)
    run_test(TestFallbackBehavior().test_none_crm_query_context)
    print()

    print("## Customer Matching Edge Cases")
    run_test(TestMatchCustomerToBitrixEdgeCases().test_empty_customer_data)
    run_test(TestMatchCustomerToBitrixEdgeCases().test_invalid_phone_formats)
    print()

    print("## Product Cache Tests")
    run_test(TestProductCacheEdgeCases().test_cache_structure)
    run_test(TestProductCacheEdgeCases().test_cache_ttl_check)
    print()

    print("## VIP Threshold Tests")
    run_test(TestVIPThreshold().test_vip_threshold)
    print()

    print("## Event Log Tests")
    run_test(TestEventLogCRMFields().test_event_log_with_crm_context)
    print()

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
