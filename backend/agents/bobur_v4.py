"""
Bobur v4 — Agentic CRM Analytics Engine (ReAct loop).
======================================================
Replaces the regex-first + fixed-menu LLM classifier with a ReAct agentic
loop powered by GPT-4o-mini with function calling.  Any CRM question a user
can think of — including cross-entity JOINs, multi-step reasoning, and
multi-turn follow-ups — Bobur can now answer.

Architecture:
  User message
      ↓
  [Short-circuit check] ← KPI patterns, revenue overview ($0)
      ↓ (miss)
  [Agentic ReAct Loop] ← GPT-4o-mini with function calling
      ├── run_sql()           → SQL generation + validation + execution
      ├── get_metric()        → Existing metric catalog (12 metrics)
      ├── get_overview()      → Revenue snapshot
      ├── list_alerts()       → Revenue alerts
      ├── get_recommendations()→ Nilufar
      ├── design_chart()      → Dima + Anvar
      └── respond()           → Terminal (exits loop)
      ↓
  {reply, charts, response_type, agent_used}

Max 5 iterations, ~$0.001 avg cost per request.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Optional

from llm_service import client as openai_client
from token_logger import log_token_usage_fire_and_forget
from agent_trace import AgentTrace
from agents import (
    RouterResult, CRMProfile, SchemaProfile,
    ChartConfig, DynamicMetricResult, AlertResult,
)
from agents import kpi_resolver
from agents import dima
from agents import anvar
from agents import nilufar
from agents.schema_context import SchemaContext
from agents.conversation_state import ConversationState
from agents.sql_engine import (
    validate_sql, execute_sql, format_sql_results_for_llm,
)
from agents.bobur_tools import (
    get_revenue_overview,
    list_revenue_alerts,
    query_metric,
    query_dynamic_metric,
    build_rep_name_map,
    TIMEFRAME_LABEL,
)

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────

MAX_ITERATIONS = 5
LOOP_TIMEOUT_S = 15.0
MODEL = "gpt-4o-mini"

# ── Short-circuit regex patterns ($0) ─────────────────────────────────────

_KPI_SHORT_CIRCUITS = [
    (r"(?:how many|total|count)\s+(?:leads?)\b", "total_leads"),
    (r"(?:how many|total|count)\s+(?:deals?)\b", "total_deals"),
    (r"(?:how many|total|count)\s+(?:contacts?)\b", "total_contacts"),
    (r"(?:how many|total|count)\s+(?:compan)", "total_companies"),
    (r"(?:how many|total|count)\s+(?:activit)", "total_activities"),
    (r"(?:avg|average)\s+deal", "avg_deal_value"),
]

_OVERVIEW_PATTERNS = [
    r"how.{0,20}(?:pipeline|revenue|forecast|business|doing|performing)",
    r"(?:pipeline|revenue|forecast)\s*(?:health|status|overview|summary)",
    r"(?:overview|summary)\s+(?:of\s+)?(?:my\s+)?(?:revenue|pipeline|business)",
]


# ── Tool definitions (OpenAI function calling format) ─────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "run_sql",
            "description": (
                "Execute a read-only SQL query against the CRM database. "
                "Write standard PostgreSQL SELECT queries. Do NOT add tenant_id "
                "or crm_source filters — they are injected automatically. "
                "Use the schema and JOIN hints provided in the system prompt."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "The SELECT SQL query to execute.",
                    },
                },
                "required": ["sql"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_metric",
            "description": (
                "Fetch a pre-computed metric from the catalog. "
                "Available metrics: pipeline_value, new_deals, win_rate, avg_deal_size, "
                "sales_cycle_days, stage_conversion, deal_velocity, forecast_hygiene, "
                "rep_activity_count, activity_to_deal_ratio, lead_to_deal_rate, pipeline_stall_risk."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "metric_key": {
                        "type": "string",
                        "description": "The metric key from the catalog.",
                    },
                    "dimension": {
                        "type": "string",
                        "description": "Optional breakdown dimension: assigned_to, stage, type, source, status.",
                    },
                    "time_range_days": {
                        "type": "integer",
                        "description": "Time range in days (default 30).",
                    },
                },
                "required": ["metric_key"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_overview",
            "description": "Get a revenue/pipeline health overview snapshot.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeframe": {
                        "type": "string",
                        "enum": ["7d", "30d", "90d", "365d"],
                        "description": "Time window (default 30d).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_alerts",
            "description": "List active revenue alerts and risks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["open", "resolved", "dismissed"],
                        "description": "Alert status filter (default open).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recommendations",
            "description": "Get AI-powered recommendations and insights about the CRM data.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "design_chart",
            "description": "Design and generate a chart/visualization from a natural language description.",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "What chart to create, e.g. 'bar chart of deals by stage'.",
                    },
                },
                "required": ["description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "respond",
            "description": (
                "Send the final response to the user. MUST be called to end the conversation turn. "
                "Include charts array if you built visualizations from SQL results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "reply": {
                        "type": "string",
                        "description": "The markdown-formatted reply text for the user.",
                    },
                    "charts": {
                        "type": "array",
                        "description": "Optional chart configs [{type, title, data, x_key, y_key}].",
                        "items": {"type": "object"},
                    },
                },
                "required": ["reply"],
            },
        },
    },
]


# ── System prompt builder ─────────────────────────────────────────────────

def _build_system_prompt(
    schema_ctx: SchemaContext,
    crm_context: str,
    conv_state: ConversationState,
) -> str:
    """Build the system prompt for the agentic loop (~1500 tokens)."""

    schema_text = schema_ctx.for_query_prompt()
    join_hints = schema_ctx.get_join_hints()
    conv_text = conv_state.for_prompt()

    parts = [
        "You are Bobur, a CRM revenue analyst for LeadRelay.",
        "Answer the user's CRM analytics questions using the tools available.",
        "",
        "## Rules",
        "- Use run_sql for data questions the metric catalog can't answer.",
        "- Write PostgreSQL SELECT queries only. Never add tenant_id or crm_source filters.",
        "- For simple counts/metrics, prefer get_metric over SQL.",
        "- If a SQL query fails, read the error and fix your query (you get up to 4 retries).",
        "- When SQL returns grouped data, you can build charts directly in the respond tool.",
        "- ALWAYS call respond() at the end to deliver your answer.",
        "- Be concise. Use markdown formatting. Include numbers and evidence.",
        "- For follow-up questions, modify the previous query based on conversation state.",
        "",
        "## Chart format (in respond.charts)",
        "Each chart: {type: 'bar'|'pie'|'line', title: string, data: [{name, value}], x_key: 'name', y_key: 'value'}",
        "",
        "## Database Schema",
        schema_text or "No schema available.",
        "",
        join_hints,
    ]

    if crm_context:
        parts.extend(["", "## CRM Context", crm_context])

    if conv_text:
        parts.extend(["", "## Conversation State", conv_text])

    return "\n".join(parts)


# ── Tool execution ────────────────────────────────────────────────────────

async def _execute_tool(
    tool_name: str,
    tool_args: dict,
    supabase,
    tenant_id: str,
    crm_source: str,
    schema_ctx: SchemaContext,
    crm_profile: Optional[CRMProfile],
    schema: Optional[SchemaProfile],
    rep_name_map: dict,
) -> dict:
    """Execute a tool call and return the result dict."""

    if tool_name == "run_sql":
        sql = tool_args.get("sql", "")
        is_valid, error_msg, cleaned_sql = validate_sql(sql, schema_ctx)
        if not is_valid:
            return {"error": error_msg}
        result = await execute_sql(
            supabase, tenant_id, crm_source, cleaned_sql, rep_name_map
        )
        # Format for LLM consumption
        return {
            "result": format_sql_results_for_llm(result),
            "rows": result.get("rows", []),
            "row_count": result.get("row_count", 0),
            "truncated": result.get("truncated", False),
            "error": result.get("error"),
            "sql_executed": cleaned_sql,
        }

    elif tool_name == "get_metric":
        metric_key = tool_args.get("metric_key", "pipeline_value")
        dimension = tool_args.get("dimension")
        time_range_days = tool_args.get("time_range_days")
        result = await query_dynamic_metric(
            supabase, tenant_id, crm_source,
            metric_key, time_range_days=time_range_days,
        )
        # If dimension requested and result has data, add it
        if dimension and not result.get("error"):
            dim_result = await query_metric(
                supabase, tenant_id, crm_source,
                metric_key, dimension=dimension,
                time_range_days=time_range_days,
            )
            if not dim_result.get("error"):
                result["dimension_data"] = dim_result.get("data", [])
        return result

    elif tool_name == "get_overview":
        timeframe = tool_args.get("timeframe", "30d")
        overview = await get_revenue_overview(
            supabase, tenant_id, crm_source, timeframe
        )
        # Compact for LLM
        metrics = overview.get("metrics", {})
        compact = {
            "timeframe": overview.get("timeframe_label", timeframe),
            "metrics": {k: v.get("value") for k, v in metrics.items() if v.get("value") is not None},
            "alert_count": overview.get("alert_count", 0),
            "trust": overview.get("overall_trust", 0),
            "error": overview.get("error"),
        }
        return compact

    elif tool_name == "list_alerts":
        status = tool_args.get("status", "open")
        alerts = await list_revenue_alerts(
            supabase, tenant_id, crm_source, status
        )
        return {
            "alerts": [
                {
                    "type": a.get("alert_type"),
                    "severity": a.get("severity"),
                    "summary": a.get("summary"),
                }
                for a in alerts[:10]
            ],
            "count": len(alerts),
        }

    elif tool_name == "get_recommendations":
        try:
            insights = await nilufar.check_insights(
                supabase, tenant_id, crm_source
            )
            return {
                "recommendations": [
                    {"title": i.title, "summary": i.summary, "severity": i.severity}
                    for i in insights[:5]
                ] if insights else [{"title": "All clear", "summary": "No critical issues found."}],
            }
        except Exception as e:
            return {"error": str(e)}

    elif tool_name == "design_chart":
        desc = tool_args.get("description", "")
        try:
            if not crm_profile:
                return {"error": "CRM profile not available for chart generation."}
            configs = await dima.generate_chart_from_request(
                supabase, tenant_id, crm_source, desc, crm_profile,
            )
            charts = []
            for cfg in (configs or []):
                result = await anvar.execute_chart_query(
                    supabase, tenant_id, crm_source, cfg,
                )
                if result:
                    charts.append(result.model_dump())
            return {"charts": charts, "count": len(charts)}
        except Exception as e:
            return {"error": str(e)}

    elif tool_name == "respond":
        # Terminal — handled by the loop
        return tool_args

    else:
        return {"error": f"Unknown tool: {tool_name}"}


# ── Short-circuit handlers ($0) ───────────────────────────────────────────

async def _try_short_circuit(
    supabase, tenant_id: str, crm_source: str,
    message: str,
) -> Optional[dict]:
    """Try to answer with $0 cost handlers. Returns None if no match."""
    msg_lower = message.lower().strip()

    # KPI patterns
    for pattern, kpi_key in _KPI_SHORT_CIRCUITS:
        if re.search(pattern, msg_lower):
            result = await kpi_resolver.resolve_kpi(
                supabase, tenant_id, crm_source, kpi_key,
            )
            if result:
                rd = result.model_dump()
                return {
                    "reply": f"**{rd.get('title', kpi_key)}**: {rd.get('value', 'N/A')}",
                    "charts": [rd],
                    "response_type": "kpi",
                    "agent_used": "kpi_resolver",
                }
            return None

    # Revenue overview
    for pattern in _OVERVIEW_PATTERNS:
        if re.search(pattern, msg_lower):
            overview = await get_revenue_overview(
                supabase, tenant_id, crm_source, "30d"
            )
            metrics = overview.get("metrics", {})
            if not metrics and overview.get("error"):
                return None  # Fall through to agentic loop

            lines = ["**Pipeline Overview (Last 30 Days)**\n"]
            for key, val in metrics.items():
                v = val.get("value")
                if v is not None:
                    lines.append(f"- **{key.replace('_', ' ').title()}**: {v}")
            alert_count = overview.get("alert_count", 0)
            if alert_count:
                lines.append(f"\n⚠ {alert_count} active alert(s)")

            return {
                "reply": "\n".join(lines),
                "charts": [],
                "response_type": "overview",
                "agent_used": "bobur_v4",
            }

    return None


# ── Agentic ReAct loop ────────────────────────────────────────────────────

async def _agentic_loop(
    supabase,
    tenant_id: str,
    crm_source: str,
    message: str,
    history: list,
    schema_ctx: SchemaContext,
    crm_profile: Optional[CRMProfile],
    schema: Optional[SchemaProfile],
    crm_context_text: str,
    conv_state: ConversationState,
) -> dict:
    """Run the agentic ReAct loop with function calling."""

    system_prompt = _build_system_prompt(schema_ctx, crm_context_text, conv_state)

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 6 turns max)
    for msg in (history or [])[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    # Pre-build rep name map for SQL results
    rep_name_map = await build_rep_name_map(supabase, tenant_id, crm_source)

    start_time = time.time()
    last_sql = None
    last_tool = None
    charts_collected = []

    for iteration in range(MAX_ITERATIONS):
        # Timeout guard
        elapsed = time.time() - start_time
        if elapsed > LOOP_TIMEOUT_S:
            logger.warning("Bobur v4: loop timeout after %.1fs, %d iterations", elapsed, iteration)
            return {
                "reply": "I ran out of time analyzing your question. Could you try rephrasing it more simply?",
                "charts": charts_collected,
                "response_type": "timeout",
                "agent_used": "bobur_v4",
                "conversation_state": conv_state.to_dict(),
            }

        try:
            response = await openai_client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=1500,
            )
        except Exception as e:
            logger.error("Bobur v4: OpenAI call failed: %s", e)
            return {
                "reply": "I encountered an error processing your question. Please try again.",
                "charts": [],
                "response_type": "error",
                "agent_used": "bobur_v4",
                "conversation_state": conv_state.to_dict(),
            }

        choice = response.choices[0]

        # Log token usage
        if response.usage:
            log_token_usage_fire_and_forget(
                tenant_id=tenant_id,
                agent="bobur_v4",
                model=MODEL,
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
            )

        # If no tool calls — model responded directly
        if not choice.message.tool_calls:
            return {
                "reply": choice.message.content or "I couldn't generate a response.",
                "charts": charts_collected,
                "response_type": "chat",
                "agent_used": "bobur_v4",
                "conversation_state": conv_state.to_dict(),
            }

        # Process tool calls
        messages.append(choice.message)

        for tool_call in choice.message.tool_calls:
            fn_name = tool_call.function.name
            try:
                fn_args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                fn_args = {}

            logger.info(
                "Bobur v4 iter %d: tool=%s args=%s",
                iteration, fn_name, json.dumps(fn_args)[:200],
            )

            # Terminal tool — respond
            if fn_name == "respond":
                reply = fn_args.get("reply", "")
                resp_charts = fn_args.get("charts", [])
                charts_collected.extend(resp_charts)

                # Update conversation state
                conv_state.turn_count += 1
                conv_state.last_tool = last_tool
                conv_state.last_sql = last_sql
                if reply:
                    conv_state.last_result_summary = reply[:200]

                return {
                    "reply": reply,
                    "charts": charts_collected,
                    "response_type": "analysis",
                    "agent_used": "bobur_v4",
                    "conversation_state": conv_state.to_dict(),
                }

            # Execute non-terminal tool
            tool_result = await _execute_tool(
                fn_name, fn_args,
                supabase, tenant_id, crm_source,
                schema_ctx, crm_profile, schema, rep_name_map,
            )

            last_tool = fn_name
            if fn_name == "run_sql" and tool_result.get("sql_executed"):
                last_sql = tool_result["sql_executed"]

            # Collect charts from design_chart
            if fn_name == "design_chart" and tool_result.get("charts"):
                charts_collected.extend(tool_result["charts"])

            # Append tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result, default=str)[:3000],
            })

    # Exhausted iterations
    logger.warning("Bobur v4: exhausted %d iterations", MAX_ITERATIONS)
    return {
        "reply": "I wasn't able to fully answer your question. Could you try rephrasing?",
        "charts": charts_collected,
        "response_type": "max_iterations",
        "agent_used": "bobur_v4",
        "conversation_state": conv_state.to_dict(),
    }


# ── Main entry point ─────────────────────────────────────────────────────

async def handle_chat_message(
    supabase,
    tenant_id: str,
    crm_source: str,
    message: str,
    history: list = None,
    crm_profile: CRMProfile = None,
    conversation_state: dict = None,
) -> dict:
    """
    Bobur v4 main entry point.

    Returns
    -------
    {reply: str, charts: list, response_type: str, agent_used: str, conversation_state: dict}
    """
    history = history or []
    conv_state = ConversationState.from_dict(conversation_state)

    # 1. Try short-circuit ($0)
    short = await _try_short_circuit(supabase, tenant_id, crm_source, message)
    if short:
        conv_state.turn_count += 1
        conv_state.last_tool = "short_circuit"
        short["conversation_state"] = conv_state.to_dict()
        return short

    # 2. Load schema context + CRM context
    from agents import SchemaProfile as SP
    schema = await _load_schema_profile(supabase, tenant_id, crm_source)
    schema_ctx = await SchemaContext.create(supabase, tenant_id, crm_source, schema)
    crm_context_text = await _load_crm_context_text(supabase, tenant_id)

    # 3. Run agentic loop
    return await _agentic_loop(
        supabase, tenant_id, crm_source,
        message, history,
        schema_ctx, crm_profile, schema,
        crm_context_text, conv_state,
    )


# ── Helper loaders (shared with bobur.py) ─────────────────────────────────

async def _load_schema_profile(supabase, tenant_id: str, crm_source: str) -> SchemaProfile:
    """Load SchemaProfile from crm_schema_profiles table."""
    try:
        result = supabase.table("crm_schema_profiles").select(
            "schema_json"
        ).eq("tenant_id", tenant_id).eq("crm_source", crm_source).limit(1).execute()

        if result.data and result.data[0].get("schema_json"):
            return SchemaProfile(**result.data[0]["schema_json"])
    except Exception as e:
        logger.debug("Failed to load SchemaProfile: %s", e)

    return SchemaProfile(
        tenant_id=tenant_id, crm_source=crm_source, entities=[],
    )


async def _load_crm_context_text(supabase, tenant_id: str) -> str:
    """Load pre-computed CRM context summary."""
    try:
        result = supabase.table("crm_analytics_context").select(
            "context_json"
        ).eq("tenant_id", tenant_id).order(
            "created_at", desc=True
        ).limit(1).execute()

        if result.data and result.data[0].get("context_json"):
            ctx = result.data[0]["context_json"]
            # Build compact text from context JSON
            parts = []
            if isinstance(ctx, dict):
                for key, val in ctx.items():
                    if isinstance(val, str):
                        parts.append(f"{key}: {val}")
                    elif isinstance(val, (int, float)):
                        parts.append(f"{key}: {val}")
                    elif isinstance(val, dict):
                        parts.append(f"{key}: {json.dumps(val)[:200]}")
            return "\n".join(parts[:20])  # Cap at 20 lines
    except Exception as e:
        logger.debug("Failed to load CRM context: %s", e)

    return ""
