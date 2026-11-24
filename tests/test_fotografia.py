# -*- coding: utf-8 -*-
"""Test di cot_radar/fotografia.py (v9.07): i segnali COT cambiano solo con un report nuovo."""
import shutil
import tempfile
import unittest

from cot_radar import fotografia as F

OK = {"cot": "online", "fred": "online"}


def dati(score_eur, score_gbp):
    lab = lambda s: "BUY" if s >= 25 else "SELL" if s <= -25 else "NEUTRO"
    assets = {"EUR": {"score": score_eur, "label": lab(score_eur), "new": False, "date": "2026-11-17", "prezzo": 1.1},
              "GBP": {"score": score_gbp, "label": lab(score_gbp), "new": False, "date": "2026-11-17"}}
    pairs = [{"base": "GBP", "quote": "USD", "score": score_gbp, "label": lab(score_gbp), "new": False}]
    return assets, pairs


class Fotografia(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.dir)

    def test_segnali_fermi_fino_al_report_dopo(self):
        a, p = dati(30, 10)                                       # venerdi': GBP neutro
        self.assertEqual(F.applica(a, p, "2026-11-17", OK, "2026-11-20T20:40Z", self.dir), "nuova")
        a, p = dati(30, 31)                                       # lunedi': la parte macro spingerebbe GBP a BUY
        a["EUR"]["prezzo"] = 1.2
        self.assertEqual(F.applica(a, p, "2026-11-17", OK, "2026-11-23T22:03Z", self.dir), "applicata")
        self.assertEqual((a["GBP"]["label"], a["GBP"]["score"]), ("NEUTRO", 10))
        self.assertEqual(p[0]["label"], "NEUTRO")
        self.assertEqual(a["EUR"]["prezzo"], 1.2)                 # i dati non del segnale restano quelli di oggi
        a, p = dati(30, 31)                                       # report nuovo: il segnale puo' nascere
        for x in a.values():
            x["date"] = "2026-11-24"
        self.assertEqual(F.applica(a, p, "2026-11-24", OK, "2026-11-30T20:40Z", self.dir), "nuova")
        self.assertEqual(a["GBP"]["label"], "BUY")
        self.assertEqual(F.leggi(self.dir)["cot"], "2026-11-24")

    def test_fonti_incomplete_niente_fotografia(self):
        a, p = dati(30, 10)
        self.assertEqual(F.applica(a, p, "2026-11-17", {"cot": "online", "fred": "manutenzione"}, "x", self.dir), "nessuna")
        self.assertEqual(F.leggi(self.dir), {})

    def test_report_piu_vecchio_non_tocca_la_fotografia(self):
        a, p = dati(30, 10)
        F.applica(a, p, "2026-11-24", OK, "x", self.dir)
        a, p = dati(-30, 10)
        self.assertEqual(F.applica(a, p, "2026-11-17", OK, "y", self.dir), "nessuna")
        self.assertEqual(F.leggi(self.dir)["cot"], "2026-11-24")


if __name__ == "__main__":
    unittest.main()
