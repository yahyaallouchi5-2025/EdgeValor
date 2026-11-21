# -*- coding: utf-8 -*-
"""
studio_sp500_correzioni.py - STUDIO: QUANTE CORREZIONI DELL'S&P 500 DIVENTANO BEAR MARKET? (21/11/2026)
Spunto: newsletter di un analista ("delle ultime 15 correzioni dai massimi dal 1983 solo 5 sono diventate bear
market"). Lo verifichiamo con i nostri dati prima di usarlo.

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - S&P 500 indice, chiusure giornaliere dal 1970 (yahoo/_GSPC.csv, senza dividendi);
  - EPISODIO = dal primo giorno in cui la chiusura e' almeno il 10% sotto il massimo storico precedente fino al
    ritorno su un nuovo massimo storico (o fino a oggi se non e' ancora tornato);
  - BEAR MARKET = l'episodio arriva almeno al -20% dal massimo; per ogni episodio: drawdown massimo, sedute dal
    -10% al minimo, rendimento a 12 mesi comprando il giorno del -10%;
  - si contano tutti gli episodi e quelli dal 1983 (per confrontarci con la cifra citata).
USO: python studi/studio_sp500_correzioni.py <cartella storico>
"""
import csv
import os
import sys


def leggi(f):
    out = []
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r)
        for x in r:
            try:
                v = float(x[1])
            except (ValueError, IndexError):
                continue
            if v > 0:
                out.append((x[0][:10], v))
    return sorted(out)


def episodi(px):
    out, mx, ep = [], px[0][1], None
    for i, (d, v) in enumerate(px):
        if v >= mx:
            if ep:
                ep["fine"] = d
                out.append(ep)
                ep = None
            mx = v
            continue
        dd = (v / mx - 1) * 100
        if ep is None and dd <= -10:
            ep = {"inizio": d, "i": i, "max": mx, "dd": dd, "imin": i, "fine": None}
        elif ep and dd < ep["dd"]:
            ep["dd"], ep["imin"] = dd, i
    if ep:
        out.append(ep)
    return out


def main(cart):
    px = leggi(os.path.join(cart, "yahoo", "_GSPC.csv"))
    E = episodi(px)
    for e in E:
        i = e["i"]
        e["r12"] = (px[i + 252][1] / px[i][1] - 1) * 100 if i + 252 < len(px) else None
        print(f"{e['inizio']}  minimo {e['dd']:+6.1f}% il {px[e['imin']][0]}  ({e['imin'] - i:4d} sedute dal -10%)"
              f"  12 mesi dopo il -10%: {('%+.1f%%' % e['r12']) if e['r12'] is not None else 'n/d':>7}"
              f"  {'BEAR' if e['dd'] <= -20 else 'correzione'}{'' if e['fine'] else '  (in corso)'}")
    for nome, dal in (("dal 1970", "0"), ("dal 1983", "1983")):
        s = [e for e in E if e["inizio"] >= dal and e["fine"]]
        b = [e for e in s if e["dd"] <= -20]
        r = [e["r12"] for e in s if e["r12"] is not None]
        print(f"\n{nome}: {len(s)} episodi chiusi, {len(b)} bear market ({len(b) / len(s) * 100:.0f}%);"
              f" drawdown massimo medio {sum(e['dd'] for e in s) / len(s):+.1f}%;"
              f" 12 mesi dopo il -10%: media {sum(r) / len(r):+.1f}%, positivi {sum(1 for x in r if x > 0)}/{len(r)}")
    mx = max(v for _, v in px)
    print(f"\noggi {px[-1][0]}: {(px[-1][1] / mx - 1) * 100:+.1f}% dal massimo storico")


if __name__ == "__main__":
    main(sys.argv[1])
