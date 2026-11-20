# -*- coding: utf-8 -*-
"""
studio_stagionalita_chi2.py - v8.38 CONTROLLO CHI-QUADRO DEI FILTRI DI STAGIONALITA' (libro CFA Vol. 1, cap. 9;
Ya, 20/11/2026)

DOMANDA: il filtro "affidabile" della stagionalita' MENSILE (stagionalita.mesi: anni d'accordo >= 65%, test t >= 2,
stabile tra prima e seconda meta' degli anni, coerente col trend) indovina davvero il verso del mese DOPO, su anni
che non ha visto? Oppure un mese "affidabile" va come un mese qualunque?

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI (prova "in avanti", nessun dato dal futuro):
  - per ogni anno di prova Y (2006 -> ultimo anno chiuso) la stagionalita' si calcola SOLO con i prezzi fino al
    31/12 di Y-1, con la stessa funzione del sito (stagionalita.mesi);
  - previsione = verso della mediana (senza trend) di quel mese; esito = il mese di Y e' davvero salito/sceso;
  - tabella 2x2: mese AFFIDABILE / NON affidabile  x  previsione GIUSTA / SBAGLIATA -> chi-quadro (verifica_stat);
  - in piu': % di previsioni giuste dei soli affidabili contro il 50% (test dei segni) e rendimento medio nel verso
    previsto (in punti % del mese);
  - strumenti: tutti i prezzi giornalieri dell'archivio (ETF, future, cambi FRED) con almeno 10 anni prima dell'anno di prova.
  - DECISIONE: il filtro e' confermato se gli affidabili indovinano piu' dei non affidabili con p < 0,05 e il
    rendimento medio nel verso previsto e' positivo. Altrimenti si rivede (e lo si dice in pagina).
USO: python studi/studio_stagionalita_chi2.py <cartella storico>
"""
import csv
import glob
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import stagionalita as S, verifica_stat as V


def leggi(f):
    out = []
    with open(f, encoding="utf-8") as fh:
        rd = csv.reader(fh)
        next(rd, None)
        for r in rd:
            try:
                v = float(r[1])
            except (ValueError, IndexError):
                continue
            if v > 0 and len(r[0]) >= 10:
                out.append((r[0][:10], v))
    return sorted(out)


def rend_mesi(pts):
    fine = {}
    for d, v in pts:
        fine[(int(d[:4]), int(d[5:7]))] = v
    out = {}
    for (y, m), v in fine.items():
        py, pm = (y, m - 1) if m > 1 else (y - 1, 12)
        if (py, pm) in fine:
            out[(y, m)] = math.log(v / fine[(py, pm)])
    return out


def main(cartella):
    files = glob.glob(os.path.join(cartella, "yahoo", "*.csv")) + glob.glob(os.path.join(cartella, "DEX*.csv")) + \
        [os.path.join(cartella, x) for x in ("SP500.csv", "NASDAQCOM.csv", "DJIA.csv", "DCOILWTICO.csv")]
    righe = []                                            # (strumento, anno, mese, affidabile, giusta, rend nel verso)
    usati = 0
    for f in files:
        if not os.path.exists(f):
            continue
        pts = leggi(f)
        if not pts:                                         # gli anni minimi (10) li controlla gia' stagionalita.mesi
            continue
        usati += 1
        rm = rend_mesi(pts)
        ultimo_anno = int(pts[-1][0][:4]) - 1               # ultimo anno chiuso
        for y in range(2006, ultimo_anno + 1):
            fin = [p for p in pts if p[0] < f"{y}-01-01"]
            if len(fin) < 2500:                             # meno di ~10 anni di borsa: non si prova
                continue
            stat, _ = S.mesi(S.Serie(fin))
            if not stat:
                continue
            for m in range(1, 13):
                st = stat[m - 1]
                if "med_d" not in st or st["med_d"] == 0 or (y, m) not in rm:
                    continue
                verso = 1 if st["med_d"] > 0 else -1
                r = rm[(y, m)]
                righe.append((os.path.basename(f), y, m, st.get("robusto", False), r * verso > 0, r * verso * 100))
    aff = [x for x in righe if x[3]]
    non = [x for x in righe if not x[3]]
    a, b = sum(1 for x in aff if x[4]), sum(1 for x in aff if not x[4])
    c, d = sum(1 for x in non if x[4]), sum(1 for x in non if not x[4])
    t = V.contingenza(a, b, c, d)
    print(f"strumenti: {usati}; previsioni mensili provate in avanti (2006-{max(x[1] for x in righe)}): {len(righe)}")
    print(f"AFFIDABILI:     {a}/{a+b} giuste = {a/(a+b)*100:.1f}%   rendimento medio nel verso previsto "
          f"{sum(x[5] for x in aff)/len(aff):+.2f} punti al mese")
    print(f"NON affidabili: {c}/{c+d} giuste = {c/(c+d)*100:.1f}%   rendimento medio nel verso previsto "
          f"{sum(x[5] for x in non)/len(non):+.2f} punti al mese")
    print(f"chi-quadro affidabili contro non affidabili: p = {t['p']:.4f}")
    cp = V.coppie([x[5] / 100 for x in aff])
    print(f"affidabili: rendimento nel verso previsto, test t p = {cp['p_t']:.4f}, test dei segni p = {cp['p_segni']:.4f}, "
          f"IC95 [{cp['ic95'][0]*100:+.2f}, {cp['ic95'][1]*100:+.2f}] punti al mese")
    for nome, dal, al in (("2006-2015", 2006, 2015), ("2016-oggi", 2016, 9999)):
        A = [x for x in aff if dal <= x[1] <= al]; N = [x for x in non if dal <= x[1] <= al]
        if A and N:
            print(f"  {nome}: affidabili {sum(x[4] for x in A)/len(A)*100:.1f}% giuste ({len(A)}), "
                  f"non affidabili {sum(x[4] for x in N)/len(N)*100:.1f}% ({len(N)})")


if __name__ == "__main__":
    main(sys.argv[1])
