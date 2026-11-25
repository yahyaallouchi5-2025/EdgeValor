# -*- coding: utf-8 -*-
"""v9.32 annunci delle campagne su Telegram: testo, pulsante, immagine e fascia vietata del venerdi' sera."""
import json
import unittest
from datetime import datetime
from zoneinfo import ZoneInfo

from cot_radar import annuncio_tg as A


class Annuncio(unittest.TestCase):
    def test_richiesta(self):
        r = A.richiesta("black")
        self.assertEqual(r["photo"], "https://edgevalor.com/email/testa_black.jpg")
        self.assertIn("19,99 € al mese", r["caption"])
        self.assertNotIn("caduta", r["caption"].lower())
        self.assertLess(len(r["caption"]), 1024)                       # limite di Telegram per le didascalie
        bottone = json.loads(r["reply_markup"])["inline_keyboard"][0][0]
        self.assertTrue(bottone["url"].startswith("https://edgevalor.com/terminale/"))

    def test_venerdi_sera_vietato(self):
        roma = ZoneInfo("Europe/Rome")
        self.assertTrue(A.vietato(datetime(2026, 11, 27, 21, 0, tzinfo=roma)))     # venerdi' 21:00
        self.assertFalse(A.vietato(datetime(2026, 11, 27, 23, 30, tzinfo=roma)))   # venerdi' 23:30
        self.assertFalse(A.vietato(datetime(2026, 11, 25, 21, 0, tzinfo=roma)))    # mercoledi'

    def test_campagna_sconosciuta(self):
        self.assertEqual(A.main(["x", "nessuna"]), 2)


if __name__ == "__main__":
    unittest.main()
