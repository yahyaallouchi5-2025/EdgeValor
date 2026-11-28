# -*- coding: utf-8 -*-
"""v7.21 quadro economico di 6 economie: fase dal CLI dell'OCSE e dall'inflazione, Eurozona come media pesata,
cache che sopravvive a una fonte giu'."""
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone

from cot_radar import economie as EC
from cot_radar import quadro as Q


def mesi(dal, valori):
    return {Q.mm(dal, k): v for k, v in enumerate(valori)}


class FaseEconomia(unittest.TestCase):
    def test_quattro_fasi(self):
        su, giu = mesi("2025-01", [99 + k * 0.1 for k in range(12)]), mesi("2025-01", [101 - k * 0.1 for k in range(12)])
        sale, scende = mesi("2025-01", [2 + k * 0.1 for k in range(12)]), mesi("2025-01", [3 - k * 0.1 for k in range(12)])
        self.assertEqual(EC.fase(su, scende, None)["regime"], "Ripresa")
        self.assertEqual(EC.fase(su, sale, None)["regime"], "Espansione")
        self.assertEqual(EC.fase(giu, sale, None)["regime"], "Stagflazione")
        self.assertEqual(EC.fase(giu, scende, None)["regime"], "Rallentamento")
        self.assertIsNone(EC.fase({}, sale, None))

    def test_allarme_sahm(self):
        cli, cpi = mesi("2025-01", [100] * 20), mesi("2025-01", [2] * 20)
        une = mesi("2025-01", [4.0] * 17 + [4.8] * 3)
        st = EC.fase(cli, cpi, une)
        self.assertTrue(st["allarme"])
        self.assertEqual(st["disoc"], 4.8)

    def test_trimestri_ignorati(self):
        # v7.22b: l'OCSE manda alcune disoccupazioni trimestrali ('2026-Q3'): prima facevano saltare tutto il quadro
        cli, cpi = mesi("2025-01", [100] * 20), mesi("2025-01", [2] * 20)
        une = dict(mesi("2025-01", [4.0] * 20), **{"2026-Q3": 4.1, "2026-Q2": 4.0})
        st = EC.fase(cli, cpi, une)
        self.assertEqual(st["mese_disoc"], "2026-08")
        self.assertFalse(st["allarme"])

    def test_eurozona_media_pesata(self):
        cli = {p: {"2026-01": 100.0} for p in EC.PESI_EUR}
        cli["DEU"]["2026-01"] = 102.0
        self.assertAlmostEqual(EC.cli_eurozona(cli)["2026-01"], 100 + 2 * EC.PESI_EUR["DEU"], places=4)
        del cli["ESP"]
        self.assertEqual(EC.cli_eurozona(cli), {})              # manca un paese: niente media


class Cache(unittest.TestCase):
    def test_fonte_giu_resta_la_copia(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, EC.FILE), "w") as fh:
                json.dump({"agg": "2020-01-01T00:00+00:00", "cli": {"USA": {"2020-01": 100}}}, fh)
            vero = (EC.scarica_cli, EC.scarica_disoccupazione, EC.scarica_inflazione)
            EC.scarica_cli = lambda get=None: (_ for _ in ()).throw(OSError("giu"))
            EC.scarica_disoccupazione = lambda get=None, oggi=None: {}
            EC.scarica_inflazione = lambda get=None: {"US": {"2020-01": 2.0}}
            try:
                c = EC.aggiorna_cache(d, adesso=datetime(2026, 11, 9, tzinfo=timezone.utc))
            finally:
                EC.scarica_cli, EC.scarica_disoccupazione, EC.scarica_inflazione = vero
            self.assertEqual(c["cli"], {"USA": {"2020-01": 100}})   # CLI giu': resta la copia
            self.assertEqual(c["cpi"], {"US": {"2020-01": 2.0}})


if __name__ == "__main__":
    unittest.main()


class TestSogliaCrescita(unittest.TestCase):
    """v9.68 soglia minima sulla crescita (economie.SOGLIA_CLI): un movimento a 3 mesi dentro +/-0,10 non cambia direzione."""

    def _serie(self, valori, da=(2025, 1)):
        a, m = da
        out = {}
        for v in valori:
            out["%04d-%02d" % (a, m)] = v
            a, m = (a + 1, 1) if m == 12 else (a, m + 1)
        return out

    def test_movimento_piccolo_tiene_la_direzione_di_prima(self):
        # sale forte, poi scende di 0,08 in 3 mesi (il caso dell'Australia): la crescita resta "su"
        cli = self._serie([99.0, 99.3, 99.6, 99.9, 100.2, 100.2, 100.15, 100.12])
        d = EC.direzione(cli)
        self.assertTrue(d["2025-05"])
        self.assertTrue(d["2025-08"])                      # 100.12 - 100.2 = -0.08: dentro la soglia
        cli["2025-09"] = 99.9                              # 99.9 - 100.2 = -0.3: oltre la soglia
        self.assertFalse(EC.direzione(cli)["2025-09"])

    def test_primo_mese_decide_il_segno(self):
        self.assertFalse(EC.direzione(self._serie([100.0, 100.0, 100.0, 99.95]))["2025-04"])
        self.assertTrue(EC.direzione(self._serie([100.0, 100.0, 100.0, 100.05]))["2025-04"])

    def test_fase_segna_la_crescita_ferma(self):
        cli = self._serie([100.0] * 9 + [100.05])
        cpi = self._serie([2.0] * 10)
        f = EC.fase(cli, cpi, None)
        self.assertTrue(f["ferma"])
        self.assertIn(f["regime"], ("Ripresa", "Rallentamento"))


class TestBuchiNeiDati(unittest.TestCase):
    """v9.71 ottobre 2025 mai pubblicato (USA) e "NaN" della BIS: mai un numero vuoto in scheda."""

    def test_colma_un_mese(self):
        from cot_radar import quadro as Q
        s = Q.colma({"2025-09": 324.245, "2025-11": 325.063, "2025-12": 326.0})
        self.assertAlmostEqual(s["2025-10"], 324.654, places=2)
        self.assertEqual(s["2025-09"], 324.245)

    def test_colma_non_inventa_buchi_lunghi(self):
        from cot_radar import quadro as Q
        s = Q.colma({"2025-08": 1.0, "2025-11": 2.0, "2025-12": float("nan")})
        self.assertEqual(sorted(s), ["2025-08", "2025-11"])

    def test_fase_ignora_nan(self):
        import cot_radar.economie as E
        from cot_radar import quadro as Q
        mesi = [Q.mm("2026-10", -k) for k in range(30)][::-1]
        cli = {m: 100 + i * 0.1 for i, m in enumerate(mesi)}
        cpi = {m: 2.0 + i * 0.05 for i, m in enumerate(mesi)}
        cpi["2026-10"] = float("nan")
        st = E.fase(cli, cpi, {})
        self.assertEqual(st["mese_cpi"], "2026-09")
        self.assertTrue(st["infl"] == st["infl"])            # non NaN

    def test_anomalia_se_manca_un_numero(self):
        from cot_radar import controlli as C
        self.assertEqual(C.schede({"economie": [{"id": "eur", "nome": "Eurozona", "infl": 4.0, "infl6": 3.0, "cli": 100.5, "mese_disoc": "2026-09"}]}, oggi="2026-11"), [])
        a = C.schede({"economie": [{"id": "eur", "nome": "Eurozona", "infl": None, "infl6": 3.0, "cli": 100.5}]})
        self.assertEqual(a[0]["livello"], "ERROR")
        self.assertIn("inflazione", a[0]["messaggio"])


class TestSchedeComplete(unittest.TestCase):
    """v9.72 Eurozona con la disoccupazione; anomalia se un dato e' fermo o manca."""

    def test_scarico_tiene_eurozona(self):
        import cot_radar.economie as E
        testa = "REF_AREA,MEASURE,ADJUSTMENT,SEX,AGE,TIME_PERIOD,OBS_VALUE\n"
        righe = "EA,UNE_LF_M,Y,_T,Y_GE15,2026-09,6.5\nFRA,UNE_LF_M,Y,_T,Y_GE15,2026-09,8.5\nJPN,UNE_LF_M,Y,_T,Y_GE15,2026-09,2.4\n"
        out = E.scarica_disoccupazione(get=lambda u: testa + righe)
        self.assertEqual(out["EA"], {"2026-09": 6.5})
        self.assertNotIn("FRA", out)

    def test_dato_fermo(self):
        from cot_radar import controlli as C
        e = {"id": "gbr", "nome": "Regno Unito", "infl": 3.6, "infl6": 2.8, "cli": 101.0,
             "mese_cli": "2026-10", "mese_cpi": "2026-10", "mese_disoc": "2026-08"}
        self.assertEqual(C.schede({"economie": [e]}, oggi="2026-11"), [])
        a = C.schede({"economie": [dict(e, mese_cpi="2026-06")]}, oggi="2026-11")
        self.assertIn("inflazione ferma a 06/2026", a[0]["messaggio"])

    def test_disoccupazione_assente(self):
        from cot_radar import controlli as C
        e = {"id": "eur", "nome": "Eurozona", "infl": 4.0, "infl6": 3.0, "cli": 100.5, "mese_cli": "2026-10", "mese_cpi": "2026-10"}
        self.assertIn("disoccupazione assente", C.schede({"economie": [e]}, oggi="2026-11")[0]["messaggio"])
