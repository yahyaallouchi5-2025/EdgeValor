# -*- coding: utf-8 -*-
"""Test dell'archivio pubblico dei report COT (cot_radar/archivio_cot.py)."""
import os
import tempfile
import unittest

from cot_radar import archivio_cot as A

DATI = {"assets": {"GOLD": {"group": "Metalli", "it": "Oro", "label": "STRONG BUY", "score": 55.0, "new": True,
                            "prev_label": "NEUTRO", "date": "2026-11-10"},
                   "COFFEE": {"group": "Soft", "it": "Caffe'", "label": "NEUTRO", "score": 3.0, "prev_label": "SELL",
                              "date": "2026-11-10"}}, "pairs": []}
HOME = "<html><head><title>x</title><style></style></head><body><footer><a href=\"faq/\">F</a></footer></body></html>"


class TestArchivioCot(unittest.TestCase):
    def test_salva_una_volta_sola(self):
        with tempfile.TemporaryDirectory() as c:
            self.assertEqual(A.salva(DATI, c), "2026-11-10")
            self.assertIsNone(A.salva(DATI, c))              # mai riscritta
            self.assertEqual(A.settimane(c)[0]["chiusi"][0]["nome"], "Caffe'")

    def test_pagine(self):
        with tempfile.TemporaryDirectory() as c, tempfile.TemporaryDirectory() as sito:
            A.salva(DATI, c)
            url = A.crea(sito, HOME, c)
            self.assertEqual(len(url), 2)
            h = open(os.path.join(sito, "cot", "2026-11-10", "index.html"), encoding="utf-8").read()
            self.assertIn("Forte rialzo", h)
            self.assertIn("Caffè", h)
            self.assertIn('href="/faq/"', h)                 # collegamenti del piede resi assoluti

    def test_senza_settimane(self):
        with tempfile.TemporaryDirectory() as c:
            self.assertEqual(A.crea(c, HOME, os.path.join(c, "vuota")), [])


if __name__ == "__main__":
    unittest.main()
