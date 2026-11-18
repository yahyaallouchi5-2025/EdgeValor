# -*- coding: utf-8 -*-
"""Test di cot_radar/crypto.py: calcoli, volume in dollari, fondamentali assenti, ordine, ripiego sulla copia."""
import os
import tempfile
import unittest
from datetime import date, timedelta

from cot_radar import crypto as C


def serie(giorni, p0, passo, vol, fine=date(2026, 11, 17)):
    """serie finta: prezzo che cresce di `passo` al giorno, volume costante"""
    return [((fine - timedelta(days=giorni - 1 - i)).isoformat(), p0 + passo * i, vol) for i in range(giorni)]


class Crypto(unittest.TestCase):
    def dati(self, vol_btc=30000.0):
        d = {}
        for k, (sig, *_rest) in enumerate(C.MONETE[:6]):
            d[sig] = {"sym": sig + "-USD.CC", "serie": serie(800, 100.0 + k, 1.0 + k, 1000.0 * (6 - k)), "fond": {}}
        d["BTC"]["serie"] = serie(800, 20000.0, 50.0, vol_btc)
        return d

    def test_calcolo_base(self):
        r = C.calcola(self.dati(), oggi=date(2026, 11, 18))
        self.assertIsNotNone(r)
        self.assertFalse(r["fond"])                          # nessun fondamentale: ordine per volume
        self.assertEqual(r["ordine"], "volume")
        b = next(x for x in r["monete"] if x["s"] == "BTC")
        self.assertEqual(b["p"], 20000.0 + 50 * 799)
        self.assertEqual(b["dd"], 0.0)                        # prezzo sempre in salita: oggi e' il massimo
        self.assertAlmostEqual(b["v1g"], round(50 / (20000 + 50 * 798) * 100, 2))
        self.assertEqual(len(b["spark"]), C.SPARK)
        self.assertIsNone(b["mcap"])                          # mai inventata
        self.assertEqual(b["max"], 21000000)                  # tetto del protocollo

    def test_volume_in_monete_convertito(self):
        r = C.calcola(self.dati(vol_btc=30000.0), oggi=date(2026, 11, 18))
        b = next(x for x in r["monete"] if x["s"] == "BTC")
        self.assertEqual(b["volu"], round(30000.0 * (20000 + 50 * 799)))      # monete x prezzo

    def test_volume_gia_in_dollari(self):
        r = C.calcola(self.dati(vol_btc=3e10), oggi=date(2026, 11, 18))
        b = next(x for x in r["monete"] if x["s"] == "BTC")
        self.assertEqual(b["volu"], 30000000000)

    def test_fondamentali_e_ordine(self):
        d = self.dati()
        d["ETH"]["fond"] = {"mcap": 5e11, "circ": 1.2e8}
        d["BTC"]["fond"] = {"mcap": 1e12, "circ": 1.98e7, "max": 2.1e7}
        r = C.calcola(d, oggi=date(2026, 11, 18))
        self.assertEqual([x["s"] for x in r["monete"][:2]], ["BTC", "ETH"])
        self.assertEqual(r["monete"][0]["circ_pct"], 94.3)
        self.assertAlmostEqual(r["monete"][0]["quota"], 66.7, 1)

    def test_prezzi_fermi_e_poche_monete(self):
        d = self.dati()
        d["ETH"]["serie"] = serie(800, 100.0, 1.0, 10.0, fine=date(2026, 10, 1))
        r = C.calcola(d, oggi=date(2026, 11, 18))
        self.assertNotIn("ETH", [x["s"] for x in r["monete"]])
        self.assertIsNone(C.calcola({"BTC": d["BTC"]}))

    def test_scarica_simbolo_alternativo_e_fondamentali_rifiutati(self):
        chiamate = []

        def get(percorso, parametri=None, **kw):
            chiamate.append(percorso)
            if percorso.startswith("fundamentals/"):
                return None                                    # piano senza fondamentali
            if percorso == "eod/TON-USD.CC":
                return None
            return [{"date": d, "close": c, "volume": v} for d, c, v in serie(100, 10.0, 0.1, 5.0)]
        out = C.scarica(get)
        self.assertEqual(out["TON"]["sym"], "TON11419-USD.CC")
        self.assertEqual(sum(1 for c in chiamate if c.startswith("fundamentals/")), 1)    # niente altri tentativi

    def test_ripiego_copia(self):
        with tempfile.TemporaryDirectory() as t:
            nuovo = C.per_pagina(lambda: self.dati(), cartella=t)
            self.assertTrue(os.path.isfile(os.path.join(t, C.FILE)))
            vecchio = C.per_pagina(lambda: {}, cartella=t)
            self.assertTrue(vecchio["vecchio"])
            self.assertEqual(vecchio["agg"], nuovo["agg"])


if __name__ == "__main__":
    unittest.main()
