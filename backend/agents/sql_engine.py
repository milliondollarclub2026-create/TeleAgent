"""
SQL Engine — Validation + safe execution pipeline for Bobur v4.
================================================================
LLM generates SQL → parse (sqlglot) → read-only check → column whitelist
→ complexity guard → execute via Supabase RPC → truncate + format results.

Security: Tenant isolation is enforced by the RPC function, NOT the LLM.
The LLM writes clean analytics SQL — the database layer enforces tenant filters.

Cost: $0 (pure Python + Supabase RPC).
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import sqlglot
from sqlglot import exp

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────

MAX_ROWS = 100
MAX_JOINS = 3
MAX_SUBQUERIES = 2

# Tables the LLM is allowed to query
ALLOWED_TABLES = {
    "crm_deals", "crm_leads", "crm_contacts",
    "crm_companies", "crm_activities", "crm_users",
}

# Write keywords that must never appear
_WRITE_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|MERGE)\b",
    re.IGNORECASE,
)


# ── Validation ────────────────────────────────────────────────────────────

def validate_sql(
    sql: str,
    schema_ctx=None,
) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Validate and clean a SQL query.

    Returns
    -------
    (is_valid, error_msg, cleaned_sql)
    - On success: (True, None, cleaned_sql)
    - On failure: (False, error_message, None)
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query.", None

    sql = sql.strip().rstrip(";")

    # 1. Reject write operations (fast regex check)
    match = _WRITE_KEYWORDS.search(sql)
    if match:
        return False, f"Write operations are not allowed: {match.group(1)}", None

    # 2. Parse with sqlglot
    try:
        parsed = sqlglot.parse_one(sql, dialect="postgres")
    except sqlglot.errors.ParseError as e:
        return False, f"SQL syntax error: {e}", None
    except Exception as e:
        return False, f"Failed to parse SQL: {e}", None

    # 3. Verify it's a SELECT statement
    if not isinstance(parsed, exp.Select):
        return False, "Only SELECT queries are allowed.", None

    # 4. Check complexity: count JOINs
    joins = list(parsed.find_all(exp.Join))
    if len(joins) > MAX_JOINS:
        return False, f"Too complex: {len(joins)} JOINs (max {MAX_JOINS}).", None

    # 5. Check complexity: count subqueries
    subqueries = list(parsed.find_all(exp.Subquery))
    if len(subqueries) > MAX_SUBQUERIES:
        return False, f"Too complex: {len(subqueries)} subqueries (max {MAX_SUBQUERIES}).", None

    # 6. No CROSS JOINs
    for join in joins:
        if join.args.get("side") == "CROSS":
            return False, "CROSS JOIN is not allowed.", None

    # 7. Validate table references
    tables_used = set()
    for table in parsed.find_all(exp.Table):
        table_name = table.name
        if table_name:
            tables_used.add(table_name.lower())

    unknown_tables = tables_used - ALLOWED_TABLES
    if unknown_tables:
        return (
            False,
            f"Unknown tables: {', '.join(sorted(unknown_tables))}. "
            f"Allowed: {', '.join(sorted(ALLOWED_TABLES))}",
            None,
        )

    # 8. Validate column references against schema (if provided)
    if schema_ctx:
        entities = schema_ctx.get_entities()
        for col in parsed.find_all(exp.Column):
            col_name = col.name
            table_ref = col.table
            if not col_name or col_name == "*":
                continue
            # Skip aggregate aliases and expressions
            if col_name.lower() in ("count", "sum", "avg", "min", "max"):
                continue

            if table_ref:
                # Resolve alias → real table
                resolved_table = _resolve_table_alias(parsed, table_ref)
                if resolved_table and resolved_table in entities:
                    if not schema_ctx.validate_field(resolved_table, col_name):
                        valid_fields = entities.get(resolved_table, [])
                        return (
                            False,
                            f"Column '{col_name}' not found in {resolved_table}. "
                            f"Valid columns: {', '.join(sorted(valid_fields)[:20])}",
                            None,
                        )
            else:
                # No table qualifier — check if column exists in ANY used table
                found = False
                for t in tables_used:
                    if t in entities and schema_ctx.validate_field(t, col_name):
                        found = True
                        break
                if not found and tables_used:
                    # Collect valid fields from all used tables
                    all_fields = set()
                    for t in tables_used:
                        all_fields.update(entities.get(t, []))
                    if all_fields:
                        return (
                            False,
                            f"Column '{col_name}' not found. "
                            f"Valid columns: {', '.join(sorted(all_fields)[:20])}",
                            None,
                        )

    # 9. Inject LIMIT if not present
    if not parsed.find(exp.Limit):
        parsed = parsed.limit(MAX_ROWS)

    # 10. Regenerate cleaned SQL
    cleaned = parsed.sql(dialect="postgres")
    return True, None, cleaned


def _resolve_table_alias(parsed: exp.Select, alias: str) -> Optional[str]:
    """Resolve a table alias back to the real table name."""
    alias_lower = alias.lower()
    # Check FROM clause
    from_clause = parsed.find(exp.From)
    if from_clause:
        for table in from_clause.find_all(exp.Table):
            tbl_alias = table.alias
            tbl_name = table.name
            if tbl_alias and tbl_alias.lower() == alias_lower:
                return tbl_name.lower() if tbl_name else None
            if tbl_name and tbl_name.lower() == alias_lower:
                return tbl_name.lower()

    # Check JOINs
    for join in parsed.find_all(exp.Join):
        for table in join.find_all(exp.Table):
            tbl_alias = table.alias
            tbl_name = table.name
            if tbl_alias and tbl_alias.lower() == alias_lower:
                return tbl_name.lower() if tbl_name else None
            if tbl_name and tbl_name.lower() == alias_lower:
                return tbl_name.lower()

    return None


# ── Execution ─────────────────────────────────────────────────────────────

async def execute_sql(
    supabase,
    tenant_id: str,
    crm_source: str,
    sql: str,
    rep_name_map: dict | None = None,
) -> dict:
    """
    Execute a validated SQL query via the exec_readonly_sql RPC function.

    Returns
    -------
    {
        rows: list[dict],
        row_count: int,
        truncated: bool,
        error: str | None,
    }
    """
    try:
        result = supabase.rpc("exec_readonly_sql", {
            "p_tenant_id": tenant_id,
            "p_crm_source": crm_source,
            "p_query": sql,
        }).execute()

        rows = result.data if result.data else []

        # Parse if string (RPC returns JSONB as string sometimes)
        if isinstance(rows, str):
            rows = json.loads(rows)

        truncated = len(rows) >= MAX_ROWS

        # Resolve rep IDs to names if map provided
        if rep_name_map and rows:
            rows = _resolve_rep_names_in_rows(rows, rep_name_map)

        return {
            "rows": rows[:MAX_ROWS],
            "row_count": len(rows),
            "truncated": truncated,
            "error": None,
        }

    except Exception as e:
        error_msg = str(e)
        logger.warning("exec_readonly_sql failed: %s", error_msg)
        return {
            "rows": [],
            "row_count": 0,
            "truncated": False,
            "error": error_msg,
        }


def _resolve_rep_names_in_rows(rows: list[dict], rep_map: dict) -> list[dict]:
    """Replace rep ID fields with display names in result rows."""
    rep_fields = {"assigned_to", "responsible_id", "owner_id", "employee_id"}
    resolved = []
    for row in rows:
        new_row = dict(row)
        for field in rep_fields:
            if field in new_row:
                val = str(new_row[field]).strip()
                if val in rep_map:
                    new_row[field] = rep_map[val]
                elif val.isdigit():
                    new_row[field] = f"Rep #{val}"
        resolved.append(new_row)
    return resolved


def format_sql_results_for_llm(result: dict, max_chars: int = 2000) -> str:
    """Format SQL results compactly for the LLM to read."""
    if result.get("error"):
        return f"SQL Error: {result['error']}"

    rows = result.get("rows", [])
    if not rows:
        return "Query returned 0 rows."

    # Build compact table representation
    lines = [f"{result['row_count']} rows{' (truncated to 100)' if result.get('truncated') else ''}:"]

    # Column headers from first row
    cols = list(rows[0].keys())
    lines.append(" | ".join(cols))
    lines.append("-" * min(len(" | ".join(cols)), 80))

    for row in rows[:50]:  # Show max 50 rows to the LLM
        vals = []
        for c in cols:
            v = row.get(c)
            if v is None:
                vals.append("NULL")
            elif isinstance(v, float):
                vals.append(f"{v:,.2f}")
            else:
                vals.append(str(v)[:50])
        lines.append(" | ".join(vals))

    text = "\n".join(lines)
    if len(text) > max_chars:
        text = text[:max_chars] + "\n... (truncated)"
    return text
