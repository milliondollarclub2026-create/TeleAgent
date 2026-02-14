"""Instagram Graph API service for DM automation.

Handles OAuth 2.0 token exchange, webhook parsing, and message sending
via Meta's Graph API v19.0.
"""

import logging
from typing import Optional, Dict, List
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"
OAUTH_BASE = "https://www.facebook.com/v19.0/dialog/oauth"

# Required permissions for Instagram messaging
SCOPES = [
    "instagram_basic",
    "instagram_manage_messages",
    "pages_manage_metadata",
    "pages_messaging",
]


def get_oauth_url(app_id: str, redirect_uri: str, state: str) -> str:
    """Build Meta OAuth authorization URL."""
    params = {
        "client_id": app_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": ",".join(SCOPES),
        "response_type": "code",
    }
    return f"{OAUTH_BASE}?{urlencode(params)}"


async def exchange_code_for_token(
    code: str, app_id: str, app_secret: str, redirect_uri: str
) -> Dict:
    """Exchange authorization code for short-lived token, then long-lived token.

    Returns: {"access_token": str, "expires_in": int, "token_type": str}
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Exchange code for short-lived token
        resp = await client.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        short_lived = resp.json()
        short_token = short_lived["access_token"]

        # Step 2: Exchange for long-lived token (60 days)
        resp = await client.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        long_lived = resp.json()
        return long_lived


async def refresh_long_lived_token(
    token: str, app_id: str, app_secret: str
) -> Dict:
    """Refresh a long-lived token before it expires.

    Returns: {"access_token": str, "expires_in": int, "token_type": str}
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": token,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_instagram_account_info(access_token: str) -> Optional[Dict]:
    """Get connected Instagram Business account info via the user's Pages.

    Returns: {"page_id": str, "instagram_user_id": str, "username": str} or None
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Get user's pages
        resp = await client.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token, "fields": "id,name,instagram_business_account"},
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])

        for page in pages:
            ig_account = page.get("instagram_business_account")
            if ig_account:
                ig_id = ig_account["id"]
                # Fetch IG username
                ig_resp = await client.get(
                    f"{GRAPH_API_BASE}/{ig_id}",
                    params={"access_token": access_token, "fields": "id,username"},
                )
                ig_resp.raise_for_status()
                ig_data = ig_resp.json()
                return {
                    "page_id": page["id"],
                    "instagram_user_id": ig_id,
                    "username": ig_data.get("username"),
                }

        return None


async def subscribe_to_webhooks(page_id: str, access_token: str) -> bool:
    """Subscribe a Page to messaging webhook events.

    Uses the Page access token (not user token) to subscribe to 'messages'
    and 'messaging_postbacks' fields. Must be called after OAuth to activate
    webhook delivery for this Page.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{GRAPH_API_BASE}/{page_id}/subscribed_apps",
            params={"access_token": access_token},
            json={"subscribed_fields": ["messages", "messaging_postbacks"]},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("success", False)


async def send_message(access_token: str, recipient_id: str, text: str) -> bool:
    """Send a DM via Instagram Graph API.

    Uses /me/messages with the Page access token. The 'me' resolves to the
    Page identity when authenticated with a Page-scoped token.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{GRAPH_API_BASE}/me/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": text},
            },
        )
        if resp.status_code != 200:
            logger.error(f"Instagram send_message failed: {resp.status_code} {resp.text}")
            return False
        return True


async def get_user_profile(access_token: str, user_id: str) -> Optional[Dict]:
    """Fetch Instagram user profile (name, username).

    Returns: {"name": str, "username": str} or None
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GRAPH_API_BASE}/{user_id}",
                params={"access_token": access_token, "fields": "name,username"},
            )
            if resp.status_code != 200:
                logger.warning(f"Could not fetch IG profile for {user_id}: {resp.status_code}")
                return None
            return resp.json()
    except Exception as e:
        logger.warning(f"Error fetching IG profile for {user_id}: {e}")
        return None


def parse_instagram_webhook(payload: Dict) -> List[Dict]:
    """Parse Instagram webhook payload into normalized messages.

    Returns list of: {"page_id": str, "sender_id": str, "text": str}
    Only returns text messages; skips images, stickers, etc.
    """
    messages = []

    if payload.get("object") != "instagram":
        return messages

    for entry in payload.get("entry", []):
        # entry["id"] is the Instagram-connected Page ID (not the IG user ID)
        page_id = entry.get("id")
        for event in entry.get("messaging", []):
            sender_id = event.get("sender", {}).get("id")
            message_data = event.get("message", {})
            text = message_data.get("text")

            # Skip non-text messages (images, stickers, attachments)
            if not text or not sender_id:
                continue

            # Skip echo messages (sent by the page itself). Combined with
            # the sender_id == page_id check in server.py for defense in depth.
            if message_data.get("is_echo"):
                continue

            messages.append({
                "page_id": page_id,
                "sender_id": sender_id,
                "text": text,
            })

    return messages
