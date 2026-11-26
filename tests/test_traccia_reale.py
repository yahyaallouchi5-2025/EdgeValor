# -*- coding: utf-8 -*-
"""v9.41 traccia reale della home: solo mesi chiusi, rendimento mese per mese e totale, S&P 500 sullo stesso tratto."""
import unittest

from cot_radar import portafogli as P

C = [("2026-11-02", 100), ("2026-11-30", 101), ("2026-12-01", 101.5), ("2026-12-31", 100.5), ("2027-01-05", 101)]
SP = [("2026-10-30", 50), ("2026-11-02", 50), ("2026-11-30", 51), ("2026-12-31", 52), ("2027-01-05", 52.5)]


class TracciaReale(unittest.TestCase):
    def test_mesi_chiusi(self):
        r = P.traccia_reale({"moderato": C}, SP, "2026-11-01")
        self.assertEqual(r["mesi"], ["2026-11", "2026-12"])          # gennaio e' ancora aperto: non si mostra
        self.assertEqual(r["profili"]["moderato"], {"tot": 0.5, "r": [1.0, -0.5]})
        self.assertEqual(r["sp"], {"tot": 4.0, "r": [2.0, 2.0]})     # base = giorno della prima rotazione
        self.assertEqual(r["agg"], "2026-12")

    def test_nessun_mese_chiuso(self):
        self.assertIsNone(P.traccia_reale({"moderato": C[:2]}, SP, "2026-11-01"))
        self.assertIsNone(P.traccia_reale({}, SP))


if __name__ == "__main__":
    unittest.main()
