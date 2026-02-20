"""
Karim — CRM Sync Engine.
Handles full sync (initial load) and incremental sync (15-min updates).
No LLM cost. Pure ETL pipeline.

IMPORTANT: The supabase-py client is SYNCHRONOUS (httpx.Client, not AsyncClient).
Every .execute() call blocks the thread. In an async FastAPI context, this blocks
the event loop and starves all other requests. All Supabase calls in this module
MUST go through `_db(fn)` which runs them in a thread pool via asyncio.to_thread().
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Callable

from crm_adapters import CRMAdapter, create_adapter
from crypto_utils import decrypt_value
from sync_status import SyncStatus
from agents.field_profiler import profile_entity_fields, upsert_field_profiles

logger = logging.getLogger(__name__)


async def _db(fn):
    """Run a synchronous Supabase call in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(fn)

# Track active sync loops: {"{tenant_id}:{crm_type}": asyncio.Task}
_active_syncs: dict[str, asyncio.Task] = {}

# Track active full-sync tasks so they can be cancelled mid-run
_active_full_syncs: dict[str, asyncio.Task] = {}

# Default incremental sync interval (seconds)
DEFAULT_SYNC_INTERVAL = 900  # 15 minutes

# Batch size for upserts
UPSERT_BATCH_SIZE = 500

# Maximum pages per entity during full sync (10,000 records at 50/page)
MAX_PAGES_PER_ENTITY = 200

# If this fraction of a page's records were already seen, assume wrap-around
DUPLICATE_THRESHOLD = 0.8

# Syncs stuck in "syncing" longer than this (seconds) are considered stale
STALE_SYNC_TIMEOUT = 600  # 10 minutes


class SyncEngine:
    """Manages full and incremental sync for a single tenant + CRM."""

    def __init__(self, supabase, tenant_id: str, adapter: CRMAdapter, crm_source: str):
        self.supabase = supabase
        self.tenant_id = tenant_id
        self.adapter = adapter
        self.crm_source = crm_source

    async def full_sync(self, progress_callback: Optional[Callable] = None) -> dict:
        """
        Run a full sync of all supported entities.
        Paginates through all CRM records, normalizes, and upserts into crm_* tables.

        Args:
            progress_callback: Optional async function(entity, synced, total) for progress updates

        Returns:
            Dict with sync results per entity
        """
        results = {}
        entities = self.adapter.supported_entities()

        # Pre-fetch user directory so _normalize_activity() can resolve employee_name.
        # Non-fatal: if the CRM doesn't support it, the adapter no-ops.
        try:
            await self.adapter.prepare_user_cache(
                supabase=self.supabase,
                tenant_id=self.tenant_id,
                crm_source=self.crm_source,
            )
        except Exception as e:
            logger.warning(f"prepare_user_cache failed (continuing without rep names): {e}")

        # Sync all entities in parallel — the shared rate limiter ensures
        # we stay within the per-webhook budget across concurrent tasks.
        async def _safe_sync(entity):
            try:
                return await self._sync_entity_full(entity, progress_callback)
            except Exception as e:
                logger.error(f"Full sync failed for {entity} (tenant={self.tenant_id}): {e}")
                await self._update_sync_status(entity, SyncStatus.ERROR, error_message=str(e))
                return {"status": SyncStatus.ERROR, "error": str(e)}

        tasks = [_safe_sync(entity) for entity in entities]
        entity_results = await asyncio.gather(*tasks)
        results = dict(zip(entities, entity_results))

        return results

    async def incremental_sync(self) -> dict:
        """
        Run incremental sync — fetch only records modified since last sync cursor.

        Returns:
            Dict with sync results per entity
        """
        results = {}
        entities = self.adapter.supported_entities()

        # Load rep name cache from DB (avoids hitting the CRM API every 15 minutes).
        # Falls back silently if crm_users table is empty or not yet populated.
        try:
            await self.adapter.load_user_cache_from_db(
                supabase=self.supabase,
                tenant_id=self.tenant_id,
                crm_source=self.crm_source,
            )
        except Exception as e:
            logger.warning(f"load_user_cache_from_db failed (rep names may be missing): {e}")

        for entity in entities:
            try:
                result = await self._sync_entity_incremental(entity)
                results[entity] = result
            except Exception as e:
                logger.error(f"Incremental sync failed for {entity} (tenant={self.tenant_id}): {e}")
                results[entity] = {"status": "error", "error": str(e)}

        return results

    async def _sync_entity_full(self, entity: str, progress_callback=None) -> dict:
        """Full sync for a single entity."""
        table_name = f"crm_{entity}"

        # Mark as syncing
        await self._update_sync_status(entity, SyncStatus.SYNCING, synced_records=0)

        all_normalized = []
        offset = 0
        total_fetched = 0
        total_failed = 0
        page_count = 0
        seen_ids: set[str] = set()

        while True:
            raw_records, has_more = await self.adapter.fetch_page(entity, offset=offset)

            if not raw_records:
                break

            # Duplicate / wrap-around detection
            page_ids = [str(r.get("ID", "")) for r in raw_records if r.get("ID")]
            if page_ids:
                already_seen = sum(1 for pid in page_ids if pid in seen_ids)
                if len(page_ids) > 0 and already_seen / len(page_ids) >= DUPLICATE_THRESHOLD:
                    logger.warning(
                        f"Wrap-around detected for {entity} at offset {offset}: "
                        f"{already_seen}/{len(page_ids)} records already seen. Breaking."
                    )
                    break
                seen_ids.update(page_ids)

            for raw in raw_records:
                normalized = self.adapter.normalize(entity, raw)
                if normalized and normalized.get("external_id"):
                    normalized["tenant_id"] = self.tenant_id
                    normalized["crm_source"] = self.crm_source
                    normalized["synced_at"] = datetime.now(timezone.utc).isoformat()
                    all_normalized.append(normalized)

            total_fetched += len(raw_records)
            page_count += 1

            # Batch upsert when we have enough
            if len(all_normalized) >= UPSERT_BATCH_SIZE:
                batch = all_normalized[:UPSERT_BATCH_SIZE]
                failed = await self._batch_upsert(table_name, batch)
                total_failed += failed
                all_normalized = all_normalized[UPSERT_BATCH_SIZE:]

            # Update progress
            await self._update_sync_status(
                entity, SyncStatus.SYNCING,
                synced_records=total_fetched,
                total_records=total_fetched if not has_more else None
            )

            if progress_callback:
                try:
                    await progress_callback(entity, total_fetched, None)
                except Exception:
                    pass

            if not has_more:
                break

            # Safety cap: prevent runaway pagination
            if page_count >= MAX_PAGES_PER_ENTITY:
                logger.warning(
                    f"Hit MAX_PAGES_PER_ENTITY ({MAX_PAGES_PER_ENTITY}) for {entity} "
                    f"(tenant={self.tenant_id}). Stopping pagination."
                )
                break

            offset += len(raw_records)

        # Upsert remaining records
        if all_normalized:
            failed = await self._batch_upsert(table_name, all_normalized)
            total_failed += failed

        # Check if >50% of records failed — mark as ERROR
        if total_fetched > 0 and total_failed > total_fetched * 0.5:
            error_msg = f"{total_failed}/{total_fetched} records failed to upsert"
            logger.error(f"Sync failed for {entity}: {error_msg} (tenant={self.tenant_id})")
            await self._update_sync_status(
                entity, SyncStatus.ERROR,
                error_message=error_msg,
                synced_records=total_fetched - total_failed,
                total_records=total_fetched,
            )
            return {"status": SyncStatus.ERROR, "error": error_msg, "records": total_fetched - total_failed}

        # Calculate max modified_at for sync cursor
        max_modified = await self._get_max_modified(table_name)

        # Mark complete
        now = datetime.now(timezone.utc).isoformat()
        await self._update_sync_status(
            entity, SyncStatus.COMPLETE,
            synced_records=total_fetched,
            total_records=total_fetched,
            last_sync_cursor=max_modified,
            last_full_sync_at=now,
        )

        logger.info(f"Full sync complete: {entity} ({total_fetched} records) for tenant {self.tenant_id}")

        # Profile fields after successful full sync
        await self._update_field_registry(entity)

        return {"status": SyncStatus.COMPLETE, "records": total_fetched}

    async def _sync_entity_incremental(self, entity: str) -> dict:
        """Incremental sync for a single entity."""
        table_name = f"crm_{entity}"

        # Get last sync cursor
        cursor = await self._get_sync_cursor(entity)
        if not cursor:
            # No cursor = need full sync first
            logger.warning(f"No sync cursor for {entity}, skipping incremental (tenant={self.tenant_id})")
            return {"status": "skipped", "reason": "no_cursor"}

        # Fetch modified records
        raw_records = await self.adapter.fetch_modified_since(entity, cursor)

        if not raw_records:
            # Update last_incremental_at even if no changes
            now = datetime.now(timezone.utc).isoformat()
            await self._update_sync_status(entity, SyncStatus.COMPLETE, last_incremental_at=now)
            return {"status": SyncStatus.COMPLETE, "records": 0}

        # Normalize and upsert
        normalized = []
        for raw in raw_records:
            record = self.adapter.normalize(entity, raw)
            if record and record.get("external_id"):
                record["tenant_id"] = self.tenant_id
                record["crm_source"] = self.crm_source
                record["synced_at"] = datetime.now(timezone.utc).isoformat()
                normalized.append(record)

        # Batch upsert
        for i in range(0, len(normalized), UPSERT_BATCH_SIZE):
            batch = normalized[i:i + UPSERT_BATCH_SIZE]
            await self._batch_upsert(table_name, batch)

        # Update cursor and timestamp
        max_modified = await self._get_max_modified(table_name)
        now = datetime.now(timezone.utc).isoformat()
        await self._update_sync_status(
            entity, SyncStatus.COMPLETE,
            last_sync_cursor=max_modified,
            last_incremental_at=now,
        )

        logger.info(f"Incremental sync: {entity} ({len(normalized)} records) for tenant {self.tenant_id}")

        # Re-profile fields after incremental sync (may discover new field values)
        await self._update_field_registry(entity)

        return {"status": SyncStatus.COMPLETE, "records": len(normalized)}

    async def _update_field_registry(self, entity: str):
        """Profile fields for an entity and upsert into crm_field_registry.
        Non-fatal: failure here does not block sync."""
        try:
            profiles = await profile_entity_fields(
                self.supabase, self.tenant_id, self.crm_source, entity
            )
            if profiles:
                await upsert_field_profiles(self.supabase, profiles)
        except Exception as e:
            logger.warning(f"Field registry update failed for {entity} (non-fatal): {e}")

    async def _batch_upsert(self, table_name: str, records: list[dict]) -> int:
        """Upsert a batch of records into the target table.

        Returns the number of failed records (0 = all succeeded).
        """
        if not records:
            return 0

        failed_count = 0
        try:
            await _db(lambda: self.supabase.table(table_name).upsert(
                records,
                on_conflict="tenant_id,crm_source,external_id"
            ).execute())
        except Exception as e:
            logger.error(f"Batch upsert failed for {table_name}: {e}")
            # Try one-by-one as fallback
            for record in records:
                try:
                    await _db(lambda r=record: self.supabase.table(table_name).upsert(
                        r,
                        on_conflict="tenant_id,crm_source,external_id"
                    ).execute())
                except Exception as inner_e:
                    failed_count += 1
                    logger.warning(f"Single upsert failed for {table_name} (id={record.get('external_id')}): {inner_e}")
        return failed_count

    async def _update_sync_status(self, entity: str, status: str, **kwargs):
        """Update or insert sync status tracking."""
        data = {
            "tenant_id": self.tenant_id,
            "crm_source": self.crm_source,
            "entity": entity,
            "status": status,
        }

        # Only set fields that are provided
        for key in ("total_records", "synced_records", "last_sync_cursor",
                     "last_full_sync_at", "last_incremental_at", "error_message"):
            if key in kwargs and kwargs[key] is not None:
                data[key] = kwargs[key]

        try:
            await _db(lambda: self.supabase.table("crm_sync_status").upsert(
                data,
                on_conflict="tenant_id,crm_source,entity"
            ).execute())
        except Exception as e:
            logger.warning(f"Failed to update sync status for {entity}: {e}")

    async def _get_sync_cursor(self, entity: str) -> Optional[datetime]:
        """Get the last sync cursor for an entity."""
        try:
            result = await _db(lambda: self.supabase.table("crm_sync_status").select(
                "last_sync_cursor"
            ).eq("tenant_id", self.tenant_id).eq(
                "crm_source", self.crm_source
            ).eq("entity", entity).execute())

            if result.data and result.data[0].get("last_sync_cursor"):
                cursor_str = result.data[0]["last_sync_cursor"]
                # Parse ISO format
                if isinstance(cursor_str, str):
                    # Handle various ISO formats
                    cursor_str = cursor_str.replace("Z", "+00:00")
                    return datetime.fromisoformat(cursor_str)
        except Exception as e:
            logger.warning(f"Failed to get sync cursor for {entity}: {e}")
        return None

    async def _get_max_modified(self, table_name: str) -> Optional[str]:
        """Get the maximum modified_at value from a table for this tenant+source."""
        try:
            result = await _db(lambda: self.supabase.table(table_name).select(
                "modified_at"
            ).eq("tenant_id", self.tenant_id).eq(
                "crm_source", self.crm_source
            ).order("modified_at", desc=True).limit(1).execute())

            if result.data and result.data[0].get("modified_at"):
                return result.data[0]["modified_at"]
        except Exception as e:
            logger.warning(f"Failed to get max modified_at from {table_name}: {e}")
        return None


# ========================================
# Module-level sync management functions
# ========================================

def _decrypt_credentials(credentials: dict) -> dict:
    """Decrypt sensitive fields in credentials dict."""
    decrypted = {}
    for key, val in credentials.items():
        if val and key in ("webhook_url", "access_token", "refresh_token", "api_key"):
            decrypted[key] = decrypt_value(str(val))
        else:
            decrypted[key] = val
    return decrypted


async def trigger_full_sync(supabase, tenant_id: str, crm_type: str) -> dict:
    """
    Trigger a full sync for a tenant's CRM connection.
    Loads credentials from crm_connections, creates adapter, runs full sync.
    After completion, starts the incremental sync loop.
    """
    # Load connection
    result = await _db(lambda: supabase.table("crm_connections").select(
        "credentials, config, crm_type"
    ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).eq("is_active", True).execute())

    if not result.data:
        logger.warning(f"No active {crm_type} connection for tenant {tenant_id}")
        return {"status": "error", "error": "No active CRM connection"}

    conn = result.data[0]
    credentials = _decrypt_credentials(conn.get("credentials", {}))
    config = conn.get("config", {})

    # Create adapter
    try:
        adapter = create_adapter(crm_type, credentials, config)
    except ValueError as e:
        logger.error(f"Failed to create adapter for {crm_type}: {e}")
        return {"status": "error", "error": str(e)}

    # Run sync
    engine = SyncEngine(supabase, tenant_id, adapter, crm_type)
    sync_result = await engine.full_sync()

    # Update last_sync_at on the connection
    try:
        now = datetime.now(timezone.utc).isoformat()
        await _db(lambda: supabase.table("crm_connections").update(
            {"last_sync_at": now}
        ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).execute())
    except Exception as e:
        logger.warning(f"Failed to update last_sync_at: {e}")

    # Start incremental sync loop
    await start_incremental_sync_loop(supabase, tenant_id, crm_type)

    # Fire-and-forget: recompute revenue snapshots with fresh data
    asyncio.create_task(_recompute_revenue_background(supabase, tenant_id, crm_type))

    return sync_result


async def _recompute_revenue_background(supabase, tenant_id: str, crm_source: str):
    """
    Fire-and-forget: recompute revenue snapshots for all standard timeframes
    after a CRM sync completes. Never raises — all exceptions are logged.
    NOTE: compute_snapshot makes many sync Supabase calls internally,
    so we yield control between timeframes to avoid starving the event loop.
    """
    try:
        from revenue.compute import compute_snapshot
        for timeframe in ["30d", "90d"]:
            try:
                await compute_snapshot(supabase, tenant_id, crm_source, timeframe)
                logger.info(
                    "Revenue snapshot refreshed after sync "
                    "(tenant=%s, crm=%s, timeframe=%s)",
                    tenant_id, crm_source, timeframe,
                )
            except Exception as e:
                logger.warning(
                    "Revenue snapshot recompute failed (tenant=%s, crm=%s, timeframe=%s): %s",
                    tenant_id, crm_source, timeframe, e,
                )
            await asyncio.sleep(0)  # Yield to event loop between snapshots
    except Exception as e:
        logger.warning("_recompute_revenue_background import failed: %s", e)

    # Compute and store CRM context for Bobur's context-aware chat
    try:
        from agents.crm_context import compute_crm_context
        context = await compute_crm_context(supabase, tenant_id, crm_source)
        supabase.table("dashboard_configs").update(
            {"crm_context": context}
        ).eq("tenant_id", tenant_id).execute()
        logger.info(
            "CRM context refreshed after sync (tenant=%s, crm=%s)",
            tenant_id, crm_source,
        )
    except Exception as e:
        logger.warning("CRM context compute failed (tenant=%s): %s", tenant_id, e)


async def trigger_full_sync_background(supabase, tenant_id: str, crm_type: str):
    """Fire-and-forget wrapper for trigger_full_sync. Tracked so it can be cancelled."""
    sync_key = f"{tenant_id}:{crm_type}"

    # Concurrent sync lock: skip if already running for this tenant+crm
    if sync_key in _active_full_syncs:
        existing = _active_full_syncs[sync_key]
        if not existing.done():
            logger.info(f"Full sync already running for {sync_key}, skipping duplicate")
            return

    # Store current task so stop_all_syncs can cancel it
    _active_full_syncs[sync_key] = asyncio.current_task()
    try:
        await trigger_full_sync(supabase, tenant_id, crm_type)
    except asyncio.CancelledError:
        logger.info(f"Full sync cancelled for {sync_key}")
        # Mark all in-progress entities as error so frontend sees clean state
        try:
            result = await _db(lambda: supabase.table("crm_sync_status").select("entity, status").eq(
                "tenant_id", tenant_id
            ).eq("crm_source", crm_type).eq("status", SyncStatus.SYNCING).execute())
            for row in (result.data or []):
                await _db(lambda e=row["entity"]: supabase.table("crm_sync_status").update(
                    {"status": SyncStatus.ERROR, "error_message": "Sync cancelled by user"}
                ).eq("tenant_id", tenant_id).eq("crm_source", crm_type).eq(
                    "entity", e
                ).execute())
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Background full sync failed for {crm_type} (tenant={tenant_id}): {e}")
    finally:
        _active_full_syncs.pop(sync_key, None)


async def start_incremental_sync_loop(
    supabase, tenant_id: str, crm_type: str, interval: int = DEFAULT_SYNC_INTERVAL
):
    """
    Start a 15-min incremental sync loop for a tenant's CRM.
    Stores the task in _active_syncs for lifecycle management.
    """
    sync_key = f"{tenant_id}:{crm_type}"

    # Stop existing loop if any
    if sync_key in _active_syncs:
        _active_syncs[sync_key].cancel()
        del _active_syncs[sync_key]

    async def _loop():
        while True:
            await asyncio.sleep(interval)
            try:
                # Re-load credentials each time (they might have been refreshed)
                result = await _db(lambda: supabase.table("crm_connections").select(
                    "credentials, config"
                ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).eq("is_active", True).execute())

                if not result.data:
                    logger.info(f"CRM connection removed, stopping sync loop for {sync_key}")
                    break

                conn = result.data[0]
                credentials = _decrypt_credentials(conn.get("credentials", {}))
                config = conn.get("config", {})
                adapter = create_adapter(crm_type, credentials, config)

                engine = SyncEngine(supabase, tenant_id, adapter, crm_type)
                await engine.incremental_sync()

                # Update last_sync_at
                now = datetime.now(timezone.utc).isoformat()
                await _db(lambda: supabase.table("crm_connections").update(
                    {"last_sync_at": now}
                ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).execute())

            except asyncio.CancelledError:
                logger.info(f"Incremental sync loop cancelled for {sync_key}")
                break
            except Exception as e:
                logger.error(f"Incremental sync error for {sync_key}: {e}")
                # Continue loop — don't stop on transient errors

    task = asyncio.create_task(_loop())
    _active_syncs[sync_key] = task
    logger.info(f"Started incremental sync loop for {sync_key} (interval={interval}s)")


async def stop_sync_loop(tenant_id: str, crm_type: str = None):
    """Stop incremental sync loop(s) for a tenant."""
    keys_to_stop = []
    if crm_type:
        keys_to_stop = [f"{tenant_id}:{crm_type}"]
    else:
        keys_to_stop = [k for k in _active_syncs if k.startswith(f"{tenant_id}:")]

    for key in keys_to_stop:
        if key in _active_syncs:
            _active_syncs[key].cancel()
            del _active_syncs[key]
            logger.info(f"Stopped sync loop for {key}")


async def stop_all_syncs(tenant_id: str, crm_type: str = None):
    """Cancel ALL sync activity for a tenant — both full syncs and incremental loops."""
    keys_to_stop = []
    if crm_type:
        keys_to_stop = [f"{tenant_id}:{crm_type}"]
    else:
        keys_to_stop = [k for k in list(_active_full_syncs) if k.startswith(f"{tenant_id}:")]
        keys_to_stop += [k for k in list(_active_syncs) if k.startswith(f"{tenant_id}:") and k not in keys_to_stop]

    cancelled = []
    for key in keys_to_stop:
        # Cancel running full sync
        if key in _active_full_syncs:
            _active_full_syncs[key].cancel()
            _active_full_syncs.pop(key, None)
            cancelled.append(f"full_sync:{key}")
        # Cancel incremental loop
        if key in _active_syncs:
            _active_syncs[key].cancel()
            _active_syncs.pop(key, None)
            cancelled.append(f"incremental:{key}")

    if cancelled:
        logger.info(f"Cancelled all syncs for {tenant_id}: {cancelled}")
    return cancelled


def is_sync_active(tenant_id: str) -> bool:
    """Check if any sync (full or incremental) is currently running for a tenant."""
    prefix = f"{tenant_id}:"
    for key, task in _active_full_syncs.items():
        if key.startswith(prefix) and not task.done():
            return True
    for key, task in _active_syncs.items():
        if key.startswith(prefix) and not task.done():
            return True
    return False


async def _cleanup_stale_syncs(supabase):
    """Reset any stuck 'syncing' rows to 'error' on server startup.

    If the server crashed or restarted mid-sync, rows may be stuck in 'syncing'
    status forever. This resets them so the frontend shows a clean state and
    users can re-trigger a full sync.
    """
    try:
        result = await _db(lambda: supabase.table("crm_sync_status").select(
            "tenant_id, crm_source, entity"
        ).eq("status", SyncStatus.SYNCING).execute())

        stale_rows = result.data or []
        if not stale_rows:
            return

        for row in stale_rows:
            try:
                await _db(lambda r=row: supabase.table("crm_sync_status").update(
                    {"status": SyncStatus.ERROR, "error_message": "Reset on server restart (was stuck syncing)"}
                ).eq("tenant_id", r["tenant_id"]).eq(
                    "crm_source", r["crm_source"]
                ).eq("entity", r["entity"]).execute())
            except Exception as e:
                logger.warning(f"Failed to reset stale sync row: {e}")

        logger.info(f"Reset {len(stale_rows)} stale 'syncing' rows to 'error'")
    except Exception as e:
        logger.warning(f"Failed to cleanup stale syncs: {e}")


async def resume_all_sync_loops(supabase):
    """
    Resume incremental sync loops for all active CRM connections.
    Called on server startup.
    """
    # First, clean up any syncs stuck in "syncing" from a previous crash
    await _cleanup_stale_syncs(supabase)

    try:
        result = await _db(lambda: supabase.table("crm_connections").select(
            "tenant_id, crm_type"
        ).eq("is_active", True).execute())

        if not result.data:
            logger.info("No active CRM connections to resume sync for")
            return

        for conn in result.data:
            tenant_id = conn["tenant_id"]
            crm_type = conn["crm_type"]

            # Check if we have completed at least one full sync
            sync_check = await _db(lambda: supabase.table("crm_sync_status").select(
                "status"
            ).eq("tenant_id", tenant_id).eq("crm_source", crm_type).eq("status", SyncStatus.COMPLETE).execute())

            if sync_check.data:
                await start_incremental_sync_loop(supabase, tenant_id, crm_type)
                logger.info(f"Resumed sync loop for {tenant_id}:{crm_type}")
            else:
                logger.info(f"Skipping sync resume for {tenant_id}:{crm_type} — no completed full sync")

    except Exception as e:
        logger.error(f"Failed to resume sync loops: {e}")


def get_active_syncs() -> dict:
    """Return info about active sync loops (for debugging/monitoring)."""
    return {
        key: {"running": not task.done(), "cancelled": task.cancelled()}
        for key, task in _active_syncs.items()
    }
