"""
Agent Trace — Observability context manager for the Data Team agents.
Logs every agent invocation to the agent_traces table.
Uses fire-and-forget pattern: tracing failures never break agent logic.
"""

import asyncio
import logging
import time
from uuid import uuid4

from token_logger import calculate_cost

logger = logging.getLogger(__name__)


class AgentTrace:
    """Async context manager for agent observability."""

    def __init__(self, supabase, tenant_id: str, agent_name: str, model: str = None):
        self.supabase = supabase
        self.tenant_id = tenant_id
        self.agent_name = agent_name
        self.model = model
        self.request_id = str(uuid4())
        self.tokens_in = 0
        self.tokens_out = 0
        self.cost_usd = 0.0
        self.success = True
        self.error_message = None
        self._start = 0.0

    async def __aenter__(self):
        self._start = time.monotonic()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration_ms = int((time.monotonic() - self._start) * 1000)

        if exc_type is not None:
            self.success = False
            if not self.error_message:
                self.error_message = str(exc_val)[:500] if exc_val else exc_type.__name__

        # Fire-and-forget insert
        try:
            asyncio.create_task(self._insert_trace(duration_ms))
        except RuntimeError:
            # No event loop — log and move on
            logger.debug("No event loop for agent trace logging")

        # Don't suppress exceptions
        return False

    def record_tokens(self, response):
        """Extract token counts from an OpenAI response.usage object."""
        if hasattr(response, "usage") and response.usage:
            self.tokens_in = response.usage.prompt_tokens or 0
            self.tokens_out = response.usage.completion_tokens or 0
            if self.model:
                self.cost_usd = calculate_cost(self.model, self.tokens_in, self.tokens_out)

    def record_error(self, error_message: str):
        """Mark trace as failed with an error message."""
        self.success = False
        self.error_message = str(error_message)[:500]

    async def _insert_trace(self, duration_ms: int):
        """Insert trace row into agent_traces table."""
        try:
            self.supabase.table("agent_traces").insert({
                "tenant_id": self.tenant_id,
                "request_id": self.request_id,
                "agent_name": self.agent_name,
                "model": self.model,
                "tokens_in": self.tokens_in,
                "tokens_out": self.tokens_out,
                "cost_usd": float(self.cost_usd),
                "duration_ms": duration_ms,
                "success": self.success,
                "error_message": self.error_message,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to insert agent trace: {e}")
