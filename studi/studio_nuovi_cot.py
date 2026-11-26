# -*- coding: utf-8 -*-
"""
studio_nuovi_cot.py - I 4 MERCATI COT PROPOSTI SUPERANO LA STESSA PROVA DEGLI ALTRI? (Ya, 26/11/2026). Solo studio.

MERCATI: Nikkei 225 (240743), Euro/Sterlina (299741), Ultra Treasury 10 anni (043607), Alluminio (191693).
CONFRONTO: tre mercati gia' nel terminale con prezzi FRED comodi (Euro 099741, Yen 097741, Treasury 10 anni 043602).
METODO (fissato prima di guardare i numeri): punteggio COT del sito (cot.cot_strength, solo dati fino a quella
  settimana) e soglia BUY/SELL del sito (cot.NORMAL). Ogni segnale entra al primo prezzo dopo il venerdi' di
  pubblicazione e si misura il rendimento nel verso del segnale dopo 4 settimane (20 giorni di borsa).
  STUDIO fino al 31/12/2015, VERIFICA dal 2016 (per i mercati nati dopo: prima meta' / seconda meta' dello storico).
PREZZI (FRED): Nikkei = NIKKEI225; Euro/Sterlina = DEXUSEU / DEXUSUK; Euro = DEXUSEU; Yen = 1/DEXJPUS;
  Treasury 10 anni e Ultra 10 anni = rendimento DGS10 trasformato in prezzo (durata 8 e 9 anni: approssimazione);
  Alluminio = PALUMUSDM (FMI, MENSILE: rendimento a 1 mese, misura piu' grezza degli altri).
REGOLA PER ENTRARE NEL TERMINALE (v2, correzione di Ya: la percentuale di segnali giusti da sola non dice se un
  segnale e' profittevole, conta il rapporto tra vincite e perdite): guadagno medio nel verso del segnale, AL NETTO
  della salita del mercato, positivo sia nello STUDIO sia nella VERIFICA, con almeno 30 segnali in verifica.
  Si riportano anche percentuale di giusti, vincita/perdita media e profit factor (solo informativi).
USO: python studi/studio_nuovi_cot.py
"""
import csv
import io
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from cot_radar import cot as C          # noqa: E402

MERCATI = [("Nikkei 225", "240743", "nikkei"), ("Euro/Sterlina", "299741", "eurgbp"),
           ("Ultra Treasury 10 anni", "043607", "ultra"), ("Alluminio", "191693", "alluminio"),
           ("[gia' nel sito] Euro", "099741", "eur"), ("[gia' nel sito] Yen", "097741", "jpy"),
           ("[gia' nel sito] Treasury 10 anni", "043602", "us10y")]
CAMPI = ("cftc_contract_market_code,report_date_as_yyyy_mm_dd,open_interest_all,noncomm_positions_long_all,"
         "noncomm_positions_short_all,comm_positions_long_all,comm_positions_short_all")


def cot(codice):
    q = urllib.parse.urlencode({"$select": CAMPI, "$where": f"cftc_contract_market_code='{codice}'",
                                "$order": "report_date_as_yyyy_mm_dd", "$limit": "5000"})
    with urllib.request.urlopen("https://publicreporting.cftc.gov/resource/6dca-aqww.json?" + q, timeout=60) as r:
        return json.load(r)


def fred(sid):
    with urllib.request.urlopen(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd=1995-01-01", timeout=60) as r:
        out = {}
        for x in csv.reader(io.StringIO(r.read().decode())):
            try:
                out[x[0]] = float(x[1])
            except (ValueError, IndexError):
                pass
        return out


def da_rendimento(y, durata):
    """Serie di prezzo approssimata di un Treasury dal suo rendimento: dP/P = -durata * dy (+ cedola giornaliera)."""
    out, p, prec = {}, 100.0, None
    for d in sorted(y):
        if prec is not None:
            p *= 1 - durata * (y[d] - prec) / 100 + prec / 100 / 252
        out[d], prec = p, y[d]
    return out


def prezzi(k):
    if k == "nikkei":
        return fred("NIKKEI225"), 20
    if k == "eurgbp":
        e, g = fred("DEXUSEU"), fred("DEXUSUK")
        return {d: e[d] / g[d] for d in e if d in g and g[d]}, 20
    if k == "eur":
        return fred("DEXUSEU"), 20
    if k == "jpy":
        return {d: 1 / v for d, v in fred("DEXJPUS").items() if v}, 20
    if k in ("ultra", "us10y"):
        return da_rendimento(fred("DGS10"), 9 if k == "ultra" else 8), 20
    if k == "alluminio":
        return fred("PALUMUSDM"), 1                   # mensile: orizzonte 1 osservazione = 1 mese


def deriva(px, passi, dal, al):
    """Rendimento medio di TUTTE le finestre dello stesso orizzonte nel periodo: la "salita" che chiunque prende."""
    d = sorted(x for x in px if dal <= x < al)
    r = [(px[d[i + passi]] / px[d[i]] - 1) * 100 for i in range(0, len(d) - passi, max(1, passi // 4))]
    return sum(r) / len(r) if r else 0.0


def misura(ser, px, passi, taglio):
    """Segnali BUY/SELL del sito e rendimento nel verso del segnale dopo 'passi' osservazioni di prezzo."""
    date_px = sorted(px)
    st, ve = [], []
    for t in range(30, len(ser)):
        s = C.cot_strength(ser, t)
        sc = s["cot"] if s else None
        if sc is None or abs(sc) < C.NORMAL:
            continue
        uscita = (date.fromisoformat(ser[t]["date"]) + timedelta(days=3)).isoformat()   # venerdi' di pubblicazione
        i = next((j for j, d in enumerate(date_px) if d > uscita), None)
        if i is None or i + passi >= len(date_px):
            continue
        r = (px[date_px[i + passi]] / px[date_px[i]] - 1) * 100 * (1 if sc > 0 else -1)
        (st if ser[t]["date"] < taglio else ve).append((r, 1 if sc > 0 else -1))
    return st, ve


def riga(nome, x, salita):
    """v2 (Ya, 26/11/2026): la percentuale di segnali giusti NON decide. Conta quanto si guadagna in media
    (vincite piu' grandi delle perdite = profittevole anche sotto il 50%), al netto della salita del mercato."""
    if not x:
        return f"{nome:9} segnali   0", None
    v = [a for a, _ in x]
    giusti = sum(1 for a in v if a > 0) / len(v) * 100
    vinte, perse = [a for a in v if a > 0], [-a for a in v if a < 0]
    pf = sum(vinte) / sum(perse) if perse else float("inf")
    rapp = (sum(vinte) / len(vinte)) / (sum(perse) / len(perse)) if vinte and perse else float("inf")
    netto = sum(v) / len(v) - salita * sum(d for _, d in x) / len(x)     # tolta la salita nel verso medio dei segnali
    return (f"{nome:9} segnali {len(v):4}  giusti {giusti:5.1f}%  vincita/perdita media {rapp:4.2f}  "
            f"profit factor {pf:4.2f}  medio {sum(v) / len(v):+6.2f}%  al netto della salita {netto:+6.2f}%"), netto


def main():
    print("Punteggio COT e soglia del sito (cot_strength, NORMAL =", C.NORMAL, "), rendimento a 4 settimane nel verso del segnale")
    for nome, codice, k in MERCATI:
        ser = C.cot_series(cot(codice)).get(codice) or []
        px, passi = prezzi(k)
        if len(ser) < 60 or not px:
            print(f"\n{nome}: dati insufficienti ({len(ser)} settimane)")
            continue
        taglio = "2016-01-01" if ser[0]["date"] < "2010-01-01" else ser[len(ser) // 2]["date"]
        st, ve = misura(ser, px, passi, taglio)
        r_st, n_st = riga("studio", st, deriva(px, passi, "1990-01-01", taglio))
        r_ve, n_ve = riga("verifica", ve, deriva(px, passi, taglio, "2099-01-01"))
        ok = len(ve) >= 30 and n_ve is not None and n_ve > 0 and n_st is not None and n_st > 0
        esito = "" if "gia'" in nome else ("  -> ENTRA" if ok else "  -> solo contesto")
        print(f"\n{nome} ({codice}) - settimane COT {len(ser)} dal {ser[0]['date']}, divisione al {taglio}{esito}")
        print("  " + r_st)
        print("  " + r_ve)


if __name__ == "__main__":
    main()
