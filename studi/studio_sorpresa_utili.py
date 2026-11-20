# -*- coding: utf-8 -*-
"""
studio_sorpresa_utili.py - v8.45 STUDIO: DOPO CONTI MOLTO MIGLIORI DEL SOLITO IL PREZZO CONTINUA A SALIRE?
("Earnings surprise", libro CFA Vol. 5 cap. 3: i prezzi si adeguano alle sorprese degli utili, ma non sempre
subito = "post-earnings announcement drift"). Senza stime degli analisti: la sorpresa e' misurata sulla storia
dell'azienda stessa (SUE "a serie storica"). Ya, 21/11/2026.

DATI SENZA BIAS DEI SOPRAVVISSUTI: bilanci SEC di tutte le aziende USA (ramo studio-buffett, utile trimestrale dei
10-Q con la DATA DI DEPOSITO), prezzi mensili di tutte le azioni USA anche delistate (ramo studio-delistate).
REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - per ogni 10-Q (utile del trimestre, 1 trimestre): variazione = utile - utile dello stesso trimestre un anno
    prima (+-20 giorni); SUE = variazione / deviazione standard delle 8 variazioni precedenti (almeno 6);
  - ogni fine mese t (2011-oggi), universo = le 500 azioni piu' scambiate (studio_onesto), solo quelle con un 10-Q
    DEPOSITATO nel mese t; FORTI = primo 20% per SUE, DEBOLI = ultimo 20%;
  - rendimento del mese dopo (t -> t+1) e dei 3 mesi dopo; uscita dalla borsa = 0 da li' in poi;
  - misura: FORTI meno TUTTI (quelli con 10-Q nel mese), un'osservazione al mese; sviluppo 2011-2017, verifica 2018-oggi;
  - EFFETTO CONFERMATO se la media e' > 0 in ENTRAMBI i periodi e t >= 2 in verifica (test sulle coppie,
    verifica_stat), sul mese dopo. Solo allora si propone un uso (es. filtro della Selezione di oggi).
USO: python studi/studio_sorpresa_utili.py <cartella delistate> <cartella bilanci SEC>
"""
import csv
import glob
import gzip
import json
import math
import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cot_radar import satellite as S, verifica_stat as V        # noqa: E402
import studio_onesto as O                                      # noqa: E402
from studio_buffett import abbina                              # noqa: E402

TAGLIO = "2018-01"


def trimestrali(cartella, ciks):
    """{cik: [(deposito, fine periodo, utile del trimestre)]} dai 10-Q (trimestri = 1), voce utile."""
    out = {}
    for f in sorted(glob.glob(os.path.join(cartella, "sec_valori_*.csv.gz"))):
        with gzip.open(f, "rt") as fh:
            for r in csv.reader(fh):
                if r[0] in ciks and r[3] == "1" and r[4] == "utile":
                    out.setdefault(r[0], []).append((r[1], r[2], float(r[5])))
    return {k: sorted(set(v), key=lambda x: (x[1], x[0])) for k, v in out.items()}


def sue(serie):
    """[(deposito, sue)] per ogni trimestre con abbastanza storia (prima pubblicazione per fine periodo)."""
    primo = {}
    for dep, fp, u in serie:
        if fp not in primo or dep < primo[fp][0]:
            primo[fp] = (dep, u)
    fini = sorted(primo)
    dfin = [date.fromisoformat(x) for x in fini]
    var = []                                              # (fp, deposito, variazione sull'anno prima)
    for i, f in enumerate(fini):
        for j in range(i - 1, -1, -1):
            g = (dfin[i] - dfin[j]).days
            if 345 <= g <= 385:
                var.append((f, primo[f][0], primo[f][1] - primo[fini[j]][1]))
                break
            if g > 385:
                break
    out = []
    for k in range(len(var)):
        prec = [v for _, _, v in var[max(0, k - 8):k]]
        if len(prec) < 6:
            continue
        m = sum(prec) / len(prec)
        sd = math.sqrt(sum((x - m) ** 2 for x in prec) / (len(prec) - 1))
        if sd > 0:
            out.append((var[k][1], var[k][2] / sd))
    return out


def rend(x, t, mesi):
    v = 1.0
    for k in range(mesi):
        a, b = x.p.get(t + k), x.p.get(t + k + 1)
        if a and b:
            q = b / a - 1
            if -0.95 <= q <= 3.0:
                v *= 1 + q
    return v - 1


def main():
    cart, csec = sys.argv[1], sys.argv[2]
    el, dati = O.carica(cart)
    tt = O.titoli(dati)
    nomi = json.load(open(os.path.join(csec, "sec_nomi.json")))
    scambi = {c: sum(cv.values()) for c, (_, cv) in tt.items()}
    mappa = {t: c for t, c in abbina(el, nomi, scambi).items() if t in tt}
    tri = trimestrali(csec, set(mappa.values()))
    S_ = {c: sue(v) for c, v in tri.items()}
    print(f"aziende con utili trimestrali: {len(tri)}, con SUE: {sum(1 for v in S_.values() if v)}")
    ultimo_m = max(max(x.p) for x, _ in tt.values()) - 3
    righe = []                                            # (mese, forti-tutti 1m, deboli-tutti 1m, forti-tutti 3m, n)
    for t in range(S._n("2011-01"), ultimo_m):
        ym = S._ym(t)
        grp = []
        for x in O.universo_onesto(tt, t):
            c = mappa.get(x.t)
            if not c or c not in S_:
                continue
            s = [v for dep, v in S_[c] if dep[:7] == ym]
            if s:
                grp.append((s[-1], rend(x, t, 1), rend(x, t, 3)))
        if len(grp) < 25:
            continue
        grp.sort()
        q = max(1, len(grp) // 5)
        deb, forti = grp[:q], grp[-q:]
        m = lambda g, k: sum(x[k] for x in g) / len(g)                     # noqa: E731
        righe.append((ym, m(forti, 1) - m(grp, 1), m(deb, 1) - m(grp, 1), m(forti, 2) - m(grp, 2), len(grp)))
    print(f"mesi: {len(righe)}, aziende con 10-Q nel mese: media {sum(r[4] for r in righe) / len(righe):.0f}")
    for nome, k in (("FORTI meno tutti, mese dopo", 1), ("DEBOLI meno tutti, mese dopo", 2), ("FORTI meno tutti, 3 mesi", 3)):
        for per, ok in (("sviluppo 2011-2017", lambda m: m < TAGLIO), ("verifica 2018-oggi", lambda m: m >= TAGLIO)):
            x = [r[k] for r in righe if ok(r[0])]
            c = V.coppie(x)
            print(f"  {nome:30} {per:20} media {sum(x) / len(x) * 100:+.2f}%  t {c['t']:+.2f}  p {c['p_t']:.3f}  "
                  f"IC95 [{c['ic95'][0] * 100:+.2f}, {c['ic95'][1] * 100:+.2f}]  ({len(x)} mesi)")


if __name__ == "__main__":
    main()
