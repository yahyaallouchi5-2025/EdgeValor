# -*- coding: utf-8 -*-
"""v8.75 file mensili delle candele orarie per la scheda Live (stagionalita_orari.candele_mensili)."""
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import stagionalita_orari as S  # noqa: E402


def ts(s):
    return int(datetime.strptime(s, "%Y-%m-%d %H").replace(tzinfo=timezone.utc).timestamp())


class TestCandele(unittest.TestCase):
    def test_mesi_e_formato(self):
        ore = {ts("2026-08-31 23"): [1, 2, 0.5, 1.5, 60],          # prima del registro: esclusa
               ts("2026-10-31 23"): [1.123456789, 1.2, 1.1, 1.15, 60],
               ts("2026-11-02 01"): [2, 3, 1, 2.5, 60]}
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(S.candele_mensili("EURUSD.FOREX", ore, d), 2)
            cart = os.path.join(d, "h1", "EURUSD.FOREX")
            self.assertEqual(sorted(os.listdir(cart)), ["2026-10.json", "2026-11.json"])
            ott = json.load(open(os.path.join(cart, "2026-10.json")))
            self.assertEqual(ott["t0"], ts("2026-10-01 00"))
            self.assertEqual(ott["b"], [[30 * 24 + 23, 1.12346, 1.2, 1.1, 1.15]])   # ore dall'inizio del mese, 6 cifre
            nov = json.load(open(os.path.join(cart, "2026-11.json")))
            self.assertEqual(nov["b"][0][0], 25)

    def test_vuoto(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(S.candele_mensili("X.US", {}, d), 0)
            self.assertFalse(os.path.exists(os.path.join(d, "h1")))


if __name__ == "__main__":
    unittest.main()
