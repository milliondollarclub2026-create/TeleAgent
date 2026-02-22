"""
Smoke baseline tests — Phase 0.
Verifies all agent/adapter modules import cleanly and key classes/functions exist.
No Supabase or API calls needed.
"""

import pytest


# ── Test 1: Import all agent modules ─────────────────────────────────────

class TestAgentImports:
    def test_import_bobur(self):
        from agents import bobur
        assert hasattr(bobur, "handle_chat_message")
        assert hasattr(bobur, "route_message")

    def test_import_farid(self):
        from agents import farid
        # farid is now a stub — just verify it imports
        assert farid is not None

    def test_import_dima(self):
        from agents import dima
        assert hasattr(dima, "generate_chart_from_request")

    def test_import_anvar(self):
        from agents import anvar
        assert hasattr(anvar, "execute_chart_query")
        assert hasattr(anvar, "ALLOWED_FIELDS")
        assert hasattr(anvar, "DEFAULT_ALLOWED_FIELDS")
        assert hasattr(anvar, "load_allowed_fields")

    def test_import_field_profiler(self):
        from agents import field_profiler
        assert hasattr(field_profiler, "profile_entity_fields")
        assert hasattr(field_profiler, "upsert_field_profiles")

    def test_import_kpi_resolver(self):
        from agents import kpi_resolver
        assert hasattr(kpi_resolver, "resolve_kpi")

    def test_import_bobur_tools(self):
        from agents.bobur_tools import (
            get_revenue_overview,
            list_revenue_alerts,
            query_metric,
            recommend_actions,
            format_overview_evidence,
            format_alerts_evidence,
            format_metric_evidence,
            confidence_label,
            get_analytics_overview,
            query_dynamic_metric,
        )
        # Phase 2 functions exist
        assert get_analytics_overview is not None
        assert query_dynamic_metric is not None

    def test_import_schema_context(self):
        from agents.schema_context import SchemaContext
        assert SchemaContext is not None


# ── Test 2: Import CRM adapter modules ──────────────────────────────────

class TestAdapterImports:
    def test_import_base(self):
        from crm_adapters.base import CRMAdapter
        assert CRMAdapter is not None

    def test_import_bitrix_adapter(self):
        from crm_adapters.bitrix_adapter import BitrixAdapter
        assert BitrixAdapter is not None


# ── Test 3: Import revenue modules ──────────────────────────────────────

class TestRevenueImports:
    def test_import_metric_catalog(self):
        from revenue.metric_catalog import METRIC_CATALOG
        assert isinstance(METRIC_CATALOG, dict)
        assert len(METRIC_CATALOG) > 0

    def test_import_compute(self):
        from revenue import compute
        assert hasattr(compute, "compute_snapshot")

    def test_import_dynamic_compute(self):
        from revenue.dynamic_compute import compute_metric, compute_tenant_snapshot, format_metric_card
        assert compute_metric is not None
        assert compute_tenant_snapshot is not None

    def test_import_metric_generator(self):
        from revenue.metric_generator import generate_metrics, generate_alert_rules, generate_and_persist
        assert generate_metrics is not None
        assert generate_alert_rules is not None

    def test_import_alerts_engine(self):
        from revenue.alerts import evaluate_alert_rules
        assert evaluate_alert_rules is not None


# ── Test 4: Import sync_engine ──────────────────────────────────────────

class TestSyncEngineImport:
    def test_import_sync_engine(self):
        import sync_engine
        assert sync_engine is not None


# ── Test 5: Verify key classes exist ────────────────────────────────────

class TestKeyClasses:
    def test_router_result(self):
        from agents import RouterResult
        r = RouterResult(intent="test", agent="bobur", filters={}, confidence=0.9)
        assert r.intent == "test"

    def test_crm_profile(self):
        from agents import CRMProfile
        p = CRMProfile(crm_source="bitrix24", entities={}, categories=[], data_quality_score=50)
        assert p.crm_source == "bitrix24"

    def test_chart_config(self):
        from agents import ChartConfig
        c = ChartConfig(
            chart_type="bar",
            title="Test",
            data_source="crm_deals",
            x_field="stage",
        )
        assert c.chart_type == "bar"

    def test_schema_profile(self):
        from agents import SchemaProfile, EntityProfile, FieldProfile
        fp = FieldProfile(field_name="stage", field_type="text")
        ep = EntityProfile(entity="deals", fields=[fp])
        sp = SchemaProfile(tenant_id="t1", crm_source="bitrix24", entities=[ep])
        assert sp.business_type == "unknown"
        assert len(sp.entities) == 1

    def test_dynamic_metric_result(self):
        from agents import DynamicMetricResult, DynamicMetricEvidence
        evidence = DynamicMetricEvidence(row_count=50, timeframe="Last 30 days")
        mr = DynamicMetricResult(
            metric_key="total_deals", title="Total Deals",
            value=42, evidence=evidence, confidence=0.9,
        )
        assert mr.value == 42
        assert mr.evidence.row_count == 50

    def test_alert_result(self):
        from agents import AlertResult
        ar = AlertResult(
            alert_type="trend_decline", severity="warning",
            title="Test", summary="Test alert",
        )
        assert ar.alert_type == "trend_decline"

    def test_recommendation(self):
        from agents import Recommendation
        rec = Recommendation(
            severity="info", title="Test",
            finding="All clear", action="Continue",
        )
        assert rec.severity == "info"


# ── Test 6: Won detection in _normalize_deal ────────────────────────────

class TestWonDetection:
    """Verify BitrixAdapter._normalize_deal correctly detects won/lost stages."""

    def _make_adapter(self):
        """Create a BitrixAdapter with a mock client."""

        class MockClient:
            pass

        from crm_adapters.bitrix_adapter import BitrixAdapter
        return BitrixAdapter(MockClient())

    def test_won_classic(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "1", "STAGE_ID": "WON", "OPPORTUNITY": "100"})
        assert result["won"] is True

    def test_won_pipeline_c1(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "2", "STAGE_ID": "C1:WON", "OPPORTUNITY": "200"})
        assert result["won"] is True

    def test_won_pipeline_c2(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "3", "STAGE_ID": "C2:WON", "OPPORTUNITY": "300"})
        assert result["won"] is True

    def test_not_won_executing(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "4", "STAGE_ID": "EXECUTING", "OPPORTUNITY": "400"})
        assert result["won"] is False

    def test_not_won_new(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "5", "STAGE_ID": "C1:NEW", "OPPORTUNITY": "500"})
        assert result["won"] is False

    def test_won_none_when_no_stage(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "6", "OPPORTUNITY": "600"})
        assert result["won"] is None

    def test_won_empty_stage(self):
        adapter = self._make_adapter()
        result = adapter._normalize_deal({"ID": "7", "STAGE_ID": "", "OPPORTUNITY": "700"})
        assert result["won"] is None
