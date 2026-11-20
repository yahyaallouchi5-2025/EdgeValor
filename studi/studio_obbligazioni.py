# -*- coding: utf-8 -*-
"""
studio_obbligazioni.py - v8.46 STUDI SULLE OBBLIGAZIONI DEI PORTAFOGLI (libro CFA Vol. 6 "Fixed Income") - Ya, 21/11/2026.

A) DURATION EMPIRICA (cap. 13 "empirical duration"): di quanto si muove ogni ETF di Treasury (SHY, IEF, TLT) quando
   il rendimento del Treasury di riferimento sale di 1 punto. Regressione dei rendimenti SETTIMANALI dell'ETF sulla
   variazione del rendimento (DGS2 per SHY, DGS10 per IEF e TLT), per periodo. Solo descrittivo: serve a dire in
   pagina "se i tassi salgono di 1 punto, questo ETF perde circa X%".
B) IL RENDIMENTO DI PARTENZA PREVEDE IL RENDIMENTO FUTURO (cap. 10: tenendo un'obbligazione per la sua duration il
   rendimento e' vicino al rendimento a scadenza di partenza). Ogni fine mese: rendimento del Treasury 10 anni
   contro il rendimento annuo di IEF nei 7 anni dopo (circa la sua duration). Misure: correlazione, errore medio.
   DECISIONE PREFISSATA: si puo' mostrare "cosa ci si puo' aspettare dalle obbligazioni" solo se la correlazione e'
   >= 0,7 e l'errore tipico <= 1,5 punti l'anno.
C) INCLINAZIONE DELLA CURVA E DURATION (cap. 9-10): nei portafogli il Treasury lungo (TLT) si tiene col filtro di
   trend (prezzo sopra la media a 10 mesi, altrimenti SHY). Si aggiunge: TLT solo se la curva e' positiva
   (10 anni - 3 mesi > 0), altrimenti SHY. Fine mese, mese dopo. In campione fino al 2009, fuori campione 2010-oggi.
   ENTRA solo se fuori campione migliora rendimento E drawdown e il test sulle coppie non e' contro (verifica_stat).
USO: python studi/studio_obbligazioni.py <cartella storico>
"""
import csv
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import verifica_stat as V


def leggi(f):
    out = {}
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r)
        for x in r:
            try:
                out[x[0][:10]] = float(x[-1])
            except (ValueError, IndexError):
                pass
    return out


def regressione(x, y):
    n = len(x)
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x)
    b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sxx
    res = [c - my - b * (a - mx) for a, c in zip(x, y)]
    se = math.sqrt(sum(e * e for e in res) / (n - 2) / sxx)
    r2 = 1 - sum(e * e for e in res) / sum((c - my) ** 2 for c in y)
    return b, se, r2


def mensile(d):
    out = {}
    for k in sorted(d):
        out[k[:7]] = d[k]
    return out


def main(cart):
    Y = {s: leggi(os.path.join(cart, "yahoo", s + ".csv")) for s in ("SHY", "IEF", "TLT")}
    T = {s: leggi(os.path.join(cart, s + ".csv")) for s in ("DGS2", "DGS10", "DTB3")}
    # ---------------- A) duration empirica (venerdi' su venerdi')
    print("A) DURATION EMPIRICA: variazione % dell'ETF per +1 punto di rendimento (settimanale)")
    for etf, tasso in (("SHY", "DGS2"), ("IEF", "DGS10"), ("TLT", "DGS10")):
        giorni = sorted(d for d in Y[etf] if d in T[tasso])
        sett = giorni[::5]
        for nome, dal, al in (("fino al 2009", "", "2010"), ("2010-oggi", "2010", "9999"), ("ultimi 3 anni", "2023-11", "9999")):
            s = [d for d in sett if dal <= d < al]
            x = [T[tasso][s[i]] - T[tasso][s[i - 1]] for i in range(1, len(s))]
            y = [(Y[etf][s[i]] / Y[etf][s[i - 1]] - 1) * 100 for i in range(1, len(s))]
            if len(x) > 50:
                b, se, r2 = regressione(x, y)
                print(f"  {etf} su {tasso:5} {nome:14} {b:+.2f}% per +1 punto (+-{1.96 * se:.2f}), R2 {r2:.2f}, {len(x)} settimane")
    # ---------------- B) rendimento di partenza contro rendimento dei 7 anni dopo (IEF)
    print("\nB) RENDIMENTO DEL TREASURY 10 ANNI A FINE MESE CONTRO RENDIMENTO ANNUO DI IEF NEI 7 ANNI DOPO")
    ief, d10 = mensile(Y["IEF"]), mensile(T["DGS10"])
    mesi = sorted(m for m in ief if m in d10)
    cop = []
    for i, m in enumerate(mesi):
        if i + 84 < len(mesi):
            r = (ief[mesi[i + 84]] / ief[m]) ** (1 / 7) - 1
            cop.append((m, d10[m], r * 100))
    x, y = [c[1] for c in cop], [c[2] for c in cop]
    mx, my = sum(x) / len(x), sum(y) / len(y)
    cor = sum((a - mx) * (b - my) for a, b in zip(x, y)) / math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
    err = [b - a for a, b in zip(x, y)]
    print(f"  {len(cop)} partenze ({cop[0][0]} - {cop[-1][0]}): correlazione {cor:.2f}, errore medio {sum(err) / len(err):+.2f} punti, "
          f"errore tipico {math.sqrt(sum(e * e for e in err) / len(err)):.2f} punti l'anno")
    print("  esempi:", [(c[0], round(c[1], 2), round(c[2], 2)) for c in cop[::24]])
    print("  ESITO B:", "SI (si puo' mostrare)" if cor >= 0.7 and math.sqrt(sum(e * e for e in err) / len(err)) <= 1.5 else "NO")
    # ---------------- C) TLT con filtro di trend, con e senza curva positiva
    print("\nC) TLT CON FILTRO DI TREND (10 mesi) CONTRO TREND + CURVA POSITIVA (10 anni - 3 mesi > 0); altrimenti SHY")
    tlt, shy, d3 = mensile(Y["TLT"]), mensile(Y["SHY"]), mensile(T["DTB3"])
    mesi = sorted(m for m in tlt if m in shy and m in d10 and m in d3)
    r1, r2, per = [], [], []
    for i in range(10, len(mesi) - 1):
        m, n = mesi[i], mesi[i + 1]
        trend = tlt[m] > sum(tlt[mesi[i - k]] for k in range(10)) / 10
        curva = d10[m] - d3[m] > 0
        rt, rs = tlt[n] / tlt[m] - 1, shy[n] / shy[m] - 1
        r1.append(rt if trend else rs)
        r2.append(rt if trend and curva else rs)
        per.append(n)
    for nome, ok in (("in campione fino al 2009", lambda m: m < "2010"), ("fuori campione 2010-oggi", lambda m: m >= "2010")):
        a = [x for x, m in zip(r1, per) if ok(m)]
        b = [x for x, m in zip(r2, per) if ok(m)]
        def st(r):
            v, pk, dd = 1.0, 1.0, 0.0
            for x in r:
                v *= 1 + x
                pk = max(pk, v)
                dd = min(dd, v / pk - 1)
            return (v ** (12 / len(r)) - 1) * 100, dd * 100
        (ca, da), (cb, db) = st(a), st(b)
        c = V.coppie([q - p for p, q in zip(a, b)])
        print(f"  {nome}: solo trend {ca:.2f}% annuo, drawdown {da:.1f}% | trend + curva {cb:.2f}% annuo, drawdown {db:.1f}% "
              f"| coppie media {c['media'] * 1200:+.2f}% annuo, p {c['p_t']:.2f} ({len(a)} mesi)")


if __name__ == "__main__":
    main(sys.argv[1])
