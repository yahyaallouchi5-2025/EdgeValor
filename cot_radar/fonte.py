# -*- coding: utf-8 -*-
"""
fonte.py - v8.76 INTERRUTTORE DEL FORNITORE DI DATI DI MERCATO (prezzi, dividendi, notizie, intraday).

IDEA (scelta di Ya, 22/11/2026): cambiare fornitore deve costare SOLO una chiave, senza riscrivere il sito.
Tutte le parti del sito chiedono i dati a QUESTO modulo, mai direttamente a un fornitore; il modulo gira la
richiesta al fornitore scelto ("adattatore") e restituisce sempre lo STESSO formato.

COME SI SCEGLIE IL FORNITORE (nessuna modifica ai workflow di GitHub):
  il Secret EODHD_API_KEY contiene la chiave, con davanti il nome del fornitore se non e' EODHD:
      abc123...               -> EODHD (come oggi)
      marketstack:abc123...   -> Marketstack
      nessuno                 -> nessun fornitore a pagamento: restano le fonti ufficiali e le copie salvate
  (se un giorno esistera' la variabile DATI_FONTE, vale quella; il nome del fornitore nella chiave resta la via semplice).

FORMATO COMUNE: quello gia' usato dal sito (stesso formato di EODHD), cosi' nessuna scheda cambia.
  - simbolo canonico "CODICE.BORSA" (es. SPY.US, SXR8.XETRA, GSPC.INDX): ogni adattatore lo traduce nel suo;
  - funzioni con lo stesso risultato per tutti: serie, scarica_azione, scarica_etf, cerca_eur, ultimo_eur,
    dividendi, notizie, intraday, tempo_reale, elenco_borsa, frazionamenti, dettagli_borsa.
COSA SUCCEDE SE IL NUOVO FORNITORE NON HA UN DATO: la funzione restituisce None (puo() dice cosa c'e'): il sito usa
  la copia salvata e l'ultimo dato resta visibile con "in manutenzione". Nessun utente Premium o in prova si blocca.
VERIFICA: verifica() prova poche chiamate campione e il risultato va nel registro admin (cosa funziona e cosa no),
  cosi' prima di fidarsi di un fornitore nuovo si vede subito la sua copertura reale.
DEBUG: python -c "from cot_radar import fonte; print(fonte.nome(), fonte.capacita())"
"""
import os

from .log import log

FORNITORI = ("eodhd", "marketstack", "nessuno")


def scelta():
    """(nome del fornitore, chiave) letti dall'ambiente. Mai la chiave nei log."""
    grezza = os.environ.get("EODHD_API_KEY", "").strip()
    nome = os.environ.get("DATI_FONTE", "").strip().lower()
    if ":" in grezza and grezza.split(":", 1)[0].lower() in FORNITORI:
        pref, grezza = grezza.split(":", 1)
        nome = nome or pref.lower()
    elif grezza.lower() in FORNITORI:                 # "nessuno" scritto da solo
        nome, grezza = nome or grezza.lower(), ""
    return (nome or "eodhd"), grezza.strip()


def _adattatore():
    nome = scelta()[0]
    if nome == "marketstack":
        from . import fonte_marketstack as A
        return A
    if nome == "eodhd":
        from . import eodhd as A
        return A
    return None


def nome():
    return scelta()[0]


def attivo():
    """True se il fornitore scelto ha una chiave (si scaricano dati nuovi). False = copie salvate e fonti ufficiali."""
    a = _adattatore()
    return bool(a and a.attivo())


# capacita' dichiarate da ogni adattatore (CAPACITA); puo("notizie") evita chiamate inutili
def capacita():
    a = _adattatore()
    return set(getattr(a, "CAPACITA", ())) if a and a.attivo() else set()


def puo(cosa):
    return cosa in capacita()


def _chiama(funz, *args, **kw):
    """Chiama la funzione dell'adattatore se c'e' (None se il fornitore non la offre o fallisce)."""
    a = _adattatore()
    f = getattr(a, funz, None) if a and a.attivo() else None
    if f is None:
        return None
    try:
        return f(*args, **kw)
    except Exception as e:                            # un fornitore che sbaglia non deve fermare il sito
        log.warning("fonte %s.%s: %s", nome(), funz, type(e).__name__)
        return None


# ------------------------------------------------------------------ simboli (traduzione dal ticker Yahoo del sito)
def simbolo(t):
    """Ticker del sito (stile Yahoo: SPY, SAP.DE, ^GSPC, BTC-USD) -> simbolo canonico, None se non coperto.
    La traduzione e' la stessa per tutti i fornitori (stile EODHD); ogni adattatore pensa poi al suo formato."""
    from . import eodhd
    s = eodhd.simbolo(t)
    a = _adattatore()
    ok = getattr(a, "copre", None)
    return s if s and (ok is None or ok(s)) else None


# ------------------------------------------------------------------ dati (stesso risultato per ogni fornitore)
def serie(sym, dal, periodo="d"):
    return _chiama("serie", sym, dal, periodo)


def scarica_azione(t, intervallo="1d", periodo="2y"):
    return _chiama("scarica_azione", t, intervallo, periodo) if simbolo(t) else None


def scarica_etf(t):
    return _chiama("scarica_etf", t) if simbolo(t) else None


def cerca_eur(isin):
    return _chiama("cerca_eur", isin)


def ultimo_eur(sym):
    return _chiama("ultimo_eur", sym)


def dividendi(sym, dal):
    """[{"date", "value", ...}] come EODHD /div."""
    return _chiama("dividendi", sym, dal) if puo("dividendi") else None


def notizie(sym, limite=20):
    """[{"date", "title", "link", "sentiment", ...}] come EODHD /news."""
    return _chiama("notizie", sym, limite) if puo("notizie") else None


def intraday(sym, intervallo, da, a=None, timeout=30, tentativi=2):
    """[{"timestamp", "open", "high", "low", "close", ...}] come EODHD /intraday (intervallo "1m", "5m", "1h")."""
    return _chiama("intraday", sym, intervallo, da, a, timeout, tentativi) if puo("intraday") else None


def tempo_reale(gruppo):
    """[{"code", "close", "previousClose", "timestamp"}] come EODHD /real-time, per un gruppo di simboli canonici."""
    return _chiama("tempo_reale", gruppo) if puo("tempo_reale") else None


def elenco_borsa(borsa, tolti=False):
    """[{"Code", "Name", "Isin", ...}] come EODHD /exchange-symbol-list (tolti=True: titoli tolti dal listino)."""
    return _chiama("elenco_borsa", borsa, tolti) if puo("elenco_borsa") else None


def frazionamenti(borsa, giorno):
    """[{"code", "split", ...}] come EODHD /eod-bulk-last-day?type=splits."""
    return _chiama("frazionamenti", borsa, giorno) if puo("frazionamenti") else None


def dettagli_borsa(borsa):
    """Orari e festivita' della borsa come EODHD /exchange-details."""
    return _chiama("dettagli_borsa", borsa) if puo("dettagli_borsa") else None


def chiamate():
    a = _adattatore()
    return dict(getattr(a, "CHIAMATE", {"n": 0, "errori": 0}))


# ------------------------------------------------------------------ verifica per il registro admin
CAMPIONI = (("prezzi USA", "serie", ("SPY.US",)), ("ETF in euro (Xetra)", "serie", ("SXR8.XETRA",)),
            ("indici", "serie", ("GSPC.INDX",)), ("crypto", "serie", ("BTC-USD.CC",)), ("cambi", "serie", ("EURUSD.FOREX",)))


def verifica(oggi=None):
    """{"fornitore", "attivo", "capacita", "prove": {nome: True/False}}: poche chiamate campione (ultimi 10 giorni)."""
    from datetime import date, timedelta
    dal = ((oggi or date.today()) - timedelta(days=10)).isoformat()
    out = {"fornitore": nome(), "attivo": attivo(), "capacita": sorted(capacita()), "prove": {}}
    if not out["attivo"]:
        return out
    a = _adattatore()
    for etichetta, funz, args in CAMPIONI:
        ok = getattr(a, "copre", lambda s: True)(args[0])
        out["prove"][etichetta] = bool(ok and _chiama(funz, *args, dal))
    return out
