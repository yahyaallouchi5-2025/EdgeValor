# -*- coding: utf-8 -*-
"""v8.79 fase 5 di cot_radar/orari.py: simboli solo per le candele della scheda Live (nessuna rete)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import orari  # noqa: E402


class SoloLive(unittest.TestCase):
    def test_fase5_solo_orarie(self):
        f5 = orari.universo(5)
        self.assertEqual([s for s, _, _ in f5], orari.SOLO_LIVE)
        self.assertTrue(all(not usa_1m for _, _, usa_1m in f5))   # niente minuti: solo barre orarie dal 2020

    def test_fasi_vecchie_invariate(self):
        tutti = [s for s, _, _ in orari.universo()]
        self.assertEqual(len(tutti), len(set(tutti)))                # nessun simbolo doppio
        self.assertEqual(tutti[-len(orari.SOLO_LIVE):], orari.SOLO_LIVE)   # in coda: le fasi 1-4 partono prima


if __name__ == "__main__":
    unittest.main()
