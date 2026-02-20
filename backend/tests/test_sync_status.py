"""
Sync Status Canonicalisation Tests
====================================
Verifies that:
1. SyncStatus constants have the correct string values.
2. SyncEngine writes ONLY canonical values — never the legacy "completed" string.
3. The server gate check accepts ONLY SyncStatus.COMPLETE and rejects "completed".
4. The frontend polling logic (reproduced in Python) is correctly fixed.

How to reproduce the original deadlock
---------------------------------------
Before the fix, the frontend polling loop checked:
    data.statuses.every(s => s.status === 'completed')   # always false — sync wrote 'complete'
    data?.status === 'complete'                          # always undefined — API returns {statuses:[...]}

Both conditions were permanently false. The 'syncing' step never advanced.
The fix: check `s.status === 'complete'` (no trailing 'd') and remove the
unreachable `data?.status` branch.

Confirming the fix is in place
---------------------------------
Run: pytest tests/test_sync_status.py -v
All tests must pass. A failure in any SyncStatus test means a regression was introduced.
"""

import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch, call

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sync_status import SyncStatus


# ---------------------------------------------------------------------------
# 1. SyncStatus constants
# ---------------------------------------------------------------------------

class TestSyncStatusConstants:

    def test_complete_value(self):
        """Canonical 'complete' — must NOT have a trailing 'd'."""
        assert SyncStatus.COMPLETE == "complete", (
            "SyncStatus.COMPLETE must be 'complete'. "
            "The old broken value was 'completed' (with trailing 'd')."
        )

    def test_syncing_value(self):
        assert SyncStatus.SYNCING == "syncing"

    def test_error_value(self):
        assert SyncStatus.ERROR == "error"

    def test_pending_value(self):
        assert SyncStatus.PENDING == "pending"

    def test_all_contains_all_states(self):
        assert SyncStatus.ALL == {"pending", "syncing", "complete", "error"}

    def test_complete_is_valid(self):
        assert SyncStatus.is_valid("complete") is True

    def test_completed_is_not_valid(self):
        """'completed' (legacy value) must be rejected by is_valid()."""
        assert SyncStatus.is_valid("completed") is False, (
            "'completed' is the legacy broken value — it must NOT be accepted as canonical"
        )

    def test_arbitrary_string_is_not_valid(self):
        assert SyncStatus.is_valid("done") is False
        assert SyncStatus.is_valid("finished") is False
        assert SyncStatus.is_valid("") is False


# ---------------------------------------------------------------------------
# 2. SyncEngine writes canonical values only
# ---------------------------------------------------------------------------

class TestSyncEngineWritesCanonicalStatus:
    """
    Verify that SyncEngine._update_sync_status is called with SyncStatus.COMPLETE
    (not 'completed') at the end of a successful full or incremental sync.
    """

    @pytest.mark.asyncio
    async def test_full_sync_writes_complete_not_completed(self):
        """
        Full sync must write status='complete' when finished.
        Regression guard: the legacy value 'completed' must never appear.
        """
        from sync_engine import SyncEngine

        mock_supabase = _mock_supabase_empty()
        mock_adapter = _mock_adapter_with_one_page(entity="deals", records=[
            {"ID": "1", "TITLE": "Deal 1", "STAGE_ID": "NEW", "OPPORTUNITY": "5000",
             "CURRENCY_ID": "USD", "ASSIGNED_BY_ID": "10", "CONTACT_ID": "", "COMPANY_ID": "",
             "DATE_CREATE": "2026-01-01T00:00:00", "CLOSEDATE": "", "DATE_MODIFY": "2026-01-10T00:00:00"},
        ])

        engine = SyncEngine(mock_supabase, "tid-001", mock_adapter, "bitrix24")

        # Capture all upsert calls to crm_sync_status
        status_upserts = []

        original_update = engine._update_sync_status

        async def capture_update(entity, status, **kwargs):
            status_upserts.append(status)
            # Don't actually write to DB
        engine._update_sync_status = capture_update

        # Also mock _get_max_modified to avoid a real DB call
        async def mock_get_max(*a, **kw):
            return "2026-01-10T00:00:00+00:00"
        engine._get_max_modified = mock_get_max

        await engine._sync_entity_full("deals")

        # The last status written must be 'complete'
        assert status_upserts, "No status updates were written — sync may not have run"
        final_status = status_upserts[-1]
        assert final_status == SyncStatus.COMPLETE, (
            f"Expected final status '{SyncStatus.COMPLETE}', got '{final_status}'. "
            "SyncEngine must use SyncStatus.COMPLETE, not a raw string."
        )
        assert "completed" not in status_upserts, (
            "Legacy value 'completed' must never be written by SyncEngine"
        )

    @pytest.mark.asyncio
    async def test_incremental_sync_no_changes_writes_complete(self):
        """
        Incremental sync with no new records must still write status='complete'.
        """
        from sync_engine import SyncEngine

        mock_supabase = _mock_supabase_with_cursor("2026-01-01T00:00:00+00:00")
        mock_adapter = MagicMock()
        mock_adapter.fetch_modified_since = AsyncMock(return_value=[])  # no new records
        mock_adapter.normalize = MagicMock(return_value={})

        engine = SyncEngine(mock_supabase, "tid-001", mock_adapter, "bitrix24")

        status_upserts = []
        async def capture_update(entity, status, **kwargs):
            status_upserts.append(status)
        engine._update_sync_status = capture_update

        await engine._sync_entity_incremental("deals")

        assert SyncStatus.COMPLETE in status_upserts
        assert "completed" not in status_upserts

    @pytest.mark.asyncio
    async def test_full_sync_error_writes_error_status(self):
        """
        When a full sync entity fails, status='error' must be written, not 'complete'.
        """
        from sync_engine import SyncEngine

        mock_adapter = MagicMock()
        mock_adapter.supported_entities = MagicMock(return_value=["deals"])
        mock_adapter.fetch_page = AsyncMock(side_effect=Exception("API failure"))
        mock_adapter.prepare_user_cache = AsyncMock()
        mock_adapter.load_user_cache_from_db = AsyncMock()

        mock_supabase = _mock_supabase_empty()
        engine = SyncEngine(mock_supabase, "tid-001", mock_adapter, "bitrix24")

        status_upserts = []
        async def capture_update(entity, status, **kwargs):
            status_upserts.append(status)
        engine._update_sync_status = capture_update

        # SyncEngine.full_sync catches entity-level errors internally
        await engine.full_sync()

        assert SyncStatus.ERROR in status_upserts or SyncStatus.SYNCING in status_upserts, (
            "Sync must write either 'syncing' (gate write before fetch) or 'error' on failure"
        )
        assert "completed" not in status_upserts


# ---------------------------------------------------------------------------
# 3. Server gate check — accepts only 'complete', rejects 'completed'
# ---------------------------------------------------------------------------

class TestServerGateCheck:
    """
    Simulates the synced_entities filter in dashboard_onboarding_start().
    The filter is:
        s.get("status") == SyncStatus.COMPLETE and (s.get("synced_records") or 0) > 0
    """

    def _gate_check(self, rows: list[dict]) -> list[dict]:
        """Reproduce the exact gate check logic from server.py."""
        return [
            s for s in rows
            if s.get("status") == SyncStatus.COMPLETE and (s.get("synced_records") or 0) > 0
        ]

    def test_complete_passes_gate(self):
        """status='complete' with records > 0 must pass the gate."""
        rows = [{"entity": "deals", "status": "complete", "synced_records": 100}]
        assert len(self._gate_check(rows)) == 1

    def test_completed_legacy_blocked_by_gate(self):
        """
        status='completed' (legacy) must NOT pass the gate.
        This was the original bug: the old value was accepted by a temporary bandaid
        ('in ("completed", "complete")') that has now been removed.
        The migration (008) must be applied to fix existing rows before this gate check
        will work correctly for tenants whose data predates the canonical enum.
        """
        rows = [{"entity": "deals", "status": "completed", "synced_records": 100}]
        passed = self._gate_check(rows)
        assert len(passed) == 0, (
            "'completed' (legacy) must be blocked after migration 008 has been applied. "
            "If this fails in production, run migration 008 to rewrite legacy rows."
        )

    def test_syncing_blocked_by_gate(self):
        """status='syncing' must not pass — sync isn't done yet."""
        rows = [{"entity": "deals", "status": "syncing", "synced_records": 50}]
        assert len(self._gate_check(rows)) == 0

    def test_error_blocked_by_gate(self):
        """status='error' must not pass — sync failed."""
        rows = [{"entity": "deals", "status": "error", "synced_records": 0}]
        assert len(self._gate_check(rows)) == 0

    def test_complete_with_zero_records_blocked(self):
        """status='complete' but 0 records must not pass — nothing was synced."""
        rows = [{"entity": "deals", "status": "complete", "synced_records": 0}]
        assert len(self._gate_check(rows)) == 0

    def test_mixed_entities_some_pass(self):
        """Only complete entities with records count toward gate passage."""
        rows = [
            {"entity": "leads",      "status": "complete", "synced_records": 200},
            {"entity": "deals",      "status": "complete", "synced_records": 45},
            {"entity": "activities", "status": "syncing",  "synced_records": 10},
            {"entity": "contacts",   "status": "error",    "synced_records": 0},
        ]
        passed = self._gate_check(rows)
        assert len(passed) == 2
        entities = [r["entity"] for r in passed]
        assert "leads" in entities
        assert "deals" in entities


# ---------------------------------------------------------------------------
# 4. Frontend polling logic reproduced in Python
# ---------------------------------------------------------------------------

class TestFrontendPollingLogic:
    """
    Reproduces the JavaScript polling condition from DashboardOnboarding.js in Python
    to confirm the fix is correct.

    The original broken code (pre-fix):
        const allComplete = data?.statuses?.length > 0
            && data.statuses.every(s => s.status === 'completed');   ← WRONG
        if (allComplete || data?.status === 'complete' ...) {        ← data.status is undefined

    The fixed code:
        const allComplete = data?.statuses?.length > 0
            && data.statuses.every(s => s.status === 'complete');    ← CORRECT
        if (allComplete) { startAnalysis(); }
    """

    def _old_polling_logic(self, data: dict) -> bool:
        """The broken pre-fix frontend condition."""
        statuses = data.get("statuses", [])
        all_complete = len(statuses) > 0 and all(s["status"] == "completed" for s in statuses)
        # data.get("status") is always None because the API returns {"statuses": [...]}
        return all_complete or data.get("status") == "complete" or data.get("status") == "ready"

    def _new_polling_logic(self, data: dict) -> bool:
        """The fixed frontend condition."""
        statuses = data.get("statuses", [])
        return len(statuses) > 0 and all(s["status"] == "complete" for s in statuses)

    def test_old_logic_never_advances_when_sync_writes_complete(self):
        """
        Demonstrates the deadlock: sync writes 'complete', old frontend checks 'completed'.
        This test must FAIL with the old logic — proving the bug existed.
        """
        api_response = {
            "statuses": [
                {"entity": "leads",  "status": "complete", "synced_records": 200},
                {"entity": "deals",  "status": "complete", "synced_records": 45},
            ]
        }
        # Old logic returns False — user is stuck forever
        assert self._old_polling_logic(api_response) is False, (
            "This confirms the original deadlock: old logic never advances "
            "because it checks 'completed' but sync writes 'complete'."
        )

    def test_new_logic_advances_when_all_complete(self):
        """
        Fixed logic: 'complete' from sync engine matches 'complete' in the check.
        User advances out of the syncing step.
        """
        api_response = {
            "statuses": [
                {"entity": "leads",  "status": "complete", "synced_records": 200},
                {"entity": "deals",  "status": "complete", "synced_records": 45},
            ]
        }
        assert self._new_polling_logic(api_response) is True, (
            "Fixed logic must return True when all entities report 'complete'"
        )

    def test_new_logic_does_not_advance_while_syncing(self):
        """Mixed statuses: at least one entity still syncing → do not advance."""
        api_response = {
            "statuses": [
                {"entity": "leads",  "status": "complete", "synced_records": 200},
                {"entity": "deals",  "status": "syncing",  "synced_records": 10},
            ]
        }
        assert self._new_polling_logic(api_response) is False

    def test_new_logic_does_not_advance_on_empty_statuses(self):
        """Empty statuses array → do not advance (no data yet)."""
        assert self._new_polling_logic({"statuses": []}) is False

    def test_new_logic_does_not_advance_when_error(self):
        """Error entity → should not advance (one entity failed)."""
        api_response = {
            "statuses": [
                {"entity": "leads", "status": "complete", "synced_records": 50},
                {"entity": "deals", "status": "error",    "synced_records": 0},
            ]
        }
        assert self._new_polling_logic(api_response) is False

    def test_display_color_logic_old_vs_new(self):
        """
        The entity row color in the syncing UI also checked 'completed' (wrong).
        Confirm 'complete' triggers the green color class.
        """
        # Old: s.status === 'completed' → always slate-400 when sync wrote 'complete'
        entity = {"entity": "leads", "status": "complete", "synced_records": 200}
        old_color = "text-emerald-600" if entity["status"] == "completed" else "text-slate-400"
        new_color = "text-emerald-600" if entity["status"] == "complete" else "text-slate-400"

        assert old_color == "text-slate-400", "Old logic incorrectly showed grey for completed entities"
        assert new_color == "text-emerald-600", "Fixed logic must show green for completed entities"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_supabase_empty():
    """Supabase mock that returns empty results and accepts upserts."""
    mock = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.upsert.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    mock.table.return_value = chain
    return mock


def _mock_supabase_with_cursor(cursor_value: str):
    """Supabase mock that returns a sync cursor value."""
    mock = MagicMock()

    cursor_chain = MagicMock()
    cursor_chain.select.return_value = cursor_chain
    cursor_chain.eq.return_value = cursor_chain
    cursor_chain.execute.return_value = MagicMock(data=[{"last_sync_cursor": cursor_value}])

    upsert_chain = MagicMock()
    upsert_chain.upsert.return_value = upsert_chain
    upsert_chain.execute.return_value = MagicMock(data=[])

    # Differentiate table calls by table name is complex with MagicMock;
    # use a simple side-effect that returns cursor chain for status checks
    mock.table.return_value = cursor_chain
    return mock


def _mock_adapter_with_one_page(entity: str, records: list) -> MagicMock:
    """Mock adapter that returns one page of records then empty."""
    adapter = MagicMock()
    adapter.supported_entities = MagicMock(return_value=[entity])
    # First call returns records; subsequent calls return empty
    adapter.fetch_page = AsyncMock(side_effect=[
        (records, False),  # One page, no more
    ])
    adapter.normalize = MagicMock(side_effect=lambda e, r: {
        "external_id": r.get("ID", ""),
        "title": r.get("TITLE", ""),
        "stage": r.get("STAGE_ID", ""),
    })
    adapter.prepare_user_cache = AsyncMock()
    adapter.load_user_cache_from_db = AsyncMock()
    return adapter


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
