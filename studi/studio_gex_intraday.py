# -*- coding: utf-8 -*-
"""
studio_gex_intraday.py - QUALE DATO AIUTA DAVVERO LO SWING E L'INTRADAY SULL'S&P 500? (Ya, 22/11/2026)
Studio COMBINATO: esposizione gamma dei market maker (GEX), DIX, VIX, trend e commercial del COT, messi alla prova
sulle candele orarie di SPY. SOLO STUDIO: i dati di terzi (SqueezeMetrics, Cboe) si usano qui e non vanno sul sito
senza il permesso dell'autore.

IDEA DA VERIFICARE
  I market maker delle opzioni ribilanciano ogni giorno la copertura (delta hedging). Con GEX POSITIVA comprano sui
  ribassi e vendono sui rialzi: giornate piu' strette e piu' "ritorni" verso l'apertura. Con GEX NEGATIVA fanno il
  contrario: giornate piu' ampie e rotture che continuano. DIX alto = acquisti nascosti nei dark pool (tesi rialzista).

DATI (scaricati il 22/11/2026, cartella passata come argomento)
  DIX.csv   SqueezeMetrics (file pubblico): date, price (S&P 500), dix, gex. Valore della giornata, noto dopo la chiusura.
  VIX.csv   Cboe, chiusure giornaliere del VIX.
  SPY_h.csv.gz  candele orarie di SPY (archivio del sito, ramo "orari"), ora di New York, dal 18/11/2013.
  COT.csv   archivio COT del sito (E-mini S&P 500, codice 13874A): commercial.

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI (scritte il 22/11/2026 prima del primo calcolo)
  GIORNATA DI BORSA da candele orarie 09:00-15:00 di New York (la 09:00 contiene l'apertura delle 09:30; nei dati piu'
    vecchi contiene anche mezz'ora di pre-mercato: limite dichiarato). Apertura = open delle 09:00, chiusura = close
    delle 15:00, massimo e minimo sulle 7 candele. "Prima ora" = candela delle 09:00.
  TEMPI: ogni filtro usa SOLO dati noti alla chiusura del giorno prima (GEX/DIX/VIX del giorno d -> si opera il d+1).
    COT: noto dal lunedi' dopo la pubblicazione del venerdi'.
  FILTRI (giorno prima):
    F1 GEX negativa (gex < 0)                         contro  GEX positiva
    F2 GEX bassa: sotto il 20 percentile delle 252 sedute precedenti   contro  il resto
    F3 DIX alto: sopra l'80 percentile delle 252 sedute precedenti     contro  il resto
    F4 VIX alto: sopra l'80 percentile delle 252 sedute precedenti     contro  il resto
    F5 Trend: S&P 500 sotto la media delle 200 sedute                  contro  sopra
    F6 Commercial S&P: COT Index dei commercial (156 settimane) >= 90  contro  <= 10 (estremi, come Briese)
    F7 Combinato: GEX negativa E sotto la media 200                    contro  il resto
  ESITI del giorno dopo (intraday):
    E1 Ampiezza relativa = (massimo - minimo) / media delle ampiezze delle 20 sedute prima (1 = giornata normale).
       Si usa la relativa perche' che i giorni agitati seguano giorni agitati si sa gia': conta solo l'informazione IN PIU'.
    E2 Rottura che continua: se il prezzo esce dalla prima ora (prima rottura, sopra o sotto), la chiusura resta oltre
       quel livello? 1 = si', 0 = no (solo giornate con rottura).
    E3 Giornata di ritorno: |chiusura - apertura| < 30% dell'ampiezza.
    E4 Rendimento apertura -> chiusura (%).
  ESITO SWING: S&P 500 dalla chiusura del giorno d alla chiusura di d+5 (%), un'osservazione ogni 5 sedute (niente
    sovrapposizioni). Per F6 dalla seduta dopo la pubblicazione, 5 sedute.
  PERIODI: STUDIO fino al 31/12/2019, VERIFICA dal 2020 (mai usata per scegliere).
  "FUNZIONA" = differenza tra i due gruppi nella STESSA direzione nei due periodi, con |t| >= 2 in entrambi.
    I test sono 7 filtri x 5 esiti = 35: con |t| >= 2 in un periodo ci si aspettano ~2 falsi positivi per caso,
    in entrambi i periodi meno di 0,1. Per questo si chiede la conferma nella verifica.
USO: python studi/studio_gex_intraday.py <cartella dati> <archivio storico>
"""
import bisect
import csv
import gzip
import math
import os
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")
FINE_STUDIO = date(2019, 12, 31)


def leggi_dix(cart):
    out = {}
    for r in csv.DictReader(open(os.path.join(cart, "DIX.csv"))):
        try:
            out[date.fromisoformat(r["date"])] = (float(r["price"]), float(r["dix"]), float(r["gex"]))
        except ValueError:
            continue
    return out


def leggi_vix(cart):
    out = {}
    for r in csv.DictReader(open(os.path.join(cart, "VIX.csv"))):
        m, g, a = r["DATE"].split("/")
        out[date(int(a), int(m), int(g))] = float(r["CLOSE"])
    return out


def giornate(cart):
    """{giorno: (apertura, massimo, minimo, chiusura, massimo prima ora, minimo prima ora, [(ora, o, h, l, c)])}"""
    per = defaultdict(list)
    with gzip.open(os.path.join(cart, "SPY_h.csv.gz"), "rt") as f:
        next(f)
        for l in f:
            t, o, h, lo, c, _ = l.strip().split(",")
            d = datetime.fromtimestamp(int(t), NY)
            if 9 <= d.hour <= 15:
                per[d.date()].append((d.hour, float(o), float(h), float(lo), float(c)))
    out = {}
    for g, b in per.items():
        b.sort()
        ore = [x[0] for x in b]
        if ore[0] != 9 or ore[-1] != 15 or len(b) < 6:     # giornate incomplete o corte (festivi a meta' giornata)
            continue
        out[g] = (b[0][1], max(x[2] for x in b), min(x[3] for x in b), b[-1][4], b[0][2], b[0][3], b)
    return out


def perc_prec(serie, giorni, i, n=252):
    """posizione (0-1) del valore del giorno i tra quelli delle n sedute prima (None se manca lo storico)."""
    if i < n:
        return None
    v = serie[giorni[i]]
    prima = sorted(serie[giorni[k]] for k in range(i - n, i))
    return bisect.bisect_left(prima, v) / n


def cot_commercial(arch):
    """[(giorno da cui si puo' usare, COT Index commercial 156 settimane)] per l'E-mini S&P 500."""
    righe = [r for r in csv.DictReader(open(os.path.join(arch, "COT.csv"))) if r["cftc_contract_market_code"] == "13874A"]
    righe.sort(key=lambda r: r["report_date_as_yyyy_mm_dd"])
    net = [(date.fromisoformat(r["report_date_as_yyyy_mm_dd"]),
            float(r["comm_positions_long_all"]) - float(r["comm_positions_short_all"])) for r in righe]
    out = []
    for i in range(156, len(net)):
        fin = [x[1] for x in net[i - 155:i + 1]]
        lo, hi = min(fin), max(fin)
        if hi > lo:
            # pubblicazione il venerdi' (martedi' + 3), si usa dalla seduta del lunedi' dopo
            out.append((net[i][0] + timedelta(days=6), 100 * (net[i][1] - lo) / (hi - lo)))
    return out


def stat(v):
    n = len(v)
    if n < 2:
        return None
    m = sum(v) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1))
    return {"n": n, "m": m, "sd": sd}


def confronto(a, b):
    sa, sb = stat(a), stat(b)
    if not sa or not sb or sa["n"] < 20 or sb["n"] < 20:
        return None
    se = math.sqrt(sa["sd"] ** 2 / sa["n"] + sb["sd"] ** 2 / sb["n"])
    return {"na": sa["n"], "ma": sa["m"], "nb": sb["n"], "mb": sb["m"], "t": (sa["m"] - sb["m"]) / se if se else 0.0}


def main():
    cart, arch = sys.argv[1], sys.argv[2]
    dix, vix, gio = leggi_dix(cart), leggi_vix(cart), giornate(cart)
    giorni = sorted(d for d in dix if d in vix)
    gex = {d: dix[d][2] for d in giorni}
    dx = {d: dix[d][1] for d in giorni}
    vx = {d: vix[d] for d in giorni}
    px = {d: dix[d][0] for d in giorni}
    cot = cot_commercial(arch)
    cot_d = [x[0] for x in cot]
    # filtri noti alla chiusura del giorno i (si opera dal giorno i+1)
    filtri = {}
    for i, d in enumerate(giorni):
        f = {"F1": gex[d] < 0}
        pg, pd_, pv = perc_prec(gex, giorni, i), perc_prec(dx, giorni, i), perc_prec(vx, giorni, i)
        f["F2"] = None if pg is None else pg < .2
        f["F3"] = None if pd_ is None else pd_ > .8
        f["F4"] = None if pv is None else pv > .8
        f["F5"] = None if i < 200 else px[d] < sum(px[giorni[k]] for k in range(i - 199, i + 1)) / 200
        f["F7"] = None if f["F5"] is None else (f["F1"] and f["F5"])
        k = bisect.bisect_right(cot_d, d) - 1               # ultimo COT gia' pubblicato e usabile il giorno dopo
        ci = cot[k][1] if k >= 0 and (d - cot_d[k]).days < 14 else None
        f["F6"] = None if ci is None else (True if ci >= 90 else False if ci <= 10 else None)
        filtri[d] = f
    # esiti del giorno dopo
    gg = sorted(gio)
    amp = {g: (gio[g][1] - gio[g][2]) / gio[g][0] for g in gg}
    esiti = []
    for i, d in enumerate(giorni[:-1]):
        n = giorni[i + 1]
        if n not in gio:
            continue
        j = gg.index(n)
        if j < 20:
            continue
        o, h, l, c, h1, l1, b = gio[n]
        e = {"d": n, "f": filtri[d]}
        e["E1"] = amp[n] / (sum(amp[gg[k]] for k in range(j - 20, j)) / 20)
        # prima rottura della prima ora (candele dalle 10:00 in poi)
        rott = None
        for _, bo, bh, bl, bc in b[1:]:
            su, giu = bh > h1, bl < l1
            if su or giu:
                rott = 1 if su and not giu else -1 if giu and not su else (1 if bc > bo else -1)
                break
        e["E2"] = None if rott is None else (1.0 if (c > h1 if rott > 0 else c < l1) else 0.0)
        e["E3"] = 1.0 if h > l and abs(c - o) < .3 * (h - l) else 0.0
        e["E4"] = (c / o - 1) * 100
        esiti.append(e)
    # swing: chiusura d -> d+5, un'osservazione ogni 5 sedute
    swing = []
    for i in range(0, len(giorni) - 5, 5):
        d = giorni[i]
        swing.append({"d": d, "f": filtri[d], "S5": (px[giorni[i + 5]] / px[d] - 1) * 100})
    NOMI = {"F1": "GEX negativa", "F2": "GEX bassa (20%)", "F3": "DIX alto (80%)", "F4": "VIX alto (80%)",
            "F5": "Sotto media 200", "F6": "Commercial COT >=90 vs <=10", "F7": "GEX neg + sotto media 200"}
    ESI = {"E1": "ampiezza relativa", "E2": "rottura che continua", "E3": "giornata di ritorno", "E4": "apertura->chiusura %",
           "S5": "swing 5 sedute %"}
    print(f"giornate intraday {len(esiti)} ({esiti[0]['d']} - {esiti[-1]['d']}), osservazioni swing {len(swing)}")
    funziona = []
    for fk, fn in NOMI.items():
        print(f"\n{fn}")
        for ek, en in ESI.items():
            base = swing if ek == "S5" else esiti
            ris = []
            for studio in (True, False):
                E = [x for x in base if (x["d"] <= FINE_STUDIO) == studio and x["f"].get(fk) is not None and x[ek] is not None]
                ris.append(confronto([x[ek] for x in E if x["f"][fk]], [x[ek] for x in E if not x["f"][fk]]))
            ok = all(ris) and ris[0]["t"] * ris[1]["t"] > 0 and abs(ris[0]["t"]) >= 2 and abs(ris[1]["t"]) >= 2
            if ok:
                funziona.append((fn, en))
            fmt = lambda r: "pochi dati" if not r else f"si {r['ma']:7.3f} (n {r['na']:4}) no {r['mb']:7.3f} (n {r['nb']:4}) t {r['t']:5.2f}"
            print(f"  {en:22} STUDIO {fmt(ris[0])} | VERIFICA {fmt(ris[1])} {'<== FUNZIONA' if ok else ''}")
    print("\nFUNZIONANO (stessa direzione, |t| >= 2 in studio e verifica):", funziona or "nessuno")


if __name__ == "__main__":
    main()
