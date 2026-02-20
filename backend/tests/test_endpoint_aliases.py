"""
Phase 3 Tests — Endpoint Aliases
=================================
Tests that new /dashboard/analytics/* endpoints exist and old /revenue/* routes
return deprecation headers. Also tests chat suggestions endpoint.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def app():
    """Import the FastAPI app."""
    from server import app
    return app


@pytest.fixture(scope="module")
def routes(app):
    """Extract all route paths from the app."""
    paths = set()
    for route in app.routes:
        if hasattr(route, "path"):
            paths.add(route.path)
    return paths


class TestEndpointAliasesExist:
    """Verify new /api/dashboard/analytics/* routes are registered."""

    def test_analytics_overview_exists(self, routes):
        assert "/api/dashboard/analytics/overview" in routes

    def test_analytics_alerts_exists(self, routes):
        assert "/api/dashboard/analytics/alerts" in routes

    def test_analytics_recompute_exists(self, routes):
        assert "/api/dashboard/analytics/recompute" in routes

    def test_analytics_alert_dismiss_exists(self, routes):
        assert "/api/dashboard/analytics/alerts/{alert_id}/dismiss" in routes

    def test_legacy_revenue_overview_still_exists(self, routes):
        assert "/api/revenue/overview" in routes

    def test_legacy_revenue_alerts_still_exists(self, routes):
        assert "/api/revenue/alerts" in routes

    def test_legacy_revenue_recompute_still_exists(self, routes):
        assert "/api/revenue/recompute" in routes

    def test_legacy_revenue_dismiss_still_exists(self, routes):
        assert "/api/revenue/alerts/{alert_id}/dismiss" in routes


class TestChatSuggestionsEndpointExists:
    """Verify /api/dashboard/chat/suggestions is registered."""

    def test_suggestions_route_exists(self, routes):
        assert "/api/dashboard/chat/suggestions" in routes


class TestDeprecationHeaders:
    """Test that _DEPRECATION_HEADERS dict has correct structure."""

    def test_deprecation_headers_defined(self):
        from server import _DEPRECATION_HEADERS
        assert _DEPRECATION_HEADERS["Deprecation"] == "true"
        assert "2026-04-01" in _DEPRECATION_HEADERS["Sunset"]


class TestSharedHandlerFunctions:
    """Test that shared _do_* functions are importable (exist)."""

    def test_do_recompute_exists(self):
        from server import _do_recompute
        assert callable(_do_recompute)

    def test_do_overview_exists(self):
        from server import _do_overview
        assert callable(_do_overview)

    def test_do_alerts_list_exists(self):
        from server import _do_alerts_list
        assert callable(_do_alerts_list)

    def test_do_alert_dismiss_exists(self):
        from server import _do_alert_dismiss
        assert callable(_do_alert_dismiss)


class TestChatSuggestionHelpers:
    """Test _build_chat_suggestions and _build_intro_message helpers."""

    def test_build_chat_suggestions_with_labels(self):
        from server import _build_chat_suggestions
        labels = {"deals": "Properties", "leads": "Inquiries"}
        suggestions = _build_chat_suggestions(labels, ["Pipeline Value"], 2)
        assert len(suggestions) > 0
        texts = [s["text"] for s in suggestions]
        # Should reference the entity labels
        assert any("Properties" in t for t in texts)
        assert any("Inquiries" in t for t in texts)

    def test_build_chat_suggestions_with_alerts(self):
        from server import _build_chat_suggestions
        suggestions = _build_chat_suggestions({}, [], 5)
        texts = [s["text"] for s in suggestions]
        assert any("risk" in t.lower() for t in texts)

    def test_build_chat_suggestions_without_alerts(self):
        from server import _build_chat_suggestions
        suggestions = _build_chat_suggestions({}, [], 0)
        texts = [s["text"] for s in suggestions]
        assert any("recommendation" in t.lower() or "improvement" in t.lower() for t in texts)

    def test_build_intro_message_unknown_type(self):
        from server import _build_intro_message
        msg = _build_intro_message({}, "unknown")
        assert "Bobur" in msg
        assert "Analytics" in msg

    def test_build_intro_message_with_labels(self):
        from server import _build_intro_message
        msg = _build_intro_message(
            {"deals": "Properties", "leads": "Inquiries"},
            "real_estate"
        )
        assert "properties" in msg.lower()
        assert "inquiries" in msg.lower()

    def test_suggestions_capped_at_4(self):
        from server import _build_chat_suggestions
        suggestions = _build_chat_suggestions(
            {"deals": "Deals", "leads": "Leads"},
            ["M1", "M2", "M3"],
            3,
        )
        assert len(suggestions) <= 4
