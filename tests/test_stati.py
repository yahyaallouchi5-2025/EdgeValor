# -*- coding: utf-8 -*-
"""Test del registro unico dei cambi di stato (cot_radar/stati.py, v9.67).
Ogni test e' una regola scritta in testa a stati.py: conferma, data del cambio, prima volta, seme, dato mancante, salvataggio."""
import json
import os
import tempfile
import unittest

from cot_radar import stati


def oss(stato, conferma=1, seme=None, k="clima", nome="Clima del mercato", gruppo="clima"):
    return [{"k": k, "nome": nome, "gruppo": gruppo, "stato": stato, "conferma": conferma, "seme": seme}]


class TestMotore(unittest.TestCase):
    def test_prima_volta_nessun_cambio(self):
        reg = stati._vuoto()
        self.assertEqual(stati.applica(reg, oss("Paura"), "2026-11-28"), [])
        self.assertEqual(reg["stati"]["clima"], {"nome": "Clima del mercato", "gruppo": "clima", "stato": "Paura",
                                                 "dal": "2026-11-28", "prima": None})
        self.assertEqual(reg["cambi"], [])

    def test_seme_registra_il_cambio_con_la_sua_data(self):
        reg = stati._vuoto()
        n = stati.applica(reg, oss("Rallentamento", seme={"prima": "Stagflazione", "dal": "2026-09-01"}), "2026-11-28")
        self.assertEqual(len(n), 1)
        self.assertEqual((n[0]["prima"], n[0]["dopo"], n[0]["d"], n[0]["seme"]), ("Stagflazione", "Rallentamento", "2026-09-01", True))
        self.assertEqual(reg["stati"]["clima"]["dal"], "2026-09-01")
        self.assertEqual(reg["stati"]["clima"]["prima"], "Stagflazione")
        # il giro dopo non lo ripete
        self.assertEqual(stati.applica(reg, oss("Rallentamento", seme={"prima": "Stagflazione", "dal": "2026-09-01"}), "2026-11-29"), [])
        self.assertEqual(len(reg["cambi"]), 1)

    def test_conferma_tre_giorni_diversi(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("Neutro", 3), "2026-11-20")
        self.assertEqual(stati.applica(reg, oss("Paura", 3), "2026-11-21"), [])
        self.assertEqual(stati.applica(reg, oss("Paura", 3), "2026-11-21"), [])          # stesso giorno: conta una volta
        self.assertEqual(reg["stati"]["clima"]["attesa"]["n"], 1)
        self.assertEqual(stati.applica(reg, oss("Paura", 3), "2026-11-24"), [])
        n = stati.applica(reg, oss("Paura", 3), "2026-11-25")
        self.assertEqual(len(n), 1)
        self.assertEqual((n[0]["prima"], n[0]["dopo"], n[0]["d"], n[0]["visto_dal"]), ("Neutro", "Paura", "2026-11-25", "2026-11-21"))
        s = reg["stati"]["clima"]
        self.assertEqual((s["stato"], s["prima"], s["dal"]), ("Paura", "Neutro", "2026-11-25"))
        self.assertNotIn("attesa", s)

    def test_ritorno_allo_stato_di_prima_azzera_il_conto(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("Neutro", 3), "2026-11-20")
        stati.applica(reg, oss("Paura", 3), "2026-11-21")
        stati.applica(reg, oss("Paura", 3), "2026-11-22")
        stati.applica(reg, oss("Neutro", 3), "2026-11-23")                                # falso allarme
        self.assertNotIn("attesa", reg["stati"]["clima"])
        stati.applica(reg, oss("Paura", 3), "2026-11-24")
        stati.applica(reg, oss("Paura", 3), "2026-11-25")
        self.assertEqual(reg["cambi"], [])                                                # solo 2 giorni di fila
        self.assertEqual(reg["stati"]["clima"]["stato"], "Neutro")

    def test_stato_diverso_durante_l_attesa_riparte(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("Neutro", 2), "2026-11-20")
        stati.applica(reg, oss("Paura", 2), "2026-11-21")
        stati.applica(reg, oss("Fiducia", 2), "2026-11-22")
        self.assertEqual(reg["stati"]["clima"]["attesa"], {"stato": "Fiducia", "n": 1, "dal": "2026-11-22", "ultimo": "2026-11-22"})
        self.assertEqual(reg["cambi"], [])

    def test_dato_mancante_non_tocca_niente(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("Neutro"), "2026-11-20")
        prima = json.dumps(reg["stati"], sort_keys=True)
        self.assertEqual(stati.applica(reg, oss(None), "2026-11-21"), [])
        self.assertEqual(json.dumps(reg["stati"], sort_keys=True), prima)

    def test_conferma_uno_cambia_subito_con_la_data_di_oggi(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("Spento"), "2026-11-20")
        n = stati.applica(reg, oss("Acceso"), "2026-11-28")
        self.assertEqual((n[0]["d"], n[0]["prima"], n[0]["dopo"]), ("2026-11-28", "Spento", "Acceso"))
        self.assertNotIn("visto_dal", n[0])

    def test_limite_dei_cambi(self):
        reg = stati._vuoto()
        stati.applica(reg, oss("A"), "2026-01-01")
        for i in range(stati.MAX_CAMBI + 20):
            stati.applica(reg, oss("B" if i % 2 == 0 else "A"), "2026-01-02")
        self.assertEqual(len(reg["cambi"]), stati.MAX_CAMBI)


class TestOsserva(unittest.TestCase):
    QUADRO = {"economie": [
        {"id": "aus", "nome": "Australia", "regime": "Rallentamento", "allarme": True,
         "cambio": {"prima": "Stagflazione", "dopo": "Rallentamento", "mese": "2026-08"}},
        {"id": "usa", "nome": "USA", "regime": "Ripresa", "allarme": False},
        {"id": "jpn", "nome": "Giappone", "regime": "Stagflazione"}],          # senza dato sulla disoccupazione
        "modalita": {"modo": "NORMALE", "prima": "PESSIMISMO", "conf": "2026-11-10", "da": "2026-11-02"},
        "debito": {"storia": [["2025-T1", 3], ["2025-T2", 3], ["2025-T3", 4], ["2025-T4", 4], ["2026-T1", 4]]}}

    def test_tutti_gli_indicatori(self):
        o = {x["k"]: x for x in stati.osserva(self.QUADRO, {"risk": -97}, {"politica": {"EUR": {"stato": "taglio"}, "JPY": {"stato": "boh"}}})}
        self.assertEqual(o["ciclo:aus"]["stato"], "Rallentamento")
        self.assertEqual(o["ciclo:aus"]["seme"], {"prima": "Stagflazione", "dal": "2026-09-01"})
        self.assertEqual(o["ciclo:usa"]["stato"], "Ripresa")
        self.assertIsNone(o["ciclo:usa"]["seme"])
        self.assertEqual(o["allarme:aus"]["stato"], "Acceso")
        self.assertEqual(o["allarme:usa"]["stato"], "Spento")
        self.assertNotIn("allarme:jpn", o)
        self.assertEqual((o["modalita"]["stato"], o["modalita"]["seme"]), ("Normale", {"prima": "Pessimismo", "dal": "2026-11-10"}))
        self.assertEqual((o["debito"]["stato"], o["debito"]["seme"]), ("Riduzione del debito", {"prima": "Crisi", "dal": "2025-10-01"}))
        self.assertEqual((o["clima"]["stato"], o["clima"]["conferma"]), ("Paura", stati.CLIMA_CONFERMA))
        self.assertEqual(o["tassi:EUR"]["stato"], "Tassi in calo")
        self.assertNotIn("tassi:JPY", o)

    def test_soglie_del_clima(self):
        f = lambda r: stati.osserva(market={"risk": r})[0]["stato"]
        self.assertEqual([f(30), f(29), f(-29), f(-30), f(0)], ["Fiducia", "Neutro", "Neutro", "Paura", "Neutro"])

    def test_blocchi_mancanti(self):
        self.assertEqual(stati.osserva(), [])
        self.assertEqual(stati.osserva({}, {"risk": None}, {}), [])

    def test_mese_dopo_a_dicembre(self):
        self.assertEqual(stati._mese_dopo("2026-12"), "2027-01-01")


class TestVistaESalvataggio(unittest.TestCase):
    def test_vista_pubblica_e_premium_separate(self):
        reg = stati._vuoto()
        stati.applica(reg, stati.osserva(TestOsserva.QUADRO, {"risk": 0}, {"politica": {"EUR": {"stato": "taglio"}}}), "2026-11-20")
        stati.applica(reg, stati.osserva(None, None, {"politica": {"EUR": {"stato": "ferma"}}}), "2026-11-28")
        pub, prem = stati.vista(reg, "2026-11-28"), stati.vista(reg, "2026-11-28", premium=True)
        self.assertIn("ciclo:aus", pub["stati"])
        self.assertNotIn("tassi:EUR", pub["stati"])
        self.assertEqual(list(prem["stati"]), ["tassi:EUR"])
        self.assertEqual(prem["stati"]["tassi:EUR"], {"nome": "Politica dei tassi EUR", "gruppo": "tassi",
                                                      "stato": "Tassi fermi", "dal": "2026-11-28", "prima": "Tassi in calo"})
        self.assertEqual([c["k"] for c in prem["cambi"]], ["tassi:EUR"])
        # pubblica: solo i cambi degli ultimi 60 giorni (modalita' del 10/11 si', Australia del 1/9 e debito 2025 no)
        self.assertEqual([c["k"] for c in pub["cambi"]], ["modalita"])
        self.assertEqual(pub["stati"]["ciclo:aus"]["prima"], "Stagflazione")          # ma la provenienza resta sulla card

    def test_si_scrive_solo_con_salva(self):
        with tempfile.TemporaryDirectory() as d:
            pub, _ = stati.aggiorna(d, market={"risk": -50}, oggi="2026-11-28")
            self.assertEqual(pub["stati"]["clima"]["stato"], "Paura")
            self.assertFalse(os.path.exists(os.path.join(d, stati.FILE)))            # giro non ancora approvato
            self.assertTrue(stati.salva())
            self.assertFalse(stati.salva())                                          # niente da scrivere due volte
            with open(os.path.join(d, stati.FILE), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["stati"]["clima"]["stato"], "Paura")
            self.assertEqual(stati.leggi(d)["agg"], "2026-11-28")

    def test_senza_cartella_lavora_in_memoria(self):
        stati._in_attesa = None
        pub, _ = stati.aggiorna(None, quadro=TestOsserva.QUADRO, oggi="2026-11-28")
        self.assertEqual(pub["stati"]["ciclo:aus"]["dal"], "2026-09-01")
        self.assertIsNone(stati._in_attesa)

    def test_nome_cambiato_non_crea_un_cambio(self):
        # v9.68 "Recessione" e' diventata "Rallentamento": nel registro salvato si riscrive il nome, nessun cambio finto
        with tempfile.TemporaryDirectory() as d:
            vecchio = {"v": 1, "agg": "2026-11-28", "stati": {"ciclo:aus": {"nome": "Ciclo economico Australia", "gruppo": "ciclo",
                       "stato": "Recessione", "dal": "2026-09-01", "prima": "Stagflazione"},
                       "allarme:aus": {"nome": "Allarme", "gruppo": "allarme", "stato": "Acceso", "dal": "2026-11-28"}},
                       "cambi": [{"k": "ciclo:aus", "nome": "Ciclo economico Australia", "gruppo": "ciclo", "prima": "Stagflazione",
                                  "dopo": "Recessione", "d": "2026-09-01", "seme": True}]}
            with open(os.path.join(d, stati.FILE), "w", encoding="utf-8") as fh:
                json.dump(vecchio, fh)
            reg = stati.leggi(d)
            self.assertEqual(reg["stati"]["ciclo:aus"]["stato"], "Rallentamento")
            self.assertEqual(reg["cambi"][0]["dopo"], "Rallentamento")
            nuovi = stati.applica(reg, [{"k": "ciclo:aus", "nome": "Ciclo economico Australia", "gruppo": "ciclo", "stato": "Rallentamento"}], "2026-11-29")
            self.assertEqual(nuovi, [])
            self.assertEqual(reg["stati"]["ciclo:aus"]["dal"], "2026-09-01")

    def test_file_rovinato_non_blocca(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, stati.FILE), "w") as fh:
                fh.write("{rotto")
            self.assertEqual(stati.leggi(d), stati._vuoto())


if __name__ == "__main__":
    unittest.main()
