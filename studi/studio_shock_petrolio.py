# -*- coding: utf-8 -*-
"""
studio_shock_petrolio.py - SHOCK DEL PETROLIO: cosa succede a petrolio, borsa e settori dopo un rialzo violento
(Ya, 18/11/2026: "aumento dell'energia per la guerra in Medio Oriente, benzina a 2,40 euro al litro"). Solo studio.

PERCHE' NON LA DATA DELLA GUERRA: nello studio sulle guerre (studio_eventi.py) i petroliferi non avevano una reazione
stabile. Conta lo SHOCK DI PREZZO, che si puo' misurare e ha molti piu' casi.
EVENTO (regole fissate prima): Brent in chiusura almeno +25% rispetto a 21 giorni di borsa prima (un mese). Si prende
  il PRIMO giorno che supera la soglia; poi per 120 giorni di borsa (circa 6 mesi) non si conta un altro evento.
  Controllo di robustezza: stessa cosa con soglia +20%.
  Giorno 0 = il giorno in cui lo shock e' visibile (chiusura): quello che uno poteva sapere.
MISURE dopo il giorno 0, a 20, 60 e 120 giorni di borsa:
  - Brent: continua a salire o torna indietro?
  - S&P 500 (SPY);
  - settori USA (ETF Select Sector, dal 1998) e singoli titoli (compagnie aeree, petroliferi, crociere, chimica,
    trasporti) OLTRE l'S&P 500;
  - tasso USA a 10 anni (variazione in punti).
  Confronto con la NORMA: la media di tutte le finestre della stessa lunghezza nello stesso periodo.
  Con meno di 8 eventi i numeri sono un racconto, non una regola.
DIVISIONE (aggiunta dopo il primo giro, dichiarata): "shock vero" = Brent al giorno 0 almeno al 90% del massimo
  dell'ultimo anno (il prezzo sale dove era gia' alto: guerre, tagli dell'offerta); "rimbalzo" = sotto il 90%
  (il prezzo risale dopo un crollo: 2009, 2016, 2020). Sono due fenomeni diversi.
USO: python studi/studio_shock_petrolio.py <cartella storico> <cartella giornaliero titoli>
SOLO LIBRERIA STANDARD.
"""
import csv
import gzip
import os
import statistics as st
import sys
from bisect import bisect_left

SOGLIA, FINESTRA, PAUSA = 0.25, 21, 120
ORIZZ = (20, 60, 120)
SETTORI = [("XLE", "Energia"), ("XLB", "Materiali"), ("XLI", "Industria"), ("XLY", "Beni voluttuari"),
           ("XLP", "Beni di prima necessita'"), ("XLF", "Finanza"), ("XLK", "Tecnologia"), ("XLV", "Salute"),
           ("XLU", "Servizi pubblici")]
TITOLI = [("XOM", "Exxon"), ("CVX", "Chevron"), ("COP", "ConocoPhillips"), ("OXY", "Occidental"), ("SLB", "Schlumberger"),
          ("DAL", "Delta"), ("UAL", "United"), ("LUV", "Southwest"), ("CCL", "Carnival"), ("RCL", "Royal Caribbean"),
          ("FDX", "FedEx"), ("UPS", "UPS"), ("LYB", "LyondellBasell"), ("LMT", "Lockheed"), ("NOC", "Northrop")]


def leggi_csv(f):
    """[(data, valore)] da un csv data,valore (anche .gz e colonna c)"""
    if not os.path.exists(f):
        return None
    op = gzip.open if f.endswith(".gz") else open
    with op(f, "rt") as fh:
        r = csv.DictReader(fh)
        k = "valore" if "valore" in r.fieldnames else "c"
        out = [(x["data"], float(x[k])) for x in r if x[k] not in ("", "nan", ".")]
    return ([d for d, _ in out], [v for _, v in out])


def eventi(brent, soglia):
    dd, vv = brent
    ev, ultimo = [], -10 ** 9
    for i in range(FINESTRA, len(vv)):
        if vv[i] / vv[i - FINESTRA] - 1 >= soglia and i - ultimo > PAUSA:
            ev.append(i)
            ultimo = i
    return ev


def rend(serie, data, k):
    """rendimento da 'data' (ultima chiusura <= data) a k giorni di borsa dopo; None se manca"""
    dd, vv = serie
    i = bisect_left(dd, data)
    if i >= len(dd) or dd[i] != data:
        i -= 1
    if i < 0 or i + k >= len(vv) or dd[i] < data[:4] + "-00":
        return None
    return vv[i + k] / vv[i] - 1


def diff(serie, data, k):
    dd, vv = serie
    i = bisect_left(dd, data)
    if i >= len(dd) or dd[i] != data:
        i -= 1
    if i < 0 or i + k >= len(vv):
        return None
    return vv[i + k] - vv[i]


def norma(serie, k, dal):
    """rendimento medio di tutte le finestre di k giorni dal 'dal' in poi"""
    dd, vv = serie
    i0 = bisect_left(dd, dal)
    x = [vv[i + k] / vv[i] - 1 for i in range(i0, len(vv) - k, 5)]
    return st.mean(x) if x else None


def riga(nome, valori, base=None):
    v = [x for x in valori if x is not None]
    if not v:
        return f"  {nome:<28} n/d"
    pos = sum(1 for x in v if x > 0) / len(v)
    b = f"  norma {base*100:+6.1f}%" if base is not None else ""
    return f"  {nome:<28} mediana {st.median(v)*100:+6.1f}%  media {st.mean(v)*100:+6.1f}%  positivi {pos*100:3.0f}%  (n={len(v)}){b}"


def main():
    sto, gio = sys.argv[1], sys.argv[2]
    brent = leggi_csv(os.path.join(sto, "DCOILBRENTEU.csv"))
    spy = leggi_csv(os.path.join(sto, "yahoo", "SPY.csv"))
    t10 = leggi_csv(os.path.join(sto, "DGS10.csv"))
    for soglia in (SOGLIA, 0.20):
        ev = eventi(brent, soglia)
        print("=" * 110 + f"\nSHOCK: Brent +{soglia*100:.0f}% in {FINESTRA} giorni di borsa (pausa {PAUSA} giorni). Eventi: {len(ev)}")
        for i in ev:
            d = brent[0][i]
            b = [rend(brent, d, k) for k in ORIZZ]
            s = [rend(spy, d, k) for k in ORIZZ]
            f = lambda x: f"{x*100:+6.1f}%" if x is not None else "   n/d"
            print(f"  {d}  Brent {brent[1][i]:7.2f} $ (+{(brent[1][i]/brent[1][i-FINESTRA]-1)*100:.0f}% in un mese)"
                  f"   Brent dopo 20/60/120g: {f(b[0])} {f(b[1])} {f(b[2])}   S&P: {f(s[0])} {f(s[1])} {f(s[2])}")
        date = [brent[0][i] for i in ev]
        for k in ORIZZ:
            print(f"\n -- {k} giorni di borsa dopo --")
            print(riga("Brent", [rend(brent, d, k) for d in date], norma(brent, k, date[0])))
            print(riga("S&P 500 (SPY)", [rend(spy, d, k) for d in date], norma(spy, k, date[0])))
            dt = [diff(t10, d, k) for d in date]
            dt = [x for x in dt if x is not None]
            print(f"  {'Tasso USA 10 anni':<28} variazione mediana {st.median(dt):+.2f} punti (n={len(dt)})")
            print("  SETTORI oltre l'S&P 500 (dal 1998):")
            for t, n in SETTORI:
                s = leggi_csv(os.path.join(sto, "yahoo", t + ".csv"))
                v = []
                for d in date:
                    a, b = rend(s, d, k), rend(spy, d, k)
                    v.append(a - b if a is not None and b is not None and d >= s[0][0] else None)
                print("  " + riga(n, v))
            print("  TITOLI oltre l'S&P 500 (dal 2004):")
            for t, n in TITOLI:
                s = leggi_csv(os.path.join(gio, t + ".csv.gz"))
                if not s:
                    continue
                v = []
                for d in date:
                    a, b = rend(s, d, k), rend(spy, d, k)
                    v.append(a - b if a is not None and b is not None and d >= s[0][0] else None)
                print("  " + riga(f"{t} {n}", v))


def divisione(sto):
    brent = leggi_csv(os.path.join(sto, "DCOILBRENTEU.csv"))
    spy = leggi_csv(os.path.join(sto, "yahoo", "SPY.csv"))
    ev = eventi(brent, SOGLIA)
    vero = lambda i: brent[1][i] >= 0.9 * max(brent[1][max(0, i - 252):i])
    for nome, cond in (("SHOCK VERO (vicino ai massimi dell'anno)", vero), ("RIMBALZO DAL BASSO", lambda i: not vero(i))):
        d = [brent[0][i] for i in ev if cond(i)]
        print("=" * 110 + f"\n{nome}: {len(d)} eventi {d}")
        for k in ORIZZ:
            print(f" -- {k} giorni --")
            print(riga("Brent", [rend(brent, x, k) for x in d]))
            print(riga("S&P 500 (SPY)", [rend(spy, x, k) for x in d]))
            for t, n in SETTORI:
                s = leggi_csv(os.path.join(sto, "yahoo", t + ".csv"))
                v = []
                for x in d:
                    a, b = rend(s, x, k), rend(spy, x, k)
                    v.append(a - b if a is not None and b is not None and x >= s[0][0] else None)
                print("  " + riga(n + " oltre S&P", v))


if __name__ == "__main__":
    main()
    divisione(sys.argv[1])
