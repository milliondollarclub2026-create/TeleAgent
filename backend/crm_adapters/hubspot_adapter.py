"""
HubSpot CRM Adapter.
Wraps HubSpotCRM with normalization + Search API pagination for ETL sync.
"""

import logging
from datetime import datetime
from typing import Optional

from .base import CRMAdapter

logger = logging.getLogger(__name__)

# HubSpot Search API max page size
HUBSPOT_PAGE_SIZE = 100


class HubSpotAdapter(CRMAdapter):
    """Adapter for HubSpot CRM via OAuth 2.0."""

    def __init__(self, client):
        """
        Args:
            client: HubSpotCRM instance (from hubspot_crm.py)
        """
        self.client = client

    async def test_connection(self) -> dict:
        return await self.client.test_connection()

    def supported_entities(self) -> list[str]:
        return ["deals", "contacts", "companies"]

    async def fetch_page(self, entity: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], bool]:
        object_type = self._entity_to_object(entity)
        if not object_type:
            return [], False

        properties = self._properties_for(entity)
        params = {
            "limit": min(limit, HUBSPOT_PAGE_SIZE),
            "properties": ",".join(properties),
        }

        # HubSpot uses cursor-based pagination via 'after' param
        # We approximate offset by paginating sequentially
        # For full sync, the sync engine calls this in order
        if offset > 0:
            # Use search API for offset-based access
            return await self._search_page(entity, offset, limit)

        try:
            result = await self.client._call(
                "GET", f"/crm/v3/objects/{object_type}", params=params
            )
            records = result.get("results", [])
            has_more = result.get("paging", {}).get("next") is not None
            return records, has_more
        except Exception as e:
            logger.error(f"HubSpot fetch_page error ({entity}): {e}")
            return [], False

    async def _search_page(self, entity: str, offset: int, limit: int) -> tuple[list[dict], bool]:
        """Use Search API for paginated access."""
        object_type = self._entity_to_object(entity)
        properties = self._properties_for(entity)

        try:
            result = await self.client._call(
                "POST", f"/crm/v3/objects/{object_type}/search",
                data={
                    "filterGroups": [],
                    "properties": properties,
                    "limit": min(limit, HUBSPOT_PAGE_SIZE),
                    "after": str(offset),
                    "sorts": [{"propertyName": "hs_object_id", "direction": "ASCENDING"}],
                }
            )
            records = result.get("results", [])
            has_more = result.get("paging", {}).get("next") is not None
            return records, has_more
        except Exception as e:
            logger.error(f"HubSpot search_page error ({entity}): {e}")
            return [], False

    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        object_type = self._entity_to_object(entity)
        if not object_type:
            return []

        properties = self._properties_for(entity)
        since_ms = str(int(since.timestamp() * 1000))

        all_records = []
        after = "0"

        try:
            while True:
                result = await self.client._call(
                    "POST", f"/crm/v3/objects/{object_type}/search",
                    data={
                        "filterGroups": [{
                            "filters": [{
                                "propertyName": "hs_lastmodifieddate",
                                "operator": "GTE",
                                "value": since_ms,
                            }]
                        }],
                        "properties": properties,
                        "limit": HUBSPOT_PAGE_SIZE,
                        "after": after,
                        "sorts": [{"propertyName": "hs_object_id", "direction": "ASCENDING"}],
                    }
                )
                records = result.get("results", [])
                if not records:
                    break
                all_records.extend(records)
                paging = result.get("paging", {}).get("next")
                if not paging:
                    break
                after = paging.get("after", "")
                if not after or len(all_records) > 10000:
                    break
            return all_records
        except Exception as e:
            logger.error(f"HubSpot fetch_modified_since error ({entity}): {e}")
            return []

    def normalize(self, entity: str, raw: dict) -> dict:
        normalizer = {
            "deals": self._normalize_deal,
            "contacts": self._normalize_contact,
            "companies": self._normalize_company,
        }
        fn = normalizer.get(entity)
        if not fn:
            return {}
        return fn(raw)

    def _entity_to_object(self, entity: str) -> Optional[str]:
        return {"deals": "deals", "contacts": "contacts", "companies": "companies"}.get(entity)

    def _properties_for(self, entity: str) -> list[str]:
        return {
            "deals": ["dealname", "dealstage", "amount", "pipeline",
                       "hubspot_owner_id", "hs_lastmodifieddate",
                       "createdate", "closedate"],
            "contacts": ["firstname", "lastname", "email", "phone",
                          "company", "createdate", "hs_lastmodifieddate"],
            "companies": ["name", "industry", "numberofemployees",
                           "annualrevenue", "createdate", "hs_lastmodifieddate"],
        }.get(entity, [])

    def _parse_date(self, value) -> Optional[str]:
        if not value:
            return None
        return str(value)

    def _normalize_deal(self, raw: dict) -> dict:
        props = raw.get("properties", {})
        stage = props.get("dealstage", "")
        amount = props.get("amount")

        return {
            "external_id": str(raw.get("id", "")),
            "title": props.get("dealname"),
            "stage": stage,
            "value": float(amount) if amount else None,
            "currency": "USD",
            "assigned_to": props.get("hubspot_owner_id"),
            "contact_id": None,
            "company_id": None,
            "won": stage == "closedwon" if stage else None,
            "created_at": self._parse_date(props.get("createdate")),
            "closed_at": self._parse_date(props.get("closedate")),
            "modified_at": self._parse_date(props.get("hs_lastmodifieddate")),
        }

    def _normalize_contact(self, raw: dict) -> dict:
        props = raw.get("properties", {})
        name_parts = [props.get("firstname", ""), props.get("lastname", "")]
        name = " ".join(p for p in name_parts if p).strip() or None

        return {
            "external_id": str(raw.get("id", "")),
            "name": name,
            "phone": props.get("phone"),
            "email": props.get("email"),
            "company": props.get("company"),
            "created_at": self._parse_date(props.get("createdate")),
            "modified_at": self._parse_date(props.get("hs_lastmodifieddate")),
        }

    def _normalize_company(self, raw: dict) -> dict:
        props = raw.get("properties", {})
        employees = props.get("numberofemployees")
        revenue = props.get("annualrevenue")

        try:
            employee_count = int(employees) if employees else None
        except (ValueError, TypeError):
            employee_count = None

        try:
            revenue_val = float(revenue) if revenue else None
        except (ValueError, TypeError):
            revenue_val = None

        return {
            "external_id": str(raw.get("id", "")),
            "name": props.get("name"),
            "industry": props.get("industry"),
            "employee_count": employee_count,
            "revenue": revenue_val,
            "created_at": self._parse_date(props.get("createdate")),
            "modified_at": self._parse_date(props.get("hs_lastmodifieddate")),
        }
