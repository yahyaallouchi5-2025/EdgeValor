# -*- coding: utf-8 -*-
"""Test del ponte Yahoo sui cambi (registro.ponte_yahoo, v6.75): solo i giorni che FRED non ha ancora pubblicato."""
import unittest

from cot_radar import registro as R


class Ponte(unittest.TestCase):
    def test_solo_giorni_mancanti(self):
        prezzi = {"EUR": [["2026-10-22", 1.12], ["2026-10-23", 1.11]], "SP500": [["2026-10-30", 6000]]}
        yahoo = lambda cur: [("2026-10-23", 9.9), ("2026-10-26", 1.10), ("2026-10-31", 1.0), ("2026-11-02", 1.09)]
        out, prov = R.ponte_yahoo(prezzi, "2026-11-02", scarica=yahoo)
        # il 23/10 resta FRED, il 26/10 entra, sabato 31/10 e il giorno in corso (02/11) no
        self.assertEqual([d for d, _ in out["EUR"]], ["2026-10-22", "2026-10-23", "2026-10-26"])
        self.assertEqual(prov, {"EUR": "2026-10-26"})
        self.assertEqual(out["SP500"], prezzi["SP500"])                      # gli altri strumenti non cambiano

    def test_yahoo_giu(self):
        def rotto(cur):
            raise OSError("rete")
        out, prov = R.ponte_yahoo({"EUR": [["2026-10-23", 1.11]]}, "2026-11-02", scarica=rotto)
        self.assertEqual(prov, {})
        self.assertEqual(out["EUR"], [["2026-10-23", 1.11]])


class PonteBce(unittest.TestCase):
    """v8.76 prima i cambi ufficiali BCE (valuta per 1 euro -> dollari per 1 unita'), Yahoo solo se la BCE manca."""

    def setUp(self):
        R._bce_cache.clear()

    def tearDown(self):
        R._bce_cache.clear()

    def test_conversione_bce(self):
        finti = {"EXR.D.USD.EUR.SP00.A": [["2026-11-20", 1.10]], "EXR.D.JPY.EUR.SP00.A": [["2026-11-20", 176.0]]}
        from unittest import mock
        with mock.patch("cot_radar.fonti.get_ecb", return_value=finti):
            self.assertEqual(R._bce_fx("EUR"), [("2026-11-20", 1.10)])
            self.assertAlmostEqual(R._bce_fx("JPY")[0][1], 1.10 / 176.0)    # dollari per 1 yen
            self.assertEqual(R._bce_fx("BRL"), [])

    def test_yahoo_se_la_bce_non_risponde(self):
        from unittest import mock
        with mock.patch("cot_radar.fonti.get_ecb", side_effect=OSError("504")), \
                mock.patch.object(R, "_yahoo_fx", return_value=[("2026-11-20", 1.2)]) as y:
            self.assertEqual(R._fx_ponte("EUR"), [("2026-11-20", 1.2)])
            y.assert_called_once_with("EUR")


if __name__ == "__main__":
    unittest.main()
