# -*- coding: utf-8 -*-
"""Test di cot_radar/impatto.py (v8.86): reazione oraria del prezzo alle notizie macro."""
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone

from cot_radar import impatto

T0 = int(datetime(2026, 1, 5, tzinfo=timezone.utc).timestamp())


def serie(giorni=60, mossa=None):
    """Candele orarie 24h: ogni ora +0,01% (normale); mossa = {ts: rendimento} per le ore speciali."""
    ore, c = {}, 100.0
    for h in range(giorni * 24):
        t = T0 + h * 3600
        r = (mossa or {}).get(t, 0.0001 if h % 2 else -0.0001)
        o, c = c, c * (1 + r)
        ore[t] = [o, max(o, c), min(o, c), c, 60]
    return ore


def ann(t, nome="NFP USA", val="USD"):
    return (datetime.fromtimestamp(t, timezone.utc), nome, val)


class Reazioni(unittest.TestCase):
    def test_prima_ora_e_volte_normale(self):
        t = T0 + 40 * 86400 + 13 * 3600                    # candela delle 13:00 UTC
        ore = serie(mossa={t: 0.003})                       # +0,30% contro un'ora normale di 0,01%
        ev = impatto.reazioni(ore, {"USD"}, [ann(t + 30 * 60)])   # notizia alle 13:30
        self.assertEqual(len(ev), 1)
        e = ev[0]
        self.assertEqual(e[0], datetime.fromtimestamp(t + 1800, timezone.utc).strftime("%Y-%m-%dT%H:%MZ"))
        self.assertAlmostEqual(e[2], 0.3, places=2)
        self.assertAlmostEqual(e[5], 30.0, delta=0.6)

    def test_mercato_chiuso_e_valuta_non_pertinente(self):
        t = T0 + 40 * 86400 + 13 * 3600
        ore = serie()
        del ore[t]                                          # nessuna candela all'ora della notizia
        self.assertEqual(impatto.reazioni(ore, {"USD"}, [ann(t + 60)]), [])
        self.assertEqual(impatto.reazioni(serie(), {"USD"}, [ann(t + 60, "BoJ", "JPY")]), [])

    def test_storico_troppo_corto(self):
        t = T0 + 5 * 86400                                  # meno di 30 giorni di storia prima
        self.assertEqual(impatto.reazioni(serie(), {"USD"}, [ann(t)]), [])

    def test_statistiche_e_controllo(self):
        A, mossa = [], {}
        for g in range(31, 70, 3):                          # 13 notizie ogni 3 giorni: prima ora +0,2%, poi prosegue
            t = T0 + g * 86400 + 13 * 3600                  # (non tutti i giorni: l'ora normale resta normale)
            mossa[t] = 0.002
            mossa[t + 3600] = 0.001
            A.append(ann(t))
        ore = serie(75, mossa)
        ev = impatto.reazioni(ore, {"USD"}, A)
        st = impatto.statistiche(ev)
        self.assertEqual(st[0]["n"], "NFP USA")
        self.assertEqual(st[0]["casi"], len(ev))
        self.assertEqual(st[0]["forte"], 100)
        self.assertGreater(st[0]["seg"], 50)
        c = impatto.controllo(ore)
        self.assertTrue(set(c) == {"forte", "seg", "segG"})

    def test_valute_sempre_usa(self):
        self.assertEqual(impatto.valute("EURGBP"), {"EUR", "GBP", "USD"})
        self.assertEqual(impatto.valute("SPY"), {"USD"})

    def test_scrivi_e_indice(self):
        A, mossa = [], {}
        for g in range(31, 59):
            t = T0 + g * 86400 + 13 * 3600
            mossa[t] = -0.002
            A.append(ann(t))
        ore = serie(70, mossa)
        vecchio = impatto.perche.annunci
        impatto.perche.annunci = lambda: A
        try:
            with tempfile.TemporaryDirectory() as d:
                riga = impatto.scrivi("EURUSD.FOREX", "Euro / Dollaro", ore, d)
                impatto.indice([riga, None], d)
                X = json.load(open(os.path.join(d, "impatto", "EURUSD.FOREX.json")))
                I = json.load(open(os.path.join(d, "impatto", "indice.json")))
        finally:
            impatto.perche.annunci = vecchio
        self.assertEqual(len(X["ev"]), 28)
        self.assertEqual(len(X["ev"][0]), 7)
        self.assertEqual(I["sim"][0]["s"], "EURUSD.FOREX")
        self.assertIn("NFP USA", I["sim"][0]["m"])

    def test_pochi_casi_niente_file(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertIsNone(impatto.scrivi("EURUSD.FOREX", "x", serie(), d))
            self.assertFalse(os.path.exists(os.path.join(d, "impatto", "EURUSD.FOREX.json")))


if __name__ == "__main__":
    unittest.main()
