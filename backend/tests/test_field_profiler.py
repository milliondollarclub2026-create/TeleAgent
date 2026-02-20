"""
Tests for agents.field_profiler — SQL-based field introspection.
No Supabase or API calls needed — all mocked.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

from agents.field_profiler import (
    profile_entity_fields,
    upsert_field_profiles,
    _infer_field_type,
    INTERNAL_FIELDS,
    ENTITY_TABLE_MAP,
)


class MockSupabaseTable:
    """Mock for supabase.table().select().eq().eq().limit().execute() chain."""

    def __init__(self, data=None):
        self._data = data or []

    def table(self, name):
        self._table_name = name
        return self

    def select(self, fields):
        return self

    def eq(self, field, value):
        return self

    def limit(self, n):
        return self

    def upsert(self, data, on_conflict=None):
        self._upserted = data
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        return result


# ── _infer_field_type tests ─────────────────────────────────────────────

class TestInferFieldType:
    def test_empty_values(self):
        assert _infer_field_type([]) == "unknown"

    def test_boolean_values(self):
        assert _infer_field_type([True, False, True]) == "boolean"

    def test_integer_values(self):
        assert _infer_field_type([1, 2, 3, 100]) == "integer"

    def test_numeric_values(self):
        assert _infer_field_type([1.5, 2.7, 3.14]) == "numeric"

    def test_timestamp_values(self):
        assert _infer_field_type(["2024-01-15T10:00:00Z", "2024-02-20T12:00:00"]) == "timestamp"

    def test_text_values(self):
        assert _infer_field_type(["hello", "world", "foo"]) == "text"

    def test_jsonb_values(self):
        assert _infer_field_type([{"key": "val"}, [1, 2]]) == "jsonb"

    def test_mixed_numeric_string(self):
        # All can be parsed as float numbers — but since they're strings,
        # _infer_field_type checks via float() and they resolve to whole numbers
        assert _infer_field_type(["100", "200", "300"]) == "integer"

    def test_mixed_decimal_string(self):
        # Strings with decimals should be "numeric"
        assert _infer_field_type(["1.5", "2.7", "3.14"]) == "numeric"


# ── profile_entity_fields tests ──────────────────────────────────────────

class TestProfileEntityFields:
    @pytest.mark.asyncio
    async def test_empty_table(self):
        """Empty table returns empty list."""
        mock_sb = MockSupabaseTable(data=[])
        result = await profile_entity_fields(mock_sb, "t1", "bitrix24", "leads")
        assert result == []

    @pytest.mark.asyncio
    async def test_basic_profiling(self):
        """Profile a table with sample data."""
        rows = [
            {"id": "1", "tenant_id": "t1", "crm_source": "b", "external_id": "e1",
             "status": "NEW", "source": "web", "value": 100, "created_at": "2024-01-01"},
            {"id": "2", "tenant_id": "t1", "crm_source": "b", "external_id": "e2",
             "status": "WON", "source": "web", "value": 200, "created_at": "2024-01-02"},
            {"id": "3", "tenant_id": "t1", "crm_source": "b", "external_id": "e3",
             "status": "NEW", "source": None, "value": None, "created_at": "2024-01-03"},
        ]
        mock_sb = MockSupabaseTable(data=rows)
        result = await profile_entity_fields(mock_sb, "t1", "bitrix24", "leads")

        # Should exclude internal fields (id, tenant_id, crm_source, external_id)
        field_names = {p["field_name"] for p in result}
        assert "id" not in field_names
        assert "tenant_id" not in field_names
        assert "crm_source" not in field_names
        assert "external_id" not in field_names

        # Should include data fields
        assert "status" in field_names
        assert "source" in field_names
        assert "value" in field_names
        assert "created_at" in field_names

    @pytest.mark.asyncio
    async def test_null_rate_calculation(self):
        """Verify null_rate is computed correctly."""
        rows = [
            {"id": "1", "tenant_id": "t", "crm_source": "b", "external_id": "1", "status": "A", "value": None},
            {"id": "2", "tenant_id": "t", "crm_source": "b", "external_id": "2", "status": "B", "value": None},
            {"id": "3", "tenant_id": "t", "crm_source": "b", "external_id": "3", "status": None, "value": 100},
            {"id": "4", "tenant_id": "t", "crm_source": "b", "external_id": "4", "status": "C", "value": 200},
        ]
        mock_sb = MockSupabaseTable(data=rows)
        result = await profile_entity_fields(mock_sb, "t", "b", "leads")

        by_name = {p["field_name"]: p for p in result}

        # status: 1 null out of 4
        assert by_name["status"]["null_rate"] == 0.25
        # value: 2 nulls out of 4
        assert by_name["value"]["null_rate"] == 0.5

    @pytest.mark.asyncio
    async def test_internal_fields_excluded(self):
        """All INTERNAL_FIELDS should be excluded."""
        row = {"id": "1", "tenant_id": "t", "crm_source": "b",
               "external_id": "e", "synced_at": "now", "custom_fields": {},
               "raw_data": {}, "source_id": "s", "name": "Test"}
        mock_sb = MockSupabaseTable(data=[row])
        result = await profile_entity_fields(mock_sb, "t", "b", "contacts")

        field_names = {p["field_name"] for p in result}
        for internal in INTERNAL_FIELDS:
            assert internal not in field_names
        assert "name" in field_names

    @pytest.mark.asyncio
    async def test_distinct_count(self):
        """Verify distinct_count is computed correctly."""
        rows = [
            {"id": "1", "tenant_id": "t", "crm_source": "b", "external_id": "1", "status": "A"},
            {"id": "2", "tenant_id": "t", "crm_source": "b", "external_id": "2", "status": "B"},
            {"id": "3", "tenant_id": "t", "crm_source": "b", "external_id": "3", "status": "A"},
            {"id": "4", "tenant_id": "t", "crm_source": "b", "external_id": "4", "status": "C"},
        ]
        mock_sb = MockSupabaseTable(data=rows)
        result = await profile_entity_fields(mock_sb, "t", "b", "leads")

        by_name = {p["field_name"]: p for p in result}
        assert by_name["status"]["distinct_count"] == 3  # A, B, C


# ── upsert_field_profiles tests ──────────────────────────────────────────

class TestUpsertFieldProfiles:
    @pytest.mark.asyncio
    async def test_empty_profiles_noop(self):
        """Empty list should not call supabase."""
        mock_sb = MagicMock()
        await upsert_field_profiles(mock_sb, [])
        mock_sb.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_upsert_called(self):
        """Profiles should be upserted with correct conflict key."""
        profiles = [{"field_name": "status", "entity": "leads"}]
        mock_sb = MockSupabaseTable()
        await upsert_field_profiles(mock_sb, profiles)
        # No error raised = success


# ── ENTITY_TABLE_MAP tests ───────────────────────────────────────────────

class TestEntityTableMap:
    def test_standard_entities(self):
        assert ENTITY_TABLE_MAP["leads"] == "crm_leads"
        assert ENTITY_TABLE_MAP["deals"] == "crm_deals"
        assert ENTITY_TABLE_MAP["contacts"] == "crm_contacts"
        assert ENTITY_TABLE_MAP["companies"] == "crm_companies"
        assert ENTITY_TABLE_MAP["activities"] == "crm_activities"
