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

    def test_prepara_chiudi_ed_esito(self):
        # tre coppie con il dollaro: alla notizia il dollaro sale forte (+0,3% contro un'ora normale di 0,01%)
        A, mossa = [], {}
        for g in range(31, 70, 3):
            t = T0 + g * 86400 + 13 * 3600
            mossa[t] = 0.003
            A.append(ann(t))
        sale, scende = serie(75, mossa), serie(75, {t: -0.003 for t in mossa})
        vecchio = impatto.perche.annunci
        impatto.perche.annunci = lambda tutte=False: A
        try:
            dati = [impatto.prepara(s, s, o) for s, o in (("USDJPY.FOREX", sale), ("USDCHF.FOREX", sale),
                                                         ("USDCAD.FOREX", sale), ("EURUSD.FOREX", scende),
                                                         ("GLD.US", scende))]
            with tempfile.TemporaryDirectory() as d:
                righe = impatto.chiudi(dati + [None], d)
                X = json.load(open(os.path.join(d, "impatto", "GLD.US.json")))
                I = json.load(open(os.path.join(d, "impatto", "indice.json")))
        finally:
            impatto.perche.annunci = vecchio
        self.assertEqual(len(righe), 5)
        self.assertEqual(len(X["ev"][0]), 8)
        self.assertTrue(all(e[7] == 1 for e in X["ev"]))          # dollaro forte in ogni notizia
        r = X["es"]["NFP USA"]["+"]
        self.assertEqual(r[0], 13)
        self.assertLess(r[1], 0)                                  # GLD scende quando il dollaro e' forte
        self.assertEqual(r[2], 0)
        self.assertNotIn("-", X["es"]["NFP USA"])
        self.assertEqual(I["val"]["NFP USA"], "USD")
        g = [x for x in I["sim"] if x["s"] == "GLD.US"][0]
        self.assertEqual(g["m"]["NFP USA"][3][0], 13)
        self.assertIsNone(g["m"]["NFP USA"][4])

    def test_esito_senza_la_propria_coppia(self):
        F = {("t", "NFP USA"): (6.0, 3, {"EURUSD.FOREX": 2.0, "USDJPY.FOREX": 2.0, "USDCHF.FOREX": 2.0})}
        self.assertEqual(impatto.esito(F, ("t", "NFP USA"), "GLD.US"), 1)
        self.assertIsNone(impatto.esito(F, ("t", "NFP USA"), "EURUSD.FOREX"))   # restano 2 coppie: troppo poche
        self.assertIsNone(impatto.esito(F, ("x", "NFP USA"), "GLD.US"))

    def test_pochi_casi_niente_dati(self):
        self.assertIsNone(impatto.prepara("EURUSD.FOREX", "x", serie()))


class UsciteUsa(unittest.TestCase):
    def test_pulizia(self):
        from cot_radar import uscite_usa as U
        d = ["2024-03-14", "2024-04-15", "2024-04-26", "2024-05-15"]
        self.assertEqual(U.pulisci(d, "mese"), ["2024-03-14", "2024-04-15", "2024-05-15"])   # revisione annuale fuori
        self.assertEqual(U.pulisci(["2024-01-25", "2024-02-28", "2024-04-25", "2024-04-02"], "pil"),
                         ["2024-01-25", "2024-04-25"])
        self.assertEqual(U.pulisci(["2024-06-04", "2024-06-30"], "tutte"), ["2024-06-04", "2024-06-30"])

    def test_costruisci_e_pce_nel_giorno_del_pil(self):
        from cot_radar import uscite_usa as U
        h = lambda *d: "".join(f'<option value="{x}">{x}</option>' for x in d)
        r = U.costruisci({"GDPC1": h("2024-04-25"), "PCEPI": h("2024-04-25", "2024-05-31"), "RSAFS": h("2024-05-15")})
        self.assertIn(("2024-04-25", 8.5, "PIL USA"), r)
        self.assertNotIn(("2024-04-25", 8.5, "PCE USA"), r)
        self.assertIn(("2024-05-31", 8.5, "PCE USA"), r)

    def test_file_salvato(self):
        from cot_radar import uscite_usa as U
        L = U.carica()
        nomi = {n for _, _, n in L}
        self.assertEqual(nomi, {"Vendite USA", "PPI USA", "PCE USA", "PIL USA", "JOLTS USA"})
        self.assertTrue(all(o in (8.5, 10.0) for _, o, _ in L))


if __name__ == "__main__":
    unittest.main()
