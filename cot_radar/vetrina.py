# -*- coding: utf-8 -*-
"""
vetrina.py - LANDING PAGE del sito (public/index.html). Il terminale sta in public/terminale/.

Prende il modello web/landing.html e ci mette i numeri VERI dell'ultimo aggiornamento (pagina.ULTIMI):
mercati seguiti, inizio del backtest e le anteprime delle schede ("Dentro il terminale", vedi dentro()).
Nessun numero inventato: se un dato manca si scrive "n.d." e la pagina resta comunque valida.

DEBUG: python -c "from cot_radar import vetrina; print(vetrina.html({'data':{'assets':{},'pairs':[]}})[:300])"
"""
import base64
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import escape, unescape

from . import domande, pagina, riepilogo
from .config import CONTATTO_EMAIL, FEEDBACK_CHIAVE, NORMAL, SECTORS, SITO_PUBBLICO, STRONG, TELEGRAM_CANALE, TITOLARE, WEB_DIR
from .log import log

# favicon: barra luminosa + ED/VA (logo "EDGE VALOR" in miniatura)
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' "
           "rx='14' fill='%230a1628'/%3E%3Crect x='10' y='12' width='6' height='40' rx='3' fill='%232ec4b6'/%3E%3Ctext x='22' "
           "y='31' font-family='Arial,Helvetica,sans-serif' font-weight='900' font-size='19' fill='%23eef5ff'%3EED%3C/text%3E"
           "%3Ctext x='22' y='51' font-family='Arial,Helvetica,sans-serif' font-weight='900' font-size='19' fill='%235b9bff'%3EVA"
           "%3C/text%3E%3C/svg%3E")
# v8.06 Google non usa le icone "data:" nei risultati di ricerca (mostrava il globo grigio): l'icona diventa un file vero
# /favicon.svg (stesso disegno) e le pagine pubbliche puntano a quello. Il terminale tiene la versione "data:".
FAVICON_SVG = urllib.parse.unquote(FAVICON.split(",", 1)[1])
FAVICON_URL = "/favicon.svg"
# v8.16 ICONE PNG per Google (risultati di ricerca: vuole un'icona quadrata multipla di 48 px; logo dell'organizzazione)
# e per iPhone/Android (apple-touch-icon). Stesso disegno di favicon.svg, gia' convertito in PNG (base64 qui sotto).
ICONE = {"favicon-48.png": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAAYFBMVEUgNVMmn5hPiePX3+qWn6wcUFgJFSZQW2p7hZMADCV1fo2tt8MKFiguxLYAAADt9P5ZmPu9xNEcbW+Ol6Q7aK0XJTgIFCYxV5MIFScJFSdGesoCECEJFScnRncIEiUbNFj0yR/tAAAAIHRSTlP///////9s//8U///+/wD/////////TP+TyP8TqP8x/5Skw8QAAAFESURBVHja3dZZk4MgDADgeNsulrjghdf//5clUGf26Ahx9mnzgB0mn4nSQeDhYiuXSZzEtJSbzwQa5kVExDgfoBeR0XsQne8EPGbBCAILB4wWCFbcoOeBHkYeGOFYryRJiggwwetH0TRNElPiMvi0oLkG7q0P6GjMcwgBJbMXkLLNMplVQaD8lAXeAwuIVtZRLakD5DLngToMvreUM0ElZRECraKoLFDqQx7+BPioO3fJ7n/+1/gHYDfazdMFjFnDFRBpTuMgxICYhoFLtawTIk01QhDsdFdAQ4NeUYcfOrU317hSrd1WCoPB9pRSHpX61dMb0KHZqZMVXejwOhikZugyDMPPnt6B1b3Nzqe6pwntfOgXwa8gva+vgL0Zs7f7kgdK2Hhgg8fEyV/sR5FV4nblw84/OvAPJ0T68fz4M/azz3wCrqRy+cN9QIcAAAAASUVORK5CYII=",
         "icona-192.png": "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAPFBMVEVamv1LVmYbNFYRHS81Xp0EESUIFCYJFSclUm7T2+ebpLEmo5tGespWdKWxuca6ws4KFigtw7Xt9P4AAAD8+1AlAAAAFHRSTlP////t/xxil////////////v//AC+R/AkAAATsSURBVHja7Z3bmqIwEIRDEhJAcFDf/10XFeTUSUTySZebvtoVZqZ+ujonZhJxC0VujLFWqfaroZS13Q/Og/JEQL39svAViM0/B8htyyK8DIK7+p5hM4BpmYXZBMBOvhuBAjCqZRnKvAXAy/zBcl4B5KplHCoPAZiWeRg/gG3Zh/UA5AD6l4UgYOzvKASB5Z+1iwSg/hmBwGl/6LboBZC3UJEvAcD0jwQCqwFaN0UCroAXhSwwDTSaSKAmYEiBgE1AnwIBm4A+BQI3Ac8UCNwEPFNwB2hh4wlgcAHMA8DiAtgHAK7+Vt0BcmCArh0SyCVwLwJxUy20hwS0gzoPCYMNYP4LAFmcuigkT4BwN1Zc+ig4dmVBAHm6vOIkGQKEWtGJ/o6AXzsq3vUPUxeFAORlEexMJDYYiKWJEgBzgMsqEkACSAAJIAEkgPWQKvNGQd9VSMUFILt6o3LfVVaZgga4xzkDB+jy0IADdLcocIBrWYADXEvJAcDbjC7vaqqqnBIoBgBeDdRdcsJwRgTo1j1GggwSoFUvghIToJXljhRwABgvVKAAbfm5h3gANMMVCQqghisNKMDLQxXHoUT5BsAZHaD6FYA/dIBzstD/XsTkdGBDM9qgd2QZKECGDlCBD+Yk+nC6Ap/QZOBTyqzc4SAGAM11TwIOB8j+di4ufmVlru+MV3c1s5W5hu/aaG8O/10frcsxAvh0fZ0JQJmxfsERAigr1QID7HpFdixA+VftfUmZXnQngASQABJAAkgACSABJIAEkAASQAJIAJ8DyCGob0BdlN6v+D5AIfqQ1B/a9TFduBWv0Dws5JGjh2vTBIwAggeAdsupCTY9AZAsAKRbDnVloj+Ch6K0Qk45RcBBETwUBcDpoZCDIngoCoDTQx4H6UgeitOR1bSHBgfVxGcykofiAFBKu2gIrnr4iOggDhxKDF5R5KdEzyaHWqh5AGjKQ4NLGuLG8SoPAEl5SLuHEXr+TwajUaoh9XQCcpYMDgDE05aeTmAJczwA4Xft6QTW/zl8QrP2S8BBkTwUDWDloZCDInko3pRyqTfooDgeigfQLAzhG0aQCTkaYKFOEp1AvRAsIwwnIq5KzA2h3cMI3XqydCDAXLKnhKXjS44GmDUqyjOXHJdViv1lHHNha6pGh+aSs6h5AExF16G5pIg0s4wJMPVQYDViGZrH2uj42ItNDtpTxlEBipej9TYH7fBQ3NXp1+MkZphe/Z97KC5A/5QL6R5GNG/MhI4D6IVr7R5GFI4hVMHjBcfwmJ3DCOEaQjU8ALTL19rp9Z0eirxNm3S1LO7WRu8r49j7zNV02y7dz1nuG06ITXtFhneL1Fsd5EtOBAC1SMEp+Hu2Wx2010Oh/UY3b9fZUCNM6atUuaeMVfQNUwvKQY33Ie/xkApvWct6t9E39txlv2kw/LbNaefvowHgN4+H374f/wAF+CMskD2kfuMYF/iDdOCPMsI/TAr+OC/UKjC/c6QdZgrM9FxKBdmJTQAMagJeZ7Na0INBx9NxFaSBfuh4X/wDlqHKwPzmIeP4x7zfcogc2Kn+OQCEi+xc8QKAf1tkbn4A7v1BfgsBsC5ltdJPANxytjYya/0UANdKMKRUGoBhFqin7wHg1ifY3KXTCfBgYFHPyq0+APCw0sEM1uR+hQGAJ4Qx9tvJUNZ2PzYPq/sHmfq1N2mUwpMAAAAASUVORK5CYII=",
         "favicon.ico": "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"}
# righe da mettere nell'<head> di home e pagine pubbliche (al posto della sola favicon.svg)
ICONE_HEAD = ('<link rel="icon" href="/favicon.ico" sizes="48x48">'
              '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
              '<link rel="icon" href="/favicon-48.png" type="image/png" sizes="48x48">'
              '<link rel="apple-touch-icon" href="/icona-192.png">')


# --------------------------------------------------------------------------- v7.69 "DENTRO IL TERMINALE"
# La landing mostra le schermate del terminale con i NUMERI VERI dell'ultimo aggiornamento (niente immagini: sono
# piccoli riquadri disegnati dalla pagina con questi dati, quindi sempre aggiornati e leggeri).
# REGOLA: qui non entrano mai i NOMI di cio' che sara' in abbonamento (composizione dei portafogli, azioni della
# selezione): nella pagina compaiono sfocati, e sotto la sfocatura non c'e' il nome vero ma un segnaposto.
PROFILO = "moderato"                    # profilo mostrato nell'anteprima dei portafogli
ECONOMIE = ("usa", "eur", "jpn")        # economie mostrate in apertura
STAG = "EURUSD.FOREX"                   # strumento della mappa oraria (24 ore su 24: griglia piena)


def _freccia(ora, prima, bene, verso):
    """Come la freccia del Quadro economico (34_quadro.js): [sale?, classe]. Grigia se la variazione e' minima."""
    if ora is None or prima is None or verso is None:
        return None
    return [bool(verso), "flat" if abs(ora - prima) < 0.05 else ("up" if bene == bool(verso) else "down")]


def _dashboard(dati, extra):
    out = {}
    eco = {e.get("id"): e for e in ((extra.get("economie") or {}).get("economie") or [])}
    righe = [{"id": i, "nome": eco[i].get("nome"), "regime": eco[i].get("regime"), "infl": eco[i].get("infl"),
              "cr": _freccia(eco[i].get("cli"), eco[i].get("cli3"), True, eco[i].get("cresce")),
              "in": _freccia(eco[i].get("infl"), eco[i].get("infl6"), False, eco[i].get("sale"))}
             for i in ECONOMIE if i in eco and eco[i].get("regime")]
    if righe:
        out["eco"] = righe
    rischio = (extra.get("market") or {}).get("risk")
    if rischio is not None:
        out["clima"] = rischio
    port = extra.get("port") or {}
    if port.get("prossima"):
        out["rot"] = {"a": port["prossima"], "da": port.get("rotazione")}
    # posizionamento e settori: stessi conti dei riquadri della Dashboard (04_dashboard.js)
    assets = {k: a for k, a in (dati.get("assets") or {}).items() if k != "USD"}
    etic = [p.get("label") or "" for p in dati.get("pairs") or []]
    etic += [a.get("label") or "" for a in assets.values() if a.get("group") != "Valute"]
    su, giu = sum("BUY" in e for e in etic), sum("SELL" in e for e in etic)
    if su + giu:
        out["pos"] = {"su": su, "giu": giu, "forti": sum(e.startswith("STRONG") for e in etic)}
    settori = []
    for g in SECTORS:
        v = [a.get("score") or 0 for a in assets.values() if a.get("group") == g]
        if not v:
            continue
        media = sum(v) / len(v)
        x = media * 1.6
        settori.append({"n": g, "v": round(media), "su": sum(p >= NORMAL for p in v), "giu": sum(p <= -NORMAL for p in v),
                        "l": (2 if x >= STRONG else 1 if x >= NORMAL else -2 if x <= -STRONG else -1 if x <= -NORMAL else 0)})
    if settori:
        out["settori"] = settori
    return out


def _portafoglio(extra):
    port = extra.get("port") or {}
    p = next((x for x in port.get("profili") or [] if x.get("id") == PROFILO), None)
    if not p or not p.get("corrente"):
        return None
    c, m = p["corrente"], p.get("mese") or {}
    anni = [a.get("r") for a in m.get("anni") or [] if a.get("r") is not None]
    comp = sorted((x.get("peso") or 0 for x in p.get("composizione") or [] if x.get("k") != "CASH"), reverse=True)
    return {"nome": p.get("nome"), "al": port.get("aggiornato"),
            "cor": {k: c.get(k) for k in ("mese", "r", "dd", "live", "attesa", "dal")},
            "st": {"n": m.get("n"), "pos": m.get("positivi"), "media": m.get("media"),
                   "lo": min(anni) if anni else None, "hi": max(anni) if anni else None},
            "pesi": comp,                               # solo i PESI: i nomi restano nel terminale
            "liq": next((x.get("peso") for x in p.get("composizione") or [] if x.get("k") == "CASH"), None)}


def _azioni(cartella):
    """Selezione di oggi da <sito>/azioni/top.json, SENZA nome, sigla e prezzo dei titoli."""
    if not cartella:
        return None
    try:
        with open(os.path.join(cartella, "azioni", "top.json"), encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError):
        return None
    titoli = [{"s": (d.get("settori") or {}).get(t.get("s")) or t.get("s"), "pt": t.get("pt"),
               "v1a": t.get("v1a"), "v3m": t.get("v3m"), "t200": t.get("t200"), "dmax": t.get("dmax"),
               "pos": t.get("st_pos"), "anni": t.get("st_n"), "sp": t.get("sp")} for t in d.get("titoli") or []]
    if not titoli:
        return None
    return {"al": d.get("aggiornato"), "mese": d.get("mese"), "titoli": titoli,
            "tot": ((d.get("ampiezza") or {}).get("tot") or {}).get("n")}


def _stagionalita(timeout=20):
    """Mappa oraria (5 giorni x 24 ore, ora di Roma) di uno strumento dal ramo "orari". Solo sul sito vero
    (serve GITHUB_REPOSITORY): in prova e nei test non si fa nessuna chiamata."""
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        return None
    base = f"https://raw.githubusercontent.com/{repo}/orari/pubblico/"

    def leggi(nome):
        req = urllib.request.Request(base + urllib.parse.quote(nome), headers={"User-Agent": "boardedge/vetrina"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    try:
        d = leggi(STAG + ".json")
        ore = d.get("ora") or {}
        righe = [[([round(ore[g][str(h)][1]), 1 if ore[g][str(h)][-1] else 0] if (ore.get(g) or {}).get(str(h)) else None)
                  for h in range(24)] for g in "01234"]
        try:
            mercati = len((leggi("indice.json").get("simboli")) or [])
        except Exception:
            mercati = None
        return {"nome": d.get("n"), "dal": (d.get("dal") or "")[:4], "righe": righe, "mercati": mercati}
    except Exception as e:                         # rete o formato: la scena della stagionalita' non si mostra
        log.warning("landing: mappa della stagionalita' non letta (%s)", type(e).__name__)
        return None


def _paesi(extra):
    p = extra.get("paesi") or {}
    em = p.get("paesi") or []                                                          # v8.70 tutti e 3 i gruppi
    righe = [{"n": r.get("nome"), "pil": r.get("pil"), "tend": r.get("tend"), "a1": r["b"].get("a1"),
              "su": r["b"].get("su"), "reg": r["b"].get("reg")} for r in em if r.get("b")]
    return {"righe": righe[:5], "tot": len(em), "anno": p.get("anno")} if righe else None


def _frase(testo):
    """Prima frase di un messaggio Telegram, senza intestazione, senza tag e senza simboli."""
    righe = [x for x in (testo or "").split("\n") if x.strip()]
    if len(righe) < 2:
        return None
    t = unescape(re.sub(r"<[^>]+>", "", righe[1])).strip()
    t = re.split(r"(?<=[\w)%])[;.] ", t)[0].rstrip(".;")
    return t + "." if t else None


def _telegram(dati, extra):
    """Le frasi VERE che il canale manderebbe oggi (stesse funzioni dei messaggi: briefing.py e riepilogo.py)."""
    out = {}
    tutto = dict(dati, **{k: v for k, v in extra.items() if v is not None})
    try:
        from . import briefing
        out["briefing"] = _frase(briefing.messaggio_chiave(tutto, datetime.now()))
    except Exception as e:
        log.warning("landing: frase del briefing non creata (%s)", type(e).__name__)
    try:
        attivi, chiusi = riepilogo.segnali(tutto)
        if attivi:
            out["cot"] = _frase(riepilogo.in_breve(tutto, attivi, chiusi))
    except Exception as e:
        log.warning("landing: frase del riepilogo COT non creata (%s)", type(e).__name__)
    return {k: v for k, v in out.items() if v}


def dentro(ultimi, cartella=None):
    """Tutti i dati delle anteprime: {dash, port, az, stag, paesi, tg}. Ogni pezzo e' isolato: se manca o si rompe,
    la sua scena nella pagina resta nascosta e le altre si vedono lo stesso."""
    dati, extra = ultimi.get("data") or {}, ultimi.get("extra") or {}
    pezzi = (("dash", lambda: _dashboard(dati, extra)), ("port", lambda: _portafoglio(extra)),
             ("az", lambda: _azioni(cartella)), ("stag", _stagionalita), ("paesi", lambda: _paesi(extra)),
             ("tg", lambda: _telegram(dati, extra)))
    out = {}
    for nome, fn in pezzi:
        try:
            v = fn()
        except Exception as e:
            log.warning("landing: anteprima '%s' non creata (%s: %s)", nome, type(e).__name__, e)
            v = None
        if v:
            out[nome] = v
    return pagina.clean(out)


def nastro(dati):
    """Nomi dei mercati coperti per il nastro che scorre (solo nomi, nessun segnale)."""
    nomi = [a.get("it") or k for k, a in (dati.get("assets") or {}).items() if a.get("group") != "Valute"]
    nomi = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"] + nomi
    return "".join(f"<span>{escape(n)}</span>" for n in nomi)


def html(ultimi, cartella=None):
    """Pagina completa a partire dai dati dell'ultima dashboard (pagina.ULTIMI). cartella = cartella del sito
    (serve solo all'anteprima delle azioni, che legge azioni/top.json)."""
    dati = ultimi.get("data") or {}
    attivi, _ = riepilogo.segnali(dati)
    mercati = [k for k, a in (dati.get("assets") or {}).items() if k != "USD"]   # USD composito: non e' un future
    dal = (ultimi.get("bt_dal") or "")[:4]
    valori = {
        "{{TELEGRAM}}": TELEGRAM_CANALE,
        # offerta di lancio (email): stessa "Access Key" pubblica di Web3Forms del modulo Feedback (Secret WEB3FORMS_KEY)
        "{{MODULO_KEY}}": "".join(c for c in (os.environ.get("WEB3FORMS_KEY") or FEEDBACK_CHIAVE)
                                  if c.isalnum() or c == "-"),
        "{{STATISTICHE}}": pagina.statistiche(),     # statistiche anonime senza cookie (web/statistiche.js)
        "{{FAVICON}}": FAVICON_URL, "{{ICONE}}": ICONE_HEAD,
        "{{N_SEGNALI}}": str(sum(len(v) for v in attivi.values())),
        "{{N_MERCATI}}": str(len(mercati)),
        "{{N_COPPIE}}": str(len(dati.get("pairs") or [])),
        "{{BT_DAL}}": dal or "n.d.",
        "{{ANNI_BT}}": str(datetime.now().year - int(dal)) if dal.isdigit() else "0",
        # v8.30 domande frequenti e dati strutturati FAQPage da domande.py (fonte unica); niente piu' "Aggiornato il"
        "{{FAQ_HTML}}": domande.html(radice=True),
        "{{FAQ_LD}}": domande.dati_strutturati(),
        "{{ANNO}}": str(datetime.now().year),
        "{{NASTRO}}": nastro(dati),
        # "</" spezzato: dentro <script> chiuderebbe il tag
        "{{DENTRO_JSON}}": json.dumps(dentro(ultimi, cartella), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
    }
    with open(os.path.join(WEB_DIR, "landing.html"), encoding="utf-8") as f:
        pagina_html = f.read()
    for k, v in valori.items():
        pagina_html = pagina_html.replace(k, v)
    return pagina_html


def legale():
    """Pagina delle NOTE LEGALI (web/legale.html -> /legale/): titolare e contatti da config, statistiche anonime."""
    titolare = (f"un servizio gestito da {escape(TITOLARE)}" if TITOLARE else
                "un servizio indipendente di analisi quantitativa dei mercati finanziari")
    if CONTATTO_EMAIL:
        contatti = (f'Per segnalazioni, richieste di autorizzazione e comunicazioni: '
                    f'<a href="mailto:{escape(CONTATTO_EMAIL)}">{escape(CONTATTO_EMAIL)}</a>.')
    else:
        contatti = (f'Per segnalazioni, richieste di autorizzazione e comunicazioni scrivi tramite il canale Telegram '
                    f'<a href="{escape(TELEGRAM_CANALE)}" target="_blank" rel="noopener">EdgeValor</a>.')
    valori = {"{{FAVICON}}": FAVICON_URL, "{{ICONE}}": ICONE_HEAD, "{{TELEGRAM}}": TELEGRAM_CANALE, "{{STATISTICHE}}": pagina.statistiche(),
              "{{DATA}}": datetime.now().strftime("%d/%m/%Y"), "{{ANNO}}": str(datetime.now().year),
              "{{TITOLARE}}": titolare, "{{CONTATTI}}": contatti}
    with open(os.path.join(WEB_DIR, "legale.html"), encoding="utf-8") as f:
        pagina_html = f.read()
    for k, v in valori.items():
        pagina_html = pagina_html.replace(k, v)
    return pagina_html


def crea(cartella):
    """Scrive cartella/index.html (la landing). Chiamata da main.py solo in modalita' sito, dopo il terminale."""
    if not pagina.ULTIMI.get("data"):
        log.warning("landing page non aggiornata: mancano i dati della dashboard")
        return None
    f = os.path.join(cartella, "index.html")
    home = html(pagina.ULTIMI, cartella)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(home)
    # v8.07 pagine pubbliche vere (prezzi, accedi, metodo, domande): servono a Google per le sotto-voci del risultato
    from . import pagine_pubbliche
    altre = pagine_pubbliche.crea(cartella, home)
    # v8.39 archivio pubblico dei report COT: la settimana nuova si salva nel ramo "storico" (solo su GitHub), poi le pagine
    try:
        from . import archivio_cot
        if os.environ.get("GITHUB_ACTIONS"):
            archivio_cot.salva(pagina.ULTIMI.get("data") or {})
        altre += archivio_cot.crea(cartella, home)
    except Exception as e:
        log.warning("archivio COT non creato (%s: %s)", type(e).__name__, e)
    # v8.06 icona del sito come file (per Google: favicon nei risultati e logo dell'organizzazione)
    with open(os.path.join(cartella, "favicon.svg"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(FAVICON_SVG)
    for nome, b64 in ICONE.items():                     # v8.16 icone PNG/ICO (decodificate dal base64 qui sopra)
        with open(os.path.join(cartella, nome), "wb") as fh:
            fh.write(base64.b64decode(b64))
    # note legali in /legale/ (pagina fissa, indipendente dai dati)
    os.makedirs(os.path.join(cartella, "legale"), exist_ok=True)
    with open(os.path.join(cartella, "legale", "index.html"), "w", encoding="utf-8") as fh:
        fh.write(legale())
    # v7.89 FARSI TROVARE SU GOOGLE: robots.txt (cosa indicizzare) e sitemap.xml (elenco delle pagine pubbliche).
    # Il terminale (/terminale/) e' dietro l'accesso: non serve indicizzarlo.
    oggi = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with open(os.path.join(cartella, "robots.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("User-agent: *\nAllow: /\nDisallow: /terminale/\n\nSitemap: " + SITO_PUBBLICO + "sitemap.xml\n")
    pagine = [(SITO_PUBBLICO, "1.0")] + [(u, "0.8") for u in altre] + [(SITO_PUBBLICO + "legale/", "0.3")]
    with open(os.path.join(cartella, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                 "".join(f"  <url><loc>{u}</loc><lastmod>{oggi}</lastmod><priority>{p}</priority></url>\n" for u, p in pagine) +
                 "</urlset>\n")
    # v7.94 llms.txt: presentazione in testo semplice per gli assistenti AI (ChatGPT, Claude, Perplexity, Gemini...),
    # che lo leggono per spiegare cos'e' il sito e chi l'ha fondato. Solo informazioni pubbliche, mai email private.
    with open(os.path.join(cartella, "llms.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(LLMS)
    log.info("Landing page creata: %s", f)
    return f


LLMS = """# EdgeValor

> EdgeValor (edgevalor.com) e' un terminale italiano di analisi dei mercati finanziari, fondato da Yahya Allouchi.
> Trasforma dati pubblici in informazioni pronte all'uso con un approccio di analisi quantitativa: ogni indicatore
> e' provato sullo storico e resta nel terminale solo se ha un vantaggio statistico (l'"edge").

## Fondatore
- Yahya Allouchi, fondatore di EdgeValor. Studia i mercati finanziari dal 2019: analisi quantitativa, dati
  macroeconomici, cicli economici, diversificazione e gestione del rischio.

## Cosa offre il terminale
- Portafogli modello (Conservativo, Moderato, Aggressivo) provati dal 2006, con controllo mensile e drawdown sempre visibile.
- Clima di mercato e fase delle grandi economie; posizionamento dei grandi operatori (report COT della CFTC).
- Azionario per settore, schede delle aziende, stagionalita' degli strumenti.
- Scheda Bitcoin: bussola macro (condizioni finanziarie, dollaro, credito) e termometro del sentiment.
- Piano Basic e Premium, con 14 giorni di prova; canale Telegram pubblico con le analisi settimanali.

## Fonti dei dati
CFTC, Federal Reserve (FRED), Banca Centrale Europea, Fondo Monetario Internazionale, prezzi di borsa da fornitori di dati di mercato.

## Avvertenza
Contenuti con finalita' educative e informative: non e' consulenza finanziaria personalizzata.

## Link
- Sito: https://edgevalor.com/
- Note legali e fonti: https://edgevalor.com/legale/
"""
