# -*- coding: utf-8 -*-
"""
paesi.py - PAESI EMERGENTI: chi cresce e chi no (v6.72, riquadro della Dashboard)

FONTE: Fondo Monetario Internazionale, World Economic Outlook (API DataMapper, gratuita e senza chiave).
  - NGDP_RPCH = crescita del PIL reale in % sull'anno prima (dati passati + stime e previsioni FMI)
  - PCPIPCH   = inflazione media dell'anno in %
  Il FMI aggiorna le previsioni due volte l'anno (aprile e ottobre): basta scaricarle a ogni giro del sito,
  la chiamata e' una sola per indicatore (l'API restituisce tutti i paesi insieme).

PAESI: i 24 dell'indice MSCI Emerging Markets, lo stesso seguito dall'ETF EEM e dal COT "MSCI Emergenti"
  (cosi' il riquadro parla degli stessi paesi in cui si investe con quell'indice).

COSA CALCOLA per ogni paese (anno = anno solare in corso):
  pil      crescita del PIL dell'anno in corso (stima FMI finche' l'anno non e' chiuso)
  prec     crescita dell'anno prima
  prox     previsione FMI per l'anno prossimo
  tend     prox - pil: >0 = l'economia ACCELERA, <0 = RALLENTA
  inf      inflazione dell'anno in corso
  stato    "crescita" se pil > 0, "decrescita" se pil <= 0 (PIL che si riduce = recessione)

AGGIORNAMENTO AUTOMATICO: si riscarica a ogni giro del sito (piu' volte al giorno), con 3 tentativi.
SICUREZZA DEI DATI: copia dell'ultimo download in dati/paesi_fmi.json; se il FMI non risponde si usa quella
(con la sua data), se manca anche la copia il riquadro sparisce. Mai bloccante per il resto del sito.
"""
import json
import os
import time
import urllib.request
from datetime import datetime, timezone

from .config import ROOT
from .log import log

API = "https://www.imf.org/external/datamapper/api/v1/{ind}"
COPIA = os.path.join(ROOT, "dati", "paesi_fmi.json")
# RISERVA nel codice: edizione FMI di ottobre 2026 (24 paesi, PIL 2024-2028 e inflazione 2026-2027), presa dalla
# stessa API. Serve solo se mancano sia il download sia la copia (es. primo giro dopo un blocco del FMI).
RISERVA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paesi_riserva.json")

# v8.69 TRE GRUPPI (idea di Ya, 22/11/2026), stessa classificazione di MSCI (la societa' degli indici):
#   SVILUPPATI = mercati grandi, liquidi e aperti agli investitori esteri (indice MSCI World);
#   EMERGENTI  = economie in crescita con borse gia' grandi e accessibili (indice MSCI Emerging Markets, come prima);
#   FRONTIERA  = economie piu' piccole o borse poco sviluppate e meno accessibili (MSCI Frontier e simili).
#   L'Algeria non e' classificata da MSCI (borsa minuscola): sta in Frontiera solo con i dati economici del FMI.
SVILUPPATI = [
    ("USA", "Stati Uniti", "America"), ("CAN", "Canada", "America"),
    ("GBR", "Regno Unito", "Europa"), ("DEU", "Germania", "Europa"), ("FRA", "Francia", "Europa"),
    ("ITA", "Italia", "Europa"), ("ESP", "Spagna", "Europa"), ("NLD", "Paesi Bassi", "Europa"),
    ("BEL", "Belgio", "Europa"), ("CHE", "Svizzera", "Europa"), ("SWE", "Svezia", "Europa"),
    ("NOR", "Norvegia", "Europa"), ("DNK", "Danimarca", "Europa"), ("FIN", "Finlandia", "Europa"),
    ("AUT", "Austria", "Europa"), ("IRL", "Irlanda", "Europa"), ("PRT", "Portogallo", "Europa"),
    ("ISR", "Israele", "Medio Oriente"), ("JPN", "Giappone", "Asia"), ("HKG", "Hong Kong", "Asia"),
    ("SGP", "Singapore", "Asia"), ("AUS", "Australia", "Oceania"), ("NZL", "Nuova Zelanda", "Oceania"),
]
FRONTIERA = [
    ("MAR", "Marocco", "Africa"), ("DZA", "Algeria", "Africa"), ("TUN", "Tunisia", "Africa"),
    ("NGA", "Nigeria", "Africa"), ("KEN", "Kenya", "Africa"), ("CIV", "Costa d'Avorio", "Africa"),
    ("VNM", "Vietnam", "Asia"), ("PAK", "Pakistan", "Asia"), ("BGD", "Bangladesh", "Asia"),
    ("KAZ", "Kazakistan", "Asia"), ("JOR", "Giordania", "Medio Oriente"), ("ROU", "Romania", "Europa"),
    ("ARG", "Argentina", "America Latina"),
]
# (codice ISO3 del FMI, nome in italiano, area) - indice MSCI Emerging Markets
PAESI = [
    ("CHN", "Cina", "Asia"), ("IND", "India", "Asia"), ("TWN", "Taiwan", "Asia"), ("KOR", "Corea del Sud", "Asia"),
    ("IDN", "Indonesia", "Asia"), ("THA", "Thailandia", "Asia"), ("MYS", "Malesia", "Asia"),
    ("PHL", "Filippine", "Asia"),
    ("BRA", "Brasile", "America Latina"), ("MEX", "Messico", "America Latina"), ("CHL", "Cile", "America Latina"),
    ("COL", "Colombia", "America Latina"), ("PER", "Perù", "America Latina"),
    ("SAU", "Arabia Saudita", "Golfo"), ("ARE", "Emirati Arabi", "Golfo"),
    ("QAT", "Qatar", "Golfo"), ("KWT", "Kuwait", "Golfo"),
    ("ZAF", "Sudafrica", "Africa"), ("EGY", "Egitto", "Africa"),
    ("TUR", "Turchia", "Europa"), ("POL", "Polonia", "Europa"), ("HUN", "Ungheria", "Europa"),
    ("CZE", "Rep. Ceca", "Europa"), ("GRC", "Grecia", "Europa"),
]


# v7.67 LA BORSA DI OGNI PAESE: ETF quotato a New York (in dollari) che segue l'indice MSCI di quel paese. Serve per
# affiancare all'economia (PIL) l'andamento della borsa e la sua volatilita'. 20 paesi su 24: Ungheria e Rep. Ceca non
# hanno un ETF dedicato, quelli di Egitto e Colombia non sono piu' affidabili (restano senza dato, mai inventato).
# I prezzi arrivano con il giro giornaliero di portafogli.prezzi() (archivio storico/yahoo/, fornitore + riserva).
# v8.69 sviluppati e frontiera: ETF iShares MSCI del singolo paese (SPY per gli USA, VanEck per il Vietnam, Global X
#   per l'Argentina). Marocco, Algeria, Tunisia, Nigeria, Kenya, Costa d'Avorio, Pakistan, Bangladesh, Kazakistan,
#   Giordania e Romania non hanno un ETF del singolo paese affidabile: solo l'economia, mai un dato inventato.
ETF_ALTRI = {"USA": "SPY", "CAN": "EWC", "GBR": "EWU", "DEU": "EWG", "FRA": "EWQ", "ITA": "EWI", "ESP": "EWP",
             "NLD": "EWN", "BEL": "EWK", "CHE": "EWL", "SWE": "EWD", "NOR": "NORW", "DNK": "EDEN", "FIN": "EFNL",
             "AUT": "EWO", "IRL": "EIRL", "ISR": "EIS", "JPN": "EWJ", "HKG": "EWH", "SGP": "EWS", "AUS": "EWA",
             "NZL": "ENZL", "VNM": "VNM", "ARG": "ARGT"}
ETF = {"CHN": "MCHI", "IND": "INDA", "TWN": "EWT", "KOR": "EWY", "IDN": "EIDO", "THA": "THD", "MYS": "EWM",
       "PHL": "EPHE", "BRA": "EWZ", "MEX": "EWW", "CHL": "ECH", "PER": "EPU", "SAU": "KSA", "ARE": "UAE",
       "QAT": "QAT", "KWT": "KWT", "ZAF": "EZA", "TUR": "TUR", "POL": "EPOL", "GRC": "GREK"}
ETF.update(ETF_ALTRI)
GRUPPI = (("Sviluppati", SVILUPPATI), ("Emergenti", PAESI), ("Frontiera", FRONTIERA))
MESE, ANNO_B, MEDIA = 21, 252, 200      # sedute: un mese, un anno, media mobile della tendenza (come nei portafogli)
VECCHIO = 10                            # giorni: oltre, i prezzi sono fermi e la borsa non si mostra


def borsa(pts, oggi=None):
    """Numeri di borsa di un paese da [(data, prezzo)]: {"t": data ultimo prezzo, "m1": rendimento % 1 mese,
    "a1": % 12 mesi, "su": True se il prezzo e' sopra la media a 200 sedute (tendenza al rialzo),
    "vb": volatilita' annua % delle ultime 20 sedute (BREVE), "vl": delle ultime 252 (LUNGA),
    "reg": "calma" | "normale" | "agitata" (volatilita.regime: la breve confrontata con i suoi ultimi 5 anni)}.
    None se la storia e' troppo corta o i prezzi sono fermi. Studio (studi/risultati_volatilita_breve_lunga.txt):
    in regime "agitata" il drawdown tipico del mese dopo e' circa -7%, in "calma" circa -4,5%."""
    from . import volatilita as V
    if not pts or len(pts) < ANNO_B + 2:
        return None
    oggi = oggi or datetime.now().date()
    if (oggi - datetime.strptime(pts[-1][0], "%Y-%m-%d").date()).days > VECCHIO:
        return None
    i = len(pts) - 1
    px = [p[1] for p in pts]
    v20, v252 = V.vol_mobile(pts), V.vol_mobile(pts, ANNO_B)
    reg = V.regime(v20, i)
    return {"t": pts[-1][0], "m1": round((px[i] / px[i - MESE] - 1) * 100, 1), "a1": round((px[i] / px[i - ANNO_B] - 1) * 100, 1),
            "su": px[i] > sum(px[i - MEDIA + 1:i + 1]) / MEDIA,
            "vb": None if v20[i] is None else round(v20[i], 1), "vl": None if v252[i] is None else round(v252[i], 1),
            "reg": reg[0] if reg else None}


def aggiungi_borse(dati, leggi, oggi=None):
    """Aggiunge a ogni riga di dati["paesi"] la chiave "b" (vedi borsa) e "etf" (ticker). leggi(ticker) -> [(data, prezzo)].
    Un paese senza ETF o senza prezzi resta senza "b": la tabella mostra un trattino."""
    if not dati:
        return dati
    n = 0
    for r in dati["paesi"]:
        t = ETF.get(r["iso"])
        if not t:
            continue
        try:
            b = borsa(leggi(t), oggi)
        except Exception as e:
            log.warning("paesi: borsa %s non calcolata (%s)", t, e)
            b = None
        if b:
            r["etf"], r["b"] = t, b
            n += 1
    dati["borse"] = n
    return dati


TENTATIVI = 3                # il FMI a volte risponde lento: 3 prove con attesa crescente (2 s, 6 s) prima della copia


def _scarica(ind, timeout=30):
    """{ISO3: {anno: valore}} di un indicatore FMI. User-Agent dichiarato del progetto. Riprova fino a TENTATIVI."""
    req = urllib.request.Request(API.format(ind=ind), headers={"User-Agent": "cot-radar/paesi",
                                                               "Accept": "application/json"})
    for n in range(TENTATIVI):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)["values"][ind]
        except Exception as e:
            if n == TENTATIVI - 1:
                raise                                  # ultimo tentativo fallito: carica() passa alla copia salvata
            log.info("paesi: FMI %s non risponde (%s %s), nuovo tentativo %d/%d", ind, type(e).__name__,
                     getattr(e, "code", ""), n + 2, TENTATIVI)
            time.sleep(2 * 3 ** n)


# v8.69 FONTE NUOVA: dal 19/11/2026 il vecchio "DataMapper" del FMI risponde 403 ai server (portale legacy dismesso).
#   Si usa l'API ufficiale SDMX del FMI (api.imf.org, dataset IMF.RES:WEO, stessa edizione del World Economic
#   Outlook). Una richiesta sola per tutti i paesi e i due indicatori; il DataMapper resta come seconda prova.
API_SDMX = ("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO/{paesi}.NGDP_RPCH+PCPIPCH.A"
            "?startPeriod={da}&endPeriod={a}")


def _scarica_sdmx(isos, anno, timeout=60):
    """{"NGDP_RPCH": {ISO3: {anno: valore}}, "PCPIPCH": {...}} dall'API SDMX del FMI (XML structure-specific)."""
    import xml.etree.ElementTree as ET
    url = API_SDMX.format(paesi="+".join(sorted(isos)), da=anno - 2, a=anno + 2)
    req = urllib.request.Request(url, headers={"User-Agent": "edgevalor/paesi", "Accept": "application/xml"})
    for n in range(TENTATIVI):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                radice = ET.fromstring(r.read())
            break
        except Exception as e:
            if n == TENTATIVI - 1:
                raise
            log.info("paesi: FMI SDMX non risponde (%s), nuovo tentativo %d/%d", type(e).__name__, n + 2, TENTATIVI)
            time.sleep(2 * 3 ** n)
    out = {"NGDP_RPCH": {}, "PCPIPCH": {}}
    for serie in radice.iter():
        if not serie.tag.endswith("Series"):
            continue
        ind, iso = serie.get("INDICATOR"), serie.get("COUNTRY")
        if ind not in out or not iso:
            continue
        for o in serie:
            v, t = o.get("OBS_VALUE"), o.get("TIME_PERIOD")
            try:
                out[ind].setdefault(iso, {})[str(t)] = float(v)
            except (TypeError, ValueError):
                continue
    return out


# v8.98 INFLAZIONE DI OGGI PER PAESE (Ya, 23/11/2026): "la BCE taglia o alza per tutti, ma l'inflazione non e' uguale
#   in ogni paese europeo". Oltre alla media annua stimata dal WEO ("inf") si legge l'ULTIMO DATO MENSILE dei prezzi al
#   consumo, su 12 mesi, dal dataset CPI del FMI (dati degli istituti nazionali di statistica, stessa API SDMX):
#     IMF.STA:CPI  {PAESE}.CPI._T.YOY_PCH_PA_PT.M   (_T = paniere completo, YOY_PCH_PA_PT = variazione % sull'anno prima)
#   Una richiesta per tutti i paesi; chi non ha il mensile (es. Nuova Zelanda) si prende dal trimestrale (.Q).
#   Ritardo tipico 1-3 mesi (il FMI raccoglie i dati nazionali). Copia in dati/paesi_cpi.json se il FMI non risponde.
#   Per ogni paese: v = ultimo valore, p = periodo ("2026-09" o "2026-Q3"), v3 = valore di 3 mesi prima (1 trimestre).
API_CPI = ("https://api.imf.org/external/sdmx/2.1/data/IMF.STA,CPI/{paesi}.CPI._T.YOY_PCH_PA_PT.{f}"
           "?startPeriod={da}")
COPIA_CPI = os.path.join(ROOT, "dati", "paesi_cpi.json")


def _serie_cpi(xml_testo):
    """{ISO3: [(periodo, valore)] in ordine di tempo} dall'XML SDMX del dataset CPI."""
    import xml.etree.ElementTree as ET
    out = {}
    for serie in ET.fromstring(xml_testo).iter():
        if not serie.tag.endswith("Series") or not serie.get("COUNTRY"):
            continue
        pt = []
        for o in serie:
            try:
                v = float(o.get("OBS_VALUE"))
            except (TypeError, ValueError):
                continue
            if v == v:                                  # "NaN" del FMI = dato mancante: si salta (nel JSON non e' valido)
                pt.append((str(o.get("TIME_PERIOD")), v))
        if pt:
            out[serie.get("COUNTRY")] = sorted(pt)
    return out


def ultimo_cpi(punti, freq):
    """{"v", "p", "v3"} dall'elenco [(periodo, valore)]: periodo "2026-M09" -> "2026-09", "2026-Q3" resta cosi'."""
    if not punti:
        return None
    per, v = punti[-1]
    # 3 mesi prima sul CALENDARIO (non "3 dati prima": se un mese manca il confronto sarebbe sbagliato)
    anno, resto = per.split("-")
    if freq == "M":
        m = int(resto.lstrip("M")) - 3
        prima = f"{int(anno) - (m <= 0)}-M{(m - 1) % 12 + 1:02d}"
    else:
        q = int(resto.lstrip("Q")) - 1
        prima = f"{int(anno) - (q <= 0)}-Q{(q - 1) % 4 + 1}"
    v3 = dict(punti).get(prima)
    return {"v": round(v, 1), "p": per.replace("-M", "-"), "v3": None if v3 is None else round(v3, 1)}


def inflazione_oggi(isos, adesso, timeout=60):
    """{ISO3: {"v","p","v3"}}: mensile per chi lo ha, trimestrale per gli altri. Errore di rete -> eccezione."""
    da = f"{adesso.year - 2}-01"
    get = lambda lista, f: urllib.request.urlopen(urllib.request.Request(
        API_CPI.format(paesi="+".join(sorted(lista)), f=f, da=da),
        headers={"User-Agent": "edgevalor/paesi", "Accept": "application/xml"}), timeout=timeout).read()
    out = {iso: ultimo_cpi(pt, "M") for iso, pt in _serie_cpi(get(isos, "M")).items()}
    mancano = [i for i in isos if i not in out]
    if mancano:
        try:
            out.update({iso: ultimo_cpi(pt, "Q") for iso, pt in _serie_cpi(get(mancano, "Q")).items()})
        except Exception as e:                          # il trimestrale e' un di piu': mai bloccante
            log.info("paesi: CPI trimestrale non letto (%s)", type(e).__name__)
    return {k: v for k, v in out.items() if v}


def _cpi(isos, adesso, scarica):
    """Inflazione di oggi con la copia di sicurezza (dati/paesi_cpi.json). {} se non c'e' nulla."""
    if scarica:
        try:
            x = inflazione_oggi(isos, adesso)
            if len(x) >= 20:                            # risposta credibile: si salva
                os.makedirs(os.path.dirname(COPIA_CPI), exist_ok=True)
                with open(COPIA_CPI, "w", encoding="utf-8") as f:
                    json.dump(x, f, separators=(",", ":"))
                return x
            log.warning("paesi: inflazione mensile incompleta (%d paesi), uso la copia", len(x))
        except Exception as e:
            log.warning("paesi: inflazione mensile non disponibile (%s), uso la copia", type(e).__name__)
    try:
        with open(COPIA_CPI, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _leggi_copia():
    """Ultima copia scaricata (dati/), altrimenti la riserva nel codice; None se mancano entrambe."""
    for f_ in (COPIA, RISERVA):
        try:
            with open(f_, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            continue
    return None


def calcola(pil, inf, anno):
    """Righe del riquadro, dalla crescita piu' alta alla piu' bassa (solo paesi con i tre valori del PIL)."""
    righe = []
    for gruppo, iso, nome, area in ((g, *p) for g, lista in GRUPPI for p in lista):
        p, i = pil.get(iso) or {}, inf.get(iso) or {}
        cur, prec, prox = p.get(str(anno)), p.get(str(anno - 1)), p.get(str(anno + 1))
        if cur is None or prox is None:
            continue                                   # paese senza stima FMI: meglio non mostrarlo che inventare
        righe.append({"iso": iso, "nome": nome, "area": area, "gr": gruppo, "pil": round(cur, 1),
                      "prec": None if prec is None else round(prec, 1), "prox": round(prox, 1),
                      "tend": round(prox - cur, 1), "inf": None if i.get(str(anno)) is None else round(i[str(anno)], 1),
                      "stato": "crescita" if cur > 0 else "decrescita"})
    return sorted(righe, key=lambda r: -r["pil"])


def carica(scarica=True, adesso=None):
    """Dati per la pagina: {anno, agg, fonte, copia, paesi:[...]} oppure None. scarica=False (demo/test): solo copia."""
    adesso = adesso or datetime.now(timezone.utc)
    grezzi = None
    if scarica:
        try:
            tutti = [iso for _, lista in GRUPPI for iso, _, _ in lista]
            try:
                x = _scarica_sdmx(tutti, adesso.year)
                grezzi = {"pil": x["NGDP_RPCH"], "inf": x["PCPIPCH"], "agg": adesso.strftime("%Y-%m-%d"), "fonte": "sdmx"}
            except Exception as e:                     # seconda prova: il vecchio DataMapper
                log.warning("paesi: FMI SDMX non disponibile (%s), provo il DataMapper", type(e).__name__)
                grezzi = {"pil": _scarica("NGDP_RPCH"), "inf": _scarica("PCPIPCH"),
                          "agg": adesso.strftime("%Y-%m-%d")}
            if sum(1 for iso, _, _ in PAESI if iso in grezzi["pil"]) < 20:
                raise ValueError("risposta FMI incompleta")
            os.makedirs(os.path.dirname(COPIA), exist_ok=True)
            with open(COPIA, "w", encoding="utf-8") as f:
                json.dump(grezzi, f, separators=(",", ":"))
        except Exception as e:                         # rete o FMI giu': si ripiega sulla copia
            log.warning("paesi: FMI non disponibile (%s %s), uso l'ultima copia", type(e).__name__, getattr(e, "code", ""))
            grezzi = None
    copia = grezzi is None
    if copia:
        grezzi = _leggi_copia()
    if not grezzi:
        return None
    righe = calcola(grezzi["pil"], grezzi["inf"], adesso.year)
    if not righe:
        return None
    # v8.98 inflazione di oggi (ultimo dato mensile) accanto a ogni paese: campo "im" = {v, p, v3}
    cpi = _cpi([r["iso"] for r in righe], adesso, scarica)
    for r in righe:
        if r["iso"] in cpi:
            r["im"] = cpi[r["iso"]]
    return {"anno": adesso.year, "agg": grezzi.get("agg"), "copia": copia, "fonte": "FMI World Economic Outlook",
            "paesi": righe}
