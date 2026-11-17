# -*- coding: utf-8 -*-
"""v7.90 controlli di qualita': niente falsi allarmi sulle serie FRED mensili."""
import unittest
from datetime import date, timedelta

from cot_radar.controlli import controlla


class SerieFred(unittest.TestCase):
    def _avvisi(self, fred):
        out = controlla({}, [], fred, {}, {})
        return [x["messaggio"] for x in out if x["fonte"] == "FRED"]

    def test_mensile_non_e_ferma_dopo_sette_giorni(self):
        primo = (date.today() - timedelta(days=45)).isoformat()
        self.assertEqual(self._avvisi({"CPIAUCSL": [[primo, 300.0]]}), [])

    def test_giornaliera_ferma_segnalata(self):
        vecchio = (date.today() - timedelta(days=20)).isoformat()
        self.assertTrue(self._avvisi({"DGS10": [[vecchio, 4.0]]}))


if __name__ == "__main__":
    unittest.main()
