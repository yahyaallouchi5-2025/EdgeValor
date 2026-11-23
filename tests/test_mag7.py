# -*- coding: utf-8 -*-
"""Test di cot_radar/mag7.py (Magnifiche 7): scelta del numero di azioni, trend, pesi e contributi su dati finti."""
import json
import os
import tempfile
import unittest
from datetime import date, timedelta

from cot_radar import mag7 as M


def serie(n, p0, passo):
    """n sedute feriali fino al 2026-11-20 con prezzo che cresce di 'passo' al giorno (moltiplicativo)."""
    d, out, g = date(2026, 11, 20), [], 0
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d.isoformat())
        d -= timedelta(days=1)
    out.reverse()
    return [[x, round(p0 * passo ** i, 4)] for i, x in enumerate(out)]


class Scelta(unittest.TestCase):
    def test_copertina_se_coerente(self):
        self.assertEqual(M.scegli((100.0, "2026-10-01"), (101.0, "2026-09-30"))[1], "copertina")

    def test_piu_classi_usa_diluite(self):
        # copertina con una sola classe (molto meno azioni): vale la media diluita
        r = M.scegli((40.0, "2026-10-01"), (100.0, "2026-09-30"))
        self.assertEqual((r[0], r[1]), (100.0, "diluite"))

    def test_riserva_trimestre(self):
        self.assertEqual(M.scegli(None, None, (5.0, "utile/eps", "2026-09-30"))[1], "utile/eps")
        self.assertIsNone(M.scegli(None, None, None))

    def test_dato_vecchio_scartato(self):
        js = {"units": {"shares": [{"end": "2011-04-29", "val": 9, "form": "10-Q", "filed": "2011-05-01"}]}}
        self.assertIsNone(M._ultimo(js, date(2026, 11, 23), False))

    def test_solo_trimestri_per_diluite(self):
        js = {"units": {"shares": [
            {"start": "2026-01-01", "end": "2026-09-30", "val": 50, "form": "10-Q", "filed": "2026-10-30"},
            {"start": "2026-07-01", "end": "2026-09-30", "val": 51, "form": "10-Q", "filed": "2026-10-30"}]}}
        self.assertEqual(M._ultimo(js, date(2026, 11, 23), True), (51.0, "2026-09-30"))

    def test_eps_piccolo_ignorato(self):
        b = {"trim": [{"utile": 100, "eps": 2.0, "fine": "2026-06-30"}, {"utile": 1, "eps": 0.01, "fine": "2026-09-30"}]}
        self.assertEqual(M._da_trimestre(b)[0], 50)


class Trend(unittest.TestCase):
    def test_frecce(self):
        self.assertEqual(M._trend(serie(260, 100, 1.002)), 1)
        self.assertEqual(M._trend(serie(260, 100, 0.998)), -1)
        self.assertIsNone(M._trend(serie(100, 100, 1.0)))


class Calcolo(unittest.TestCase):
    def test_pesi_e_contributi(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "pubblico", "titoli"))
            el, n = [], {}
            for i, (t, _) in enumerate(M.M7):                      # le 7: 10 azioni da 100, +0,1% al giorno
                el.append({"t": t, "l": ["sp500", "ndx"]})
                n[t] = {"n": 10, "cik": i + 1}
                json.dump({"d": serie(300, 100, 1.001)}, open(os.path.join(d, "pubblico", "titoli", t + ".json"), "w"))
            for i in range(3):                                     # 3 altre, ferme
                t = f"X{i}"
                el.append({"t": t, "l": ["sp500"]})
                n[t] = {"n": 10, "cik": 100 + i}
                json.dump({"d": serie(300, 100, 1.0)}, open(os.path.join(d, "pubblico", "titoli", t + ".json"), "w"))
            # seconda quotazione di Alphabet: stesso CIK di GOOGL, non deve contare
            el.append({"t": "GOOG", "l": ["sp500", "ndx"]})
            n["GOOG"] = {"n": 10, "cik": n["GOOGL"]["cik"]}
            json.dump({"d": serie(300, 100, 1.001)}, open(os.path.join(d, "pubblico", "titoli", "GOOG.json"), "w"))
            r = M.calcola(d, el, n, min_cap=0)
            sp, nd = r["indici"]["sp500"], r["indici"]["ndx"]
            self.assertEqual(sp["n"], 10)                         # GOOG non contato
            self.assertGreater(sp["peso7"], 50)                   # le 7 sono salite, le altre ferme
            self.assertAlmostEqual(nd["peso7"], 100, places=1)
            c = sp["contrib"]["1m"]
            self.assertAlmostEqual(c["m7"] + c["altri"], c["indice"], places=1)
            self.assertAlmostEqual(c["altri"], 0, places=2)
            self.assertGreater(c["indice"], 0)
            self.assertLess(c["pesi_uguali"], c["indice"] + 1)
            self.assertEqual(len(r["titoli"]), 7)
            self.assertTrue(os.path.isfile(os.path.join(d, "pubblico", "mag7.json")))

    def test_unita_sbagliata(self):
        # media diluita scritta in milioni (MCD): vale la copertina
        self.assertEqual(M.scegli((715e6, "2026-10-01"), (715.0, "2026-09-30"))[1], "copertina")

    def test_mancano_le_7(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "pubblico", "titoli"))
            self.assertIsNone(M.calcola(d, [], {}))


if __name__ == "__main__":
    unittest.main()
