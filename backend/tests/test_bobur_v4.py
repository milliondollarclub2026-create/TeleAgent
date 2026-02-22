"""
Bobur v4 tests — validates imports, conversation state, short-circuit, and fallback.
No Supabase or OpenAI calls needed for most tests (unit-level).
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch


# ── Test 1: Module imports cleanly ───────────────────────────────────────

class TestV4Imports:
    def test_import_bobur_v4(self):
        from agents import bobur_v4
        assert hasattr(bobur_v4, "handle_chat_message")
        assert hasattr(bobur_v4, "_agentic_loop")
        assert hasattr(bobur_v4, "_try_short_circuit")
        assert hasattr(bobur_v4, "TOOL_DEFINITIONS")

    def test_import_sql_engine(self):
        from agents.sql_engine import validate_sql, execute_sql, format_sql_results_for_llm
        assert validate_sql is not None
        assert execute_sql is not None

    def test_import_conversation_state(self):
        from agents.conversation_state import ConversationState
        assert ConversationState is not None

    def test_tool_definitions_complete(self):
        from agents.bobur_v4 import TOOL_DEFINITIONS
        tool_names = {t["function"]["name"] for t in TOOL_DEFINITIONS}
        expected = {"run_sql", "get_metric", "get_overview", "list_alerts",
                    "get_recommendations", "design_chart", "respond"}
        assert tool_names == expected


# ── Test 2: Conversation state serialization ─────────────────────────────

class TestConversationState:
    def test_default_state(self):
        from agents.conversation_state import ConversationState
        state = ConversationState()
        assert state.turn_count == 0
        assert state.last_sql is None

    def test_roundtrip(self):
        from agents.conversation_state import ConversationState
        state = ConversationState(
            last_sql="SELECT * FROM crm_deals",
            last_tool="run_sql",
            last_result_summary="Found 42 deals",
            last_entity="crm_deals",
            turn_count=3,
        )
        d = state.to_dict()
        restored = ConversationState.from_dict(d)
        assert restored.last_sql == "SELECT * FROM crm_deals"
        assert restored.turn_count == 3
        assert restored.last_tool == "run_sql"

    def test_from_none(self):
        from agents.conversation_state import ConversationState
        state = ConversationState.from_dict(None)
        assert state.turn_count == 0

    def test_from_empty_dict(self):
        from agents.conversation_state import ConversationState
        state = ConversationState.from_dict({})
        assert state.turn_count == 0

    def test_for_prompt_empty(self):
        from agents.conversation_state import ConversationState
        state = ConversationState()
        assert state.for_prompt() == ""

    def test_for_prompt_with_data(self):
        from agents.conversation_state import ConversationState
        state = ConversationState(
            last_sql="SELECT COUNT(*) FROM crm_deals",
            last_tool="run_sql",
            turn_count=2,
        )
        prompt = state.for_prompt()
        assert "Turn #2" in prompt
        assert "run_sql" in prompt
        assert "SELECT COUNT" in prompt


# ── Test 3: Short-circuit pattern matching ───────────────────────────────

class TestShortCircuitPatterns:
    """Test that KPI and overview patterns match correctly."""

    def test_kpi_patterns_match(self):
        from agents.bobur_v4 import _KPI_SHORT_CIRCUITS
        import re

        test_cases = [
            ("how many deals do I have", "total_deals"),
            ("total leads", "total_leads"),
            ("count contacts", "total_contacts"),
            ("how many companies", "total_companies"),
            ("total activities", "total_activities"),
            ("average deal size", "avg_deal_value"),
        ]
        for msg, expected_key in test_cases:
            matched = False
            for pattern, kpi_key in _KPI_SHORT_CIRCUITS:
                if re.search(pattern, msg.lower()):
                    assert kpi_key == expected_key, f"'{msg}' matched {kpi_key} instead of {expected_key}"
                    matched = True
                    break
            assert matched, f"'{msg}' did not match any short-circuit pattern"

    def test_overview_patterns_match(self):
        from agents.bobur_v4 import _OVERVIEW_PATTERNS
        import re

        test_cases = [
            "how is my pipeline",
            "revenue overview",
            "how is my business doing",
            "pipeline health",
        ]
        for msg in test_cases:
            matched = any(re.search(p, msg.lower()) for p in _OVERVIEW_PATTERNS)
            assert matched, f"'{msg}' did not match overview patterns"

    def test_non_matching_messages(self):
        """Complex queries should NOT short-circuit."""
        from agents.bobur_v4 import _KPI_SHORT_CIRCUITS, _OVERVIEW_PATTERNS
        import re

        test_cases = [
            "show me deals with contacts from Acme",
            "which rep has the most won deals",
            "compare Q1 vs Q2 pipeline",
            "what's the conversion rate by source",
        ]
        for msg in test_cases:
            kpi_match = any(re.search(p, msg.lower()) for p, _ in _KPI_SHORT_CIRCUITS)
            overview_match = any(re.search(p, msg.lower()) for p in _OVERVIEW_PATTERNS)
            assert not kpi_match and not overview_match, f"'{msg}' should not short-circuit"


# ── Test 4: System prompt builder ────────────────────────────────────────

class TestSystemPrompt:
    def test_system_prompt_contains_schema(self):
        from agents.bobur_v4 import _build_system_prompt
        from agents.conversation_state import ConversationState

        class FakeSchemaCtx:
            def for_query_prompt(self):
                return "crm_deals (100 records):\n  title (text)"
            def get_join_hints(self):
                return "JOINs:\ncrm_deals.contact_id → crm_contacts.external_id"

        prompt = _build_system_prompt(FakeSchemaCtx(), "Test CRM", ConversationState())
        assert "Bobur" in prompt
        assert "crm_deals" in prompt
        assert "JOINs" in prompt
        assert "run_sql" in prompt or "respond" in prompt

    def test_system_prompt_includes_conversation_state(self):
        from agents.bobur_v4 import _build_system_prompt
        from agents.conversation_state import ConversationState

        class FakeSchemaCtx:
            def for_query_prompt(self):
                return "crm_deals"
            def get_join_hints(self):
                return "JOINs: none"

        state = ConversationState(last_sql="SELECT * FROM crm_deals", turn_count=2)
        prompt = _build_system_prompt(FakeSchemaCtx(), "", state)
        assert "Turn #2" in prompt
        assert "SELECT * FROM crm_deals" in prompt


# ── Test 5: Bobur v3 fallback still works ────────────────────────────────

class TestV3Fallback:
    def test_bobur_still_has_handle_chat_message(self):
        from agents.bobur import handle_chat_message
        assert handle_chat_message is not None

    def test_legacy_handler_exists(self):
        from agents.bobur import _legacy_handle_chat_message
        assert _legacy_handle_chat_message is not None

    def test_route_message_unchanged(self):
        from agents.bobur import route_message
        assert route_message is not None


# ── Test 6: Schema context join hints ────────────────────────────────────

class TestSchemaContextExtensions:
    def test_get_join_hints(self):
        from agents.schema_context import SchemaContext, FieldInfo
        from agents import SchemaProfile, EntityProfile, FieldProfile

        sp = SchemaProfile(tenant_id="t1", crm_source="bitrix24", entities=[])
        ctx = SchemaContext(
            schema=sp,
            entities={},
            record_counts={},
            allowed_fields={"crm_deals": ["title"]},
        )
        hints = ctx.get_join_hints()
        assert "JOINs:" in hints
        assert "crm_deals.contact_id" in hints
        assert "crm_contacts.external_id" in hints

    def test_for_query_prompt_scoped(self):
        from agents.schema_context import SchemaContext, FieldInfo
        from agents import SchemaProfile

        sp = SchemaProfile(tenant_id="t1", crm_source="bitrix24", entities=[])
        ctx = SchemaContext(
            schema=sp,
            entities={
                "crm_deals": [FieldInfo("title", "text"), FieldInfo("value", "numeric")],
                "crm_contacts": [FieldInfo("name", "text")],
            },
            record_counts={"crm_deals": 100, "crm_contacts": 50},
            allowed_fields={"crm_deals": ["title", "value"], "crm_contacts": ["name"]},
        )
        # Scoped to deals only
        text = ctx.for_query_prompt_scoped(["crm_deals"])
        assert "crm_deals" in text
        assert "crm_contacts" not in text

        # Scoped to both
        text = ctx.for_query_prompt_scoped(["crm_deals", "crm_contacts"])
        assert "crm_deals" in text
        assert "crm_contacts" in text

        # None → all
        text = ctx.for_query_prompt_scoped(None)
        assert "crm_deals" in text
        assert "crm_contacts" in text


# ── Test 7: Tool definitions format ──────────────────────────────────────

class TestToolDefinitions:
    def test_all_tools_have_required_fields(self):
        from agents.bobur_v4 import TOOL_DEFINITIONS
        for tool in TOOL_DEFINITIONS:
            assert tool["type"] == "function"
            fn = tool["function"]
            assert "name" in fn
            assert "description" in fn
            assert "parameters" in fn
            assert fn["parameters"]["type"] == "object"

    def test_respond_tool_has_reply_required(self):
        from agents.bobur_v4 import TOOL_DEFINITIONS
        respond = next(t for t in TOOL_DEFINITIONS if t["function"]["name"] == "respond")
        assert "reply" in respond["function"]["parameters"]["required"]

    def test_run_sql_has_sql_required(self):
        from agents.bobur_v4 import TOOL_DEFINITIONS
        run_sql = next(t for t in TOOL_DEFINITIONS if t["function"]["name"] == "run_sql")
        assert "sql" in run_sql["function"]["parameters"]["required"]
