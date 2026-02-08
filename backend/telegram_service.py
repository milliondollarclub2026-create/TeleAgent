"""Telegram Bot Service"""
import os
import logging
import httpx
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot"


async def send_message(bot_token: str, chat_id: int, text: str) -> bool:
    """Send a message to a Telegram chat"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML"
                },
                timeout=30.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {str(e)}")
        return False


async def send_typing_action(bot_token: str, chat_id: int) -> bool:
    """Send typing indicator to show bot is processing"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/sendChatAction"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "action": "typing"
                },
                timeout=10.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send typing action: {str(e)}")
        return False


async def set_webhook(bot_token: str, webhook_url: str) -> Dict[str, Any]:
    """Set the webhook URL for a Telegram bot"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/setWebhook"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "url": webhook_url,
                    "allowed_updates": ["message"],
                    "drop_pending_updates": True
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to set webhook: {str(e)}")
        return {"ok": False, "error": str(e)}


async def delete_webhook(bot_token: str) -> Dict[str, Any]:
    """Delete the webhook for a Telegram bot"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/deleteWebhook"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, timeout=30.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to delete webhook: {str(e)}")
        return {"ok": False, "error": str(e)}


async def get_webhook_info(bot_token: str) -> Dict[str, Any]:
    """Get current webhook info"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/getWebhookInfo"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to get webhook info: {str(e)}")
        return {"ok": False, "error": str(e)}


async def get_bot_info(bot_token: str) -> Optional[Dict[str, Any]]:
    """Get bot information"""
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/getMe"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            if data.get("ok"):
                return data.get("result")
            return None
    except Exception as e:
        logger.error(f"Failed to get bot info: {str(e)}")
        return None


def parse_telegram_update(update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Parse a Telegram update and extract relevant information"""
    try:
        message = update.get("message")
        if not message:
            return None
        
        # Only handle text messages for MVP
        text = message.get("text")
        if not text:
            return None
        
        from_user = message.get("from", {})
        chat = message.get("chat", {})
        
        return {
            "update_id": update.get("update_id"),
            "message_id": message.get("message_id"),
            "chat_id": chat.get("id"),
            "user_id": str(from_user.get("id")),
            "username": from_user.get("username"),
            "first_name": from_user.get("first_name"),
            "last_name": from_user.get("last_name"),
            "language_code": from_user.get("language_code"),
            "text": text,
            "date": message.get("date")
        }
    except Exception as e:
        logger.error(f"Failed to parse Telegram update: {str(e)}")
        return None
