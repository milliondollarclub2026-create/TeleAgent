"""
Canonical sync status values for crm_sync_status.status column.

Single source of truth — import this everywhere status strings are written or compared.
Using plain class constants (not Python Enum) so the values serialize to bare strings
naturally for Supabase upserts without .value unwrapping.

Valid state machine:
    (new row) → SYNCING → COMPLETE
                        → ERROR
"""


class SyncStatus:
    PENDING = "pending"   # reserved; row created but sync not yet started
    SYNCING = "syncing"   # actively fetching/upserting records
    COMPLETE = "complete" # full or incremental sync finished successfully
    ERROR = "error"       # sync failed; see error_message column

    ALL = frozenset({PENDING, SYNCING, COMPLETE, ERROR})

    @classmethod
    def is_valid(cls, value: str) -> bool:
        return value in cls.ALL
