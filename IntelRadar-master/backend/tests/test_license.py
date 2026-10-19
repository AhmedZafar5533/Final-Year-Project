"""Trial counting, offline grace and license activation."""

import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app.core import licensing


class FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload
        self.called_with = None

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class LicenseTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.license_file = Path(self.temp_dir.name) / "license.json"

        for name, value in (
            ("LICENSE_FILE", self.license_file),
            ("TRIAL_SCANS", 5),
            ("BYPASS", False),
            ("OFFLINE_GRACE_DAYS", 14),
        ):
            patcher = patch.object(licensing, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def fake_response(self, payload: dict) -> FakeResponse:
        patcher = patch.object(licensing.httpx, "post", return_value=FakeResponse(payload))
        self.addCleanup(patcher.stop)
        return patcher.start()

    def test_trial_counts_down_and_then_blocks(self):
        self.assertTrue(licensing.status()["can_scan"])
        self.assertEqual(licensing.status()["trial_remaining"], 5)

        for remaining in (4, 3, 2, 1, 0):
            licensing.record_scan()
            self.assertEqual(licensing.status()["trial_remaining"], remaining)

        self.assertFalse(licensing.status()["can_scan"])
        self.assertFalse(licensing.can_scan())

    def test_activation_persists_and_unlocks(self):
        self.fake_response(
            {
                "valid": True,
                "license_key": {"status": "active", "product_id": 42, "store_id": 7},
            }
        )

        result = licensing.activate("LICENSE-ABCD")
        self.assertTrue(result["licensed"])
        self.assertTrue(result["can_scan"])
        self.assertEqual(result["license_key_hint"], "…ABCD")

        stored = json.loads(self.license_file.read_text(encoding="utf-8"))
        self.assertEqual(stored["license_key"], "LICENSE-ABCD")
        self.assertTrue(stored["valid"])

        # Licensed scans do not consume trial credit.
        licensing.record_scan()
        self.assertEqual(licensing.status()["trial_used"], 0)

    def test_invalid_key_raises_and_stores_nothing(self):
        self.fake_response({"valid": False, "error": "not found"})

        with self.assertRaises(licensing.LicenseError):
            licensing.activate("BAD-KEY")

        self.assertFalse(self.license_file.exists())

    def test_offline_grace_expires(self):
        def write_state(days_ago: int) -> None:
            timestamp = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            self.license_file.write_text(
                json.dumps(
                    {
                        "license_key": "LICENSE-ABCD",
                        "valid": True,
                        "last_validated_at": timestamp,
                    }
                ),
                encoding="utf-8",
            )

        write_state(2)
        self.assertTrue(licensing.status()["licensed"])

        write_state(20)
        self.assertFalse(licensing.status()["licensed"])
        # The trial is still available even though the license expired.
        self.assertTrue(licensing.status()["can_scan"])

    def test_bypass_unlocks_everything(self):
        with patch.object(licensing, "BYPASS", True):
            self.assertTrue(licensing.status()["licensed"])
            self.assertTrue(licensing.status()["can_scan"])
            self.assertTrue(licensing.status()["bypass"])

    def test_deactivate_removes_key_but_keeps_trial_usage(self):
        self.fake_response({"valid": True, "license_key": {"status": "active"}})
        licensing.activate("LICENSE-ABCD")
        licensing.record_scan()  # no-op while licensed

        result = licensing.deactivate()
        self.assertFalse(result["licensed"])
        self.assertEqual(result["license_key_hint"], "")
        self.assertNotIn("license_key", json.loads(self.license_file.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
