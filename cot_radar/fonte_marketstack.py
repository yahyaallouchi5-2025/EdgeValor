# -*- coding: utf-8 -*-
"""
fonte_marketstack.py - v8.77 ADATTATORE MARKETSTACK per l'interruttore dei fornitori (fonte.py).

Si attiva scrivendo nel Secret EODHD_API_KEY:  marketstack:<chiave>   (oppure  marketstack:<chiave>|eodhd:<chiave>
per tenere EODHD come riserva di quello che Marketstack non ha). Restituisce gli STESSI formati di EODHD.

SIMBOLI (verificati sulla ricerca ufficiale marketstack.com/search il 22/11/2026): Marketstack usa quasi sempre i
ticker in stile Yahoo, gli stessi del sito: SPY, SXR8.DE (Xetra), ENI.MI, SHEL.L, 7203.T, 0005.HK, RY.TO, BHP.AX,
NESN.SW, ASML.AS, NOVO-B.CO, VOLV-B.ST, EQNR.OL. Eccezione: a Parigi alcuni titoli sono "CODICE.XPAR" (AIR.XPAR) e
altri "CODICE.PA" (BNP.PA): si provano tutti e due e si ricorda quello giusto.
NON HA: crypto, cambi, notizie, prezzi live europei, candele orarie fuori dagli USA -> fonte.py chiede al fornitore
  successivo (es. EODHD) o usa la copia salvata.
LONDRA: escluso finche' non verifichiamo se i prezzi arrivano in pence o in sterline (Yahoo/EODHD danno pence).
COSA COPRE: prezzi giornalieri (GET /v2/eod, adj_close rettificato), dividendi (/v2/dividends), intraday USA
  (/v2/intraday). Limite 5 richieste al secondo. Chiave mai nei log (solo codici HTTP).
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
PAUSA = 0.25                   # massimo 5 richieste al secondo: 4 per stare tranquilli
TENTATIVI = 3
LIMITE = 1000                  # righe massime per richiesta
CAPACITA = ("serie", "dividendi", "intraday", "indici")
CHIAMATE = {"n": 0, "errori": 0}
LONDRA = False                 # v8.77 da accendere dopo la verifica dell'unita' (pence o sterline)

# suffisso del ticker (stile Yahoo) -> valuta. Sono le borse della ricerca ufficiale Marketstack usate dal sito.
VALUTA = {"": "USD", ".DE": "EUR", ".F": "EUR", ".PA": "EUR", ".XPAR": "EUR", ".AS": "EUR", ".BR": "EUR",
          ".MC": "EUR", ".LS": "EUR", ".HE": "EUR", ".MI": "EUR", ".SW": "CHF", ".CO": "DKK", ".ST": "SEK",
          ".OL": "NOK", ".TO": "CAD", ".AX": "AUD", ".T": "JPY", ".HK": "HKD", ".NS": "INR", ".BO": "INR",
          ".SS": "CNY", ".SZ": "CNY", ".L": "GBP"}
# simbolo canonico stile EODHD (da eodhd.simbolo / cerca_eur) -> suffisso Marketstack
DA_EODHD = {"US": "", "XETRA": ".DE", "F": ".F", "PA": ".PA", "AS": ".AS", "BR": ".BR", "MC": ".MC", "LS": ".LS",
            "HE": ".HE", "LSE": ".L", "SW": ".SW", "CO": ".CO", "ST": ".ST", "OL": ".OL", "TO": ".TO", "AU": ".AX"}
_trovati = {}                  # simbolo chiesto -> simbolo Marketstack che ha risposto (per non riprovare)


def chiave():
    from .fonte import chiave_di
    return chiave_di("marketstack")


def attivo():
    return bool(chiave())


def _suffisso(x):
    if "." not in x:
        return ""
    s = "." + x.rsplit(".", 1)[1]
    return s if s in VALUTA else None


def candidati(x):
    """Ticker del sito o simbolo canonico EODHD -> [simboli Marketstack da provare], [] se non coperto."""
    if not x or x.startswith("^") or "=" in x or x.endswith(("-USD", ".CC", ".FOREX", ".INDX")):
        return []                                    # indici, future, crypto, cambi: altri fornitori o fonti ufficiali
    if "." in x and x.rsplit(".", 1)[1] in DA_EODHD:  # canonico EODHD (SPY.US, SXR8.XETRA, BHP.AU...)
        codice, borsa = x.rsplit(".", 1)
        x = codice + DA_EODHD[borsa]
    suf = _suffisso(x)
    if suf is None or (suf == ".L" and not LONDRA):
        return []
    if suf == ".PA":
        return [x, x[:-3] + ".XPAR"]
    return [x]


def copre_ticker(t, canonico=None):
    return bool(candidati(t))


def get(percorso, parametri=None, timeout=60, tentativi=TENTATIVI):
    """JSON della richiesta, None se fallisce. Errori 401/403/404/406/422: riprovare non serve."""
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


def _per_simbolo(sym, percorso, parametri):
    """Prova i candidati in ordine e ricorda quello che risponde: (simbolo Marketstack, righe) oppure (None, None)."""
    lista = [_trovati[sym]] if sym in _trovati else candidati(sym)
    for c in lista:
        righe = _righe(percorso, dict(parametri, symbols=c))
        if righe:
            _trovati[sym] = c
            return c, righe
    return None, None


# ------------------------------------------------------------------ stesse funzioni di eodhd.py
def serie(sym, dal, periodo="d"):
    """[(data, prezzo RETTIFICATO)] dal giorno `dal`; periodo "m" = ultimo prezzo di ogni mese."""
    _, righe = _per_simbolo(sym, "eod", {"date_from": dal, "sort": "ASC"})
    out = {}
    for x in righe or []:
        v = x.get("adj_close") or x.get("close")
        d = str(x.get("date") or "")[:10]
        if d and isinstance(v, (int, float)) and v > 0:
            out[d[:7] if periodo == "m" else d] = round(float(v), 6)
    return sorted(out.items()) or None


def scarica_azione(t, intervallo="1d", periodo="2y"):
    """Stesso formato di azioni.scarica: ({meta}, [(data, prezzo)]) oppure None."""
    if not candidati(t):
        return None
    if intervallo == "1mo":
        pts = serie(t, "2000-01-01", "m")              # Marketstack: storico dal 2000 per i titoli principali
    else:
        giorni = 10 if periodo == "5d" else 740
        pts = serie(t, (date.today() - timedelta(days=giorni)).isoformat())
    if not pts:
        return None
    suf = _suffisso(_trovati.get(t, t)) or ""
    return {"valuta": VALUTA.get(suf), "fonte": "marketstack"}, pts


def scarica_etf(t):
    return serie(t, "2000-01-01") if candidati(t) else None


def cerca_eur(isin):
    """Ricerca per ISIN non documentata: solo le quotazioni in euro verificate a mano (eodhd.XETRA_VERIFICATI)."""
    from .eodhd import XETRA_VERIFICATI
    return XETRA_VERIFICATI.get((isin or "").upper())


def ultimo_eur(sym):
    pts = serie(sym, (date.today() - timedelta(days=12)).isoformat()) if candidati(sym) else None
    return pts[-1] if pts else None


def dividendi(sym, dal):
    """[{"date", "value"}] come EODHD /div."""
    _, righe = _per_simbolo(sym, "dividends", {"date_from": dal, "sort": "ASC"})
    if righe is None:
        return None
    return [{"date": str(x.get("date") or "")[:10], "value": x.get("dividend")} for x in righe
            if x.get("date") and isinstance(x.get("dividend"), (int, float))]


INTERVALLI = {"1m": "1min", "5m": "5min", "1h": "1hour"}


def intraday(sym, intervallo, da, a=None, timeout=30, tentativi=2):
    """[{"timestamp", "open", "high", "low", "close", "volume"}] come EODHD /intraday. Solo borse USA (IEX)."""
    if intervallo not in INTERVALLI or _suffisso(candidati(sym)[0] if candidati(sym) else ".X") != "":
        return None
    q = {"interval": INTERVALLI[intervallo], "sort": "ASC",
         "date_from": datetime.fromtimestamp(da, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")}
    if a is not None:
        q["date_to"] = datetime.fromtimestamp(a, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")
    _, righe = _per_simbolo(sym, "intraday", q)
    out = []
    for x in righe or []:
        try:
            ts = int(datetime.strptime(str(x["date"])[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc).timestamp())
        except (KeyError, ValueError):
            continue
        c = x.get("close") if x.get("close") is not None else x.get("last")
        out.append({"timestamp": ts, "open": x.get("open"), "high": x.get("high"), "low": x.get("low"),
                    "close": c, "volume": x.get("volume")})
    return out or None
