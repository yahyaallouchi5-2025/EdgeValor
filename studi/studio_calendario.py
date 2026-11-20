# -*- coding: utf-8 -*-
"""
studio_calendario.py - v8.45 STUDIO: ANOMALIE DI CALENDARIO (libro CFA Vol. 5 "Equity Investments", cap. 3,
Exhibit 4 "Calendar-Based Anomalies") - Ya, 21/11/2026.

DOMANDE (dal libro):
  TOM      turn-of-the-month: rendimenti piu' alti l'ultimo giorno di borsa del mese e i primi 3 del mese dopo;
  FESTIVI  il giorno di borsa prima di una festivita' di borsa rende di piu';
  LUNEDI'  il lunedi' rende meno degli altri giorni;
  GENNAIO  gennaio rende piu' degli altri mesi (soprattutto le piccole: IWM).
REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - rendimenti giornalieri chiusura su chiusura (prezzi dell'archivio, dividendi esclusi: uguale per tutti i giorni);
  - festivita' = un giorno feriale (lun-ven) senza seduta tra due sedute; "prima del festivo" = la seduta prima;
  - periodi: IN CAMPIONE fino al 2009, FUORI CAMPIONE 2010-oggi;
  - misura: media dei giorni dell'effetto meno media degli altri giorni, test t di Welch;
  - EFFETTO CONFERMATO se la differenza ha il segno del libro in ENTRAMBI i periodi e t >= 2 fuori campione;
  - strumenti: S&P 500 (indice dal 1970), SPY, QQQ, IWM (piccole), DIA, EFA (paesi sviluppati), EEM (emergenti).
  - in piu', solo per lettura: quota del rendimento totale fuori campione fatta nei giorni TOM (~19% dei giorni).
USO: python studi/studio_calendario.py <cartella storico>
"""
import csv
import math
import os
import sys
from datetime import date

STRUMENTI = ["_GSPC", "SPY", "QQQ", "IWM", "DIA", "EFA", "EEM"]
TAGLIO = "2010-01-01"


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


def welch(a, b):
    na, nb = len(a), len(b)
    if na < 20 or nb < 20:
        return None, None
    ma, mb = sum(a) / na, sum(b) / nb
    va = sum((x - ma) ** 2 for x in a) / (na - 1)
    vb = sum((x - mb) ** 2 for x in b) / (nb - 1)
    return ma - mb, (ma - mb) / math.sqrt(va / na + vb / nb)


def etichette(date_):
    """Per ogni seduta i (rendimento da i-1 a i): tom, prefestivo, lunedi, gennaio."""
    n = len(date_)
    d = [date.fromisoformat(x) for x in date_]
    out = []
    for i in range(n):
        # posizione nel mese: ultimo giorno del mese = la seduta dopo e' in un altro mese
        ultimo = i + 1 < n and d[i + 1].month != d[i].month
        k = 0                                             # k-esima seduta del mese (1 = prima)
        j = i
        while j >= 0 and d[j].month == d[i].month and d[j].year == d[i].year:
            k += 1
            j -= 1
        tom = ultimo or k <= 3
        pre = False
        if i + 1 < n:
            gap = (d[i + 1] - d[i]).days
            feriali = sum(1 for g in range(1, gap) if date.fromordinal(d[i].toordinal() + g).weekday() < 5)
            pre = feriali >= 1
        out.append({"tom": tom, "pre": pre, "lun": d[i].weekday() == 0, "gen": d[i].month == 1})
    return out


def main(cart):
    tot = {}
    for s in STRUMENTI:
        f = os.path.join(cart, "yahoo", s + ".csv")
        if not os.path.exists(f):
            continue
        pts = leggi(f)
        date_ = [x for x, _ in pts]
        et = etichette(date_)
        r = [None] + [pts[i][1] / pts[i - 1][1] - 1 for i in range(1, len(pts))]
        print(f"\n=== {s} ({date_[0]} - {date_[-1]}) ===")
        for eff, nome, segno in (("tom", "TOM (ultimo + primi 3)", 1), ("pre", "prima del festivo", 1),
                                 ("lun", "lunedi'", -1), ("gen", "gennaio", 1)):
            riga = []
            ok = []
            for per, dal, al in (("in campione", "", TAGLIO), ("fuori campione", TAGLIO, "9999")):
                a = [r[i] for i in range(1, len(r)) if dal <= date_[i] < al and et[i][eff] and abs(r[i]) < 0.25]
                b = [r[i] for i in range(1, len(r)) if dal <= date_[i] < al and not et[i][eff] and abs(r[i]) < 0.25]
                dm, t = welch(a, b)
                if dm is None:
                    riga.append(f"{per}: n/d")
                    ok.append(None)
                    continue
                riga.append(f"{per}: {dm * 1e4:+.1f} pb/giorno (t {t:+.2f}, {len(a)} giorni)")
                ok.append((dm * segno > 0, t * segno))
            conf = all(o and o[0] for o in ok) and ok[1] and ok[1][1] >= 2
            tot.setdefault(eff, []).append((s, conf))
            print(f"  {nome:24} " + " | ".join(riga) + ("   -> CONFERMATO" if conf else ""))
        # quota del guadagno fuori campione nei giorni TOM (solo lettura)
        lr = [(math.log(1 + r[i]), et[i]["tom"]) for i in range(1, len(r)) if date_[i] >= TAGLIO]
        tutto = sum(x for x, _ in lr)
        tom = sum(x for x, t in lr if t)
        if tutto > 0:
            print(f"  fuori campione: giorni TOM {sum(1 for _, t in lr if t) / len(lr) * 100:.0f}% delle sedute, "
                  f"{tom / tutto * 100:.0f}% del rendimento (in log)")
    print("\nSINTESI (confermato = segno del libro in entrambi i periodi e t >= 2 fuori campione):")
    for eff, v in tot.items():
        print(f"  {eff}: confermato su {sum(1 for _, c in v if c)} strumenti su {len(v)}: {[s for s, c in v if c]}")


if __name__ == "__main__":
    main(sys.argv[1])
