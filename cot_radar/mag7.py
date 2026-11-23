# -*- coding: utf-8 -*-
"""
mag7.py - v9.01 LE MAGNIFICHE 7 (Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta, Tesla) NELLA SCHEDA AZIONARIO

IDEA (Ya, 23/11/2026)
  Sette aziende pesano circa un terzo dell'S&P 500 e piu' della meta' del Nasdaq-100: quando si muovono loro,
  si muove "l'indice". Il riquadro mostra tre cose, dalla piu' semplice alla piu' tecnica:
    1. CHI MUOVE L'INDICE: quanto pesano le 7 sul totale (S&P 500 e Nasdaq-100) e com'e' cambiato il peso in un anno;
    2. CHI HA SPINTO: quanta parte del movimento dell'indice (1 settimana, 1 mese, 3 mesi) viene dalle 7 e quanta
       dalle altre aziende, piu' lo stesso indice "a pesi uguali" (ogni azienda conta uguale): se l'indice sale e
       quello a pesi uguali no, la salita e' tenuta in piedi da pochi titoli;
    3. LE 7 UNA PER UNA: peso, trend, rendimento a 1 mese e 12 mesi; sul retro margine, ROE, P/E e flusso di cassa.

COME SI CALCOLA IL PESO (capitalizzazione = numero di azioni x prezzo)
  Numero di azioni dalla SEC (gratis, ufficiale), una volta a settimana per titolo, in quest'ordine:
    a) azioni in circolazione dalla copertina dell'ultimo bilancio (dei:EntityCommonStockSharesOutstanding);
    b) media delle azioni diluite dell'ultimo trimestre (us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding):
       si usa quando (a) manca o e' vecchia. Se (a) e (b) differiscono piu' del 30% vale il numero piu' grande
       (societa' con piu' classi: la copertina ne riporta una sola; oppure un dato scritto in milioni);
    c) utile / utile per azione dell'ultimo trimestre (bilanci gia' scaricati da fondamentali.py);
    d) per chi resta senza dato (societa' con piu' classi come Visa e Berkshire, emittenti esteri come ASML):
       azioni in circolazione dai fondamentali EODHD, se il piano li comprende (altrimenti il titolo resta fuori).
  Un dato piu' vecchio di 400 giorni non si usa. Le societa' con due quotazioni (GOOGL/GOOG, FOXA/FOX, NWSA/NWS)
  contano UNA volta sola. Berkshire (BRK-B): la SEC riporta azioni "equivalenti di classe A" -> x1500.
  Un valore in borsa sotto 2 miliardi e' impossibile per questi indici: il titolo si scarta (dato sbagliato).
  E' un'approssimazione: S&P e Nasdaq usano il flottante (azioni davvero scambiate), qui le azioni totali.
  Lo scarto sul peso delle 7 e' di 1-2 punti: per questo in pagina il peso e' "circa".

CONTRIBUTO AL MOVIMENTO
  Con i pesi all'inizio del periodo: contributo di un titolo = peso iniziale x rendimento del periodo.
  Somma dei contributi = rendimento dell'indice ricostruito; si divide fra le 7 e le altre.
  Pesi uguali = media semplice dei rendimenti di tutti i titoli dell'indice.

USCITA: <cartella>/pubblico/mag7.json (copiato nel sito come azioni/mag7.json, cifrato Premium da premium.py)
CACHE:  <cartella>/azioni_n.json  {ticker: {"n": azioni, "f": fonte, "d": data del dato, "agg": giorno dello scarico}}
DEBUG:  python -m cot_radar.mag7 <cartella del ramo azioni>
"""
import json
import os
import time
from datetime import date, timedelta

from . import azioni as A
from .log import log

M7 = [("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "Nvidia"), ("AMZN", "Amazon"),
      ("GOOGL", "Alphabet"), ("META", "Meta"), ("TSLA", "Tesla")]
INDICI = (("sp500", "S&P 500"), ("ndx", "Nasdaq-100"))
URL_CONC = "https://data.sec.gov/api/xbrl/companyconcept/CIK{cik:010d}/{tax}/{tag}.json"
FATTORE = {"BRK-B": 1500}       # azioni equivalenti di classe A (SEC) -> classe B
MIN_CAP = 2e9                   # sotto 2 miliardi di dollari il numero di azioni e' sbagliato (es. classe sbagliata)
GIORNI_CACHE = 7                # numero di azioni riscaricato una volta a settimana
VECCHIO = 400                   # giorni: oltre, il dato SEC non si usa
DIVERSI = 0.30                  # copertina vs media diluita: oltre il 30% di differenza -> piu' classi di azioni
PAUSA = 0.15                    # regole SEC: massimo 10 richieste al secondo
PERIODI = (("1s", 5), ("1m", 21), ("3m", 63))     # sedute di borsa


# --------------------------------------------------------------------------- numero di azioni (SEC)
def _ultimo(js, oggi, durata):
    """(valore, data) piu' recente di un concetto SEC da 10-Q/10-K, oppure None.
    durata=True: solo periodi trimestrali (75-100 giorni), per la media diluita."""
    righe = []
    for x in ((js or {}).get("units") or {}).get("shares") or []:
        if not str(x.get("form", "")).startswith(("10-Q", "10-K")) or not x.get("val") or not x.get("end"):
            continue
        if durata:
            try:
                g = (date.fromisoformat(x["end"]) - date.fromisoformat(x.get("start") or x["end"])).days
            except ValueError:
                continue
            if not 75 <= g <= 100:
                continue
        righe.append((x["end"], x.get("filed", ""), x["val"]))
    if not righe:
        return None
    fine, _, val = max(righe)
    if (oggi - date.fromisoformat(fine)).days > VECCHIO:
        return None
    return float(val), fine


def scegli(dei, dil, trim=None):
    """Regola di scelta del numero di azioni -> (azioni, fonte, data) oppure None. Vedi testa del file."""
    if dei and dil and abs(dei[0] / dil[0] - 1) > DIVERSI:
        # piu' classi (la copertina ne conta una sola) o unita' sbagliata (es. milioni): vale il numero piu' grande
        return (dil[0], "diluite", dil[1]) if dil[0] > dei[0] else (dei[0], "copertina", dei[1])
    if dei:
        return dei[0], "copertina", dei[1]
    if dil:
        return dil[0], "diluite", dil[1]
    if trim:
        return trim
    return None


def _da_trimestre(bil):
    """Azioni = utile / utile per azione dell'ultimo trimestre con EPS non troppo piccolo (arrotondamenti)."""
    for q in reversed((bil or {}).get("trim") or []):
        u, e = q.get("utile"), q.get("eps")
        if u and e and abs(e) >= 0.2 and u / e > 0:
            return u / e, "utile/eps", q.get("fine")
    return None


def _eodhd(t):
    """(azioni, "eodhd", data) dai fondamentali EODHD, oppure None (piano senza fondamentali o simbolo mancante)."""
    try:
        from . import eodhd
        if not eodhd.attivo() or not eodhd.simbolo(t):
            return None
        js = eodhd.get("fundamentals/" + eodhd.simbolo(t), {"filter": "SharesStats"}, timeout=30, tentativi=1)
        n = float((js or {}).get("SharesOutstanding") or 0) if isinstance(js, dict) else 0
        return (n, "eodhd", date.today().isoformat()) if n > 0 else None
    except Exception:
        return None


def aggiorna_azioni(cartella, el, oggi=None, get=None):
    """Aggiorna la cache del numero di azioni (solo i dati piu' vecchi di una settimana). -> {ticker: voce}."""
    from . import fondamentali as F
    oggi = oggi or date.today()
    f = os.path.join(cartella, "azioni_n.json")
    cache = A._leggi(f) or {}
    ua = F._ua()
    get = get or (lambda url: F._get(url, ua, timeout=30, tentativi=2))
    cik = F._cik(cartella, ua, oggi) if ua else {}
    limite = (oggi - timedelta(days=GIORNI_CACHE)).isoformat()
    n_sec = 0
    for x in el:
        t = x["t"]
        if not ("sp500" in x["l"] or "ndx" in x["l"]) or "." in t:
            continue
        v = cache.get(t)
        if v and v.get("agg", "") > limite:
            continue
        bil = A._leggi(os.path.join(cartella, "pubblico", "bilanci", t + ".json"))
        dei = dil = None
        c = cik.get(t.replace("-", ".").upper()) or cik.get(t.upper())
        if ua and c:
            dei = _ultimo(get(URL_CONC.format(cik=c, tax="dei", tag="EntityCommonStockSharesOutstanding")), oggi, False)
            time.sleep(PAUSA)
            dil = _ultimo(get(URL_CONC.format(cik=c, tax="us-gaap", tag="WeightedAverageNumberOfDilutedSharesOutstanding")),
                          oggi, True)
            time.sleep(PAUSA)
            n_sec += 2
        s = scegli(dei, dil, _da_trimestre(bil)) or _eodhd(t)
        if s:
            cache[t] = {"n": s[0], "f": s[1], "d": s[2], "agg": oggi.isoformat(), "cik": c}
        elif v:
            v["agg"] = oggi.isoformat()            # nessun dato nuovo: si tiene il vecchio, si riprova fra una settimana
    A._scrivi(f, cache)
    log.info("mag7: numero di azioni per %d titoli (%d richieste SEC)", len(cache), n_sec)
    return cache


# --------------------------------------------------------------------------- calcoli
def _media(v):
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else None


def _rend(d, k):
    """Rendimento % sulle ultime k sedute di una serie [[data, prezzo]], oppure None."""
    if not d or len(d) <= k or not d[-1 - k][1]:
        return None
    return (d[-1][1] / d[-1 - k][1] - 1) * 100


def _trend(d):
    """1 = prezzo sopra la media a 200 giorni e media in salita, -1 = sotto e in discesa, 0 = misto (freccia laterale)."""
    if not d or len(d) < 220:
        return None
    p = [x[1] for x in d]
    m200, m200p = sum(p[-200:]) / 200, sum(p[-220:-20]) / 200
    if p[-1] > m200 and m200 > m200p:
        return 1
    if p[-1] < m200 and m200 < m200p:
        return -1
    return 0


def _ttm(bil, chiave):
    """Somma degli ultimi 4 trimestri (None se ne manca uno)."""
    q = [x.get(chiave) for x in ((bil or {}).get("trim") or [])[-4:]]
    return sum(q) if len(q) == 4 and all(v is not None for v in q) else None


def fondamentali7(bil, cap):
    """Retro della card: margine netto, ROE, P/E, rendimento del flusso di cassa libero, crescita dei ricavi."""
    if not bil:
        return {}
    ric, ut = _ttm(bil, "ricavi"), _ttm(bil, "utile")
    anni = bil.get("anni") or []
    ult = anni[-1] if anni else {}
    pn = ult.get("pn")
    fcf = next((a.get("fcf") for a in reversed(anni) if a.get("fcf") is not None), None)   # ultimo anno con il dato
    T = bil.get("trim") or []
    ric_prima = sum(x.get("ricavi") or 0 for x in T[-8:-4]) if len(T) >= 8 else None
    r = lambda v, n=1: round(v, n) if v is not None else None
    return {"marg": r(ut / ric * 100) if ric and ut is not None else None,
            "roe": r(ut / pn * 100) if ut is not None and pn and pn > 0 else None,
            "pe": r(cap / ut) if cap and ut and ut > 0 else None,
            "fcfy": r(fcf / cap * 100, 2) if cap and fcf is not None else None,
            "cresc": r((ric / ric_prima - 1) * 100) if ric and ric_prima else None,
            "anno": ult.get("a")}


def calcola(cartella, el=None, azioni_n=None, oggi=None, min_cap=MIN_CAP):
    """Scrive pubblico/mag7.json e lo restituisce."""
    el = el if el is not None else A.elenco()
    oggi = oggi or date.today()
    azioni_n = azioni_n if azioni_n is not None else (A._leggi(os.path.join(cartella, "azioni_n.json")) or {})
    serie, visti = {}, {}
    prima = {t for t, _ in M7}                     # le 7 per prime: GOOGL resta la quotazione di Alphabet
    for x in sorted(el, key=lambda x: x["t"] not in prima):
        t = x["t"]
        if not ("sp500" in x["l"] or "ndx" in x["l"]) or "." in t or t not in azioni_n:
            continue
        tit = A._leggi(os.path.join(cartella, "pubblico", "titoli", t + ".json"))
        d = (tit or {}).get("d") or []
        if len(d) < 30:
            continue
        cik = azioni_n[t].get("cik")
        if cik and cik in visti:                   # seconda quotazione della stessa societa': non si conta due volte
            continue
        if cik:
            visti[cik] = t
        n = azioni_n[t]["n"] * (FATTORE.get(t, 1) if azioni_n[t].get("f") != "eodhd" else 1)
        if d[-1][1] * n < min_cap:                 # valore implausibile per S&P 500 / Nasdaq-100: dato sbagliato, fuori
            log.warning("mag7: %s scartato (valore in borsa %.1f mld implausibile)", t, d[-1][1] * n / 1e9)
            continue
        serie[t] = {"d": d, "l": x["l"], "n": n}
    if not all(t in serie for t, _ in M7):
        log.warning("mag7: mancano dati per %s", [t for t, _ in M7 if t not in serie])
        return None
    # date comuni: l'ultima seduta presente in tutte le serie delle 7
    ultima = min(serie[t]["d"][-1][0] for t, _ in M7)

    def prezzo_a(s, k):
        """Prezzo k sedute prima dell'ultima data comune (None se la serie e' troppo corta)."""
        d = [p for p in s["d"] if p[0] <= ultima]
        return d[-1 - k][1] if len(d) > k else None

    out = {"aggiornato": ultima, "fonte_azioni": "SEC", "indici": {}, "titoli": []}
    nomi = dict(M7)
    for idx, nome in INDICI:
        membri = {t: s for t, s in serie.items() if idx in s["l"]}
        cap = {t: prezzo_a(s, 0) * s["n"] for t, s in membri.items() if prezzo_a(s, 0)}
        tot = sum(cap.values())
        q7 = {t: cap[t] / tot * 100 for t in nomi if t in cap}
        ind = {"nome": nome, "n": len(cap), "tot": round(tot / 1e12, 2), "peso7": round(sum(q7.values()), 1),
               "pesi": {t: round(v, 2) for t, v in q7.items()}, "contrib": {}, "storia": []}
        for per, k in PERIODI:
            c0 = {t: prezzo_a(s, k) * s["n"] for t, s in membri.items() if prezzo_a(s, k) and prezzo_a(s, 0)}
            t0 = sum(c0.values())
            r = {t: (prezzo_a(membri[t], 0) / prezzo_a(membri[t], k) - 1) * 100 for t in c0}
            con = {t: c0[t] / t0 * r[t] for t in c0}
            ind["contrib"][per] = {"indice": round(sum(con.values()), 2),
                                   "m7": round(sum(v for t, v in con.items() if t in nomi), 2),
                                   "altri": round(sum(v for t, v in con.items() if t not in nomi), 2),
                                   "pesi_uguali": round(_media(r.values()), 2),
                                   "per7": {t: round(con[t], 2) for t in nomi if t in con}}
        # peso delle 7 nell'ultimo anno, una volta a settimana (azioni di oggi: ricostruzione approssimata)
        for k in range(250, -1, -5):
            c = {t: prezzo_a(s, k) * s["n"] for t, s in membri.items() if prezzo_a(s, k)}
            if len(c) < 0.9 * len(cap):
                continue
            dd = [p for p in membri["AAPL"]["d"] if p[0] <= ultima]
            ind["storia"].append([dd[-1 - k][0], round(sum(v for t, v in c.items() if t in nomi) / sum(c.values()) * 100, 1)])
        out["indici"][idx] = ind
    sp = out["indici"]["sp500"]
    for t, n in M7:
        s = serie[t]
        d = [p for p in s["d"] if p[0] <= ultima]
        cap = d[-1][1] * s["n"]
        bil = A._leggi(os.path.join(cartella, "pubblico", "bilanci", t + ".json"))
        r = lambda v: round(v, 1) if v is not None else None
        out["titoli"].append({"t": t, "n": n, "p": d[-1][1], "cap": round(cap / 1e12, 3),
                              "w_sp": sp["pesi"].get(t), "w_ndx": out["indici"]["ndx"]["pesi"].get(t),
                              "r1m": r(_rend(d, 21)), "r12m": r(_rend(d, 252)), "tr": _trend(d),
                              "sp": [round(x[1], 2) for x in d[-252::5]],
                              "f": fondamentali7(bil, cap), "fonte_n": azioni_n[t].get("f")})
    A._scrivi(os.path.join(cartella, "pubblico", "mag7.json"), out)
    log.info("mag7: peso nell'S&P 500 %.1f%%, nel Nasdaq-100 %.1f%%", sp["peso7"], out["indici"]["ndx"]["peso7"])
    return out


def aggiorna(cartella, el=None):
    """Giro della sera (USA): numero di azioni (settimanale) + calcolo. Mai bloccante."""
    el = el if el is not None else A.elenco()
    n = aggiorna_azioni(cartella, el)
    return calcola(cartella, el, n)


if __name__ == "__main__":
    import sys
    r = aggiorna(sys.argv[1] if len(sys.argv) > 1 else ".")
    print(json.dumps({k: v for k, v in (r or {}).items() if k != "titoli"}, ensure_ascii=False)[:2000])
