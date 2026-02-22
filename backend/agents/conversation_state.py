"""
ConversationState — Multi-turn context for Bobur v4 agentic loop.
==================================================================
Tracks the previous turn's SQL, tool, entity, filters, and result summary
so follow-up questions ("now filter by won deals") can modify the last query.

Serialized to/from JSONB in dashboard_chat_messages.conversation_state.
Cost: $0 (pure Python dataclass).
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class ConversationState:
    last_sql: Optional[str] = None
    last_tool: Optional[str] = None
    last_result_summary: Optional[str] = None  # ~100 tokens max
    last_entity: Optional[str] = None
    last_filters: Optional[dict] = None
    last_timeframe: Optional[str] = None
    turn_count: int = 0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict | None) -> ConversationState:
        if not data:
            return cls()
        return cls(
            last_sql=data.get("last_sql"),
            last_tool=data.get("last_tool"),
            last_result_summary=data.get("last_result_summary"),
            last_entity=data.get("last_entity"),
            last_filters=data.get("last_filters"),
            last_timeframe=data.get("last_timeframe"),
            turn_count=data.get("turn_count", 0),
        )

    def for_prompt(self) -> str:
        """Compact text representation for injection into LLM system prompt."""
        if self.turn_count == 0:
            return ""
        parts = [f"Turn #{self.turn_count}."]
        if self.last_tool:
            parts.append(f"Last tool: {self.last_tool}.")
        if self.last_entity:
            parts.append(f"Last entity: {self.last_entity}.")
        if self.last_sql:
            parts.append(f"Last SQL:\n```sql\n{self.last_sql}\n```")
        if self.last_result_summary:
            parts.append(f"Last result: {self.last_result_summary}")
        if self.last_filters:
            parts.append(f"Last filters: {self.last_filters}")
        return "\n".join(parts)
