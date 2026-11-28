# -*- coding: utf-8 -*-
"""
indexnow.py - v9.69 FARSI TROVARE ANCHE FUORI DA GOOGLE (Ya, 28/11/2026: un assistente AI non trovava EdgeValor).

COS'E'
  IndexNow e' il protocollo con cui un sito AVVISA i motori di ricerca che una pagina e' nuova o cambiata.
  Lo leggono Bing (da cui pescano anche Copilot, DuckDuckGo, Yahoo e diversi assistenti AI), Yandex, Seznam, Naver.
  Google non lo usa: per Google restano sitemap.xml e robots.txt (vetrina.py).

COME FUNZIONA
  1) nel sito c'e' un file <CHIAVE>.txt che contiene la chiave: dimostra che la segnalazione viene da noi
     (la chiave e' PUBBLICA per progetto, non e' un segreto);
  2) si manda UNA richiesta a api.indexnow.org con l'elenco delle pagine pubbliche (le stesse della sitemap).
REGOLE
  - al massimo UNA segnalazione al giorno (le pagine pubbliche cambiano poco; troppe segnalazioni = ignorati);
    la data dell'ultima sta in storico/indexnow.json;
  - solo dal sito vero (GitHub Actions), mai dal PC, mai in demo e mai durante i test;
  - mai bloccante: se il servizio non risponde si riprova il giorno dopo, il sito esce lo stesso.
DEBUG
  python -c "from cot_radar import indexnow; print(indexnow.corpo(['https://edgevalor.com/']))"
  Risposte del servizio: 200/202 = ricevuto; 403 = file della chiave non trovato nel sito; 422 = indirizzi di un altro dominio.
"""
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

from .log import log

CHIAVE = "6cdbcd99c174d740e071959f7232255d"      # pubblica: e' anche il nome del file nel sito
SERVIZIO = "https://api.indexnow.org/indexnow"
FILE = "indexnow.json"


def scrivi_chiave(cartella_sito):
    """Scrive <cartella_sito>/<CHIAVE>.txt (il file che i motori controllano)."""
    with open(os.path.join(cartella_sito, CHIAVE + ".txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(CHIAVE)


def corpo(urls, sito="https://edgevalor.com/"):
    """Corpo della richiesta (JSON) per l'elenco di pagine dato."""
    host = sito.split("//", 1)[-1].strip("/")
    return {"host": host, "key": CHIAVE, "keyLocation": sito.rstrip("/") + "/" + CHIAVE + ".txt",
            "urlList": [u for u in urls if u.split("//", 1)[-1].startswith(host)]}


def da_fare(cartella_storico, oggi):
    """True se oggi non si e' ancora segnalato (o se non c'e' memoria)."""
    try:
        with open(os.path.join(cartella_storico, FILE), encoding="utf-8") as fh:
            return json.load(fh).get("giorno") != oggi
    except (OSError, ValueError):
        return True


def segnala(urls, cartella_storico, sito="https://edgevalor.com/", invia=None, oggi=None, ambiente=None):
    """Segnala le pagine ai motori. Restituisce "inviato", "gia' fatto", "saltato" (non siamo sul sito vero) o "errore".
    invia(corpo) -> codice HTTP: parametro solo per i test."""
    ambiente = os.environ if ambiente is None else ambiente
    if not ambiente.get("GITHUB_ACTIONS") or ambiente.get("PYTEST_CURRENT_TEST") or not cartella_storico or not os.path.isdir(cartella_storico):
        return "saltato"
    oggi = oggi or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not da_fare(cartella_storico, oggi):
        return "gia' fatto"
    c = corpo(urls, sito)
    if not c["urlList"]:
        return "saltato"
    try:
        codice = (invia or _invia)(c)
    except (urllib.error.URLError, OSError) as e:                 # rete, timeout, risposta 4xx/5xx
        log.warning("IndexNow: segnalazione non riuscita (%s): riprovo domani", getattr(e, "code", type(e).__name__))
        return "errore"
    if codice not in (200, 202):
        log.warning("IndexNow: risposta %s: riprovo domani", codice)
        return "errore"
    with open(os.path.join(cartella_storico, FILE), "w", encoding="utf-8") as fh:
        json.dump({"giorno": oggi, "pagine": len(c["urlList"]), "codice": codice}, fh)
    log.info("IndexNow: %d pagine segnalate ai motori di ricerca", len(c["urlList"]))
    return "inviato"


def _invia(c):
    req = urllib.request.Request(SERVIZIO, data=json.dumps(c).encode(), method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status
