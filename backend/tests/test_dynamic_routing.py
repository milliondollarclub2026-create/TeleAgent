"""
Phase 3 Tests — Dynamic Routing
================================
Tests for dynamic patterns from entity_labels, record_query routing,
backward-compat deal_query, and classifier prompt generation.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.bobur import (
    _build_dynamic_patterns,
    _build_classifier_prompt,
    route_message,
    _CATALOG_METRIC_KEYS,
)


class TestBuildDynamicPatterns:
    """Test _build_dynamic_patterns generates regex patterns from entity_labels."""

    def test_generates_patterns_for_custom_labels(self):
        labels = {"deals": "Enrollments", "leads": "Inquiries"}
        patterns = _build_dynamic_patterns(labels)
        assert len(patterns) > 0
        # Should generate patterns for both entities
        entities = {p[2] for p in patterns}
        assert "deals" in entities
        assert "leads" in entities

    def test_skip_when_label_equals_entity(self):
        labels = {"deals": "deals"}
        patterns = _build_dynamic_patterns(labels)
        assert len(patterns) == 0

    def test_empty_labels_returns_empty(self):
        patterns = _build_dynamic_patterns({})
        assert patterns == []

    def test_none_labels_returns_empty(self):
        patterns = _build_dynamic_patterns(None)
        assert patterns == []

    def test_pattern_matches_show_enrollments(self):
        import re
        labels = {"deals": "Enrollments"}
        patterns = _build_dynamic_patterns(labels)
        record_patterns = [(p, e) for p, intent, e in patterns if intent == "record_query"]
        assert len(record_patterns) > 0
        pat, entity = record_patterns[0]
        # "show me enrollments" — "me" is between show and enrollments
        assert re.search(pat, "show me enrollments")
        # "list enrollments" — direct match
        assert re.search(pat, "list enrollments")
        assert entity == "deals"

    def test_pattern_matches_count_inquiries(self):
        import re
        labels = {"leads": "Inquiries"}
        patterns = _build_dynamic_patterns(labels)
        kpi_patterns = [(p, e) for p, intent, e in patterns if intent == "kpi_query"]
        assert len(kpi_patterns) > 0
        pat, entity = kpi_patterns[0]
        assert re.search(pat, "how many inquiries")
        assert entity == "leads"


class TestBuildClassifierPrompt:
    """Test _build_classifier_prompt generates dynamic LLM prompts."""

    def test_includes_entity_labels(self):
        prompt = _build_classifier_prompt(
            entity_labels={"deals": "Properties", "leads": "Listings"},
        )
        assert "Properties" in prompt
        assert "Listings" in prompt
        assert "deals=Properties" in prompt

    def test_includes_metric_keys(self):
        prompt = _build_classifier_prompt(
            metric_keys=["custom_metric_1", "custom_metric_2"],
        )
        assert "custom_metric_1" in prompt
        assert "custom_metric_2" in prompt

    def test_uses_default_metrics_when_none(self):
        prompt = _build_classifier_prompt()
        assert "pipeline_value" in prompt

    def test_includes_record_query_intent(self):
        prompt = _build_classifier_prompt()
        assert "record_query" in prompt


class TestRouteMessageDynamic:
    """Test route_message with dynamic entity_labels."""

    @pytest.mark.asyncio
    async def test_deals_still_works_without_labels(self):
        # "which deals" matches DEAL_QUERY_PATTERNS
        result = await route_message("which deals are in proposal stage")
        assert result.intent in ("deal_query", "record_query")

    @pytest.mark.asyncio
    async def test_deals_works_with_labels(self):
        result = await route_message(
            "which deals are stalling",
            entity_labels={"deals": "Deals"},
        )
        assert result.intent in ("deal_query", "record_query")

    @pytest.mark.asyncio
    async def test_enrollments_routes_to_record_query(self):
        result = await route_message(
            "list enrollments",
            entity_labels={"deals": "Enrollments"},
        )
        assert result.intent == "record_query"
        assert result.filters.get("entity") == "deals"

    @pytest.mark.asyncio
    async def test_overview_still_works(self):
        result = await route_message(
            "how is my pipeline doing?",
            entity_labels={"deals": "Enrollments"},
        )
        assert result.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_alerts_still_works(self):
        result = await route_message(
            "any risks or alerts?",
            entity_labels={"deals": "Enrollments"},
        )
        assert result.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_insight_still_works(self):
        result = await route_message(
            "what should I focus on?",
            entity_labels={"deals": "Enrollments"},
        )
        assert result.intent == "insight_query"

    @pytest.mark.asyncio
    async def test_count_custom_entity(self):
        result = await route_message(
            "how many properties",
            entity_labels={"deals": "Properties"},
        )
        assert result.intent == "kpi_query"
        assert result.filters.get("kpi_pattern") == "total_deals"
