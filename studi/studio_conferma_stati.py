# -*- coding: utf-8 -*-
"""
studio_conferma_stati.py - v8.40 QUANTI GIORNI DI CONFERMA PRIMA DI ANNUNCIARE UN CAMBIO DI STATO? (Ya, 20/11/2026)

PROBLEMA: la modalita' di mercato dell'S&P 500 (modalita.py) cambia appena il prezzo attraversa la media a 200 giorni
o la soglia dell'eccesso: vicino alla soglia l'etichetta puo' andare avanti e indietro in pochi giorni. Prima di
avvisare gli utenti dei cambi (pallino nelle Novita'), il cambio deve essere CONFERMATO.
REGOLA DI CONFERMA: il nuovo stato vale solo dopo N giorni di borsa DI FILA nello stesso stato (con N=1 = oggi).
REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - SPY dal 1999 (stessa funzione _modo del sito); N = 1, 2, 3, 5, 7, 10;
  - per ogni N: cambi annunciati all'anno, durata mediana di uno stato confermato, quota di "ritorni lampo"
    (lo stato confermato dura meno di 10 giorni di borsa = l'utente riceve due avvisi in due settimane);
  - SCELTA: il piu' piccolo N con ritorni lampo <= 10% dei cambi (avvisi che restano veri per almeno 2 settimane);
    il costo e' il ritardo: l'avviso arriva N-1 giorni dopo il cambio vero.
USO: python studi/studio_conferma_stati.py <file SPY.csv (data,prezzo)>
"""
import csv
import os
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import modalita as M


def stati_confermati(grezzi, n):
    """[(indice inizio, stato)] dei cambi confermati: lo stato nuovo deve durare n giorni di fila."""
    out, cur, serie = [], None, 0
    for i, s in enumerate(grezzi):
        if s is None:
            continue
        serie = serie + 1 if i and grezzi[i - 1] == s else 1
        if s != cur and serie >= n:
            cur = s
            out.append((i, s))
    return out


def main(f):
    pts = []
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r)
        for x in r:
            try:
                pts.append((x[0][:10], float(x[1])))
            except (ValueError, IndexError):
                pass
    date, prezzi = [d for d, _ in pts], [p for _, p in pts]
    dist = M._distanze(prezzi)
    grezzi = [None] * len(prezzi)
    for i in range(len(prezzi)):
        if date[i] >= "1999-01-01":
            m = M._modo(dist, i)
            grezzi[i] = m[0] if m else None
    validi = [i for i, s in enumerate(grezzi) if s]
    anni = (validi[-1] - validi[0]) / 252
    print(f"giorni: {len(validi)} ({date[validi[0]]} - {date[validi[-1]]}), anni {anni:.1f}")
    print(f"{'N':>3} {'cambi/anno':>11} {'durata mediana (gg)':>20} {'ritorni lampo <10gg':>20}")
    for n in (1, 2, 3, 5, 7, 10):
        c = stati_confermati(grezzi, n)[1:]                 # il primo e' l'inizio, non un cambio
        dur = [c[k + 1][0] - c[k][0] for k in range(len(c) - 1)]
        lampo = sum(1 for x in dur if x < 10) / len(dur) * 100
        print(f"{n:>3} {len(c) / anni:>11.1f} {statistics.median(dur):>20.0f} {lampo:>19.0f}%")
    # stato attuale e da quando, con N=1 e con N=3
    for n in (1, 3):
        c = stati_confermati(grezzi, n)
        print(f"N={n}: ultimi cambi", [(date[i], s) for i, s in c[-4:]])


if __name__ == "__main__":
    main(sys.argv[1])
