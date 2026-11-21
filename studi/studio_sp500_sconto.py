# -*- coding: utf-8 -*-
"""
studio_sp500_sconto.py - v8.54 STUDIO: S&P 500 MOLTO SOTTO LA MEDIA MOBILE A 200 GIORNI = OCCASIONE?
Richiesta di Ya (21/11/2026): "quando l'S&P 500 si allontana sotto la media a 200 giorni del 15% o del 20%,
quanto ha reso dopo?" Idea: i mercati sono elastici, si scontano in percentuale e poi riprendono (come lo
studio ciclico sul Bitcoin).

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - dati: S&P 500 (indice, chiusure giornaliere, dal 1970; SENZA dividendi: i rendimenti sono prudenti di circa
    2 punti l'anno) e, come controllo, SPY (ETF con dividendi reinvestiti, dal 1993);
  - distanza = chiusura / media mobile semplice a 200 sedute - 1;
  - soglie: -10%, -15%, -20%, -25%;
  - SEGNALE = primo giorno in cui la distanza scende sotto la soglia; un nuovo segnale alla stessa soglia vale solo
    dopo che il prezzo e' tornato SOPRA la media a 200 (un episodio = un acquisto, niente doppi conteggi);
  - acquisto alla chiusura del giorno del segnale; misure: rendimento a 3, 6, 12, 24 mesi (63, 126, 252, 504
    sedute), quota di casi positivi, ulteriore drawdown dopo l'acquisto (minimo successivo prima di tornare al
    prezzo di acquisto) e prezzo piu' basso nei 24 mesi dopo (ulteriore drawdown) e sedute per tornare al prezzo di acquisto;
  - CONFRONTO: lo stesso orizzonte comprando in un giorno qualsiasi (tutte le sedute dal 1971): media e quota di
    casi positivi. Si dice "occasione" solo se il rendimento medio a 12 mesi dopo il segnale supera quello di un
    giorno qualsiasi E la quota di casi positivi non e' piu' bassa, sia fino al 1999 sia dal 2000.
  - Pochi episodi (sono crisi rare): si mostrano tutti, uno per uno, cosi' si vede anche il caso peggiore.
USO: python studi/studio_sp500_sconto.py <cartella storico>
"""
import csv
import os
import sys

SOGLIE = [-10, -15, -20, -25]
ORIZZ = [("3 mesi", 63), ("6 mesi", 126), ("12 mesi", 252), ("24 mesi", 504)]


def leggi(f):
    """[(data, chiusura)] in ordine di data."""
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


def distanze(px):
    """distanza % dalla media a 200 sedute (None per le prime 199)."""
    out, somma = [], 0.0
    for i, (_, v) in enumerate(px):
        somma += v
        if i >= 200:
            somma -= px[i - 200][1]
        out.append((v / (somma / 200) - 1) * 100 if i >= 199 else None)
    return out


def segnali(px, dist, soglia):
    """indici dei giorni di segnale (primo giorno sotto soglia; si riarma sopra la media a 200)."""
    out, armato = [], True
    for i, d in enumerate(dist):
        if d is None:
            continue
        if armato and d <= soglia:
            out.append(i)
            armato = False
        elif not armato and d > 0:
            armato = True
    return out


def dopo(px, i):
    """dati dopo l'acquisto al giorno i: rendimenti per orizzonte, ulteriore drawdown, sedute per tornare in pari."""
    p0 = px[i][1]
    r = {n: ((px[i + k][1] / p0 - 1) * 100 if i + k < len(px) else None) for n, k in ORIZZ}
    # ulteriore drawdown = prezzo piu' basso nei 24 mesi dopo l'acquisto (non solo fino al primo ritorno in pari:
    # un rimbalzo di due giorni nasconderebbe il resto della discesa); in pari = sedute dal minimo al ritorno al
    # prezzo di acquisto, contate dall'acquisto
    fine = min(len(px), i + 505)
    jmin = min(range(i, fine), key=lambda j: px[j][1])
    pari = None
    for j in range(jmin, len(px)):
        if px[j][1] >= p0:
            pari = j - i
            break
    return r, (px[jmin][1] / p0 - 1) * 100, pari


def base(px, dal, al):
    """giorno qualsiasi: media e quota positiva per orizzonte, tra le date dal-al."""
    out = {}
    for n, k in ORIZZ:
        x = [(px[i + k][1] / px[i][1] - 1) * 100 for i in range(len(px) - k) if dal <= px[i][0] < al]
        out[n] = (sum(x) / len(x), sum(1 for v in x if v > 0) / len(x) * 100) if x else (None, None)
    return out


def main(cart):
    for nome, f, dal in (("S&P 500 (indice, senza dividendi)", "_GSPC.csv", "1971"), ("SPY (con dividendi)", "SPY.csv", "1994")):
        px = leggi(os.path.join(cart, "yahoo", f))
        dist = distanze(px)
        print(f"\n================ {nome}: {px[0][0]} - {px[-1][0]} ================")
        print(f"oggi: distanza dalla media a 200 = {dist[-1]:+.1f}%")
        for per, a, b in (("TUTTO", dal, "9999"), ("FINO AL 1999", dal, "2000"), ("DAL 2000", "2000", "9999")):
            bs = base(px, a, b)
            print(f"\n  giorno qualsiasi {per:12}: " + "  ".join(f"{n} {bs[n][0]:+.1f}% ({bs[n][1]:.0f}% pos.)" for n, _ in ORIZZ if bs[n][0] is not None))
        for s in SOGLIE:
            idx = [i for i in segnali(px, dist, s) if px[i][0] >= dal]
            print(f"\n  --- SOGLIA {s}% sotto la media a 200: {len(idx)} episodi")
            righe = []
            for i in idx:
                r, dd, pari = dopo(px, i)
                righe.append((px[i][0], r, dd, pari))
                print(f"    {px[i][0]}  " + "  ".join(f"{n} {r[n]:+6.1f}%" if r[n] is not None else f"{n}    n/d" for n, _ in ORIZZ)
                      + (f"  | poi ancora {dd:+5.1f}%  | in pari dopo {pari} sedute" if dd < 0 else "  | mai sotto il prezzo di acquisto"))
            for per, a, b in (("tutto", "", "9999"), ("fino al 1999", "", "2000"), ("dal 2000", "2000", "9999")):
                sel = [x for x in righe if a <= x[0] < b]
                if not sel:
                    continue
                cel = []
                for n, _ in ORIZZ:
                    v = [x[1][n] for x in sel if x[1][n] is not None]
                    if v:
                        cel.append(f"{n} {sum(v) / len(v):+.1f}% ({sum(1 for q in v if q > 0)}/{len(v)} pos.)")
                print(f"    media {per:13}: " + "  ".join(cel) + f"  | ulteriore drawdown medio {sum(x[2] for x in sel) / len(sel):+.1f}%, peggiore {min(x[2] for x in sel):+.1f}%")


if __name__ == "__main__":
    main(sys.argv[1])
