# -*- coding: utf-8 -*-
"""
modalita.py - v7.60 MODALITA' DI MERCATO DELL'S&P 500 (card Quadro economico, dettaglio USA). Solo contesto.

IDEA ("The Long and Short of It", cap. K3, deciso con Ya il 12/11/2026): tre stati d'animo del mercato.
  PESSIMISMO  prezzo sotto la media a 200 giorni
  ECCESSO     prezzo sopra la media di piu' dell'80o percentile della distanza degli ultimi 5 anni
              (mercato "staccato" dai suoi livelli abituali: "eccesso di ottimismo")
  NORMALE     tutto il resto
STUDIO (studi/studio_modalita_mercato.py, 12/11/2026): nessun vantaggio operativo. Ridurre in ECCESSO non ha
  aiutato (fino al 2010 l'eccesso ha reso come il normale); il PESSIMISMO si e' capovolto (fino al 2010 conveniva
  stare fuori, dal 2011 sono stati i mesi migliori, con drawdown piu' ampi). Per questo e' SOLO CONTESTO.
STORICO mostrato nella (i): a ogni fine mese dal 1999, rendimento dell'S&P 500 (SPY, dividendi inclusi) nei 3 mesi
  dopo meno la liquidita' (titoli USA a 3 mesi, DTB3), quota di casi positivi e drawdown medio nei 3 mesi.
DEBUG: python -m unittest tests.test_modalita -v
"""
import csv
import os

MEDIA = 200            # sedute della media mobile
FINESTRA = 1260        # 5 anni di sedute per il percentile
PERCENTILE = 0.8
MODI = ("PESSIMISMO", "NORMALE", "ECCESSO")
# v8.40 CONFERMA DEI CAMBI (studi/studio_conferma_stati.py, 20/11/2026): vicino alla soglia lo stato cambiava ~14 volte
# l'anno e il 70% dei cambi durava meno di 10 giorni. Un cambio vale solo dopo CONFERMA giorni di borsa di fila nello
# stesso stato: con 7 i "ritorni lampo" scendono al 7% (regola fissata prima: il piu' piccolo N con <= 10%).
CONFERMA = 7
FINESTRA_CAMBI = 500   # sedute guardate all'indietro per trovare l'ultimo cambio confermato (~2 anni)


def _distanze(prezzi):
    """distanza % del prezzo dalla media dei 200 giorni PRECEDENTI (None all'inizio)."""
    out, somma = [None] * len(prezzi), 0.0
    for i, p in enumerate(prezzi):
        if i >= MEDIA:
            out[i] = p / (somma / MEDIA) - 1
            somma -= prezzi[i - MEDIA]
        somma += p
    return out


def _modo(dist, i):
    """(modalita', soglia dell'eccesso) all'indice i usando solo il passato; None se la storia e' corta."""
    if dist[i] is None or i < FINESTRA:
        return None
    passato = sorted(v for v in dist[i - FINESTRA:i] if v is not None)
    if len(passato) < FINESTRA // 2:
        return None
    soglia = passato[int(PERCENTILE * len(passato))]
    return ("PESSIMISMO" if dist[i] < 0 else "ECCESSO" if dist[i] > soglia else "NORMALE"), soglia


def confermati(grezzi, n=CONFERMA):
    """[(indice del PRIMO giorno del nuovo stato, indice della conferma, stato)] dei cambi confermati: lo stato nuovo
    deve durare n giorni di borsa di fila. grezzi = stato di ogni giorno (None = non calcolabile)."""
    out, cur, serie = [], None, 0
    for i, st in enumerate(grezzi):
        if st is None:
            serie = 0
            continue
        serie = serie + 1 if i and grezzi[i - 1] == st else 1
        if st != cur and serie >= n:
            cur = st
            out.append((i - n + 1, i, st))
    return out


def stato_confermato(date, dist, n=CONFERMA):
    """{modo, da, conf, prima, attesa} dell'ultimo stato CONFERMATO; attesa = {modo, giorni} se oggi lo stato del
    giorno e' diverso e non ancora confermato. None se la storia e' corta."""
    inizio = max(0, len(dist) - FINESTRA_CAMBI)
    grezzi = [None] * inizio + [(_modo(dist, i) or (None,))[0] for i in range(inizio, len(dist))]
    c = confermati(grezzi, n)
    if not c:
        return None
    a, b, st = c[-1]
    out = {"modo": st, "da": date[a], "conf": date[b], "prima": c[-2][2] if len(c) > 1 else None}
    oggi = grezzi[-1]
    if oggi and oggi != st:
        g = 0
        for x in reversed(grezzi):
            if x != oggi:
                break
            g += 1
        out["attesa"] = {"modo": oggi, "giorni": g}
    return out


def _liquidita(cartella):
    """{aaaa-mm: tasso annuo % a fine mese} dei titoli a 3 mesi (DTB3) dall'archivio; {} se manca."""
    f = os.path.join(cartella or "", "DTB3.csv")
    out = {}
    if not cartella or not os.path.exists(f):
        return out
    with open(f, encoding="utf-8") as fh:
        for r in csv.reader(fh):
            try:
                out[r[0][:7]] = float(r[-1])
            except (ValueError, IndexError):
                continue
    return out


def calcola(px, cartella=None):
    """px = {"SPY": [(data, prezzo)]} (prezzi dei portafogli). Restituisce
    {modo, dist, soglia, data, dal, storico: {modo: [eccesso 3 mesi %, positivi %, drawdown medio %, casi]}} o None.
    v8.40: modo = stato CONFERMATO (CONFERMA giorni), da = primo giorno del nuovo stato, conf = giorno della conferma,
    prima = stato precedente, attesa = {modo, giorni} se oggi il mercato e' in uno stato non ancora confermato."""
    pts = [(d, p) for d, p in (px or {}).get("SPY") or [] if p and p > 0]
    if len(pts) < FINESTRA + MEDIA:
        return None
    date = [d for d, _ in pts]
    prezzi = [p for _, p in pts]
    dist = _distanze(prezzi)
    oggi = _modo(dist, len(prezzi) - 1)
    if not oggi:
        return None
    out = {"modo": oggi[0], "dist": round(dist[-1] * 100, 1), "soglia": round(oggi[1] * 100, 1), "data": date[-1]}
    sc = stato_confermato(date, dist)                    # v8.40 lo stato mostrato e' quello CONFERMATO
    out["n"] = CONFERMA
    if sc:
        out.update(sc)
    # storico: ultimo giorno di borsa di ogni mese -> 3 mesi dopo
    tassi = _liquidita(cartella)
    fine = {}
    for i, d in enumerate(date):
        fine[d[:7]] = i
    mesi = sorted(fine)
    agg = {m: [] for m in MODI}
    for k, m in enumerate(mesi[:-3]):
        i, i3 = fine[m], fine[mesi[k + 3]]
        mo = _modo(dist, i)
        if not mo or m < "1999-01":
            continue
        rf = tassi.get(m, 0.0) / 100 / 4                                     # 3 mesi di liquidita'
        r3 = prezzi[i3] / prezzi[i] - 1 - rf
        dd = min(prezzi[i:i3 + 1]) / prezzi[i] - 1
        agg[mo[0]].append((r3, dd))
    st = {}
    for m, v in agg.items():
        if v:
            st[m] = [round(sum(x for x, _ in v) / len(v) * 100, 1), round(100 * sum(x > 0 for x, _ in v) / len(v)),
                     round(sum(y for _, y in v) / len(v) * 100, 1), len(v)]
    if st:
        out["storico"] = st
        out["dal"] = next((m for m in mesi if m >= "1999-01" and _modo(dist, fine[m])), None)
        out["liquidita"] = bool(tassi)
    return out
