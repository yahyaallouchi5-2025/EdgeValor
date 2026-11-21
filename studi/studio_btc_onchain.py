# -*- coding: utf-8 -*-
"""
studio_btc_onchain.py - v8.58 STUDIO: ANALISI ON-CHAIN DEL BITCOIN (MVRV e hash ribbon) HANNO UN VANTAGGIO?
Richiesta di Ya: la scheda BTC deve avere l'analisi on-chain. Prima di mostrare qualcosa, si verifica.

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI (21/11/2026)
  - dati giornalieri Coin Metrics (community): prezzo USD, MVRV (valore di mercato / valore realizzato), hash rate;
  - periodo dal 2013-01-01 (prima il mercato era troppo piccolo); due metà: 2013-2019 e dal 2020;
  - MVRV a fasce: <1 (prezzo sotto il costo medio di chi detiene), 1-2, 2-3, >=3; per ogni fascia rendimento medio e
    quota positiva a 6 e 12 mesi (182 e 365 giorni) per i giorni in quella fascia, contro un giorno qualsiasi;
  - HASH RIBBON: media a 30 giorni dell'hash rate che torna sopra quella a 60 dopo almeno 10 giorni sotto
    ("fine della capitolazione dei miner"); un episodio = primo giorno dell'incrocio; rendimento a 6 e 12 mesi;
  - VALE se, in ENTRAMBE le metà: fascia <1 (o il ribbon) batte il giorno qualsiasi a 12 mesi per media E quota
    positiva, e la fascia >=3 fa peggio del giorno qualsiasi a 12 mesi. Altrimenti si scarta.
USO: python studi/studio_btc_onchain.py cm.json
"""
import json
import sys


def carica(f):
    d = json.load(open(f))["data"]
    out = []
    for x in d:
        try:
            out.append((x["time"][:10], float(x["PriceUSD"]), float(x["CapMVRVCur"]), float(x["HashRate"])))
        except (KeyError, TypeError, ValueError):
            continue
    return out


def avanti(px, i, k):
    return (px[i + k][1] / px[i][1] - 1) * 100 if i + k < len(px) else None


def riassumi(v):
    v = [x for x in v if x is not None]
    return (sum(v) / len(v), sum(1 for x in v if x > 0) / len(v) * 100, len(v)) if v else (None, None, 0)


def main(f):
    px = carica(f)
    FASCE = [("<1", 0, 1), ("1-2", 1, 2), ("2-3", 2, 3), (">=3", 3, 99)]
    # hash ribbon
    hr = [x[3] for x in px]
    m = lambda a, i, n: sum(a[i - n + 1:i + 1]) / n if i >= n - 1 else None   # noqa: E731
    rib, sotto = [], 0
    for i in range(60, len(px)):
        a, b = m(hr, i, 30), m(hr, i, 60)
        if a < b:
            sotto += 1
        else:
            if sotto >= 10:
                rib.append(i)
            sotto = 0
    for nome, a, b in (("2013-2019", "2013-01-01", "2020-01-01"), ("dal 2020", "2020-01-01", "9999"), ("tutto", "2013-01-01", "9999")):
        idx = [i for i, x in enumerate(px) if a <= x[0] < b]
        print(f"\n===== {nome} ({len(idx)} giorni) =====")
        for k, lab in ((182, "6 mesi"), (365, "12 mesi")):
            g = riassumi([avanti(px, i, k) for i in idx])
            print(f"  giorno qualsiasi {lab}: media {g[0]:+.0f}%  positivi {g[1]:.0f}%  (n={g[2]})")
            for fn, lo, hi in FASCE:
                s = riassumi([avanti(px, i, k) for i in idx if lo <= px[i][2] < hi])
                if s[2]:
                    print(f"    MVRV {fn:4} {lab}: media {s[0]:+.0f}%  positivi {s[1]:.0f}%  (n={s[2]} giorni)")
            e = [i for i in rib if a <= px[i][0] < b]
            s = riassumi([avanti(px, i, k) for i in e])
            if s[2]:
                print(f"    hash ribbon {lab}: media {s[0]:+.0f}%  positivi {s[1]:.0f}%  (n={s[2]} episodi)")
        print("  episodi ribbon:", ", ".join(px[i][0] for i in rib if a <= px[i][0] < b))
    print(f"\noggi {px[-1][0]}: MVRV {px[-1][2]:.2f}")


if __name__ == "__main__":
    main(sys.argv[1])
