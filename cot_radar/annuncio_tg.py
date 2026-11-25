# -*- coding: utf-8 -*-
"""
annuncio_tg.py - v9.32 ANNUNCI DELLE CAMPAGNE SUL CANALE TELEGRAM (Black Friday, saldi...), con la stessa card
dell'email e del sito (immagine edgevalor.com/email/testa_<k>.jpg, creata da email_campagne_img.py), un testo breve
e un pulsante che apre la finestra dell'abbonamento nel terminale.

QUANDO PARTE: solo a mano (workflow annuncio-telegram.yml, "Run workflow" con la campagna), dopo il si' di Ya sul
testo: regola fissa, nessun messaggio a nome di Ya senza il suo ok. Mai il venerdi' dalle 20 alle 23 (ora di Roma).
CHIAVI: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID dai Secrets di GitHub (gli stessi di notifiche.yml), mai nei log.

USO: python -m cot_radar.annuncio_tg black            (pubblica)
     python -m cot_radar.annuncio_tg black --prova    (stampa soltanto testo e indirizzi)
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

IMMAGINE = "https://edgevalor.com/email/testa_{k}.jpg"
LINK = "https://edgevalor.com/terminale/?premium=1"

# testi brevi in HTML di Telegram (solo <b>): cosa, quanto, fino a quando. Approvati da Ya il 25/11/2026 (black).
ANNUNCI = {
    "black": {
        "testo": ("<b>Black Friday EdgeValor</b>\n"
                  "Premium annuale a <b>19,99 € al mese</b> invece di 29,99 € (−33%), bloccato finché resti abbonato.\n"
                  "L'offerta termina lunedì 30 novembre alle 23:59.\n"
                  "Dal 1° dicembre il listino passa a 39,99 € al mese (29,99 € con l'annuale)."),
        "pulsante": "Blocca la tariffa →",
    },
}


def vietato(adesso=None):
    """True il venerdi' dalle 20:00 alle 23:00 ora di Roma (regola di Ya: in quella fascia non si pubblica)."""
    ora = (adesso or datetime.now(ZoneInfo("Europe/Rome"))).astimezone(ZoneInfo("Europe/Rome"))
    return ora.weekday() == 4 and 20 <= ora.hour < 23


def richiesta(k):
    """Dati della chiamata sendPhoto di Telegram (senza chat e senza chiave)."""
    a = ANNUNCI[k]
    return {"photo": IMMAGINE.format(k=k), "caption": a["testo"], "parse_mode": "HTML",
            "reply_markup": json.dumps({"inline_keyboard": [[{"text": a["pulsante"], "url": LINK}]]})}


def pubblica(k, token, chat):
    """True se Telegram ha accettato il post. Nessuna riprova automatica: un doppione sul canale e' peggio di un ritardo."""
    dati = dict(richiesta(k), chat_id=chat)
    req = urllib.request.Request("https://api.telegram.org/bot%s/sendPhoto" % token,
                                 data=urllib.parse.urlencode(dati).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r).get("ok") is True
    except urllib.error.HTTPError as e:
        try:
            motivo = json.load(e).get("description", "")
        except Exception:
            motivo = ""
        print("Telegram ha rifiutato il post (HTTP %s: %s)" % (e.code, motivo))
    except (urllib.error.URLError, OSError, ValueError) as e:
        print("Telegram non raggiungibile (%s)" % type(e).__name__)
    return False


def main(argv):
    k = argv[1] if len(argv) > 1 else ""
    if k not in ANNUNCI:
        print("campagna sconosciuta: usa una tra %s" % ", ".join(ANNUNCI))
        return 2
    if "--prova" in argv:
        print(json.dumps(richiesta(k), ensure_ascii=False, indent=1))
        return 0
    if vietato():
        print("venerdi' tra le 20 e le 23 (ora di Roma): non si pubblica, riprova dopo")
        return 1
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not (token and chat):
        print("mancano TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID nei Secrets")
        return 1
    ok = pubblica(k, token, chat)
    print("post pubblicato" if ok else "post NON pubblicato")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
