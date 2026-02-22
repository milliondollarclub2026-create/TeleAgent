"""
Farid Validator — Programmatic validation layer for Farid's discover_and_plan() output.

Zero LLM cost. Ensures every widget references real fields, strips hallucinated
columns, recalculates confidence from actual fill rates, and populates
options_from_field questions with real CRM values.

Reuses the validation pattern from Dima's _validate_and_build_config (dima.py:149-191).
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_VALID_CHART_TYPES = {"bar", "pie", "line", "funnel", "kpi"}
_VALID_AGGREGATIONS = {"count", "sum", "avg", "min", "max"}
_VALID_SORT_ORDERS = {"asc", "desc"}
_VALID_SIZES = {"small", "medium", "large"}
_VALID_QUESTION_TYPES = {"multiselect", "radio", "order"}
_MAX_TITLE_LEN = 80
_MAX_ITEM_LIMIT = 20
_MAX_QUESTIONS_PER_GOAL = 2


def validate_farid_output(
    raw_result: dict,
    allowed_fields: dict,
    field_registry_rows: list[dict],
) -> dict:
    """
    Validate and sanitize Farid's raw output against the actual field whitelist.

    Args:
        raw_result: Raw dict from discover_and_plan()
        allowed_fields: {table: [field_names]} from load_allowed_fields()
        field_registry_rows: Raw crm_field_registry rows for confidence + options

    Returns:
        Validated dict safe for frontend consumption and widget insertion.
    """
    # Build helper lookups
    date_fields = _build_date_field_set(field_registry_rows)
    field_meta = _build_field_meta(field_registry_rows)

    # Validate baseline KPIs
    validated_kpis = []
    for kpi in raw_result.get("baseline_kpis", []):
        v = _validate_widget(kpi, allowed_fields, date_fields)
        if v:
            validated_kpis.append(v)

    # Ensure minimum 2 baseline KPIs
    validated_kpis = _ensure_fallback_kpis(validated_kpis, allowed_fields)

    # Validate goals
    validated_goals = []
    for goal in raw_result.get("goals", []):
        v = _validate_goal(goal, allowed_fields, date_fields, field_meta)
        if v:
            validated_goals.append(v)

    # If no valid goals survived, add a minimal pipeline_overview
    if not validated_goals:
        validated_goals.append({
            "id": "pipeline_overview",
            "name": "Pipeline Overview",
            "description": "Overview of your CRM pipeline",
            "why": "",
            "data_confidence": 0.5,
            "relevant_entities": ["deals", "leads"],
            "key_fields": {},
            "widgets": _build_fallback_widgets(allowed_fields),
            "refinement_questions": [],
        })

    # Pass through business_profile, entity_labels, field_roles with minimal validation
    business_profile = raw_result.get("business_profile", {})
    if not isinstance(business_profile, dict):
        business_profile = {"type": "unknown", "summary": ""}

    return {
        "business_profile": business_profile,
        "baseline_kpis": validated_kpis,
        "goals": validated_goals,
        "entity_labels": raw_result.get("entity_labels", {}),
        "field_roles": raw_result.get("field_roles", {}),
    }


def _validate_widget(
    widget: dict,
    allowed_fields: dict,
    date_fields: set,
) -> Optional[dict]:
    """Validate a single widget spec against the field whitelist."""
    try:
        data_source = widget.get("data_source", "")
        if data_source not in allowed_fields:
            logger.debug(f"Farid widget invalid data_source: {data_source}")
            return None

        allowed = allowed_fields[data_source]
        chart_type = widget.get("chart_type", "bar")
        if chart_type not in _VALID_CHART_TYPES:
            chart_type = "bar"

        x_field = widget.get("x_field", "")

        # KPI: x_field can be any field — it's not used for grouping
        if chart_type == "kpi":
            x_field = x_field if x_field in allowed else (allowed[0] if allowed else "id")
        elif x_field not in allowed:
            logger.debug(f"Farid widget invalid x_field '{x_field}' for {data_source}")
            return None

        # Line charts: x_field must be a date field
        if chart_type == "line":
            full_key = f"{data_source}.{x_field}"
            if full_key not in date_fields:
                # Try to find a date field in this table
                date_fallback = _find_date_field(data_source, allowed, date_fields)
                if date_fallback:
                    x_field = date_fallback
                else:
                    # Convert to bar chart instead of dropping
                    chart_type = "bar"

        # y_field validation
        y_field = widget.get("y_field", "count")
        if y_field != "count" and y_field not in allowed:
            y_field = "count"

        # filter_field validation
        filter_field = widget.get("filter_field")
        if filter_field and filter_field not in allowed:
            filter_field = None

        # Sanitize other fields
        aggregation = widget.get("aggregation", "count")
        if aggregation not in _VALID_AGGREGATIONS:
            aggregation = "count"

        sort_order = widget.get("sort_order", "desc")
        if sort_order not in _VALID_SORT_ORDERS:
            sort_order = "desc"

        size = widget.get("size", "medium")
        if size not in _VALID_SIZES:
            size = "medium"

        # KPIs must be small
        if chart_type == "kpi":
            size = "small"

        title = str(widget.get("title", "Untitled"))[:_MAX_TITLE_LEN]
        item_limit = min(int(widget.get("item_limit", 10)), _MAX_ITEM_LIMIT)

        return {
            "chart_type": chart_type,
            "title": title,
            "data_source": data_source,
            "x_field": x_field,
            "y_field": y_field,
            "aggregation": aggregation,
            "filter_field": filter_field,
            "filter_value": widget.get("filter_value") if filter_field else None,
            "time_range_days": widget.get("time_range_days"),
            "sort_order": sort_order,
            "item_limit": item_limit,
            "size": size,
        }
    except Exception as e:
        logger.warning(f"Failed to validate Farid widget: {e}")
        return None


def _validate_goal(
    goal: dict,
    allowed_fields: dict,
    date_fields: set,
    field_meta: dict,
) -> Optional[dict]:
    """Validate a single goal — must retain at least 1 valid widget."""
    # Validate widgets
    valid_widgets = []
    for w in goal.get("widgets", []):
        v = _validate_widget(w, allowed_fields, date_fields)
        if v:
            valid_widgets.append(v)

    if not valid_widgets:
        logger.debug(f"Farid goal '{goal.get('id')}' has no valid widgets, dropping")
        return None

    # Validate refinement questions
    valid_questions = []
    for q in goal.get("refinement_questions", []):
        vq = _validate_question(q, field_meta)
        if vq:
            valid_questions.append(vq)
            if len(valid_questions) >= _MAX_QUESTIONS_PER_GOAL:
                break

    # Recalculate data_confidence
    confidence = _recalculate_confidence(
        goal.get("data_confidence", 0.5),
        goal.get("key_fields", {}),
        field_meta,
    )

    return {
        "id": str(goal.get("id", "unknown_goal")),
        "name": str(goal.get("name", "Untitled Goal")),
        "description": str(goal.get("description", "")),
        "why": str(goal.get("why", "")),
        "data_confidence": confidence,
        "relevant_entities": goal.get("relevant_entities", []),
        "key_fields": goal.get("key_fields", {}),
        "widgets": valid_widgets,
        "refinement_questions": valid_questions,
    }


def _validate_question(q: dict, field_meta: dict) -> Optional[dict]:
    """Validate a refinement question."""
    q_type = q.get("type", "")
    if q_type not in _VALID_QUESTION_TYPES:
        return None

    q_id = q.get("id", "")
    if not q_id:
        return None

    result = {
        "id": q_id,
        "type": q_type,
        "question": str(q.get("question", "")),
        "why": str(q.get("why", "")),
        "default": q.get("default"),
    }

    # Populate options from field if specified
    options_from = q.get("options_from_field")
    if options_from and isinstance(options_from, dict):
        table = options_from.get("table", "")
        field = options_from.get("field", "")
        meta_key = f"{table}.{field}"
        meta = field_meta.get(meta_key)
        if meta and meta.get("sample_values"):
            result["options"] = [
                {"label": str(s), "value": str(s)}
                for s in meta["sample_values"]
            ]
        else:
            # Fall back to provided options
            result["options"] = q.get("options", [])
    else:
        result["options"] = q.get("options", [])

    return result


def _recalculate_confidence(
    farid_estimate: float,
    key_fields: dict,
    field_meta: dict,
) -> float:
    """Blend Farid's estimate (40%) with actual fill rates from field_registry (60%)."""
    if not key_fields or not field_meta:
        return round(max(0.0, min(1.0, farid_estimate)), 2)

    fill_rates = []
    for table, fields in key_fields.items():
        for field in fields:
            meta_key = f"{table}.{field}"
            meta = field_meta.get(meta_key)
            if meta:
                fill_rates.append(1.0 - meta.get("null_rate", 0.0))

    if not fill_rates:
        return round(max(0.0, min(1.0, farid_estimate)), 2)

    avg_fill = sum(fill_rates) / len(fill_rates)
    blended = 0.4 * farid_estimate + 0.6 * avg_fill
    return round(max(0.0, min(1.0, blended)), 2)


def _ensure_fallback_kpis(
    kpis: list[dict],
    allowed_fields: dict,
) -> list[dict]:
    """Ensure at least 2 baseline KPIs exist. Prepend fallbacks if needed."""
    existing_titles = {k.get("title", "").lower() for k in kpis}

    fallbacks = []
    if "crm_deals" in allowed_fields and "total deals" not in existing_titles:
        fields = allowed_fields["crm_deals"]
        x = "stage" if "stage" in fields else (fields[0] if fields else "id")
        fallbacks.append({
            "chart_type": "kpi", "title": "Total Deals",
            "data_source": "crm_deals", "x_field": x,
            "y_field": "count", "aggregation": "count",
            "sort_order": "desc", "item_limit": 10, "size": "small",
        })
    if "crm_leads" in allowed_fields and "total leads" not in existing_titles:
        fields = allowed_fields["crm_leads"]
        x = "status" if "status" in fields else (fields[0] if fields else "id")
        fallbacks.append({
            "chart_type": "kpi", "title": "Total Leads",
            "data_source": "crm_leads", "x_field": x,
            "y_field": "count", "aggregation": "count",
            "sort_order": "desc", "item_limit": 10, "size": "small",
        })

    # Prepend fallbacks so they appear first
    combined = fallbacks + kpis
    if len(combined) < 2:
        return combined
    return combined


def _build_fallback_widgets(allowed_fields: dict) -> list[dict]:
    """Build minimal fallback widgets for pipeline_overview goal."""
    widgets = []
    if "crm_deals" in allowed_fields:
        fields = allowed_fields["crm_deals"]
        x = "stage" if "stage" in fields else (fields[0] if fields else "id")
        widgets.append({
            "chart_type": "funnel", "title": "Deal Pipeline",
            "data_source": "crm_deals", "x_field": x,
            "y_field": "count", "aggregation": "count",
            "sort_order": "desc", "item_limit": 10, "size": "large",
        })
    if "crm_leads" in allowed_fields:
        fields = allowed_fields["crm_leads"]
        x = "status" if "status" in fields else (fields[0] if fields else "id")
        widgets.append({
            "chart_type": "funnel", "title": "Lead Pipeline",
            "data_source": "crm_leads", "x_field": x,
            "y_field": "count", "aggregation": "count",
            "sort_order": "desc", "item_limit": 10, "size": "large",
        })
    return widgets


# ── Helper builders ───────────────────────────────────────────────────

def _build_date_field_set(field_registry_rows: list[dict]) -> set[str]:
    """Build a set of 'table.field' keys for date/datetime fields."""
    date_types = {"date", "datetime", "timestamp", "timestamptz"}
    result = set()
    for row in field_registry_rows:
        ft = (row.get("field_type") or "").lower()
        if ft in date_types or "date" in ft or "timestamp" in ft:
            table = f"crm_{row['entity']}"
            result.add(f"{table}.{row['field_name']}")
    return result


def _build_field_meta(field_registry_rows: list[dict]) -> dict:
    """Build a lookup {table.field: {null_rate, distinct_count, sample_values}}."""
    meta = {}
    for row in field_registry_rows:
        table = f"crm_{row['entity']}"
        key = f"{table}.{row['field_name']}"
        meta[key] = {
            "null_rate": float(row.get("null_rate") or 0),
            "distinct_count": row.get("distinct_count") or 0,
            "sample_values": row.get("sample_values") or [],
            "field_type": row.get("field_type", ""),
        }
    return meta


def _find_date_field(
    data_source: str,
    allowed: list[str],
    date_fields: set,
) -> Optional[str]:
    """Find a date field in the allowed list for a given table."""
    for field in allowed:
        if f"{data_source}.{field}" in date_fields:
            return field
    return None
