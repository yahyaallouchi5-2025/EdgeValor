# -*- coding: utf-8 -*-
"""v8.76 interruttore dei fornitori di dati (cot_radar/fonte.py) e adattatore Marketstack. Nessuna rete."""
import os
import sys
import unittest
from datetime import date
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import azioni as A, eodhd as E, fonte as F, fonte_marketstack as M  # noqa: E402


def chiave(v):
    return mock.patch.dict(os.environ, {"EODHD_API_KEY": v, "DATI_FONTE": ""})


class Scelta(unittest.TestCase):
    def test_la_chiave_sceglie_il_fornitore(self):
        with chiave("abc123"):
            self.assertEqual(F.scelta(), ("eodhd", "abc123"))
            self.assertTrue(E.attivo())
            self.assertFalse(M.attivo())
        with chiave("marketstack:xyz"):
            self.assertEqual(F.scelta(), ("marketstack", "xyz"))
            self.assertFalse(E.attivo())                      # EODHD spento: nessuna chiamata con la chiave sbagliata
            self.assertTrue(M.attivo())
            self.assertEqual(F.nome(), "marketstack")
        with chiave("nessuno"):
            self.assertFalse(F.attivo())
            self.assertIsNone(F.scarica_etf("SPY"))           # niente fornitore: copie salvate e fonti ufficiali
        with chiave(""):
            self.assertFalse(F.attivo())

    def test_capacita_e_none_se_manca(self):
        with chiave("marketstack:xyz"):
            self.assertIn("serie", F.capacita())
            self.assertFalse(F.puo("notizie"))
            self.assertIsNone(F.notizie("AAPL.US"))           # Marketstack non ha notizie: None, il sito tiene la copia
            self.assertIsNone(F.simbolo("BTC-USD"))           # crypto non coperte
            self.assertEqual(F.simbolo("SAP.DE"), "SAP.XETRA")


class Marketstack(unittest.TestCase):
    def test_simboli_e_borse(self):
        self.assertEqual(M._parti("SXR8.XETRA"), ("SXR8", "XETR"))
        self.assertEqual(M._parti("BRK.B.US"), ("BRK-B", None))
        self.assertEqual(M._parti("GSPC.INDX"), ("GSPC.INDX", None))
        self.assertFalse(M.copre("EURUSD.FOREX"))
        self.assertTrue(M.copre("MC.PA"))

    def test_serie_rettificata_e_pagine(self):
        pag1 = {"pagination": {"limit": 1000, "offset": 0, "count": 1000, "total": 1001},
                "data": [{"date": "2026-01-02T00:00:00+0000", "close": 10.0, "adj_close": 9.5}] * 1000}
        pag2 = {"pagination": {"limit": 1000, "offset": 1000, "count": 1, "total": 1001},
                "data": [{"date": "2026-01-05T00:00:00+0000", "close": 11.0, "adj_close": 10.5}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", side_effect=[pag1, pag2]) as g:
            pts = F.serie("SXR8.XETRA", "2026-01-01")
        self.assertEqual(pts, [("2026-01-02", 9.5), ("2026-01-05", 10.5)])
        self.assertEqual(g.call_args_list[0][0][1]["exchange"], "XETR")
        self.assertEqual(g.call_args_list[1][0][1]["offset"], 1000)

    def test_azione_e_dividendi(self):
        mesi = [f"{2025 + (m - 1) // 12}-{(m - 1) % 12 + 1:02d}" for m in range(1, 15)]       # 14 mesi
        righe = {"data": [{"date": f"{x}-15T00:00:00+0000", "adj_close": 100.0 + i} for i, x in enumerate(mesi)]}
        yahoo = mock.Mock(return_value=None)
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=righe), mock.patch.object(A, "scarica", yahoo):
            meta, pts = A.scarica_auto("SAP.DE", "1mo", "max")
            self.assertEqual(meta["fonte"], "marketstack")
            self.assertEqual(pts[:2], [("2025-01", 100.0), ("2025-02", 101.0)])
            yahoo.assert_not_called()
        div = {"data": [{"date": "2026-05-10", "dividend": 0.5}, {"date": "2026-08-10", "dividend": None}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=div):
            self.assertEqual(F.dividendi("AAPL.US", "2020-01-01"), [{"date": "2026-05-10", "value": 0.5}])

    def test_intraday_solo_usa(self):
        risp = {"data": [{"date": "2026-11-20T15:00:00+0000", "open": 1, "high": 2, "low": 0.5, "close": 1.5}]}
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value=risp):
            b = F.intraday("AAPL.US", "5m", 1795000000)
            self.assertEqual(b[0]["close"], 1.5)
            self.assertEqual(b[0]["timestamp"], 1795186800)
            self.assertIsNone(F.intraday("SAP.XETRA", "5m", 1795000000))

    def test_errore_del_fornitore_non_ferma(self):
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", side_effect=RuntimeError("giu'")):
            self.assertIsNone(F.serie("SPY.US", "2026-01-01"))  # eccezione -> None, il sito usa la copia

    def test_verifica_per_il_registro(self):
        with chiave("marketstack:xyz"), mock.patch.object(M, "get", return_value={"data": [
                {"date": "2026-11-20T00:00:00+0000", "adj_close": 5.0}]}):
            v = F.verifica(date(2026, 11, 22))
        self.assertEqual(v["fornitore"], "marketstack")
        self.assertTrue(v["prove"]["prezzi USA"] and v["prove"]["ETF in euro (Xetra)"])
        self.assertFalse(v["prove"]["crypto"] or v["prove"]["cambi"])     # non coperti: segnalati, nessuna chiamata


class EodhdInvariato(unittest.TestCase):
    def test_eodhd_come_prima(self):
        with chiave("abc"), mock.patch.object(E, "get", return_value=[{"date": "2026-11-20", "adjusted_close": 7.0}]) as g:
            self.assertEqual(F.serie("SPY.US", "2026-11-01"), [("2026-11-20", 7.0)])
            F.dividendi("SPY.US", "2020-01-01")
            self.assertEqual(g.call_args[0][0], "div/SPY.US")


if __name__ == "__main__":
    unittest.main()
