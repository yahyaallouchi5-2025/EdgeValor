# -*- coding: utf-8 -*-
"""Test di cot_radar/paesi.py: ordine, stato crescita/decrescita, tendenza, ripiego sulla copia salvata."""
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from unittest import mock

from cot_radar import paesi as PA


class Paesi(unittest.TestCase):
    PIL = {"IND": {"2025": 7.8, "2026": 7.0, "2027": 7.0}, "SAU": {"2025": 4.6, "2026": -3.3, "2027": 7.9},
           "BRA": {"2025": 2.3, "2026": 2.2, "2027": 1.9}, "CHN": {"2025": 5.0, "2026": 4.5}}   # Cina senza 2027
    INF = {"IND": {"2026": 5.0}, "SAU": {"2026": 1.9}}

    def test_calcolo(self):
        r = PA.calcola(self.PIL, self.INF, 2026)
        self.assertEqual([x["iso"] for x in r], ["IND", "BRA", "SAU"])      # dal PIL piu' alto; Cina esclusa
        sau = r[2]
        self.assertEqual(sau["stato"], "decrescita")
        self.assertAlmostEqual(sau["tend"], 11.2)                            # accelera
        self.assertLess(r[1]["tend"], 0)                                     # Brasile rallenta
        self.assertIsNone(r[1]["inf"])                                       # inflazione mancante = None, non 0

    def test_copia_se_fmi_giu(self):
        d = tempfile.mkdtemp()
        copia = os.path.join(d, "paesi_fmi.json")
        with open(copia, "w") as f:
            json.dump({"pil": self.PIL, "inf": self.INF, "agg": "2026-10-20"}, f)
        with mock.patch.object(PA, "COPIA", copia), mock.patch.object(PA, "_scarica", side_effect=OSError), \
                mock.patch.object(PA, "_scarica_sdmx", side_effect=OSError):
            out = PA.carica(adesso=datetime(2026, 11, 1, tzinfo=timezone.utc))
        self.assertTrue(out["copia"])
        self.assertEqual(out["agg"], "2026-10-20")
        self.assertEqual(len(out["paesi"]), 3)
        with mock.patch.object(PA, "COPIA", os.path.join(d, "manca.json")), \
                mock.patch.object(PA, "RISERVA", os.path.join(d, "manca2.json")):
            self.assertIsNone(PA.carica(scarica=False))

    def test_riserva_completa(self):
        # la riserva nel codice copre i 24 paesi anche nel 2027 (serve il 2028 come "anno prossimo")
        with mock.patch.object(PA, "COPIA", "/non/esiste.json"):
            for anno in (2026, 2027):
                out = PA.carica(scarica=False, adesso=datetime(anno, 6, 1, tzinfo=timezone.utc))
                self.assertEqual(len(out["paesi"]), 24)

    def test_tre_gruppi(self):
        # v8.69 ogni riga dice il suo gruppo; un paese sta in un solo gruppo
        pil = {"ITA": {"2026": 0.8, "2027": 0.7}, "IND": {"2026": 7.0, "2027": 7.0}, "MAR": {"2026": 4.5, "2027": 4.0}}
        r = {x["iso"]: x["gr"] for x in PA.calcola(pil, {}, 2026)}
        self.assertEqual(r, {"ITA": "Sviluppati", "IND": "Emergenti", "MAR": "Frontiera"})
        tutti = [iso for _, l in PA.GRUPPI for iso, _, _ in l]
        self.assertEqual(len(tutti), len(set(tutti)))

    def test_sdmx_letto(self):
        xml = (b'<m:StructureSpecificData xmlns:m="x"><m:DataSet><Series COUNTRY="ITA" INDICATOR="NGDP_RPCH">'
               b'<Obs TIME_PERIOD="2026" OBS_VALUE="0.8"/><Obs TIME_PERIOD="2027" OBS_VALUE="NaN"/></Series>'
               b'<Series COUNTRY="ITA" INDICATOR="ALTRO"><Obs TIME_PERIOD="2026" OBS_VALUE="9"/></Series>'
               b'</m:DataSet></m:StructureSpecificData>')

        class R:
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def read(self): return xml
        with mock.patch.object(PA.urllib.request, "urlopen", lambda req, timeout=0: R()):
            out = PA._scarica_sdmx(["ITA"], 2026)
        self.assertEqual(out["NGDP_RPCH"]["ITA"]["2026"], 0.8)
        self.assertEqual(out["PCPIPCH"], {})


if __name__ == "__main__":
    unittest.main()


class Borsa(unittest.TestCase):
    """v7.67 numeri di borsa di un paese dall'ETF (rendimenti, tendenza, volatilita' breve e lunga, regime)."""
    def _serie(self, n=1600, passo=0.001):
        from datetime import date, timedelta
        d, v, out = date(2020, 1, 1), 100.0, []
        for i in range(n):
            v *= 1 + passo + (0.01 if i % 2 else -0.01)
            out.append(((d + timedelta(days=i)).isoformat(), v))
        return out, d + timedelta(days=n - 1)

    def test_numeri(self):
        from cot_radar import paesi
        pts, oggi = self._serie()
        b = paesi.borsa(pts, oggi)
        self.assertTrue(b["su"])                                   # serie che sale: sopra la media a 200 sedute
        self.assertGreater(b["a1"], b["m1"])
        self.assertAlmostEqual(b["vb"], b["vl"], delta=1.0)        # stessa oscillazione ogni giorno: breve = lunga
        self.assertIn(b["reg"], ("calma", "normale", "agitata"))

    def test_prezzi_fermi_o_corti(self):
        from datetime import timedelta
        from cot_radar import paesi
        pts, oggi = self._serie()
        self.assertIsNone(paesi.borsa(pts, oggi + timedelta(days=30)))   # prezzi fermi: nessun numero
        self.assertIsNone(paesi.borsa(pts[:100], oggi))

    def test_paese_senza_etf(self):
        from cot_radar import paesi
        pts, oggi = self._serie()
        d = paesi.aggiungi_borse({"paesi": [{"iso": "CHN"}, {"iso": "HUN"}]}, lambda t: pts, oggi)
        self.assertEqual(d["borse"], 1)
        self.assertIn("b", d["paesi"][0])
        self.assertNotIn("b", d["paesi"][1])


class InflazioneOggi(unittest.TestCase):
    """v8.98 ultimo dato mensile dell'inflazione (dataset CPI del FMI): lettura dell'XML e scelta dei valori."""

    XML = ('<m xmlns:ss="x"><DataSet><Series COUNTRY="ITA" FREQUENCY="M">'
           '<Obs TIME_PERIOD="2026-M05" OBS_VALUE="2.0"/><Obs TIME_PERIOD="2026-M06" OBS_VALUE="3.04"/>'
           '<Obs TIME_PERIOD="2026-M07" OBS_VALUE="3.5"/><Obs TIME_PERIOD="2026-M08" OBS_VALUE="NaN"/>'
           '<Obs TIME_PERIOD="2026-M09" OBS_VALUE="4.17"/></Series>'
           '<Series COUNTRY="NZL"><Obs TIME_PERIOD="2026-Q2" OBS_VALUE="4.06"/><Obs TIME_PERIOD="2026-Q3" OBS_VALUE="3.71"/></Series>'
           '</DataSet></m>')

    def test_lettura_e_ultimo(self):
        s = PA._serie_cpi(self.XML)
        self.assertEqual([p for p, _ in s["ITA"]][-1], "2026-M09")
        ita = PA.ultimo_cpi(s["ITA"], "M")
        self.assertNotIn("2026-M08", [p for p, _ in s["ITA"]])     # "NaN" = dato mancante, scartato
        self.assertEqual(ita["p"], "2026-09")
        self.assertEqual(ita["v3"], 3.0)                               # 3 mesi prima sul calendario: giugno
        # gennaio -> ottobre dell'anno prima; primo trimestre -> quarto dell'anno prima
        self.assertEqual(PA.ultimo_cpi([("2025-M10", 1.0), ("2026-M01", 2.0)], "M")["v3"], 1.0)
        self.assertEqual(PA.ultimo_cpi([("2025-Q4", 1.5), ("2026-Q1", 2.0)], "Q")["v3"], 1.5)
        self.assertEqual(ita["v"], 4.2)
        nzl = PA.ultimo_cpi(s["NZL"], "Q")
        self.assertEqual((nzl["p"], nzl["v"], nzl["v3"]), ("2026-Q3", 3.7, 4.1))

    def test_senza_dati(self):
        self.assertIsNone(PA.ultimo_cpi([], "M"))
        self.assertIsNone(PA.ultimo_cpi([("2026-M09", 2.0)], "M")["v3"])
