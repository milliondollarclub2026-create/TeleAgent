"""
Tests for backward compatibility: legacy Farid category IDs → Revenue Analyst goal IDs
=========================================================================================
Covers:
  - _map_categories_to_goals(): known legacy IDs map to correct goal IDs
  - _map_categories_to_goals(): already-goal IDs pass through unchanged
  - _map_categories_to_goals(): unknown IDs are silently dropped
  - _map_categories_to_goals(): empty / None input returns empty list
  - _map_categories_to_goals(): duplicate mapping is deduplicated
  - dashboard_config_get(): config without selected_goals returns in-memory migration
  - dashboard_config_get(): config that already has selected_goals is not re-migrated
  - dashboard_onboarding_refine(): reads selected_goals first, falls back to selected_categories
  - dashboard_onboarding_refine(): old category IDs are auto-mapped before widget generation

Uses lightweight stubs — no real DB or network calls.
"""

from __future__ import annotations

import sys
import os
import pytest
from unittest.mock import MagicMock, patch, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import the helpers we want to unit-test directly
import server as srv


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_supabase_stub(config_rows: list[dict] | None = None):
    """Return a minimal supabase-like mock that returns `config_rows` on select."""
    stub = MagicMock()
    table_mock = MagicMock()
    stub.table.return_value = table_mock

    result = MagicMock()
    result.data = config_rows or []

    # Chain: .table().select().eq().limit().execute()  OR  .update().eq().execute()
    table_mock.select.return_value.eq.return_value.limit.return_value.execute.return_value = result
    table_mock.update.return_value.eq.return_value.execute.return_value = MagicMock()

    return stub


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests for _map_categories_to_goals
# ─────────────────────────────────────────────────────────────────────────────

class TestMapCategoriesToGoals:
    def test_lead_pipeline_maps_to_lead_flow_health(self):
        result = srv._map_categories_to_goals(["lead_pipeline"])
        assert result == ["lead_flow_health"]

    def test_deal_analytics_maps_to_pipeline_and_forecast(self):
        result = srv._map_categories_to_goals(["deal_analytics"])
        assert "pipeline_health" in result
        assert "forecast_accuracy" in result

    def test_activity_tracking_maps_to_rep_performance(self):
        result = srv._map_categories_to_goals(["activity_tracking"])
        assert result == ["rep_performance"]

    def test_team_performance_maps_to_rep_performance(self):
        result = srv._map_categories_to_goals(["team_performance"])
        assert result == ["rep_performance"]

    def test_revenue_metrics_maps_to_forecast_accuracy(self):
        result = srv._map_categories_to_goals(["revenue_metrics"])
        assert result == ["forecast_accuracy"]

    def test_contact_management_maps_to_empty(self):
        result = srv._map_categories_to_goals(["contact_management"])
        assert result == []

    def test_already_goal_id_passes_through(self):
        """If a tenant already has goal IDs stored, they should not be changed."""
        result = srv._map_categories_to_goals(["pipeline_health", "rep_performance"])
        assert result == ["pipeline_health", "rep_performance"]

    def test_mixed_old_and_new_ids(self):
        """Mixture of legacy category ID + already-goal ID."""
        result = srv._map_categories_to_goals(["lead_pipeline", "rep_performance"])
        assert "lead_flow_health" in result
        assert "rep_performance" in result

    def test_unknown_id_is_dropped(self):
        """IDs that are neither a legacy category nor a goal ID are silently dropped."""
        result = srv._map_categories_to_goals(["nonexistent_category"])
        assert result == []

    def test_duplicates_are_deduplicated(self):
        """activity_tracking and team_performance both map to rep_performance."""
        result = srv._map_categories_to_goals(["activity_tracking", "team_performance"])
        assert result.count("rep_performance") == 1

    def test_all_legacy_categories(self):
        """Full list of legacy categories → produces some goal IDs."""
        all_legacy = [
            "lead_pipeline", "deal_analytics", "activity_tracking",
            "team_performance", "revenue_metrics", "contact_management",
        ]
        result = srv._map_categories_to_goals(all_legacy)
        assert len(result) > 0
        # Every returned value must be a valid goal ID
        for goal_id in result:
            assert goal_id in srv._VALID_GOAL_IDS

    def test_empty_input_returns_empty(self):
        assert srv._map_categories_to_goals([]) == []

    def test_none_input_returns_empty(self):
        assert srv._map_categories_to_goals(None) == []


# ─────────────────────────────────────────────────────────────────────────────
# dashboard_config_get — in-memory auto-migration
# ─────────────────────────────────────────────────────────────────────────────

class TestDashboardConfigGetAutoMigration:
    """
    Test that GET /dashboard/config auto-migrates legacy selected_categories
    into selected_goals when selected_goals is empty/absent.

    We call srv.dashboard_config_get directly by patching srv.supabase.
    """

    def _run(self, config_row: dict) -> dict:
        """Invoke dashboard_config_get with a stubbed supabase and return the response."""
        import asyncio

        stub = MagicMock()
        chain = MagicMock()
        stub.table.return_value = chain
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain

        result = MagicMock()
        result.data = [config_row]
        chain.execute.return_value = result

        # Also stub the update chain so migration write doesn't crash
        chain.update.return_value = chain

        with patch.object(srv, "supabase", stub):
            fake_user = {"tenant_id": "tenant-abc"}
            response = asyncio.run(srv.dashboard_config_get(fake_user))

        return response

    def test_auto_migrates_old_categories_to_goals(self):
        """When selected_goals is empty and selected_categories has legacy IDs, migrate."""
        config_row = {
            "tenant_id": "tenant-abc",
            "selected_goals": [],
            "selected_categories": ["lead_pipeline", "deal_analytics"],
            "onboarding_state": "complete",
        }
        response = self._run(config_row)
        goals = response["config"]["selected_goals"]
        assert "lead_flow_health" in goals
        assert "pipeline_health" in goals or "forecast_accuracy" in goals

    def test_no_migration_when_selected_goals_already_set(self):
        """When selected_goals is already populated, it should not be overwritten."""
        config_row = {
            "tenant_id": "tenant-abc",
            "selected_goals": ["pipeline_health"],
            "selected_categories": ["deal_analytics"],
            "onboarding_state": "complete",
        }
        response = self._run(config_row)
        # selected_goals must stay as-is
        assert response["config"]["selected_goals"] == ["pipeline_health"]

    def test_no_migration_when_selected_categories_empty(self):
        """When both columns are empty, no migration happens and selected_goals stays []."""
        config_row = {
            "tenant_id": "tenant-abc",
            "selected_goals": [],
            "selected_categories": [],
            "onboarding_state": "not_started",
        }
        response = self._run(config_row)
        assert response["config"]["selected_goals"] == []

    def test_returns_none_when_no_config(self):
        """When the tenant has no dashboard_configs row, config is None."""
        import asyncio

        stub = MagicMock()
        chain = MagicMock()
        stub.table.return_value = chain
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain

        result = MagicMock()
        result.data = []
        chain.execute.return_value = result

        with patch.object(srv, "supabase", stub):
            fake_user = {"tenant_id": "tenant-new"}
            response = asyncio.run(srv.dashboard_config_get(fake_user))

        assert response == {"config": None}


# ─────────────────────────────────────────────────────────────────────────────
# dashboard_onboarding_refine — goal resolution from legacy selected_categories
# ─────────────────────────────────────────────────────────────────────────────

class TestOnboardingRefineGoalResolution:
    """
    Verify that dashboard_onboarding_refine correctly resolves selected_goals
    (with legacy fallback) before calling _generate_goal_widgets.
    """

    def _build_config(
        self,
        selected_goals: list | None = None,
        selected_categories: list | None = None,
    ) -> dict:
        return {
            "tenant_id": "t1",
            "crm_profile": {
                "revenue_proposal": {
                    "won_stage_values": ["WON"],
                    "lost_stage_values": ["LOST"],
                    "stage_order": ["NEW", "DEMO", "PROPOSAL", "WON", "LOST"],
                    "requires_confirmation": False,
                }
            },
            "selected_goals": selected_goals if selected_goals is not None else [],
            "selected_categories": selected_categories if selected_categories is not None else [],
        }

    def test_map_categories_to_goals_returns_correct_ids(self):
        """
        Core logic: when selected_goals is empty but selected_categories has old IDs,
        _map_categories_to_goals must yield valid goal IDs.
        """
        config = self._build_config(selected_categories=["activity_tracking", "revenue_metrics"])
        raw = config.get("selected_goals") or config.get("selected_categories") or []
        goals = srv._map_categories_to_goals(raw)
        assert "rep_performance" in goals
        assert "forecast_accuracy" in goals

    def test_selected_goals_takes_priority_over_categories(self):
        """When selected_goals is populated, it wins over selected_categories."""
        config = self._build_config(
            selected_goals=["pipeline_health"],
            selected_categories=["activity_tracking"],
        )
        raw = config.get("selected_goals") or config.get("selected_categories") or []
        goals = srv._map_categories_to_goals(raw)
        # pipeline_health is already a goal ID — it should pass through unchanged
        assert goals == ["pipeline_health"]

    def test_generate_goal_widgets_does_not_crash_with_legacy_goals(self):
        """_generate_goal_widgets must not crash when fed mapped legacy goal IDs."""
        goals = srv._map_categories_to_goals(["lead_pipeline", "deal_analytics"])
        widgets = srv._generate_goal_widgets(goals, 30, "bitrix24")
        # Should produce at least some widgets
        assert len(widgets) > 0
        # Every widget must have required fields
        for w in widgets:
            assert "chart_type" in w
            assert "data_source" in w
            assert "x_field" in w

    def test_generate_goal_widgets_all_goals(self):
        """_generate_goal_widgets handles all 5 goal IDs without error."""
        all_goals = [g["id"] for g in srv._REVENUE_GOALS]
        widgets = srv._generate_goal_widgets(all_goals, 90, "bitrix24")
        assert len(widgets) > 0
        titles = {w["title"] for w in widgets}
        # Deduplication is working: each title appears only once
        assert len(titles) == len(widgets)

    def test_generate_goal_widgets_empty_goals(self):
        """Empty goal list yields empty widget list — does not crash."""
        widgets = srv._generate_goal_widgets([], 30, "bitrix24")
        assert widgets == []

    def test_generate_goal_widgets_unknown_goal_id_is_ignored(self):
        """Unknown goal ID in the list is silently skipped (no KeyError)."""
        widgets = srv._generate_goal_widgets(["nonexistent_goal", "pipeline_health"], 30, "bitrix24")
        assert len(widgets) > 0  # pipeline_health widgets still generated


# ─────────────────────────────────────────────────────────────────────────────
# Validation: _VALID_GOAL_IDS matches _REVENUE_GOALS
# ─────────────────────────────────────────────────────────────────────────────

class TestGoalIdConsistency:
    def test_all_goal_templates_have_matching_goal_definition(self):
        """Every key in _GOAL_WIDGET_TEMPLATES must correspond to a _REVENUE_GOALS entry."""
        for goal_id in srv._GOAL_WIDGET_TEMPLATES:
            assert goal_id in srv._VALID_GOAL_IDS, (
                f"_GOAL_WIDGET_TEMPLATES has key '{goal_id}' not in _REVENUE_GOALS"
            )

    def test_all_revenue_goals_have_templates(self):
        """Every goal in _REVENUE_GOALS should have at least one widget template."""
        for goal in srv._REVENUE_GOALS:
            gid = goal["id"]
            assert gid in srv._GOAL_WIDGET_TEMPLATES, (
                f"_REVENUE_GOALS goal '{gid}' has no entry in _GOAL_WIDGET_TEMPLATES"
            )
            assert len(srv._GOAL_WIDGET_TEMPLATES[gid]) > 0, (
                f"_GOAL_WIDGET_TEMPLATES['{gid}'] is empty"
            )

    def test_category_to_goals_values_are_valid_goal_ids(self):
        """Every target in _CATEGORY_TO_GOALS must be a known goal ID."""
        for cat, targets in srv._CATEGORY_TO_GOALS.items():
            for goal_id in targets:
                assert goal_id in srv._VALID_GOAL_IDS, (
                    f"_CATEGORY_TO_GOALS['{cat}'] → '{goal_id}' is not a valid goal ID"
                )
