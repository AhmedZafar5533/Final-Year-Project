"""Tests for the persisted settings API and its in-process application."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.settings import router
from app.core import config
from app.core import settings as settings_module

CONFIG_KEYS = (
    "GEMINI_API_KEY",
    "DEFAULT_MODEL",
    "ANALYSIS_MODELS",
    "BROWSER_AGENT_MODEL",
    "MONITOR_ENABLED",
    "MONITOR_INTERVAL_MINUTES",
    "ALERT_URLS",
)


class SettingsApiTests(unittest.TestCase):
    def setUp(self):
        self.originals = {key: getattr(config, key) for key in CONFIG_KEYS}
        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_file = Path(self.temp_dir.name) / "settings.json"

        patches = [
            patch.object(settings_module, "SETTINGS_FILE", self.settings_file),
            patch("app.api.routes.settings.SETTINGS_FILE", self.settings_file),
            patch("app.api.routes.settings.save_persisted", settings_module.save_persisted),
            # Monitoring must not actually start inside the test loop.
            patch("app.api.routes.settings.scheduler.reload"),
        ]
        for patcher in patches:
            patcher.start()
            self.addCleanup(patcher.stop)

        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app)

    def tearDown(self):
        for key, value in self.originals.items():
            setattr(config, key, value)
        self.temp_dir.cleanup()

    def test_get_never_returns_the_key(self):
        response = self.client.put(
            "/api/settings", json={"gemini_api_key": "AIza-secret-abcd"}
        )
        self.assertEqual(response.status_code, 200)

        payload = self.client.get("/api/settings").json()
        self.assertTrue(payload["gemini_api_key_set"])
        self.assertTrue(payload["gemini_api_key_hint"].endswith("abcd"))
        self.assertNotIn("gemini_api_key", payload)
        self.assertNotIn("AIza-secret-abcd", json.dumps(payload))

    def test_update_persists_and_applies_immediately(self):
        response = self.client.put(
            "/api/settings",
            json={
                "gemini_api_key": "AIza-new-key-1234",
                "gemini_model": "gemini-2.0-flash",
                "monitor_enabled": True,
                "monitor_interval_minutes": 60,
                "alert_urls": ["discord://webhook/x", " "],
            },
        )
        self.assertEqual(response.status_code, 200)

        self.assertEqual(config.GEMINI_API_KEY, "AIza-new-key-1234")
        self.assertEqual(config.DEFAULT_MODEL, "gemini-2.0-flash")
        self.assertEqual(config.ANALYSIS_MODELS[0], "gemini-2.0-flash")
        self.assertTrue(config.MONITOR_ENABLED)
        self.assertEqual(config.MONITOR_INTERVAL_MINUTES, 60)
        self.assertEqual(config.ALERT_URLS, ["discord://webhook/x"])

        stored = json.loads(self.settings_file.read_text(encoding="utf-8"))
        self.assertEqual(stored["GEMINI_API_KEY"], "AIza-new-key-1234")
        self.assertEqual(stored["MONITOR_INTERVAL_MINUTES"], 60)

    def test_clearing_the_key_is_allowed(self):
        self.client.put("/api/settings", json={"gemini_api_key": "AIza-something"})
        response = self.client.put("/api/settings", json={"gemini_api_key": ""})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(config.GEMINI_API_KEY, "")
        self.assertFalse(response.json()["gemini_api_key_set"])

    def test_interval_outside_bounds_is_rejected(self):
        for minutes in (5, 20_000):
            response = self.client.put(
                "/api/settings", json={"monitor_interval_minutes": minutes}
            )
            self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
