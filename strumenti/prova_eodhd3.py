# -*- coding: utf-8 -*-
"""
prova_eodhd3.py - v7.94 DATI PER LO STUDIO "DA COSA DIPENDE BITCOIN" (lanciato a mano dal workflow prova-eodhd3.yml).
La prova originale della v7.25 (festivita', intraday, insider...) e' conservata in strumenti/prova_eodhd3_v725.py.

COSA FA: scarica da EODHD lo storico giornaliero PIU' LUNGO disponibile di Bitcoin e dei possibili fattori che FRED non
copre (o copre da poco): oro, S&P 500, Nasdaq-100, Russell 2000, obbligazioni USA 20+ anni, high yield, Ethereum, indice
del dollaro. Per ogni simbolo prova piu' codici (il primo che risponde con dati vince).
SCRIVE: btc_fattori.json = {simbolo: {"codice", "dal", "al", "n", "c": [[data, chiusura rettificata], ...]}} + "esito".
Il workflow lo salva nel ramo "prova-eodhd3"; lo studio vero si fa poi su questi dati (studi/studio_btc_fattori.py).
La chiave arriva solo dall'ambiente (EODHD_API_KEY, dai Secrets): mai stampata, mai salvata.
"""
import json
import os
import time
import urllib.error
import urllib.request

KEY = os.environ.get("EODHD_API_KEY", "")
if not KEY:
    raise SystemExit("manca il secret EODHD_API_KEY")

# simbolo -> codici EODHD da provare in ordine (crypto .CC, indici .INDX, ETF .US, valute .FOREX)
SIMBOLI = {
    "BTC": ["BTC-USD.CC"], "ETH": ["ETH-USD.CC"],
    "ORO": ["XAUUSD.FOREX", "GLD.US"], "SP500": ["GSPC.INDX", "SPY.US"], "NDX": ["NDX.INDX", "QQQ.US"],
    "RUSSELL": ["RUT.INDX", "IWM.US"], "TREASURY20": ["TLT.US"], "HIGHYIELD": ["HYG.US"],
    "DOLLARO": ["DXY.INDX", "DX-Y.NYB.INDX", "UUP.US"], "ARGENTO": ["XAGUSD.FOREX", "SLV.US"],
}


def serie(codice):
    """[[data, chiusura]] dal primo giorno disponibile (adjusted_close se c'e'). Nessun URL nei log: contiene la chiave."""
    url = f"https://eodhd.com/api/eod/{codice}?api_token={KEY}&fmt=json&from=1990-01-01&period=d"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "edgevalor/studio-btc"})
        with urllib.request.urlopen(req, timeout=120) as r:
            js = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}"
    except Exception as e:
        return None, type(e).__name__
    if not isinstance(js, list) or not js:
        return None, "vuoto"
    c = [[x["date"], x.get("adjusted_close") or x.get("close")] for x in js if x.get("date") and (x.get("adjusted_close") or x.get("close"))]
    return c, "ok"


out = {"quando": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "esito": {}}
for nome, codici in SIMBOLI.items():
    for cod in codici:
        c, esito = serie(cod)
        out["esito"][f"{nome} {cod}"] = esito if c is None else f"ok {len(c)} giorni dal {c[0][0]}"
        print(nome, cod, out["esito"][f"{nome} {cod}"], flush=True)
        if c:
            out[nome] = {"codice": cod, "dal": c[0][0], "al": c[-1][0], "n": len(c), "c": c}
            break
        time.sleep(0.5)
with open("btc_fattori.json", "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))
print("scritto btc_fattori.json")
