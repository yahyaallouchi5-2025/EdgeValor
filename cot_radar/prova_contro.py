# -*- coding: utf-8 -*-
"""
prova_contro.py - v8.72 TEST IN AVANTI "CONTRO GLI SPECULATORI" su 5 mercati. Deciso con Ya il 22/11/2026.

PERCHE': nello studio studi/studio_comportamento_cot.py su 5 mercati il prezzo va CONTRO i grandi speculatori sia
nello studio (fino al 2014) sia nella verifica (dal 2015). Ma quei 5 mercati li abbiamo scelti guardando ENTRAMBI i
periodi: rifare il conto sugli stessi anni darebbe un risultato buono per forza. L'unico controllo pulito e' il
FUTURO: da oggi il sito segna da solo ogni nuovo episodio, con prezzi e regole fissati prima di vedere l'esito.

REGOLE FISSATE IL 22/11/2026 (non si cambiano: sono anche scritte nel primo evento del file, dentro la catena):
  - mercati: COFFEE, OJ, AUDNZD, EURCAD, GBPCAD (US2Y e SOYOIL esclusi: reggevano solo grazie ai costi);
  - episodi come speculatori.py / comportamento.py, solo quelli con inizio (martedi' del report) DOPO il 22/11/2026;
  - posizione CONTRARIA agli speculatori: ingresso alla prima chiusura dopo la pubblicazione del report, uscita alla
    prima chiusura dopo il report che chiude l'episodio; rendimento MENO i costi del sito (motore.costo);
  - giudizio solo con almeno 30 episodi chiusi sui 5 mercati insieme (circa 11 mesi: storicamente ~35 all'anno):
    "regge" se la quota a favore supera il 50% e la media netta e' positiva (stesso criterio della verifica dello
    studio), altrimenti "non regge". Prima di 30: "in raccolta", nessun giudizio.
NON SI MOSTRA AI CLIENTI: il riepilogo va solo nel registro admin cifrato (main.py -> admin.cifra).

DOVE STA: storico/segnali/prova_contro.jsonl (ramo "storico"), una riga per evento, solo in aggiunta, con la stessa
catena di hash del registro live (registro.impronta): un evento vecchio cambiato rompe la catena e si smette di
scrivere. Il prezzo d'ingresso salvato non si ricalcola piu' (una revisione dei dati non cambia il passato).
Si scrive come il registro: solo sul sito, con COT online, e solo dopo la pubblicazione (main.py chiama salva()).
DEBUG: python -c "from cot_radar import prova_contro as P; print(P.riepilogo(P.leggi()))"
"""
import json
import os
from datetime import timezone

from . import motore, registro, speculatori as SP
from .comportamento import costo
from .log import log

CARTELLA = registro.CARTELLA
FILE = "prova_contro.jsonl"
DAL = "2026-11-22"
MERCATI = ("COFFEE", "OJ", "AUDNZD", "EURCAD", "GBPCAD")
MIN_GIUDIZIO = 30
REGOLA = ("Contro gli speculatori su COFFEE, OJ, AUDNZD, EURCAD, GBPCAD; episodi con inizio dopo il 22/11/2026; "
          "ingresso e uscita come speculatori.py, rendimento netto dei costi del sito. Giudizio con almeno 30 episodi "
          "chiusi: regge se quota a favore > 50% e media netta > 0, altrimenti non regge.")

_in_attesa = None


def leggi(cartella=CARTELLA):
    f = os.path.join(cartella, FILE)
    if not os.path.exists(f):
        return []
    with open(f, encoding="utf-8") as fh:
        return [json.loads(r) for r in fh if r.strip()]


def _scrivi(cartella, eventi):
    os.makedirs(cartella, exist_ok=True)
    f = os.path.join(cartella, FILE)
    tmp = f + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        for e in eventi:
            fh.write(json.dumps(e, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")
    os.replace(tmp, f)


def episodi_nuovi(righe_cot, prezzi):
    """Episodi dei 5 mercati iniziati dopo DAL: {(k, inizio): {...}} con prezzi d'ingresso e (se chiuso) d'uscita."""
    out = {}
    for k, st_ in SP.direzioni(righe_cot, prezzi).items():
        if k not in MERCATI:
            continue
        pts = st_["pts"]
        indice = {p[0]: i for i, p in enumerate(pts)}
        for e in SP.episodi(st_, None):
            if e["inizio"] <= DAL:
                continue
            a, b = indice[e["ing"]], indice[e["usc"]]
            out[(k, e["inizio"])] = {"k": k, "inizio": e["inizio"], "verso": -e["verso"], "ing": e["ing"],
                                     "p_ing": pts[a][1], "chiuso": not e["attivo"], "fine": e["fine"],
                                     "usc": e["usc"], "p_usc": pts[b][1], "sett": e["sett"]}
    return out


def _ris(p_ing, p_usc, verso, cst):
    return round((p_usc / p_ing - 1) * 100 * verso - cst, 3)


def nuovi_eventi(eventi, episodi, quando):
    """Eventi da aggiungere: regole (file vuoto), apertura dei nuovi episodi, chiusura di quelli finiti."""
    nuovi = [] if eventi else [{"tipo": "regole", "scritto": quando, "dal": DAL, "mercati": list(MERCATI),
                                "regola": REGOLA, "min": MIN_GIUDIZIO}]
    aperti = {(e["k"], e["inizio"]): e for e in eventi if e["tipo"] == "apre"}
    chiusi = {(e["k"], e["inizio"]) for e in eventi if e["tipo"] == "chiude"}
    for chiave in sorted(episodi, key=lambda c: (c[1], c[0])):
        ep = episodi[chiave]
        if chiave not in aperti:
            ap = {"tipo": "apre", "scritto": quando, "k": ep["k"], "inizio": ep["inizio"], "verso": ep["verso"],
                  "ing": ep["ing"], "p_ing": ep["p_ing"], "cst": costo(ep["k"])}
            nuovi.append(ap)
            aperti[chiave] = ap
        if ep["chiuso"] and chiave not in chiusi:
            ap = aperti[chiave]
            nuovi.append({"tipo": "chiude", "scritto": quando, "k": ep["k"], "inizio": ep["inizio"],
                          "fine": ep["fine"], "usc": ep["usc"], "p_usc": ep["p_usc"], "sett": ep["sett"],
                          "ris": _ris(ap["p_ing"], ep["p_usc"], ap["verso"], ap["cst"])})
    for chiave in aperti:
        if chiave not in episodi and chiave not in chiusi:
            log.info("prova contro: episodio %s %s non piu' presente nei dati (revisione COT?)", *chiave)
    return nuovi


def riepilogo(eventi, episodi=None, integra=True):
    """Per il registro admin: episodi aperti (con la mossa di oggi), chiusi, quota a favore, giudizio."""
    aperti = {(e["k"], e["inizio"]): e for e in eventi if e["tipo"] == "apre"}
    chiusi = [e for e in eventi if e["tipo"] == "chiude"]
    fatti = {(e["k"], e["inizio"]) for e in chiusi}
    ora = []
    for c, ap in sorted(aperti.items(), key=lambda x: x[0][1]):
        if c in fatti:
            continue
        ep = (episodi or {}).get(c)
        ora.append({"k": ap["k"], "inizio": ap["inizio"], "verso": ap["verso"], "ing": ap["ing"],
                    "ris": _ris(ap["p_ing"], ep["p_usc"], ap["verso"], ap["cst"]) if ep else None})
    r = [e["ris"] for e in chiusi]
    n = len(r)
    pos = round(100 * sum(1 for x in r if x > 0) / n) if n else None
    media = round(sum(r) / n, 2) if n else None
    giud = (f"in raccolta ({n}/{MIN_GIUDIZIO})" if n < MIN_GIUDIZIO
            else "regge" if pos > 50 and media > 0 else "non regge")
    per = {}
    for e in chiusi:
        per.setdefault(e["k"], []).append(e["ris"])
    return {"dal": DAL, "integra": integra, "aperti": ora, "n": n, "pos": pos, "media": media, "giudizio": giud,
            "per": {k: {"n": len(v), "pos": round(100 * sum(1 for x in v if x > 0) / len(v))} for k, v in per.items()},
            "ultimi": [{x: e[x] for x in ("k", "inizio", "fine", "sett", "ris")} for e in chiusi[-8:]][::-1]}


def aggiorna(righe_cot, prezzi, fonti, adesso, scrivi=True, cartella=CARTELLA):
    """Calcola gli eventi nuovi (li scrive salva()) e restituisce il riepilogo per il registro admin."""
    global _in_attesa
    _in_attesa = None
    eventi = leggi(cartella)
    integra, ultimo, rotto = registro.verifica(eventi)
    if not integra:
        log.error("prova contro: catena di hash NON integra dall'evento %d, non scrivo nulla", rotto)
    episodi = episodi_nuovi(righe_cot, prezzi)
    if scrivi and integra and (fonti or {}).get("cot") == "online":
        quando = motore.utc_iso(adesso.astimezone(timezone.utc))
        nuovi = nuovi_eventi(eventi, episodi, quando)
        if nuovi:
            eventi = eventi + registro.concatena(nuovi, ultimo, len(eventi))
            _in_attesa = (cartella, eventi)
    return riepilogo(eventi, episodi, integra)


def salva():
    """Scrive gli eventi in attesa. SOLO dopo la pubblicazione (come registro.salva)."""
    global _in_attesa
    if not _in_attesa:
        return 0
    cartella, eventi = _in_attesa
    try:
        _scrivi(cartella, eventi)
    except OSError as e:
        log.error("prova contro NON salvata (%s): si ricalcola al prossimo giro", e)
        return 0
    _in_attesa = None
    return len(eventi)
