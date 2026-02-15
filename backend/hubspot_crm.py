"""
HubSpot CRM Integration Module.
OAuth 2.0 authorization code flow, contact + deal management.
"""

import httpx
import logging
import asyncio
import time
import os
from typing import Optional, Dict, Any, List
from collections import defaultdict

logger = logging.getLogger(__name__)

HUBSPOT_API_BASE = "https://api.hubapi.com"
HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize"
HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"
HUBSPOT_TIMEOUT = 30.0
HUBSPOT_MAX_REQUESTS_PER_SECOND = 5
HUBSPOT_RATE_LIMIT_WINDOW = 1.0

HUBSPOT_CLIENT_ID = os.environ.get("HUBSPOT_CLIENT_ID", "")
HUBSPOT_CLIENT_SECRET = os.environ.get("HUBSPOT_CLIENT_SECRET", "")
HUBSPOT_SCOPES = "crm.objects.contacts.write crm.objects.contacts.read crm.objects.deals.write crm.objects.deals.read"


class HubSpotRateLimiter:
    """Rate limiter for HubSpot API calls."""

    def __init__(self, max_requests: int = HUBSPOT_MAX_REQUESTS_PER_SECOND, window: float = HUBSPOT_RATE_LIMIT_WINDOW):
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


_hubspot_rate_limiter = HubSpotRateLimiter()


class HubSpotAPIError(Exception):
    """Custom exception for HubSpot API errors."""
    pass


class HubSpotCRM:
    """Client for HubSpot CRM API via OAuth 2.0."""

    def __init__(self, access_token: str, refresh_token: str = None, token_expires_at: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at = token_expires_at

    async def _call(self, method: str, path: str, data: dict = None, params: dict = None) -> dict:
        """Make authenticated API call to HubSpot."""
        await _hubspot_rate_limiter.acquire()

        url = f"{HUBSPOT_API_BASE}{path}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=HUBSPOT_TIMEOUT) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PATCH":
                    response = await client.patch(url, headers=headers, json=data)
                else:
                    raise HubSpotAPIError(f"Unsupported method: {method}")

                if response.status_code == 401:
                    raise HubSpotAPIError("Authentication failed. Token may be expired")
                if response.status_code == 429:
                    raise HubSpotAPIError("Rate limit exceeded")
                if response.status_code >= 400:
                    error_body = response.text[:500]
                    logger.error(f"HubSpot API error {response.status_code}: {error_body}")
                    raise HubSpotAPIError(f"API error: {response.status_code}")

                if response.status_code == 204:
                    return {}
                return response.json()

        except httpx.TimeoutException:
            raise HubSpotAPIError("Connection timeout. Please check your HubSpot connection")
        except httpx.RequestError as e:
            raise HubSpotAPIError(f"Connection error: {str(e)}")

    # ==================== OAuth ====================

    @staticmethod
    def get_auth_url(redirect_uri: str, state: str) -> str:
        """Generate HubSpot OAuth authorization URL."""
        return (
            f"{HUBSPOT_AUTH_URL}"
            f"?client_id={HUBSPOT_CLIENT_ID}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={HUBSPOT_SCOPES}"
            f"&state={state}"
        )

    @staticmethod
    async def exchange_code(code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient(timeout=HUBSPOT_TIMEOUT) as client:
            response = await client.post(HUBSPOT_TOKEN_URL, data={
                "grant_type": "authorization_code",
                "client_id": HUBSPOT_CLIENT_ID,
                "client_secret": HUBSPOT_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "code": code,
            })

            if response.status_code != 200:
                logger.error(f"HubSpot token exchange failed: {response.text}")
                raise HubSpotAPIError(f"Token exchange failed: {response.status_code}")

            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data["refresh_token"],
                "expires_in": data.get("expires_in", 1800),
            }

    @staticmethod
    async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
        """Refresh an expired access token."""
        async with httpx.AsyncClient(timeout=HUBSPOT_TIMEOUT) as client:
            response = await client.post(HUBSPOT_TOKEN_URL, data={
                "grant_type": "refresh_token",
                "client_id": HUBSPOT_CLIENT_ID,
                "client_secret": HUBSPOT_CLIENT_SECRET,
                "refresh_token": refresh_token,
            })

            if response.status_code != 200:
                logger.error(f"HubSpot token refresh failed: {response.text}")
                raise HubSpotAPIError("Token refresh failed. Please re-authorize your HubSpot account")

            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in": data.get("expires_in", 1800),
            }

    # ==================== Connection Test ====================

    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection by fetching a single contact."""
        try:
            result = await self._call("GET", "/crm/v3/objects/contacts", params={"limit": 1})
            return {
                "ok": True,
                "message": "Connection successful!",
                "total_contacts": result.get("total", 0),
            }
        except HubSpotAPIError as e:
            return {"ok": False, "message": str(e)}
        except Exception as e:
            return {"ok": False, "message": f"Unexpected error: {str(e)}"}

    # ==================== Contacts ====================

    async def search_contact(self, email: str = None, phone: str = None) -> Optional[Dict]:
        """Search for existing contact by email or phone."""
        filters = []
        if email:
            filters.append({"propertyName": "email", "operator": "EQ", "value": email})
        if phone:
            filters.append({"propertyName": "phone", "operator": "EQ", "value": phone})

        if not filters:
            return None

        try:
            result = await self._call("POST", "/crm/v3/objects/contacts/search", data={
                "filterGroups": [{"filters": filters}],
                "properties": ["firstname", "lastname", "email", "phone"],
                "limit": 1,
            })
            results = result.get("results", [])
            return results[0] if results else None
        except HubSpotAPIError:
            return None

    async def create_contact(self, data: Dict) -> str:
        """Create a new contact. Returns contact ID."""
        properties = {}
        if data.get("firstname"):
            properties["firstname"] = data["firstname"]
        if data.get("lastname"):
            properties["lastname"] = data["lastname"]
        if data.get("email"):
            properties["email"] = data["email"]
        if data.get("phone"):
            properties["phone"] = data["phone"]
        if data.get("company"):
            properties["company"] = data["company"]

        result = await self._call("POST", "/crm/v3/objects/contacts", data={
            "properties": properties,
        })
        contact_id = result.get("id", "")
        logger.info(f"Created HubSpot contact: {contact_id}")
        return contact_id

    async def update_contact(self, contact_id: str, data: Dict) -> bool:
        """Update an existing contact."""
        properties = {}
        for key in ("firstname", "lastname", "email", "phone", "company"):
            if data.get(key):
                properties[key] = data[key]

        if properties:
            await self._call("PATCH", f"/crm/v3/objects/contacts/{contact_id}", data={
                "properties": properties,
            })
            logger.info(f"Updated HubSpot contact: {contact_id}")
        return True

    # ==================== Deals ====================

    async def create_deal(self, data: Dict, contact_id: str = None) -> str:
        """Create a deal, optionally associated with a contact."""
        properties = {
            "dealname": data.get("title", "New Deal from LeadRelay"),
            "pipeline": data.get("pipeline_id", "default"),
        }
        if data.get("dealstage"):
            properties["dealstage"] = data["dealstage"]
        if data.get("amount"):
            properties["amount"] = str(data["amount"])

        result = await self._call("POST", "/crm/v3/objects/deals", data={
            "properties": properties,
        })
        deal_id = result.get("id", "")
        logger.info(f"Created HubSpot deal: {deal_id}")

        # Associate deal with contact
        if contact_id and deal_id:
            try:
                await self._call(
                    "POST",
                    f"/crm/v3/objects/deals/{deal_id}/associations/contacts/{contact_id}/deal_to_contact",
                    data={},
                )
            except Exception as e:
                logger.warning(f"Failed to associate deal with contact: {e}")

        return deal_id

    async def get_pipelines(self) -> List[Dict]:
        """Get deal pipelines."""
        try:
            result = await self._call("GET", "/crm/v3/pipelines/deals")
            return result.get("results", [])
        except HubSpotAPIError:
            return []

    # ==================== Lead Push ====================

    async def push_lead(self, lead_data: Dict) -> Dict[str, str]:
        """Push a lead to HubSpot: create/update contact + create deal."""
        fields = lead_data.get("fields_collected", {}) or {}

        # Split name
        name = fields.get("name", "")
        name_parts = name.split(" ", 1) if name else ["", ""]
        firstname = name_parts[0]
        lastname = name_parts[1] if len(name_parts) > 1 else ""

        contact_data = {
            "firstname": firstname,
            "lastname": lastname,
            "email": fields.get("email", ""),
            "phone": fields.get("phone", ""),
            "company": fields.get("company", ""),
        }

        # Check for existing contact (duplicate detection)
        existing = None
        if contact_data.get("email"):
            existing = await self.search_contact(email=contact_data["email"])
        if not existing and contact_data.get("phone"):
            existing = await self.search_contact(phone=contact_data["phone"])

        if existing:
            contact_id = existing["id"]
            await self.update_contact(contact_id, contact_data)
        else:
            contact_id = await self.create_contact(contact_data)

        # Create deal
        hotness = lead_data.get("hotness", "warm")
        score = lead_data.get("score", 50)
        product = fields.get("product", "General Inquiry")
        deal_data = {
            "title": f"[{hotness.upper()}] {name or 'Unknown'} - {product}",
        }
        if fields.get("budget"):
            try:
                deal_data["amount"] = float(''.join(c for c in fields["budget"] if c.isdigit() or c == '.'))
            except (ValueError, TypeError):
                pass

        deal_id = await self.create_deal(deal_data, contact_id=contact_id)

        return {"contact_id": contact_id, "deal_id": deal_id}
