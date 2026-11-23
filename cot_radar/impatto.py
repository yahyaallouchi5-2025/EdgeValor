# -*- coding: utf-8 -*-
"""
impatto.py - v8.86 IMPATTO DELLE NOTIZIE MACRO (richiesta di Ya, 23/11/2026): un registro, passato e quotidiano, di come
reagisce ogni strumento alle notizie del calendario (NFP, CPI, Fed, BCE, BoE, BoJ, BoC, RBA, RBNZ, SNB), ora per ora.

DATI: le candele orarie dell'archivio (ramo "orari", gia' riportate all'UTC vero con orari.utc_vero) e gli orari
ufficiali degli annunci (perche.annunci). Quali annunci contano per uno strumento: regola di perche.valute()
(coppia di valute -> le sue due valute; tutto il resto -> annunci USA) PIU' sempre gli annunci USA (valute()).

PER OGNI NOTIZIA (traccia sul grafico):
  - candela della notizia = la candela oraria che contiene l'ora dell'annuncio (inizio <= ora < inizio + 1 ora);
    se il mercato era chiuso (nessuna candela in quell'ora, es. azioni USA alle 8:30 di New York) la notizia si salta;
  - r1  = mossa della prima ora: chiusura della candela della notizia contro la chiusura dell'ora prima (in %);
  - r4, r24 = la stessa mossa fino alla chiusura 4 e 24 ore dopo l'inizio della candela (in %);
  - x   = quante volte r1 e' piu' grande di un'ora normale ALLA STESSA ORA DEL GIORNO: mediana del valore assoluto
          dei rendimenti di quella stessa ora negli ultimi 30 giorni (almeno 10 giorni, altrimenti la notizia si salta);
  - dopo = mossa dalla chiusura della candela della notizia a 24 ore dopo (la parte che viene DOPO la prima ora).
PER OGNI DRIVER (statistiche, solo con almeno MIN_CASI notizie):
  - forte = % delle notizie con una prima ora almeno 2 volte un'ora normale;
  - seg   = % delle volte in cui la mossa dopo la prima ora va nello stesso verso della prima ora;
  - segG  = la stessa cosa solo per le mosse grandi (x >= 3), con almeno 8 casi.
CONTROLLO (per non scambiare il caso per un effetto): le stesse misure su ore qualsiasi dello strumento (una ogni 7),
cosi' la pagina puo' scrivere "ora qualsiasi 49%" accanto a "prosegue 54%".
Niente previsioni: e' un registro di quello che e' successo. La SORPRESA (dato uscito contro consenso) arrivera'
quando ci sara' una fonte del consenso.

USCITA (<uscita>/impatto/):
  <SIMBOLO>.json = {"s", "n", "ev": [[istante "AAAA-MM-GGTHH:MMZ", driver, r1, r4, r24, x, dopo]], "st": [...],
                    "ctrl": {"forte", "seg", "segG"}}
  indice.json    = {"agg", "sim": [{"s", "n", "c": numero notizie, "m": {driver: [casi, x mediana, r1 mediana]}}]}
USO: stagionalita_orari.calcola() chiama scrivi() per ogni simbolo e indice() alla fine (mai bloccante).
DEBUG: python -m cot_radar.impatto <cartella archivio> <simbolo>
"""
import json
import os
import statistics as st
import sys
from bisect import bisect_left, bisect_right
from datetime import datetime, timezone

from . import perche

ORA = 3600
MIN_CASI = 12           # sotto: il driver non ha statistiche (troppo pochi casi)
GIORNI_TIP = 30         # finestra dell'ora normale
MIN_TIP = 10            # giorni minimi con la stessa ora


def _tip(T, C, k):
    """Mediana di |rendimento| della stessa ora del giorno negli ultimi GIORNI_TIP giorni prima della candela k."""
    rr = []
    for g in range(1, GIORNI_TIP + 1):
        t = T[k] - g * 86400
        i = bisect_left(T, t)
        if i < len(T) and T[i] == t and i > 0 and T[i] - T[i - 1] <= 2 * ORA:
            rr.append(abs(C[i] / C[i - 1] - 1))
    return st.median(rr) if len(rr) >= MIN_TIP else None


def _dopo(T, C, k, ore):
    """Chiusura dell'ultima candela entro T[k] + ore (None se non c'e' nessuna candela dopo k in quella finestra)."""
    j = bisect_right(T, T[k] + ore * ORA) - 1
    return C[j] if j > k else None


def reazioni(ore, valute, annunci=None):
    """{ts: [o, h, l, c, ...]} orarie UTC -> [[istante, driver, r1, r4, r24, x, dopo]] in ordine di tempo."""
    if not ore:
        return []
    T = sorted(ore)
    C = [ore[t][3] for t in T]
    out = []
    for t, nome, val in (perche.annunci() if annunci is None else annunci):
        if val not in valute:
            continue
        s = int(t.timestamp())
        if s < T[0] + GIORNI_TIP * 86400 or s >= T[-1] + ORA:
            continue
        k = bisect_right(T, s) - 1
        if k < 1 or s - T[k] >= ORA or T[k] - T[k - 1] > 2 * ORA:   # mercato chiuso o ora prima mancante
            continue
        tip = _tip(T, C, k)
        if not tip:
            continue
        base = C[k - 1]
        r1 = (C[k] / base - 1) * 100
        c4, c24 = _dopo(T, C, k, 3), _dopo(T, C, k, 23)
        out.append([t.strftime("%Y-%m-%dT%H:%MZ"), nome, round(r1, 3),
                    round((c4 / base - 1) * 100, 3) if c4 else None,
                    round((c24 / base - 1) * 100, 3) if c24 else None,
                    round(abs(r1) / (tip * 100), 1),
                    round((c24 / C[k] - 1) * 100, 3) if c24 else None])
    return out


def _quote(L):
    """forte, seg, segG, nG su una lista di [.., r1, .., .., x, dopo]."""
    forte = round(sum(1 for e in L if e[5] >= 2) / len(L) * 100) if L else None
    L2 = [e for e in L if e[6] is not None and e[2] != 0]
    seg = round(sum(1 for e in L2 if e[6] * e[2] > 0) / len(L2) * 100) if L2 else None
    G = [e for e in L2 if e[5] >= 3]
    segG = round(sum(1 for e in G if e[6] * e[2] > 0) / len(G) * 100) if len(G) >= 8 else None
    return forte, seg, segG, len(G)


def statistiche(ev):
    """[{n, casi, r1 (mediana |r1|), x (mediana), forte, seg, segG, nG, dal}] per driver, dal piu' frequente."""
    per = {}
    for e in ev:
        per.setdefault(e[1], []).append(e)
    out = []
    for n, L in sorted(per.items(), key=lambda x: (-len(x[1]), x[0])):
        if len(L) < MIN_CASI:
            continue
        forte, seg, segG, nG = _quote(L)
        out.append({"n": n, "casi": len(L), "r1": round(st.median(abs(e[2]) for e in L), 3),
                    "x": round(st.median(e[5] for e in L), 1), "forte": forte, "seg": seg, "segG": segG, "nG": nG,
                    "dal": L[0][0][:4]})
    return out


def controllo(ore, passo=7):
    """Le stesse quote su ore qualsiasi (una candela ogni `passo`): il termine di paragone del caso."""
    T = sorted(ore)
    C = [ore[t][3] for t in T]
    L = []
    for k in range(1, len(T), passo):
        if T[k] < T[0] + GIORNI_TIP * 86400 or T[k] - T[k - 1] > 2 * ORA:
            continue
        tip = _tip(T, C, k)
        if not tip:
            continue
        r1 = (C[k] / C[k - 1] - 1) * 100
        c24 = _dopo(T, C, k, 23)
        L.append([None, None, r1, None, None, abs(r1) / (tip * 100), (c24 / C[k] - 1) * 100 if c24 else None])
    forte, seg, segG, _ = _quote(L)
    return {"forte": forte, "seg": seg, "segG": segG}


def valute(strumento):
    """Valute degli annunci che contano: quelle di perche.valute() piu' SEMPRE gli annunci USA (NFP, CPI e Fed muovono
    tutti i mercati, anche i cambi senza dollaro: qui si studia quanto, quindi si misurano ovunque)."""
    return perche.valute(strumento) | {"USD"}


def scrivi(sym, nome, ore, uscita, strumento=None):
    """Scrive <uscita>/impatto/<SIMBOLO>.json. Restituisce la riga dell'indice (None se meno di MIN_CASI notizie)."""
    k = strumento or sym.split(".")[0]
    ev = reazioni(ore, valute(k))
    if len(ev) < MIN_CASI:
        return None
    stt = statistiche(ev)
    cart = os.path.join(uscita, "impatto")
    os.makedirs(cart, exist_ok=True)
    with open(os.path.join(cart, sym.replace("/", "_") + ".json"), "w") as fh:
        json.dump({"s": sym, "n": nome, "ev": ev, "st": stt, "ctrl": controllo(ore)}, fh, separators=(",", ":"))
    return {"s": sym, "n": nome, "c": len(ev), "m": {d["n"]: [d["casi"], d["x"], d["r1"]] for d in stt}}


def indice(righe, uscita):
    cart = os.path.join(uscita, "impatto")
    os.makedirs(cart, exist_ok=True)
    with open(os.path.join(cart, "indice.json"), "w") as fh:
        json.dump({"agg": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "sim": [r for r in righe if r]},
                  fh, separators=(",", ":"))


if __name__ == "__main__":
    from . import orari
    sym = sys.argv[2]
    o = orari.utc_vero(sym, orari.leggi(orari.nome_file(sys.argv[1], sym)))
    ev = reazioni(o, valute(sym.split(".")[0]))
    print(len(ev), "notizie; ultime:", ev[-3:])
    for d in statistiche(ev):
        print(d)
    print("controllo", controllo(o))
