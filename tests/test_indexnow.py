# -*- coding: utf-8 -*-
"""Test di cot_radar/indexnow.py (v9.69): una segnalazione al giorno, solo dal sito vero, mai bloccante."""
import json
import os
import tempfile
import unittest
import urllib.error

from cot_radar import indexnow

URLS = ["https://edgevalor.com/", "https://edgevalor.com/prezzi/", "https://altro.example/x"]
SITO = {"GITHUB_ACTIONS": "true"}


class TestIndexNow(unittest.TestCase):
    def test_corpo_solo_pagine_del_sito(self):
        c = indexnow.corpo(URLS)
        self.assertEqual(c["host"], "edgevalor.com")
        self.assertEqual(c["keyLocation"], "https://edgevalor.com/" + indexnow.CHIAVE + ".txt")
        self.assertEqual(c["urlList"], URLS[:2])

    def test_file_della_chiave(self):
        with tempfile.TemporaryDirectory() as d:
            indexnow.scrivi_chiave(d)
            with open(os.path.join(d, indexnow.CHIAVE + ".txt")) as fh:
                self.assertEqual(fh.read(), indexnow.CHIAVE)

    def test_una_volta_al_giorno(self):
        inviati = []
        with tempfile.TemporaryDirectory() as d:
            f = lambda c: inviati.append(c) or 202
            self.assertEqual(indexnow.segnala(URLS, d, invia=f, oggi="2026-11-28", ambiente=SITO), "inviato")
            self.assertEqual(indexnow.segnala(URLS, d, invia=f, oggi="2026-11-28", ambiente=SITO), "gia' fatto")
            self.assertEqual(indexnow.segnala(URLS, d, invia=f, oggi="2026-11-29", ambiente=SITO), "inviato")
            self.assertEqual(len(inviati), 2)
            with open(os.path.join(d, indexnow.FILE)) as fh:
                self.assertEqual(json.load(fh), {"giorno": "2026-11-29", "pagine": 2, "codice": 202})

    def test_mai_dal_pc(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(indexnow.segnala(URLS, d, invia=lambda c: 1 / 0, ambiente={}), "saltato")
        self.assertEqual(indexnow.segnala(URLS, None, invia=lambda c: 1 / 0, ambiente=SITO), "saltato")

    def test_errore_non_blocca_e_si_riprova(self):
        def giu(c):
            raise urllib.error.URLError("rete")
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(indexnow.segnala(URLS, d, invia=giu, oggi="2026-11-28", ambiente=SITO), "errore")
            self.assertEqual(indexnow.segnala(URLS, d, invia=lambda c: 403, oggi="2026-11-28", ambiente=SITO), "errore")
            self.assertFalse(os.path.exists(os.path.join(d, indexnow.FILE)))          # niente memoria: domani si riprova
            self.assertEqual(indexnow.segnala(URLS, d, invia=lambda c: 200, oggi="2026-11-28", ambiente=SITO), "inviato")


if __name__ == "__main__":
    unittest.main()
