"""
Rep Analytics Tests
===================
Verifies that:
1. BitrixAdapter._normalize_activity() produces a non-null employee_name when the
   user cache has been pre-populated (simulating a post-prepare_user_cache state).
2. Anvar.execute_chart_query() grouping by employee_name does NOT return only "Unknown".
3. BitrixAdapter.prepare_user_cache() correctly builds the cache from a user.get response.
4. BitrixAdapter.load_user_cache_from_db() populates the cache from the crm_users table.
5. Incremental sync activities carry resolved names when DB cache is loaded.
"""

import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crm_adapters.bitrix_adapter import BitrixAdapter
from agents.anvar import execute_chart_query, ALLOWED_FIELDS
from agents import ChartConfig


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_adapter(user_cache: dict = None) -> BitrixAdapter:
    """Return a BitrixAdapter with a mocked client and optional pre-set cache."""
    mock_client = MagicMock()
    adapter = BitrixAdapter(mock_client)
    if user_cache is not None:
        adapter._user_cache = user_cache
    return adapter


def _raw_activity(responsible_id="42") -> dict:
    """Minimal raw Bitrix activity payload."""
    return {
        "ID": "1001",
        "TYPE_ID": "2",          # call
        "SUBJECT": "Follow-up call",
        "RESPONSIBLE_ID": responsible_id,
        "DURATION": "300",
        "COMPLETED": "Y",
        "START_TIME": "2026-01-15T10:00:00+05:00",
        "CREATED": "2026-01-15T09:50:00+05:00",
        "LAST_UPDATED": "2026-01-15T10:05:00+05:00",
    }


# ---------------------------------------------------------------------------
# 1. _normalize_activity — cache populated → employee_name is non-null
# ---------------------------------------------------------------------------

class TestNormalizeActivityWithCache:

    def test_employee_name_resolved_from_cache(self):
        """RESPONSIBLE_ID in cache → employee_name is 'First Last'."""
        adapter = _make_adapter(user_cache={"42": "Alex Kowalski"})
        result = adapter._normalize_activity(_raw_activity(responsible_id="42"))

        assert result["employee_name"] == "Alex Kowalski", (
            "employee_name must be resolved from _user_cache when RESPONSIBLE_ID is present"
        )
        assert result["employee_id"] == "42"

    def test_employee_name_none_when_id_not_in_cache(self):
        """RESPONSIBLE_ID not in cache → employee_name is None (honest gap, not 'Unknown')."""
        adapter = _make_adapter(user_cache={"99": "Someone Else"})
        result = adapter._normalize_activity(_raw_activity(responsible_id="42"))

        assert result["employee_name"] is None, (
            "employee_name must be None (not 'Unknown') when the user ID is not in the cache"
        )
        assert result["employee_id"] == "42"

    def test_employee_name_none_when_cache_empty(self):
        """Empty cache → employee_name is None, no crash."""
        adapter = _make_adapter(user_cache={})
        result = adapter._normalize_activity(_raw_activity(responsible_id="42"))

        assert result["employee_name"] is None
        assert result["employee_id"] == "42"

    def test_employee_id_none_when_responsible_id_missing(self):
        """Missing RESPONSIBLE_ID → both employee_id and employee_name are None."""
        adapter = _make_adapter(user_cache={"42": "Alex Kowalski"})
        raw = _raw_activity()
        del raw["RESPONSIBLE_ID"]
        result = adapter._normalize_activity(raw)

        assert result["employee_id"] is None
        assert result["employee_name"] is None

    def test_modified_at_populated_from_last_updated(self):
        """LAST_UPDATED must be stored as modified_at — fixes the incremental sync cursor."""
        adapter = _make_adapter(user_cache={})
        result = adapter._normalize_activity(_raw_activity())

        assert result["modified_at"] is not None, (
            "modified_at must be set from LAST_UPDATED so the sync cursor advances"
        )
        assert "2026-01-15" in result["modified_at"]

    def test_started_at_falls_back_to_created(self):
        """If START_TIME is absent, started_at falls back to CREATED."""
        adapter = _make_adapter(user_cache={})
        raw = _raw_activity()
        del raw["START_TIME"]
        result = adapter._normalize_activity(raw)

        assert result["started_at"] is not None
        assert "2026-01-15" in result["started_at"]

    def test_type_mapped_correctly(self):
        """TYPE_ID '2' should map to 'call'."""
        adapter = _make_adapter(user_cache={})
        result = adapter._normalize_activity(_raw_activity())
        assert result["type"] == "call"

    def test_completed_boolean_parsed(self):
        """COMPLETED 'Y' string must be parsed to True boolean."""
        adapter = _make_adapter(user_cache={})
        result = adapter._normalize_activity(_raw_activity())
        assert result["completed"] is True

    def test_duration_seconds_parsed(self):
        """DURATION '300' must be parsed to int 300."""
        adapter = _make_adapter(user_cache={})
        result = adapter._normalize_activity(_raw_activity())
        assert result["duration_seconds"] == 300


# ---------------------------------------------------------------------------
# 2. prepare_user_cache — API response → cache + DB write
# ---------------------------------------------------------------------------

class TestPrepareUserCache:

    @pytest.mark.asyncio
    async def test_cache_populated_from_api_response(self):
        """prepare_user_cache builds _user_cache from user.get API response."""
        mock_client = MagicMock()
        # First call returns 2 users; second call returns empty list (no more pages)
        mock_client._call = AsyncMock(side_effect=[
            [
                {"ID": "1", "NAME": "Alex", "LAST_NAME": "Kowalski", "EMAIL": "alex@co.com"},
                {"ID": "2", "NAME": "Sara", "LAST_NAME": "Diaz",     "EMAIL": "sara@co.com"},
            ],
            [],  # empty second page → stop
        ])

        adapter = BitrixAdapter(mock_client)
        mock_supabase = _mock_supabase()

        await adapter.prepare_user_cache(
            supabase=mock_supabase,
            tenant_id="tid-001",
            crm_source="bitrix24",
        )

        assert adapter._user_cache["1"] == "Alex Kowalski"
        assert adapter._user_cache["2"] == "Sara Diaz"
        assert len(adapter._user_cache) == 2

    @pytest.mark.asyncio
    async def test_cache_handles_missing_last_name(self):
        """Users without LAST_NAME use only NAME as display name."""
        mock_client = MagicMock()
        mock_client._call = AsyncMock(side_effect=[
            [{"ID": "5", "NAME": "Bobur", "LAST_NAME": "", "EMAIL": None}],
            [],
        ])

        adapter = BitrixAdapter(mock_client)
        await adapter.prepare_user_cache(supabase=None, tenant_id=None, crm_source=None)

        assert adapter._user_cache["5"] == "Bobur"

    @pytest.mark.asyncio
    async def test_cache_falls_back_gracefully_on_api_error(self):
        """API failure must not crash — cache stays empty, no exception raised."""
        mock_client = MagicMock()
        mock_client._call = AsyncMock(side_effect=Exception("API down"))

        adapter = BitrixAdapter(mock_client)
        # Must not raise
        await adapter.prepare_user_cache(supabase=None, tenant_id=None, crm_source=None)

        assert adapter._user_cache == {}

    @pytest.mark.asyncio
    async def test_upserts_to_crm_users_table(self):
        """Resolved users are persisted to crm_users via supabase upsert."""
        mock_client = MagicMock()
        mock_client._call = AsyncMock(side_effect=[
            [{"ID": "7", "NAME": "Farid", "LAST_NAME": "Tashkentov", "EMAIL": "farid@co.com"}],
            [],
        ])

        adapter = BitrixAdapter(mock_client)
        mock_supabase = _mock_supabase()

        await adapter.prepare_user_cache(
            supabase=mock_supabase,
            tenant_id="tid-001",
            crm_source="bitrix24",
        )

        # Verify upsert was called on crm_users
        mock_supabase.table.assert_called_with("crm_users")
        upsert_call = mock_supabase.table.return_value.upsert
        upsert_call.assert_called_once()
        records_arg = upsert_call.call_args[0][0]
        assert len(records_arg) == 1
        assert records_arg[0]["external_id"] == "7"
        assert records_arg[0]["name"] == "Farid Tashkentov"


# ---------------------------------------------------------------------------
# 3. load_user_cache_from_db — DB rows → cache (no API call)
# ---------------------------------------------------------------------------

class TestLoadUserCacheFromDb:

    @pytest.mark.asyncio
    async def test_loads_cache_from_crm_users_table(self):
        """load_user_cache_from_db populates _user_cache from DB rows."""
        mock_client = MagicMock()
        adapter = BitrixAdapter(mock_client)

        mock_supabase = _mock_supabase(select_data=[
            {"external_id": "10", "name": "Nilufar Rashidova"},
            {"external_id": "11", "name": "Anvar Yusupov"},
        ])

        await adapter.load_user_cache_from_db(
            supabase=mock_supabase,
            tenant_id="tid-001",
            crm_source="bitrix24",
        )

        assert adapter._user_cache["10"] == "Nilufar Rashidova"
        assert adapter._user_cache["11"] == "Anvar Yusupov"

    @pytest.mark.asyncio
    async def test_empty_table_leaves_cache_empty(self):
        """Empty crm_users table → empty cache, no crash."""
        mock_client = MagicMock()
        adapter = BitrixAdapter(mock_client)

        mock_supabase = _mock_supabase(select_data=[])
        await adapter.load_user_cache_from_db(
            supabase=mock_supabase,
            tenant_id="tid-001",
            crm_source="bitrix24",
        )

        assert adapter._user_cache == {}

    @pytest.mark.asyncio
    async def test_handles_db_error_gracefully(self):
        """DB failure must not crash or raise."""
        mock_client = MagicMock()
        adapter = BitrixAdapter(mock_client)

        mock_supabase = MagicMock()
        mock_supabase.table.side_effect = Exception("DB error")

        await adapter.load_user_cache_from_db(
            supabase=mock_supabase,
            tenant_id="tid-001",
            crm_source="bitrix24",
        )
        assert adapter._user_cache == {}


# ---------------------------------------------------------------------------
# 4. Anvar — grouping by employee_name does NOT produce only "Unknown"
# ---------------------------------------------------------------------------

class TestAnvarRepGrouping:

    @pytest.mark.asyncio
    async def test_group_by_employee_name_returns_named_reps(self):
        """
        When crm_activities rows have employee_name set, grouping by employee_name
        must return the actual names — not 'Unknown' for every row.
        """
        config = ChartConfig(
            chart_type="bar",
            title="Activities by Rep",
            data_source="crm_activities",
            x_field="employee_name",
            y_field="count",
            aggregation="count",
            time_range_days=30,
        )

        fake_rows = [
            {"employee_name": "Alex Kowalski"},
            {"employee_name": "Alex Kowalski"},
            {"employee_name": "Sara Diaz"},
            {"employee_name": "Alex Kowalski"},
        ]

        mock_supabase = _mock_supabase_for_anvar(fake_rows)
        result = await execute_chart_query(mock_supabase, "tid-001", "bitrix24", config)

        assert result is not None, "Result must not be None"
        assert len(result.data) > 0, "Must return at least one data point"

        labels = [d["label"] for d in result.data]
        assert "Alex Kowalski" in labels, "Alex Kowalski must appear as a rep label"
        assert "Sara Diaz" in labels,     "Sara Diaz must appear as a rep label"
        assert "Unknown" not in labels,   "No row should be labelled 'Unknown' when names are set"

    @pytest.mark.asyncio
    async def test_group_by_employee_name_counts_correctly(self):
        """Grouping by employee_name must aggregate counts correctly."""
        config = ChartConfig(
            chart_type="bar",
            title="Activities by Rep",
            data_source="crm_activities",
            x_field="employee_name",
            y_field="count",
            aggregation="count",
            time_range_days=30,
        )

        fake_rows = [
            {"employee_name": "Alex Kowalski"},
            {"employee_name": "Alex Kowalski"},
            {"employee_name": "Alex Kowalski"},
            {"employee_name": "Sara Diaz"},
        ]

        mock_supabase = _mock_supabase_for_anvar(fake_rows)
        result = await execute_chart_query(mock_supabase, "tid-001", "bitrix24", config)

        by_label = {d["label"]: d["value"] for d in result.data}
        assert by_label["Alex Kowalski"] == 3
        assert by_label["Sara Diaz"] == 1

    @pytest.mark.asyncio
    async def test_employee_name_in_allowed_fields(self):
        """employee_name must be in ALLOWED_FIELDS for crm_activities."""
        assert "employee_name" in ALLOWED_FIELDS["crm_activities"], (
            "employee_name must be whitelisted in Anvar.ALLOWED_FIELDS['crm_activities']"
        )

    @pytest.mark.asyncio
    async def test_employee_id_in_allowed_fields(self):
        """employee_id must be in ALLOWED_FIELDS as a fallback grouping dimension."""
        assert "employee_id" in ALLOWED_FIELDS["crm_activities"], (
            "employee_id must be whitelisted in Anvar.ALLOWED_FIELDS['crm_activities'] "
            "so charts can fall back to ID grouping when name resolution hasn't run"
        )

    @pytest.mark.asyncio
    async def test_group_by_employee_id_when_name_null(self):
        """
        If employee_name is NULL (cache not loaded), grouping by employee_id
        must still return real IDs — not 'Unknown' for all.
        """
        config = ChartConfig(
            chart_type="bar",
            title="Activities by Rep ID",
            data_source="crm_activities",
            x_field="employee_id",
            y_field="count",
            aggregation="count",
            time_range_days=30,
        )

        fake_rows = [
            {"employee_id": "42"},
            {"employee_id": "42"},
            {"employee_id": "43"},
        ]

        mock_supabase = _mock_supabase_for_anvar(fake_rows)
        result = await execute_chart_query(mock_supabase, "tid-001", "bitrix24", config)

        labels = [d["label"] for d in result.data]
        assert "42" in labels
        assert "43" in labels
        assert "Unknown" not in labels

    @pytest.mark.asyncio
    async def test_anvar_rejects_non_whitelisted_rep_field(self):
        """A field not in ALLOWED_FIELDS must be rejected — returns None."""
        config = ChartConfig(
            chart_type="bar",
            title="Activities by Rep Phone",
            data_source="crm_activities",
            x_field="phone",      # not in ALLOWED_FIELDS
            y_field="count",
            aggregation="count",
        )

        mock_supabase = _mock_supabase_for_anvar([])
        result = await execute_chart_query(mock_supabase, "tid-001", "bitrix24", config)
        assert result is None, "Anvar must reject fields not in ALLOWED_FIELDS"


# ---------------------------------------------------------------------------
# 5. Verification query (manual) — documented as a comment
# ---------------------------------------------------------------------------
# Run this in Supabase SQL Editor to confirm rep analytics work end-to-end:
#
#   SELECT
#       employee_name,
#       employee_id,
#       COUNT(*) AS activity_count
#   FROM crm_activities
#   WHERE tenant_id = '<your-tenant-id>'
#     AND crm_source = 'bitrix24'
#     AND started_at >= NOW() - INTERVAL '30 days'
#   GROUP BY employee_name, employee_id
#   ORDER BY activity_count DESC;
#
# Expected: multiple rows with non-null employee_name values.
# If employee_name is NULL for all rows → run a new full CRM sync.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_supabase(select_data: list = None):
    """Build a supabase mock that returns select_data on .execute()."""
    mock = MagicMock()
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=select_data or [])
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.upsert.return_value = chain
    mock.table.return_value = chain
    return mock


def _mock_supabase_for_anvar(rows: list):
    """
    Build a supabase mock that simulates crm_activities rows returned by Anvar's
    .select(...).eq(...).eq(...).limit(5000).execute() chain.
    """
    mock = MagicMock()
    result_mock = MagicMock()
    result_mock.data = rows

    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.gte.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = result_mock

    mock.table.return_value = chain
    return mock


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
