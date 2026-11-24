# -*- coding: utf-8 -*-
"""
fotografia.py - v9.07 SEGNALI COT "FOTOGRAFATI" AL REPORT (Ya, 24/11/2026: "il segnale nasce solo al report COT").

PROBLEMA
  Il punteggio di ogni strumento unisce il posizionamento COT (settimanale) e una parte macro (tassi FRED, ogni
  giorno). Cosi' un segnale poteva nascere o chiudersi un lunedi' sera senza nessun report nuovo: sul canale
  arrivava un "aggiornamento COT" di martedi', e Live/Comportamento si sfasavano rispetto all'uscita del report.

REGOLA
  Al PRIMO giro ufficiale del sito con un report COT nuovo (e fonti complete: COT e FRED online) si salva una
  fotografia di etichette e punteggi di tutti gli strumenti. Fino al report successivo la pagina e il registro dei
  segnali usano SOLO quella fotografia: i segnali si aprono e si chiudono esclusivamente con il report.
  I prezzi, le notizie e la parte macro restano aggiornati ogni giorno nelle loro schede (solo informazione).

FILE: storico/segnali/fotografia.json  {"cot": "AAAA-MM-GG", "quando": "...Z", "assets": {k: campi}, "pairs": {k: campi}}
  (ramo "storico", accanto al registro dei segnali; si riscrive una volta a settimana).
DEBUG: python -c "from cot_radar import fotografia as f; print(f.leggi().get('cot'))"
"""
import json
import os

from .log import log

FILE = "fotografia.json"
# campi che decidono il segnale: congelati fino al report successivo
CAMPI = ("score", "label", "new", "prev", "prev_label", "div", "comm_acc", "crowded")


def _cartella():
    from .registro import CARTELLA
    return CARTELLA


def leggi(cartella=None):
    try:
        with open(os.path.join(cartella or _cartella(), FILE), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _chiave_coppia(p):
    return f"{p.get('base')}/{p.get('quote')}"


def scatta(assets, pairs, cot, quando):
    """Fotografia dei campi del segnale per ogni strumento e coppia."""
    return {"cot": cot, "quando": quando,
            "assets": {k: {c: a.get(c) for c in CAMPI if c in a} for k, a in assets.items()},
            "pairs": {_chiave_coppia(p): {c: p.get(c) for c in CAMPI if c in p} for p in pairs}}


def applica(assets, pairs, cot, fonti, quando, cartella=None, scrivi=True):
    """Congela i segnali al report COT. Modifica assets e pairs sul posto. -> "nuova" | "applicata" | "nessuna".
    - report nuovo (o nessuna fotografia) con fonti complete: si scatta e si salva (scrivi=True), segnali di adesso;
    - stesso report della fotografia: si rimettono etichette e punteggi del giorno del report;
    - report nuovo ma fonti incomplete: niente fotografia (si riprova al giro dopo), segnali di adesso."""
    if not cot:
        return "nessuna"
    cartella = cartella or _cartella()
    f = leggi(cartella)
    if f.get("cot") == cot:
        n = 0
        for k, a in assets.items():
            v = (f.get("assets") or {}).get(k)
            if v:
                a.update(v)
                n += 1
        for p in pairs:
            v = (f.get("pairs") or {}).get(_chiave_coppia(p))
            if v:
                p.update(v)
                n += 1
        log.info("fotografia COT del %s applicata a %d strumenti (segnali fermi fino al prossimo report)", cot, n)
        return "applicata"
    completi = (fonti or {}).get("cot") == "online" and (fonti or {}).get("fred") == "online"
    if f.get("cot") and f["cot"] > cot:
        return "nessuna"                         # report piu' vecchio della fotografia (copia di riserva): non si tocca
    if not completi:
        log.info("fotografia COT del %s rimandata: fonti incomplete (%s)", cot, fonti)
        return "nessuna"
    if scrivi:
        try:
            os.makedirs(cartella, exist_ok=True)
            with open(os.path.join(cartella, FILE), "w", encoding="utf-8") as fh:
                json.dump(scatta(assets, pairs, cot, quando), fh, ensure_ascii=False, separators=(",", ":"))
            log.info("fotografia COT del %s salvata: da qui i segnali restano fermi fino al prossimo report", cot)
        except OSError as e:
            log.warning("fotografia COT non salvata (%s)", e)
    return "nuova"
