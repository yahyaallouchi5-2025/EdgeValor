# -*- coding: utf-8 -*-
"""Test v9.12: beni durevoli e sussidi di disoccupazione nell'agenda (calendario FRED) e nello scenario."""
import json
import unittest
from datetime import date

from cot_radar import agenda as A
from cot_radar import scenari as S


class BeniDurevoli(unittest.TestCase):
    def test_solo_rapporto_anticipato(self):
        # release 95: inizio mese = ordini all'industria (si scarta), fine mese = beni durevoli (si tiene)
        self.assertFalse(A.uscita_valida("us-durable", "2026-11-03"))
        self.assertTrue(A.uscita_valida("us-durable", "2026-11-25"))
        self.assertTrue(A.uscita_valida("us-gdp", "2026-11-03"))

    def test_eventi_fred_alle_14_30_di_roma(self):
        js = json.dumps({"release_dates": [{"date": "2026-11-03"}, {"date": "2026-11-25"}]})
        ev = A.dati_fred(date(2026, 11, 24), chiave="x", leggi=lambda u: js)
        dur = [e for e in ev if e["codice"] == "us-durable"]
        self.assertEqual([(e["data"], e["utc"]) for e in dur], [("2026-11-25", "2026-11-25T13:30Z")])
        self.assertEqual(dur[0]["nome"], "Beni durevoli USA (ordini)")


class Sussidi(unittest.TestCase):
    def test_precedente_in_migliaia(self):
        self.assertEqual(S.precedente([("2026-11-08", 220000.0), ("2026-11-15", 228000.0)], "migliaia"),
                         ("228 mila", "settimana al 15/11"))

    def test_lettura_al_contrario(self):
        s = S.calcola({}, scarica=False)
        self.assertTrue(s["us-claims"]["inv"])          # piu' sussidi = dollaro piu' debole
        self.assertFalse(s["us-durable"]["inv"])


if __name__ == "__main__":
    unittest.main()
