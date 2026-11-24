# -*- coding: utf-8 -*-
"""v9.13 registro anomalie (sorveglianza.py): COT in ritardo, riepilogo Telegram, fonti, aperte/chiuse."""
import unittest
from datetime import datetime, timezone

from cot_radar import sorveglianza as S
from cot_radar.admin import pubblico

MAR = datetime(2026, 11, 24, 15, 0, tzinfo=timezone.utc)       # martedi': ultimo COT atteso = dati del 17/11
OK_IND = {"generato": "2026-11-24 12:00", "anomalia": None}
OK_LIVE = {"quando": MAR.timestamp() - 600}


def stato(**k):
    s = {"creato": "2026-11-24 14:00:00", "esito": "ok", "fonti": {"cot": "online", "fred": "online"}, "cot_ultimo": "2026-11-17"}
    s.update(k)
    return s


class Controlli(unittest.TestCase):
    def test_tutto_regolare(self):
        self.assertEqual(S.problemi(MAR, stato(), OK_IND, OK_LIVE, cursore={"riepilogo_cot": "2026-11-17"}), [])

    def test_cot_in_ritardo(self):
        p = S.problemi(MAR, stato(cot_ultimo="2026-11-10"), OK_IND, OK_LIVE)
        self.assertTrue(any(x.startswith("Report COT del 17/11") for x in p), p)

    def test_cot_dentro_la_tolleranza(self):
        ven = datetime(2026, 12, 4, 22, 0, tzinfo=timezone.utc)   # venerdi' 23:00 a Roma: uscito da 1h30, non e' ritardo
        p = S.problemi(ven, stato(creato="2026-12-04 22:00:00", cot_ultimo="2026-11-24"), OK_IND, None)
        self.assertFalse(any("Report COT" in x for x in p), p)

    def test_cot_rinviato_dalla_festa(self):
        # Thanksgiving: il report del 24/11 esce lunedi' 30/11. Sabato 28/11 non e' ritardo
        sab = datetime(2026, 11, 28, 12, 0, tzinfo=timezone.utc)
        p = S.problemi(sab, stato(creato="2026-11-28 10:00:00"), {"generato": "2026-11-28 10:00"}, None)
        self.assertFalse(any("Report COT" in x for x in p), p)

    def test_riepilogo_telegram_mancante(self):
        p = S.problemi(MAR, stato(), OK_IND, OK_LIVE, cursore={"riepilogo_cot": "2026-11-10"})
        self.assertTrue(any(x.startswith("Riepilogo COT del 17/11") for x in p), p)
        # cursore non leggibile: nessun falso allarme
        self.assertEqual(S.problemi(MAR, stato(), OK_IND, OK_LIVE, cursore=None), [])

    def test_fonte_offline(self):
        p = S.problemi(MAR, stato(fonti={"cot": "online", "fred": "cache", "fred_riserva": 3}), OK_IND, OK_LIVE)
        self.assertEqual([x for x in p if x.startswith("Fonte")],
                         ["Fonte FRED non raggiunta nell'ultimo aggiornamento: in uso i dati salvati (cache)."])

    def test_cot_ultimo_pubblico(self):
        self.assertEqual(pubblico({"esito": "ok", "cot_ultimo": "2026-11-17", "voci": [1]}), {"esito": "ok", "cot_ultimo": "2026-11-17"})


class Registro(unittest.TestCase):
    def test_aperta_poi_chiusa(self):
        t1 = datetime(2026, 11, 24, 10, 23, tzinfo=timezone.utc)
        r = S.aggiorna_registro(None, ["Sito non aggiornato da 31 ore (ultima pubblicazione x)."], t1)
        self.assertEqual(r["esito"], "anomalie")
        self.assertEqual(r["aperte"][0]["area"], "Sito")
        self.assertEqual(r["aperte"][0]["dal"], "2026-11-24 11:23")              # ora italiana
        t2 = datetime(2026, 11, 24, 11, 23, tzinfo=timezone.utc)
        r = S.aggiorna_registro(r, ["Sito non aggiornato da 32 ore (ultima pubblicazione x)."], t2)
        self.assertEqual(len(r["aperte"]), 1)
        self.assertEqual(r["aperte"][0]["dal"], "2026-11-24 11:23")              # stessa anomalia: resta la data d'inizio
        self.assertIn("32 ore", r["aperte"][0]["testo"])
        t3 = datetime(2026, 11, 24, 12, 23, tzinfo=timezone.utc)
        r = S.aggiorna_registro(r, [], t3)
        self.assertEqual((r["esito"], r["ok_dal"], r["aperte"]), ("ok", "2026-11-24 13:23", []))
        self.assertEqual(r["chiuse"][0]["al"], "2026-11-24 13:23")
        self.assertEqual([g["n"] for g in r["giri"]], [0, 1, 1])
        r = S.aggiorna_registro(r, [], datetime(2026, 11, 24, 13, 23, tzinfo=timezone.utc))
        self.assertEqual(r["ok_dal"], "2026-11-24 13:23")                       # tutto ok: la data non si sposta

    def test_registro_rovinato(self):
        r = S.aggiorna_registro({"aperte": "x", "giri": [1, {"t": "a", "n": 0}]}, [], MAR)
        self.assertEqual(r["esito"], "ok")
        self.assertEqual(len(r["giri"]), 2)

    def test_aree(self):
        self.assertEqual(S.area("Ultimo giro \"Sito\" fallito: u"), "Workflow")
        self.assertEqual(S.area("Riepilogo COT del 17/11 non inviato"), "Telegram")
        self.assertEqual(S.area("Prezzi fermi da oltre una settimana"), "Azionario")


if __name__ == "__main__":
    unittest.main()
