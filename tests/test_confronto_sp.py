# -*- coding: utf-8 -*-
"""v8.54 test: riepilogo contro l'S&P 500 (portafogli.riepilogo_sp) e sconto dalla media a 200 (sconto_sp)."""
import os
import tempfile
import unittest
from datetime import date, timedelta

from cot_radar import portafogli as P, sconto_sp


class TestRiepilogo(unittest.TestCase):
    def test_mesi_concatenati(self):
        # due mesi: portafoglio +10% poi -10% (= -1%), indice +5% e +5% (= +10,25%)
        m1 = {"r": 10, "dd": -1, "sp": {"r": 5, "dd": -2}, "serie": [["a", 0, 0], ["b", 10, 5]]}
        m2 = {"r": -10, "dd": -10, "sp": {"r": 5, "dd": -1}, "serie": [["b", 0, 0], ["c", -10, 5]]}
        r = P.riepilogo_sp([m1, m2])
        self.assertAlmostEqual(r["port"]["r"], -1.0)
        self.assertAlmostEqual(r["sp"]["r"], 10.25, delta=0.06)
        self.assertAlmostEqual(r["port"]["dd"], -10.0)        # dal massimo (+10%) a -1%
        self.assertEqual(r["meglio_r"], 1)
        self.assertEqual(r["meglio_dd"], 1)

    def test_pochi_mesi(self):
        self.assertIsNone(P.riepilogo_sp([{"r": 1, "dd": 0, "sp": {"r": 1, "dd": 0}, "serie": [["a", 0, 0]]}]))


class TestSconto(unittest.TestCase):
    def test_episodio_e_soglia_attiva(self):
        # 400 giorni piatti a 100, crollo a 70 (-30% dalla media), poi risalita lenta
        d, righe = date(2000, 1, 3), []
        prezzi = [100.0] * 400 + [70.0] * 5 + [70 + i * 0.1 for i in range(600)]
        for v in prezzi:
            righe.append(f"{d.isoformat()},{v}")
            d += timedelta(days=1)
        with tempfile.TemporaryDirectory() as c:
            os.makedirs(os.path.join(c, "yahoo"))
            with open(os.path.join(c, "yahoo", "_GSPC.csv"), "w", encoding="utf-8") as f:
                f.write("data,valore\n" + "\n".join(righe))
            r = sconto_sp.calcola(c)
        self.assertEqual([x["n"] for x in r["soglie"]], [1, 1, 1, 1])     # un episodio per soglia, niente doppi
        self.assertGreater(r["soglie"][0]["r12"], 0)
        self.assertIsNone(r["soglia"])                                     # oggi il prezzo e' risalito sopra la media


if __name__ == "__main__":
    unittest.main()
