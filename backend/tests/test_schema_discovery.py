"""
Tests for Schema Discovery: SchemaProfile models, discover_schema(), load_allowed_fields().
No Supabase or API calls needed — all mocked.
"""

import pytest
import time
from unittest.mock import MagicMock, AsyncMock, patch

from agents import SchemaProfile, EntityProfile, FieldProfile
from agents.anvar import (
    load_allowed_fields,
    DEFAULT_ALLOWED_FIELDS,
    _field_cache,
    FIELD_CACHE_TTL,
)


# ── Model tests ──────────────────────────────────────────────────────────

class TestSchemaModels:
    def test_field_profile_defaults(self):
        fp = FieldProfile(field_name="status", field_type="text")
        assert fp.fill_rate == 1.0
        assert fp.distinct_count == 0
        assert fp.sample_values == []
        assert fp.semantic_role is None

    def test_field_profile_full(self):
        fp = FieldProfile(
            field_name="value",
            field_type="numeric",
            fill_rate=0.85,
            distinct_count=42,
            sample_values=["100", "200", "300"],
            semantic_role="amount_field",
        )
        assert fp.field_name == "value"
        assert fp.semantic_role == "amount_field"

    def test_entity_profile_defaults(self):
        ep = EntityProfile(entity="deals")
        assert ep.record_count == 0
        assert ep.fields == []
        assert ep.business_label == ""

    def test_entity_profile_with_fields(self):
        fp = FieldProfile(field_name="stage", field_type="text", fill_rate=0.95)
        ep = EntityProfile(
            entity="deals",
            record_count=150,
            fields=[fp],
            business_label="Opportunities",
        )
        assert len(ep.fields) == 1
        assert ep.business_label == "Opportunities"

    def test_schema_profile_defaults(self):
        sp = SchemaProfile(tenant_id="t1", crm_source="bitrix24")
        assert sp.business_type == "unknown"
        assert sp.entities == []
        assert sp.suggested_goals == []
        assert sp.data_quality_score == 0.0
        assert sp.stage_field is None

    def test_schema_profile_full(self):
        fp = FieldProfile(field_name="stage", field_type="text")
        ep = EntityProfile(entity="deals", record_count=50, fields=[fp])
        sp = SchemaProfile(
            tenant_id="t1",
            crm_source="bitrix24",
            business_type="sales",
            business_summary="B2B sales company",
            entities=[ep],
            suggested_goals=[{"id": "pipeline_health", "label": "Pipeline Health"}],
            data_quality_score=0.85,
            stage_field="stage",
            amount_field="value",
            owner_field="assigned_to",
            currency="USD",
            entity_labels={"deals": "Opportunities"},
        )
        assert sp.business_type == "sales"
        assert len(sp.entities) == 1
        assert sp.currency == "USD"


# ── load_allowed_fields tests ────────────────────────────────────────────

class MockSupabaseQuery:
    """Mock for supabase.table().select().eq().eq().execute() chain."""

    def __init__(self, data=None):
        self._data = data

    def table(self, name):
        return self

    def select(self, fields):
        return self

    def eq(self, field, value):
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        return result


class TestLoadAllowedFields:
    def setup_method(self):
        """Clear cache before each test."""
        _field_cache.clear()

    @pytest.mark.asyncio
    async def test_empty_registry_returns_defaults(self):
        """When crm_field_registry is empty, return DEFAULT_ALLOWED_FIELDS."""
        mock_sb = MockSupabaseQuery(data=[])
        result = await load_allowed_fields(mock_sb, "t1", "bitrix24")
        assert result is DEFAULT_ALLOWED_FIELDS

    @pytest.mark.asyncio
    async def test_populated_registry(self):
        """When registry has data, return grouped fields."""
        mock_sb = MockSupabaseQuery(data=[
            {"entity": "leads", "field_name": "status"},
            {"entity": "leads", "field_name": "source"},
            {"entity": "deals", "field_name": "stage"},
            {"entity": "deals", "field_name": "value"},
        ])
        result = await load_allowed_fields(mock_sb, "t1", "bitrix24")

        assert "crm_leads" in result
        assert "crm_deals" in result
        assert "status" in result["crm_leads"]
        assert "source" in result["crm_leads"]
        assert "stage" in result["crm_deals"]
        assert "value" in result["crm_deals"]

    @pytest.mark.asyncio
    async def test_cache_hit(self):
        """Second call within TTL should return cached result without querying."""
        mock_sb = MockSupabaseQuery(data=[
            {"entity": "leads", "field_name": "status"},
        ])

        # First call populates cache
        result1 = await load_allowed_fields(mock_sb, "t1", "bitrix24")
        assert "crm_leads" in result1

        # Modify mock to return different data
        mock_sb2 = MockSupabaseQuery(data=[
            {"entity": "deals", "field_name": "stage"},
        ])

        # Second call should return cached result (not new data)
        result2 = await load_allowed_fields(mock_sb2, "t1", "bitrix24")
        assert "crm_leads" in result2  # Still has cached leads data

    @pytest.mark.asyncio
    async def test_cache_expiry(self):
        """After TTL expires, should re-query."""
        mock_sb = MockSupabaseQuery(data=[
            {"entity": "leads", "field_name": "status"},
        ])
        result1 = await load_allowed_fields(mock_sb, "t1", "bitrix24")

        # Manually expire cache
        _field_cache[("t1", "bitrix24")] = (
            _field_cache[("t1", "bitrix24")][0],
            time.time() - FIELD_CACHE_TTL - 1,
        )

        mock_sb2 = MockSupabaseQuery(data=[
            {"entity": "deals", "field_name": "stage"},
        ])
        result2 = await load_allowed_fields(mock_sb2, "t1", "bitrix24")
        assert "crm_deals" in result2  # Got fresh data

    @pytest.mark.asyncio
    async def test_exception_returns_defaults(self):
        """On error, return DEFAULT_ALLOWED_FIELDS."""
        mock_sb = MagicMock()
        mock_sb.table.side_effect = Exception("DB error")
        result = await load_allowed_fields(mock_sb, "t1", "bitrix24")
        assert result is DEFAULT_ALLOWED_FIELDS


# ── discover_schema tests (mocked GPT-4o) ──────────────────────────────

class TestDiscoverSchema:
    @pytest.mark.asyncio
    async def test_fallback_on_empty_registry(self):
        """When no field registry data, return fallback schema."""
        from agents.farid import discover_schema

        mock_sb = MockSupabaseQuery(data=[])
        result = await discover_schema(mock_sb, "t1", "bitrix24")

        assert isinstance(result, SchemaProfile)
        assert result.business_type == "unknown"
        assert result.entities == []

    @pytest.mark.asyncio
    async def test_fallback_on_exception(self):
        """On any exception, return fallback schema."""
        from agents.farid import discover_schema

        mock_sb = MagicMock()
        mock_sb.table.side_effect = Exception("DB error")
        result = await discover_schema(mock_sb, "t1", "bitrix24")

        assert isinstance(result, SchemaProfile)
        assert result.business_type == "unknown"

    def test_fallback_schema(self):
        """Verify _fallback_schema returns valid SchemaProfile."""
        from agents.farid import _fallback_schema

        result = _fallback_schema("t1", "bitrix24")
        assert isinstance(result, SchemaProfile)
        assert result.tenant_id == "t1"
        assert result.crm_source == "bitrix24"
        assert result.business_type == "unknown"

    def test_build_entities_summary(self):
        """Verify _build_entities_summary groups fields correctly."""
        from agents.farid import _build_entities_summary

        field_rows = [
            {"entity": "leads", "field_name": "status", "field_type": "text",
             "null_rate": 0.1, "distinct_count": 5, "sample_values": ["NEW", "WON"]},
            {"entity": "leads", "field_name": "value", "field_type": "numeric",
             "null_rate": 0.3, "distinct_count": 20, "sample_values": ["100", "200"]},
            {"entity": "deals", "field_name": "stage", "field_type": "text",
             "null_rate": 0.0, "distinct_count": 8, "sample_values": ["NEW", "PROPOSAL"]},
        ]
        record_counts = {"leads": 100, "deals": 50}

        result = _build_entities_summary(field_rows, record_counts)
        assert len(result) == 2

        leads_summary = next(e for e in result if e["entity"] == "leads")
        assert leads_summary["record_count"] == 100
        assert len(leads_summary["fields"]) == 2

    def test_parse_discovery_result(self):
        """Verify _parse_discovery_result builds correct SchemaProfile."""
        from agents.farid import _parse_discovery_result

        gpt_result = {
            "business_type": "sales",
            "business_summary": "B2B sales company",
            "entity_labels": {"leads": "Prospects", "deals": "Opportunities"},
            "field_roles": [
                {"entity": "deals", "field_name": "stage", "semantic_role": "status_field"},
            ],
            "stage_field": "stage",
            "amount_field": "value",
            "owner_field": "assigned_to",
            "currency": "USD",
            "suggested_goals": [{"id": "pipeline_health", "label": "Pipeline Health"}],
            "data_quality_score": 0.8,
        }

        field_rows = [
            {"entity": "deals", "field_name": "stage", "field_type": "text",
             "null_rate": 0.0, "distinct_count": 8, "sample_values": ["NEW"]},
        ]
        record_counts = {"deals": 50}

        result = _parse_discovery_result("t1", "bitrix24", gpt_result, field_rows, record_counts)

        assert isinstance(result, SchemaProfile)
        assert result.business_type == "sales"
        assert result.stage_field == "stage"
        assert result.currency == "USD"
        assert len(result.entities) == 1
        assert result.entities[0].entity == "deals"
        assert result.entities[0].fields[0].semantic_role == "status_field"
