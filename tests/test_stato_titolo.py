# -*- coding: utf-8 -*-
"""Test di cot_radar/stato_titolo.py: euforia (tre condizioni), sconto con e senza cassa, banche escluse."""
import unittest
from datetime import date

from cot_radar import stato_titolo as S


def mesi(valori, fine="2026-11"):
    n = len(valori)
    return [[S._mese(fine, k - n + 1), v] for k, v in enumerate(valori)]


class Stato(unittest.TestCase):
    IDX = {"m": mesi([100.0] * 30)}

    def test_euforia(self):
        # 18 mesi piatti con piccole oscillazioni, poi salita forte e nervosa negli ultimi 6 mesi
        v = [10 + (0.1 if i % 2 else -0.1) for i in range(24)] + [12, 16, 14, 22, 19, 30]
        r = S.calcola({"m": mesi(v)}, self.IDX, oggi=date(2026, 11, 18))
        self.assertEqual(r["k"], "eu")
        self.assertTrue(r["acc"] and r["vs"])

    def test_salita_lenta_non_e_euforia(self):
        v = [10 * 1.04 ** i for i in range(30)]          # +100% e oltre ma regolare: niente accelerazione
        self.assertIsNone(S.calcola({"m": mesi(v)}, self.IDX, oggi=date(2026, 11, 18)))

    def test_sconto(self):
        v = [100.0] * 20 + [80, 60, 50, 45, 40, 38, 35, 33, 32, 30]
        bil = {"anni": [{"fine": "2025-12-31", "fcf": 5e8}]}
        r = S.calcola({"m": mesi(v)}, self.IDX, bil, "ind", date(2026, 11, 18))
        self.assertEqual((r["k"], r["dd"]), ("sc", -70))
        bil["anni"][0]["fcf"] = -1e8
        self.assertEqual(S.calcola({"m": mesi(v)}, self.IDX, bil, "ind", date(2026, 11, 18))["k"], "ss")
        self.assertIsNone(S.calcola({"m": mesi(v)}, self.IDX, bil, "fin", date(2026, 11, 18)))    # banche escluse
        self.assertIsNone(S.calcola({"m": mesi(v)}, self.IDX, None, "ind", date(2026, 11, 18)))   # senza bilancio
        vecchio = {"anni": [{"fine": "2024-12-31", "fcf": 5e8}]}                                  # bilancio troppo vecchio
        self.assertIsNone(S.calcola({"m": mesi(v)}, self.IDX, vecchio, "ind", date(2026, 11, 18)))


if __name__ == "__main__":
    unittest.main()
