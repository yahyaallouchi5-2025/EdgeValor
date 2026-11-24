# -*- coding: utf-8 -*-
"""v9.14 listino Premium e prova: fino al 30/11/2026 27,00 / 19,99 e 14 giorni, dal 1/12/2026 29,99 / 24,99 e 7 giorni."""
import importlib
import unittest
from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

import cot_radar.pagine_pubbliche as P


def carica(quando):
    """Ricarica il modulo come se fosse l'istante `quando` (ora italiana)."""
    vera = datetime

    class Finta(vera):
        @classmethod
        def now(cls, tz=None):
            return quando.astimezone(tz) if tz else quando.replace(tzinfo=None)
    with mock.patch("datetime.datetime", Finta):
        return importlib.reload(P)


class Listino(unittest.TestCase):
    def tearDown(self):
        importlib.reload(P)

    def test_prima_del_cambio(self):
        m = carica(datetime(2026, 11, 30, 23, 59, tzinfo=ZoneInfo("Europe/Rome")))
        self.assertEqual((m.MENSILE, m.ANNUALE, m.PROVA, m.RISP), (27.00, 19.99, 7, 26))   # v9.20 prova 7 giorni dal 24/11
        self.assertIn("per <span data-prova>7</span> giorni", m.PREZZI)

    def test_prova_14_prima_del_24(self):
        m = carica(datetime(2026, 11, 24, 20, 39, tzinfo=ZoneInfo("Europe/Rome")))
        self.assertEqual(m.PROVA, 14)

    def test_dopo_il_cambio(self):
        m = carica(datetime(2026, 12, 1, 0, 0, tzinfo=ZoneInfo("Europe/Rome")))
        self.assertEqual((m.MENSILE, m.ANNUALE, m.PROVA, m.RISP), (29.99, 24.99, 7, 17))
        self.assertEqual(m.eu(m.ANNO_TOT), "299,88")
        self.assertIn("7 giorni di Premium in prova", m.PAGINE["accedi"][1])


if __name__ == "__main__":
    unittest.main()
