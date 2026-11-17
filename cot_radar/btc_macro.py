# -*- coding: utf-8 -*-
"""
btc_macro.py - v7.94 BUSSOLA MACRO DI BITCOIN (Premium, scheda "Mercato e macro").

DA DOVE VIENE (studio del 17/11/2026, studi/studio_btc_macro.py, Bitcoin dal 2011, mese per mese):
  tre fattori macro, misurati sui 3 mesi precedenti, anticipano il mese dopo di Bitcoin in tutti e tre i periodi
  2011-16, 2017-21, 2022-26:
    1) CONDIZIONI FINANZIARIE (NFCI, Fed di Chicago): favorevoli quando si ALLENTANO (indice in discesa);
    2) DOLLARO (DXY): favorevole quando SCENDE;
    3) CREDITO HIGH YIELD (ETF HYG): favorevole quando SALE.
  Punteggio = quanti dei tre sono favorevoli (0-3). Storia: 3 su 3 -> +18% medio, 78% dei mesi positivi;
  0 su 3 -> -8,4%, 32%. S&P 500, Nasdaq, oro, tassi, Treasury: nessun anticipo misurabile (servono solo come contesto).

COSA FA (a ogni costruzione del sito, in automatico):
  1) scarica le serie giornaliere complete: Bitcoin, DXY, HYG, S&P 500, oro (EODHD) e NFCI, VIX (FRED);
  2) RICALCOLA tutto: fattori di oggi, punteggio, tabella storica per punteggio (sempre aggiornata con l'ultimo mese
     chiuso), grafico settimanale degli ultimi 3 anni con il punteggio di ogni settimana, correlazioni con S&P 500 e
     oro (ultime 52 settimane e tipiche del regime di mercato in corso: "normale" o "stress");
  3) salva il risultato in storico/btc_macro.json (ramo "storico"): se un giorno una fonte non risponde, la pagina
     mostra l'ultimo calcolo valido con la sua data (mai numeri inventati).
SOLO LIBRERIA STANDARD (niente pandas): la logica e' la stessa dello studio, riscritta in Python semplice e testata.
DEBUG: python -c "from cot_radar import btc_macro as b; import json; print(json.dumps(b.calcola(b.scarica())['fattori'], indent=1))"
"""
import bisect
import json
import math
import os
from datetime import date, datetime, timedelta, timezone

from .log import log

CARTELLA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storico")
FILE = "btc_macro.json"
DAL = "2010-07-01"              # tutto lo storico di Bitcoin (EODHD parte dal 13/07/2010)
STORIA_DAL = "2011-01"          # lo studio parte dal 2011: prima Bitcoin era un mercato troppo piccolo
MESI_TREND = 3                  # i fattori si misurano sui 3 mesi precedenti
SETT_GRAFICO = 156              # 3 anni di settimane nel grafico
EODHD = {"btc": "BTC-USD.CC", "dxy": "DXY.INDX", "hyg": "HYG.US", "spx": "GSPC.INDX", "oro": "XAUUSD.FOREX"}
FRED = {"nfci": "NFCI", "vix": "VIXCLS"}
# i tre fattori: (chiave, nome, unita', favorevole se la variazione e' ... , come si misura la variazione)
FATTORI = [("nfci", "Condizioni finanziarie", "pt", "giu", "diff"),
           ("dxy", "Dollaro", "%", "giu", "pct"),
           ("hyg", "Credito high yield", "%", "su", "pct")]
STRESS_VIX = 25                 # regime "stress": VIX sopra 25 oppure S&P 500 sotto la media a 200 giorni


# --------------------------------------------------------------------------- dati
def scarica(eodhd_serie=None, fred_serie=None):
    """{nome: [(data "AAAA-MM-GG", valore), ...]} per tutte le serie; una serie che non arriva manca (None).
    eodhd_serie(sym, dal) e fred_serie(sid, dal) si possono sostituire nei test."""
    if eodhd_serie is None:
        from .eodhd import serie as eodhd_serie
    if fred_serie is None:
        from .fonti import get_fred as fred_serie
    out = {}
    for k, sym in EODHD.items():
        try:
            out[k] = [(str(d)[:10], float(v)) for d, v in (eodhd_serie(sym, DAL) or []) if v]
        except Exception as e:
            log.warning("bussola BTC: %s non scaricato (%s)", sym, type(e).__name__)
    for k, sid in FRED.items():
        try:
            out[k] = [(str(d)[:10], float(v)) for d, v in (fred_serie(sid, DAL) or []) if v is not None]
        except Exception as e:
            log.warning("bussola BTC: %s non scaricato da FRED (%s)", sid, type(e).__name__)
    return {k: sorted(v) for k, v in out.items() if v}


def _fine_mese(s):
    """{'AAAA-MM': ultimo valore del mese}"""
    m = {}
    for d, v in s:
        m[d[:7]] = v
    return m


_DATE = {}


def _alla_data(s, giorno):
    """Ultimo valore della serie in quel giorno o prima (None se la serie comincia dopo). Ricerca binaria:
    le date di ogni serie si preparano una volta sola (cache per id della lista)."""
    if not s:
        return None
    k = id(s)
    if k not in _DATE or _DATE[k][0] is not s:
        _DATE[k] = (s, [d for d, _ in s])
    i = bisect.bisect_right(_DATE[k][1], giorno)
    return s[i - 1][1] if i else None


def _var(a, b, modo):
    """Variazione da a a b: in punti (diff) o in percentuale (pct)."""
    if a is None or b is None:
        return None
    return b - a if modo == "diff" else (b / a - 1) * 100


def _favorevole(v, verso):
    return None if v is None else (v <= 0 if verso == "giu" else v > 0)


def _corr(x, y):
    n = len(x)
    if n < 10:
        return None
    mx, my = sum(x) / n, sum(y) / n
    sx = math.sqrt(sum((a - mx) ** 2 for a in x))
    sy = math.sqrt(sum((b - my) ** 2 for b in y))
    return None if not sx or not sy else round(sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy), 2)


def _settimane(s):
    """{venerdi' 'AAAA-MM-GG': ultimo valore della settimana (lunedi'-domenica)}"""
    w = {}
    for d, v in s:                       # ogni giorno va al venerdi' della sua settimana (sabato e domenica compresi)
        g = date.fromisoformat(d)
        w[(g + timedelta(days=4 - g.weekday())).isoformat()] = v
    return w


# --------------------------------------------------------------------------- calcolo
def calcola(S, oggi=None):
    """Serie scaricate -> blocco per la pagina (None se mancano Bitcoin o uno dei tre fattori)."""
    if not S.get("btc") or any(not S.get(f[0]) for f in FATTORI):
        return None
    btc = S["btc"]
    ultimo = min(S[k][-1][0] for k in ["btc"] + [f[0] for f in FATTORI])     # data in cui TUTTI hanno il dato
    tre_mesi_fa = (date.fromisoformat(ultimo) - timedelta(days=91)).isoformat()
    # 1) FATTORI DI OGGI: variazione degli ultimi 3 mesi e semaforo
    fattori, punti = [], 0
    for k, nome, unita, verso, modo in FATTORI:
        fine = S[k][-1][0]                                   # ogni fattore con il suo dato piu' recente
        inizio = (date.fromisoformat(fine) - timedelta(days=91)).isoformat()
        v = _var(_alla_data(S[k], inizio), _alla_data(S[k], fine), modo)
        fav = _favorevole(v, verso)
        punti += 1 if fav else 0
        Wk = _settimane(S[k])
        spark = [round(Wk[d], 4) for d in sorted(Wk)[-53:-1] + [sorted(Wk)[-1]]][-52:]     # ultimo anno, settimanale
        fattori.append({"k": k, "nome": nome, "v3": None if v is None else round(v, 2), "unita": unita, "fav": fav,
                        "verso": verso, "al": fine, "spark": spark})
    # 2) STORIA PER PUNTEGGIO, mese per mese dal 2011 (stesso metodo dello studio): punteggio a fine mese con i 3 mesi
    #    precedenti, rendimento di Bitcoin del mese DOPO (logaritmico, in %). L'ultimo mese senza "dopo" non conta.
    M = {k: _fine_mese(S[k]) for k in ["btc"] + [f[0] for f in FATTORI]}
    mesi = sorted(m for m in M["btc"] if m >= STORIA_DAL)
    per = {p: [] for p in range(4)}
    for i in range(MESI_TREND, len(mesi) - 1):
        m, m3 = mesi[i], mesi[i - MESI_TREND]
        p = 0
        ok = True
        for k, _, _, verso, modo in FATTORI:
            fav = _favorevole(_var(M[k].get(m3), M[k].get(m), modo), verso)
            if fav is None:
                ok = False
                break
            p += 1 if fav else 0
        b0, b1 = M["btc"].get(m), M["btc"].get(mesi[i + 1])
        if ok and b0 and b1:
            per[p].append(math.log(b1 / b0) * 100)
    storico = {str(p): {"media": round(sum(v) / len(v), 1), "pos": round(100 * sum(1 for x in v if x > 0) / len(v)),
