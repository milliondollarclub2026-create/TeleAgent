"""
Token Usage Logger for LLM API calls.

Logs all token usage to the database for billing and transparency.
Uses fire-and-forget pattern to avoid blocking API responses.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import text

from database import AsyncSessionLocal

logger = logging.getLogger(__name__)

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
) -> None:
    """
    Log token usage to the database.

    This function is designed to be called with asyncio.create_task()
    for fire-and-forget logging that doesn't block the main response.

    Args:
        tenant_id: The tenant/workspace ID
        model: LLM model name (e.g., 'gpt-4o', 'gpt-4o-mini')
        request_type: Type of request ('sales_agent', 'crm_chat', 'embedding', 'summarization')
        input_tokens: Number of input/prompt tokens
        output_tokens: Number of output/completion tokens (0 for embeddings)
        agent_id: Optional agent ID
        customer_id: Optional customer ID (for Telegram conversations)
        conversation_id: Optional conversation ID
    """
    try:
        # Calculate cost
        cost_usd = calculate_cost(model, input_tokens, output_tokens)

        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO token_usage_logs
                    (id, tenant_id, agent_id, customer_id, model, request_type,
                     input_tokens, output_tokens, cost_usd, conversation_id, created_at)
                    VALUES (:id, :tenant_id, :agent_id, :customer_id, :model, :request_type,
                            :input_tokens, :output_tokens, :cost_usd, :conversation_id, :created_at)
                """),
                {
                    "id": str(uuid4()),
                    "tenant_id": tenant_id,
                    "agent_id": agent_id,
                    "customer_id": customer_id,
                    "model": model,
                    "request_type": request_type,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": cost_usd,
                    "conversation_id": conversation_id,
                    "created_at": datetime.now(timezone.utc),
                }
            )
            await session.commit()

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
) -> None:
    """
    Fire-and-forget wrapper for log_token_usage.

    Use this function to log token usage without awaiting the result.
    The logging happens in the background and doesn't block the response.

    Example:
        response = await openai_client.chat.completions.create(...)
        log_token_usage_fire_and_forget(
            tenant_id=tenant_id,
            model="gpt-4o",
            request_type="sales_agent",
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
        return response.choices[0].message.content  # Returns immediately
    """
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
            )
        )
    except RuntimeError:
        # No event loop running (shouldn't happen in async context)
        logger.warning("No event loop available for fire-and-forget logging")
