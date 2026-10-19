"""Regression tests for market-segment scoped comparisons.

Run from ``backend/``:

    .venv/bin/python -m unittest discover -s tests -v

These cover the bug where unrelated companies (e.g. an LLM platform and a
meal-kit service) were plotted together because the compare endpoint fell
back to the first three tracked competitors.
"""

import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.compare import router
from app.services.segments import normalize, segment_key

ITEMS = [
    {
        "id": "openai",
        "competitor_name": "OpenAI",
        "segment": "llm-platforms",
        "category": "Artificial Intelligence",
        "radar_metrics": {"feature_depth": 90},
    },
    {
        "id": "anthropic",
        "competitor_name": "Anthropic",
        "segment": "llm-platforms",
        "category": "Artificial Intelligence",
        "radar_metrics": {"feature_depth": 85},
    },
    {
        "id": "gousto",
        "competitor_name": "Gousto",
        "segment": "meal-kit-delivery",
        "category": "Meal Kit Delivery",
        "radar_metrics": {"feature_depth": 60},
    },
    {
        "id": "legacy-openai",
        "competitor_name": "Legacy OpenAI",
        # No segment: falls back to the normalised category.
        "category": "LLM Platforms",
        "radar_metrics": {"feature_depth": 80},
    },
    {
        "id": "uncategorised",
        "competitor_name": "Uncategorised",
        # Neither segment nor category: must never pair with anything.
        "radar_metrics": {"feature_depth": 50},
    },
]


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class SegmentKeyTests(unittest.TestCase):
    def test_prefers_segment(self):
        self.assertEqual(segment_key({"segment": "LLM Platforms"}), "llm-platforms")

    def test_falls_back_to_category(self):
        self.assertEqual(segment_key({"category": "Meal Kit Delivery"}), "meal-kit-delivery")

    def test_empty_when_missing(self):
        self.assertEqual(segment_key({}), "")

    def test_normalize_trims_punctuation(self):
        self.assertEqual(normalize("  AI, SaaS & Research!  "), "ai-saas-research")


# Arbitrary, made-up markets. Nothing in the code knows these strings exist —
# the grouping is purely "same normalised key", so any category works.
GENERIC_ITEMS = [
    {
        "id": "nebula",
        "competitor_name": "Nebula",
        "segment": "quantum-computing",
        "radar_metrics": {"feature_depth": 70},
    },
    {
        "id": "qubit-co",
        "competitor_name": "Qubit Co",
        # Different casing/spacing normalises to the same key.
        "segment": "Quantum Computing",
        "radar_metrics": {"feature_depth": 65},
    },
    {
        "id": "pawpantry",
        "competitor_name": "PawPantry",
        # Category-only legacy profile, no segment field.
        "category": "Pet Food Delivery",
        "radar_metrics": {"feature_depth": 55},
    },
    {
        "id": "woofbox",
        "competitor_name": "WoofBox",
        "category": "pet-food-delivery",
        "radar_metrics": {"feature_depth": 50},
    },
    {
        "id": "tinygame",
        "competitor_name": "TinyGame",
        "category": "Indie Game Engine",
        "radar_metrics": {"feature_depth": 40},
    },
]


class GenericTaxonomyTests(unittest.TestCase):
    """Proves there is no hardcoded category allow-list."""

    def setUp(self):
        self.client = make_client()
        patcher = patch(
            "app.api.routes.compare.get_all_competitors", return_value=GENERIC_ITEMS
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def peers_for(self, competitor_id):
        response = self.client.post("/api/compare", json={"competitor_ids": [competitor_id]})
        self.assertEqual(response.status_code, 200)
        return [c["competitor_name"] for c in response.json()["competitors"]][1:]

    def test_unlisted_segment_groups_on_its_own_key(self):
        self.assertEqual(self.peers_for("nebula"), ["Qubit Co"])

    def test_unlisted_category_groups_without_a_segment_field(self):
        self.assertEqual(self.peers_for("pawpantry"), ["WoofBox"])

    def test_single_member_market_compares_alone(self):
        self.assertEqual(self.peers_for("tinygame"), [])


class CompareScopeTests(unittest.TestCase):
    def setUp(self):
        self.client = make_client()
        patcher = patch("app.api.routes.compare.get_all_competitors", return_value=ITEMS)
        patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, **body):
        response = self.client.post("/api/compare", json=body)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_only_same_segment_peers_are_compared(self):
        data = self.post(competitor_ids=["openai"])
        names = [c["competitor_name"] for c in data["competitors"]]

        self.assertIn("OpenAI", names)
        self.assertIn("Anthropic", names)
        self.assertNotIn("Gousto", names)
        self.assertEqual(data["segment"], "llm-platforms")

    def test_legacy_category_fallback_groups_like_for_like(self):
        data = self.post(competitor_ids=["legacy-openai"])
        names = [c["competitor_name"] for c in data["competitors"]]

        # "LLM Platforms" normalises to the same key as the canonical segment.
        self.assertEqual(data["segment"], "llm-platforms")
        self.assertIn("OpenAI", names)
        self.assertNotIn("Gousto", names)

    def test_empty_segment_never_matches_other_empty_segments(self):
        data = self.post(competitor_ids=["uncategorised"])
        self.assertEqual([c["competitor_name"] for c in data["competitors"]], ["Uncategorised"])

    def test_unknown_ids_return_nothing(self):
        data = self.post(competitor_ids=["does-not-exist"])
        self.assertEqual(data["competitors"], [])
        self.assertEqual(data["radar_data"], [])

    def test_scope_all_opts_into_cross_segment_comparison(self):
        data = self.post(competitor_ids=["openai"], scope="all")
        names = [c["competitor_name"] for c in data["competitors"]]
        self.assertIn("Gousto", names)

    def test_series_are_capped(self):
        data = self.post(competitor_ids=["openai"], scope="all")
        self.assertLessEqual(len(data["competitors"]), 3)


if __name__ == "__main__":
    unittest.main()
