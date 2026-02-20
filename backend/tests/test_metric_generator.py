"""
Tests for the Phase 2 metric generator.
Tests metric generation, validation, alert rule generation, and fallbacks.
"""

import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch

from agents import SchemaProfile, EntityProfile, FieldProfile


# ── Test fixtures ────────────────────────────────────────────────────────

def _b2b_schema():
    """A B2B sales SchemaProfile with typical fields."""
    return SchemaProfile(
        tenant_id="t1",
        crm_source="bitrix24",
        business_type="sales",
        business_summary="B2B software sales company",
        entities=[
            EntityProfile(
                entity="deals",
                record_count=150,
                fields=[
                    FieldProfile(field_name="stage", field_type="text", fill_rate=0.95, distinct_count=5),
                    FieldProfile(field_name="value", field_type="numeric", fill_rate=0.88, distinct_count=80),
                    FieldProfile(field_name="assigned_to", field_type="text", fill_rate=0.92, distinct_count=8),
                    FieldProfile(field_name="won", field_type="boolean", fill_rate=0.90, distinct_count=2),
                    FieldProfile(field_name="created_at", field_type="timestamp", fill_rate=1.0, distinct_count=150),
                    FieldProfile(field_name="closed_at", field_type="timestamp", fill_rate=0.60, distinct_count=80),
                    FieldProfile(field_name="modified_at", field_type="timestamp", fill_rate=1.0, distinct_count=100),
                ],
                business_label="Opportunities",
            ),
            EntityProfile(
                entity="leads",
                record_count=300,
                fields=[
                    FieldProfile(field_name="status", field_type="text", fill_rate=0.97, distinct_count=4),
                    FieldProfile(field_name="source", field_type="text", fill_rate=0.80, distinct_count=10),
                    FieldProfile(field_name="value", field_type="numeric", fill_rate=0.30, distinct_count=40),
                    FieldProfile(field_name="created_at", field_type="timestamp", fill_rate=1.0, distinct_count=300),
                    FieldProfile(field_name="modified_at", field_type="timestamp", fill_rate=1.0, distinct_count=200),
                ],
                business_label="Prospects",
            ),
        ],
        entity_labels={"deals": "Opportunities", "leads": "Prospects"},
        stage_field="stage",
        amount_field="value",
        owner_field="assigned_to",
        currency="USD",
        data_quality_score=0.85,
    )


def _education_schema():
    """Education-style schema."""
    return SchemaProfile(
        tenant_id="t2",
        crm_source="bitrix24",
        business_type="education",
        business_summary="University enrollment management",
        entities=[
            EntityProfile(
                entity="deals",
                record_count=200,
                fields=[
                    FieldProfile(field_name="stage", field_type="text", fill_rate=0.98, distinct_count=6),
                    FieldProfile(field_name="value", field_type="numeric", fill_rate=0.15, distinct_count=10),
                    FieldProfile(field_name="assigned_to", field_type="text", fill_rate=0.90, distinct_count=12),
                    FieldProfile(field_name="created_at", field_type="timestamp", fill_rate=1.0),
                    FieldProfile(field_name="modified_at", field_type="timestamp", fill_rate=1.0),
                ],
                business_label="Enrollments",
            ),
        ],
        entity_labels={"deals": "Enrollments"},
        stage_field="stage",
        amount_field="value",
        owner_field="assigned_to",
        data_quality_score=0.70,
    )


# ── Test: Universal fallback metrics ────────────────────────────────────

def test_universal_fallback_creates_metrics():
    from revenue.metric_generator import _universal_fallback_metrics

    schema = _b2b_schema()
    metrics = _universal_fallback_metrics("t1", "bitrix24", schema)

    assert len(metrics) == 2  # deals and leads both have data
    keys = [m["metric_key"] for m in metrics]
    assert "total_deals" in keys
    assert "total_leads" in keys
    for m in metrics:
        assert m["is_core"] is True
        assert m["is_kpi"] is True
        assert m["generated_by"] == "system"


def test_universal_fallback_skips_empty_entities():
    schema = SchemaProfile(
        tenant_id="t1",
        crm_source="bitrix24",
        entities=[
            EntityProfile(entity="deals", record_count=0, fields=[]),
            EntityProfile(entity="leads", record_count=50, fields=[]),
        ],
        entity_labels={"leads": "Prospects"},
    )
    from revenue.metric_generator import _universal_fallback_metrics
    metrics = _universal_fallback_metrics("t1", "bitrix24", schema)
    assert len(metrics) == 1
    assert metrics[0]["metric_key"] == "total_leads"


# ── Test: Validation ──────────────────────────────────────────────────

def test_validate_drops_bad_table():
    from revenue.metric_generator import _validate_metrics

    schema = _b2b_schema()
    raw = [{
        "metric_key": "bad_table",
        "title": "Bad",
        "source_table": "crm_nonexistent",
        "computation": {"type": "count", "table": "crm_nonexistent"},
        "required_fields": [],
    }]

    validated = _validate_metrics(raw, schema, "t1", "bitrix24")
    assert len(validated) == 0


def test_validate_drops_bad_field():
    from revenue.metric_generator import _validate_metrics

    schema = _b2b_schema()
    raw = [{
        "metric_key": "bad_field",
        "title": "Bad",
        "source_table": "crm_deals",
        "computation": {"type": "sum", "table": "crm_deals", "field": "nonexistent"},
        "required_fields": ["nonexistent"],
    }]

    validated = _validate_metrics(raw, schema, "t1", "bitrix24")
    assert len(validated) == 0


def test_validate_keeps_good_metric():
    from revenue.metric_generator import _validate_metrics

    schema = _b2b_schema()
    raw = [{
        "metric_key": "total_deals",
        "title": "Total Deals",
        "source_table": "crm_deals",
        "computation": {"type": "count", "table": "crm_deals"},
        "required_fields": [],
        "allowed_dimensions": ["stage", "assigned_to"],
        "confidence": 0.9,
    }]

    validated = _validate_metrics(raw, schema, "t1", "bitrix24")
    assert len(validated) == 1
    assert validated[0]["metric_key"] == "total_deals"


def test_validate_deduplicates():
    from revenue.metric_generator import _validate_metrics

    schema = _b2b_schema()
    raw = [
        {
            "metric_key": "total_deals",
            "title": "Total Deals",
            "source_table": "crm_deals",
            "computation": {"type": "count", "table": "crm_deals"},
            "required_fields": [],
        },
        {
            "metric_key": "total_deals",
            "title": "Total Deals Dupe",
            "source_table": "crm_deals",
            "computation": {"type": "count", "table": "crm_deals"},
            "required_fields": [],
        },
    ]

    validated = _validate_metrics(raw, schema, "t1", "bitrix24")
    assert len(validated) == 1


def test_validate_adjusts_confidence_for_low_fill():
    from revenue.metric_generator import _validate_metrics

    schema = _education_schema()
    raw = [{
        "metric_key": "total_value",
        "title": "Total Value",
        "source_table": "crm_deals",
        "computation": {"type": "sum", "table": "crm_deals", "field": "value"},
        "required_fields": ["value"],
        "confidence": 0.9,
    }]

    validated = _validate_metrics(raw, schema, "t2", "bitrix24")
    assert len(validated) == 1
    # value field has 0.15 fill_rate, so confidence should be capped
    assert validated[0]["confidence"] <= 0.15


def test_validate_filters_invalid_dimensions():
    from revenue.metric_generator import _validate_metrics

    schema = _b2b_schema()
    raw = [{
        "metric_key": "test",
        "title": "Test",
        "source_table": "crm_deals",
        "computation": {"type": "count", "table": "crm_deals"},
        "required_fields": [],
        "allowed_dimensions": ["stage", "nonexistent_field", "assigned_to"],
    }]

    validated = _validate_metrics(raw, schema, "t1", "bitrix24")
    assert len(validated) == 1
    dims = validated[0]["allowed_dimensions"]
    assert "stage" in dims
    assert "assigned_to" in dims
    assert "nonexistent_field" not in dims


# ── Test: Alert rule generation ──────────────────────────────────────

def test_generate_alert_rules_for_ratio():
    from revenue.metric_generator import generate_alert_rules

    schema = _b2b_schema()
    metrics = [{
        "metric_key": "win_rate",
        "computation": {"type": "ratio"},
        "source_table": "crm_deals",
        "allowed_dimensions": [],
        "required_fields": [],
    }]

    rules = generate_alert_rules("t1", "bitrix24", metrics, schema)
    trend_rules = [r for r in rules if r["pattern"] == "trend_decline"]
    assert len(trend_rules) >= 1
    assert trend_rules[0]["metric_key"] == "win_rate"


def test_generate_alert_rules_for_sum_with_owner():
    from revenue.metric_generator import generate_alert_rules

    schema = _b2b_schema()
    metrics = [{
        "metric_key": "pipeline_value",
        "computation": {"type": "sum"},
        "source_table": "crm_deals",
        "allowed_dimensions": ["assigned_to", "stage"],
        "required_fields": ["value"],
    }]

    rules = generate_alert_rules("t1", "bitrix24", metrics, schema)
    conc_rules = [r for r in rules if r["pattern"] == "concentration"]
    assert len(conc_rules) >= 1


def test_generate_stagnation_rules():
    from revenue.metric_generator import generate_alert_rules

    schema = _b2b_schema()
    metrics = [{
        "metric_key": "total_deals",
        "computation": {"type": "count"},
        "source_table": "crm_deals",
        "allowed_dimensions": [],
        "required_fields": [],
    }]

    rules = generate_alert_rules("t1", "bitrix24", metrics, schema)
    stag_rules = [r for r in rules if r["pattern"] == "stagnation"]
    assert len(stag_rules) >= 1
    assert stag_rules[0]["entity"] == "deals"


def test_generate_missing_data_rules():
    from revenue.metric_generator import generate_alert_rules

    schema = _education_schema()  # value field has 0.15 fill rate
    metrics = [{
        "metric_key": "total_value",
        "computation": {"type": "sum"},
        "source_table": "crm_deals",
        "allowed_dimensions": [],
        "required_fields": ["value"],
    }]

    rules = generate_alert_rules("t2", "bitrix24", metrics, schema)
    missing_rules = [r for r in rules if r["pattern"] == "missing_data"]
    assert len(missing_rules) >= 1


# ── Test: Schema summary builder ─────────────────────────────────────

def test_build_schema_summary():
    from revenue.metric_generator import _build_schema_summary

    schema = _b2b_schema()
    summary = _build_schema_summary(schema)

    assert len(summary) == 2  # deals + leads
    deals_summary = next(s for s in summary if s["entity"] == "deals")
    assert deals_summary["record_count"] == 150
    assert len(deals_summary["fields"]) == 7
    assert deals_summary["label"] == "Opportunities"
