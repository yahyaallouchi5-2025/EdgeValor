# -*- coding: utf-8 -*-
"""
prova_eodhd3.py - v8.71 IL NOSTRO PIANO EODHD INCLUDE LE OPZIONI? (fase 2 dello studio GEX, Ya 22/11/2026)
Lanciato a mano dal workflow prova-eodhd3.yml (Actions -> Prova EODHD 3). La versione precedente (dati per lo studio
su Bitcoin) e' conservata in strumenti/prova_eodhd3_btc.py, quella della v7.25 in strumenti/prova_eodhd3_v725.py.

PERCHE': per verificare supporti e resistenze da gamma (call wall, put wall, gamma zero) servono gli open interest
delle opzioni PER STRIKE, giorno per giorno. Il Cboe blocca gli accessi automatici (Cloudflare): non si aggira.
Qui si controlla se EODHD (abbonamento gia' pagato) li fornisce, e da quando c'e' lo storico.

COSA SCRIVE (ramo pubblico "prova-eodhd3", file opzioni_prova.json): SOLO metadati - codice http, numero di righe,
NOMI dei campi, prima e ultima data trovate. Nessun prezzo, nessun open interest, nessun dato grezzo di terzi.
La chiave arriva solo dall'ambiente (EODHD_API_KEY, dai Secrets): mai stampata, mai salvata (gli URL non si stampano).
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

KEY = os.environ.get("EODHD_API_KEY", "")
if not KEY:
    raise SystemExit("manca il secret EODHD_API_KEY")


def get(path, par):
    """(codice http, json o None). Nessun URL nei log: contiene la chiave."""
    q = dict(par)
    q["api_token"] = KEY
    url = "https://eodhd.com/api/" + path + "?" + urllib.parse.urlencode(q)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "edgevalor/prova-opzioni"})
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            try:
                return r.status, json.loads(raw)
            except ValueError:
                return r.status, None
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return type(e).__name__, None


def campi(js):
    """Solo la forma della risposta: chiavi, quante righe, nomi dei campi della prima riga, date min/max."""
    if js is None:
        return None
    out = {"tipo": type(js).__name__}
    righe = js.get("data") if isinstance(js, dict) else js
    if isinstance(js, dict):
        out["chiavi"] = sorted(js)[:20]
        if isinstance(js.get("meta"), dict):
            # solo numeri e testi brevi senza indirizzi (un link "next" conterrebbe la chiave)
            out["meta"] = {k: v for k, v in js["meta"].items() if isinstance(v, (int, float))
                           or (isinstance(v, str) and len(v) < 40 and "http" not in v and "token" not in v)}
    if isinstance(righe, list):
        out["righe"] = len(righe)
        if righe and isinstance(righe[0], dict):
            r0 = righe[0].get("attributes", righe[0])
            out["campi"] = sorted(r0)[:60]
            date = []
            for r in righe:
                a = r.get("attributes", r) if isinstance(r, dict) else {}
                for k in ("tradetime", "date", "exp_date"):
                    if isinstance(a.get(k), str):
                        date.append(a[k][:10])
                        break
            if date:
                out["date"] = [min(date), max(date)]
    elif isinstance(righe, dict):
        out["sottochiavi"] = sorted(righe)[:20]
    return out


PROVE = [
    # marketplace "US Stock Options" (Unicornbay): simboli coperti, contratti, fine giornata con greche e open interest
    ("simboli", "mp/unicornbay/options/underlying-symbols", {}),
    ("contratti_SPY", "mp/unicornbay/options/contracts", {"filter[underlying_symbol]": "SPY", "page[limit]": "5"}),
    ("eod_SPY_oggi", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "SPY", "page[limit]": "5",
                                                     "sort": "-exp_date"}),
    # storico: un giorno vecchio per capire da quando partono i dati
    ("eod_SPY_2018", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "SPY", "page[limit]": "5",
                                                     "filter[tradetime_from]": "2018-06-01", "filter[tradetime_to]": "2018-06-01"}),
    ("eod_SPY_2022", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "SPY", "page[limit]": "5",
                                                     "filter[tradetime_from]": "2022-06-01", "filter[tradetime_to]": "2022-06-01"}),
    ("eod_SPY_2025", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "SPY", "page[limit]": "5",
                                                     "filter[tradetime_from]": "2025-06-02", "filter[tradetime_to]": "2025-06-02"}),
    ("eod_QQQ_oggi", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "QQQ", "page[limit]": "5"}),
    ("eod_GLD_oggi", "mp/unicornbay/options/eod", {"filter[underlying_symbol]": "GLD", "page[limit]": "5"}),
    # vecchio endpoint delle opzioni
    ("vecchio_SPY", "options/SPY.US", {}),
]


def main():
    out = {"quando": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "prove": {}}
    for nome, path, par in PROVE:
        c, js = get(path, par)
        out["prove"][nome] = {"http": c, "forma": campi(js)}
        print(f"{nome:16s} {c}")
        time.sleep(1)
    json.dump(out, open("opzioni_prova.json", "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
