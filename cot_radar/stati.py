# -*- coding: utf-8 -*-
"""
stati.py - v9.67 REGISTRO UNICO DEI CAMBI DI STATO (idea di Ya, 28/11/2026: "e' il motore che gira e deve girare bene").

A COSA SERVE
  Il terminale calcola tanti "stati" che cambiano di rado: la fase del ciclo economico di un paese, l'allarme
  recessione, la modalita' di mercato, il clima (paura / neutro / fiducia), la politica dei tassi di una valuta...
  Prima ogni scheda si calcolava il suo "prima" per conto proprio (e le Novita' lo ricalcolavano nel browser).
  Qui c'e' UN SOLO registro: per ogni indicatore lo stato di oggi, DA QUANDO, e lo stato di PRIMA.
  Da qui leggono: le Novita' (elenco "Mercati": "prima -> dopo"), le card ("favorevoli dal 12/11, prima sfavorevoli")
  e la scheda Live.

REGOLE (uguali per tutti, in un posto solo)
  1) Uno stato nuovo NON vale subito: deve essere osservato per `conferma` giorni DIVERSI di fila (un giorno = una
     data; piu' giri nello stesso giorno contano una volta). Se nel frattempo torna quello di prima, il conto riparte.
     conferma = 1 per le fonti che si confermano gia' da sole (ciclo economico: 2 mesi; modalita': 7 giorni di borsa;
     ciclo del debito: 2 trimestri) e per i dati mensili; 3 per i dati che cambiano ogni giorno (clima).
  2) La DATA del cambio e' il giorno in cui il terminale lo ha CONFERMATO (non il mese del dato): cosi' nelle Novita'
     compare in cima il giorno in cui succede. Nel registro resta anche "visto_dal" (primo giorno osservato).
  3) PRIMA VOLTA che si vede un indicatore: si scrive lo stato senza creare un cambio (niente raffica di avvisi alla
     partenza). Eccezione: il "seme", cioe' il cambio che la fonte conosce gia' con la sua data (es. economie.py:
     "Stagflazione -> Recessione, agosto 2026"): si registra con QUELLA data, cosi' lo storico non parte vuoto.
  4) Dato mancante (stato None) = non si tocca niente: mai un cambio inventato da una fonte che non risponde.
  5) Il registro si scrive SOLO dopo che l'aggiornamento e' stato approvato (main.py -> stati.salva(), come
     registro.salva): un giro con dati sospetti non lascia cambi finti.

FILE: storico/stati.json  (ramo "storico", salvato dal workflow del sito)
  {"v": 1, "agg": "AAAA-MM-GG",
   "stati": {chiave: {"nome", "gruppo", "stato", "dal", "prima", "attesa": {"stato", "n", "dal", "ultimo"}?}},
   "cambi": [{"k", "nome", "gruppo", "prima", "dopo", "d", "visto_dal"?, "seme"?}, ...]}   # i piu' recenti in fondo

DEBUG
  python -c "from cot_radar import stati; import json; print(json.dumps(stati.leggi(), indent=1, ensure_ascii=False)[:2000])"
  Per capire perche' un cambio non scatta: guarda "attesa" dell'indicatore (stato visto, n giorni su `conferma`).
"""
import json
import os
from datetime import date, datetime, timedelta

from .log import log

FILE = "stati.json"
MAX_CAMBI = 120            # cambi tenuti nel registro (i piu' vecchi escono)
GIORNI_PAGINA = 60         # la pagina riceve i cambi degli ultimi 60 giorni (elenco "Mercati" delle Novita')
CLIMA_SOGLIA = 30          # clima >= +30 FIDUCIA, <= -30 PAURA, in mezzo NEUTRO (stessa soglia di 04_dashboard.js)
CLIMA_CONFERMA = 3         # il clima si muove ogni giorno: 3 giorni di fila prima di dire che e' cambiato
NOMI_MODALITA = {"PESSIMISMO": "Pessimismo", "NORMALE": "Normale", "ECCESSO": "Eccesso"}
FASI_DEBITO = ["Espansione", "Bolla", "Picco", "Crisi", "Riduzione del debito"]
NOMI_POLITICA = {"rialzo": "Tassi in rialzo", "taglio": "Tassi in calo", "ferma": "Tassi fermi"}

_in_attesa = None          # (cartella, registro) da scrivere con salva()


# --------------------------------------------------------------------------- lettura / scrittura
def _vuoto():
    return {"v": 1, "agg": None, "stati": {}, "cambi": []}


def leggi(cartella=None):
    """Registro salvato (o vuoto). Un file rovinato non blocca il sito: si riparte da vuoto e lo si scrive nel log."""
    if not cartella:
        from . import storico
        cartella = storico.CARTELLA
    try:
        with open(os.path.join(cartella, FILE), encoding="utf-8") as fh:
            r = json.load(fh)
        if isinstance(r, dict) and isinstance(r.get("stati"), dict) and isinstance(r.get("cambi"), list):
            return r
        log.warning("stati.json con formato inatteso: riparto da vuoto")
    except FileNotFoundError:
        pass
    except (OSError, ValueError) as e:
        log.warning("stati.json non letto (%s): riparto da vuoto", type(e).__name__)
    return _vuoto()


def salva():
    """Scrive il registro in attesa. Da chiamare SOLO ad aggiornamento approvato (main.py). Restituisce True se ha scritto."""
    global _in_attesa
    if not _in_attesa:
        return False
    cartella, reg = _in_attesa
    try:
        os.makedirs(cartella, exist_ok=True)
        tmp = os.path.join(cartella, FILE + ".tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(reg, fh, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, os.path.join(cartella, FILE))          # scrittura atomica: mai un file a meta'
    except OSError as e:
        log.error("registro degli stati NON salvato (%s): i cambi di questo giro si ricalcolano al prossimo", e)
        return False
    _in_attesa = None
    return True


# --------------------------------------------------------------------------- il motore
def _mese_dopo(mese):
    """'2026-08' -> '2026-09-01' (un cambio di fase del mese M si conosce dal mese dopo)."""
    a, m = (int(x) for x in mese.split("-"))
    a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return "%04d-%02d-01" % (a, m)


def _trimestre(q):
    """'2026-T2' -> '2026-04-01'."""
    a, t = q.split("-T")
    return "%s-%02d-01" % (a, (int(t) - 1) * 3 + 1)


def applica(reg, osservazioni, oggi):
    """Aggiorna il registro `reg` (sul posto) con le osservazioni di oggi. Restituisce i cambi NUOVI di questo giro.
    osservazione = {"k", "nome", "gruppo", "stato", "conferma": giorni (default 1), "seme": {"prima", "dal"} facoltativo}."""
    nuovi = []
    for o in osservazioni:
        k, stato = o.get("k"), o.get("stato")
        if not k or stato is None:                      # regola 4: dato mancante = non si tocca niente
            continue
        conferma = max(1, int(o.get("conferma") or 1))
        r = reg["stati"].get(k)
        if r is None:                                   # regola 3: prima volta
            seme = o.get("seme") or {}
            r = reg["stati"][k] = {"nome": o["nome"], "gruppo": o["gruppo"], "stato": stato,
                                   "dal": seme.get("dal") or oggi, "prima": None}
            if seme.get("prima") and seme["prima"] != stato and seme.get("dal"):
                r["prima"] = seme["prima"]
                c = {"k": k, "nome": o["nome"], "gruppo": o["gruppo"], "prima": seme["prima"], "dopo": stato,
                     "d": seme["dal"], "seme": True}
                reg["cambi"].append(c)
                nuovi.append(c)
            continue
        r["nome"], r["gruppo"] = o["nome"], o["gruppo"]  # il nome puo' essere ritoccato senza perdere la storia
        if stato == r["stato"]:
            r.pop("attesa", None)                       # tornato allo stato di prima: il conto riparte
            continue
        a = r.get("attesa")
        if not a or a.get("stato") != stato:
            a = {"stato": stato, "n": 0, "dal": oggi, "ultimo": None}
        if a["ultimo"] != oggi:                         # regola 1: un giorno conta una volta sola
            a["n"] += 1
            a["ultimo"] = oggi
        if a["n"] >= conferma:
            c = {"k": k, "nome": o["nome"], "gruppo": o["gruppo"], "prima": r["stato"], "dopo": stato, "d": oggi}
            if a["dal"] != oggi:
                c["visto_dal"] = a["dal"]
            r["prima"], r["stato"], r["dal"] = r["stato"], stato, oggi
            r.pop("attesa", None)
            reg["cambi"].append(c)
            nuovi.append(c)
        else:
            r["attesa"] = a
    reg["cambi"] = sorted(reg["cambi"], key=lambda c: c["d"])[-MAX_CAMBI:]
    reg["agg"] = oggi
    return nuovi


# --------------------------------------------------------------------------- le osservazioni di oggi
def osserva(quadro=None, market=None, carry=None):
    """Legge gli stati di oggi dai blocchi gia' calcolati della pagina. Ogni blocco e' facoltativo (None = saltato).
    quadro = economie.calcola() (+ "modalita" e "debito"), market = {"risk": ...}, carry = pagina del carry ("politica")."""
    out = []
    for x in (quadro or {}).get("economie") or []:
        if not x.get("id"):
            continue
        c = x.get("cambio") or {}
        # ciclo economico: vale la fase CONFERMATA (2 mesi di fila, economie.py); senza cambi recenti, la fase di oggi
        out.append({"k": "ciclo:" + x["id"], "nome": "Ciclo economico " + x["nome"], "gruppo": "ciclo",
                    "stato": c.get("dopo") or x.get("regime"),
                    "seme": {"prima": c.get("prima"), "dal": _mese_dopo(c["mese"])} if c.get("mese") else None})
        if x.get("allarme") is not None:
            out.append({"k": "allarme:" + x["id"], "nome": "Allarme recessione " + x["nome"], "gruppo": "allarme",
                        "stato": "Acceso" if x["allarme"] else "Spento"})
    m = (quadro or {}).get("modalita") or {}
    if m.get("modo"):
        out.append({"k": "modalita", "nome": "Modalità di mercato", "gruppo": "modalita",
                    "stato": NOMI_MODALITA.get(m["modo"], m["modo"]),
                    "seme": {"prima": NOMI_MODALITA.get(m.get("prima"), m.get("prima")), "dal": m.get("conf")}
                    if m.get("prima") and m.get("conf") else None})
    d = (quadro or {}).get("debito") or {}
    storia = d.get("storia") or []
    if len(storia) > 2:                                 # fase confermata = uguale per 2 trimestri di fila
        cur, serie, ult = None, 0, None
        for i, (q, f) in enumerate(storia):
            serie = serie + 1 if i and storia[i - 1][1] == f else 1
            if f != cur and serie >= 2:
                if cur is not None:
                    ult = {"prima": cur, "dopo": f, "q": q}
                cur = f
        if cur is not None and 0 <= cur < len(FASI_DEBITO):
            out.append({"k": "debito", "nome": "Ciclo del debito USA", "gruppo": "debito", "stato": FASI_DEBITO[cur],
                        "seme": {"prima": FASI_DEBITO[ult["prima"]], "dal": _trimestre(ult["q"])}
                        if ult and 0 <= ult["prima"] < len(FASI_DEBITO) else None})
    r = (market or {}).get("risk")
    if isinstance(r, (int, float)):
        out.append({"k": "clima", "nome": "Clima del mercato", "gruppo": "clima", "conferma": CLIMA_CONFERMA,
                    "stato": "Fiducia" if r >= CLIMA_SOGLIA else "Paura" if r <= -CLIMA_SOGLIA else "Neutro"})
    for val, p in sorted(((carry or {}).get("politica") or {}).items()):
        if p.get("stato") in NOMI_POLITICA:
            out.append({"k": "tassi:" + val, "nome": "Politica dei tassi " + val, "gruppo": "tassi",
                        "stato": NOMI_POLITICA[p["stato"]]})
    return out


# --------------------------------------------------------------------------- per la pagina
PUBBLICI = ("ciclo", "allarme", "modalita", "debito", "clima")     # gia' visibili a tutti nella Dashboard


def vista(reg, oggi, premium=False):
    """Blocco per la pagina: stati (con "dal" e "prima") e cambi degli ultimi GIORNI_PAGINA giorni, i piu' recenti prima.
    premium=False -> solo i gruppi PUBBLICI; premium=True -> solo gli altri (vanno nel file Premium)."""
    ok = (lambda g: g not in PUBBLICI) if premium else (lambda g: g in PUBBLICI)
    dal = (date.fromisoformat(oggi) - timedelta(days=GIORNI_PAGINA)).isoformat()
    stati = {k: {x: v[x] for x in ("nome", "gruppo", "stato", "dal", "prima") if v.get(x) is not None}
             for k, v in reg["stati"].items() if ok(v.get("gruppo"))}
    cambi = [{x: c[x] for x in ("k", "nome", "gruppo", "prima", "dopo", "d")}
             for c in reversed(reg["cambi"]) if c["d"] >= dal and ok(c.get("gruppo"))]
    return {"agg": reg.get("agg"), "stati": stati, "cambi": cambi}


def aggiorna(cartella, quadro=None, market=None, carry=None, oggi=None):
    """Tutto insieme (chiamata da pagina.py): legge il registro, applica le osservazioni di oggi, lo tiene in attesa
    per salva() e restituisce (vista pubblica, vista Premium). Senza cartella (demo, PC senza archivio) lavora in
    memoria: la pagina mostra comunque i "semi" delle fonti. Mai un'eccezione verso la pagina: la chiama in try."""
    global _in_attesa
    oggi = oggi or datetime.now().strftime("%Y-%m-%d")
    reg = leggi(cartella) if cartella else _vuoto()
    nuovi = applica(reg, osserva(quadro, market, carry), oggi)
    for c in nuovi:
        if not c.get("seme"):
            log.info("CAMBIO DI STATO: %s: %s -> %s", c["nome"], c["prima"], c["dopo"])
    if cartella:
        _in_attesa = (cartella, reg)
    return vista(reg, oggi), vista(reg, oggi, premium=True)
