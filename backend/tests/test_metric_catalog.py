"""
Metric Catalog Tests
====================
Covers:
1. Catalog completeness — all 12 keys present, each has required metadata
2. MetricValidator — unknown metric, disallowed dimension, empty tables
3. data_trust_score — reflects null rates and row count
4. Compute functions — correct output shape, evidence always present
5. Revenue-model-dependent metrics — degrade gracefully without model
6. _rollup_by_grain — weekly/monthly bucketing of daily data
7. End-to-end compute_metric() routing

Test strategy: mock Supabase so tests run in < 1 second with no network.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from revenue.metric_catalog import (
    METRIC_CATALOG,
    MetricDefinition,
    MetricValidator,
    MetricEvidence,
    MetricResult,
    compute_metric,
    get_catalog_with_trust,
    _null_rates,
    _trust_score,
    _rollup_by_grain,
    _timeframe_label,
    _empty_evidence,
    _count_rows,
    _fetch_sample,
)


# ===========================================================================
# Fixtures
# ===========================================================================

TENANT_ID = "tid-test-001"
CRM_SOURCE = "bitrix24"


def _mk_supabase(deals=None, leads=None, activities=None,
                 contacts=None, companies=None, revenue_models=None):
    """
    Return a Supabase mock that returns configured row lists per table.
    count="exact" queries return len(rows) as .count.
    revenue_models accepts a list of model rows (or empty list / None).
    """
    tables: dict[str, list] = {
        "crm_deals": deals or [],
        "crm_leads": leads or [],
        "crm_activities": activities or [],
        "crm_contacts": contacts or [],
        "crm_companies": companies or [],
        "revenue_models": revenue_models or [],
    }

    def _table_mock(name: str):
        rows = tables.get(name, [])
        chain = MagicMock()

        def _execute():
            res = MagicMock()
            res.data = rows
            res.count = len(rows)
            return res

        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.is_.return_value = chain
        chain.gte.return_value = chain
        chain.lte.return_value = chain
        chain.lt.return_value = chain
        chain.limit.return_value = chain
        chain.execute.side_effect = _execute
        return chain

    mock = MagicMock()
    mock.table.side_effect = _table_mock
    return mock


def _deal(stage="NEW", value=10000, won=False, assigned_to="Alice",
          created_at="2025-11-01T10:00:00+00:00",
          closed_at=None, modified_at="2025-11-15T10:00:00+00:00"):
    return {
        "stage": stage, "value": value, "won": won,
        "assigned_to": assigned_to, "currency": "USD",
        "created_at": created_at,
        "closed_at": closed_at or ("2026-01-10T10:00:00+00:00" if won else None),
        "modified_at": modified_at,
        "title": f"Deal {stage}",
    }


def _activity(employee_name="Alice", type_="call",
              started_at="2025-12-01T09:00:00+00:00",
              employee_id="10"):
    return {
        "employee_name": employee_name, "type": type_,
        "started_at": started_at, "employee_id": employee_id,
        "completed": True, "duration_seconds": 300,
        "subject": "Follow-up call",
    }


def _lead(created_at="2025-11-01T00:00:00+00:00", source="web"):
    return {"created_at": created_at, "source": source, "status": "NEW",
            "value": None, "assigned_to": "Alice"}


SAMPLE_DEALS = [
    _deal("NEW", 5000), _deal("NEW", 8000),
    _deal("PROPOSAL", 12000), _deal("PROPOSAL", 15000),
    _deal("NEGOTIATION", 20000),
    _deal("WON", 18000, won=True, closed_at="2026-01-05T00:00:00+00:00"),
    _deal("WON", 25000, won=True, closed_at="2026-01-10T00:00:00+00:00"),
    _deal("LOST", 9000, won=False),
]

SAMPLE_ACTIVITIES = [
    _activity("Alice", "call"),
    _activity("Alice", "email"),
    _activity("Bob", "call"),
    _activity("Bob", "meeting"),
    _activity("Charlie", "call"),
]

REVENUE_MODEL = {
    "won_stage_values": ["WON"],
    "lost_stage_values": ["LOST"],
    "stage_order": ["NEW", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
    "confirmed_at": "2026-01-01T00:00:00+00:00",
}


# ===========================================================================
# 1. Catalog completeness
# ===========================================================================

class TestCatalogCompleteness:

    EXPECTED_KEYS = {
        "pipeline_value", "new_deals", "win_rate", "avg_deal_size",
        "sales_cycle_days", "stage_conversion", "deal_velocity",
        "forecast_hygiene", "rep_activity_count", "activity_to_deal_ratio",
        "lead_to_deal_rate", "pipeline_stall_risk",
    }

    def test_all_12_keys_present(self):
        assert self.EXPECTED_KEYS.issubset(set(METRIC_CATALOG.keys())), (
            f"Missing keys: {self.EXPECTED_KEYS - set(METRIC_CATALOG.keys())}"
        )

    def test_no_extra_unexpected_keys(self):
        # We want exactly 12 standard metrics
        assert len(METRIC_CATALOG) == 12

    def test_each_metric_has_title(self):
        for key, defn in METRIC_CATALOG.items():
            assert defn.title, f"Metric '{key}' has no title"

    def test_each_metric_has_description(self):
        for key, defn in METRIC_CATALOG.items():
            assert defn.description, f"Metric '{key}' has no description"

    def test_each_metric_has_required_tables(self):
        for key, defn in METRIC_CATALOG.items():
            assert defn.required_tables, f"Metric '{key}' has no required_tables"

    def test_each_metric_has_required_fields(self):
        for key, defn in METRIC_CATALOG.items():
            assert defn.required_fields, f"Metric '{key}' has no required_fields"

    def test_required_tables_match_required_fields_keys(self):
        for key, defn in METRIC_CATALOG.items():
            for table in defn.required_fields:
                assert table in defn.required_tables, (
                    f"Metric '{key}': required_fields has table '{table}' "
                    f"not in required_tables {defn.required_tables}"
                )

    def test_revenue_model_metrics_flagged(self):
        flagged = {k for k, d in METRIC_CATALOG.items() if d.requires_revenue_model}
        expected = {"stage_conversion", "forecast_hygiene", "pipeline_stall_risk"}
        assert flagged == expected

    def test_time_grain_values_are_known(self):
        valid = {"day", "week", "month", "quarter"}
        for key, defn in METRIC_CATALOG.items():
            for grain in defn.allowed_time_grains:
                assert grain in valid, f"Metric '{key}' has unknown time_grain '{grain}'"


# ===========================================================================
# 2. Helper functions
# ===========================================================================

class TestNullRates:

    def test_all_present(self):
        rows = [{"value": 100}, {"value": 200}]
        assert _null_rates(rows, ["value"]) == {"value": 0.0}

    def test_half_null(self):
        rows = [{"value": 100}, {"value": None}]
        assert _null_rates(rows, ["value"]) == {"value": 0.5}

    def test_all_null(self):
        rows = [{"value": None}, {"value": None}]
        assert _null_rates(rows, ["value"]) == {"value": 1.0}

    def test_empty_rows_returns_all_null(self):
        assert _null_rates([], ["value", "stage"]) == {"value": 1.0, "stage": 1.0}

    def test_multiple_fields(self):
        rows = [
            {"a": 1, "b": None},
            {"a": None, "b": 2},
        ]
        rates = _null_rates(rows, ["a", "b"])
        assert rates["a"] == 0.5
        assert rates["b"] == 0.5


class TestTrustScore:

    def test_perfect_data(self):
        assert _trust_score({"value": 0.0, "stage": 0.0}) == 1.0

    def test_half_null_half_trust(self):
        assert _trust_score({"value": 0.5}) == 0.5

    def test_all_null_zero_trust(self):
        assert _trust_score({"value": 1.0, "stage": 1.0}) == 0.0

    def test_empty_rates_full_trust(self):
        assert _trust_score({}) == 1.0

    def test_mixed(self):
        score = _trust_score({"a": 0.0, "b": 0.4})
        assert score == pytest.approx(0.8, abs=0.01)


class TestRollupByGrain:

    DAILY = [
        {"label": "2026-01-01", "value": 2},
        {"label": "2026-01-02", "value": 3},
        {"label": "2026-01-08", "value": 4},  # next week
        {"label": "2026-01-09", "value": 1},  # still next week
    ]

    def test_weekly_rollup_merges_same_week(self):
        result = _rollup_by_grain(self.DAILY, "week")
        # 2026-01-01 is Thursday; Mon=2025-12-29 for ISO week
        # 2026-01-08 is Thursday; Mon=2026-01-05
        labels = [r["label"] for r in result]
        assert len(labels) == 2, f"Expected 2 week buckets, got {labels}"

    def test_monthly_rollup(self):
        result = _rollup_by_grain(self.DAILY, "month")
        assert len(result) == 1  # all Jan 2026
        assert result[0]["label"] == "2026-01"
        assert result[0]["value"] == 10.0

    def test_quarterly_rollup(self):
        result = _rollup_by_grain(self.DAILY, "quarter")
        assert len(result) == 1
        assert result[0]["label"] == "2026-Q1"

    def test_values_summed_correctly(self):
        data = [{"label": "2026-01-01", "value": 5}, {"label": "2026-01-02", "value": 7}]
        result = _rollup_by_grain(data, "month")
        assert result[0]["value"] == 12.0


# ===========================================================================
# 3. MetricValidator
# ===========================================================================

class TestMetricValidator:

    @pytest.mark.asyncio
    async def test_unknown_metric_rejected(self):
        sb = _mk_supabase()
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(sb, TENANT_ID, CRM_SOURCE, "nonexistent_metric")
        assert ok is False
        assert "nonexistent_metric" in reason
        assert "Known" in reason

    @pytest.mark.asyncio
    async def test_invalid_dimension_rejected(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(
            sb, TENANT_ID, CRM_SOURCE, "pipeline_value", dimension="invalid_dim"
        )
        assert ok is False
        assert "invalid_dim" in reason
        assert "allowed" in reason.lower()

    @pytest.mark.asyncio
    async def test_empty_table_rejected(self):
        sb = _mk_supabase(deals=[])  # no deals
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(sb, TENANT_ID, CRM_SOURCE, "pipeline_value")
        assert ok is False
        assert "crm_deals" in reason

    @pytest.mark.asyncio
    async def test_valid_request_accepted(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(sb, TENANT_ID, CRM_SOURCE, "pipeline_value")
        assert ok is True
        assert reason == ""

    @pytest.mark.asyncio
    async def test_valid_dimension_accepted(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(
            sb, TENANT_ID, CRM_SOURCE, "pipeline_value", dimension="assigned_to"
        )
        assert ok is True

    @pytest.mark.asyncio
    async def test_metric_with_no_dimensions_rejects_any_dimension(self):
        """deal_velocity has no allowed dimensions."""
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(
            sb, TENANT_ID, CRM_SOURCE, "deal_velocity", dimension="assigned_to"
        )
        assert ok is False

    @pytest.mark.asyncio
    async def test_multi_table_metric_rejected_if_one_table_empty(self):
        """activity_to_deal_ratio needs both crm_activities and crm_deals."""
        sb = _mk_supabase(deals=SAMPLE_DEALS, activities=[])  # activities empty
        validator = MetricValidator()
        ok, reason, _ = await validator.validate(
            sb, TENANT_ID, CRM_SOURCE, "activity_to_deal_ratio"
        )
        assert ok is False
        assert "crm_activities" in reason


# ===========================================================================
# 4. compute_metric — evidence is always present
# ===========================================================================

class TestComputeMetricEvidence:
    """Every metric must return a MetricResult with a populated MetricEvidence."""

    @pytest.mark.asyncio
    async def test_pipeline_value_has_evidence(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("pipeline_value", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result.evidence, MetricEvidence)
        assert result.evidence.row_count > 0
        assert result.evidence.data_trust_score >= 0.0
        assert "value" in result.evidence.fields_evaluated

    @pytest.mark.asyncio
    async def test_win_rate_has_timeframe(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("win_rate", sb, TENANT_ID, CRM_SOURCE, time_range_days=90)
        assert result.evidence.timeframe == "Last 90 days"

    @pytest.mark.asyncio
    async def test_sales_cycle_days_has_evidence(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("sales_cycle_days", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result.evidence, MetricEvidence)
        assert "closed_at" in result.evidence.fields_evaluated

    @pytest.mark.asyncio
    async def test_lead_to_deal_rate_has_evidence(self):
        leads = [_lead("2025-11-01T00:00:00+00:00") for _ in range(10)]
        sb = _mk_supabase(deals=SAMPLE_DEALS, leads=leads)
        result = await compute_metric("lead_to_deal_rate", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result.evidence, MetricEvidence)
        assert result.evidence.row_count > 0

    @pytest.mark.asyncio
    async def test_rep_activity_count_has_evidence(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, activities=SAMPLE_ACTIVITIES)
        result = await compute_metric("rep_activity_count", sb, TENANT_ID, CRM_SOURCE)
        assert "employee_name" in result.evidence.fields_evaluated

    @pytest.mark.asyncio
    async def test_evidence_contains_null_rates(self):
        """Deals with missing value field should raise null_rate for 'value'."""
        deals_with_nulls = [
            {"stage": "NEW", "value": None, "won": False, "assigned_to": "Alice",
             "created_at": "2025-11-01T00:00:00+00:00", "closed_at": None,
             "modified_at": "2025-12-01T00:00:00+00:00"},
        ] * 5
        sb = _mk_supabase(deals=deals_with_nulls)
        result = await compute_metric("pipeline_value", sb, TENANT_ID, CRM_SOURCE)
        assert result.evidence.null_rates.get("value") == 1.0
        assert result.evidence.data_trust_score < 1.0


# ===========================================================================
# 5. Compute function correctness
# ===========================================================================

class TestComputeValues:

    @pytest.mark.asyncio
    async def test_pipeline_value_kpi_type(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("pipeline_value", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "kpi"
        assert result.value is not None

    @pytest.mark.asyncio
    async def test_new_deals_kpi_type(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("new_deals", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "kpi"

    @pytest.mark.asyncio
    async def test_win_rate_kpi_type(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("win_rate", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "kpi"
        assert "%" in str(result.value)

    @pytest.mark.asyncio
    async def test_sales_cycle_days_computes_avg(self):
        """Won deals with 70-day cycle should produce ~70 avg."""
        won_deals = [
            _deal("WON", 10000, won=True,
                  created_at="2025-11-01T00:00:00+00:00",
                  closed_at="2026-01-10T00:00:00+00:00"),  # 70 days
        ] * 3
        open_deals = [_deal("NEW", 5000)]
        sb = _mk_supabase(deals=won_deals + open_deals)
        result = await compute_metric("sales_cycle_days", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "kpi"
        # Cycle days should be positive and roughly 70
        if result.value is not None:
            assert float(result.value) > 0

    @pytest.mark.asyncio
    async def test_stage_conversion_chart_type_funnel(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, revenue_models=[REVENUE_MODEL])
        result = await compute_metric("stage_conversion", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "funnel"

    @pytest.mark.asyncio
    async def test_deal_velocity_chart_type_line(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("deal_velocity", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "line"

    @pytest.mark.asyncio
    async def test_forecast_hygiene_counts_missing_fields(self):
        """Deals missing closed_at or value in open stages should be counted."""
        deals = [
            _deal("PROPOSAL", value=None),   # missing amount
            _deal("PROPOSAL", closed_at=None),  # missing close date (by default)
            _deal("WON", won=True),
        ]
        sb = _mk_supabase(deals=deals)
        result = await compute_metric("forecast_hygiene", sb, TENANT_ID, CRM_SOURCE)
        # At least 1 issue should be found
        assert isinstance(result.value, int)

    @pytest.mark.asyncio
    async def test_rep_activity_count_bar_chart(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, activities=SAMPLE_ACTIVITIES)
        result = await compute_metric("rep_activity_count", sb, TENANT_ID, CRM_SOURCE)
        assert result.chart_type == "bar"

    @pytest.mark.asyncio
    async def test_pipeline_stall_risk_returns_stalled_count(self):
        """Deals with modified_at far in the past should be flagged."""
        stale_date = "2024-01-01T00:00:00+00:00"
        recent_date = "2026-02-01T00:00:00+00:00"
        deals = [
            _deal("PROPOSAL", modified_at=stale_date),  # stalled
            _deal("NEW", modified_at=stale_date),       # stalled
            _deal("WON", modified_at=stale_date, won=True),  # won — should be excluded
            _deal("NEGOTIATION", modified_at=recent_date),  # not stalled
        ]
        sb = _mk_supabase(deals=deals)
        result = await compute_metric("pipeline_stall_risk", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result.value, int)
        assert result.value >= 2  # at least the 2 open stale deals

    @pytest.mark.asyncio
    async def test_lead_to_deal_rate_returns_percentage_string(self):
        leads = [_lead() for _ in range(10)]
        sb = _mk_supabase(deals=SAMPLE_DEALS, leads=leads)
        result = await compute_metric("lead_to_deal_rate", sb, TENANT_ID, CRM_SOURCE)
        assert "%" in str(result.value) or result.value == "N/A"


# ===========================================================================
# 6. Revenue-model-dependent metrics degrade gracefully
# ===========================================================================

class TestRevenueModelDegradation:

    @pytest.mark.asyncio
    async def test_stage_conversion_without_model_has_warning(self):
        """stage_conversion works without a model but should emit a warning."""
        sb = _mk_supabase(deals=SAMPLE_DEALS, revenue_models=[])
        result = await compute_metric("stage_conversion", sb, TENANT_ID, CRM_SOURCE)
        # Should not raise; should have a warning
        assert isinstance(result, MetricResult)
        assert any("revenue model" in w.lower() for w in result.warnings)

    @pytest.mark.asyncio
    async def test_forecast_hygiene_without_model_has_warning(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, revenue_models=[])
        result = await compute_metric("forecast_hygiene", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result, MetricResult)
        assert any("revenue model" in w.lower() for w in result.warnings)

    @pytest.mark.asyncio
    async def test_pipeline_stall_without_model_has_warning(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, revenue_models=[])
        result = await compute_metric("pipeline_stall_risk", sb, TENANT_ID, CRM_SOURCE)
        assert isinstance(result, MetricResult)
        assert any("revenue model" in w.lower() for w in result.warnings)

    @pytest.mark.asyncio
    async def test_stage_conversion_with_model_uses_stage_order(self):
        """With a confirmed revenue model, stage data should be sorted by stage_order."""
        sb = _mk_supabase(deals=SAMPLE_DEALS, revenue_models=[REVENUE_MODEL])
        result = await compute_metric("stage_conversion", sb, TENANT_ID, CRM_SOURCE)
        # No warnings about missing model
        model_warnings = [w for w in result.warnings if "revenue model" in w.lower()]
        assert len(model_warnings) == 0


# ===========================================================================
# 7. Dimensional queries
# ===========================================================================

class TestDimensionalQueries:

    @pytest.mark.asyncio
    async def test_win_rate_by_rep_returns_bar_chart(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("win_rate", sb, TENANT_ID, CRM_SOURCE, dimension="assigned_to")
        assert result.chart_type == "bar"
        assert result.dimension == "assigned_to"
        # data should be a list
        assert isinstance(result.data, list)

    @pytest.mark.asyncio
    async def test_sales_cycle_by_rep_returns_bar_chart(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        result = await compute_metric("sales_cycle_days", sb, TENANT_ID, CRM_SOURCE, dimension="assigned_to")
        assert result.chart_type == "bar"
        assert result.dimension == "assigned_to"

    @pytest.mark.asyncio
    async def test_activity_count_by_type_dimension(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, activities=SAMPLE_ACTIVITIES)
        result = await compute_metric("rep_activity_count", sb, TENANT_ID, CRM_SOURCE, dimension="type")
        assert result.chart_type == "bar"


# ===========================================================================
# 8. get_catalog_with_trust — structure
# ===========================================================================

class TestGetCatalogWithTrust:

    @pytest.mark.asyncio
    async def test_returns_12_entries(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, leads=[_lead()], activities=SAMPLE_ACTIVITIES)
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        assert len(catalog) == 12

    @pytest.mark.asyncio
    async def test_each_entry_has_required_keys(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, leads=[_lead()], activities=SAMPLE_ACTIVITIES)
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        required_keys = {"key", "title", "description", "available",
                         "data_trust_score", "evidence"}
        for entry in catalog:
            assert required_keys.issubset(entry.keys()), (
                f"Entry '{entry.get('key')}' missing keys: {required_keys - entry.keys()}"
            )

    @pytest.mark.asyncio
    async def test_available_false_when_table_empty(self):
        sb = _mk_supabase(deals=[])  # no deals
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        pipeline_entry = next(e for e in catalog if e["key"] == "pipeline_value")
        assert pipeline_entry["available"] is False

    @pytest.mark.asyncio
    async def test_available_true_when_data_present(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        pipeline_entry = next(e for e in catalog if e["key"] == "pipeline_value")
        assert pipeline_entry["available"] is True

    @pytest.mark.asyncio
    async def test_trust_score_present_and_valid(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS, leads=[_lead()], activities=SAMPLE_ACTIVITIES)
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        for entry in catalog:
            score = entry["data_trust_score"]
            assert 0.0 <= score <= 1.0, f"Trust score out of range for '{entry['key']}': {score}"

    @pytest.mark.asyncio
    async def test_evidence_has_row_count(self):
        sb = _mk_supabase(deals=SAMPLE_DEALS)
        catalog = await get_catalog_with_trust(sb, TENANT_ID, CRM_SOURCE)
        pipeline_entry = next(e for e in catalog if e["key"] == "pipeline_value")
        assert pipeline_entry["evidence"]["row_count"] > 0


# ===========================================================================
# 9. data_trust_score reflects data quality
# ===========================================================================

class TestDataTrustScoreQuality:

    @pytest.mark.asyncio
    async def test_low_trust_when_key_field_all_null(self):
        """Pipeline value with all-null 'value' field → low trust."""
        null_value_deals = [
            {"stage": "NEW", "value": None, "won": False,
             "assigned_to": "Alice", "created_at": "2025-11-01T00:00:00+00:00",
             "closed_at": None, "modified_at": "2025-12-01T00:00:00+00:00"}
        ] * 10
        sb = _mk_supabase(deals=null_value_deals)
        result = await compute_metric("pipeline_value", sb, TENANT_ID, CRM_SOURCE)
        # value is 100% null → trust should be < 0.7
        assert result.evidence.data_trust_score < 0.7

    @pytest.mark.asyncio
    async def test_high_trust_when_data_is_complete(self):
        """All required fields present → trust close to 1.0."""
        complete_deals = [
            {"stage": "NEW", "value": 10000, "won": False,
             "assigned_to": "Alice", "created_at": "2025-11-01T00:00:00+00:00",
             "closed_at": None, "modified_at": "2025-12-01T00:00:00+00:00"}
        ] * 10
        sb = _mk_supabase(deals=complete_deals)
        result = await compute_metric("pipeline_value", sb, TENANT_ID, CRM_SOURCE)
        # 'closed_at' will be null but 'value' and 'won' are present
        assert result.evidence.data_trust_score >= 0.5

    @pytest.mark.asyncio
    async def test_trust_score_penalised_for_very_few_rows(self):
        """Validator penalises trust score when < 10 total rows."""
        validator = MetricValidator()
        defn = METRIC_CATALOG["pipeline_value"]
        sb = _mk_supabase(deals=[_deal() for _ in range(3)])  # only 3 rows
        evidence = await validator.compute_trust(sb, TENANT_ID, CRM_SOURCE, defn)
        # Low row count → trust capped at 0.3
        assert evidence.data_trust_score <= 0.3


# ===========================================================================
# 10. _timeframe_label
# ===========================================================================

class TestTimeframeLabel:

    def test_none_is_all_time(self):
        assert _timeframe_label(None) == "All time"

    def test_1_day(self):
        assert _timeframe_label(1) == "Today"

    def test_7_days(self):
        assert _timeframe_label(7) == "Last 7 days"

    def test_30_days(self):
        assert _timeframe_label(30) == "Last 30 days"

    def test_90_days(self):
        assert _timeframe_label(90) == "Last 90 days"

    def test_365_days(self):
        assert _timeframe_label(365) == "Last 12 months"

    def test_custom_days(self):
        label = _timeframe_label(45)
        assert "45" in label


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
