"""
Freshsales CRM Integration Module.
API key authentication (no OAuth required).
"""

import httpx
import logging
import asyncio
import time
import re
from typing import Optional, Dict, Any, List
from collections import defaultdict

logger = logging.getLogger(__name__)

FRESHSALES_TIMEOUT = 30.0
FRESHSALES_MAX_REQUESTS_PER_SECOND = 5
FRESHSALES_RATE_LIMIT_WINDOW = 1.0


class FreshsalesRateLimiter:
    """Rate limiter for Freshsales API calls."""

    def __init__(self, max_requests: int = FRESHSALES_MAX_REQUESTS_PER_SECOND, window: float = FRESHSALES_RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window = window
        self._requests = defaultdict(list)
        self._lock = asyncio.Lock()

    async def acquire(self, key: str = "default"):
        async with self._lock:
            now = time.time()
            self._requests[key] = [t for t in self._requests[key] if now - t < self.window]
            if len(self._requests[key]) >= self.max_requests:
                oldest = min(self._requests[key])
                wait_time = self.window - (now - oldest)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    now = time.time()
                    self._requests[key] = [t for t in self._requests[key] if now - t < self.window]
            self._requests[key].append(now)


_freshsales_rate_limiter = FreshsalesRateLimiter()


class FreshsalesAPIError(Exception):
    """Custom exception for Freshsales API errors."""
    pass


class FreshsalesCRM:
    """Client for Freshsales CRM API via API key."""

    def __init__(self, domain: str, api_key: str):
        """
        Args:
            domain: Freshsales subdomain (e.g., 'mycompany' for mycompany.freshsales.io)
            api_key: API key from Freshsales Settings > API Settings
        """
        # Normalize domain: strip whitespace, URL scheme, trailing slashes
        clean_domain = domain.strip().rstrip('/')
        clean_domain = re.sub(r'^https?://', '', clean_domain)

        # Extract subdomain if full hostname provided
        if '.freshsales.io' in clean_domain:
            # e.g., "mycompany.freshsales.io" or "mycompany.myfreshworks.com"
            self.domain = clean_domain
            self.base_url = f"https://{clean_domain}"
        else:
            # Validate subdomain: only alphanumeric and hyphens
            if not re.match(r'^[a-zA-Z0-9-]+$', clean_domain):
                raise FreshsalesAPIError("Invalid domain. Use only your subdomain (e.g., 'mycompany')")
            self.domain = clean_domain
            self.base_url = f"https://{clean_domain}.freshsales.io"
        self.api_key = api_key

    async def _call(self, method: str, path: str, data: dict = None, params: dict = None) -> dict:
        """Make authenticated API call to Freshsales."""
        await _freshsales_rate_limiter.acquire()

        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Token token={self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=FRESHSALES_TIMEOUT) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                else:
                    raise FreshsalesAPIError(f"Unsupported method: {method}")

                if response.status_code == 401:
                    raise FreshsalesAPIError("Authentication failed. Please check your API key")
                if response.status_code == 429:
                    raise FreshsalesAPIError("Rate limit exceeded")
                if response.status_code >= 400:
                    error_body = response.text[:500]
                    logger.error(f"Freshsales API error {response.status_code}: {error_body}")
                    raise FreshsalesAPIError(f"API error: {response.status_code}")

                if response.status_code == 204:
                    return {}
                return response.json()

        except httpx.TimeoutException:
            raise FreshsalesAPIError("Connection timeout. Please check your Freshsales domain")
        except httpx.RequestError as e:
            raise FreshsalesAPIError(f"Connection error: {str(e)}")

    # ==================== Connection Test ====================

    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection by fetching contacts."""
        try:
            result = await self._call("GET", "/api/contacts", params={"per_page": 1})
            return {
                "ok": True,
                "message": "Connection successful!",
                "domain": self.domain,
            }
        except FreshsalesAPIError as e:
            return {"ok": False, "message": str(e)}
        except Exception as e:
            return {"ok": False, "message": f"Unexpected error: {str(e)}"}

    # ==================== Contacts ====================

    async def search_contact(self, email: str = None, phone: str = None) -> Optional[Dict]:
        """Search for existing contact by email or phone."""
        query = email or phone
        if not query:
            return None

        try:
            result = await self._call("GET", "/api/lookup", params={
                "q": query,
                "f": "email" if email else "mobile_number",
                "entities": "contact",
            })
            contacts = result.get("contacts", {}).get("contacts", [])
            return contacts[0] if contacts else None
        except FreshsalesAPIError:
            return None

    async def create_contact(self, data: Dict) -> str:
        """Create a new contact. Returns contact ID."""
        contact = {}
        if data.get("first_name"):
            contact["first_name"] = data["first_name"]
        if data.get("last_name"):
            contact["last_name"] = data["last_name"]
        if data.get("email"):
            contact["email"] = data["email"]
        if data.get("mobile_number"):
            contact["mobile_number"] = data["mobile_number"]
        if data.get("company"):
            contact["company"] = {"name": data["company"]}

        result = await self._call("POST", "/api/contacts", data={"contact": contact})
        contact_id = str(result.get("contact", {}).get("id", ""))
        logger.info(f"Created Freshsales contact: {contact_id}")
        return contact_id

    async def update_contact(self, contact_id: str, data: Dict) -> bool:
        """Update an existing contact."""
        contact = {}
        for key in ("first_name", "last_name", "email", "mobile_number"):
            if data.get(key):
                contact[key] = data[key]

        if contact:
            await self._call("PUT", f"/api/contacts/{contact_id}", data={"contact": contact})
            logger.info(f"Updated Freshsales contact: {contact_id}")
        return True

    # ==================== Deals ====================

    async def create_deal(self, data: Dict, contact_id: str = None) -> str:
        """Create a deal, optionally linked to a contact."""
        deal = {
            "name": data.get("name", "New Deal from LeadRelay"),
        }
        if data.get("amount"):
            deal["amount"] = data["amount"]
        if contact_id:
            deal["contacts_id"] = [int(contact_id)] if contact_id.isdigit() else []

        result = await self._call("POST", "/api/deals", data={"deal": deal})
        deal_id = str(result.get("deal", {}).get("id", ""))
        logger.info(f"Created Freshsales deal: {deal_id}")
        return deal_id

    async def get_pipelines(self) -> List[Dict]:
        """Get deal pipelines/filters."""
        try:
            result = await self._call("GET", "/api/deals/filters")
            return result.get("filters", [])
        except FreshsalesAPIError:
            return []

    # ==================== Lead Push ====================

    async def push_lead(self, lead_data: Dict) -> Dict[str, str]:
        """Push a lead to Freshsales: create/update contact + create deal."""
        fields = lead_data.get("fields_collected", {}) or {}

        name = fields.get("name", "")
        name_parts = name.split(" ", 1) if name else ["", ""]
        firstname = name_parts[0]
        lastname = name_parts[1] if len(name_parts) > 1 else ""

        contact_data = {
            "first_name": firstname,
            "last_name": lastname,
            "email": fields.get("email", ""),
            "mobile_number": fields.get("phone", ""),
            "company": fields.get("company", ""),
        }

        # Duplicate detection
        existing = None
        if contact_data.get("email"):
            existing = await self.search_contact(email=contact_data["email"])
        if not existing and contact_data.get("mobile_number"):
            existing = await self.search_contact(phone=contact_data["mobile_number"])

        if existing:
            contact_id = str(existing.get("id", ""))
            await self.update_contact(contact_id, contact_data)
        else:
            contact_id = await self.create_contact(contact_data)

        # Create deal
        hotness = lead_data.get("hotness", "warm")
        score = lead_data.get("score", 50)
        product = fields.get("product", "General Inquiry")
        deal_data = {
            "name": f"[{hotness.upper()}] {name or 'Unknown'} - {product}",
        }
        if fields.get("budget"):
            try:
                deal_data["amount"] = float(''.join(c for c in fields["budget"] if c.isdigit() or c == '.'))
            except (ValueError, TypeError):
                pass

        deal_id = await self.create_deal(deal_data, contact_id=contact_id)

        return {"contact_id": contact_id, "deal_id": deal_id}
