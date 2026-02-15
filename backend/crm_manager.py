"""
Unified CRM Connection Manager.
Manages all CRM connections (Bitrix24, HubSpot, Zoho, Freshsales) via the crm_connections table.
Provides a single interface for the lead sync system.
"""

import logging
import time
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)

# In-memory cache: {tenant_id: {"connections": [...], "cached_at": float}}
_crm_connections_cache: Dict[str, Dict] = {}
CRM_CACHE_TTL = 300  # 5 minutes


class CRMManager:
    """Manages all CRM connections for a tenant."""

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def get_connection(self, tenant_id: str, crm_type: str) -> Optional[Dict]:
        """Get a specific CRM connection for a tenant."""
        try:
            result = self.supabase.table('crm_connections').select('*').eq(
                'tenant_id', tenant_id
            ).eq('crm_type', crm_type).eq('is_active', True).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning(f"Failed to get {crm_type} connection for tenant {tenant_id}: {e}")
        return None

    async def get_active_connections(self, tenant_id: str) -> List[Dict]:
        """Get all active CRM connections for a tenant, with caching."""
        now = time.time()

        # Check cache
        if tenant_id in _crm_connections_cache:
            entry = _crm_connections_cache[tenant_id]
            if now - entry.get("cached_at", 0) < CRM_CACHE_TTL:
                return entry["connections"]

        # Query DB
        try:
            result = self.supabase.table('crm_connections').select('*').eq(
                'tenant_id', tenant_id
            ).eq('is_active', True).execute()
            connections = result.data or []
            _crm_connections_cache[tenant_id] = {
                "connections": connections,
                "cached_at": now,
            }
            return connections
        except Exception as e:
            logger.warning(f"Failed to get CRM connections for tenant {tenant_id}: {e}")
            return []

    async def store_connection(
        self, tenant_id: str, crm_type: str, credentials: Dict, config: Dict = None
    ) -> Dict:
        """Store or update a CRM connection (UPSERT)."""
        from crypto_utils import encrypt_value
        now_iso = self._now_iso()

        # Encrypt sensitive credential values
        encrypted_creds = {}
        for key, val in credentials.items():
            if val and key in (
                'webhook_url', 'access_token', 'refresh_token', 'api_key'
            ):
                encrypted_creds[key] = encrypt_value(str(val))
            else:
                encrypted_creds[key] = val

        # Check if connection already exists (including inactive/soft-deleted)
        existing = None
        try:
            result = self.supabase.table('crm_connections').select('*').eq(
                'tenant_id', tenant_id
            ).eq('crm_type', crm_type).execute()
            if result.data:
                existing = result.data[0]
        except Exception as e:
            logger.warning(f"Failed to check existing {crm_type} connection: {e}")

        try:
            if existing:
                # Update existing (include tenant_id guard for safety)
                result = self.supabase.table('crm_connections').update({
                    "credentials": encrypted_creds,
                    "config": config or {},
                    "is_active": True,
                    "connected_at": now_iso,
                }).eq('id', existing['id']).eq('tenant_id', tenant_id).execute()
            else:
                # Insert new
                result = self.supabase.table('crm_connections').insert({
                    "tenant_id": tenant_id,
                    "crm_type": crm_type,
                    "credentials": encrypted_creds,
                    "config": config or {},
                    "is_active": True,
                    "connected_at": now_iso,
                }).execute()
        except Exception as e:
            logger.error(f"Failed to store {crm_type} connection for tenant {tenant_id}: {e}")
            self._invalidate_cache(tenant_id)
            raise

        # Invalidate cache
        self._invalidate_cache(tenant_id)

        return result.data[0] if result.data else {}

    async def remove_connection(self, tenant_id: str, crm_type: str) -> bool:
        """Soft-delete a CRM connection (set is_active=false)."""
        try:
            self.supabase.table('crm_connections').update({
                "is_active": False,
            }).eq('tenant_id', tenant_id).eq('crm_type', crm_type).execute()
            self._invalidate_cache(tenant_id)
            logger.info(f"Removed {crm_type} connection for tenant {tenant_id}")
            return True
        except Exception as e:
            logger.warning(f"Failed to remove {crm_type} connection: {e}")
            return False

    async def update_credentials(self, tenant_id: str, crm_type: str, credentials: Dict) -> bool:
        """Update credentials for an existing connection (e.g., token refresh). Merges with existing credentials."""
        from crypto_utils import encrypt_value

        # Read existing credentials first to merge (not replace)
        existing = await self.get_connection(tenant_id, crm_type)
        if not existing:
            logger.warning(f"Cannot update credentials: no active {crm_type} connection for tenant {tenant_id}")
            return False

        merged_creds = dict(existing.get("credentials", {}))
        for key, val in credentials.items():
            if val and key in (
                'webhook_url', 'access_token', 'refresh_token', 'api_key'
            ):
                merged_creds[key] = encrypt_value(str(val))
            else:
                merged_creds[key] = val

        try:
            self.supabase.table('crm_connections').update({
                "credentials": merged_creds,
            }).eq('tenant_id', tenant_id).eq('crm_type', crm_type).eq('is_active', True).execute()
            self._invalidate_cache(tenant_id)
            return True
        except Exception as e:
            logger.warning(f"Failed to update {crm_type} credentials: {e}")
            return False

    async def update_last_sync(self, tenant_id: str, crm_type: str) -> None:
        """Update last_sync_at timestamp."""
        try:
            self.supabase.table('crm_connections').update({
                "last_sync_at": self._now_iso(),
            }).eq('tenant_id', tenant_id).eq('crm_type', crm_type).execute()
        except Exception as e:
            logger.debug(f"Failed to update last_sync for {crm_type}: {e}")

    def _invalidate_cache(self, tenant_id: str):
        """Remove tenant from connection cache."""
        _crm_connections_cache.pop(tenant_id, None)

    @staticmethod
    def _now_iso() -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
