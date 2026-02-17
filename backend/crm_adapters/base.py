"""
Abstract CRM Adapter base class.
All CRM-specific details live behind this abstraction.
Dashboard/agents never see CRM-specific field names.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional


class CRMAdapter(ABC):
    """One implementation per CRM. Provides normalized data access."""

    @abstractmethod
    async def test_connection(self) -> dict:
        """Verify CRM credentials are valid. Returns {"ok": bool, "message": str}."""

    @abstractmethod
    def supported_entities(self) -> list[str]:
        """Return list of entity types this adapter can sync (e.g., ['leads', 'deals', 'contacts'])."""

    @abstractmethod
    async def fetch_page(self, entity: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], bool]:
        """
        Fetch one page of raw records from the CRM.

        Args:
            entity: Entity type ('leads', 'deals', 'contacts', 'companies', 'activities')
            offset: Pagination offset (records to skip)
            limit: Page size

        Returns:
            Tuple of (raw_records, has_more)
        """

    @abstractmethod
    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        """
        Fetch records modified since a timestamp (for incremental sync).
        Returns raw records from the CRM API.
        """

    @abstractmethod
    def normalize(self, entity: str, raw_record: dict) -> dict:
        """
        Transform a CRM-specific record into the normalized schema.
        Output keys must match crm_* table columns exactly.
        """

    async def get_total_count(self, entity: str) -> Optional[int]:
        """
        Get total record count for an entity (if the CRM supports it).
        Returns None if not supported.
        """
        return None
