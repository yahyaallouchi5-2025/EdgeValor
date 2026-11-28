# -*- coding: utf-8 -*-
"""
controlli.py - controlli di QUALITA' dei dati: scova gli errori "invisibili".

Un download puo' riuscire ma portare dati sbagliati o vecchi (una serie ferma da settimane,
un valore impossibile, un mercato sparito dal report). Il programma non si bloccherebbe,
ma i segnali sarebbero falsati. Qui controlliamo tutto e registriamo ogni anomalia:

  WARNING -> da tenere d'occhio (dato vecchio, salto anomalo)
  ERROR   -> dato sicuramente sbagliato (valore impossibile)

Ogni controllo e' in un blocco try: anche se un controllo avesse un bug, gli altri vanno avanti.
"""
import math
from collections import Counter
from datetime import date, datetime, timedelta, timezone

from .config import ASSETS, K_MIR, PRICES
from .log import log

MENSILI = ("CPIAUCSL", "UNRATE", "INDPRO")      # v7.90 serie FRED mensili (quadro economico)


def _ok(x):
    return isinstance(x, (int, float)) and not math.isnan(x) and not math.isinf(x)


# v9.72 DATI FERMI nelle schede del Quadro economico: eta' massima normale (in mesi, dal mese del dato a oggi) per ogni
#   fonte. I dati macro escono con ritardo: l'indicatore OCSE e l'inflazione entro 2 mesi, la disoccupazione OCSE del
#   Regno Unito anche dopo 3-4. Oltre questi limiti la fonte e' ferma o lo scarico non funziona: anomalia.
ETA_MAX = {"mese_cli": ("crescita", 3), "mese_cpi": ("inflazione", 3), "mese_disoc": ("disoccupazione", 4)}


def _eta(mese, oggi):
    """Mesi tra 'AAAA-MM' del dato e 'AAAA-MM' di oggi. None se il mese non e' leggibile."""
    try:
        return (int(oggi[:4]) - int(mese[:4])) * 12 + int(oggi[5:7]) - int(mese[5:7])
    except (TypeError, ValueError, IndexError):
        return None


def schede(quadro, oggi=None):
    """v9.71 (Ya, 28/11/2026: "non voglio piu' vedere n/d in nessuna scheda, al massimo mi arriva l'anomalia").
    Controlla i numeri che il Quadro economico mostra in pagina: uno vuoto diventa un'anomalia per l'amministratore
    (registro e sorveglianza), mentre la scheda nasconde la riga. -> [{"livello", "fonte", "messaggio"}]"""
    trovati = []
    oggi = oggi or datetime.now(timezone.utc).strftime("%Y-%m")
    for e in (quadro or {}).get("economie") or []:
        vuoti = [n for k, n in (("infl", "inflazione"), ("infl6", "inflazione di 6 mesi fa"), ("cli", "crescita")) if not _ok(e.get(k))]
        if e.get("id") == "usa" and not _ok(e.get("curva")):
            vuoti.append("curva dei tassi")
        if vuoti:
            trovati.append({"livello": "ERROR", "fonte": "Quadro economico",
                            "messaggio": f"{e.get('nome')}: dato mancante in scheda ({', '.join(vuoti)})"})
            log.error("[controllo Quadro economico] %s", trovati[-1]["messaggio"])
        fermi = []
        for k, (nome, limite) in ETA_MAX.items():
            eta = _eta(e.get(k), oggi) if e.get(k) else None
            if eta is not None and eta > limite:
                fermi.append(f"{nome} ferma a {e[k][5:7]}/{e[k][:4]} ({eta} mesi)")
        if fermi:
            trovati.append({"livello": "ERROR", "fonte": "Quadro economico",
                            "messaggio": f"{e.get('nome')}: dato non aggiornato ({', '.join(fermi)})"})
            log.error("[controllo Quadro economico] %s", trovati[-1]["messaggio"])
        if not e.get("mese_disoc"):                      # v9.72 ogni scheda deve avere la disoccupazione
            trovati.append({"livello": "ERROR", "fonte": "Quadro economico", "messaggio": f"{e.get('nome')}: disoccupazione assente"})
            log.error("[controllo Quadro economico] %s", trovati[-1]["messaggio"])
    return trovati


def controlla(assets, pairs, fred, ecb, mort):
    """Restituisce la lista delle anomalie trovate: [{"livello", "fonte", "messaggio"}]."""
    trovati = []

    def segnala(livello, fonte, messaggio):
        trovati.append({"livello": livello, "fonte": fonte, "messaggio": messaggio})
        log.log(30 if livello == "WARNING" else 40, "[controllo %s] %s", fonte, messaggio)

    today = date.today()

    # ---- COT: mercati mancanti, date disallineate, valori impossibili
    try:
        mancanti = [a[0] for a in ASSETS if a[0] not in assets]
        if mancanti:
            segnala("WARNING", "COT", f"{len(mancanti)} mercati senza dati sufficienti: {', '.join(mancanti)}")
        date_cot = Counter(a["date"] for k, a in assets.items() if a.get("date") and k != "USD")
        if date_cot:
            principale = date_cot.most_common(1)[0][0]
            vecchi = [k for k, a in assets.items() if a.get("date") and a["date"] != principale and k != "USD"]
            if vecchi:
                segnala("WARNING", "COT", f"mercati fermi a un report precedente al {principale}: {', '.join(vecchi)}")
        for k, a in assets.items():
            if not _ok(a.get("score")):
                segnala("ERROR", "COT", f"{k}: punteggio non numerico ({a.get('score')})")
            if a.get("pct_oi") is not None and abs(a["pct_oi"]) > 100:
                segnala("ERROR", "COT", f"{k}: netto oltre il 100% dell'open interest ({a['pct_oi']}%): dato impossibile")
        for p in pairs:
            if not _ok(p.get("score")):
                segnala("ERROR", "COT", f"coppia {p.get('pair')}: punteggio non numerico")
    except Exception as e:
        segnala("ERROR", "controlli", f"controllo COT non eseguito: {e}")

    # ---- FRED: serie ferme da troppo tempo e salti di prezzo sospetti
    try:
        for sid, pts in (fred or {}).items():
            if not pts:
                continue
            last = pts[-1][0]
            # v7.90 le serie mensili hanno la data del 1o del mese ed escono 2-7 settimane dopo: soglia di 80 giorni
            tol = 80 if sid in MENSILI else (12 if sid in ("WALCL", "WTREGEN") else 7)
            if last < (today - timedelta(days=tol)).isoformat():
                segnala("WARNING", "FRED", f"{sid}: ultimo dato del {last}, nessun aggiornamento da piu' di {tol} giorni")
        for key, (sid, _) in PRICES.items():
            pts = (fred or {}).get(sid) or []
            if len(pts) >= 2 and pts[-2][1]:
                salto = abs(pts[-1][1] / pts[-2][1] - 1) * 100
                if salto > 25:
                    segnala("WARNING", "FRED", f"{key} ({sid}): variazione del {salto:.0f}% in un giorno, verificare il dato")
    except Exception as e:
        segnala("ERROR", "controlli", f"controllo FRED non eseguito: {e}")

    # ---- BCE: tassi dei mutui fuori da ogni intervallo plausibile
    try:
        for c in ("IT", "U2"):
            for mt in ("A", "F", "P"):
                pts = (ecb or {}).get(K_MIR.format(c=c, m=mt)) or []
                if pts and not (0 <= pts[-1][1] <= 15):
                    segnala("ERROR", "BCE", f"tasso mutui {c}/{mt} = {pts[-1][1]}%: valore impossibile")
        if mort and mort.get("proj_fix") and mort["proj_fix"]["points"]:
            p = mort["proj_fix"]["points"][-1]
            if mort.get("fix") is not None and abs(p["value"] - mort["fix"]) > 1.5:
                segnala("WARNING", "BCE", f"stima del mutuo fisso molto distante dall'ultimo dato ({p['value']}% vs {mort['fix']}%)")
    except Exception as e:
        segnala("ERROR", "controlli", f"controllo BCE non eseguito: {e}")

    if not trovati:
        log.info("Controlli qualita' dati: nessuna anomalia")
    return trovati
