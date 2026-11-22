# -*- coding: utf-8 -*-
"""v8.77 interruttore dei fornitori di dati (cot_radar/fonte.py) e adattatore Marketstack. Nessuna rete."""
import os
import sys
import unittest
from datetime import date
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import azioni as A, eodhd as E, fonte as F, fonte_marketstack as M  # noqa: E402


def chiave(v):
    M._trovati.clear()
    return mock.patch.dict(os.environ, {"EODHD_API_KEY": v})


def eod(*righe):
    return {"pagination": {"total": len(righe)}, "data": [{"date": d + "T00:00:00+0000", "adj_close": v} for d, v in righe]}


class Scelta(unittest.TestCase):
    def test_chiavi_e_priorita(self):
        with chiave("abc123"):                                  # come sempre: chiave senza nome = EODHD
            self.assertEqual(F.elenco(), [("eodhd", "abc123")])
            self.assertTrue(E.attivo())
            self.assertFalse(M.attivo())
        with chiave("marketstack:xyz"):
            self.assertFalse(E.attivo())
            self.assertTrue(M.attivo())
            self.assertEqual(F.nome(), "marketstack")
        with chiave("marketstack:xyz|eodhd:abc"):               # Marketstack prima, EODHD di riserva
            self.assertEqual(F.nome(), "marketstack+eodhd")
            self.assertEqual(E.chiave(), "abc")
            self.assertEqual(M.chiave(), "xyz")
            self.assertTrue(F.puo("notizie"))                   # le notizie arrivano da EODHD
        with chiave("nessuno"):
            self.assertFalse(F.attivo())
            self.assertIsNone(F.scarica_etf("SPY"))
        with chiave(""):
            self.assertFalse(F.attivo())

    def test_simboli(self):
        with chiave("marketstack:xyz"):
            self.assertEqual(F.simbolo("ENI.MI"), "ENI.MI")      # Milano: solo Marketstack la copre
            self.assertEqual(F.simbolo("SAP.DE"), "SAP.XETRA")
            self.assertIsNone(F.simbolo("BTC-USD"))             # crypto: no
            self.assertIsNone(F.notizie("AAPL.US"))
        self.assertEqual(M.candidati("SXR8.XETRA"), ["SXR8.DE"])
        self.assertEqual(M.candidati("BHP.AU"), ["BHP.AX"])
        self.assertEqual(M.candidati("BRK-B.US"), ["BRK-B"])
        self.assertEqual(M.candidati("MC.PA"), ["MC.PA", "MC.XPAR"])
        self.assertEqual(M.candidati("7203.T"), ["7203.T"])
        self.assertEqual(M.candidati("SHEL.L"), [])             # Londra spenta finche' non verifichiamo pence/sterline
        for x in ("^GSPC", "HG=F", "BTC-USD", "EURUSD.FOREX", "GSPC.INDX"):
            self.assertEqual(M.candidati(x), [], x)


class Marketstack(unittest.TestCase):
    def test_pagine_e_rettificato(self):
        pag1 = {"pagination": {"total": 1001}, "data": [{"date": "2026-01-02T00:00:00+0000", "close": 10.0, "adj_close": 9.5}] * 1000}
        pag2 = {"pagination": {"total": 1001}, "data": [{"date": "2026-01-05T00:00:00+0000", "close": 11.0, "adj_close": 10.5}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", side_effect=[pag1, pag2]) as g:
            pts = F.serie("SXR8.XETRA", "2026-01-01")
        self.assertEqual(pts, [("2026-01-02", 9.5), ("2026-01-05", 10.5)])
        self.assertEqual(g.call_args_list[0][0][1]["symbols"], "SXR8.DE")
        self.assertEqual(g.call_args_list[1][0][1]["offset"], 1000)

    def test_parigi_doppio_formato(self):
        def risp(percorso, q):
            return eod(("2026-11-20", 7.0)) if q["symbols"] == "AIR.XPAR" else None
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", side_effect=risp):
            self.assertEqual(F.serie("AIR.PA", "2026-11-01"), [("2026-11-20", 7.0)])
            self.assertEqual(M._trovati["AIR.PA"], "AIR.XPAR")    # ricordato: la volta dopo una sola richiesta

    def test_azione_milano_e_mensile(self):
        mesi = [f"{2025 + (m - 1) // 12}-{(m - 1) % 12 + 1:02d}-15" for m in range(1, 15)]
        yahoo = mock.Mock(return_value=None)
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=eod(*[(d, 100.0 + i) for i, d in enumerate(mesi)])), \
                mock.patch.object(A, "scarica", yahoo):
            meta, pts = A.scarica_auto("ENI.MI", "1mo", "max")
            self.assertEqual((meta["fonte"], meta["valuta"]), ("marketstack", "EUR"))
            self.assertEqual(pts[:2], [("2025-01", 100.0), ("2025-02", 101.0)])
            yahoo.assert_not_called()

    def test_dividendi_e_intraday(self):
        div = {"data": [{"date": "2026-05-10", "dividend": 0.5}, {"date": "2026-08-10", "dividend": None}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=div):
            self.assertEqual(F.dividendi("AAPL.US", "2020-01-01"), [{"date": "2026-05-10", "value": 0.5}])
        risp = {"data": [{"date": "2026-11-20T15:00:00+0000", "open": 1, "high": 2, "low": 0.5, "close": 1.5}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=risp):
            b = F.intraday("AAPL.US", "5m", 1795000000)
            self.assertEqual((b[0]["close"], b[0]["timestamp"]), (1.5, 1795186800))
            self.assertIsNone(F.intraday("SAP.XETRA", "5m", 1795000000))   # intraday solo USA

    def test_riserva_eodhd(self):
        # Marketstack non ha il titolo (o non risponde): risponde EODHD, nessuna scheda resta senza dati
        with chiave("marketstack:xyz|eodhd:abc"), mock.patch.object(M, "get", return_value=None), \
                mock.patch.object(E, "get", return_value=[{"date": "2026-11-20", "adjusted_close": 7.0}]):
            self.assertEqual(F.serie("SPY.US", "2026-11-01"), [("2026-11-20", 7.0)])
            self.assertEqual(F.ULTIMO["serie"], "eodhd")
            self.assertEqual(F.serie("BTC-USD.CC", "2026-11-01"), [("2026-11-20", 7.0)])   # crypto: solo EODHD

    def test_errore_non_ferma(self):
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", side_effect=RuntimeError("giu'")):
            self.assertIsNone(F.serie("SPY.US", "2026-01-01"))

    def test_verifica(self):
        with chiave("marketstack:xyz|eodhd:abc"), mock.patch.object(M, "get", return_value=eod(("2026-11-20", 5.0))), \
                mock.patch.object(E, "get", return_value=[{"date": "2026-11-20", "adjusted_close": 7.0, "close": 7.0}]):
            v = F.verifica(date(2026, 11, 22))
        self.assertEqual(v["fornitore"], "marketstack+eodhd")
        self.assertEqual(v["prove"]["Borsa di Milano"], "marketstack")
        self.assertEqual(v["prove"]["Crypto"], "eodhd")
        self.assertIn("Notizie", v["prove"])


class EodhdInvariato(unittest.TestCase):
    def test_eodhd_come_prima(self):
        with chiave("abc"), mock.patch.object(E, "get", return_value=[{"date": "2026-11-20", "adjusted_close": 7.0}]) as g:
            self.assertEqual(F.serie("SPY.US", "2026-11-01"), [("2026-11-20", 7.0)])
            F.dividendi("SPY.US", "2020-01-01")
            self.assertEqual(g.call_args[0][0], "div/SPY.US")


if __name__ == "__main__":
    unittest.main()
