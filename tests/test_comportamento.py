# -*- coding: utf-8 -*-
"""Test di cot_radar/comportamento.py (v8.71) e della ricerca veloce motore._primo_dopo."""
import random
import unittest
from datetime import date, datetime, timedelta, timezone

from cot_radar import comportamento as C, motore as M


class Comportamento(unittest.TestCase):
    def test_famiglie_e_open_interest(self):
        self.assertEqual(C.famiglia("EURUSD"), "Valute")
        self.assertEqual(C.famiglia("US2Y"), "Tassi")
        self.assertEqual(C.famiglia("EAFE"), "Indici")
        self.assertEqual(C.famiglia("GOLD"), "Materie prime")
        self.assertEqual(C.gamba_oi("USDJPY"), "JPY")          # coppia col dollaro: il future della valuta
        self.assertEqual(C.gamba_oi("EURUSD"), "EUR")
        self.assertIsNone(C.gamba_oi("EURGBP"))                # cross: nessuna lettura univoca
        self.assertEqual(C.gamba_oi("GOLD"), "GOLD")

    def test_lettura_con_regole_fisse(self):
        s = {"n": 40, "pos": 60.0, "media": 0.5, "t": 2.5}
        self.assertEqual(C.lettura(s, {"n": 25, "pos": 55.0, "media": 0.2}), "segue")
        self.assertEqual(C.lettura(s, {"n": 25, "pos": 48.0, "media": 0.2}), "neutro")     # la verifica non conferma
        self.assertEqual(C.lettura({"n": 40, "pos": 40.0, "media": -0.5, "t": -2.1},
                                   {"n": 25, "pos": 45.0, "media": -0.1}), "contro")
        self.assertEqual(C.lettura({"n": 10}, {"n": 25, "pos": 70.0, "media": 1.0}), "corto")

    def test_primo_dopo_veloce_uguale_al_vecchio(self):
        def vecchio(pts, ist, cls, da=0):
            for i in range(da, len(pts)):
                if M.chiusura_utc(pts[i][0], cls) > ist:
                    return i
            return None
        g0 = date(2020, 1, 1)
        pts = [((g0 + timedelta(days=i)).isoformat(), 1.0) for i in range(0, 400) if (g0 + timedelta(days=i)).weekday() < 5]
        random.seed(3)
        for _ in range(300):
            cls = random.choice(list(M.ORARI))
            j = random.randrange(len(pts))
            ist = datetime.fromisoformat(pts[j][0] + "T00:00+00:00") + timedelta(hours=random.uniform(-80, 80))
            da = random.choice([0, max(0, j - 10)])
            self.assertEqual(M._primo_dopo(pts, ist, cls, da), vecchio(pts, ist, cls, da))
        self.assertIsNone(M._primo_dopo(pts, datetime(2030, 1, 1, tzinfo=timezone.utc), "fx"))


if __name__ == "__main__":
    unittest.main()
