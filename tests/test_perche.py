# -*- coding: utf-8 -*-
"""v8.74 il "perche'" dei segnali (cot_radar/perche.py): seduta giusta per ogni annuncio, valute, giorno peggiore."""
import os
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import perche as P  # noqa: E402


def u(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)


# annunci finti: Fed mercoledi' 18:00 UTC (14:00 New York), BCE giovedi' 13:15 UTC, RBNZ mercoledi' 01:00 UTC
LISTA = [(u("2026-10-28T01:00"), "RBNZ", "NZD"), (u("2026-10-28T18:00"), "Fed", "USD"),
         (u("2026-10-29T13:15"), "BCE", "EUR")]
# percorso: ingresso lunedi' 26/10, poi 27, 28, 29, 30 (risultato cumulato del trade in %)
M = {"stato": "ok", "ingresso": {"data": "2026-10-26"}, "cls": "fx",
     "G": [[0.2, .2, 0], [-0.5, .2, -.5], [-0.1, .2, -.5], [0.4, .4, -.5]],
     "Gd": ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"], "A": {"fine": {"data": "2026-10-30"}}}


class TestPerche(unittest.TestCase):
    def test_coppia_con_dollaro(self):
        r = P.notizie_segnale({"strumento": "EURUSD"}, M, LISTA)
        # cambi chiusi alle 12 di New York (16 UTC): la Fed delle 14 entra nella seduta del 29/10, come la BCE delle 13:15 UTC
        self.assertEqual([(e["n"], e["k"]) for e in r["ev"]], [("Fed", 3), ("BCE", 3)])
        self.assertAlmostEqual(r["ev"][0]["m"], 0.4)              # -0,1 - (-0,5)
        self.assertEqual(r["pg"], {"k": 2, "d": "2026-10-28", "m": -0.7, "ev": []})

    def test_valute_della_coppia(self):
        r = P.notizie_segnale({"strumento": "NZDJPY", "base": "NZD", "quote": "JPY"}, M, LISTA)
        self.assertEqual([e["n"] for e in r["ev"]], ["RBNZ"])      # niente Fed ne' BCE
        self.assertEqual(r["pg"]["ev"], ["RBNZ"])                   # il giorno peggiore e' quello della RBNZ
        self.assertEqual(P.valute("GOLD"), {"USD"})

    def test_indice_chiude_alle_16(self):
        m = dict(M, cls="indici")
        r = P.notizie_segnale({"strumento": "SP500"}, m, LISTA)
        self.assertEqual([(e["n"], e["k"]) for e in r["ev"]], [("Fed", 2)])   # 14:00 < 16:00: stessa seduta

    def test_fino_all_uscita_e_casi_vuoti(self):
        m = dict(M, A={"fine": {"data": "2026-10-28"}})
        r = P.notizie_segnale({"strumento": "EURUSD"}, m, LISTA)
        self.assertEqual(r["ev"], [])                                # Fed e BCE dopo l'uscita
        self.assertIsNone(P.notizie_segnale({"strumento": "EURUSD"}, {"stato": "in attesa"}, LISTA))
        tutto_a_favore = dict(M, G=[[.1, .1, 0], [.2, .2, 0], [.3, .3, 0], [.4, .4, 0]])
        self.assertIsNone(P.notizie_segnale({"strumento": "EURUSD"}, tutto_a_favore, LISTA)["pg"])

    def test_calendario_vero(self):
        L = P.annunci()
        nomi = {n for t, n, v in L if t.year == 2026 and t.month in (10, 11)}
        self.assertTrue({"Fed", "BCE", "BoE", "BoJ", "BoC", "RBA", "RBNZ", "NFP USA"} <= nomi)
        self.assertEqual(L, sorted(L))


if __name__ == "__main__":
    unittest.main()
