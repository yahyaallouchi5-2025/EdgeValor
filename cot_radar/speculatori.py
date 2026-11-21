# -*- coding: utf-8 -*-
"""
speculatori.py - v8.65 POSIZIONAMENTO DEGLI SPECULATORI, EPISODIO PER EPISODIO (idea di Ya, 21/11/2026).

PERCHE'
  La Live di prima misurava i "segnali del terminale" (COT 70% + mercato 30%), che cambiano ogni giorno: tanti
  segnali di 1 giorno, rumore. Qui si studia SOLO il COT, al suo ritmo settimanale, per capire:
  quanto dura una spinta degli speculatori, quanto va nella sua direzione, quanto va contro (drawdown) e PERCHE'
  (le notizie del giorno peggiore). Niente probabilita' di vincita: sono dati per costruirsi un'operativita' propria.
  Parola usata in pagina: "posizionamento degli speculatori" (non "segnali").

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - direzione di ogni settimana = etichetta COT del sito (cot.label, stesse soglie): comprano / vendono / neutri;
    per le coppie di valute come nel backtest: (punteggio base - punteggio quotata) / 2;
  - EPISODIO = dal report in cui la direzione diventa "comprano" o "vendono" fino al primo report in cui cambia
    (neutri o direzione opposta). Durata = numero di report consecutivi con la stessa direzione;
  - AGGRESSIONE = nel report di partenza il flusso settimanale degli speculatori (variazione del netto in % dell'open
    interest, z-score sulle ultime 52 settimane) e' forte nella stessa direzione: |z| >= 1,28 (circa il 20% piu'
    forte). Per le coppie: (z base - z quotata) / radice di 2;
  - PREZZI: ingresso = prima chiusura dopo l'uscita del report (venerdi' 15:30 di New York); uscita = prima chiusura
    dopo l'uscita del report che chiude l'episodio. Solo chiusure giornaliere (FRED/Yahoo): massimi e minimi sono
    sulle chiusure;
  - MISURE nella direzione degli speculatori (positivo = il prezzo va dove spingono): risultato, guadagno massimo,
    drawdown massimo e il suo giorno; settimane favorevoli e contrarie; volatilita' durante l'episodio rispetto
    all'anno prima (rapporto: 1 = normale); ripetizione = un episodio nella stessa direzione finito nelle 3
    settimane prima;
  - NOTIZIE: annunci USA (NFP, CPI, Fed) dentro l'episodio e quello del giorno del drawdown massimo con la mossa
    dello strumento in quella seduta. Il confronto con le previsioni (dato sopra o sotto le attese) richiede un
    calendario con le stime: non ancora disponibile, quindi per ora solo la reazione del prezzo.
DEBUG: python -c "from cot_radar import speculatori as S; print(S.calcola(righe, prezzi)['EURUSD']['riass'])"
"""
import math
from datetime import date

from . import motore
from .backtest import FINESTRA, MAJORS
from .config import ASSETS, EXTRA_PAIRS, FX_ORDER, PAIR_NAMES
from .cot import cot_series, cot_strength, is_divergence, label, zlast
from .eventi import CHIUSURA_ET, Calendario
from .registro import SALTA_FX
from .stagionalita import prezzo_coppia

Z_AGGR = 1.28            # soglia del flusso "forte" (circa il 20% delle settimane piu' forti, nei due versi)
RIPETE = 3               # settimane: un episodio nella stessa direzione finito da poco = "ripetuto"
MAX_EPISODI = 60         # episodi per strumento mandati alla pagina (i piu' recenti); le medie usano tutti


def _settimane(ser):
    """{martedi': (punteggio COT, z del flusso settimanale)} con i soli dati fino a ogni settimana."""
    out = {}
    for t in range(29, len(ser)):
        s = ser[max(0, t - FINESTRA):t + 1]
        st = cot_strength(s, len(s) - 1)
        if not st:
            continue
        n = [x["net"] / x["oi"] * 100 for x in s]
        d1 = [n[i] - n[i - 1] for i in range(1, len(n))]
        out[s[-1]["date"]] = (st["cot"], zlast(d1[-52:]) if len(d1) >= 20 else 0.0)
    return out


def _verso(lab):
    return 1 if lab in ("BUY", "STRONG BUY") else -1 if lab in ("SELL", "STRONG SELL") else 0


def direzioni(cot_righe, prezzi):
    """{strumento: {"pts", "cls", "sett": [(martedi', verso, z flusso, punteggio)]}} come il backtest."""
    serie = cot_series(cot_righe)
    per_k = {a[0]: serie[a[1]] for a in ASSETS if a[1] in serie}
    utili = set(MAJORS) | {"DXY"} | {b for b, q in EXTRA_PAIRS} | {q for b, q in EXTRA_PAIRS} | set(FX_ORDER)
    utili |= {k for k in prezzi if k not in SALTA_FX}
    sc = {k: _settimane(s) for k, s in per_k.items() if k in utili}
    # dollaro composito come nel backtest: 50% DXY + 50% inverso della media delle altre valute (per punteggio e flusso)
    if all(c in sc for c in MAJORS):
        usd = {}
        for d in sc["EUR"]:
            v = [sc[c][d] for c in MAJORS if d in sc[c]]
            if len(v) == len(MAJORS):
                inv_p, inv_z = -sum(x[0] for x in v) / len(v), -sum(x[1] for x in v) / len(v)
                x = sc.get("DXY", {}).get(d)
                usd[d] = ((0.5 * x[0] + 0.5 * inv_p, 0.5 * x[1] + 0.5 * inv_z) if x else (inv_p, inv_z))
        sc["USD"] = usd
    fx = [c for c in FX_ORDER if c in sc]
    combo = [(fx[i], fx[j]) for i in range(len(fx)) for j in range(i + 1, len(fx))] + list(EXTRA_PAIRS)
    out = {}
    for b, q in combo:
        pts = prezzo_coppia(prezzi, b, q)
        if not pts or b not in sc or q not in sc:
            continue
        righe = []
        for d in sorted(set(sc[b]) & set(sc[q])):
            (sb, zb), (sq, zq) = sc[b][d], sc[q][d]
            p = round((sb - sq) / 2, 1)
            righe.append((d, _verso(label(p, is_divergence(sb, sq))), (zb - zq) / math.sqrt(2), p))
        out[PAIR_NAMES.get((b, q), b + q)] = {"pts": pts, "cls": "fx", "sett": righe}
    for k in sc:
        if k in prezzi and k not in SALTA_FX:
            out[k] = {"pts": prezzi[k], "cls": motore.classe(k),
                      "sett": [(d, _verso(label(p, single=True)), z, p) for d, (p, z) in sorted(sc[k].items())]}
    return out


def _vol(pts, i0, i1):
    """volatilita' giornaliera (deviazione standard dei rendimenti %) tra gli indici i0 e i1."""
    r = [(pts[i][1] / pts[i - 1][1] - 1) * 100 for i in range(max(1, i0), i1 + 1)]
    if len(r) < 3:
        return None
    m = sum(r) / len(r)
    return math.sqrt(sum((x - m) ** 2 for x in r) / (len(r) - 1))


def episodi(st, cal=None):
    """Episodi di uno strumento: [{inizio, fine, verso, sett, aggr, z, ris, mfe, mae, g_mae, d_mae, fav, contro,
    vol, rip, attivo, notizie, n_mae}] dal piu' vecchio. st = una voce di direzioni()."""
    pts, cls, S = st["pts"], st["cls"], st["sett"]
    date_px = [p[0] for p in pts]
    h = CHIUSURA_ET.get(cls, 16.0)
    out, i = [], 0
    while i < len(S):
        d0, v, z, _ = S[i]
        if v == 0 or (i and S[i - 1][1] == v):
            i += 1
            continue
        j = i
        while j + 1 < len(S) and S[j + 1][1] == v:
            j += 1
        attivo = j + 1 >= len(S)
        a = motore._primo_dopo(pts, motore.pubblicazione_cot(d0), cls)
        b = None if attivo else motore._primo_dopo(pts, motore.pubblicazione_cot(S[j + 1][0]), cls, a or 0)
        if a is None:
            i = j + 1
            continue
        b = b if b is not None else len(pts) - 1
        if b <= a:
            i = j + 1
            continue
        p0 = pts[a][1]
        mv = [(pts[k][1] / p0 - 1) * 100 * v for k in range(a, b + 1)]          # nella direzione degli speculatori
        k_mae = min(range(len(mv)), key=lambda k: mv[k])
        # settimana per settimana: da un report al successivo, la mossa e' a favore o contro?
        fav = contro = 0
        for w in range(i, j + 1):
            x0 = motore._primo_dopo(pts, motore.pubblicazione_cot(S[w][0]), cls, a)
            x1 = b if w == j else motore._primo_dopo(pts, motore.pubblicazione_cot(S[w + 1][0]), cls, a)
            if x0 is not None and x1 is not None and x1 > x0:
                if (pts[x1][1] - pts[x0][1]) * v > 0:
                    fav += 1
                else:
                    contro += 1
        # volatilita' durante l'episodio rispetto all'anno prima
        vi, vp = _vol(pts, a + 1, b), _vol(pts, max(1, a - 250), a)
        # notizie USA dentro l'episodio e nella seduta del drawdown massimo
        notizie, n_mae = [], None
        if cal is not None:
            for dd, hh, nome in cal.lista:
                if date_px[a] < dd <= date_px[b]:
                    notizie.append(nome)
            if k_mae > 0:
                g_prima, g = date_px[a + k_mae - 1], date_px[a + k_mae]
                nel = [nome for dd, hh, nome in cal.lista if (g_prima, h) < (dd, hh) <= (g, h)]
                if nel:
                    n_mae = {"n": "/".join(sorted(set(nel))), "m": round(mv[k_mae] - mv[k_mae - 1], 2)}
        prec = next((e for e in reversed(out) if e["verso"] == v), None)
        rip = bool(prec and (date.fromisoformat(d0) - date.fromisoformat(prec["fine"] or d0)).days <= RIPETE * 7)
        out.append({"inizio": d0, "fine": None if attivo else S[j + 1][0], "verso": v, "sett": j - i + 1,
                    "aggr": abs(z) >= Z_AGGR and z * v > 0, "z": round(z, 2), "attivo": attivo,
                    "ris": round(mv[-1], 2), "mfe": round(max(0.0, max(mv)), 2) + 0.0, "mae": round(min(0.0, mv[k_mae]), 2),
                    "g_mae": k_mae, "d_mae": date_px[a + k_mae], "fav": fav, "contro": contro,
                    "vol": round(vi / vp, 2) if vi and vp else None, "rip": rip,
                    "notizie": sorted(set(notizie)), "n_mae": n_mae,
                    "ing": date_px[a], "usc": date_px[b]})
        i = j + 1
    return out


def _med(v):
    v = sorted(x for x in v if x is not None)
    if not v:
        return None
    m = len(v) // 2
    return round(v[m] if len(v) % 2 else (v[m - 1] + v[m]) / 2, 2)


def riassunto(eps):
    """Numeri della scheda per una lista di episodi chiusi."""
    ch = [e for e in eps if not e["attivo"]]
    if not ch:
        return None
    dur = [e["sett"] for e in ch]
    return {"n": len(ch), "dur": round(sum(dur) / len(dur), 1), "dur1": round(100 * sum(1 for x in dur if x == 1) / len(dur)),
            "mae": _med([e["mae"] for e in ch]), "mae_peg": min(e["mae"] for e in ch), "mfe": _med([e["mfe"] for e in ch]),
            "ris": _med([e["ris"] for e in ch]),
            "fav": round(100 * sum(e["fav"] for e in ch) / max(1, sum(e["fav"] + e["contro"] for e in ch))),
            "vol": _med([e["vol"] for e in ch]), "rip": round(100 * sum(1 for e in ch if e["rip"]) / len(ch))}


def calcola(cot_righe, prezzi, cal=None):
    """{strumento: {"tutti": riassunto, "aggr": riassunto (solo con aggressione), "episodi": ultimi MAX_EPISODI,
    "cambi26": cambi di direzione nelle ultime 26 settimane, "ora": settimana attuale}}."""
    if not cot_righe or not prezzi:
        return {}
    cal = cal if cal is not None else Calendario()
    out = {}
    for k, st in direzioni(cot_righe, prezzi).items():
        eps = episodi(st, cal)
        if not eps:
            continue
        S = st["sett"][-27:]
        cambi = sum(1 for x in range(1, len(S)) if S[x][1] != S[x - 1][1])
        u = st["sett"][-1]
        out[k] = {"tutti": riassunto(eps), "aggr": riassunto([e for e in eps if e["aggr"]]),
                  "episodi": eps[-MAX_EPISODI:], "cambi26": cambi,
                  "ora": {"data": u[0], "verso": u[1], "z": round(u[2], 2), "punt": u[3]},
                  "fam": "fx" if st["cls"] == "fx" else st["cls"]}
    return out
