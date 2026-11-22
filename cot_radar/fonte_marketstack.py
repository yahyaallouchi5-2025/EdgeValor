# -*- coding: utf-8 -*-
"""
fonte_marketstack.py - v8.76 ADATTATORE MARKETSTACK per l'interruttore dei fornitori (fonte.py).

Si attiva scrivendo nel Secret EODHD_API_KEY:  marketstack:<chiave Marketstack>
Restituisce gli STESSI formati di EODHD (vedi eodhd.py), cosi' le schede non cambiano.

COSA COPRE (documentazione API v2, letta il 22/11/2026; DA CONFERMARE con fonte.verifica() al primo giro vero):
  - prezzi giornalieri di azioni, ETF e indici: GET /v2/eod (symbols, exchange = codice MIC, date_from, limit 1000),
    campi open/high/low/close/volume e adj_close (rettificato per dividendi e frazionamenti);
  - dividendi: GET /v2/dividends;  intraday: GET /v2/intraday (solo borse USA, intervalli 1min..24hour);
  - NON ha: notizie, cambi, crypto, ricerca per ISIN, orari delle borse -> fonte.py restituisce None e il sito
    usa le fonti ufficiali o le copie salvate (l'ultimo dato resta visibile).
SIMBOLI: il canonico del sito "CODICE.BORSA" (stile EODHD) diventa CODICE + borsa MIC (es. SXR8.XETRA ->
  symbols=SXR8&exchange=XETR). I punti nel codice USA diventano trattini (BRK.B -> BRK-B, come dice Marketstack).
  Se una borsa non risponde come previsto, verifica() lo mostra nel registro admin prima di fidarsi.
CHIAVE: mai nei log, negli errori o nei file (gli errori riportano solo il codice HTTP).
"""
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone

log = logging.getLogger(__name__)

BASE = "https://api.marketstack.com/v2/"
PAUSA = 0.25                   # massimo 5 richieste al secondo (documentazione): 4 per stare tranquilli
TENTATIVI = 3
LIMITE = 1000                  # righe massime per richiesta
CAPACITA = ("serie", "dividendi", "intraday", "indici")
CHIAMATE = {"n": 0, "errori": 0}

# borsa canonica (stile EODHD) -> codice MIC di Marketstack. Le borse senza riga qui non sono coperte.
MIC = {"US": None, "XETRA": "XETR", "F": "XFRA", "PA": "XPAR", "AS": "XAMS", "BR": "XBRU", "MC": "XMAD",
       "LS": "XLIS", "HE": "XHEL", "VI": "XWBO", "IR": "XDUB", "LSE": "XLON", "SW": "XSWX", "CO": "XCSE",
       "ST": "XSTO", "OL": "XOSL", "TO": "XTSE", "AU": "XASX", "INDX": "INDX"}
VALUTA = {"US": "USD", "XETRA": "EUR", "F": "EUR", "PA": "EUR", "AS": "EUR", "BR": "EUR", "MC": "EUR",
          "LS": "EUR", "HE": "EUR", "VI": "EUR", "IR": "EUR", "TO": "CAD", "AU": "AUD"}


def chiave():
    from .fonte import scelta
    nome, k = scelta()
    return k if nome == "marketstack" else ""


def attivo():
    return bool(chiave())


def copre(sym):
    """True se il simbolo canonico e' su una borsa che Marketstack copre (niente .CC crypto, .FOREX cambi)."""
    return bool(sym and "." in sym and sym.rsplit(".", 1)[1] in MIC)


def _parti(sym):
    """Simbolo canonico -> (simbolo Marketstack, MIC o None)."""
    codice, borsa = sym.rsplit(".", 1)
    if borsa == "INDX":
        return sym, None                              # indici: "GSPC.INDX" come negli esempi ufficiali
    if borsa == "US":
        return codice.replace(".", "-"), None
    return codice, MIC.get(borsa)


def get(percorso, parametri=None, timeout=60, tentativi=TENTATIVI):
    """JSON della richiesta, None se fallisce. Errori 401/403/404/406: riprovare non serve."""
    if not attivo():
        return None
    url = BASE + percorso + "?" + urllib.parse.urlencode(dict(parametri or {}, access_key=chiave()))
    for n in range(tentativi):
        try:
            CHIAMATE["n"] += 1
            req = urllib.request.Request(url, headers={"User-Agent": "edgevalor/marketstack"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                js = json.load(r)
            time.sleep(PAUSA)
            if isinstance(js, dict) and js.get("error"):
                CHIAMATE["errori"] += 1
                log.info("Marketstack %s: %s", percorso, (js["error"] or {}).get("code"))
                return None
            return js
        except urllib.error.HTTPError as e:
            CHIAMATE["errori"] += 1
            if e.code in (401, 403, 404, 406, 422):
                log.info("Marketstack %s: HTTP %s", percorso, e.code)
                return None
            log.warning("Marketstack %s: HTTP %s (tentativo %d/%d)", percorso, e.code, n + 1, tentativi)
        except Exception as e:                         # rete, risposta non JSON...
            CHIAMATE["errori"] += 1
            log.warning("Marketstack %s: %s (tentativo %d/%d)", percorso, type(e).__name__, n + 1, tentativi)
        if n + 1 < tentativi:
            time.sleep(2 * (3 ** n))
    return None


def _righe(percorso, parametri, massimo=20):
    """Tutte le righe "data" seguendo le pagine (offset), al massimo `massimo` pagine."""
    out, offset = [], 0
    for _ in range(massimo):
        js = get(percorso, dict(parametri, limit=LIMITE, offset=offset))
        dati = (js or {}).get("data") if isinstance(js, dict) else None
        if not dati:
            break
        out += dati
        tot = ((js.get("pagination") or {}).get("total")) or 0
        offset += len(dati)
        if len(dati) < LIMITE or (tot and offset >= tot):
            break
    return out or None


def _eod(sym, dal):
    s, mic = _parti(sym)
    q = {"symbols": s, "date_from": dal, "sort": "ASC"}
    if mic:
        q["exchange"] = mic
    return _righe("eod", q)


# ------------------------------------------------------------------ stesse funzioni di eodhd.py
def serie(sym, dal, periodo="d"):
    """[(data, prezzo RETTIFICATO)] dal giorno `dal`; periodo "m" = ultimo prezzo di ogni mese."""
    if not copre(sym):
        return None
    righe = _eod(sym, dal)
    out = {}
    for x in righe or []:
        v = x.get("adj_close") or x.get("close")
        d = str(x.get("date") or "")[:10]
        if d and isinstance(v, (int, float)) and v > 0:
            out[d[:7] if periodo == "m" else d] = round(float(v), 6)
    return sorted(out.items()) or None


def scarica_azione(t, intervallo="1d", periodo="2y"):
    from .eodhd import simbolo
    sym = simbolo(t)
    if not copre(sym):
        return None
    if intervallo == "1mo":
        pts = serie(sym, "2000-01-01", "m")               # Marketstack: storico dal 2000 per i titoli principali
    else:
        giorni = 10 if periodo == "5d" else 740
        pts = serie(sym, (date.today() - timedelta(days=giorni)).isoformat())
    if not pts:
        return None
    return {"valuta": VALUTA.get(sym.rsplit(".", 1)[1]), "fonte": "marketstack"}, pts


def scarica_etf(t):
    from .eodhd import simbolo
    sym = simbolo(t)
    return serie(sym, "2000-01-01") if copre(sym) else None


def cerca_eur(isin):
    """Ricerca per ISIN non documentata: si usano solo le quotazioni in euro verificate a mano (eodhd.XETRA_VERIFICATI)."""
    from .eodhd import XETRA_VERIFICATI
    return XETRA_VERIFICATI.get((isin or "").upper())


def ultimo_eur(sym):
    pts = serie(sym, (date.today() - timedelta(days=12)).isoformat()) if copre(sym) else None
    return pts[-1] if pts else None


def dividendi(sym, dal):
    """[{"date", "value"}] come EODHD /div."""
    if not copre(sym):
        return None
    s, mic = _parti(sym)
    q = {"symbols": s, "date_from": dal, "sort": "ASC"}
    if mic:
        q["exchange"] = mic
    righe = _righe("dividends", q)
    if righe is None:
        return None
    return [{"date": str(x.get("date") or "")[:10], "value": x.get("dividend")} for x in righe
            if x.get("date") and isinstance(x.get("dividend"), (int, float))]


INTERVALLI = {"1m": "1min", "5m": "5min", "1h": "1hour"}


def intraday(sym, intervallo, da, a=None, timeout=30, tentativi=2):
    """[{"timestamp", "open", "high", "low", "close", "volume"}] come EODHD /intraday. Solo borse USA."""
    if not sym or not sym.endswith(".US") or intervallo not in INTERVALLI:
        return None
    s, _ = _parti(sym)
    q = {"symbols": s, "interval": INTERVALLI[intervallo], "sort": "ASC",
         "date_from": datetime.fromtimestamp(da, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")}
    if a is not None:
        q["date_to"] = datetime.fromtimestamp(a, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")
    out = []
    for x in _righe("intraday", q) or []:
        try:
            ts = int(datetime.strptime(str(x["date"])[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc).timestamp())
        except (KeyError, ValueError):
            continue
        c = x.get("close") if x.get("close") is not None else x.get("last")
        out.append({"timestamp": ts, "open": x.get("open"), "high": x.get("high"), "low": x.get("low"),
                    "close": c, "volume": x.get("volume")})
    return out or None
