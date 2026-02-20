"""
Bitrix24 CRM Adapter.
Wraps BitrixCRMClient with normalization + full pagination for ETL sync.
"""

import asyncio
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
        # Rep name resolution cache: {str(user_id): "First Last"}
        # Populated by prepare_user_cache() or load_user_cache_from_db()
        self._user_cache: dict[str, str] = {}

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
            envelope = await self.client._call_raw(method, params)
            result = envelope.get("result", []) if isinstance(envelope, dict) else []
            records = result if isinstance(result, list) else []
            # Authoritative: Bitrix only includes "next" when more pages exist
            has_more = "next" in envelope if isinstance(envelope, dict) else False
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
                envelope = await self.client._call_raw(method, params)
                result = envelope.get("result", []) if isinstance(envelope, dict) else []
                records = result if isinstance(result, list) else []
                if not records:
                    break
                all_records.extend(records)
                # Use authoritative "next" field instead of len(records) < 50
                if "next" not in envelope:
                    break
                start = envelope["next"]
                if start > 10000:
                    break
            return all_records
        except Exception as e:
            logger.error(f"Bitrix fetch_modified_since error ({entity}): {e}")
            return []

    async def prepare_user_cache(
        self, supabase=None, tenant_id: str = None, crm_source: str = None
    ) -> None:
        """
        Fetch the Bitrix24 user directory via user.get and build the rep name cache.
        Upserts records to crm_users for persistence across incremental sync cycles.
        Called once at the start of a full sync — non-fatal if it fails.
        """
        all_users: list[dict] = []
        start = 0

        try:
            while True:
                envelope = await self.client._call_raw("user.get", {
                    "select": ["ID", "NAME", "LAST_NAME", "EMAIL"],
                    "start": start,
                })
                result = envelope.get("result", []) if isinstance(envelope, dict) else []
                users = result if isinstance(result, list) else []
                if not users:
                    break
                all_users.extend(users)
                # Use authoritative "next" field instead of len(users) < 50
                if "next" not in envelope:
                    break
                start = envelope["next"]
                if start > 5000:  # Safety cap — portals with >5k users are enterprise
                    logger.warning("Bitrix user.get pagination cap reached at 5000")
                    break
        except Exception as e:
            logger.warning(f"Bitrix user.get failed — rep names will not be resolved: {e}")
            return  # Non-fatal: normalize falls back to employee_id

        # Build in-memory cache
        self._user_cache = {}
        db_records: list[dict] = []
        for u in all_users:
            uid = str(u.get("ID", "")).strip()
            if not uid:
                continue
            name_parts = [u.get("NAME", "") or "", u.get("LAST_NAME", "") or ""]
            full_name = " ".join(p for p in name_parts if p).strip()
            display_name = full_name or f"User {uid}"
            self._user_cache[uid] = display_name
            db_records.append({
                "tenant_id": tenant_id,
                "crm_source": crm_source,
                "external_id": uid,
                "name": display_name,
                "email": u.get("EMAIL") or None,
                "is_active": True,
                "synced_at": datetime.now(timezone.utc).isoformat(),
            })

        # Persist to crm_users (best-effort; non-fatal, in thread to avoid blocking)
        if supabase and tenant_id and crm_source and db_records:
            try:
                for i in range(0, len(db_records), 500):
                    batch = db_records[i:i + 500]
                    await asyncio.to_thread(lambda b=batch: supabase.table("crm_users").upsert(
                        b,
                        on_conflict="tenant_id,crm_source,external_id",
                    ).execute())
                logger.info(
                    f"User cache ready: {len(self._user_cache)} reps "
                    f"(tenant={tenant_id}, crm={crm_source})"
                )
            except Exception as e:
                logger.warning(f"Failed to persist user cache to crm_users: {e}")

    async def load_user_cache_from_db(
        self, supabase=None, tenant_id: str = None, crm_source: str = None
    ) -> None:
        """
        Load the rep name cache from the crm_users DB table (no API call).
        Used by incremental sync so every 15-min loop doesn't hit the Bitrix API.
        Falls back silently if the table is empty or not yet populated.
        """
        if not supabase or not tenant_id or not crm_source:
            return
        try:
            result = await asyncio.to_thread(lambda: (
                supabase.table("crm_users")
                .select("external_id, name")
                .eq("tenant_id", tenant_id)
                .eq("crm_source", crm_source)
                .eq("is_active", True)
                .execute()
            ))
            for row in result.data or []:
                uid = str(row.get("external_id", "")).strip()
                name = row.get("name") or ""
                if uid and name:
                    self._user_cache[uid] = name
        except Exception as e:
            logger.warning(f"Failed to load user cache from crm_users: {e}")

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
        """Parse Bitrix date string to consistent ISO format.

        Bitrix returns mixed formats: ISO with T, space-separated,
        with/without Z suffix. Normalize all to ISO 8601.
        """
        if not value:
            return None
        try:
            if isinstance(value, str):
                # Normalize common Bitrix date quirks
                cleaned = value.strip()
                # Replace space separator with T (e.g. "2024-01-15 10:30:00")
                if " " in cleaned and "T" not in cleaned:
                    cleaned = cleaned.replace(" ", "T", 1)
                # Strip trailing Z for fromisoformat compatibility (Python <3.11)
                if cleaned.endswith("Z"):
                    cleaned = cleaned[:-1] + "+00:00"
                # Validate by parsing, then re-serialize
                dt = datetime.fromisoformat(cleaned)
                return dt.isoformat()
            return str(value)
        except (ValueError, TypeError):
            # If parsing fails, return the raw string as fallback
            logger.debug("Could not parse date value: %s", value)
            return str(value) if value else None

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
        won = (stage == "WON" or stage.endswith(":WON")) if stage else None

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
        completed = (
            completed_raw == "Y"
            if isinstance(completed_raw, str)
            else bool(completed_raw) if completed_raw is not None else None
        )

        employee_id = str(raw.get("RESPONSIBLE_ID", "")).strip() or None
        # Resolve name from in-memory cache (populated by prepare_user_cache or
        # load_user_cache_from_db before the sync loop processes activities).
        employee_name = self._user_cache.get(employee_id) if employee_id else None

        return {
            "external_id": str(raw.get("ID", "")),
            "type": type_map.get(type_id, type_id),
            "subject": raw.get("SUBJECT"),
            "employee_id": employee_id,
            "employee_name": employee_name,
            "duration_seconds": duration_seconds,
            "completed": completed,
            "started_at": self._parse_date(raw.get("START_TIME") or raw.get("CREATED")),
            # LAST_UPDATED is fetched in select_map["activities"] and used as
            # the incremental sync cursor field via _get_max_modified().
            # Fall back to CREATED if LAST_UPDATED is missing (some activities lack it).
            "modified_at": self._parse_date(raw.get("LAST_UPDATED") or raw.get("CREATED")),
        }
