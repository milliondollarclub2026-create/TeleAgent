"""
Token Usage Logger for LLM API calls.

Logs all token usage to the database for billing and transparency.
Uses fire-and-forget pattern to avoid blocking API responses.

Uses Supabase REST client (not asyncpg) for reliable connection
through Supabase's transaction pooler.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

# Check if Supabase is configured
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
DB_AVAILABLE = bool(SUPABASE_URL and SUPABASE_KEY)

# Lazy-init Supabase client for token logging
_supabase_client = None

def _get_supabase():
    """Lazy-initialize a Supabase client for token logging."""
    global _supabase_client
    if _supabase_client is None and DB_AVAILABLE:
        try:
            from supabase import create_client
            _supabase_client = create_client(
                SUPABASE_URL.strip(),
                SUPABASE_KEY.strip()
            )
        except Exception as e:
            logger.warning(f"Token logging disabled: failed to init Supabase client: {e}")
    return _supabase_client


# OpenAI Pricing (per 1K tokens) - Updated February 2026
# https://openai.com/pricing
PRICING = {
    "gpt-4o": {
        "input": 0.0025,    # $2.50 per 1M input tokens
        "output": 0.010,    # $10.00 per 1M output tokens
    },
    "gpt-4o-mini": {
        "input": 0.00015,   # $0.15 per 1M input tokens
        "output": 0.0006,   # $0.60 per 1M output tokens
    },
    "text-embedding-3-small": {
        "input": 0.00002,   # $0.02 per 1M tokens
        "output": 0,        # Embeddings don't have output tokens
    },
    "text-embedding-3-large": {
        "input": 0.00013,   # $0.13 per 1M tokens
        "output": 0,
    },
}

# Request type descriptions for better logging
REQUEST_TYPES = {
    "sales_agent": "Sales Agent Chat",
    "crm_chat": "CRM Analytics Chat",
    "embedding": "Document Embedding",
    "summarization": "Conversation Summary",
    "intent_classifier": "Intent Classification",
    "sales_agent_faq": "FAQ Response (Mini)",
    "crm_extractor": "CRM Field Extraction",
    "sales_agent_escalated": "Escalated Sales Agent",
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD based on model and token counts."""
    pricing = PRICING.get(model, {"input": 0, "output": 0})
    cost = (input_tokens * pricing["input"] / 1000) + (output_tokens * pricing["output"] / 1000)
    return round(cost, 6)


async def log_token_usage(
    tenant_id: str,
    model: str,
    request_type: str,
    input_tokens: int,
    output_tokens: int = 0,
    agent_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    route_decision: Optional[str] = None,
    classifier_category: Optional[str] = None,
) -> None:
    """
    Log token usage to the database via Supabase REST client.

    This function is designed to be called with asyncio.create_task()
    for fire-and-forget logging that doesn't block the main response.
    """
    sb = _get_supabase()
    if not sb:
        logger.debug("Token logging skipped: Supabase client not available")
        return

    try:
        cost_usd = calculate_cost(model, input_tokens, output_tokens)

        row = {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "model": model,
            "request_type": request_type,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": float(cost_usd),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if agent_id:
            row["agent_id"] = agent_id
        if customer_id:
            row["customer_id"] = customer_id
        if conversation_id:
            row["conversation_id"] = conversation_id
        if route_decision:
            row["route_decision"] = route_decision
        if classifier_category:
            row["classifier_category"] = classifier_category

        sb.table('token_usage_logs').insert(row).execute()

        # Increment conversation-level usage aggregates
        if conversation_id:
            sb.rpc('increment_conversation_usage', {
                'p_conversation_id': conversation_id,
                'p_input_tokens': input_tokens,
                'p_output_tokens': output_tokens,
                'p_cost_usd': float(cost_usd),
            }).execute()

        logger.debug(
            f"Logged token usage: {model} | {request_type} | "
            f"in={input_tokens} out={output_tokens} | cost=${cost_usd:.6f}"
        )

    except Exception as e:
        # Don't let logging errors affect the main application
        logger.error(f"Failed to log token usage: {e}")


def log_token_usage_fire_and_forget(
    tenant_id: str,
    model: str,
    request_type: str,
    input_tokens: int,
    output_tokens: int = 0,
    agent_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    route_decision: Optional[str] = None,
    classifier_category: Optional[str] = None,
) -> None:
    """
    Fire-and-forget wrapper for log_token_usage.

    Use this function to log token usage without awaiting the result.
    The logging happens in the background and doesn't block the response.
    """
    if not DB_AVAILABLE:
        return

    try:
        asyncio.create_task(
            log_token_usage(
                tenant_id=tenant_id,
                model=model,
                request_type=request_type,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                agent_id=agent_id,
                customer_id=customer_id,
                conversation_id=conversation_id,
                route_decision=route_decision,
                classifier_category=classifier_category,
            )
        )
    except RuntimeError:
        # No event loop running (shouldn't happen in async context)
        logger.warning("No event loop available for fire-and-forget logging")
