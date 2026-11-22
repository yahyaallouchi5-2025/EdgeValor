# -*- coding: utf-8 -*-
"""v8.72 test in avanti contro gli speculatori (cot_radar/prova_contro.py): eventi, catena, esito, giudizio."""
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import prova_contro as P, registro  # noqa: E402


def ep(k, inizio, verso, p_ing, chiuso=False, p_usc=None, fine=None):
    return {"k": k, "inizio": inizio, "verso": verso, "ing": inizio, "p_ing": p_ing, "chiuso": chiuso,
            "fine": fine, "usc": fine or inizio, "p_usc": p_usc if p_usc is not None else p_ing, "sett": 2}


class TestProvaContro(unittest.TestCase):
    def test_regole_fisse(self):
        self.assertEqual(P.DAL, "2026-11-22")
        self.assertEqual(P.MERCATI, ("COFFEE", "OJ", "AUDNZD", "EURCAD", "GBPCAD"))
        self.assertEqual(P.MIN_GIUDIZIO, 30)

    def test_apre_poi_chiude_con_prezzo_salvato(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(P, "costo", return_value=0.1):
            t = datetime(2026, 12, 1, 22, tzinfo=timezone.utc)
            with mock.patch.object(P, "episodi_nuovi", return_value={("OJ", "2026-12-01"): ep("OJ", "2026-12-01", -1, 100.0)}):
                P.aggiorna(None, None, {"cot": "online"}, t, cartella=d)
                P.salva()
            ev = P.leggi(d)
            self.assertEqual([e["tipo"] for e in ev], ["regole", "apre"])
            # il dato d'ingresso viene rivisto (100 -> 101): conta quello salvato al momento
            chiuso = ep("OJ", "2026-12-01", -1, 101.0, True, 90.0, "2026-12-15")
            with mock.patch.object(P, "episodi_nuovi", return_value={("OJ", "2026-12-01"): chiuso}):
                r = P.aggiorna(None, None, {"cot": "online"}, t, cartella=d)
                P.salva()
            ev = P.leggi(d)
            self.assertEqual(ev[-1]["tipo"], "chiude")
            self.assertAlmostEqual(ev[-1]["ris"], 9.9)          # (90/100 - 1) * 100 * -1 - 0,1
            self.assertTrue(registro.verifica(ev)[0])
            self.assertEqual((r["n"], r["pos"], r["giudizio"]), (1, 100, "in raccolta (1/30)"))

    def test_niente_scrittura_senza_cot_o_con_catena_rotta(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(P, "costo", return_value=0.1), \
                mock.patch.object(P, "episodi_nuovi", return_value={("OJ", "2026-12-01"): ep("OJ", "2026-12-01", 1, 100.0)}):
            t = datetime(2026, 12, 1, 22, tzinfo=timezone.utc)
            P.aggiorna(None, None, {"cot": "offline"}, t, cartella=d)
            self.assertEqual(P.salva(), 0)
            P.aggiorna(None, None, {"cot": "online"}, t, cartella=d, scrivi=False)
            self.assertEqual(P.salva(), 0)
            P.aggiorna(None, None, {"cot": "online"}, t, cartella=d)
            P.salva()
            f = os.path.join(d, P.FILE)
            righe = open(f, encoding="utf-8").read().replace('"p_ing":100.0', '"p_ing":99.0')
            open(f, "w", encoding="utf-8").write(righe)
            r = P.aggiorna(None, None, {"cot": "online"}, t, cartella=d)
            self.assertFalse(r["integra"])
            self.assertEqual(P.salva(), 0)

    def test_giudizio(self):
        def chiusi(ris):
            return [{"tipo": "chiude", "k": "OJ", "inizio": f"2027-{i:04d}", "fine": "x", "sett": 1, "ris": x}
                    for i, x in enumerate(ris)]
        self.assertEqual(P.riepilogo(chiusi([1.0] * 29))["giudizio"], "in raccolta (29/30)")
        self.assertEqual(P.riepilogo(chiusi([1.0] * 16 + [-1.0] * 14))["giudizio"], "regge")
        self.assertEqual(P.riepilogo(chiusi([1.0] * 15 + [-1.0] * 15))["giudizio"], "non regge")   # 50% non basta
        self.assertEqual(P.riepilogo(chiusi([0.1] * 20 + [-5.0] * 10))["giudizio"], "non regge")   # media negativa


if __name__ == "__main__":
    unittest.main()
