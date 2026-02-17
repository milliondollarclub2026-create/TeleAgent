"""
Bitrix24 CRM Adapter.
Wraps BitrixCRMClient with normalization + full pagination for ETL sync.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from .base import CRMAdapter

logger = logging.getLogger(__name__)


class BitrixAdapter(CRMAdapter):
    """Adapter for Bitrix24 CRM via webhook URL."""

    def __init__(self, client):
        """
        Args:
            client: BitrixCRMClient instance (from bitrix_crm.py)
        """
        self.client = client

    async def test_connection(self) -> dict:
        return await self.client.test_connection()

    def supported_entities(self) -> list[str]:
        return ["leads", "deals", "contacts", "companies", "activities"]

    async def fetch_page(self, entity: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], bool]:
        method_map = {
            "leads": "crm.lead.list",
            "deals": "crm.deal.list",
            "contacts": "crm.contact.list",
            "companies": "crm.company.list",
            "activities": "crm.activity.list",
        }
        method = method_map.get(entity)
        if not method:
            return [], False

        select_map = {
            "leads": ["ID", "TITLE", "NAME", "LAST_NAME", "PHONE", "EMAIL",
                       "STATUS_ID", "SOURCE_ID", "ASSIGNED_BY_ID", "COMPANY_TITLE",
                       "OPPORTUNITY", "CURRENCY_ID", "DATE_CREATE", "DATE_MODIFY"],
            "deals": ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "CURRENCY_ID",
                       "ASSIGNED_BY_ID", "CONTACT_ID", "COMPANY_ID",
                       "DATE_CREATE", "CLOSEDATE", "DATE_MODIFY"],
            "contacts": ["ID", "NAME", "LAST_NAME", "PHONE", "EMAIL",
                          "COMPANY_ID", "DATE_CREATE", "DATE_MODIFY"],
            "companies": ["ID", "TITLE", "INDUSTRY", "EMPLOYEES",
                           "REVENUE", "DATE_CREATE", "DATE_MODIFY"],
            "activities": ["ID", "TYPE_ID", "SUBJECT", "RESPONSIBLE_ID",
                            "DURATION", "COMPLETED", "START_TIME",
                            "CREATED", "LAST_UPDATED"],
        }

        params = {
            "select": select_map.get(entity, ["ID"]),
            "order": {"ID": "ASC"},
            "start": offset,
        }

        try:
            result = await self.client._call(method, params)
            records = result if isinstance(result, list) else []
            has_more = len(records) >= 50
            return records, has_more
        except Exception as e:
            logger.error(f"Bitrix fetch_page error ({entity}, offset={offset}): {e}")
            return [], False

    async def fetch_modified_since(self, entity: str, since: datetime) -> list[dict]:
        method_map = {
            "leads": "crm.lead.list",
            "deals": "crm.deal.list",
            "contacts": "crm.contact.list",
            "companies": "crm.company.list",
            "activities": "crm.activity.list",
        }
        method = method_map.get(entity)
        if not method:
            return []

        date_field = "LAST_UPDATED" if entity == "activities" else "DATE_MODIFY"
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S")

        select_map = {
            "leads": ["ID", "TITLE", "NAME", "LAST_NAME", "PHONE", "EMAIL",
                       "STATUS_ID", "SOURCE_ID", "ASSIGNED_BY_ID", "COMPANY_TITLE",
                       "OPPORTUNITY", "CURRENCY_ID", "DATE_CREATE", "DATE_MODIFY"],
            "deals": ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "CURRENCY_ID",
                       "ASSIGNED_BY_ID", "CONTACT_ID", "COMPANY_ID",
                       "DATE_CREATE", "CLOSEDATE", "DATE_MODIFY"],
            "contacts": ["ID", "NAME", "LAST_NAME", "PHONE", "EMAIL",
                          "COMPANY_ID", "DATE_CREATE", "DATE_MODIFY"],
            "companies": ["ID", "TITLE", "INDUSTRY", "EMPLOYEES",
                           "REVENUE", "DATE_CREATE", "DATE_MODIFY"],
            "activities": ["ID", "TYPE_ID", "SUBJECT", "RESPONSIBLE_ID",
                            "DURATION", "COMPLETED", "START_TIME",
                            "CREATED", "LAST_UPDATED"],
        }

        params = {
            "filter": {f">{date_field}": since_str},
            "select": select_map.get(entity, ["ID"]),
            "order": {"ID": "ASC"},
        }

        all_records = []
        start = 0
        try:
            while True:
                params["start"] = start
                result = await self.client._call(method, params)
                records = result if isinstance(result, list) else []
                if not records:
                    break
                all_records.extend(records)
                if len(records) < 50:
                    break
                start += 50
                if start > 10000:
                    break
            return all_records
        except Exception as e:
            logger.error(f"Bitrix fetch_modified_since error ({entity}): {e}")
            return []

    def normalize(self, entity: str, raw: dict) -> dict:
        normalizer = {
            "leads": self._normalize_lead,
            "deals": self._normalize_deal,
            "contacts": self._normalize_contact,
            "companies": self._normalize_company,
            "activities": self._normalize_activity,
        }
        fn = normalizer.get(entity)
        if not fn:
            return {}
        return fn(raw)

    def _parse_date(self, value) -> Optional[str]:
        """Parse Bitrix date string to ISO format."""
        if not value:
            return None
        try:
            if isinstance(value, str):
                return value
            return str(value)
        except Exception:
            return None

    def _extract_phone(self, raw) -> Optional[str]:
        """Extract first phone from Bitrix phone array."""
        phone = raw.get("PHONE")
        if isinstance(phone, list) and phone:
            return phone[0].get("VALUE")
        if isinstance(phone, str):
            return phone
        return None

    def _extract_email(self, raw) -> Optional[str]:
        """Extract first email from Bitrix email array."""
        email = raw.get("EMAIL")
        if isinstance(email, list) and email:
            return email[0].get("VALUE")
        if isinstance(email, str):
            return email
        return None

    def _normalize_lead(self, raw: dict) -> dict:
        name_parts = [raw.get("NAME", ""), raw.get("LAST_NAME", "")]
        contact_name = " ".join(p for p in name_parts if p).strip() or None

        return {
            "external_id": str(raw.get("ID", "")),
            "title": raw.get("TITLE"),
            "status": raw.get("STATUS_ID"),
            "source": raw.get("SOURCE_ID"),
            "assigned_to": str(raw.get("ASSIGNED_BY_ID", "")) or None,
            "contact_name": contact_name,
            "contact_phone": self._extract_phone(raw),
            "contact_email": self._extract_email(raw),
            "value": float(raw["OPPORTUNITY"]) if raw.get("OPPORTUNITY") else None,
            "currency": raw.get("CURRENCY_ID", "USD"),
            "created_at": self._parse_date(raw.get("DATE_CREATE")),
            "modified_at": self._parse_date(raw.get("DATE_MODIFY")),
        }

    def _normalize_deal(self, raw: dict) -> dict:
        stage = raw.get("STAGE_ID", "")
        won = stage.startswith("WON") if stage else None

        return {
            "external_id": str(raw.get("ID", "")),
            "title": raw.get("TITLE"),
            "stage": stage,
            "value": float(raw["OPPORTUNITY"]) if raw.get("OPPORTUNITY") else None,
            "currency": raw.get("CURRENCY_ID", "USD"),
            "assigned_to": str(raw.get("ASSIGNED_BY_ID", "")) or None,
            "contact_id": str(raw.get("CONTACT_ID", "")) or None,
            "company_id": str(raw.get("COMPANY_ID", "")) or None,
            "won": won,
            "created_at": self._parse_date(raw.get("DATE_CREATE")),
            "closed_at": self._parse_date(raw.get("CLOSEDATE")),
            "modified_at": self._parse_date(raw.get("DATE_MODIFY")),
        }

    def _normalize_contact(self, raw: dict) -> dict:
        name_parts = [raw.get("NAME", ""), raw.get("LAST_NAME", "")]
        name = " ".join(p for p in name_parts if p).strip() or None

        return {
            "external_id": str(raw.get("ID", "")),
            "name": name,
            "phone": self._extract_phone(raw),
            "email": self._extract_email(raw),
            "company": str(raw.get("COMPANY_ID", "")) or None,
            "created_at": self._parse_date(raw.get("DATE_CREATE")),
            "modified_at": self._parse_date(raw.get("DATE_MODIFY")),
        }

    def _normalize_company(self, raw: dict) -> dict:
        employees = raw.get("EMPLOYEES")
        try:
            employee_count = int(employees) if employees else None
        except (ValueError, TypeError):
            employee_count = None

        revenue = raw.get("REVENUE")
        try:
            revenue_val = float(revenue) if revenue else None
        except (ValueError, TypeError):
            revenue_val = None

        return {
            "external_id": str(raw.get("ID", "")),
            "name": raw.get("TITLE"),
            "industry": raw.get("INDUSTRY"),
            "employee_count": employee_count,
            "revenue": revenue_val,
            "created_at": self._parse_date(raw.get("DATE_CREATE")),
            "modified_at": self._parse_date(raw.get("DATE_MODIFY")),
        }

    def _normalize_activity(self, raw: dict) -> dict:
        type_map = {"1": "task", "2": "call", "3": "email", "4": "meeting", "6": "email"}
        type_id = str(raw.get("TYPE_ID", ""))

        duration = raw.get("DURATION")
        try:
            duration_seconds = int(duration) if duration else None
        except (ValueError, TypeError):
            duration_seconds = None

        completed_raw = raw.get("COMPLETED")
        completed = completed_raw == "Y" if isinstance(completed_raw, str) else bool(completed_raw) if completed_raw is not None else None

        return {
            "external_id": str(raw.get("ID", "")),
            "type": type_map.get(type_id, type_id),
            "subject": raw.get("SUBJECT"),
            "employee_id": str(raw.get("RESPONSIBLE_ID", "")) or None,
            "employee_name": None,
            "duration_seconds": duration_seconds,
            "completed": completed,
            "started_at": self._parse_date(raw.get("START_TIME") or raw.get("CREATED")),
        }
