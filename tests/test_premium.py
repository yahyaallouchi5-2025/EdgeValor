# -*- coding: utf-8 -*-
"""v7.93 dati Premium: cosa resta in Basic, cifratura apribile con la chiave, chiusura senza chiave."""
import base64
import copy
import json
import os
import tempfile
import unittest
import zlib

from cot_radar import premium as PR

CHIAVE = bytes(range(32))
FINTA = lambda: {"id": "11111111-2222-3333-4444-555555555555", "k": base64.b64encode(CHIAVE).decode()}


def apri(b):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    c = AESGCM(CHIAVE).decrypt(base64.b64decode(b["iv"]), base64.b64decode(b["c"]), None)
    return json.loads(zlib.decompress(c).decode())


DATI = {"port": {"profili": [{"id": "x", "curva": [[1, 2]], "stat": {"a": 1}, "composizione": [{"k": "SP500", "peso": 50}],
                              "rischio_quote": {"vol": 5}, "rotazioni": [{"data": "d"}],
                              "mesi_chiusi": [{"mese": "2026-10", "r": 1.0, "asset": [{"k": "SP500"}]}],
                              "mese": {"media": 1.2, "mercati": [{"k": "SP500", "media": 2}]}}], "strumenti": {"SP500": {"isin": "IE"}}},
        "stag": {"WTI": {"mappa": {"anni": [2020]}, "finestra": {"score": 1}, "mesi": [1], "giorni": [2], "sett": {}}},
        "paesi": {"paesi": [{"iso": str(i), "pil": i} for i in range(9)]}, "assets": {"EUR": 1}}


class Premium(unittest.TestCase):
    def setUp(self):
        PR.azzera()

    def tearDown(self):
        PR.azzera()

    def test_basic_paesi_tre_gruppi(self):
        # v8.70 con i 3 gruppi il Basic vede le 5 economie che crescono di piu' tra tutti i paesi
        d = copy.deepcopy(DATI)
        d["paesi"]["paesi"] += [{"iso": "S%d" % i, "pil": 50 + i, "gr": "Sviluppati"} for i in range(3)] + \
                               [{"iso": "F1", "pil": 99, "gr": "Frontiera"}]
        b, _ = PR.separa(d)
        self.assertEqual([r["iso"] for r in b["paesi"]["paesi"]], ["F1", "S2", "S1", "S0", "8"])
        self.assertEqual(b["paesi"]["n_tot"], 13)                                # il lucchetto conta tutti i paesi

    def test_basic_tiene_andamento_e_mappa(self):
        b, toppe = PR.separa(DATI)
        p = b["port"]["profili"][0]
        self.assertIn("curva", p)
        self.assertNotIn("composizione", p)
        self.assertNotIn("rischio_quote", p)
        self.assertNotIn("asset", p["mesi_chiusi"][0])
        self.assertEqual(p["mese"], {"media": 1.2})
        self.assertNotIn("strumenti", b["port"])
        # v8.07 schede chiuse al Basic: stagionalita' e COT escono per intero, resta il contenitore vuoto
        self.assertEqual(b["stag"], {})
        self.assertEqual(b["assets"], {})
        self.assertTrue(any(t[0] == ["stag"] for t in toppe) and any(t[0] == ["assets"] for t in toppe))
        self.assertFalse(any(t[0][0] == "stag" and len(t[0]) > 1 for t in toppe))      # niente toppe doppie
        self.assertNotIn("EUR", json.dumps(b["assets"]))
        self.assertEqual([r["iso"] for r in b["paesi"]["paesi"]], ["8", "7", "6", "5", "4"])   # crescita piu' alta
        self.assertEqual(b["paesi"]["n_tot"], 9)
        self.assertIn("composizione", DATI["port"]["profili"][0])                  # l'originale non si tocca
        self.assertTrue(any(t[0] == ["port", "profili", 0, "composizione"] for t in toppe))

    def test_cifrato_si_apre_con_la_chiave(self):
        PR.pubblicazione(FINTA)
        b, blocco = PR.pagina(DATI)
        self.assertEqual(blocco["id"], FINTA()["id"])
        toppe = apri(blocco)
        # rimesse al loro posto, le toppe ridanno i dati completi
        for perc, v in toppe:
            o = b
            for k in perc[:-1]:
                o = o[k]
            o[perc[-1]] = v
        b["paesi"].pop("n_tot")
        self.assertEqual(b, DATI)
        self.assertNotIn("SP500", json.dumps(blocco))

    def test_senza_chiave_niente_dati_premium(self):
        b, blocco = PR.pagina(DATI)                  # nei test il database non si chiama: nessuna chiave
        self.assertIsNone(blocco)
        self.assertNotIn("composizione", json.dumps(b))

    def test_azioni_protette(self):
        PR.pubblicazione(FINTA)
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "titoli"))
            PR._scrivi(os.path.join(d, "titoli", "AAPL.json"), {"t": "AAPL", "c": [1, 2]})
            PR._scrivi(os.path.join(d, "indice.json"), {"settori": [1], "titoli": [{"t": "AAPL", "n": "Apple", "p": 1, "pt": 88, "rk": 1}]})
            PR._scrivi(os.path.join(d, "top.json"), {"economie": {"usa": 1}, "titoli": [{"t": "AAPL"}, {"t": "MSFT"}, {"t": "NVDA"}]})
            PR._scrivi(os.path.join(d, "satellite.json"), {"storico": ["AAPL"]})
            PR.proteggi_azioni(d)
            tit = PR._leggi(os.path.join(d, "titoli", "AAPL.json"))
            self.assertEqual(list(tit), ["__p"])
            self.assertEqual(apri(tit["__p"]), {"t": "AAPL", "c": [1, 2]})
            ind = PR._leggi(os.path.join(d, "indice.json"))
            self.assertEqual(ind["titoli"], [{"t": "AAPL", "n": "Apple", "p": 1}])
            self.assertEqual(apri(ind["__p"])["titoli"][0]["pt"], 88)
            top = PR._leggi(os.path.join(d, "top.json"))
            self.assertEqual(top["economie"], {"usa": 1})
            self.assertEqual(top["titoli"], [{"t": "AAPL"}, {"t": "MSFT"}])     # v8.65 il Basic vede le prime 2
            self.assertEqual(len(apri(top["__p"])["titoli"]), 3)
            self.assertFalse(os.path.exists(os.path.join(d, "satellite.json")))

    def test_azioni_senza_chiave_solo_basic(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "titoli"))
            PR._scrivi(os.path.join(d, "titoli", "AAPL.json"), {"t": "AAPL"})
            PR._scrivi(os.path.join(d, "indice.json"), {"titoli": [{"t": "AAPL", "pt": 88}]})
            PR.proteggi_azioni(d)
            self.assertEqual(PR._leggi(os.path.join(d, "titoli", "AAPL.json")), {})
            self.assertEqual(PR._leggi(os.path.join(d, "indice.json")), {"titoli": [{"t": "AAPL"}]})



class MacroChiusa(unittest.TestCase):
    """v8.08 Macro chiusa al Basic: resta solo il punteggio del clima, il resto e' una toppa Premium."""

    def test_market_e_fed(self):
        from cot_radar import premium
        d = {"market": {"risk": 12, "drivers": [{"key": "vix"}], "anchor": "2026-11-17"}, "fed": {"bs": 1}}
        basic, toppe = premium.separa(d)
        self.assertEqual(basic["market"], {"risk": 12})
        self.assertIsNone(basic["fed"])
        percorsi = [t[0] for t in toppe]
        self.assertIn(["market"], percorsi)
        self.assertIn(["fed"], percorsi)
        self.assertEqual(d["market"]["drivers"], [{"key": "vix"}])      # l'originale non viene toccato

if __name__ == "__main__":
    unittest.main()


class PosizionamentoBasic(unittest.TestCase):
    """v8.09 la card Posizionamento resta al Basic: solo i conteggi, senza i segnali."""

    def test_conteggi(self):
        from cot_radar import premium
        d = {"pairs": [{"label": "STRONG BUY"}, {"label": "SELL"}],
             "assets": {"GOLD": {"key": "GOLD", "group": "Metalli", "label": "BUY"},
                        "USD": {"key": "USD", "group": "Valute", "label": "STRONG SELL"}}}
        basic, _ = premium.separa(d)
        self.assertEqual(basic["cotsum"], {"su": 2, "giu": 1, "forti": 1})
        self.assertEqual(basic["pairs"], [])
