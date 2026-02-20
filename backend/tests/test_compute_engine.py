"""
Tests for the Phase 2 dynamic compute engine.
Tests all 6 recipe types with mocked Supabase responses.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone, timedelta

from agents import DynamicMetricResult, DynamicMetricEvidence


# ── Mock Supabase helpers ──────────────────────────────────────────────

class MockQueryBuilder:
    """Chainable mock for Supabase query builder."""

    def __init__(self, data=None, count=None):
        self._data = data or []
        self._count = count

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def neq(self, *args, **kwargs):
        return self

    def gt(self, *args, **kwargs):
        return self

    def lt(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def lte(self, *args, **kwargs):
        return self

    def is_(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        result.count = self._count if self._count is not None else len(self._data)
        return result


def make_supabase(table_responses=None):
    """Create a mock supabase client with table-level response config."""
    table_responses = table_responses or {}
    sb = MagicMock()

    def table_fn(name):
        if name in table_responses:
            resp = table_responses[name]
            return MockQueryBuilder(data=resp.get("data"), count=resp.get("count"))
        return MockQueryBuilder()

    sb.table = table_fn
    return sb


# ── Test: compute_metric with count recipe ──────────────────────────────

@pytest.mark.asyncio
async def test_compute_count():
    from revenue.dynamic_compute import compute_metric

    sb = make_supabase({"crm_deals": {"data": [], "count": 42}})
    metric_def = {
        "metric_key": "total_deals",
        "title": "Total Deals",
        "computation": {"type": "count", "table": "crm_deals", "filters": {}},
        "source_table": "crm_deals",
        "display_format": "number",
        "required_fields": [],
        "confidence": 0.9,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["stage", "value"]},
    )

    assert isinstance(result, DynamicMetricResult)
    assert result.metric_key == "total_deals"
    assert result.value == 42
    assert result.evidence.row_count == 42


@pytest.mark.asyncio
async def test_compute_sum():
    from revenue.dynamic_compute import compute_metric

    rows = [{"value": 100}, {"value": 200}, {"value": None}, {"value": 50}]
    sb = make_supabase({"crm_deals": {"data": rows}})

    metric_def = {
        "metric_key": "pipeline_value",
        "title": "Pipeline Value",
        "computation": {"type": "sum", "table": "crm_deals", "field": "value", "filters": {}},
        "source_table": "crm_deals",
        "display_format": "currency",
        "required_fields": ["value"],
        "confidence": 0.8,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["value", "stage"]},
    )

    assert result.value == 350.0
    assert result.evidence.row_count == 3  # 3 non-null


@pytest.mark.asyncio
async def test_compute_avg():
    from revenue.dynamic_compute import compute_metric

    rows = [{"value": 100}, {"value": 200}, {"value": 300}]
    sb = make_supabase({"crm_deals": {"data": rows}})

    metric_def = {
        "metric_key": "avg_deal",
        "title": "Avg Deal",
        "computation": {"type": "avg", "table": "crm_deals", "field": "value", "filters": {}},
        "source_table": "crm_deals",
        "display_format": "currency",
        "required_fields": ["value"],
        "confidence": 0.8,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["value", "stage"]},
    )

    assert result.value == 200.0


@pytest.mark.asyncio
async def test_compute_ratio():
    from revenue.dynamic_compute import compute_metric

    sb = MagicMock()

    # Track calls to return different counts for numerator vs denominator
    call_count = [0]

    def table_fn(name):
        qb = MockQueryBuilder()
        orig_execute = qb.execute

        def custom_execute():
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:  # numerator
                result.count = 20
                result.data = []
            else:  # denominator
                result.count = 100
                result.data = []
            return result

        qb.execute = custom_execute
        return qb

    sb.table = table_fn

    metric_def = {
        "metric_key": "win_rate",
        "title": "Win Rate",
        "computation": {
            "type": "ratio",
            "numerator": {"table": "crm_deals", "filter": {"won": True}, "agg": "count"},
            "denominator": {"table": "crm_deals", "filter": {}, "agg": "count"},
            "multiply": 100,
        },
        "source_table": "crm_deals",
        "display_format": "percentage",
        "required_fields": [],
        "confidence": 0.8,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["won", "stage"]},
    )

    assert result.value == 20.0  # 20/100 * 100


@pytest.mark.asyncio
async def test_compute_distinct_count():
    from revenue.dynamic_compute import compute_metric

    rows = [
        {"assigned_to": "Alice"},
        {"assigned_to": "Bob"},
        {"assigned_to": "Alice"},
        {"assigned_to": "Charlie"},
        {"assigned_to": None},
    ]
    sb = make_supabase({"crm_deals": {"data": rows}})

    metric_def = {
        "metric_key": "active_reps",
        "title": "Active Reps",
        "computation": {"type": "distinct_count", "table": "crm_deals", "field": "assigned_to", "filters": {}},
        "source_table": "crm_deals",
        "display_format": "number",
        "required_fields": ["assigned_to"],
        "confidence": 0.9,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["assigned_to"]},
    )

    assert result.value == 3  # Alice, Bob, Charlie


@pytest.mark.asyncio
async def test_compute_duration():
    from revenue.dynamic_compute import compute_metric

    now = datetime.now(timezone.utc)
    rows = [
        {"created_at": (now - timedelta(days=10)).isoformat(), "closed_at": now.isoformat()},
        {"created_at": (now - timedelta(days=20)).isoformat(), "closed_at": now.isoformat()},
    ]
    sb = make_supabase({"crm_deals": {"data": rows}})

    metric_def = {
        "metric_key": "sales_cycle",
        "title": "Sales Cycle",
        "computation": {
            "type": "duration",
            "table": "crm_deals",
            "start_field": "created_at",
            "end_field": "closed_at",
            "unit": "days",
            "filters": {},
        },
        "source_table": "crm_deals",
        "display_format": "days",
        "required_fields": ["created_at", "closed_at"],
        "confidence": 0.7,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["created_at", "closed_at"]},
    )

    assert result.value == 15.0  # avg of 10 and 20
    assert result.evidence.row_count == 2


# ── Test: error handling ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_compute_unknown_table():
    from revenue.dynamic_compute import compute_metric

    sb = MagicMock()
    metric_def = {
        "metric_key": "bad_table",
        "title": "Bad",
        "computation": {"type": "count", "table": "crm_nonexistent", "filters": {}},
        "source_table": "crm_nonexistent",
        "display_format": "number",
        "required_fields": [],
        "confidence": 0.5,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["stage"]},
    )

    assert result.value is None
    assert result.confidence == 0.0
    assert any("not in allowed" in c for c in result.evidence.caveats)


@pytest.mark.asyncio
async def test_compute_unknown_recipe_type():
    from revenue.dynamic_compute import compute_metric

    sb = MagicMock()
    metric_def = {
        "metric_key": "bad_type",
        "title": "Bad",
        "computation": {"type": "magic", "table": "crm_deals"},
        "source_table": "crm_deals",
        "display_format": "number",
        "required_fields": [],
        "confidence": 0.5,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["stage"]},
    )

    assert result.value is None
    assert any("Unknown recipe" in c for c in result.evidence.caveats)


@pytest.mark.asyncio
async def test_compute_empty_data():
    from revenue.dynamic_compute import compute_metric

    sb = make_supabase({"crm_deals": {"data": [], "count": 0}})
    metric_def = {
        "metric_key": "empty",
        "title": "Empty",
        "computation": {"type": "count", "table": "crm_deals", "filters": {}},
        "source_table": "crm_deals",
        "display_format": "number",
        "required_fields": [],
        "confidence": 0.9,
    }

    result = await compute_metric(
        sb, "t1", "bitrix24", metric_def,
        allowed_fields={"crm_deals": ["stage"]},
    )

    assert result.value == 0
    assert result.confidence == 0.0
    assert result.evidence.row_count == 0


# ── Test: format_metric_card ─────────────────────────────────────────

def test_format_metric_card():
    from revenue.dynamic_compute import format_metric_card

    result = DynamicMetricResult(
        metric_key="total_deals",
        title="Total Deals",
        value=42,
        display_format="number",
        evidence=DynamicMetricEvidence(row_count=42, timeframe="Last 30 days"),
        confidence=0.9,
        comparison={"previous_value": 35},
    )

    card = format_metric_card(result)
    assert card["key"] == "total_deals"
    assert card["value"] == 42
    assert card["trend"]["direction"] == "up"
    assert card["trend"]["change_pct"] == 20.0


# ── Test: _apply_filters ─────────────────────────────────────────────

def test_apply_filters():
    from revenue.dynamic_compute import _apply_filters

    qb = MagicMock()
    qb.eq = MagicMock(return_value=qb)
    qb.neq = MagicMock(return_value=qb)
    qb.gt = MagicMock(return_value=qb)
    qb.is_ = MagicMock(return_value=qb)
    qb.in_ = MagicMock(return_value=qb)

    result = _apply_filters(qb, {
        "stage": "won",
        "value__gt": 100,
        "won__is": None,
        "status__in": ["open", "pending"],
    })

    qb.eq.assert_called_once_with("stage", "won")
    qb.gt.assert_called_once_with("value", 100)
    qb.is_.assert_called()
    qb.in_.assert_called()


# ── Test: evidence quality ───────────────────────────────────────────

def test_confidence_zero_on_no_data():
    from revenue.dynamic_compute import _compute_confidence, DynamicMetricEvidence

    evidence = DynamicMetricEvidence(row_count=0)
    assert _compute_confidence(evidence, 0.9) == 0.0


def test_confidence_capped_on_low_n():
    from revenue.dynamic_compute import _compute_confidence, DynamicMetricEvidence

    evidence = DynamicMetricEvidence(row_count=5)
    assert _compute_confidence(evidence, 0.9) == 0.5


def test_confidence_capped_on_caveats():
    from revenue.dynamic_compute import _compute_confidence, DynamicMetricEvidence

    evidence = DynamicMetricEvidence(row_count=100, caveats=["some issue"])
    assert _compute_confidence(evidence, 0.9) == 0.7
