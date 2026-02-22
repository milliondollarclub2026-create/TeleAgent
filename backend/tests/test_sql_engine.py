"""
SQL Engine tests — validates query parsing, security checks, and formatting.
No database or API calls needed (pure Python + sqlglot).
"""

import pytest
from agents.sql_engine import validate_sql, format_sql_results_for_llm, _resolve_rep_names_in_rows


# ── Helper: mock SchemaContext for column validation ──────────────────────

class MockSchemaContext:
    """Minimal mock matching SchemaContext.validate_field / get_entities API."""

    def __init__(self, entities: dict[str, list[str]]):
        self._entities = entities

    def get_entities(self) -> dict[str, list[str]]:
        return dict(self._entities)

    def validate_field(self, table: str, field: str) -> bool:
        if field in ("id", "external_id"):
            return True
        return field in self._entities.get(table, [])


SCHEMA = MockSchemaContext({
    "crm_deals": ["title", "stage_id", "value", "assigned_to", "contact_id", "company_id", "created_at", "won"],
    "crm_contacts": ["name", "email", "phone", "company", "created_at"],
    "crm_companies": ["title", "industry", "employee_count", "created_at"],
    "crm_users": ["name", "email"],
    "crm_leads": ["title", "source", "assigned_to", "created_at"],
    "crm_activities": ["type", "subject", "employee_id", "employee_name", "created_at"],
})


# ── Test: Valid queries pass ──────────────────────────────────────────────

class TestValidQueries:
    def test_simple_select(self):
        ok, err, sql = validate_sql("SELECT title, value FROM crm_deals", SCHEMA)
        assert ok is True
        assert err is None
        assert "crm_deals" in sql

    def test_select_with_where(self):
        ok, err, sql = validate_sql(
            "SELECT title FROM crm_deals WHERE won = true", SCHEMA
        )
        assert ok is True

    def test_select_with_join(self):
        ok, err, sql = validate_sql(
            "SELECT d.title, c.name FROM crm_deals d JOIN crm_contacts c ON d.contact_id = c.external_id",
            SCHEMA,
        )
        assert ok is True

    def test_select_with_aggregation(self):
        ok, err, sql = validate_sql(
            "SELECT stage_id, COUNT(*) as cnt FROM crm_deals GROUP BY stage_id",
            SCHEMA,
        )
        assert ok is True

    def test_select_star(self):
        ok, err, sql = validate_sql("SELECT * FROM crm_deals", SCHEMA)
        assert ok is True

    def test_limit_injected_when_missing(self):
        ok, err, sql = validate_sql("SELECT title FROM crm_deals", SCHEMA)
        assert ok is True
        assert "LIMIT" in sql.upper() or "limit" in sql.lower()

    def test_existing_limit_preserved(self):
        ok, err, sql = validate_sql("SELECT title FROM crm_deals LIMIT 10", SCHEMA)
        assert ok is True
        assert "10" in sql


# ── Test: Write operations rejected ──────────────────────────────────────

class TestWriteRejection:
    @pytest.mark.parametrize("stmt", [
        "INSERT INTO crm_deals (title) VALUES ('test')",
        "UPDATE crm_deals SET title = 'x'",
        "DELETE FROM crm_deals",
        "DROP TABLE crm_deals",
        "ALTER TABLE crm_deals ADD COLUMN x TEXT",
        "TRUNCATE crm_deals",
        "CREATE TABLE foo (id INT)",
    ])
    def test_write_rejected(self, stmt):
        ok, err, sql = validate_sql(stmt, SCHEMA)
        assert ok is False
        assert "not allowed" in err.lower() or "write" in err.lower()
        assert sql is None


# ── Test: Hallucinated columns caught ────────────────────────────────────

class TestColumnValidation:
    def test_invalid_column_rejected(self):
        ok, err, sql = validate_sql(
            "SELECT fake_column FROM crm_deals", SCHEMA
        )
        assert ok is False
        assert "fake_column" in err
        assert "Valid columns" in err

    def test_invalid_column_with_table_alias(self):
        ok, err, sql = validate_sql(
            "SELECT d.nonexistent FROM crm_deals d", SCHEMA
        )
        assert ok is False
        assert "nonexistent" in err

    def test_valid_system_column(self):
        ok, err, sql = validate_sql(
            "SELECT id, external_id FROM crm_deals", SCHEMA
        )
        assert ok is True


# ── Test: JOIN validation ────────────────────────────────────────────────

class TestJoinValidation:
    def test_valid_join(self):
        ok, err, sql = validate_sql(
            "SELECT d.title, c.name FROM crm_deals d "
            "JOIN crm_contacts c ON d.contact_id = c.external_id",
            SCHEMA,
        )
        assert ok is True

    def test_three_way_join(self):
        ok, err, sql = validate_sql(
            "SELECT d.title, c.name, co.title FROM crm_deals d "
            "JOIN crm_contacts c ON d.contact_id = c.external_id "
            "JOIN crm_companies co ON d.company_id = co.external_id",
            SCHEMA,
        )
        assert ok is True


# ── Test: Complexity guard ───────────────────────────────────────────────

class TestComplexityGuard:
    def test_too_many_joins_rejected(self):
        sql = (
            "SELECT d.title FROM crm_deals d "
            "JOIN crm_contacts c1 ON d.contact_id = c1.external_id "
            "JOIN crm_companies c2 ON d.company_id = c2.external_id "
            "JOIN crm_users u ON d.assigned_to = u.external_id "
            "JOIN crm_leads l ON l.assigned_to = u.external_id"
        )
        ok, err, _ = validate_sql(sql, SCHEMA)
        assert ok is False
        assert "JOIN" in err

    def test_three_joins_allowed(self):
        sql = (
            "SELECT d.title FROM crm_deals d "
            "JOIN crm_contacts c ON d.contact_id = c.external_id "
            "JOIN crm_companies co ON d.company_id = co.external_id "
            "JOIN crm_users u ON d.assigned_to = u.external_id"
        )
        ok, err, _ = validate_sql(sql, SCHEMA)
        assert ok is True


# ── Test: Unknown table rejected ─────────────────────────────────────────

class TestTableValidation:
    def test_unknown_table(self):
        ok, err, sql = validate_sql("SELECT * FROM secret_table")
        assert ok is False
        assert "Unknown tables" in err
        assert "secret_table" in err


# ── Test: Syntax errors caught ───────────────────────────────────────────

class TestSyntaxErrors:
    def test_malformed_sql(self):
        ok, err, sql = validate_sql("SELCT * FORM crm_deals")
        assert ok is False

    def test_empty_sql(self):
        ok, err, sql = validate_sql("")
        assert ok is False
        assert "Empty" in err


# ── Test: No tenant_id in SQL ────────────────────────────────────────────

class TestTenantIsolation:
    def test_no_tenant_filter_needed(self):
        """The LLM should NOT add tenant_id — the RPC handles it."""
        ok, err, sql = validate_sql(
            "SELECT title, value FROM crm_deals WHERE won = true",
            SCHEMA,
        )
        assert ok is True
        assert "tenant_id" not in sql


# ── Test: Result formatting ──────────────────────────────────────────────

class TestResultFormatting:
    def test_format_empty(self):
        text = format_sql_results_for_llm({"rows": [], "row_count": 0, "truncated": False})
        assert "0 rows" in text

    def test_format_error(self):
        text = format_sql_results_for_llm({"error": "timeout"})
        assert "timeout" in text

    def test_format_rows(self):
        text = format_sql_results_for_llm({
            "rows": [{"name": "Alice", "deals": 5}, {"name": "Bob", "deals": 3}],
            "row_count": 2,
            "truncated": False,
        })
        assert "Alice" in text
        assert "2 rows" in text


# ── Test: Rep name resolution ────────────────────────────────────────────

class TestRepNameResolution:
    def test_resolve_rep_names(self):
        rows = [{"assigned_to": "42", "title": "Deal A"}]
        rep_map = {"42": "John Smith"}
        result = _resolve_rep_names_in_rows(rows, rep_map)
        assert result[0]["assigned_to"] == "John Smith"

    def test_unknown_rep_gets_label(self):
        rows = [{"assigned_to": "99", "title": "Deal B"}]
        result = _resolve_rep_names_in_rows(rows, {})
        assert result[0]["assigned_to"] == "Rep #99"

    def test_non_rep_fields_untouched(self):
        rows = [{"title": "Deal C", "value": "1000"}]
        result = _resolve_rep_names_in_rows(rows, {"1": "Alice"})
        assert result[0]["title"] == "Deal C"
