"""
Tests for Phase 2 Nilufar recommendation engine.
Tests context building, parsing, fallbacks, and caching.
"""

import pytest
import time
from unittest.mock import MagicMock, AsyncMock, patch

from agents import (
    SchemaProfile,
    EntityProfile,
    FieldProfile,
    DynamicMetricResult,
    DynamicMetricEvidence,
    AlertResult,
    Recommendation,
)


# ── Test fixtures ────────────────────────────────────────────────────────

def _make_schema():
    return SchemaProfile(
        tenant_id="t1",
        crm_source="bitrix24",
        business_type="sales",
        business_summary="B2B sales company",
        entity_labels={"deals": "Opportunities", "leads": "Prospects"},
        currency="USD",
    )


def _make_metric(key, value, prev=None):
    comparison = {"previous_value": prev} if prev else None
    return DynamicMetricResult(
        metric_key=key,
        title=key.replace("_", " ").title(),
        value=value,
        display_format="number",
        evidence=DynamicMetricEvidence(
            row_count=50, timeframe="Last 30 days",
            definition=f"Test {key}",
        ),
        confidence=0.8,
        comparison=comparison,
    )


def _make_alert(alert_type, severity, metric_key=None, entity=None):
    return AlertResult(
        alert_type=alert_type,
        severity=severity,
        title=f"Test {alert_type}",
        summary=f"Test summary for {alert_type}",
        evidence={"test": True},
        metric_key=metric_key,
        entity=entity,
    )


# ── Test: _build_all_clear ───────────────────────────────────────────

def test_build_all_clear_with_metrics():
    from agents.nilufar import _build_all_clear

    metrics = [
        _make_metric("total_deals", 42),
        _make_metric("pipeline_value", 100000),
    ]
    schema = _make_schema()

    recs = _build_all_clear(metrics, schema)
    assert len(recs) == 1
    assert recs[0].severity == "info"
    assert "normal" in recs[0].title.lower() or "normal" in recs[0].finding.lower()


def test_build_all_clear_no_metrics():
    from agents.nilufar import _build_all_clear

    recs = _build_all_clear([], _make_schema())
    assert len(recs) == 1
    assert recs[0].severity == "info"


# ── Test: _build_recommendation_context ──────────────────────────────

def test_context_includes_metrics():
    from agents.nilufar import _build_recommendation_context

    schema = _make_schema()
    metrics = [_make_metric("total_deals", 42)]
    alerts = [_make_alert("trend_decline", "warning", metric_key="total_deals")]

    ctx = _build_recommendation_context(schema, metrics, alerts)

    assert ctx["business_type"] == "sales"
    assert ctx["currency"] == "USD"
    assert len(ctx["metrics"]) == 1
    assert ctx["metrics"][0]["key"] == "total_deals"
    assert len(ctx["alerts"]) == 1
    assert ctx["alerts"][0]["type"] == "trend_decline"


# ── Test: _parse_recommendations ─────────────────────────────────────

def test_parse_valid_recommendations():
    from agents.nilufar import _parse_recommendations

    raw = [
        {
            "severity": "critical",
            "title": "Pipeline at Risk",
            "finding": "Win rate dropped 40%",
            "impact": "Potential $50K revenue loss",
            "action": "Review lost deals this month",
            "related_metrics": ["win_rate"],
        },
        {
            "severity": "info",
            "title": "Lead Volume Stable",
            "finding": "Lead volume consistent",
            "impact": "",
            "action": "Continue monitoring",
            "related_metrics": [],
        },
    ]
    alerts = [_make_alert("trend_decline", "critical", metric_key="win_rate")]

    recs = _parse_recommendations(raw, alerts)
    assert len(recs) == 2
    assert isinstance(recs[0], Recommendation)
    assert recs[0].severity == "critical"
    assert recs[0].title == "Pipeline at Risk"
    # Evidence should be attached from matching alert
    assert recs[0].evidence.get("test") is True


def test_parse_empty_list():
    from agents.nilufar import _parse_recommendations

    recs = _parse_recommendations([], [])
    assert recs == []


def test_parse_skips_invalid_items():
    from agents.nilufar import _parse_recommendations

    raw = [
        "not a dict",
        42,
        {"severity": "info", "title": "Valid One", "finding": "OK"},
    ]

    recs = _parse_recommendations(raw, [])
    assert len(recs) == 1


# ── Test: _fallback_recommendations ──────────────────────────────────

def test_fallback_converts_alerts():
    from agents.nilufar import _fallback_recommendations

    schema = _make_schema()
    alerts = [
        _make_alert("trend_decline", "critical", metric_key="win_rate"),
        _make_alert("stagnation", "warning", entity="deals"),
    ]

    recs = _fallback_recommendations(alerts, schema)
    assert len(recs) == 2
    assert recs[0].severity == "critical"
    assert recs[0].finding == "Test summary for trend_decline"
    assert recs[1].related_metrics == []  # stagnation has no metric_key


# ── Test: Recommendation model ──────────────────────────────────────

def test_recommendation_model():
    rec = Recommendation(
        severity="warning",
        title="Test",
        finding="Something happened",
        impact="Revenue at risk",
        action="Take action",
        evidence={"key": "value"},
        related_metrics=["win_rate", "pipeline_value"],
    )
    assert rec.severity == "warning"
    assert len(rec.related_metrics) == 2


# ── Test: Cache mechanism ────────────────────────────────────────────

def test_cache_structure():
    from agents import nilufar
    # Cache should be a dict
    assert isinstance(nilufar._recommendation_cache, dict)
    assert nilufar.CACHE_TTL == 900


# ── Test: Legacy check_insights still importable ─────────────────────

def test_legacy_check_insights_exists():
    from agents.nilufar import check_insights
    import inspect
    assert inspect.iscoroutinefunction(check_insights)


def test_legacy_analyze_and_recommend_exists():
    from agents.nilufar import analyze_and_recommend
    import inspect
    assert inspect.iscoroutinefunction(analyze_and_recommend)
