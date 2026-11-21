# -*- coding: utf-8 -*-
"""
sconto_sp.py - v8.54 S&P 500 SOTTO LA MEDIA MOBILE A 200 GIORNI ("sconto" ciclico), richiesta di Ya del 21/11/2026.

Dato INFORMATIVO nella scheda S&P 500 (Mercati), come il rinnovo dei future: non entra nel punteggio e non e' un
segnale di acquisto. Studio completo con le regole fissate prima: studi/studio_sp500_sconto.py
(risultati_sp500_sconto.txt): piu' lo sconto e' profondo piu' il rendimento dopo e' stato alto in media, ma il
prezzo e' spesso sceso ancora parecchio prima di riprendere.

CALCOLO (uguale allo studio)
  - S&P 500 indice, chiusure giornaliere (archivio storico, yahoo/_GSPC.csv, dal 1970; senza dividendi);
  - distanza = chiusura / media semplice delle ultime 200 sedute - 1;
  - episodio a una soglia = primo giorno sotto la soglia; il successivo vale solo dopo il ritorno sopra la media;
  - dopo ogni episodio: rendimento a 12 e 24 mesi (252 e 504 sedute) e prezzo piu' basso nei 24 mesi dopo.
USCITA: {"dist": % oggi, "data", "soglia": soglia attiva o None, "soglie": [{"s", "n", "r12", "p12", "n12", "r24",
  "p24", "n24", "dd", "dd_min", "ultimo"}], "base12": rendimento medio a 12 mesi di un giorno qualsiasi, "dal"}
"""
import csv
import os

SOGLIE = [-10, -15, -20, -25]


def _leggi(f):
    out = []
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r, None)
        for x in r:
            try:
                v = float(x[1])
            except (ValueError, IndexError):
                continue
            if v > 0:
                out.append((x[0][:10], v))
    return sorted(out)


def calcola(cartella):
    f = os.path.join(cartella or "", "yahoo", "_GSPC.csv")
    if not cartella or not os.path.exists(f):
        return None
    px = _leggi(f)
    if len(px) < 800:
        return None
    # distanza dalla media a 200 sedute (somma mobile: una passata sola)
    dist, somma = [], 0.0
    for i, (_, v) in enumerate(px):
        somma += v
        if i >= 200:
            somma -= px[i - 200][1]
        dist.append((v / (somma / 200) - 1) * 100 if i >= 199 else None)
    soglie = []
    for s in SOGLIE:
        r12, r24, dd, ultimo, armato = [], [], [], None, True
        for i, d in enumerate(dist):
            if d is None:
                continue
            if armato and d <= s:
                armato, ultimo, p0 = False, px[i][0], px[i][1]
                if i + 252 < len(px):
                    r12.append((px[i + 252][1] / p0 - 1) * 100)
                if i + 504 < len(px):
                    r24.append((px[i + 504][1] / p0 - 1) * 100)
                dd.append((min(v for _, v in px[i:i + 505]) / p0 - 1) * 100)
            elif not armato and d > 0:
                armato = True
        if not dd:
            continue
        m = lambda x: round(sum(x) / len(x), 1) if x else None                         # noqa: E731
        soglie.append({"s": s, "n": len(dd), "ultimo": ultimo,
                       "r12": m(r12), "p12": sum(1 for x in r12 if x > 0), "n12": len(r12),
                       "r24": m(r24), "p24": sum(1 for x in r24 if x > 0), "n24": len(r24),
                       "dd": m(dd), "dd_min": round(min(dd), 1)})
    # rendimento a 12 mesi di un giorno qualsiasi (stesso periodo dei segnali: dalla prima media a 200)
    tutti = [(px[i + 252][1] / px[i][1] - 1) * 100 for i in range(199, len(px) - 252)]
    oggi = dist[-1]
    attiva = min((s for s in SOGLIE if oggi <= s), default=None)
    return {"dist": round(oggi, 1), "data": px[-1][0], "dal": px[199][0][:4], "soglia": attiva, "soglie": soglie,
            "base12": round(sum(tutti) / len(tutti), 1),
            "base12_pos": round(sum(1 for x in tutti if x > 0) / len(tutti) * 100)}
