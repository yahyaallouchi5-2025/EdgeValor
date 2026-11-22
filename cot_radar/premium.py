# -*- coding: utf-8 -*-
"""
premium.py - v7.93 DATI PREMIUM CIFRATI (Basic vede la base, Premium vede il valore).

PERCHE'
  Il terminale e' una pagina statica: tutto quello che ci scriviamo lo puo' leggere chiunque apra il codice sorgente.
  Nascondere i dati Premium solo con la grafica (sfocatura) non basta. Per questo, sul sito, i dati Premium escono
  CIFRATI (AES-GCM 256 bit) e la chiave la consegna il database solo a chi ha diritto.

COME FUNZIONA
  1) ogni costruzione del sito chiede al database una chiave nuova: rpc "nuova_pubblicazione" -> {id, k}
     (la crea Postgres con gen_random_bytes; chiunque puo' chiederne una, ma ottiene una chiave sua, inutile);
  2) qui si TOLGONO dalla pagina i dati Premium (elenco PERCORSI) e si cifrano in un blocco {id, iv, c}
     (JSON -> compresso zlib -> AES-GCM -> base64); lo stesso per i file Premium delle azioni (azioni.py);
  3) nel browser (web/index.html, "caricatore") chi ha la prova attiva, Premium o un'email riservata chiede la
     chiave con rpc "chiave_premium(id)", decifra e rimette i dati al loro posto PRIMA che il terminale parta.
     Gli altri ricevono null: vedono la parte Basic e il lucchetto al posto del resto.

SICUREZZA
  - nessuna chiave segreta nel codice o nei Secrets: la chiave vive solo nel database (schema "privato");
  - se il database non risponde, i dati Premium NON vengono pubblicati (si chiude, non si apre): resta la parte Basic;
  - chiamato SOLO nella costruzione del sito (pagina.build con sito=True e azioni.copia_nel_sito): test e PC no.
DEBUG: python -c "from cot_radar import premium as p; print(p.separa({'paesi':{'paesi':list(range(8))}})[1])"
"""
import base64
import copy
import json
import os
import sys
import urllib.request
import zlib

from .config import SUPABASE_PUBBLICA, SUPABASE_URL
from .log import log

CRYPTO_BASIC = 5          # Crypto: le prime 5 monete restano in Basic, la tabella completa e' Premium
PAESI_BASIC = 5           # Paesi emergenti: le 5 economie che crescono di piu' (PIL) restano in Basic, la tabella completa e' Premium
# campi Premium di ogni portafoglio modello (l'andamento, le statistiche e i rischi restano in Basic)
PORT_PREMIUM = ("composizione", "base", "ammessi", "esclusi", "rischio_quote", "rotazioni", "compatto", "cfr_sp")   # v8.55 + riepilogo S&P 500
# campi Premium della stagionalita' di ogni strumento: "Adesso" (finestra, settimana) e dettaglio (mesi, giorni).
# La mappa (mappa, da, al) resta in Basic.
STAG_PREMIUM = ("finestra", "sett", "mesi", "giorni")

# v8.07 blocchi di dati interamente Premium -> valore vuoto lasciato al Basic (stessa forma, nessun dato)
CHIUSE = {"assets": {}, "pairs": [], "order": [], "corr": {"keys": [], "m": []}, "corr_px": None, "stag": {}, "vol": {}, "tat": {},
          "crypto": None, "btcsent": None, "carry": None, "categorie": None, "tv": {}, "tvp": {}, "fed": None,
          "neutri7": []}                                     # v8.66 tornati neutri: parte del Posizionamento (Premium)

_PUB = None               # (id, chiave) della costruzione in corso: una sola chiave per pagina e file delle azioni


def _b64(b):
    return base64.b64encode(b).decode()


def pubblicazione(chiedi=None):
    """(id, chiave di 32 byte) per questa costruzione del sito, chiesta UNA volta al database. None se non si puo'.
    chiedi = funzione di prova (test) al posto della chiamata vera."""
    global _PUB
    if _PUB is None and not chiedi and "unittest" in sys.modules:
        return None                        # nei test non si chiama mai il database vero
    if _PUB is None:
        try:
            if chiedi:
                j = chiedi()
            else:
                req = urllib.request.Request(SUPABASE_URL + "/rest/v1/rpc/nuova_pubblicazione", data=b"{}", method="POST",
                                             headers={"apikey": SUPABASE_PUBBLICA, "Content-Type": "application/json",
                                                      "User-Agent": "edgevalor/premium"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    j = json.loads(r.read().decode())
            k = base64.b64decode(j["k"])
            if len(k) != 32 or not j.get("id"):
                raise ValueError("risposta non valida")
            _PUB = (str(j["id"]), k)
        except Exception as e:
            log.warning("premium: chiave non ottenuta (%s): i dati Premium non vengono pubblicati in questo giro",
                        type(e).__name__)
            _PUB = False
    return _PUB or None


def azzera():
    """Dimentica la chiave (test, o una nuova costruzione nello stesso processo)."""
    global _PUB
    _PUB = None


def cifra(obj, pub=None):
    """oggetto -> {"id", "iv", "c"} (JSON compresso e cifrato) oppure None se manca la chiave o la libreria."""
    pub = pub or pubblicazione()
    if not pub:
        return None
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        log.warning("premium: libreria cryptography assente, dati Premium non pubblicati")
        return None
    dati = zlib.compress(json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)
    iv = os.urandom(12)
    return {"id": pub[0], "iv": _b64(iv), "c": _b64(AESGCM(pub[1]).encrypt(iv, dati, None))}


def separa(data):
    """Toglie da una COPIA dei dati della pagina le parti Premium.
    -> (dati Basic, toppe) dove toppe = [[percorso, valore], ...]: il browser le rimette con D[p0][p1]... = valore."""
    d = copy.deepcopy(data)
    toppe = []

    def togli(o, percorso, chiave):
        if isinstance(o, dict) and chiave in o and o[chiave] is not None:
            toppe.append([percorso + [chiave], o.pop(chiave)])

    port = d.get("port") or {}
    for i, p in enumerate(port.get("profili") or []):
        for c in PORT_PREMIUM:
            togli(p, ["port", "profili", i], c)
        for j, m in enumerate(p.get("mesi_chiusi") or []):
            togli(m, ["port", "profili", i, "mesi_chiusi", j], "asset")
            togli(m, ["port", "profili", i, "mesi_chiusi", j], "serie")      # v8.55 confronto con l'S&P 500 (Rotazioni)
            togli(m, ["port", "profili", i, "mesi_chiusi", j], "sp")
        togli(p.get("mese"), ["port", "profili", i, "mese"], "mercati")      # stagionalita' del mese PER MERCATO
        togli(p.get("corrente"), ["port", "profili", i, "corrente"], "serie")   # v8.55 mese in corso contro l'S&P 500
        togli(p.get("corrente"), ["port", "profili", i, "corrente"], "sp")
    togli(port, ["port"], "strumenti")                                        # ISIN degli strumenti (Il mio conto)
    togli(d, [], "btcmacro")                                                  # v7.94 bussola macro di Bitcoin
    for k, s in (d.get("stag") or {}).items():
        for c in STAG_PREMIUM:
            togli(s, ["stag", k], c)
    pa = d.get("paesi") or {}
    if isinstance(pa.get("paesi"), list) and len(pa["paesi"]) > PAESI_BASIC:
        toppe.append([["paesi", "paesi"], pa["paesi"]])
        # v8.69 il Basic vede le 5 economie emergenti che crescono di piu' (come prima), anche ora che ci sono 3 gruppi
        em = [r for r in pa["paesi"] if r.get("gr", "Emergenti") == "Emergenti"] or pa["paesi"]
        pa["paesi"] = sorted(em, key=lambda r: -(r.get("pil") if isinstance(r.get("pil"), (int, float)) else -1e9))[:PAESI_BASIC]
        pa["n_tot"] = len(em)                          # quanti emergenti ha la tabella completa (per il lucchetto)
    # v8.01 Crypto: Basic vede le prime CRYPTO_BASIC monete (per capitalizzazione), la tabella completa e' Premium
    cr = d.get("crypto") or {}
    if isinstance(cr.get("monete"), list) and len(cr["monete"]) > CRYPTO_BASIC:
        toppe.append([["crypto", "monete"], cr["monete"]])
        cr["monete"] = cr["monete"][:CRYPTO_BASIC]
        cr["n_tot"] = len(toppe[-1][1])
    # v8.07 SCHEDE CHIUSE AL BASIC (Ya, 18/11/2026): COT, Forex, Crypto, Volatilita', Stagionalita' e Correlazioni sono
    # Premium per intero. I loro dati escono dalla pagina e al loro posto resta un contenitore VUOTO della stessa forma
    # (cosi' il terminale non si rompe e mostra il lucchetto: vedi 45_chiuse.js). Le toppe gia' create qui sopra per
    # stag e crypto vengono sostituite da quella dell'intero blocco.
    originale = data
    # v8.09 POSIZIONAMENTO COT APERTO AL BASIC (Ya, 18/11/2026): la card della Dashboard mostra solo i CONTEGGI
    # (quanti posizionamenti al rialzo, al ribasso e quanti forti), calcolati qui prima di togliere pairs/assets.
    # Stessa regola di 04_dashboard.js: coppie Forex + strumenti non valutari (senza USD).
    etichette = [p.get("label") or "" for p in (originale.get("pairs") or []) if isinstance(p, dict)]
    etichette += [a.get("label") or "" for a in (originale.get("assets") or {}).values()
                  if isinstance(a, dict) and a.get("key") != "USD" and a.get("group") != "Valute"]
    if etichette:
        d["cotsum"] = {"su": sum("BUY" in l for l in etichette), "giu": sum("SELL" in l for l in etichette),
                       "forti": sum(l.startswith("STRONG") for l in etichette)}
    toppe = [t for t in toppe if t[0][0] not in CHIUSE]
    for k, vuoto in CHIUSE.items():
        if originale.get(k) is not None:
            toppe.append([[k], copy.deepcopy(originale[k])])
            d[k] = copy.deepcopy(vuoto)
    # v8.08 MACRO chiusa al Basic (Ya, 18/11/2026): driver, tabella "gia' scontato" e liquidita' Fed sono Premium.
    # Al Basic resta solo il punteggio del clima (lancetta "Clima del mercato" della Dashboard).
    m = originale.get("market")
    if isinstance(m, dict):
        toppe.append([["market"], copy.deepcopy(m)])
        d["market"] = {"risk": m.get("risk")}
    return d, toppe


def pagina(data):
    """Dati della pagina del sito -> (dati da pubblicare, blocco Premium cifrato o None).
    Senza chiave si pubblica SOLO la parte Basic (mai i dati Premium in chiaro)."""
    basic, toppe = separa(data)
    blocco = cifra(toppe) if toppe else None
    if toppe and not blocco:
        log.warning("premium: %d blocchi Premium tolti dalla pagina e non pubblicati (manca la chiave)", len(toppe))
    return basic, blocco


def file_premium(obj, basic=None):
    """Contenuto di un file JSON del sito con parte Premium:
    basic=None -> tutto Premium: {"__p": cifrato}; altrimenti la versione Basic con dentro "__p" (il file completo).
    Senza chiave: solo la versione Basic (o {} se tutto il file e' Premium)."""
    blocco = cifra(obj)
    out = dict(basic) if basic is not None else {}
    if blocco:
        out["__p"] = blocco
    return out


# --------------------------------------------------------------------------- file delle azioni nel sito
# cartelle con un file per titolo: tutto Premium (scheda completa: grafico, bilanci, dividendi, notizie, profilo con ISIN)
AZ_CARTELLE = ("titoli", "bilanci", "bilanci_storia", "dividendi", "notizie", "intraday", "profili")
# file non usati dalla pagina che contengono nomi Premium: non si pubblicano
AZ_VIA = ("satellite.json", "bilanci.json")
# campi di ogni titolo che restano in Basic (ricerca per nome, prezzo, carte dei settori); il resto e' Premium
AZ_BASIC = ("t", "n", "s", "l", "val", "p", "data", "v1g", "v1m", "vytd", "t200", "dq", "ev", "spl")
# parti di top.json che restano in Basic (quadro economico, stato dei dati); "titoli" e "sconto" sono Premium
TOP_BASIC_N = 2          # v8.65 (Ya, 22/11/2026): aziende della "Selezione di oggi" visibili al Basic
TOP_BASIC = ("aggiornato", "mese", "anomalia", "settori", "listini", "economie", "ampiezza")


def _leggi(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _scrivi(p, obj):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def proteggi_azioni(dest):
    """Rende Premium i dati delle azioni copiati nel sito (<sito>/azioni): file per titolo cifrati, indice e top.json
    con la sola parte Basic in chiaro. Senza chiave: si pubblica solo la parte Basic. -> numero di file cifrati."""
    if not os.path.isdir(dest):
        return 0
    n = 0
    for nome in AZ_VIA:
        try:
            os.remove(os.path.join(dest, nome))
        except OSError:
            pass
    for c in AZ_CARTELLE:
        cart = os.path.join(dest, c)
        if not os.path.isdir(cart):
            continue
        for f in os.listdir(cart):
            if not f.endswith(".json"):
                continue
            p = os.path.join(cart, f)
            try:
                _scrivi(p, file_premium(_leggi(p)))
                n += 1
            except Exception as e:
                log.warning("premium: %s/%s non protetto (%s), tolto dal sito", c, f, type(e).__name__)
                os.remove(p)
    p = os.path.join(dest, "indice.json")
    if os.path.isfile(p):
        d = _leggi(p)
        basic = {k: v for k, v in d.items() if k not in ("titoli", "top")}
        basic["titoli"] = [{k: t[k] for k in AZ_BASIC if k in t} for t in d.get("titoli") or []]
        _scrivi(p, file_premium(d, basic))
        n += 1
    p = os.path.join(dest, "top.json")
    if os.path.isfile(p):
        d = _leggi(p)
        basic = {k: d[k] for k in TOP_BASIC if k in d}
        basic["titoli"] = (d.get("titoli") or [])[:TOP_BASIC_N]   # v8.65 il Basic vede le prime 2 della Selezione di oggi
        _scrivi(p, file_premium(d, basic))
        n += 1
    log.info("premium: %d file delle azioni protetti%s", n, "" if pubblicazione() else " (SENZA chiave: solo Basic)")
    return n
