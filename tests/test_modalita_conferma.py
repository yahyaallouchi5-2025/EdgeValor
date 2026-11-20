# -*- coding: utf-8 -*-
"""v8.40 conferma dei cambi della modalita' di mercato (cot_radar/modalita.py)."""
import unittest

from cot_radar import modalita as M


class TestConferma(unittest.TestCase):
    def test_ritorno_lampo_ignorato(self):
        g = ["NORMALE"] * 10 + ["PESSIMISMO"] * 3 + ["NORMALE"] * 10
        c = M.confermati(g, 7)
        self.assertEqual([x[2] for x in c], ["NORMALE"])          # 3 giorni di pessimismo: nessun cambio

    def test_cambio_confermato(self):
        g = ["NORMALE"] * 10 + ["PESSIMISMO"] * 8
        c = M.confermati(g, 7)
        self.assertEqual(c[-1], (10, 16, "PESSIMISMO"))           # inizia il giorno 10, confermato il 16


if __name__ == "__main__":
    unittest.main()
