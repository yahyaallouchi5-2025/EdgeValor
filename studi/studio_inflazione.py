# -*- coding: utf-8 -*-
"""
studio_inflazione.py - v8.49 STUDIO: RAME, PETROLIO E ORO PROTEGGONO DALL'INFLAZIONE? (libro CFA Vol. 8 "Alternative
Investments", cap. 5 "Inflation hedging"). Ya, 21/11/2026.

PERCHE': le descrizioni dei portafogli dicono "un 5% di rame e petrolio CONTRO L'INFLAZIONE" e "oro come cuscinetto".
Una frase in pagina deve essere vera sui dati: qui si controlla.
REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - inflazione = CPI USA (CPIAUCSL), variazione su 12 mesi; SORPRESA = variazione dell'inflazione su 12 mesi
    (l'inflazione che SALE oltre quella di un anno prima: e' cio' che fa male ad azioni e obbligazioni);
  - per ogni strumento, fine mese per fine mese (12 mesi sovrapposti): rendimento a 12 mesi contro la sorpresa
    nello stesso periodo -> "beta d'inflazione" (punti di rendimento per +1 punto di inflazione) e correlazione;
  - anni con inflazione in salita forte (sorpresa >= +1 punto): rendimento medio a 12 mesi di ogni strumento;
  - strumenti: petrolio WTI a pronti (dal 1986), rame contratto vicino (HG=F), oro (GLD), S&P 500, Treasury 10
    anni (IEF), e i fondi sui future dei portafogli (USO, CPER);
  - LA FRASE "contro l'inflazione" e' VERA se beta > 0 e il rendimento negli anni di inflazione in salita forte e'
    sopra quello dell'S&P 500 e dei Treasury, sia fino al 2009 sia dal 2010.
USO: python studi/studio_inflazione.py <cartella storico>
"""
import csv
import math
import os
import sys

STRUM = [("Petrolio a pronti", "DCOILWTICO.csv"), ("Rame (future vicino)", "yahoo/HG=F.csv"), ("Oro (GLD)", "yahoo/GLD.csv"),
         ("S&P 500", "yahoo/_GSPC.csv"), ("Treasury 10a (IEF)", "yahoo/IEF.csv"), ("Petrolio ETF (USO)", "yahoo/USO.csv"),
         ("Rame ETF (CPER)", "yahoo/CPER.csv")]


def mensile(f):
    out = {}
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r)
        for x in r:
            try:
                v = float(x[-1])
            except (ValueError, IndexError):
                continue
            if v > 0:
                out[x[0][:7]] = v
    return out


def mm(m, k):
    a, b = int(m[:4]), int(m[5:7]) + k
    while b <= 0:
        a, b = a - 1, b + 12
    while b > 12:
        a, b = a + 1, b - 12
    return f"{a:04d}-{b:02d}"


def main(cart):
    cpi = mensile(os.path.join(cart, "CPIAUCSL.csv"))
    yoy = {m: (cpi[m] / cpi[mm(m, -12)] - 1) * 100 for m in cpi if mm(m, -12) in cpi}
    sorpresa = {m: yoy[m] - yoy[mm(m, -12)] for m in yoy if mm(m, -12) in yoy}
    for nome, dal, al in (("FINO AL 2009", "1980", "2010"), ("DAL 2010", "2010", "9999")):
        print(f"\n===== {nome} =====")
        print(f"{'strumento':24}{'beta':>8}{'corr':>7}{'rend. 12m in salita forte':>27}{'rend. 12m medio':>17}{'casi':>6}")
        for s, f in STRUM:
            p = mensile(os.path.join(cart, f))
            xs, ys, forte = [], [], []
            for m in sorted(sorpresa):
                m0 = mm(m, -12)
                if not (dal <= m < al) or m not in p or m0 not in p:
                    continue
                r = (p[m] / p[m0] - 1) * 100
                xs.append(sorpresa[m]); ys.append(r)
                if sorpresa[m] >= 1:
                    forte.append(r)
            if len(xs) < 36:
                print(f"{s:24}  dati insufficienti")
                continue
            mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
            sxx = sum((a - mx) ** 2 for a in xs)
            b = sum((a - mx) * (c - my) for a, c in zip(xs, ys)) / sxx
            cor = b * math.sqrt(sxx / sum((c - my) ** 2 for c in ys))
            fm = f"{sum(forte) / len(forte):+.1f}%" if forte else "n/d"
            print(f"{s:24}{b:>+8.1f}{cor:>7.2f}{fm:>27}{my:>+16.1f}%{len(forte):>6}")
    print("\nNota: 12 mesi sovrapposti (le osservazioni non sono indipendenti): leggere la direzione e l'ordine di grandezza.")


if __name__ == "__main__":
    main(sys.argv[1])
