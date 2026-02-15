"""
Zoho CRM Integration Module.
OAuth 2.0 with multi-datacenter support and single-use refresh tokens.
"""

import httpx
import logging
import asyncio
import time
import os
from typing import Optional, Dict, Any, List
from collections import defaultdict

logger = logging.getLogger(__name__)

ZOHO_TIMEOUT = 30.0
ZOHO_MAX_REQUESTS_PER_SECOND = 5
ZOHO_RATE_LIMIT_WINDOW = 1.0

ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
ZOHO_SCOPES = "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL"

# Datacenter mappings
ZOHO_DATACENTERS = {
    "us": {"accounts": "https://accounts.zoho.com", "api": "https://www.zohoapis.com"},
    "eu": {"accounts": "https://accounts.zoho.eu", "api": "https://www.zohoapis.eu"},
    "in": {"accounts": "https://accounts.zoho.in", "api": "https://www.zohoapis.in"},
    "au": {"accounts": "https://accounts.zoho.com.au", "api": "https://www.zohoapis.com.au"},
    "jp": {"accounts": "https://accounts.zoho.jp", "api": "https://www.zohoapis.jp"},
}


class ZohoRateLimiter:
    """Rate limiter for Zoho API calls."""

    def __init__(self, max_requests: int = ZOHO_MAX_REQUESTS_PER_SECOND, window: float = ZOHO_RATE_LIMIT_WINDOW):
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


_zoho_rate_limiter = ZohoRateLimiter()


class ZohoAPIError(Exception):
    """Custom exception for Zoho API errors."""
    pass


class ZohoCRM:
    """Client for Zoho CRM API via OAuth 2.0 with multi-datacenter support."""

    def __init__(self, access_token: str, refresh_token: str = None,
                 datacenter: str = "us", api_domain: str = None,
                 token_expires_at: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.datacenter = datacenter
        self.token_expires_at = token_expires_at

        dc_config = ZOHO_DATACENTERS.get(datacenter, ZOHO_DATACENTERS["us"])
        self.accounts_url = dc_config["accounts"]
        self.api_base = api_domain or dc_config["api"]

    async def _call(self, method: str, path: str, data: dict = None, params: dict = None) -> dict:
        """Make authenticated API call to Zoho CRM."""
        await _zoho_rate_limiter.acquire()

        url = f"{self.api_base}{path}"
        headers = {
            "Authorization": f"Zoho-oauthtoken {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=ZOHO_TIMEOUT) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                else:
                    raise ZohoAPIError(f"Unsupported method: {method}")

                if response.status_code == 401:
                    raise ZohoAPIError("Authentication failed. Token may be expired")
                if response.status_code == 429:
                    raise ZohoAPIError("Rate limit exceeded")
                if response.status_code >= 400:
                    error_body = response.text[:500]
                    logger.error(f"Zoho API error {response.status_code}: {error_body}")
                    raise ZohoAPIError(f"API error: {response.status_code}")

                if response.status_code == 204:
                    return {}
                return response.json()

        except httpx.TimeoutException:
            raise ZohoAPIError("Connection timeout. Please check your Zoho connection")
        except httpx.RequestError as e:
            raise ZohoAPIError(f"Connection error: {str(e)}")

    # ==================== OAuth ====================

    @staticmethod
    def get_auth_url(redirect_uri: str, state: str, datacenter: str = "us") -> str:
        """Generate Zoho OAuth authorization URL for specific datacenter."""
        dc_config = ZOHO_DATACENTERS.get(datacenter, ZOHO_DATACENTERS["us"])
        accounts_url = dc_config["accounts"]
        return (
            f"{accounts_url}/oauth/v2/auth"
            f"?scope={ZOHO_SCOPES}"
            f"&client_id={ZOHO_CLIENT_ID}"
            f"&response_type=code"
            f"&access_type=offline"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
            f"&prompt=consent"
        )

    @staticmethod
    async def exchange_code(code: str, redirect_uri: str, datacenter: str = "us") -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        dc_config = ZOHO_DATACENTERS.get(datacenter, ZOHO_DATACENTERS["us"])
        token_url = f"{dc_config['accounts']}/oauth/v2/token"

        async with httpx.AsyncClient(timeout=ZOHO_TIMEOUT) as client:
            response = await client.post(token_url, data={
                "grant_type": "authorization_code",
                "client_id": ZOHO_CLIENT_ID,
                "client_secret": ZOHO_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "code": code,
            })

            if response.status_code != 200:
                logger.error(f"Zoho token exchange failed: {response.text}")
                raise ZohoAPIError(f"Token exchange failed: {response.status_code}")

            data = response.json()
            if "error" in data:
                raise ZohoAPIError(f"Zoho auth error: {data['error']}")

            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", ""),
                "expires_in": data.get("expires_in", 3600),
                "api_domain": data.get("api_domain", dc_config["api"]),
            }

    async def refresh_access_token(self) -> Dict[str, Any]:
        """
        Refresh expired access token.
        CRITICAL: Zoho returns a NEW refresh token with each refresh.
        The old refresh token is invalidated. Must store the new one.
        """
        token_url = f"{self.accounts_url}/oauth/v2/token"

        async with httpx.AsyncClient(timeout=ZOHO_TIMEOUT) as client:
            response = await client.post(token_url, data={
                "grant_type": "refresh_token",
                "client_id": ZOHO_CLIENT_ID,
                "client_secret": ZOHO_CLIENT_SECRET,
                "refresh_token": self.refresh_token,
            })

            if response.status_code != 200:
                logger.error(f"Zoho token refresh failed: {response.text}")
                raise ZohoAPIError("Token refresh failed. Please re-authorize your Zoho account")

            data = response.json()
            if "error" in data:
                raise ZohoAPIError(f"Zoho refresh error: {data['error']}")

            # CRITICAL: Update refresh token if a new one is provided
            new_refresh = data.get("refresh_token", self.refresh_token)
            self.access_token = data["access_token"]
            self.refresh_token = new_refresh

            return {
                "access_token": data["access_token"],
                "refresh_token": new_refresh,
                "expires_in": data.get("expires_in", 3600),
            }

    # ==================== Connection Test ====================

    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection by fetching org info."""
        try:
            result = await self._call("GET", "/crm/v7/org")
            org_data = result.get("org", [{}])
            org = org_data[0] if isinstance(org_data, list) and org_data else {}
            return {
                "ok": True,
                "message": "Connection successful!",
                "org_name": org.get("company_name", ""),
            }
        except ZohoAPIError as e:
            return {"ok": False, "message": str(e)}
        except Exception as e:
            return {"ok": False, "message": f"Unexpected error: {str(e)}"}

    # ==================== Leads ====================

    async def create_lead(self, data: Dict) -> str:
        """Create a new lead in Zoho CRM."""
        lead_record = {}
        if data.get("First_Name"):
            lead_record["First_Name"] = data["First_Name"]
        if data.get("Last_Name"):
            lead_record["Last_Name"] = data["Last_Name"]
        if data.get("Email"):
            lead_record["Email"] = data["Email"]
        if data.get("Phone"):
            lead_record["Phone"] = data["Phone"]
        if data.get("Company"):
            lead_record["Company"] = data["Company"]
        if data.get("Lead_Source"):
            lead_record["Lead_Source"] = data["Lead_Source"]
        if data.get("Description"):
            lead_record["Description"] = data["Description"]

        # Default required fields
        if not lead_record.get("Last_Name"):
            lead_record["Last_Name"] = data.get("First_Name", "Unknown")
        if not lead_record.get("Company"):
            lead_record["Company"] = "Not Specified"

        result = await self._call("POST", "/crm/v7/Leads", data={
            "data": [lead_record],
        })

        records = result.get("data", [])
        if records and records[0].get("status") == "success":
            lead_id = records[0]["details"]["id"]
            logger.info(f"Created Zoho lead: {lead_id}")
            return lead_id

        error_msg = records[0].get("message", "Unknown error") if records else "No response"
        raise ZohoAPIError(f"Failed to create lead: {error_msg}")

    async def search_contact(self, email: str = None, phone: str = None) -> Optional[Dict]:
        """Search for existing contact by email or phone."""
        criteria = ""
        if email:
            criteria = f"(Email:equals:{email})"
        elif phone:
            criteria = f"(Phone:equals:{phone})"
        else:
            return None

        try:
            result = await self._call("GET", "/crm/v7/Contacts/search", params={
                "criteria": criteria,
            })
            records = result.get("data", [])
            return records[0] if records else None
        except ZohoAPIError:
            return None

    async def update_record(self, module: str, record_id: str, data: Dict) -> bool:
        """Update an existing record."""
        try:
            await self._call("PUT", f"/crm/v7/{module}/{record_id}", data={
                "data": [data],
            })
            logger.info(f"Updated Zoho {module} record: {record_id}")
            return True
        except ZohoAPIError as e:
            logger.warning(f"Failed to update Zoho record: {e}")
            return False

    async def get_pipelines(self) -> List[Dict]:
        """Get deal pipeline stages."""
        try:
            result = await self._call("GET", "/crm/v7/settings/pipeline", params={
                "module": "Deals",
            })
            return result.get("pipeline", [])
        except ZohoAPIError:
            return []

    # ==================== Lead Push ====================

    async def push_lead(self, lead_data: Dict) -> Dict[str, str]:
        """Push a lead to Zoho CRM."""
        fields = lead_data.get("fields_collected", {}) or {}

        name = fields.get("name", "")
        name_parts = name.split(" ", 1) if name else ["", ""]
        firstname = name_parts[0]
        lastname = name_parts[1] if len(name_parts) > 1 else firstname or "Unknown"

        hotness = lead_data.get("hotness", "warm")
        score = lead_data.get("score", 50)
        product = fields.get("product", "General Inquiry")

        zoho_lead = {
            "First_Name": firstname,
            "Last_Name": lastname,
            "Email": fields.get("email", ""),
            "Phone": fields.get("phone", ""),
            "Company": fields.get("company", "Not Specified"),
            "Lead_Source": "Telegram Bot",
            "Description": (
                f"[{hotness.upper()}] Score: {score}/100\n"
                f"Product: {product}\n"
                f"Budget: {fields.get('budget', 'N/A')}\n"
                f"Timeline: {fields.get('timeline', 'N/A')}\n"
                f"Source: LeadRelay AI Agent"
            ),
        }

        # Duplicate detection
        existing = None
        if zoho_lead.get("Email"):
            existing = await self.search_contact(email=zoho_lead["Email"])
        if not existing and zoho_lead.get("Phone"):
            existing = await self.search_contact(phone=zoho_lead["Phone"])

        if existing:
            record_id = existing["id"]
            await self.update_record("Contacts", record_id, {
                "First_Name": firstname,
                "Last_Name": lastname,
                "Description": zoho_lead["Description"],
            })
            return {"contact_id": record_id, "action": "updated"}

        lead_id = await self.create_lead(zoho_lead)
        return {"lead_id": lead_id, "action": "created"}
