"""
Revenue Model Builder Tests
============================
Tests build_proposal() and its helpers.

Coverage:
1. _normalize_stage  — Bitrix24 prefixes, mixed case, punctuation
2. _score_won/_score_lost — exact and substring matches; no false positives
3. Classification    — won/lost/open grouping, ambiguity resolution
4. Stage ordering    — pipeline-hint ordering, won/lost always at end
5. Confidence        — high/low threshold logic; questions generated correctly
6. build_proposal()  — full integration with mocked Supabase
   a. Normal pipeline with Bitrix24-style IDs
   b. Generic "WON / SUCCESS / CLOSED_WON" names
   c. Ambiguous stages that trigger questions
   d. No deals → requires_confirmation=True
   e. Mixed DB error → graceful failure

7. Overlap validation — a stage cannot be in both won and lost
"""

import pytest
from unittest.mock import MagicMock
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from revenue.model_builder import (
    _normalize_stage,
    _score_won,
    _score_lost,
    _infer_stage_order,
    build_proposal,
    StageStats,
    WON_CONFIDENCE_THRESHOLD,
    LOST_CONFIDENCE_THRESHOLD,
    RevenueModelProposal,
)


# ===========================================================================
# 1. _normalize_stage
# ===========================================================================

class TestNormalizeStage:

    def test_bitrix_won_prefix(self):
        assert _normalize_stage("C2:WON") == "won"

    def test_bitrix_lose_prefix(self):
        assert _normalize_stage("C2:LOSE") == "lose"

    def test_bitrix_preparation(self):
        assert _normalize_stage("C2:PREPARATION") == "preparation"

    def test_long_bitrix_prefix(self):
        assert _normalize_stage("DT182_1:PROPOSAL") == "proposal"

    def test_uppercase_generic(self):
        assert _normalize_stage("WON") == "won"

    def test_mixed_case_with_spaces(self):
        assert _normalize_stage("Closed Won") == "closed_won"

    def test_dashes(self):
        assert _normalize_stage("CLOSED-WON") == "closed_won"

    def test_punctuation_stripped(self):
        # Parentheses and other special chars removed
        result = _normalize_stage("NEW (Incoming)")
        assert result in ("new_incoming", "new__incoming", "new_incoming_")
        # Key assertion: no parentheses
        assert "(" not in result and ")" not in result

    def test_empty_string(self):
        assert _normalize_stage("") == ""

    def test_none_equivalent(self):
        assert _normalize_stage(None) == ""

    def test_already_normalized(self):
        assert _normalize_stage("proposal") == "proposal"


# ===========================================================================
# 2. _score_won / _score_lost
# ===========================================================================

class TestScoreWon:

    def test_exact_won(self):
        assert _score_won("won") == 1.0

    def test_exact_success(self):
        assert _score_won("success") == 1.0

    def test_exact_closed_won(self):
        assert _score_won("closed_won") == 1.0

    def test_bitrix_normalized_won(self):
        # After _normalize_stage("C2:WON") → "won"
        assert _score_won("won") == 1.0

    def test_substring_won(self):
        # "deal_won_final" contains "won" → high score
        score = _score_won("deal_won_final")
        assert score >= WON_CONFIDENCE_THRESHOLD

    def test_no_match(self):
        assert _score_won("preparation") == 0.0

    def test_lost_does_not_score_won(self):
        assert _score_won("lost") == 0.0

    def test_empty(self):
        assert _score_won("") == 0.0


class TestScoreLost:

    def test_exact_lost(self):
        assert _score_lost("lost") == 1.0

    def test_exact_lose(self):
        assert _score_lost("lose") == 1.0

    def test_exact_closed_lost(self):
        assert _score_lost("closed_lost") == 1.0

    def test_exact_cancelled(self):
        assert _score_lost("cancelled") == 1.0

    def test_exact_rejected(self):
        assert _score_lost("rejected") == 1.0

    def test_exact_disqualified(self):
        assert _score_lost("disqualified") == 1.0

    def test_substring_lost(self):
        score = _score_lost("deal_lost_archived")
        assert score >= LOST_CONFIDENCE_THRESHOLD

    def test_no_match(self):
        assert _score_lost("proposal") == 0.0

    def test_won_does_not_score_lost(self):
        assert _score_lost("won") == 0.0


# ===========================================================================
# 3. _infer_stage_order
# ===========================================================================

class TestInferStageOrder:

    def _make(self, value: str, count: int = 10) -> StageStats:
        from revenue.model_builder import _normalize_stage, _score_won, _score_lost
        norm = _normalize_stage(value)
        return StageStats(
            value=value,
            normalized=norm,
            count=count,
            won_score=_score_won(norm),
            lost_score=_score_lost(norm),
        )

    def test_open_before_won_before_lost(self):
        new = self._make("NEW")
        proposal = self._make("PROPOSAL")
        won = self._make("WON")
        lost = self._make("LOST")
        order = _infer_stage_order(
            open_stages=[new, proposal],
            won_stages=[won],
            lost_stages=[lost],
        )
        assert order.index("NEW") < order.index("PROPOSAL")
        assert order.index("PROPOSAL") < order.index("WON")
        assert order.index("WON") < order.index("LOST")

    def test_bitrix_stage_ids_ordered(self):
        """Bitrix IDs normalized to keyword vocab should still sort correctly."""
        stages = [
            self._make("C2:NEW"),
            self._make("C2:PREPARATION"),
            self._make("C2:WON"),
        ]
        new_s = stages[0]
        prep_s = stages[1]
        won_s = stages[2]
        order = _infer_stage_order(
            open_stages=[new_s, prep_s],
            won_stages=[won_s],
            lost_stages=[],
        )
        assert order.index("C2:NEW") < order.index("C2:PREPARATION")
        assert order.index("C2:PREPARATION") < order.index("C2:WON")

    def test_empty_lists(self):
        assert _infer_stage_order([], [], []) == []

    def test_unknown_stages_placed_before_won_lost(self):
        unknown = self._make("SOME_CUSTOM_STAGE")
        won = self._make("WON")
        order = _infer_stage_order([unknown], [won], [])
        assert order.index("SOME_CUSTOM_STAGE") < order.index("WON")


# ===========================================================================
# 4. build_proposal — integration with mocked Supabase
# ===========================================================================

def _mock_supabase_with_deals(stage_list: list[str]):
    """
    Return a minimal Supabase mock that yields crm_deals rows
    with stage values taken from stage_list.
    """
    mock = MagicMock()
    rows = [{"stage": s} for s in stage_list]

    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.limit.return_value = chain
    chain.upsert.return_value = chain
    chain.execute.return_value = MagicMock(data=rows)
    mock.table.return_value = chain
    return mock


def _mock_supabase_empty():
    return _mock_supabase_with_deals([])


def _mock_supabase_error():
    mock = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.execute.side_effect = Exception("DB connection refused")
    mock.table.return_value = chain
    return mock


class TestBuildProposalBitrix:
    """Bitrix24-style prefixed stage IDs."""

    STAGES = (
        ["C2:NEW"] * 80
        + ["C2:PREPARATION"] * 40
        + ["C2:QUOTE"] * 20
        + ["C2:WON"] * 30
        + ["C2:LOSE"] * 10
    )

    @pytest.mark.asyncio
    async def test_won_stage_correctly_identified(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert "C2:WON" in proposal.won_stage_values, (
            f"C2:WON must be classified as WON. won={proposal.won_stage_values}"
        )

    @pytest.mark.asyncio
    async def test_lost_stage_correctly_identified(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert "C2:LOSE" in proposal.lost_stage_values, (
            f"C2:LOSE must be classified as LOST. lost={proposal.lost_stage_values}"
        )

    @pytest.mark.asyncio
    async def test_open_stages_not_in_won_or_lost(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        for stage in ("C2:NEW", "C2:PREPARATION", "C2:QUOTE"):
            assert stage not in proposal.won_stage_values
            assert stage not in proposal.lost_stage_values

    @pytest.mark.asyncio
    async def test_total_deals_correct(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.total_deals == len(self.STAGES)

    @pytest.mark.asyncio
    async def test_stage_order_contains_all_stages(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        distinct = {"C2:NEW", "C2:PREPARATION", "C2:QUOTE", "C2:WON", "C2:LOSE"}
        assert set(proposal.stage_order) == distinct

    @pytest.mark.asyncio
    async def test_confidence_high_for_clear_bitrix_stages(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.confidence_json["won_classification"] >= WON_CONFIDENCE_THRESHOLD
        assert proposal.confidence_json["lost_classification"] >= LOST_CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_no_won_lost_questions_when_confident(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        question_ids = {q["id"] for q in proposal.questions}
        # Stage_order question is always present — that's fine.
        assert "won_stages" not in question_ids, (
            "No won_stages question expected when confidence >= threshold"
        )
        assert "lost_stages" not in question_ids, (
            "No lost_stages question expected when confidence >= threshold"
        )

    @pytest.mark.asyncio
    async def test_requires_confirmation_false_when_both_identified(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.requires_confirmation is False


class TestBuildProposalGenericNames:
    """Standard English stage names: WON, SUCCESS, CLOSED_WON, LOST."""

    STAGES = (
        ["NEW"] * 50
        + ["CONTACTED"] * 30
        + ["PROPOSAL"] * 20
        + ["NEGOTIATION"] * 15
        + ["WON"] * 25
        + ["CLOSED_WON"] * 5
        + ["SUCCESS"] * 5
        + ["LOST"] * 10
        + ["CANCELLED"] * 3
    )

    @pytest.mark.asyncio
    async def test_all_won_variants_classified(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "hubspot")
        for stage in ("WON", "CLOSED_WON", "SUCCESS"):
            assert stage in proposal.won_stage_values, (
                f"'{stage}' must be classified as WON"
            )

    @pytest.mark.asyncio
    async def test_all_lost_variants_classified(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "hubspot")
        for stage in ("LOST", "CANCELLED"):
            assert stage in proposal.lost_stage_values, (
                f"'{stage}' must be classified as LOST"
            )

    @pytest.mark.asyncio
    async def test_pipeline_stages_are_open(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "hubspot")
        for stage in ("NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION"):
            assert stage in proposal.open_stage_values

    @pytest.mark.asyncio
    async def test_requires_confirmation_false(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "hubspot")
        assert proposal.requires_confirmation is False


class TestBuildProposalAmbiguous:
    """Ambiguous stage names — should generate clarification questions."""

    # Purely custom stage names with no vocabulary match
    STAGES = (
        ["INITIAL"] * 40
        + ["IN_PROGRESS"] * 30
        + ["DEAL_DONE"] * 20       # unclear — "done" is not in vocabulary
        + ["PENDING_APPROVAL"] * 10
        + ["ARCHIVED"] * 5          # unclear
    )

    @pytest.mark.asyncio
    async def test_no_stages_auto_classified_as_won(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "zoho")
        # None of these should confidently match WON
        assert len(proposal.won_stage_values) == 0

    @pytest.mark.asyncio
    async def test_won_question_generated(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "zoho")
        question_ids = {q["id"] for q in proposal.questions}
        assert "won_stages" in question_ids

    @pytest.mark.asyncio
    async def test_lost_question_generated(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "zoho")
        question_ids = {q["id"] for q in proposal.questions}
        assert "lost_stages" in question_ids

    @pytest.mark.asyncio
    async def test_requires_confirmation_true(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "zoho")
        assert proposal.requires_confirmation is True

    @pytest.mark.asyncio
    async def test_question_options_include_all_stages(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "zoho")
        won_q = next(q for q in proposal.questions if q["id"] == "won_stages")
        option_values = {o["value"] for o in won_q["options"]}
        expected = {"INITIAL", "IN_PROGRESS", "DEAL_DONE", "PENDING_APPROVAL", "ARCHIVED"}
        assert expected == option_values


class TestBuildProposalNoDeals:
    """No deals synced — should return gracefully with requires_confirmation=True."""

    @pytest.mark.asyncio
    async def test_returns_proposal_not_exception(self):
        mock_sb = _mock_supabase_empty()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert isinstance(proposal, RevenueModelProposal)

    @pytest.mark.asyncio
    async def test_total_deals_zero(self):
        mock_sb = _mock_supabase_empty()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.total_deals == 0

    @pytest.mark.asyncio
    async def test_requires_confirmation_true(self):
        mock_sb = _mock_supabase_empty()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.requires_confirmation is True

    @pytest.mark.asyncio
    async def test_rationale_explains_missing_data(self):
        mock_sb = _mock_supabase_empty()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.rationale_json.get("stage")


class TestBuildProposalDBError:
    """Database query fails — should return gracefully."""

    @pytest.mark.asyncio
    async def test_returns_proposal_not_exception(self):
        mock_sb = _mock_supabase_error()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert isinstance(proposal, RevenueModelProposal)

    @pytest.mark.asyncio
    async def test_requires_confirmation_true(self):
        mock_sb = _mock_supabase_error()
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        assert proposal.requires_confirmation is True


# ===========================================================================
# 5. Overlap validation (unit — mirrors server-layer guard)
# ===========================================================================

class TestOverlapValidation:
    """
    Verify that the overlap-detection logic (mirrored in the API endpoint)
    correctly identifies stages that are in both won and lost.
    """

    def _check_overlap(self, won: list, lost: list) -> set:
        return set(won) & set(lost)

    def test_no_overlap_clean(self):
        assert self._check_overlap(["WON", "SUCCESS"], ["LOST", "CANCELLED"]) == set()

    def test_single_overlap(self):
        overlap = self._check_overlap(["WON", "PENDING"], ["LOST", "PENDING"])
        assert overlap == {"PENDING"}

    def test_multiple_overlaps(self):
        overlap = self._check_overlap(["WON", "A", "B"], ["LOST", "A", "B"])
        assert overlap == {"A", "B"}

    def test_complete_overlap(self):
        overlap = self._check_overlap(["WON"], ["WON"])
        assert overlap == {"WON"}


# ===========================================================================
# 6. Stage stats are sorted by count descending in proposal
# ===========================================================================

class TestStageStatsSorting:

    STAGES = ["WON"] * 100 + ["NEW"] * 50 + ["LOST"] * 10

    @pytest.mark.asyncio
    async def test_highest_count_first(self):
        mock_sb = _mock_supabase_with_deals(self.STAGES)
        proposal = await build_proposal(mock_sb, "t1", "bitrix24")
        counts = [s["count"] for s in proposal.stage_stats]
        assert counts == sorted(counts, reverse=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
