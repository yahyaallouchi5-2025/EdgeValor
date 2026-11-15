# -*- coding: utf-8 -*-
"""
vetrina.py - LANDING PAGE del sito (public/index.html). Il terminale sta in public/terminale/.

Prende il modello web/landing.html e ci mette i numeri VERI dell'ultimo aggiornamento (pagina.ULTIMI):
mercati seguiti, inizio del backtest e le anteprime delle schede ("Dentro il terminale", vedi dentro()).
Nessun numero inventato: se un dato manca si scrive "n.d." e la pagina resta comunque valida.

DEBUG: python -c "from cot_radar import vetrina; print(vetrina.html({'data':{'assets':{},'pairs':[]}})[:300])"
"""
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime
from html import escape, unescape

from . import pagina, riepilogo
from .config import CONTATTO_EMAIL, FEEDBACK_CHIAVE, NORMAL, SECTORS, STRONG, TELEGRAM_CANALE, TITOLARE, WEB_DIR
from .log import log

# favicon: barra luminosa + BO/ED (logo v3 "BOARD EDGE" in miniatura)
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' "
           "rx='14' fill='%230a1628'/%3E%3Crect x='10' y='12' width='6' height='40' rx='3' fill='%232ec4b6'/%3E%3Ctext x='22' "
           "y='31' font-family='Arial,Helvetica,sans-serif' font-weight='900' font-size='19' fill='%23eef5ff'%3EBO%3C/text%3E"
           "%3Ctext x='22' y='51' font-family='Arial,Helvetica,sans-serif' font-weight='900' font-size='19' fill='%235b9bff'%3EED"
           "%3C/text%3E%3C/svg%3E")


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
    righe = [{"n": r.get("nome"), "pil": r.get("pil"), "tend": r.get("tend"), "a1": r["b"].get("a1"),
              "su": r["b"].get("su"), "reg": r["b"].get("reg")} for r in p.get("paesi") or [] if r.get("b")]
    return {"righe": righe[:5], "tot": len(p.get("paesi") or []), "anno": p.get("anno")} if righe else None


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
        "{{FAVICON}}": FAVICON,
        "{{N_SEGNALI}}": str(sum(len(v) for v in attivi.values())),
        "{{N_MERCATI}}": str(len(mercati)),
        "{{N_COPPIE}}": str(len(dati.get("pairs") or [])),
        "{{BT_DAL}}": dal or "n.d.",
        "{{ANNI_BT}}": str(datetime.now().year - int(dal)) if dal.isdigit() else "0",
        "{{AGGIORNATO}}": datetime.now().strftime("%d/%m/%Y"),
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
                    f'<a href="{escape(TELEGRAM_CANALE)}" target="_blank" rel="noopener">BoardEdge</a>.')
    valori = {"{{FAVICON}}": FAVICON, "{{TELEGRAM}}": TELEGRAM_CANALE, "{{STATISTICHE}}": pagina.statistiche(),
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
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(html(pagina.ULTIMI, cartella))
    # note legali in /legale/ (pagina fissa, indipendente dai dati)
    os.makedirs(os.path.join(cartella, "legale"), exist_ok=True)
    with open(os.path.join(cartella, "legale", "index.html"), "w", encoding="utf-8") as fh:
        fh.write(legale())
    log.info("Landing page creata: %s", f)
    return f
