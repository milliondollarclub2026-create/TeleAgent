"""LLM Service - OpenAI Integration"""
import os
import logging
from typing import Optional, List, Dict
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI

from token_logger import log_token_usage_fire_and_forget

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Initialize OpenAI client
_openai_api_key = os.environ.get('OPENAI_API_KEY')
if not _openai_api_key:
    logger.warning("OPENAI_API_KEY not set - LLM calls will fail at runtime")
client = AsyncOpenAI(api_key=_openai_api_key)


async def summarize_conversation(messages: List[Dict[str, str]], tenant_id: Optional[str] = None) -> str:
    """Summarize a conversation for CRM notes"""
    try:
        conversation_text = "\n".join([f"{m['role']}: {m['text']}" for m in messages])

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Summarize this sales conversation in 2-3 sentences. Focus on: customer needs, products discussed, outcome. Write in English."
                },
                {"role": "user", "content": conversation_text}
            ],
            temperature=0.3,
            max_tokens=200
        )

        # Log token usage for billing/transparency (fire-and-forget)
        if tenant_id and hasattr(response, 'usage') and response.usage:
            log_token_usage_fire_and_forget(
                tenant_id=tenant_id,
                model="gpt-4o-mini",
                request_type="summarization",
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
            )

        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}")
        return "Conversation summary not available."
