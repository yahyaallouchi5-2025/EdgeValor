# -*- coding: utf-8 -*-
"""Test del ciclo dell'halving (cot_radar/crypto.py, v9.03): offerta dal protocollo e confronto fra cicli."""
import unittest
from datetime import date, timedelta

from cot_radar import crypto as C


def serie(dal, al, prezzo):
    """Serie giornaliera [(data, chiusura, volume)] con prezzo = funzione del giorno."""
    out, d = [], dal
    while d <= al:
        out.append((d.isoformat(), prezzo(d), 1.0))
        d += timedelta(days=1)
    return out


class Offerta(unittest.TestCase):
    def test_all_halving_2024(self):
        # al blocco 840.000: 210.000 x (50 + 25 + 12,5 + 6,25) = 19.687.500 BTC, premio 3,125
        self.assertEqual(C.offerta_btc(date(2024, 4, 20)), (19687500.0, 3.125))

    def test_un_anno_dopo(self):
        off, premio = C.offerta_btc(date(2025, 4, 20))
        self.assertAlmostEqual(off, 19687500 + 365 * 144 * 3.125)
        self.assertLess(off, 21e6)


class Ciclo(unittest.TestCase):
    def test_confronto_stesso_giorno(self):
        # prezzo che raddoppia ogni ciclo e sale dell'1 per mille al giorno dentro il ciclo
        def prezzo(d):
            k = sum(1 for h in C.HALVING if date.fromisoformat(h) <= d)
            h0 = date.fromisoformat(C.HALVING[max(0, k - 1)])
            return 100.0 * 2 ** k * (1.001 ** max(0, (d - h0).days))
        oggi = date(2026, 11, 20)
        r = C.ciclo_halving(serie(date(2011, 1, 1), oggi, prezzo), oggi)
        self.assertEqual(r["giorno"], (oggi - date(2024, 4, 20)).days)
        self.assertEqual([c["anno"] for c in r["cicli"]], [2012, 2016, 2020, 2024])
        # stesso giorno N in ogni ciclo -> stesso rendimento, nessun drawdown (sempre in salita)
        attese = round((1.001 ** r["giorno"] - 1) * 100)
        for c in r["cicli"]:
            self.assertAlmostEqual(c["rend"], attese, delta=1)
            self.assertEqual(c["dd"], 0)
        self.assertIsNone(r["cicli"][-1]["picco_g"])         # ciclo in corso mai sceso del 30%: picco non certo
        self.assertIsNotNone(r["cicli"][0]["picco_g"])
        self.assertTrue(r["prossimo"].startswith("2028-04"))

    def test_senza_dati(self):
        self.assertIsNone(C.ciclo_halving([], date(2026, 11, 20)))


if __name__ == "__main__":
    unittest.main()
