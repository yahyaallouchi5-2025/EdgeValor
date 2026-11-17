# -*- coding: utf-8 -*-
"""v7.94 bussola macro di Bitcoin: punteggio, storia per punteggio, copia di riserva."""
import math
import tempfile
import unittest
from datetime import date, timedelta

from cot_radar import btc_macro as B


def giorni(dal, n, f):
    d0 = date.fromisoformat(dal)
    return [((d0 + timedelta(days=i)).isoformat(), f(i)) for i in range(n)]


def serie_finte(nfci_giu=True, dxy_giu=True, hyg_su=True):
    n = 4000                                       # ~11 anni dal 2012
    seg = lambda giu: (lambda i: 100 - i * 0.01) if giu else (lambda i: 100 + i * 0.01)
    return {"btc": giorni("2012-01-01", n, lambda i: 100 * math.exp(i * 0.001)),
            "nfci": giorni("2012-01-01", n, (lambda i: -i * 0.0001) if nfci_giu else (lambda i: i * 0.0001)),
            "dxy": giorni("2012-01-01", n, seg(dxy_giu)), "hyg": giorni("2012-01-01", n, seg(not hyg_su)),
            "spx": giorni("2012-01-01", n, lambda i: 100 + i + 5 * math.sin(i)), "oro": giorni("2012-01-01", n, lambda i: 50 + math.cos(i)),
            "vix": giorni("2012-01-01", n, lambda i: 15.0)}


class Bussola(unittest.TestCase):
    def test_tutto_favorevole_tre_su_tre(self):
        X = B.calcola(serie_finte())
        self.assertEqual(X["punteggio"], 3)
        self.assertTrue(all(f["fav"] for f in X["fattori"]))
        self.assertEqual(set(X["storico"]), {"3"})                     # sempre favorevole: un solo gruppo
        self.assertGreater(X["storico"]["3"]["n"], 100)
        self.assertEqual(X["corr"]["regime"], "normale")
        self.assertEqual(len(X["serie"]), B.SETT_GRAFICO)
        self.assertEqual(len(X["fattori"][0]["spark"]), 52)

    def test_tutto_contrario_zero(self):
        X = B.calcola(serie_finte(False, False, False))
        self.assertEqual(X["punteggio"], 0)
        self.assertEqual([f["fav"] for f in X["fattori"]], [False, False, False])

    def test_manca_un_fattore_niente_calcolo(self):
        s = serie_finte()
        s.pop("hyg")
        self.assertIsNone(B.calcola(s))

    def test_fonti_giu_resta_l_ultimo_calcolo(self):
        with tempfile.TemporaryDirectory() as d:
            buono = B.per_pagina(lambda: serie_finte(), cartella=d)
            self.assertFalse(buono.get("vecchio"))
            dopo = B.per_pagina(lambda: {}, cartella=d)
            self.assertTrue(dopo["vecchio"])
            self.assertEqual(dopo["punteggio"], buono["punteggio"])


if __name__ == "__main__":
    unittest.main()


class Termometro(unittest.TestCase):
    def finto(self, url):
        if "alternative.me" in url:
            return {"data": [{"value": str(10 + i % 80), "value_classification": "Extreme Fear", "timestamp": str(1700000000 + i * 86400)} for i in range(400)]}
        return [{"report_date_as_yyyy_mm_dd": f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}T00:00:00.000", "open_interest_all": "1000",
                 "nonrept_positions_long_all": str(100 + i), "nonrept_positions_short_all": "100",
                 "noncomm_positions_long_all": "500", "noncomm_positions_short_all": str(500 + i)} for i in range(60)]

    def test_letture_e_italiano(self):
        X = B.sentimento(self.finto)
        self.assertEqual(X["fng"]["cl"], "Paura estrema")
        self.assertEqual(len(X["fng"]["serie"]), 52)
        self.assertEqual(X["cot"]["retail"]["indice"], 100)          # retail sempre piu' lungo: massimo dell'anno
        self.assertEqual(X["cot"]["spec"]["indice"], 0)

    def test_fonte_giu_resta_la_copia(self):
        with tempfile.TemporaryDirectory() as d:
            B.sentimento_per_pagina(lambda: B.sentimento(self.finto), cartella=d)
            solo_cot = lambda: {"cot": {"d": "2026-01-01", "retail": {}, "spec": {}}}
            X = B.sentimento_per_pagina(solo_cot, cartella=d)
            self.assertEqual(X["fng"]["cl"], "Paura estrema")           # Fear & Greed dalla copia salvata
            self.assertEqual(X["cot"]["d"], "2026-01-01")
