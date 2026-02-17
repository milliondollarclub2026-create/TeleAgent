"""
Karim — CRM Sync Engine.
Handles full sync (initial load) and incremental sync (15-min updates).
No LLM cost. Pure ETL pipeline.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Callable

from crm_adapters import CRMAdapter, create_adapter
from crypto_utils import decrypt_value

logger = logging.getLogger(__name__)

# Track active sync loops: {tenant_id: asyncio.Task}
_active_syncs: dict[str, asyncio.Task] = {}

# Default incremental sync interval (seconds)
DEFAULT_SYNC_INTERVAL = 900  # 15 minutes

# Batch size for upserts
UPSERT_BATCH_SIZE = 500


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

        for entity in entities:
            try:
                result = await self._sync_entity_full(entity, progress_callback)
                results[entity] = result
            except Exception as e:
                logger.error(f"Full sync failed for {entity} (tenant={self.tenant_id}): {e}")
                results[entity] = {"status": "error", "error": str(e)}
                await self._update_sync_status(entity, "error", error_message=str(e))

        return results

    async def incremental_sync(self) -> dict:
        """
        Run incremental sync — fetch only records modified since last sync cursor.

        Returns:
            Dict with sync results per entity
        """
        results = {}
        entities = self.adapter.supported_entities()

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
        await self._update_sync_status(entity, "syncing", synced_records=0)

        all_normalized = []
        offset = 0
        total_fetched = 0

        while True:
            raw_records, has_more = await self.adapter.fetch_page(entity, offset=offset)

            if not raw_records:
                break

            for raw in raw_records:
                normalized = self.adapter.normalize(entity, raw)
                if normalized and normalized.get("external_id"):
                    normalized["tenant_id"] = self.tenant_id
                    normalized["crm_source"] = self.crm_source
                    normalized["synced_at"] = datetime.now(timezone.utc).isoformat()
                    all_normalized.append(normalized)

            total_fetched += len(raw_records)

            # Batch upsert when we have enough
            if len(all_normalized) >= UPSERT_BATCH_SIZE:
                await self._batch_upsert(table_name, all_normalized[:UPSERT_BATCH_SIZE])
                all_normalized = all_normalized[UPSERT_BATCH_SIZE:]

            # Update progress
            await self._update_sync_status(
                entity, "syncing",
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

            offset += len(raw_records)

        # Upsert remaining records
        if all_normalized:
            await self._batch_upsert(table_name, all_normalized)

        # Calculate max modified_at for sync cursor
        max_modified = await self._get_max_modified(table_name)

        # Mark complete
        now = datetime.now(timezone.utc).isoformat()
        await self._update_sync_status(
            entity, "complete",
            synced_records=total_fetched,
            total_records=total_fetched,
            last_sync_cursor=max_modified,
            last_full_sync_at=now,
        )

        logger.info(f"Full sync complete: {entity} ({total_fetched} records) for tenant {self.tenant_id}")
        return {"status": "complete", "records": total_fetched}

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
            await self._update_sync_status(entity, "complete", last_incremental_at=now)
            return {"status": "complete", "records": 0}

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
            entity, "complete",
            last_sync_cursor=max_modified,
            last_incremental_at=now,
        )

        logger.info(f"Incremental sync: {entity} ({len(normalized)} records) for tenant {self.tenant_id}")
        return {"status": "complete", "records": len(normalized)}

    async def _batch_upsert(self, table_name: str, records: list[dict]):
        """Upsert a batch of records into the target table."""
        if not records:
            return

        try:
            self.supabase.table(table_name).upsert(
                records,
                on_conflict="tenant_id,crm_source,external_id"
            ).execute()
        except Exception as e:
            logger.error(f"Batch upsert failed for {table_name}: {e}")
            # Try one-by-one as fallback
            for record in records:
                try:
                    self.supabase.table(table_name).upsert(
                        record,
                        on_conflict="tenant_id,crm_source,external_id"
                    ).execute()
                except Exception as inner_e:
                    logger.warning(f"Single upsert failed for {table_name} (id={record.get('external_id')}): {inner_e}")

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
            self.supabase.table("crm_sync_status").upsert(
                data,
                on_conflict="tenant_id,crm_source,entity"
            ).execute()
        except Exception as e:
            logger.warning(f"Failed to update sync status for {entity}: {e}")

    async def _get_sync_cursor(self, entity: str) -> Optional[datetime]:
        """Get the last sync cursor for an entity."""
        try:
            result = self.supabase.table("crm_sync_status").select(
                "last_sync_cursor"
            ).eq("tenant_id", self.tenant_id).eq(
                "crm_source", self.crm_source
            ).eq("entity", entity).execute()

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
            result = self.supabase.table(table_name).select(
                "modified_at"
            ).eq("tenant_id", self.tenant_id).eq(
                "crm_source", self.crm_source
            ).order("modified_at", desc=True).limit(1).execute()

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
    result = supabase.table("crm_connections").select(
        "credentials, config, crm_type"
    ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).eq("is_active", True).execute()

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
        supabase.table("crm_connections").update(
            {"last_sync_at": now}
        ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).execute()
    except Exception as e:
        logger.warning(f"Failed to update last_sync_at: {e}")

    # Start incremental sync loop
    await start_incremental_sync_loop(supabase, tenant_id, crm_type)

    return sync_result


async def trigger_full_sync_background(supabase, tenant_id: str, crm_type: str):
    """Fire-and-forget wrapper for trigger_full_sync. Runs as a background task."""
    try:
        await trigger_full_sync(supabase, tenant_id, crm_type)
    except Exception as e:
        logger.error(f"Background full sync failed for {crm_type} (tenant={tenant_id}): {e}")


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
                result = supabase.table("crm_connections").select(
                    "credentials, config"
                ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).eq("is_active", True).execute()

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
                supabase.table("crm_connections").update(
                    {"last_sync_at": now}
                ).eq("tenant_id", tenant_id).eq("crm_type", crm_type).execute()

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


async def resume_all_sync_loops(supabase):
    """
    Resume incremental sync loops for all active CRM connections.
    Called on server startup.
    """
    try:
        result = supabase.table("crm_connections").select(
            "tenant_id, crm_type"
        ).eq("is_active", True).execute()

        if not result.data:
            logger.info("No active CRM connections to resume sync for")
            return

        for conn in result.data:
            tenant_id = conn["tenant_id"]
            crm_type = conn["crm_type"]

            # Check if we have completed at least one full sync
            sync_check = supabase.table("crm_sync_status").select(
                "status"
            ).eq("tenant_id", tenant_id).eq("crm_source", crm_type).eq("status", "complete").execute()

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
