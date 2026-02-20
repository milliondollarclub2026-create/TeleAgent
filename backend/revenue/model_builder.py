"""
Revenue Model Builder
=====================
Inspects the tenant's synced crm_deals to produce a RevenueModelProposal:
  - Classifies each distinct stage as WON / LOST / OPEN using a curated
    vocabulary and scored partial matching.
  - Infers a plausible pipeline stage order using keyword hints.
  - Computes per-field confidence scores.
  - Generates clarification questions for any classification with
    confidence < threshold so the server can enforce the hard rule:
      "Never silently assume won/lost."

Public API
----------
    proposal = await build_proposal(supabase, tenant_id, crm_source)

The returned RevenueModelProposal is a plain dataclass — convert to dict
with dataclasses.asdict(proposal) before serialising to JSON.

Stage ID normalisation
----------------------
Bitrix24 encodes stage IDs as "<pipeline_prefix>:<STAGE>" (e.g. "C2:WON",
"DT182_1:PREPARATION").  _normalize_stage() strips the prefix before
vocabulary lookup so that Bitrix IDs match the same keywords as generic
CRM stage names like "WON" or "PREPARATION".
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field, asdict
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Classification vocabulary
# ---------------------------------------------------------------------------

# Exact normalised names that are certain WON indicators.
_WON_EXACT: frozenset[str] = frozenset({
    "won", "win", "success", "successful",
    "closed_won", "closedwon", "close_won",
    "won_deal", "deal_won",
    "converted", "conversion",
    "won_opp", "won_opportunity",
})

# Substrings that strongly suggest WON (applied to normalised name).
_WON_SUBSTRINGS: tuple[str, ...] = (
    "won", "win", "success", "convert", "closed_won", "closedwon",
)

# Exact normalised names that are certain LOST indicators.
_LOST_EXACT: frozenset[str] = frozenset({
    "lost", "lose",
    "failed", "fail",
    "closed_lost", "closedlost", "close_lost",
    "rejected", "reject",
    "cancelled", "canceled",
    "dead",
    "disqualified", "dq",
    "no_deal", "nodeal",
    "no_go",
    "churned",
})

# Substrings that strongly suggest LOST.
_LOST_SUBSTRINGS: tuple[str, ...] = (
    "lost", "lose", "fail", "reject", "cancel", "dead", "disqualif",
    "closed_lost", "closedlost",
)

# Pipeline stage ordering hints — earlier index = earlier in funnel.
# WON/LOST intentionally placed at the end so they sort after open stages.
_PIPELINE_HINTS: tuple[str, ...] = (
    "new", "lead", "incoming", "inbound", "initial",
    "qualification", "qualify", "qualified",
    "contact", "contacted",
    "analysis", "analyse", "analyze", "discovery",
    "preparation", "prepare", "prepared",
    "proposal", "quote", "offer", "offering",
    "presentation",
    "negotiation", "negotiate",
    "commitment", "decision", "review", "approval",
    "closing", "close",
    # Won / Lost always trail open stages
    "won", "win", "success",
    "lost", "lose", "dead", "fail", "reject", "cancel",
)

# Confidence thresholds — below these, questions are generated.
WON_CONFIDENCE_THRESHOLD: float = 0.75
LOST_CONFIDENCE_THRESHOLD: float = 0.75

# Minimum total deal count to trust percentage-based signals.
MIN_SAMPLE_THRESHOLD: int = 5


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class StageStats:
    """Statistics for one distinct stage value."""
    value: str           # Raw stage value as stored in crm_deals.stage
    normalized: str      # Lower-cased, prefix-stripped, punctuation-cleaned
    count: int           # Number of deals with this stage
    won_score: float     # 0.0–1.0  how confident we are this stage = WON
    lost_score: float    # 0.0–1.0  how confident we are this stage = LOST


@dataclass
class RevenueModelProposal:
    """
    Complete revenue model proposal for a tenant+crm_source pair.

    questions[] is non-empty when the system cannot confidently classify
    won/lost stages.  The caller (API layer) MUST surface these questions
    and require user confirmation before the model is stored with
    confirmed_at set.
    """
    tenant_id: str
    crm_source: str

    # --- Field mappings (always defaulted to normalized column names) ---
    deal_stage_field: str = "stage"
    amount_field: str = "value"
    close_date_field: str = "closed_at"
    created_date_field: str = "created_at"
    owner_field: str = "assigned_to"
    currency_field: str = "currency"

    # --- Stage classification ---
    won_stage_values: list[str] = field(default_factory=list)
    lost_stage_values: list[str] = field(default_factory=list)
    open_stage_values: list[str] = field(default_factory=list)
    stage_order: list[str] = field(default_factory=list)

    # --- All stages with evidence ---
    stage_stats: list[dict] = field(default_factory=list)  # list[asdict(StageStats)]

    # --- Confidence scores ---
    # Keys: won_classification, lost_classification, stage_order, overall
    confidence_json: dict = field(default_factory=dict)
    # Human-readable explanation for each confidence score
    rationale_json: dict = field(default_factory=dict)

    # --- Clarification questions (empty when confidence is sufficient) ---
    questions: list[dict] = field(default_factory=list)

    # --- Meta ---
    total_deals: int = 0
    # True if questions[] is non-empty or no deals were found.
    # The API MUST NOT save the model with confirmed_at when this is True
    # unless the user has explicitly answered all questions.
    requires_confirmation: bool = True


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def build_proposal(
    supabase,
    tenant_id: str,
    crm_source: str,
) -> RevenueModelProposal:
    """
    Inspect crm_deals for this tenant and return a RevenueModelProposal.

    Steps:
    1. Fetch distinct stage values + counts from crm_deals.
    2. Normalize each stage value (strip CRM prefixes, lowercase, etc.).
    3. Score each stage against the WON / LOST vocabulary.
    4. Classify: high-confidence stages are auto-assigned; borderline stages
       are left as open and generate clarification questions.
    5. Infer stage ordering using pipeline hint vocabulary.
    6. Build confidence scores and human rationale strings.
    7. Return proposal (questions[] non-empty if confirmation required).
    """
    proposal = RevenueModelProposal(tenant_id=tenant_id, crm_source=crm_source)

    # --- 1. Fetch stage distribution ---
    try:
        import asyncio as _asyncio
        result = await _asyncio.to_thread(
            lambda: supabase.table("crm_deals")
            .select("stage")
            .eq("tenant_id", tenant_id)
            .eq("crm_source", crm_source)
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.error("build_proposal: failed to query crm_deals: %s", exc)
        proposal.rationale_json["stage"] = (
            f"Database query failed — cannot propose a model: {exc}"
        )
        proposal.requires_confirmation = True
        return proposal

    if not rows:
        proposal.rationale_json["stage"] = (
            "No deals found in crm_deals for this tenant/source. "
            "Ensure the CRM sync has completed before proposing a revenue model."
        )
        proposal.requires_confirmation = True
        return proposal

    # --- 2. Count by stage ---
    stage_counts: dict[str, int] = {}
    for row in rows:
        s = (row.get("stage") or "").strip() or "(unknown)"
        stage_counts[s] = stage_counts.get(s, 0) + 1

    proposal.total_deals = len(rows)

    # --- 3. Score each stage ---
    stats: list[StageStats] = []
    for stage_val, count in stage_counts.items():
        normalized = _normalize_stage(stage_val)
        stats.append(StageStats(
            value=stage_val,
            normalized=normalized,
            count=count,
            won_score=_score_won(normalized),
            lost_score=_score_lost(normalized),
        ))

    # Sort by deal count descending (most common stages first in questions)
    stats.sort(key=lambda s: -s.count)
    proposal.stage_stats = [asdict(s) for s in stats]

    # --- 4. Classify ---
    won_stages = [s for s in stats if s.won_score >= WON_CONFIDENCE_THRESHOLD]
    lost_stages = [s for s in stats if s.lost_score >= LOST_CONFIDENCE_THRESHOLD]
    # A stage can't be both won and lost — prefer the higher-scoring side
    ambiguous = [s for s in won_stages if s in lost_stages]
    for s in ambiguous:
        if s.won_score >= s.lost_score:
            lost_stages = [x for x in lost_stages if x is not s]
        else:
            won_stages = [x for x in won_stages if x is not s]

    classified = {s.value for s in won_stages} | {s.value for s in lost_stages}
    open_stages = [s for s in stats if s.value not in classified]

    proposal.won_stage_values = [s.value for s in won_stages]
    proposal.lost_stage_values = [s.value for s in lost_stages]
    proposal.open_stage_values = [s.value for s in open_stages]

    # --- 5. Infer stage order ---
    proposal.stage_order = _infer_stage_order(open_stages, won_stages, lost_stages)

    # --- 6. Confidence + rationale ---
    won_conf = max((s.won_score for s in won_stages), default=0.0)
    lost_conf = max((s.lost_score for s in lost_stages), default=0.0)
    overall = min(won_conf, lost_conf)

    proposal.confidence_json = {
        "won_classification": round(won_conf, 3),
        "lost_classification": round(lost_conf, 3),
        # Stage order is always medium — inferring order reliably requires
        # stage transition history which is not stored.
        "stage_order": 0.6,
        "overall": round(overall, 3),
    }

    proposal.rationale_json = _build_rationale(
        won_stages, lost_stages, open_stages, stage_counts, proposal.total_deals
    )

    # --- 7. Questions (when confidence is insufficient) ---
    questions: list[dict] = []
    all_options = [
        {"value": s.value, "label": s.value, "count": s.count}
        for s in stats
    ]

    if not won_stages or won_conf < WON_CONFIDENCE_THRESHOLD:
        questions.append({
            "id": "won_stages",
            "type": "multiselect",
            "question": (
                "Which of these stages mean the deal was WON "
                "(closed successfully — should count toward revenue)?"
            ),
            "options": all_options,
            "current_selection": [s.value for s in won_stages],
        })

    if not lost_stages or lost_conf < LOST_CONFIDENCE_THRESHOLD:
        questions.append({
            "id": "lost_stages",
            "type": "multiselect",
            "question": (
                "Which stages mean the deal was LOST "
                "(closed without a sale — should NOT count toward revenue)?"
            ),
            "options": all_options,
            "current_selection": [s.value for s in lost_stages],
        })

    # Stage order question: always present so user can correct the inference.
    questions.append({
        "id": "stage_order",
        "type": "order",
        "question": (
            "Drag stages into the correct pipeline order "
            "(earliest / top-of-funnel first, WON/LOST last):"
        ),
        "options": [{"value": s, "label": s} for s in proposal.stage_order],
        "current_selection": proposal.stage_order,
    })

    proposal.questions = questions
    # requires_confirmation is True when any won/lost question remains OR no deals found.
    proposal.requires_confirmation = any(
        q["id"] in ("won_stages", "lost_stages") for q in questions
    )

    return proposal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_stage(stage_value: str) -> str:
    """
    Produce a canonical lowercase key for vocabulary lookup.

    Handles:
    - Bitrix24 prefixes: "C2:WON" → "won", "DT182_1:PREPARATION" → "preparation"
    - Mixed case: "Closed Won" → "closed_won"
    - Spaces / dashes → underscores
    - Punctuation removal
    """
    s = (stage_value or "").strip()
    if not s:
        return ""

    # Strip leading CRM-specific prefix (letters, digits, underscore followed by colon).
    # Matches: "C2:", "DT182_1:", "PIPELINE_A:", etc.
    s = re.sub(r'^[A-Za-z0-9_]+:', '', s)

    # Lowercase
    s = s.lower().strip()

    # Replace spaces, dashes, dots with underscores
    s = re.sub(r'[\s\-\.]+', '_', s)

    # Remove any remaining non-alphanumeric characters except underscores
    s = re.sub(r'[^a-z0-9_]', '', s)

    # Collapse multiple underscores
    s = re.sub(r'_+', '_', s).strip('_')

    return s


def _score_won(normalized: str) -> float:
    """Return 0.0–1.0 confidence that a normalised stage name means WON."""
    if not normalized:
        return 0.0
    if normalized in _WON_EXACT:
        return 1.0
    for sub in _WON_SUBSTRINGS:
        if sub in normalized:
            return 0.90
    return 0.0


def _score_lost(normalized: str) -> float:
    """Return 0.0–1.0 confidence that a normalised stage name means LOST."""
    if not normalized:
        return 0.0
    if normalized in _LOST_EXACT:
        return 1.0
    for sub in _LOST_SUBSTRINGS:
        if sub in normalized:
            return 0.90
    return 0.0


def _hint_index(stage: StageStats) -> float:
    """Return position of the best-matching pipeline hint (lower = earlier in funnel)."""
    for i, hint in enumerate(_PIPELINE_HINTS):
        if hint in stage.normalized:
            return float(i)
    # Unknown stages sort between known open stages and WON/LOST.
    return 50.0


def _infer_stage_order(
    open_stages: list[StageStats],
    won_stages: list[StageStats],
    lost_stages: list[StageStats],
) -> list[str]:
    """
    Return a plausible ordered list of all stage values.

    Strategy:
    - Open stages: sorted by _hint_index (funnel position vocabulary).
      Ties broken by deal count descending (busier stages tend to be earlier).
    - Won stages trail all open stages.
    - Lost stages trail won stages (convention: lost is the last column).
    """
    open_sorted = sorted(open_stages, key=lambda s: (_hint_index(s), -s.count))
    won_sorted = sorted(won_stages, key=lambda s: -s.count)
    lost_sorted = sorted(lost_stages, key=lambda s: -s.count)

    return [s.value for s in open_sorted + won_sorted + lost_sorted]


def _build_rationale(
    won_stages: list[StageStats],
    lost_stages: list[StageStats],
    open_stages: list[StageStats],
    stage_counts: dict[str, int],
    total_deals: int,
) -> dict:
    """Produce human-readable explanation strings for each classification."""

    def _fmt(stages: list[StageStats], label: str) -> str:
        if not stages:
            return f"No {label} stages identified — user confirmation required."
        names = ", ".join(f"'{s.value}'" for s in stages)
        pct = sum(s.count for s in stages) / max(total_deals, 1) * 100
        return (
            f"Matched {len(stages)} stage(s) as {label} "
            f"({names}) accounting for {pct:.0f}% of {total_deals} deals. "
            f"Matched via {'exact' if all(s.won_score == 1.0 or s.lost_score == 1.0 for s in stages) else 'substring'} "
            f"vocabulary lookup."
        )

    return {
        "won_classification": _fmt(won_stages, "WON"),
        "lost_classification": _fmt(lost_stages, "LOST"),
        "open_stages": (
            f"{len(open_stages)} open/pipeline stages identified: "
            + ", ".join(f"'{s.value}'" for s in open_stages)
        ) if open_stages else "No open stages found.",
        "stage_order": (
            "Stage order inferred from pipeline vocabulary hints. "
            "Accuracy is limited without stage-transition history. "
            "User should verify the order."
        ),
    }
