# -*- coding: utf-8 -*-
"""v8.34 verifica_stat: test sulle coppie, bootstrap e tabella di contingenza (confronto con scipy dove possibile)."""
import random
import unittest
from cot_radar import verifica_stat as V


class Verifica(unittest.TestCase):
    def test_coppie_positive(self):
        r = random.Random(3)
        d = [0.002 + r.gauss(0, 0.004) for _ in range(200)]
        x = V.coppie(d)
        self.assertLess(x["p_t"], 0.01)
        self.assertGreater(x["ic95"][0], 0)                  # intervallo tutto sopra lo zero

    def test_coppie_nulle(self):
        r = random.Random(5)
        x = V.coppie([r.gauss(0, 0.01) for _ in range(200)])
        self.assertGreater(x["p_t"], 0.05)
        self.assertLess(x["ic95"][0], 0)
        self.assertGreater(x["ic95"][1], 0)

    def test_p_t_piccoli_campioni(self):
        # t = 2.262 con 9 gradi di liberta' -> p = 0,05 (tabella)
        self.assertAlmostEqual(V._p_t(2.262, 9), 0.05, delta=0.002)

    def test_contingenza(self):
        x = V.contingenza(30, 10, 10, 30)                    # legame forte
        self.assertLess(x["p"], 0.001)
        y = V.contingenza(20, 20, 20, 20)                    # nessun legame
        self.assertGreater(y["p"], 0.9)
        self.assertIsNone(V.contingenza(0, 0, 5, 5))


if __name__ == "__main__":
    unittest.main()
