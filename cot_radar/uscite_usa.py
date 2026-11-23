# -*- coding: utf-8 -*-
"""
uscite_usa.py - v8.87 ALTRI DATI USA AD ALTO IMPATTO per il registro delle Notizie macro (cot_radar/impatto.py).
Oltre a NFP, CPI e Fed (eventi_usa.csv): vendite al dettaglio, prezzi alla produzione (PPI), inflazione PCE,
PIL (prima stima) e posti di lavoro vacanti (JOLTS). Richiesta di Ya (23/11/2026): "tutte le notizie impattanti".

FONTE DELLE DATE: ALFRED (St. Louis Fed), le "vintage dates" di ogni serie = i giorni in cui il dato e' stato
pubblicato. Pagina pubblica, niente chiave: alfred.stlouisfed.org/series/downloaddata?seid=<SERIE>.
  - una copia salvata sta in uscite_usa.csv (scaricata il 23/11/2026): vale anche senza rete;
  - nel giro notturno (orari.yml) si rileggono le pagine: i nuovi rilasci entrano da soli il giorno dopo l'uscita.
PULIZIA (una vintage date non e' sempre un rilascio che muove il mercato):
  - serie mensili (vendite, PPI, PCE): un rilascio al mese, quello piu' vicino al giorno tipico della serie
    (le revisioni annuali escono in un altro giorno dello stesso mese e si scartano);
  - PIL: solo la PRIMA stima del trimestre (gennaio, aprile, luglio, ottobre, dal giorno 20): e' quella che conta;
  - JOLTS: tutte (a volte due rilasci nello stesso mese, sono rilasci veri);
  - se il PCE esce lo stesso giorno della prima stima del PIL resta solo "PIL USA" (stessa candela, stessa mossa).
ORE (New York): tutto alle 8:30, JOLTS alle 10:00.
USO: carica(rete=False) -> [(data ISO, ora ET decimale, nome)].
DEBUG: python -m cot_radar.uscite_usa  (scarica, stampa i conteggi e riscrive uscite_usa.csv)
"""
import csv
import os
import re
import statistics as st
import urllib.request
from collections import defaultdict

from .log import log

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uscite_usa.csv")
URL = "https://alfred.stlouisfed.org/series/downloaddata?seid={}"
# nome mostrato, serie ALFRED (piu' di una = unite), ora di New York, regola di pulizia
SERIE = [("Vendite USA", ["RSAFS"], 8.5, "mese"),
         ("PPI USA", ["PPIFIS", "PPIFGS"], 8.5, "mese"),
         ("PCE USA", ["PCEPI"], 8.5, "mese"),
         ("PIL USA", ["GDPC1"], 8.5, "pil"),
         ("JOLTS USA", ["JTSJOL"], 10.0, "tutte")]
DAL = "2000-01-01"


def vintage(html):
    """Date ISO delle vintage nella pagina di download di ALFRED (le <option> della casella delle date)."""
    return sorted(set(re.findall(r'<option value="(\d{4}-\d\d-\d\d)"', html)))


def pulisci(date, regola):
    """Applica la regola di pulizia (vedi intestazione) a una lista di date ISO ordinate."""
    date = [d for d in date if d >= DAL]
    if regola == "tutte":
        return date
    if regola == "pil":
        return [d for d in date if int(d[5:7]) in (1, 4, 7, 10) and int(d[8:]) >= 20]
    tipico = st.median(int(d[8:]) for d in date) if date else 15
    per_mese = defaultdict(list)
    for d in date:
        per_mese[d[:7]].append(d)
    return sorted(min(L, key=lambda d: (abs(int(d[8:]) - tipico), d)) for L in per_mese.values())


def _scarica(seid, timeout=30):
    with urllib.request.urlopen(URL.format(seid), timeout=timeout) as r:   # client standard di Python
        return r.read().decode("utf-8", "replace")


def _da_file(file=FILE):
    out = set()
    try:
        with open(file, encoding="utf-8") as fh:
            for r in csv.DictReader(x for x in fh if not x.startswith("#")):
                out.add((r["data"], float(r["ora_et"]), r["evento"]))
    except (OSError, KeyError, ValueError) as e:
        log.warning("uscite USA: file %s non letto (%s)", file, e)
    return out


def costruisci(pagine):
    """{seid: html} -> set di (data, ora, nome) puliti, PCE tolto nei giorni della prima stima del PIL."""
    out = set()
    for nome, serie, ora, regola in SERIE:
        date = sorted({d for s in serie for d in vintage(pagine.get(s, ""))})
        for d in pulisci(date, regola):
            out.add((d, ora, nome))
    pil = {d for d, _, n in out if n == "PIL USA"}
    return {x for x in out if not (x[2] == "PCE USA" and x[0] in pil)}


def carica(rete=False, file=FILE):
    """[(data, ora ET, nome)] ordinata: copia salvata + (con rete=True) le date nuove lette oggi da ALFRED."""
    out = _da_file(file)
    if rete:
        pagine, errori = {}, 0
        for _, serie, _, _ in SERIE:
            for s in serie:
                if errori >= 2:                       # sito irraggiungibile: inutile insistere, resta la copia salvata
                    break
                try:
                    pagine[s] = _scarica(s)
                except Exception as e:                # noqa: BLE001 - la rete e' un extra: mai bloccante
                    errori += 1
                    log.warning("uscite USA: ALFRED %s non letto (%s)", s, e)
        nuove = costruisci(pagine)
        # per ogni serie letta bene si prendono solo le date DOPO l'ultima salvata (lo storico salvato resta com'e')
        for nome, serie, _, _ in SERIE:
            if not all(s in pagine for s in serie):
                continue
            ultima = max((d for d, _, n in out if n == nome), default="")
            out |= {x for x in nuove if x[2] == nome and x[0] > ultima}
    return sorted(out)


def scrivi(righe, file=FILE):
    with open(file, "w", encoding="utf-8", newline="") as fh:
        fh.write("# Altri dati USA ad alto impatto (uscite_usa.py). Fonte: ALFRED St. Louis Fed, vintage dates delle serie\n"
                 "# RSAFS (vendite al dettaglio), PPIFIS+PPIFGS (PPI), PCEPI (PCE), GDPC1 (PIL, prima stima), JTSJOL (JOLTS),\n"
                 "# pulite come spiegato in uscite_usa.py. ora_et = ora di New York. Scaricate il 23/11/2026.\n")
        w = csv.writer(fh)
        w.writerow(["data", "evento", "ora_et"])
        for d, ora, nome in sorted(righe):
            w.writerow([d, nome, ora])


if __name__ == "__main__":
    pagine = {s: _scarica(s) for _, serie, _, _ in SERIE for s in serie}
    r = costruisci(pagine)
    scrivi(r)
    from collections import Counter
    print(Counter(n for _, _, n in r))
