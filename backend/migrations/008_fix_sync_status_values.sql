-- =============================================================================
-- Migration 008: Canonicalise sync status values
-- =============================================================================
-- The canonical status values for crm_sync_status.status are defined in
-- backend/sync_status.py: pending | syncing | complete | error
--
-- Legacy issue: some rows may carry status='completed' (extra 'd') written by
-- an older version of the sync engine before the SyncStatus enum was introduced.
-- Those rows would cause the onboarding gate check to block indefinitely because
-- it now only accepts SyncStatus.COMPLETE = 'complete'.
--
-- This migration is idempotent — safe to re-run.
-- Apply after: 007_crm_users.sql
-- =============================================================================

-- Rewrite any legacy 'completed' rows to the canonical 'complete' value.
UPDATE crm_sync_status
SET status = 'complete'
WHERE status = 'completed';

-- Verification: confirm no 'completed' rows remain.
-- Run this after applying:
--   SELECT COUNT(*) FROM crm_sync_status WHERE status = 'completed';
--   -- Expected: 0
--
-- Confirm canonical values only remain:
--   SELECT DISTINCT status FROM crm_sync_status ORDER BY status;
--   -- Expected: subset of {pending, syncing, complete, error}
