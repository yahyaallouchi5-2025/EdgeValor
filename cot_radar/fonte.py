# -*- coding: utf-8 -*-
"""
fonte.py - v8.77 INTERRUTTORE DEI FORNITORI DI DATI DI MERCATO (prezzi, dividendi, notizie, intraday).

IDEA (scelta di Ya, 22/11/2026): cambiare fornitore deve costare SOLO una chiave, e nessuna metrica del sito deve
restare senza dati. Tutte le schede chiedono i dati a QUESTO modulo, mai direttamente a un fornitore.

COME SI SCEGLIE (nessuna modifica ai workflow di GitHub): il Secret EODHD_API_KEY contiene una o piu' chiavi,
ognuna con davanti il nome del fornitore, separate da "|". L'ORDINE e' la priorita':
    abc123...                              -> solo EODHD (come prima)
    marketstack:KEY1                       -> solo Marketstack
    marketstack:KEY1|eodhd:KEY2            -> prima Marketstack; quello che Marketstack non ha (crypto, notizie,
                                              prezzi live, candele orarie...) arriva da EODHD: nessuna scheda si spegne
    nessuno                                -> nessun fornitore a pagamento: fonti ufficiali e copie salvate
FORMATO COMUNE: quello gia' usato dal sito (stesso formato di EODHD), cosi' nessuna scheda cambia. Ogni adattatore
  traduce i simboli nel suo formato (EODHD: SPY.US / SXR8.XETRA; Marketstack: SPY / SXR8.DE / ENI.MI).
SE NESSUN FORNITORE HA UN DATO: None -> il sito usa la copia salvata e l'ultimo dato resta visibile.
VERIFICA: verifica() prova ogni categoria usata dal sito (borse, ETF, indici, crypto, dividendi, notizie...) e dice
  quale fornitore ha risposto: va nel registro admin, cosi' prima di disdire un fornitore si vede cosa copre davvero.
DEBUG: python -c "from cot_radar import fonte; print(fonte.nome(), fonte.capacita())"
"""
import os

from .log import log

FORNITORI = ("eodhd", "marketstack", "nessuno")


def elenco():
    """[(fornitore, chiave)] in ordine di priorita'. Mai le chiavi nei log."""
    grezza = os.environ.get("EODHD_API_KEY", "").strip()
    out = []
    for pezzo in [p.strip() for p in grezza.split("|") if p.strip()]:
        if ":" in pezzo and pezzo.split(":", 1)[0].lower() in FORNITORI:
            nome, k = pezzo.split(":", 1)
            out.append((nome.lower(), k.strip()))
        elif pezzo.lower() in FORNITORI:
            out.append((pezzo.lower(), ""))
        else:
            out.append(("eodhd", pezzo))                # chiave senza nome davanti = EODHD (come sempre)
    return [x for x in out if x[0] != "nessuno"]


def chiave_di(fornitore):
    """Chiave del fornitore se e' nel Secret ("" se no)."""
    return next((k for n, k in elenco() if n == fornitore), "")


def scelta():
    """(primo fornitore, sua chiave): compatibilita' con la v8.76."""
    e = elenco()
    return e[0] if e else ("nessuno", "")


def _moduli():
    """Adattatori attivi in ordine di priorita'."""
    out = []
    for nome, _ in elenco():
        if nome == "marketstack":
            from . import fonte_marketstack as A
        elif nome == "eodhd":
            from . import eodhd as A
        else:
            continue
        if A.attivo() and A not in out:
            out.append(A)
    return out


def _nome_mod(a):
    return "marketstack" if a.__name__.endswith("fonte_marketstack") else "eodhd"


def nome():
    return "+".join(_nome_mod(a) for a in _moduli()) or "nessuno"


def attivo():
    return bool(_moduli())


def capacita():
    out = set()
    for a in _moduli():
        out |= set(getattr(a, "CAPACITA", ()))
    return out


def puo(cosa):
    return cosa in capacita()


ULTIMO = {}          # funzione -> fornitore che ha risposto l'ultima volta (per la verifica)


def _chiama(funz, *args, cap=None, **kw):
    """Prova i fornitori in ordine: il primo che ha la funzione (e la capacita') e risponde con un dato vince."""
    for a in _moduli():
        f = getattr(a, funz, None)
        if f is None or (cap and cap not in getattr(a, "CAPACITA", ())):
            continue
        try:
            r = f(*args, **kw)
        except Exception as e:                        # un fornitore che sbaglia non deve fermare il sito
            log.warning("fonte %s.%s: %s", _nome_mod(a), funz, type(e).__name__)
            r = None
        if r:
            ULTIMO[funz] = _nome_mod(a)
            return r
    return None


# ------------------------------------------------------------------ simboli
def simbolo(t):
    """Ticker del sito (stile Yahoo: SPY, SAP.DE, ENI.MI, ^GSPC, BTC-USD) -> simbolo canonico (stile EODHD) se c'e',
    altrimenti il ticker stesso se un altro fornitore lo copre (es. Milano su Marketstack); None se nessuno lo copre."""
    from . import eodhd
    s = eodhd.simbolo(t)
    for a in _moduli():
        if getattr(a, "copre_ticker", lambda x, y: y is not None)(t, s):
            return s or t
    return None


# ------------------------------------------------------------------ dati (stesso risultato per ogni fornitore)
def serie(sym, dal, periodo="d"):
    return _chiama("serie", sym, dal, periodo, cap="serie")


def scarica_azione(t, intervallo="1d", periodo="2y"):
    return _chiama("scarica_azione", t, intervallo, periodo, cap="serie")


def scarica_etf(t):
    return _chiama("scarica_etf", t, cap="serie")


def cerca_eur(isin):
    return _chiama("cerca_eur", isin)


def ultimo_eur(sym):
    return _chiama("ultimo_eur", sym, cap="serie")


def dividendi(sym, dal):
    """[{"date", "value", ...}] come EODHD /div."""
    return _chiama("dividendi", sym, dal, cap="dividendi")


def notizie(sym, limite=20):
    return _chiama("notizie", sym, limite, cap="notizie")


def intraday(sym, intervallo, da, a=None, timeout=30, tentativi=2):
    return _chiama("intraday", sym, intervallo, da, a, timeout, tentativi, cap="intraday")


def tempo_reale(gruppo):
    return _chiama("tempo_reale", gruppo, cap="tempo_reale")


def elenco_borsa(borsa, tolti=False):
    return _chiama("elenco_borsa", borsa, tolti, cap="elenco_borsa")


def frazionamenti(borsa, giorno):
    return _chiama("frazionamenti", borsa, giorno, cap="frazionamenti")


def dettagli_borsa(borsa):
    return _chiama("dettagli_borsa", borsa, cap="dettagli_borsa")


def chiamate():
    out = {}
    for a in _moduli():
        c = getattr(a, "CHIAMATE", {"n": 0, "errori": 0})
        out[_nome_mod(a)] = dict(c)
    return out


# ------------------------------------------------------------------ verifica per il registro admin
# (etichetta, funzione, argomenti): una prova per ogni tipo di dato che le schede usano davvero
CAMPIONI = (("Azioni USA", "scarica_azione", ("AAPL", "1d", "5d")),
            ("ETF USA (portafogli)", "scarica_azione", ("SPY", "1d", "5d")),
            ("ETF in euro (Xetra)", "scarica_azione", ("SXR8.DE", "1d", "5d")),
            ("Borsa di Milano", "scarica_azione", ("ENI.MI", "1d", "5d")),
            ("Parigi", "scarica_azione", ("MC.PA", "1d", "5d")),
            ("Londra", "scarica_azione", ("SHEL.L", "1d", "5d")),
            ("Tokyo", "scarica_azione", ("7203.T", "1d", "5d")),
            ("Hong Kong", "scarica_azione", ("0005.HK", "1d", "5d")),
            ("Toronto", "scarica_azione", ("RY.TO", "1d", "5d")),
            ("Sydney", "scarica_azione", ("BHP.AX", "1d", "5d")),
            ("Indici (S&P 500)", "scarica_azione", ("^GSPC", "1d", "5d")),
            ("Crypto", "serie", ("BTC-USD.CC", None)),
            ("Cambi", "serie", ("EURUSD.FOREX", None)),
            ("Dividendi", "dividendi", ("AAPL.US", None)),
            ("Notizie", "notizie", ("AAPL.US", 5)),
            ("Intraday USA", "intraday", ("AAPL.US", "5m", None)))


def verifica(oggi=None):
    """{"fornitore", "attivo", "capacita", "prove": {etichetta: fornitore che ha risposto oppure False}}."""
    import time
    from datetime import date, timedelta
    oggi = oggi or date.today()
    dal = (oggi - timedelta(days=10)).isoformat()
    out = {"fornitore": nome(), "attivo": attivo(), "capacita": sorted(capacita()), "prove": {}}
    if not out["attivo"]:
        return out
    for etichetta, funz, args in CAMPIONI:
        if funz in ("serie",):
            args = (args[0], dal)
        elif funz == "dividendi":
            args = (args[0], (oggi - timedelta(days=400)).isoformat())
        elif funz == "intraday":
            args = (args[0], args[1], int(time.time()) - 5 * 86400)
        ULTIMO.pop(funz, None)
        ok = globals()[funz](*args)
        out["prove"][etichetta] = ULTIMO.get(funz, False) if ok else False
    return out
