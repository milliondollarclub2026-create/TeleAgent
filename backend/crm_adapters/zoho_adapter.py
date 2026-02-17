"""
Zoho CRM Adapter.
Wraps ZohoCRM with normalization + pagination for ETL sync.
Handles token refresh (single-use refresh tokens).
"""

import logging
from datetime import datetime
from typing import Optional

from .base import CRMAdapter

logger = logging.getLogger(__name__)

ZOHO_PAGE_SIZE = 200  # Zoho allows up to 200 per page


class ZohoAdapter(CRMAdapter):
    """Adapter for Zoho CRM via OAuth 2.0."""

    def __init__(self, client, on_token_refresh=None):
        """
        Args:
            client: ZohoCRM instance (from zoho_crm.py)
            on_token_refresh: Optional async callback(new_access_token, new_refresh_token)
                              to persist refreshed tokens
        """
        self.client = client
        self.on_token_refresh = on_token_refresh

    async def test_connection(self) -> dict:
        return await self.client.test_connection()

    def supported_entities(self) -> list[str]:
        return ["leads", "deals", "contacts", "companies"]

    def _module_for(self, entity: str) -> Optional[str]:
        return {
            "leads": "Leads",
            "deals": "Deals",
            "contacts": "Contacts",
            "companies": "Accounts",
        }.get(entity)

    def _fields_for(self, entity: str) -> str:
        fields_map = {
            "leads": "id,First_Name,Last_Name,Email,Phone,Company,Lead_Source,Lead_Status,Annual_Revenue,Created_Time,Modified_Time",
            "deals": "id,Deal_Name,Stage,Amount,Currency,Owner,Contact_Name,Account_Name,Closing_Date,Created_Time,Modified_Time",
            "contacts": "id,First_Name,Last_Name,Email,Phone,Account_Name,Created_Time,Modified_Time",
            "companies": "id,Account_Name,Industry,Employees,Annual_Revenue,Created_Time,Modified_Time",
        }
        return fields_map.get(entity, "id")

    async def _ensure_token(self):
        """Refresh token if needed before API calls."""
        # Check if token might be expired (simple heuristic)
        # The actual ZohoCRM client will raise 401 if expired
        pass

    async def fetch_page(self, entity: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], bool]:
        module = self._module_for(entity)
        if not module:
            return [], False

        page = (offset // ZOHO_PAGE_SIZE) + 1
        fields = self._fields_for(entity)

        try:
            result = await self.client._call(
                "GET", f"/crm/v7/{module}",
                params={
                    "fields": fields,
                    "page": page,
                    "per_page": min(limit, ZOHO_PAGE_SIZE),
                    "sort_by": "id",
                    "sort_order": "asc",
                }
            )
            records = result.get("data", [])
            has_more = result.get("info", {}).get("more_records", False)
            return records, has_more
        except Exception as e:
            error_str = str(e)
            if "401" in error_str or "expired" in error_str.lower():
                # Try token refresh
                try:
                    token_data = await self.client.refresh_access_token()
                    if self.on_token_refresh:
                        await self.on_token_refresh(
                            token_data["access_token"],
                            token_data["refresh_token"]
                        )
                    # Retry
                    result = await self.client._call(
                        "GET", f"/crm/v7/{module}",
                        params={
                            "fields": fields,
                            "page": page,
                            "per_page": min(limit, ZOHO_PAGE_SIZE),
                            "sort_by": "id",
                            "sort_order": "asc",
                        }
                    )
                    records = result.get("data", [])
                    has_more = result.get("info", {}).get("more_records", False)
                    return records, has_more
                except Exception as refresh_error:
                    logger.error(f"Zoho token refresh failed: {refresh_error}")
            logger.error(f"Zoho fetch_page error ({entity}): {e}")
            return [], False

    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        module = self._module_for(entity)
        if not module:
            return []

        fields = self._fields_for(entity)
        # Zoho expects ISO 8601 format
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S+00:00")

        all_records = []
        page = 1

        try:
            while True:
                result = await self.client._call(
                    "GET", f"/crm/v7/{module}",
                    params={
                        "fields": fields,
                        "modified_since": since_str,
                        "page": page,
                        "per_page": ZOHO_PAGE_SIZE,
                        "sort_by": "Modified_Time",
                        "sort_order": "asc",
                    }
                )
                records = result.get("data", [])
                if not records:
                    break
                all_records.extend(records)
                if not result.get("info", {}).get("more_records", False):
                    break
                page += 1
                if len(all_records) > 10000:
                    break
            return all_records
        except Exception as e:
            logger.error(f"Zoho fetch_modified_since error ({entity}): {e}")
            return []

    def normalize(self, entity: str, raw: dict) -> dict:
        normalizer = {
            "leads": self._normalize_lead,
            "deals": self._normalize_deal,
            "contacts": self._normalize_contact,
            "companies": self._normalize_company,
        }
        fn = normalizer.get(entity)
        if not fn:
            return {}
        return fn(raw)

    def _parse_date(self, value) -> Optional[str]:
        if not value:
            return None
        return str(value)

    def _normalize_lead(self, raw: dict) -> dict:
        name_parts = [raw.get("First_Name", ""), raw.get("Last_Name", "")]
        contact_name = " ".join(p for p in name_parts if p).strip() or None

        revenue = raw.get("Annual_Revenue")
        try:
            value = float(revenue) if revenue else None
        except (ValueError, TypeError):
            value = None

        return {
            "external_id": str(raw.get("id", "")),
            "title": contact_name or "Untitled Lead",
            "status": raw.get("Lead_Status"),
            "source": raw.get("Lead_Source"),
            "assigned_to": None,
            "contact_name": contact_name,
            "contact_phone": raw.get("Phone"),
            "contact_email": raw.get("Email"),
            "value": value,
            "currency": "USD",
            "created_at": self._parse_date(raw.get("Created_Time")),
            "modified_at": self._parse_date(raw.get("Modified_Time")),
        }

    def _normalize_deal(self, raw: dict) -> dict:
        stage = raw.get("Stage", "")
        amount = raw.get("Amount")

        try:
            value = float(amount) if amount else None
        except (ValueError, TypeError):
            value = None

        won = stage.lower() in ("closed won", "closed-won") if stage else None

        # Owner can be a dict in Zoho
        owner = raw.get("Owner")
        assigned_to = None
        if isinstance(owner, dict):
            assigned_to = owner.get("name") or str(owner.get("id", ""))
        elif owner:
            assigned_to = str(owner)

        return {
            "external_id": str(raw.get("id", "")),
            "title": raw.get("Deal_Name"),
            "stage": stage,
            "value": value,
            "currency": raw.get("Currency", "USD"),
            "assigned_to": assigned_to,
            "contact_id": None,
            "company_id": None,
            "won": won,
            "created_at": self._parse_date(raw.get("Created_Time")),
            "closed_at": self._parse_date(raw.get("Closing_Date")),
            "modified_at": self._parse_date(raw.get("Modified_Time")),
        }

    def _normalize_contact(self, raw: dict) -> dict:
        name_parts = [raw.get("First_Name", ""), raw.get("Last_Name", "")]
        name = " ".join(p for p in name_parts if p).strip() or None

        account = raw.get("Account_Name")
        company = None
        if isinstance(account, dict):
            company = account.get("name")
        elif account:
            company = str(account)

        return {
            "external_id": str(raw.get("id", "")),
            "name": name,
            "phone": raw.get("Phone"),
            "email": raw.get("Email"),
            "company": company,
            "created_at": self._parse_date(raw.get("Created_Time")),
            "modified_at": self._parse_date(raw.get("Modified_Time")),
        }

    def _normalize_company(self, raw: dict) -> dict:
        employees = raw.get("Employees")
        revenue = raw.get("Annual_Revenue")

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
            "name": raw.get("Account_Name"),
            "industry": raw.get("Industry"),
            "employee_count": employee_count,
            "revenue": revenue_val,
            "created_at": self._parse_date(raw.get("Created_Time")),
            "modified_at": self._parse_date(raw.get("Modified_Time")),
        }
