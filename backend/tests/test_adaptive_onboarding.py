"""
Phase 3 Tests — Adaptive Onboarding
====================================
Tests for SchemaProfile-based goals, fallback to _REVENUE_GOALS,
widget generation from tenant_metrics, and fallback to goal templates.
"""
import pytest
import sys
import os

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestEnrichSuggestedGoals:
    """Test _enrich_suggested_goals builds frontend-format goals from SchemaProfile."""

    def _get_fn(self):
        from server import _enrich_suggested_goals
        return _enrich_suggested_goals

    def _make_schema(self, suggested_goals=None, business_type="sales"):
        from agents import SchemaProfile
        return SchemaProfile(
            tenant_id="t1",
            crm_source="bitrix24",
            business_type=business_type,
            suggested_goals=suggested_goals or [],
        )

    def _catalog_trust(self, available_keys=None):
        """Build a minimal catalog_trust list."""
        available_keys = available_keys or [
            "pipeline_value", "new_deals", "win_rate", "avg_deal_size",
            "sales_cycle_days", "stage_conversion",
        ]
        return [
            {"key": k, "available": k in available_keys, "data_trust_score": 0.8}
            for k in [
                "pipeline_value", "new_deals", "win_rate", "avg_deal_size",
                "sales_cycle_days", "stage_conversion", "deal_velocity",
                "forecast_hygiene", "rep_activity_count", "activity_to_deal_ratio",
                "lead_to_deal_rate", "pipeline_stall_risk",
            ]
        ]

    def test_with_schema_goals(self):
        fn = self._get_fn()
        schema = self._make_schema(suggested_goals=[
            {"id": "pipeline_health", "label": "Pipeline Health", "reason": "Strong pipeline data"},
        ])
        catalog = self._catalog_trust()
        goals = fn(schema, catalog, {})
        assert len(goals) == 1
        assert goals[0]["id"] == "pipeline_health"
        assert goals[0]["name"] == "Pipeline Health"
        assert goals[0]["available"] is True
        assert goals[0]["trust_score"] > 0

    def test_fallback_to_revenue_goals_when_empty(self):
        fn = self._get_fn()
        schema = self._make_schema(suggested_goals=[])
        catalog = self._catalog_trust()
        goals = fn(schema, catalog, {})
        # Should fall back to _REVENUE_GOALS (5 goals)
        assert len(goals) == 5
        ids = [g["id"] for g in goals]
        assert "pipeline_health" in ids
        assert "forecast_accuracy" in ids

    def test_fallback_when_schema_is_none(self):
        fn = self._get_fn()
        catalog = self._catalog_trust()
        goals = fn(None, catalog, {})
        assert len(goals) == 5

    def test_unknown_goal_id_passthrough(self):
        fn = self._get_fn()
        schema = self._make_schema(suggested_goals=[
            {"id": "enrollment_tracking", "label": "Enrollment Tracking", "reason": "Education CRM"},
        ])
        catalog = self._catalog_trust()
        goals = fn(schema, catalog, {})
        assert len(goals) == 1
        assert goals[0]["id"] == "enrollment_tracking"
        assert goals[0]["name"] == "Enrollment Tracking"
        assert goals[0]["available"] is True  # Unknown goals default to available

    def test_trust_warning_for_low_trust(self):
        fn = self._get_fn()
        schema = self._make_schema(suggested_goals=[
            {"id": "pipeline_health", "label": "Pipeline Health", "reason": "Test"},
        ])
        # All metrics low trust
        catalog = [
            {"key": k, "available": True, "data_trust_score": 0.3}
            for k in ["pipeline_value", "pipeline_stall_risk", "stage_conversion", "new_deals"]
        ]
        goals = fn(schema, catalog, {})
        assert goals[0]["trust_warning"] is not None
        assert "low" in goals[0]["trust_warning"].lower()


class TestGenerateWidgetsFromMetrics:
    """Test _generate_widgets_from_metrics builds widgets from tenant_metrics rows."""

    def _get_fn(self):
        from server import _generate_widgets_from_metrics
        return _generate_widgets_from_metrics

    def test_generates_kpi_for_currency(self):
        fn = self._get_fn()
        metrics = [
            {
                "metric_key": "pipeline_value",
                "title": "Pipeline Value",
                "description": "Total open pipeline",
                "display_format": "currency",
                "recipe": {"source_table": "crm_deals", "field": "value", "aggregation": "sum"},
            },
        ]
        widgets = fn(metrics, 30, "bitrix24")
        assert len(widgets) == 1
        assert widgets[0]["chart_type"] == "kpi"
        assert widgets[0]["title"] == "Pipeline Value"
        assert widgets[0]["source"] == "metrics"

    def test_generates_kpi_for_percentage(self):
        fn = self._get_fn()
        metrics = [
            {
                "metric_key": "win_rate",
                "title": "Win Rate",
                "display_format": "percentage",
                "recipe": {},
            },
        ]
        widgets = fn(metrics, 30, "bitrix24")
        assert len(widgets) == 1
        assert widgets[0]["chart_type"] == "kpi"

    def test_deduplicates_by_title(self):
        fn = self._get_fn()
        metrics = [
            {"metric_key": "m1", "title": "Same Title", "display_format": "number", "recipe": {}},
            {"metric_key": "m2", "title": "Same Title", "display_format": "number", "recipe": {}},
        ]
        widgets = fn(metrics, 30, "bitrix24")
        assert len(widgets) == 1

    def test_empty_metrics_returns_empty(self):
        fn = self._get_fn()
        widgets = fn([], 30, "bitrix24")
        assert widgets == []

    def test_positions_are_sequential(self):
        fn = self._get_fn()
        metrics = [
            {"metric_key": f"m{i}", "title": f"Metric {i}", "display_format": "number", "recipe": {}}
            for i in range(4)
        ]
        widgets = fn(metrics, 30, "bitrix24")
        positions = [w["position"] for w in widgets]
        assert positions == [0, 1, 2, 3]


class TestGenerateGoalWidgets:
    """Test legacy _generate_goal_widgets still works (backward compat)."""

    def _get_fn(self):
        from server import _generate_goal_widgets
        return _generate_goal_widgets

    def test_pipeline_health_generates_widgets(self):
        fn = self._get_fn()
        widgets = fn(["pipeline_health"], 30, "bitrix24")
        assert len(widgets) > 0
        titles = [w["title"] for w in widgets]
        assert "Pipeline Value" in titles

    def test_unknown_goal_generates_nothing(self):
        fn = self._get_fn()
        widgets = fn(["nonexistent_goal"], 30, "bitrix24")
        assert widgets == []

    def test_deduplicates_across_goals(self):
        fn = self._get_fn()
        widgets = fn(["pipeline_health", "conversion_improvement"], 30, "bitrix24")
        titles = [w["title"] for w in widgets]
        # "Stage Conversion Funnel" appears in both goals but should be deduplicated
        assert titles.count("Stage Conversion Funnel") == 1
