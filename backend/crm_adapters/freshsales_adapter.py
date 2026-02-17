"""
Freshsales CRM Adapter.
Wraps FreshsalesCRM with normalization + pagination for ETL sync.
"""

import logging
from datetime import datetime
from typing import Optional

from .base import CRMAdapter

logger = logging.getLogger(__name__)

FRESHSALES_PAGE_SIZE = 100


class FreshsalesAdapter(CRMAdapter):
    """Adapter for Freshsales CRM via API key."""

    def __init__(self, client):
        """
        Args:
            client: FreshsalesCRM instance (from freshsales_crm.py)
        """
        self.client = client

    async def test_connection(self) -> dict:
        return await self.client.test_connection()

    def supported_entities(self) -> list[str]:
        return ["contacts", "deals"]

    async def fetch_page(self, entity: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], bool]:
        endpoint = self._endpoint_for(entity)
        if not endpoint:
            return [], False

        page = (offset // FRESHSALES_PAGE_SIZE) + 1
        per_page = min(limit, FRESHSALES_PAGE_SIZE)

        try:
            result = await self.client._call(
                "GET", endpoint,
                params={"page": page, "per_page": per_page}
            )
            # Freshsales returns data under the entity key
            records = result.get(entity, [])
            # If we got a full page, there might be more
            has_more = len(records) >= per_page
            return records, has_more
        except Exception as e:
            logger.error(f"Freshsales fetch_page error ({entity}): {e}")
            return [], False

    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        endpoint = self._endpoint_for(entity)
        if not endpoint:
            return []

        # Freshsales doesn't have a native "modified since" filter on list endpoints
        # We fetch recent pages and filter client-side
        all_records = []
        page = 1
        since_str = since.isoformat()

        try:
            while True:
                result = await self.client._call(
                    "GET", endpoint,
                    params={
                        "page": page,
                        "per_page": FRESHSALES_PAGE_SIZE,
                        "sort": "updated_at",
                        "sort_type": "desc",
                    }
                )
                records = result.get(entity, [])
                if not records:
                    break

                # Filter to only records modified since our cursor
                for record in records:
                    updated_at = record.get("updated_at", "")
                    if updated_at and updated_at >= since_str:
                        all_records.append(record)
                    else:
                        # Since sorted desc, once we find older records, stop
                        return all_records

                if len(records) < FRESHSALES_PAGE_SIZE:
                    break
                page += 1
                if page > 50:
                    break

            return all_records
        except Exception as e:
            logger.error(f"Freshsales fetch_modified_since error ({entity}): {e}")
            return []

    def normalize(self, entity: str, raw: dict) -> dict:
        normalizer = {
            "contacts": self._normalize_contact,
            "deals": self._normalize_deal,
        }
        fn = normalizer.get(entity)
        if not fn:
            return {}
        return fn(raw)

    def _endpoint_for(self, entity: str) -> Optional[str]:
        return {
            "contacts": "/api/contacts",
            "deals": "/api/deals",
        }.get(entity)

    def _parse_date(self, value) -> Optional[str]:
        if not value:
            return None
        return str(value)

    def _normalize_contact(self, raw: dict) -> dict:
        name_parts = [raw.get("first_name", ""), raw.get("last_name", "")]
        name = " ".join(p for p in name_parts if p).strip() or None

        # Company can be a nested object
        company = raw.get("company")
        company_name = None
        if isinstance(company, dict):
            company_name = company.get("name")
        elif isinstance(company, str):
            company_name = company

        return {
            "external_id": str(raw.get("id", "")),
            "name": name,
            "phone": raw.get("mobile_number") or raw.get("work_number"),
            "email": raw.get("email"),
            "company": company_name,
            "created_at": self._parse_date(raw.get("created_at")),
            "modified_at": self._parse_date(raw.get("updated_at")),
        }

    def _normalize_deal(self, raw: dict) -> dict:
        amount = raw.get("amount")

        try:
            value = float(amount) if amount else None
        except (ValueError, TypeError):
            value = None

        # Freshsales deal stage can be an ID or name depending on API version
        stage = raw.get("deal_stage", {})
        stage_name = None
        if isinstance(stage, dict):
            stage_name = stage.get("name")
        elif stage:
            stage_name = str(stage)

        won = stage_name and stage_name.lower() in ("won", "closed won") if stage_name else None

        return {
            "external_id": str(raw.get("id", "")),
            "title": raw.get("name"),
            "stage": stage_name,
            "value": value,
            "currency": raw.get("base_currency_amount", {}).get("currency", "USD") if isinstance(raw.get("base_currency_amount"), dict) else "USD",
            "assigned_to": str(raw.get("owner_id", "")) if raw.get("owner_id") else None,
            "contact_id": None,
            "company_id": None,
            "won": won,
            "created_at": self._parse_date(raw.get("created_at")),
            "closed_at": self._parse_date(raw.get("closed_date")),
            "modified_at": self._parse_date(raw.get("updated_at")),
        }
