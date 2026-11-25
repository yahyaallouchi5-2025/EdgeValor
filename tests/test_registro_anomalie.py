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


class TestEmailAdmin(unittest.TestCase):
    """v9.20 avvisi solo per email privata. v9.31: i problemi riparabili si segnalano solo se restano al controllo
    dopo (la riparazione automatica non e' bastata), mai due volte; "tutto regolare" solo dopo un avviso."""
    def test_email(self):
        from cot_radar import sorveglianza as s
        from datetime import datetime, timezone
        ora = datetime(2026, 11, 24, 17, 0, tzinfo=timezone.utc)
        inv = []
        f = lambda o, t, e: (inv.append(o), True)[1]
        # problema NON riparabile: email subito, una volta sola
        esito, avv = s.avvisa_email({}, ["Sito non aggiornato da 31 ore (x)."], ora, {}, f)
        self.assertTrue(esito)
        reg = dict(s.aggiorna_registro({}, ["Sito non aggiornato da 31 ore (x)."], ora), avvisate=avv)
        self.assertEqual(s.avvisa_email(reg, ["Sito non aggiornato da 32 ore (x)."], ora, {}, f)[0], None)
        self.assertTrue(s.avvisa_email(reg, [], ora, {}, f)[0])
        self.assertEqual(len(inv), 2)
        self.assertIn("regolare", inv[1])
        self.assertIsNone(s.telegram("x", {"TELEGRAM_BOT_TOKEN": "a", "TELEGRAM_ADMIN_CHAT": "b"}))

    def test_riparabile_aspetta_un_giro(self):
        from cot_radar import sorveglianza as s
        from datetime import datetime, timezone
        ora = datetime(2026, 11, 24, 17, 0, tzinfo=timezone.utc)
        inv = []
        f = lambda o, t, e: (inv.append(t), True)[1]
        live = ["Prezzi live fermi da 80 minuti a borsa aperta."]
        self.assertEqual(s.avvisa_email({}, live, ora, {}, f), (None, []))          # primo giro: si ripara, niente email
        reg = s.aggiorna_registro({}, live, ora)
        self.assertEqual(s.avvisa_email(reg, [], ora, {}, f), (None, []))           # riparato: nessuna email
        esito, avv = s.avvisa_email(reg, ["Prezzi live fermi da 140 minuti a borsa aperta."], ora, {}, f,
                                    azioni=["Prezzi live: ciclo riavviato in automatico."])
        self.assertTrue(esito)                                                      # ancora fermo dopo un'ora: email
        self.assertIn("Riparazioni automatiche", inv[0])
        self.assertEqual(len(avv), 1)


class TestRiparazione(unittest.TestCase):
    """v9.31 riavvio del ciclo live (al massimo ogni 2 ore) e rilancio UNA volta di un giro fallito."""
    def test_ripara(self):
        from cot_radar import sorveglianza as s
        from datetime import datetime, timedelta, timezone
        ora = datetime(2026, 11, 25, 12, 0, tzinfo=timezone.utc)
        chiamate = []
        ch = lambda url, tok, corpo: (chiamate.append(url), True)[1]
        prob = ["Prezzi live fermi da 90 minuti a borsa aperta.",
                'Ultimo giro "Sito" fallito al passo "Pubblica": https://github.com/a/b/actions/runs/123']
        mem, az = s.ripara(prob, {}, ora, "t", ch)
        self.assertEqual(len(chiamate), 2)
        self.assertTrue(chiamate[0].endswith("prezzi-live-continuo.yml/dispatches"))
        self.assertTrue(chiamate[1].endswith("runs/123/rerun-failed-jobs"))
        self.assertIn("run_123", mem)
        self.assertEqual(len(az), 2)
        # un'ora dopo: il live non si riavvia di nuovo, il giro 123 non si rilancia una seconda volta
        mem2, az2 = s.ripara(prob, {"riparazioni": mem}, ora + timedelta(hours=1), "t", ch)
        self.assertEqual(len(chiamate), 2)
        self.assertEqual(az2, [])
        # tre ore dopo il live si puo' riavviare di nuovo
        s.ripara(prob, {"riparazioni": mem2}, ora + timedelta(hours=3), "t", ch)
        self.assertEqual(len(chiamate), 3)
        self.assertTrue(s.riparabile(prob[1]) and not s.riparabile("Sito non aggiornato da 31 ore."))

    def test_passo_fallito_nel_testo(self):
        from cot_radar import sorveglianza as s
        from datetime import datetime, timezone
        mar = datetime(2026, 11, 10, 15, 0, tzinfo=timezone.utc)
        p = s.problemi(mar, {"creato": "2026-11-10 05:40:00", "esito": "ok"}, {"generato": "2026-11-10 12:00"},
                       {"quando": mar.timestamp() - 600}, {"Sito": ("failure", "https://x/runs/9", "Pubblica")})
        self.assertTrue(any('al passo "Pubblica"' in x for x in p))
