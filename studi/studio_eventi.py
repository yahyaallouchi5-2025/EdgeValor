# -*- coding: utf-8 -*-
"""
studio_eventi.py - TEST C: EVENTI A CALENDARIO PER SETTORE (ricerca "Eventi", Ya 18/11/2026). Solo studio: il sito non cambia.

DOMANDA: intorno a un fatto noto (lancio di un prodotto, uscita di un videogioco, inizio di una guerra, primo taglio
dei tassi, elezioni USA) i titoli collegati si muovono PRIMA (il mercato anticipa) o DOPO? E di quanto, rispetto
all'S&P 500?
DATI: chiusure giornaliere rettificate dal dicembre 2004 dei titoli dell'Azionario (ramo "studio-giornaliero") e SPY.
  Le date degli eventi sono scritte a mano qui sotto e controllate una per una (fonti nel messaggio a Ya).
COME SI MISURA (regole fissate prima):
  giorno 0 = ultima chiusura PRIMA dell'evento (quello che si poteva sapere il giorno prima);
  PRIMA: rendimento dai 60, 20 e 5 giorni di borsa prima fino al giorno 0;
  DOPO: rendimento dal giorno 0 a 1, 5, 20 e 60 giorni di borsa dopo;
  tutto MENO l'S&P 500 nello stesso intervallo ("oltre il mercato"). Un evento conta una volta per titolo.
  Con meno di 5 eventi il gruppo e' segnato "pochi casi": e' un racconto, non una regola.
USO: python studi/studio_eventi.py <cartella giornaliero>
"""
import csv
import gzip
import os
import statistics as st
import sys
from bisect import bisect_left

# (nome del gruppo, titoli, [(data evento, descrizione)])
GRUPPI = [
    ("Apple: presentazione di un nuovo iPhone", ["AAPL"], [
        ("2007-01-09", "iPhone"), ("2008-06-09", "iPhone 3G"), ("2009-06-08", "iPhone 3GS"), ("2010-06-07", "iPhone 4"),
        ("2011-10-04", "iPhone 4S"), ("2012-09-12", "iPhone 5"), ("2013-09-10", "iPhone 5s/5c"), ("2014-09-09", "iPhone 6"),
        ("2015-09-09", "iPhone 6s"), ("2016-09-07", "iPhone 7"), ("2017-09-12", "iPhone X/8"), ("2018-09-12", "iPhone XS"),
        ("2019-09-10", "iPhone 11"), ("2020-10-13", "iPhone 12"), ("2021-09-14", "iPhone 13"), ("2022-09-07", "iPhone 14"),
        ("2023-09-12", "iPhone 15"), ("2024-09-09", "iPhone 16"), ("2025-09-09", "iPhone 17")]),
    ("Take-Two: uscita di un grande gioco Rockstar", ["TTWO"], [
        ("2008-04-29", "GTA IV"), ("2013-09-17", "GTA V"), ("2018-10-26", "Red Dead Redemption 2")]),
    ("Take-Two: rinvio di un grande gioco", ["TTWO"], [
        ("2013-01-31", "rinvio GTA V"), ("2025-05-02", "rinvio GTA VI a maggio 2026"),
        ("2025-11-07", "rinvio GTA VI a novembre 2026")]),
    ("Guerre: difesa USA", ["LMT", "NOC", "RTX", "GD", "LHX"], [
        ("2008-08-08", "Russia-Georgia"), ("2014-02-27", "Crimea"), ("2017-04-07", "attacco USA in Siria"),
        ("2020-01-03", "Soleimani"), ("2022-02-24", "invasione dell'Ucraina"), ("2023-10-09", "7 ottobre (primo giorno di borsa)"),
        ("2025-06-13", "Israele-Iran")]),
    ("Guerre: difesa Europa", ["RHM.DE", "LDO.MI", "SAF.PA"], [
        ("2008-08-08", "Russia-Georgia"), ("2014-02-27", "Crimea"), ("2017-04-07", "attacco USA in Siria"),
        ("2020-01-03", "Soleimani"), ("2022-02-24", "invasione dell'Ucraina"), ("2023-10-09", "7 ottobre"),
        ("2025-06-13", "Israele-Iran")]),
    ("Guerre: petroliferi", ["XOM", "CVX", "COP"], [
        ("2008-08-08", "Russia-Georgia"), ("2014-02-27", "Crimea"), ("2017-04-07", "attacco USA in Siria"),
        ("2020-01-03", "Soleimani"), ("2022-02-24", "invasione dell'Ucraina"), ("2023-10-09", "7 ottobre"),
        ("2025-06-13", "Israele-Iran")]),
    ("Guerre: compagnie aeree", ["DAL", "UAL"], [
        ("2008-08-08", "Russia-Georgia"), ("2014-02-27", "Crimea"), ("2017-04-07", "attacco USA in Siria"),
        ("2020-01-03", "Soleimani"), ("2022-02-24", "invasione dell'Ucraina"), ("2023-10-09", "7 ottobre"),
        ("2025-06-13", "Israele-Iran")]),
    ("Fed: primo taglio dei tassi del ciclo - banche", ["JPM", "BAC"], [
        ("2007-09-18", "primo taglio 2007"), ("2019-07-31", "primo taglio 2019"), ("2024-09-18", "primo taglio 2024")]),
    ("Fed: primo taglio dei tassi del ciclo - case", ["LEN", "DHI", "HD"], [
        ("2007-09-18", "primo taglio 2007"), ("2019-07-31", "primo taglio 2019"), ("2024-09-18", "primo taglio 2024")]),
    ("Elezioni USA: banche", ["JPM", "BAC"], [
        ("2008-11-04", "Obama"), ("2012-11-06", "Obama 2"), ("2016-11-08", "Trump"), ("2020-11-03", "Biden"),
        ("2024-11-05", "Trump 2")]),
    ("Elezioni USA: difesa", ["LMT", "NOC", "RTX", "GD", "LHX"], [
        ("2008-11-04", "Obama"), ("2012-11-06", "Obama 2"), ("2016-11-08", "Trump"), ("2020-11-03", "Biden"),
        ("2024-11-05", "Trump 2")]),
    ("Elezioni USA: petroliferi", ["XOM", "CVX", "COP"], [
        ("2008-11-04", "Obama"), ("2012-11-06", "Obama 2"), ("2016-11-08", "Trump"), ("2020-11-03", "Biden"),
        ("2024-11-05", "Trump 2")]),
]
PRIMA, DOPO = (60, 20, 5), (1, 5, 20, 60)


def leggi(cart, t):
    f = os.path.join(cart, t + ".csv.gz")
    if not os.path.exists(f):
        return None
    with gzip.open(f, "rt") as fh:
        r = [(x["data"], float(x["c"])) for x in csv.DictReader(fh) if x["c"] not in ("", "nan")]
    return ([d for d, _ in r], [c for _, c in r])


def misura(serie, spy, data):
    """{"p60","p20","p5","d1","d5","d20","d60"}: rendimento oltre l'S&P 500 (None se manca la storia)."""
    dd, cc = serie
    sd, sc = spy
    i = bisect_left(dd, data) - 1                      # giorno 0 = ultima chiusura prima dell'evento
    if i < 0:
        return None
    j = bisect_left(sd, dd[i])
    if j >= len(sd) or sd[j] != dd[i]:
        return None
    out = {}
    for k in PRIMA:
        out[f"p{k}"] = (cc[i] / cc[i - k] - sc[j] / sc[j - k]) if i - k >= 0 and j - k >= 0 else None
    for k in DOPO:
        out[f"d{k}"] = (cc[i + k] / cc[i] - sc[j + k] / sc[j]) if i + k < len(cc) and j + k < len(sc) else None
    return out


def main():
    cart = sys.argv[1]
    spy = leggi(cart, "SPY")
    col = [f"p{k}" for k in PRIMA] + [f"d{k}" for k in DOPO]
    eti = ["60g prima", "20g prima", "5g prima", "1g dopo", "5g dopo", "20g dopo", "60g dopo"]
    print("Rendimento OLTRE l'S&P 500. 'prima' = dai giorni indicati fino alla chiusura prima dell'evento; "
          "'dopo' = dalla chiusura prima dell'evento ai giorni indicati.\nmedia | mediana | % positivi\n")
    for nome, titoli, eventi in GRUPPI:
        righe = []
        for data, desc in eventi:
            for t in titoli:
                s = leggi(cart, t)
                m = misura(s, spy, data) if s else None
                if m:
                    righe.append((data, desc, t, m))
        n_ev = len({r[0] for r in righe})
        print(f"== {nome}  ({n_ev} eventi, {len(righe)} casi titolo-evento){'  -> POCHI CASI' if n_ev < 5 else ''}")
        print("   " + "".join(f"{e:>22}" for e in eti))
        for lab, fn in (("media", st.mean), ("mediana", st.median)):
            v = []
            for c in col:
                x = [r[3][c] for r in righe if r[3][c] is not None]
                v.append(f"{fn(x)*100:+.1f}%" if x else "n/d")
            print(f"   {lab:<8}" + "".join(f"{z:>22}" for z in v)[8:] if False else f"   {lab:<8}" + "".join(f"{z:>14}" for z in v))
        v = []
        for c in col:
            x = [r[3][c] for r in righe if r[3][c] is not None]
            v.append(f"{sum(1 for z in x if z > 0)/len(x)*100:.0f}%" if x else "n/d")
        print(f"   {'positivi':<8}" + "".join(f"{z:>14}" for z in v))
        # dettaglio per evento (media dei titoli del gruppo)
        for data, desc in eventi:
            rr = [r[3] for r in righe if r[0] == data]
            if not rr:
                continue
            f = lambda c: (lambda x: f"{st.mean(x)*100:+6.1f}%" if x else "   n/d")([q[c] for q in rr if q[c] is not None])
            print(f"     {data} {desc:<32} prima 20g {f('p20')}   dopo 5g {f('d5')}   dopo 60g {f('d60')}")
        print()


if __name__ == "__main__":
    main()
