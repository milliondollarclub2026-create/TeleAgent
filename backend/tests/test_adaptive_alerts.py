"""
Tests for the Phase 2 alerts engine.
Tests all 5 alert patterns with mocked data.
"""

import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone, timedelta

from agents import DynamicMetricResult, DynamicMetricEvidence, AlertResult


# ── Mock helpers ─────────────────────────────────────────────────────────

class MockQueryBuilder:
    def __init__(self, data=None, count=None):
        self._data = data or []
        self._count = count

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def lt(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def lte(self, *args, **kwargs):
        return self

    def is_(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        result.count = self._count if self._count is not None else len(self._data)
        return result


def _make_metric(key, value, prev_value=None, confidence=0.8, tables=None):
    """Helper to create a DynamicMetricResult for testing."""
    comparison = {"previous_value": prev_value} if prev_value is not None else None
    return DynamicMetricResult(
        metric_key=key,
        title=key.replace("_", " ").title(),
        value=value,
        display_format="number",
        evidence=DynamicMetricEvidence(
            row_count=50,
            timeframe="Last 30 days",
            definition=f"Test metric {key}",
            source_tables=tables or ["crm_deals"],
        ),
        confidence=confidence,
        comparison=comparison,
    )


# ── Test: trend_decline ──────────────────────────────────────────────

def test_trend_decline_fires_on_drop():
    from revenue.alerts import _evaluate_trend_decline

    metric_map = {
        "win_rate": _make_metric("win_rate", 15.0, prev_value=25.0),
    }
    severity_rules = {
        "warning": {"threshold_pct": -15},
        "critical": {"threshold_pct": -30},
    }

    alert = _evaluate_trend_decline("win_rate", metric_map, {}, severity_rules)
    assert alert is not None
    assert alert.alert_type == "trend_decline"
    assert alert.severity == "critical"  # -40% drop > -30% threshold


def test_trend_decline_warning():
    from revenue.alerts import _evaluate_trend_decline

    metric_map = {
        "win_rate": _make_metric("win_rate", 20.0, prev_value=25.0),
    }
    severity_rules = {
        "warning": {"threshold_pct": -15},
        "critical": {"threshold_pct": -30},
    }

    alert = _evaluate_trend_decline("win_rate", metric_map, {}, severity_rules)
    assert alert is not None
    assert alert.severity == "warning"  # -20% drop


def test_trend_decline_no_fire_on_increase():
    from revenue.alerts import _evaluate_trend_decline

    metric_map = {
        "win_rate": _make_metric("win_rate", 30.0, prev_value=25.0),
    }
    severity_rules = {
        "warning": {"threshold_pct": -15},
        "critical": {"threshold_pct": -30},
    }

    alert = _evaluate_trend_decline("win_rate", metric_map, {}, severity_rules)
    assert alert is None


def test_trend_decline_no_fire_without_comparison():
    from revenue.alerts import _evaluate_trend_decline

    metric_map = {
        "win_rate": _make_metric("win_rate", 20.0),  # no prev_value
    }

    alert = _evaluate_trend_decline("win_rate", metric_map, {}, {})
    assert alert is None


# ── Test: stagnation ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stagnation_fires():
    from revenue.alerts import _evaluate_stagnation

    # 80 out of 100 records stale > 14 days = 80% stale
    call_count = [0]
    sb = MagicMock()

    def table_fn(name):
        qb = MockQueryBuilder()
        def custom_execute():
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:
                result.count = 80  # stale (warning threshold)
                result.data = []
            elif call_count[0] == 2:
                result.count = 100  # total
                result.data = []
            else:
                result.count = 40  # critical stale
                result.data = []
            return result
        qb.execute = custom_execute
        return qb

    sb.table = table_fn

    config = {"modified_field": "modified_at"}
    severity_rules = {
        "warning": {"stale_days": 14},
        "critical": {"stale_days": 30},
    }

    alert = await _evaluate_stagnation(sb, "t1", "bitrix24", "deals", config, severity_rules)
    assert alert is not None
    assert alert.alert_type == "stagnation"


@pytest.mark.asyncio
async def test_stagnation_no_fire_fresh_data():
    from revenue.alerts import _evaluate_stagnation

    call_count = [0]
    sb = MagicMock()

    def table_fn(name):
        qb = MockQueryBuilder()
        def custom_execute():
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:
                result.count = 5  # only 5 stale out of 100
                result.data = []
            else:
                result.count = 100
                result.data = []
            return result
        qb.execute = custom_execute
        return qb

    sb.table = table_fn

    alert = await _evaluate_stagnation(
        sb, "t1", "bitrix24", "deals",
        {"modified_field": "modified_at"},
        {"warning": {"stale_days": 14}, "critical": {"stale_days": 30}},
    )
    assert alert is None  # 5% stale < 20% threshold


# ── Test: missing_data ──────────────────────────────────────────────

def test_missing_data_fires():
    from revenue.alerts import _evaluate_missing_data

    alert = _evaluate_missing_data(
        metric_key="total_value",
        entity="deals",
        config={"field": "value", "current_fill_rate": 0.30},
        severity_rules={
            "warning": {"min_fill_rate": 0.8},
            "critical": {"min_fill_rate": 0.5},
        },
    )
    assert alert is not None
    assert alert.alert_type == "missing_data"
    assert alert.severity == "critical"  # 0.30 < 0.5


def test_missing_data_warning():
    from revenue.alerts import _evaluate_missing_data

    alert = _evaluate_missing_data(
        metric_key="total_value",
        entity="deals",
        config={"field": "value", "current_fill_rate": 0.65},
        severity_rules={
            "warning": {"min_fill_rate": 0.8},
            "critical": {"min_fill_rate": 0.5},
        },
    )
    assert alert is not None
    assert alert.severity == "warning"


def test_missing_data_no_fire():
    from revenue.alerts import _evaluate_missing_data

    alert = _evaluate_missing_data(
        metric_key="total_value",
        entity="deals",
        config={"field": "value", "current_fill_rate": 0.95},
        severity_rules={
            "warning": {"min_fill_rate": 0.8},
            "critical": {"min_fill_rate": 0.5},
        },
    )
    assert alert is None


# ── Test: divergence ─────────────────────────────────────────────────

def test_divergence_fires():
    from revenue.alerts import _evaluate_divergence

    metric_map = {
        "pipeline_value": _make_metric("pipeline_value", 150, prev_value=100),  # +50%
        "win_rate": _make_metric("win_rate", 10, prev_value=20),  # -50%
    }

    config = {
        "metric_a": "pipeline_value",
        "metric_b": "win_rate",
        "expected_correlation": "positive",
    }
    severity_rules = {"warning": {"min_divergence_pct": 10}}

    alert = _evaluate_divergence(config, metric_map, severity_rules)
    assert alert is not None
    assert alert.alert_type == "divergence"


def test_divergence_no_fire_same_direction():
    from revenue.alerts import _evaluate_divergence

    metric_map = {
        "pipeline_value": _make_metric("pipeline_value", 150, prev_value=100),  # +50%
        "win_rate": _make_metric("win_rate", 30, prev_value=20),  # +50%
    }

    config = {
        "metric_a": "pipeline_value",
        "metric_b": "win_rate",
        "expected_correlation": "positive",
    }

    alert = _evaluate_divergence(config, metric_map, {})
    assert alert is None


# ── Test: evaluate_alert_rules integration ───────────────────────────

@pytest.mark.asyncio
async def test_evaluate_alert_rules_no_rules():
    from revenue.alerts import evaluate_alert_rules

    sb = MagicMock()
    sb.table.return_value = MockQueryBuilder(data=[], count=0)

    results = await evaluate_alert_rules(sb, "t1", "bitrix24", [])
    assert results == []


# ── Test: _determine_severity ────────────────────────────────────────

def test_determine_severity_critical():
    from revenue.alerts import _determine_severity

    result = _determine_severity(
        -35,
        {"warning": {"threshold_pct": -15}, "critical": {"threshold_pct": -30}},
        is_decline=True,
    )
    assert result == "critical"


def test_determine_severity_warning():
    from revenue.alerts import _determine_severity

    result = _determine_severity(
        -20,
        {"warning": {"threshold_pct": -15}, "critical": {"threshold_pct": -30}},
        is_decline=True,
    )
    assert result == "warning"


def test_determine_severity_none():
    from revenue.alerts import _determine_severity

    result = _determine_severity(
        -5,
        {"warning": {"threshold_pct": -15}, "critical": {"threshold_pct": -30}},
        is_decline=True,
    )
    assert result is None
