"""
Tests for Bobur Revenue Analyst upgrades
==========================================
Covers:
  - route_message(): pipeline/health → revenue_overview intent
  - route_message(): risks/anomalies → revenue_alerts intent
  - query_metric(): unknown metric key rejected with clear error
  - query_metric(): invalid dimension rejected with clear error
  - query_metric(): metric with no data returns validation error, not crash
  - chart request in handle_chat_message(): unknown data_source rejected safely
  - format_overview_evidence(): produces evidence bullets + trust score
  - format_alerts_evidence(): produces evidence bullets from alert list
  - _append_evidence_block(): always appends timeframe + bullets + confidence
  - recommend_actions(): returns evidence-cited bullets from alert

Uses lightweight mock-Supabase — no real DB or network calls.
"""

from __future__ import annotations

import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.bobur import route_message, _append_evidence_block
from agents.bobur_tools import (
    query_metric,
    format_overview_evidence,
    format_alerts_evidence,
    confidence_label,
    recommend_actions,
    TIMEFRAME_LABEL,
)

TENANT_ID = "tenant-bbb"
CRM_SOURCE = "bitrix"


# ---------------------------------------------------------------------------
# Supabase mock helpers (reused from test_revenue_compute pattern)
# ---------------------------------------------------------------------------

class _TableMock:
    def __init__(self, data, count=None):
        self._data = data
        self._count = count if count is not None else len(data)

    def select(self, *a, **kw): return self
    def eq(self, *a, **kw):    return self
    def neq(self, *a, **kw):   return self
    def gte(self, *a, **kw):   return self
    def lte(self, *a, **kw):   return self
    @property
    def not_(self):            return self
    def is_(self, *a, **kw):   return self
    def order(self, *a, **kw): return self
    def limit(self, *a, **kw): return self
    def single(self, *a, **kw): return self
    def insert(self, *a, **kw): return self
    def update(self, *a, **kw): return self
    def delete(self, *a, **kw): return self
    def upsert(self, *a, **kw): return self
    def execute(self):
        r = MagicMock()
        r.data = self._data
        r.count = self._count
        return r


def _mk_supabase(tables: dict):
    sb = MagicMock()
    sb.table = lambda name: _TableMock(tables.get(name, []))
    return sb


# ---------------------------------------------------------------------------
# 1. Routing: pipeline/health/forecast → revenue_overview
# ---------------------------------------------------------------------------

class TestRoutingRevenueOverview:
    """route_message() should classify pipeline/health queries as revenue_overview."""

    @pytest.mark.asyncio
    async def test_how_is_my_pipeline(self):
        route = await route_message("how is my pipeline looking?")
        assert route.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_pipeline_health(self):
        route = await route_message("pipeline health check")
        assert route.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_revenue_overview(self):
        route = await route_message("give me a revenue overview for last month")
        assert route.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_how_is_business_doing(self):
        route = await route_message("how is the business doing this quarter?")
        assert route.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_forecast_status(self):
        route = await route_message("what is our forecast status?")
        assert route.intent == "revenue_overview"

    @pytest.mark.asyncio
    async def test_timeframe_30d_default(self):
        route = await route_message("how is my pipeline?")
        assert route.intent == "revenue_overview"
        assert route.filters.get("timeframe") == "30d"

    @pytest.mark.asyncio
    async def test_timeframe_extracted_from_message(self):
        route = await route_message("how is my pipeline this week?")
        assert route.intent == "revenue_overview"
        assert route.filters.get("timeframe") == "7d"


# ---------------------------------------------------------------------------
# 2. Routing: risks/anomalies → revenue_alerts
# ---------------------------------------------------------------------------

class TestRoutingRevenueAlerts:
    """route_message() should classify risk/anomaly queries as revenue_alerts."""

    @pytest.mark.asyncio
    async def test_any_risks(self):
        route = await route_message("any revenue risks?")
        assert route.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_anomalies(self):
        route = await route_message("show me anomalies in the data")
        assert route.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_alerts(self):
        route = await route_message("what alerts do we have?")
        assert route.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_stalled_deals(self):
        route = await route_message("which deals are stalled?")
        assert route.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_conversion_drop(self):
        route = await route_message("has our conversion rate dropped recently?")
        # Should match revenue_alerts (conversion drop pattern)
        assert route.intent in ("revenue_alerts", "revenue_overview")

    @pytest.mark.asyncio
    async def test_what_is_wrong(self):
        route = await route_message("what's wrong with our pipeline?")
        assert route.intent == "revenue_alerts"

    @pytest.mark.asyncio
    async def test_something_unusual(self):
        route = await route_message("is anything unusual happening?")
        assert route.intent == "revenue_alerts"


# ---------------------------------------------------------------------------
# 3. query_metric(): unknown metric key rejected safely
# ---------------------------------------------------------------------------

class TestQueryMetricUnknownKey:
    """query_metric() must reject unknown metric keys BEFORE any DB query."""

    @pytest.mark.asyncio
    async def test_unknown_key_returns_error(self):
        sb = _mk_supabase({})
        result = await query_metric(sb, TENANT_ID, CRM_SOURCE, "completely_fake_metric")
        assert result.get("error") is not None
        assert "Unknown metric" in result["error"]

    @pytest.mark.asyncio
    async def test_unknown_key_error_lists_valid_keys(self):
        sb = _mk_supabase({})
        result = await query_metric(sb, TENANT_ID, CRM_SOURCE, "xyz_doesnt_exist")
        error = result.get("error", "")
        # Should list at least some valid keys
        assert "pipeline_value" in error or "win_rate" in error

    @pytest.mark.asyncio
    async def test_unknown_key_does_not_raise(self):
        """Must return dict with error, never raise an exception."""
        sb = _mk_supabase({})
        try:
            result = await query_metric(sb, TENANT_ID, CRM_SOURCE, "___totally_wrong___")
            assert isinstance(result, dict)
            assert "error" in result
        except Exception as exc:
            pytest.fail(f"query_metric raised unexpectedly: {exc}")

    @pytest.mark.asyncio
    async def test_empty_key_returns_error(self):
        sb = _mk_supabase({})
        result = await query_metric(sb, TENANT_ID, CRM_SOURCE, "")
        assert result.get("error") is not None


# ---------------------------------------------------------------------------
# 4. query_metric(): invalid dimension rejected safely
# ---------------------------------------------------------------------------

class TestQueryMetricInvalidDimension:
    """query_metric() must reject unsupported dimensions BEFORE any DB query."""

    @pytest.mark.asyncio
    async def test_invalid_dimension_for_win_rate(self):
        sb = _mk_supabase({})
        # win_rate only allows dimension="assigned_to"
        result = await query_metric(
            sb, TENANT_ID, CRM_SOURCE, "win_rate", dimension="bad_field_xyz"
        )
        assert result.get("error") is not None
        err = result["error"]
        assert "bad_field_xyz" in err or "not allowed" in err or "Dimension" in err

    @pytest.mark.asyncio
    async def test_invalid_dimension_for_pipeline_value(self):
        sb = _mk_supabase({})
        result = await query_metric(
            sb, TENANT_ID, CRM_SOURCE, "pipeline_value", dimension="nonexistent_col"
        )
        assert result.get("error") is not None

    @pytest.mark.asyncio
    async def test_valid_dimension_for_win_rate_passes_validation(self):
        """
        win_rate allows dimension="assigned_to". Validation should pass.
        The metric may then fail with 'unavailable' due to empty table,
        but it should NOT fail with 'Dimension not allowed'.
        """
        sb = _mk_supabase({"crm_deals": []})  # empty → availability check fails
        result = await query_metric(
            sb, TENANT_ID, CRM_SOURCE, "win_rate", dimension="assigned_to"
        )
        error = result.get("error") or ""
        # Should not be a dimension validation error
        assert "Dimension" not in error or "not allowed" not in error

    @pytest.mark.asyncio
    async def test_none_dimension_skips_validation(self):
        """dimension=None should skip the dimension check entirely."""
        sb = _mk_supabase({"crm_deals": []})
        result = await query_metric(sb, TENANT_ID, CRM_SOURCE, "win_rate", dimension=None)
        error = result.get("error") or ""
        # Should not be a dimension validation error
        assert "Dimension" not in error


# ---------------------------------------------------------------------------
# 5. Chart validation: unknown data_source rejected in handle_chat_message
# ---------------------------------------------------------------------------

class TestChartFieldValidation:
    """
    handle_chat_message() with chart intent must reject charts that reference
    fields not in the ALLOWED_FIELDS whitelist.
    """

    @pytest.mark.asyncio
    async def test_unknown_data_source_rejected(self):
        from agents import ChartConfig
        from agents.bobur import handle_chat_message

        # Build a bad chart config — data_source not in ALLOWED_FIELDS
        bad_config = ChartConfig(
            chart_type="bar",
            title="Bad Chart",
            data_source="crm_unknown_table",  # not in ALLOWED_FIELDS
            x_field="stage",
            y_field="value",
            aggregation="sum",
        )

        sb = _mk_supabase({
            "dashboard_configs": [],
            "revenue_snapshots": [],
        })

        with (
            patch("agents.bobur.route_message", new_callable=AsyncMock) as mock_route,
            patch("agents.bobur.dima.generate_chart_from_request", new_callable=AsyncMock) as mock_dima,
            patch("agents.bobur.AgentTrace") as mock_trace_cls,
        ):
            from agents import RouterResult
            mock_route.return_value = RouterResult(
                intent="chart_request", agent="dima", filters={}, confidence=0.9
            )
            mock_dima.return_value = [bad_config]

            # AgentTrace must work as an async context manager
            mock_trace = MagicMock()
            mock_trace.__aenter__ = AsyncMock(return_value=mock_trace)
            mock_trace.__aexit__ = AsyncMock(return_value=False)
            mock_trace.record_tokens = MagicMock()
            mock_trace.record_error = MagicMock()
            mock_trace_cls.return_value = mock_trace

            result = await handle_chat_message(
                sb, TENANT_ID, CRM_SOURCE, "show me a chart"
            )

        # Should not crash; reply must mention rejection
        assert isinstance(result, dict)
        reply = result.get("reply", "")
        # Either rejected (mention of can't/not allowed) or fallback message
        assert len(reply) > 0
        assert result.get("charts") == [] or not any(
            c.get("data_source") == "crm_unknown_table" for c in result.get("charts", [])
        )

    @pytest.mark.asyncio
    async def test_unknown_x_field_rejected(self):
        from agents import ChartConfig
        from agents.bobur import handle_chat_message

        # Valid data_source but invalid x_field
        bad_config = ChartConfig(
            chart_type="bar",
            title="Bad Field Chart",
            data_source="crm_deals",
            x_field="secret_internal_field_xyz",  # not in ALLOWED_FIELDS["crm_deals"]
            y_field="value",
            aggregation="sum",
        )

        sb = _mk_supabase({"dashboard_configs": []})

        with (
            patch("agents.bobur.route_message", new_callable=AsyncMock) as mock_route,
            patch("agents.bobur.dima.generate_chart_from_request", new_callable=AsyncMock) as mock_dima,
            patch("agents.bobur.AgentTrace") as mock_trace_cls,
        ):
            from agents import RouterResult
            mock_route.return_value = RouterResult(
                intent="chart_request", agent="dima", filters={}, confidence=0.9
            )
            mock_dima.return_value = [bad_config]

            mock_trace = MagicMock()
            mock_trace.__aenter__ = AsyncMock(return_value=mock_trace)
            mock_trace.__aexit__ = AsyncMock(return_value=False)
            mock_trace.record_tokens = MagicMock()
            mock_trace.record_error = MagicMock()
            mock_trace_cls.return_value = mock_trace

            result = await handle_chat_message(
                sb, TENANT_ID, CRM_SOURCE, "show me a secret field breakdown"
            )

        assert isinstance(result, dict)
        # No chart with the invalid field should appear
        for chart in result.get("charts", []):
            assert chart.get("x_field") != "secret_internal_field_xyz"


# ---------------------------------------------------------------------------
# 6. format_overview_evidence()
# ---------------------------------------------------------------------------

class TestFormatOverviewEvidence:
    """format_overview_evidence() should produce evidence bullets and trust score."""

    def test_produces_bullets_from_metrics(self):
        overview = {
            "metrics": {
                "pipeline_value": {"value": "$184K", "row_count": 42, "trust_score": 0.85},
                "win_rate": {"value": "22%", "row_count": 90, "trust_score": 0.78},
            },
            "alert_count": 2,
            "overall_trust": 0.80,
        }
        bullets, trust = format_overview_evidence(overview)
        assert len(bullets) >= 2
        assert trust == pytest.approx(0.80, abs=0.01)
        # Pipeline value bullet
        assert any("pipeline" in b.lower() or "Pipeline" in b for b in bullets)
        # Win rate bullet
        assert any("win" in b.lower() or "Win" in b for b in bullets)

    def test_alert_count_bullet_included(self):
        overview = {
            "metrics": {"pipeline_value": {"value": "$100K", "row_count": 10}},
            "alert_count": 3,
            "overall_trust": 0.7,
        }
        bullets, _ = format_overview_evidence(overview)
        assert any("alert" in b.lower() for b in bullets)

    def test_empty_metrics_returns_empty_bullets(self):
        overview = {"metrics": {}, "alert_count": 0, "overall_trust": 0.0}
        bullets, trust = format_overview_evidence(overview)
        assert bullets == []
        assert trust == 0.0

    def test_none_metric_value_skipped(self):
        overview = {
            "metrics": {"pipeline_value": {"value": None, "row_count": 0}},
            "alert_count": 0,
            "overall_trust": 0.5,
        }
        bullets, _ = format_overview_evidence(overview)
        assert not any("Pipeline" in b or "pipeline" in b for b in bullets)


# ---------------------------------------------------------------------------
# 7. format_alerts_evidence()
# ---------------------------------------------------------------------------

class TestFormatAlertsEvidence:
    """format_alerts_evidence() should produce evidence bullets from alert list."""

    def test_empty_alerts_returns_healthy_bullet(self):
        bullets, trust = format_alerts_evidence([])
        assert trust == 1.0
        assert len(bullets) == 1
        assert "healthy" in bullets[0].lower() or "no active" in bullets[0].lower()

    def test_critical_alert_appears_in_bullets(self):
        alerts = [
            {
                "severity": "critical",
                "alert_type": "conversion_drop",
                "summary": "Win rate dropped",
                "evidence_json": {
                    "record_counts": {"current_total": 50, "current_won": 9},
                    "confidence": 0.85,
                },
            }
        ]
        bullets, trust = format_alerts_evidence(alerts)
        assert any("critical" in b.lower() or "conversion" in b.lower() for b in bullets)
        assert trust == pytest.approx(0.85, abs=0.01)

    def test_warning_alert_appears_in_bullets(self):
        alerts = [
            {
                "severity": "warning",
                "alert_type": "pipeline_stall",
                "evidence_json": {"record_counts": {"stalled": 5}, "confidence": 0.72},
            }
        ]
        bullets, trust = format_alerts_evidence(alerts)
        assert any("warning" in b.lower() or "stall" in b.lower() for b in bullets)

    def test_multiple_alerts_grouped_by_severity(self):
        alerts = [
            {"severity": "critical", "alert_type": "conversion_drop",
             "evidence_json": {"record_counts": {}, "confidence": 0.9}},
            {"severity": "warning", "alert_type": "pipeline_stall",
             "evidence_json": {"record_counts": {}, "confidence": 0.7}},
        ]
        bullets, _ = format_alerts_evidence(alerts)
        assert any("critical" in b.lower() for b in bullets)
        assert any("warning" in b.lower() for b in bullets)


# ---------------------------------------------------------------------------
# 8. _append_evidence_block()
# ---------------------------------------------------------------------------

class TestAppendEvidenceBlock:
    """Evidence block must always be appended, regardless of reply content."""

    def test_appends_timeframe(self):
        reply = "Here is your analysis."
        bullets = ["• Pipeline: $100K", "• Win rate: 22%"]
        result = _append_evidence_block(reply, "last 30 days", bullets, 0.85)
        assert "last 30 days" in result

    def test_appends_bullet_points(self):
        reply = "Summary text."
        bullets = ["• Open deals: 42", "• Stalled: 14"]
        result = _append_evidence_block(reply, "last 30 days", bullets, 0.75)
        assert "• Open deals: 42" in result
        assert "• Stalled: 14" in result

    def test_appends_confidence_label(self):
        reply = "Pipeline looks good."
        bullets = ["• Pipeline: $200K"]
        result = _append_evidence_block(reply, "last 7 days", bullets, 0.90)
        assert "confidence" in result.lower()

    def test_no_bullets_returns_original(self):
        reply = "No data available."
        result = _append_evidence_block(reply, "last 30 days", [], 0.0)
        assert result == reply

    def test_caps_at_three_bullets(self):
        reply = "Text."
        bullets = [f"• item {i}" for i in range(10)]
        result = _append_evidence_block(reply, "last 30 days", bullets, 0.7)
        # Only first 3 bullets should appear
        assert result.count("• item") == 3

    def test_original_reply_preserved(self):
        reply = "Your pipeline is healthy."
        bullets = ["• Open deals: 10"]
        result = _append_evidence_block(reply, "last 30 days", bullets, 0.8)
        assert reply in result


# ---------------------------------------------------------------------------
# 9. confidence_label()
# ---------------------------------------------------------------------------

class TestConfidenceLabel:
    def test_high_confidence(self):
        label = confidence_label(0.90)
        assert "high" in label

    def test_moderate_confidence(self):
        label = confidence_label(0.60)
        assert "moderate" in label

    def test_low_confidence(self):
        label = confidence_label(0.30)
        assert "low" in label

    def test_zero_confidence(self):
        label = confidence_label(0.0)
        assert "unknown" in label


# ---------------------------------------------------------------------------
# 10. recommend_actions() — evidence-cited, no generic advice
# ---------------------------------------------------------------------------

class TestRecommendActions:
    @pytest.mark.asyncio
    async def test_returns_evidence_bullets_from_alert(self):
        alert = {
            "id": "alert-001",
            "tenant_id": TENANT_ID,
            "alert_type": "conversion_drop",
            "severity": "critical",
            "summary": "Win rate dropped 12pp",
            "evidence_json": {
                "record_counts": {"current_total": 50, "current_won": 9, "previous_won": 15},
                "baseline_period": "Previous 30 days",
                "confidence": 0.88,
            },
            "recommended_actions_json": [
                "Review lost deals in the period",
                "Check for stage mapping changes",
            ],
        }
        sb = _mk_supabase({"revenue_alerts": [alert]})
        result = await recommend_actions(sb, TENANT_ID, CRM_SOURCE, "alert-001")

        assert result["error"] is None
        assert len(result["actions"]) == 2
        assert "Review lost deals" in result["actions"][0]
        # Evidence bullets must cite real counts
        bullets = result["evidence_bullets"]
        assert len(bullets) >= 1
        assert any("current total" in b.lower() or "won" in b.lower() or "baseline" in b.lower()
                   for b in bullets)

    @pytest.mark.asyncio
    async def test_missing_alert_returns_error(self):
        sb = _mk_supabase({"revenue_alerts": []})
        result = await recommend_actions(sb, TENANT_ID, CRM_SOURCE, "nonexistent-id")
        assert result["error"] is not None
        assert result["actions"] == []
        assert result["evidence_bullets"] == []

    @pytest.mark.asyncio
    async def test_alert_type_and_severity_included(self):
        alert = {
            "id": "alert-002",
            "tenant_id": TENANT_ID,
            "alert_type": "pipeline_stall",
            "severity": "warning",
            "evidence_json": {"record_counts": {"stalled": 8}, "confidence": 0.72},
            "recommended_actions_json": ["Follow up on stalled deals"],
        }
        sb = _mk_supabase({"revenue_alerts": [alert]})
        result = await recommend_actions(sb, TENANT_ID, CRM_SOURCE, "alert-002")

        assert result["alert_type"] == "pipeline_stall"
        assert result["severity"] == "warning"
