# -*- coding: utf-8 -*-
"""
perche.py - v8.74 IL "PERCHE'" DI OGNI SEGNALE DEL REGISTRO LIVE: quali annunci sono caduti durante il trade e
quanto si e' mosso il prezzo nella seduta di ciascuno, piu' il giorno peggiore (il drawdown) e se aveva un annuncio.
Niente opinioni: solo date ufficiali e la mossa vera del prezzo in quella seduta, nel verso del segnale.

ANNUNCI (orari ufficiali, convertiti in UTC):
  - USA: occupazione NFP, inflazione CPI, decisione Fed (eventi_usa.csv + notizie.CALENDARIO, come eventi.py);
  - BCE (notizie.CALENDARIO);
  - Bank of England, Bank of Japan, Bank of Canada, RBA, RBNZ, SNB (agenda.BANCHE, calendari ufficiali).
    La BoJ non ha un'ora fissa: si usa mezzogiorno di Tokyo (03:00 UTC), prima di ogni chiusura di quel giorno.
QUALI CONTANO per uno strumento: per una coppia di valute gli annunci delle sue due valute; per tutto il resto
(indici, materie prime, crypto: prezzi in dollari) gli annunci USA.
SEDUTA DI UN ANNUNCIO: la prima chiusura dopo l'annuncio (stessa regola di eventi.py e del registro: conta l'ora;
per i cambi, chiusi alle 12 di New York, la Fed delle 14 entra nella seduta del giorno dopo).
MOSSA DELLA SEDUTA: risultato del trade a quella chiusura meno quello alla chiusura prima, in punti percentuali
del prezzo d'ingresso, nel verso del segnale (positivo = a favore). Si guarda il trade fino all'uscita
"al cambio segnale" (o fino a oggi se e' aperto), al massimo le 20 sedute del percorso salvato.

USO: registro.vista() chiama notizie_segnale(s, m, cal) PRIMA di alleggerire la misura (serve il percorso).
DEBUG: python -c "from cot_radar import perche as P; print(P.annunci()[-5:])"
"""
from bisect import bisect_right
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from .log import log

ROMA = ZoneInfo("Europe/Rome")
CORTI = {"NFP": "NFP USA", "CPI": "CPI USA", "FOMC": "Fed", "boe": "BoE", "boj": "BoJ", "boc": "BoC", "rba": "RBA",
         "rbnz": "RBNZ", "snb": "SNB"}
VALUTA = {"boe": "GBP", "boj": "JPY", "boc": "CAD", "rba": "AUD", "rbnz": "NZD", "snb": "CHF"}
VALUTE = ("EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "BRL", "ZAR", "USD")
_cache = {}


def _aware(t):
    return t.replace(tzinfo=timezone.utc) if t.tzinfo is None else t.astimezone(timezone.utc)


def annunci(tutte=False, rete=False):
    """[(istante UTC, nome breve, valuta)] in ordine di tempo, senza doppioni. Una volta per processo.
    v8.87 tutte=True aggiunge gli altri dati USA ad alto impatto (uscite_usa.py: vendite, PPI, PCE, PIL, JOLTS), usati
    dal registro delle Notizie macro (impatto.py). Il grafico della scheda Live resta con NFP, CPI e banche centrali.
    Con tutte=True e rete=True si rileggono anche le date nuove da ALFRED (rilasci di ieri): lo fa solo il giro
    notturno (stagionalita_orari.calcola), la prima chiamata riempie la cache e le altre la riusano."""
    if tutte in _cache:
        return _cache[tutte]
    from .calendario import et_to_utc
    out = set()
    try:                                              # USA: storico + date future (gia' uniti da eventi.carica)
        from .eventi import carica
        for d, h, nome in carica():
            ore = int(h)
            out.add((_aware(et_to_utc(date.fromisoformat(d), ore, round((h - ore) * 60))), CORTI.get(nome, nome), "USD"))
    except Exception as e:
        log.warning("perche': annunci USA non letti (%s)", e)
    try:                                              # BCE
        from .notizie import CALENDARIO, _utc
        for ev in CALENDARIO:
            if ev[4] == "BCE":
                out.add((_aware(_utc(ev)), "BCE", "EUR"))
    except Exception as e:
        log.warning("perche': date BCE non lette (%s)", e)
    try:                                              # altre banche centrali
        from .agenda import BANCHE, _utc_locale
        for cod, (fuso, ora, minuti, giorni) in BANCHE.items():
            for g in giorni:
                u = _utc_locale(g, ora, minuti, fuso) if ora is not None else g + "T03:00Z"
                out.add((datetime.strptime(u, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc), CORTI[cod], VALUTA[cod]))
    except Exception as e:
        log.warning("perche': banche centrali non lette (%s)", e)
    if tutte:
        try:
            from .uscite_usa import carica as altre
            for d, h, nome in altre(rete=rete):
                ore = int(h)
                out.add((_aware(et_to_utc(date.fromisoformat(d), ore, round((h - ore) * 60))), nome, "USD"))
        except Exception as e:                        # noqa: BLE001 - mai bloccante
            log.warning("perche': altri dati USA non letti (%s)", e)
    _cache[tutte] = sorted(out)
    return _cache[tutte]


def valute(strumento, base=None, quote=None):
    """Valute i cui annunci contano per lo strumento."""
    if base and quote and base in VALUTE and quote in VALUTE:
        return {base, quote}
    k = strumento or ""
    if len(k) == 6 and k[:3] in VALUTE and k[3:] in VALUTE:
        return {k[:3], k[3:]}
    return {"USD"}


def notizie_segnale(s, m, lista=None):
    """{"ev": [{n, d, k, m}], "pg": {k, d, m, ev}} per un segnale misurato (m con il percorso "G"/"Gd"), None se manca.
    ev = annunci dentro il trade (k = numero della seduta, d = giorno dell'annuncio a Roma, m = mossa della seduta);
    pg = giorno peggiore (seduta con la mossa piu' negativa) e gli annunci caduti in quella seduta."""
    if not m or m.get("stato") != "ok" or not m.get("G") or not m.get("Gd"):
        return None
    from .motore import chiusura_utc
    lista = annunci() if lista is None else lista
    tempi = [x[0] for x in lista]
    cls = m.get("cls") or "fx"
    ultima = ((m.get("A") or {}).get("fine") or {}).get("data")
    date_s = [d for d in m["Gd"] if not ultima or d <= ultima]
    if not date_s:
        return None
    vv = valute(s.get("strumento"), s.get("base"), s.get("quote"))
    chiusure = [chiusura_utc(m["ingresso"]["data"], cls)] + [chiusura_utc(d, cls) for d in date_s]
    ev, sedute = [], []
    prima = 0.0
    for k, d in enumerate(date_s):
        mossa = round(m["G"][k][0] - prima, 3)
        prima = m["G"][k][0]
        a, b = bisect_right(tempi, chiusure[k]), bisect_right(tempi, chiusure[k + 1])
        nomi = []
        for t, nome, val in lista[a:b]:
            if val in vv:
                nomi.append(nome)
                e = {"n": nome, "d": t.astimezone(ROMA).date().isoformat(), "k": k + 1, "m": mossa,
                     "t": t.strftime("%Y-%m-%dT%H:%MZ")}           # v8.75 ora esatta: la linea sulle candele orarie
                if nome == "BoJ":
                    e["x"] = 1                                       # ora indicativa (la BoJ non ha un orario fisso)
                ev.append(e)
        sedute.append((mossa, k + 1, d, nomi))
    peggiore = min(sedute, key=lambda x: x[0])
    pg = {"k": peggiore[1], "d": peggiore[2], "m": peggiore[0], "ev": peggiore[3]} if peggiore[0] < 0 else None
    return {"ev": ev, "pg": pg}


# v8.83 MONITORAGGIO SULLE CANDELE ORARIE (richiesta di Ya, 23/11/2026): non solo gli annunci dentro il trade, ma TUTTI
# gli annunci e TUTTE le uscite del report COT dal primo segnale del registro a oggi, per vedere come si muove il prezzo
# dopo ogni notizia e dopo ogni COT anche quando il segnale e' chiuso. La pagina (13c_candele.js) sceglie gli annunci
# pertinenti allo strumento con la stessa regola di valute(): coppia -> le sue due valute, tutto il resto -> USD.
def monitoraggio(dal, al):
    """{"ann": [[istante "AAAA-MM-GGTHH:MMZ", nome, valuta, (1 se ora indicativa)]], "cot": [istanti di uscita del COT]}
    tra le date `dal` e `al` (oggetti date, estremi compresi). Uscita del COT = 15:30 di New York del giorno reale
    (venerdi', o il lunedi' dopo nelle settimane con una festivita' federale: calendario.uscita_cot)."""
    from datetime import timedelta
    from .calendario import et_to_utc, uscita_cot
    ann = []
    for t, nome, val in annunci():
        g = t.date()
        if dal <= g <= al:
            r = [t.strftime("%Y-%m-%dT%H:%MZ"), nome, val]
            if nome == "BoJ":
                r.append(1)
            ann.append(r)
    cot = []
    ven = dal + timedelta(days=(4 - dal.weekday()) % 7)              # primo venerdi' da `dal`
    while ven <= al + timedelta(days=4):
        u = uscita_cot(ven)
        if dal <= u <= al:
            cot.append(_aware(et_to_utc(u, 15, 30)).strftime("%Y-%m-%dT%H:%MZ"))
        ven += timedelta(days=7)
    return {"ann": ann, "cot": cot}

