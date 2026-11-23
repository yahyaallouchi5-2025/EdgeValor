# -*- coding: utf-8 -*-
"""
comportamento.py - v8.71 "COMPORTAMENTO COT" (scheda Live, al posto del Backtest simulato). Idea di Ya, 22/11/2026.

COSA MOSTRA: strumento per strumento, quando i grandi speculatori iniziano a spingere (un "episodio", come in
speculatori.py), quante volte il prezzo va con loro, quanto dura la spinta, il drawdown tipico e in quali condizioni
(note all'ingresso) e' andata meglio o peggio. Niente segnali operativi: e' la descrizione onesta del dato.

REGOLE: identiche allo studio studi/studio_comportamento_cot.py (fissate prima di guardare i risultati, 22/11/2026):
  - episodio, ingresso e uscita come speculatori.py; rendimento nella direzione degli speculatori MENO i costi del
    sito (motore.costo); "a favore" = rendimento netto > 0;
  - periodi: STUDIO fino al 31/12/2014, VERIFICA dal 2015;
  - lettura: "segue" / "contro" se vale in ENTRAMBI i periodi (almeno 30 + 20 episodi, soglie 55/45%, t >= 2 nello
    studio), "corto" se mancano episodi, altrimenti "neutro"; "nota costi" se la lettura regge solo grazie ai costi;
  - condizioni all'ingresso: flusso forte, volatilita' prima (20 contro 250 sedute), ripetizione, open interest del
    future nelle 4 settimane prima, prezzo nelle 4 settimane prima, OI + prezzo ("denaro nuovo" / "ricoperture");
  - una condizione "aiuta" in una famiglia se la differenza va nella stessa direzione nei due periodi con t >= 2
    (studio) e t >= 1,5 (verifica).
USO: calcola(righe_cot, prezzi) -> {"str": {strumento: {...}}, "famc": {famiglia: [...]}, "al": ultimo episodio}
DEBUG: python -c "from cot_radar import comportamento as C; ..."  (pochi secondi su tutto l'archivio)
"""
import bisect
import math
import statistics as st

from . import motore, speculatori as SP
from .config import ASSETS
from .cot import cot_series

FINE_STUDIO = "2014-12-31"
VALUTE = ("EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "BRL", "ZAR", "USD")
INDICI = {"SP500", "NASDAQ", "DOW", "RUSSELL", "EAFE", "EM"}
TASSI = {"US2Y", "US5Y", "US10Y", "USBOND", "ULTRA"}
CRYPTO = {"BTC", "ETH"}
ULTIMI = 6                                   # episodi recenti mandati alla pagina per strumento
BANDE_GIORNI = 750                           # v8.84 episodi degli ultimi ~2 anni per il grafico giornaliero

# condizioni: (nome A, prova A, nome B, prova B) sulle informazioni dell'ingresso
COND = (("Flusso forte", lambda e: e["forte"], "Flusso normale", lambda e: not e["forte"]),
        ("Mercato calmo", lambda e: e["rv"] is not None and e["rv"] < .9,
         "Mercato agitato", lambda e: e["rv"] is not None and e["rv"] > 1.1),
        ("Prima spinta", lambda e: not e["rip"], "Ripetizione", lambda e: e["rip"]),
        ("OI in aumento", lambda e: e["oi_su"] is True, "OI in calo", lambda e: e["oi_su"] is False),
        ("Prezzo già a favore", lambda e: e["px_fav"] is True, "Prezzo contro", lambda e: e["px_fav"] is False),
        ("Denaro nuovo col prezzo", lambda e: e["oi_su"] is True and e["px_fav"] is True,
         "Ricoperture", lambda e: e["oi_su"] is False and e["px_fav"] is True))


def famiglia(k):
    if len(k) == 6 and k[:3] in VALUTE and k[3:] in VALUTE:
        return "Valute"
    return "Indici" if k in INDICI else "Tassi" if k in TASSI else "Crypto" if k in CRYPTO else "Materie prime"


def gamba_oi(k):
    """Future di cui leggere l'open interest: lo strumento stesso, la valuta non USD delle coppie col dollaro,
    None per i cross (due future: nessuna lettura univoca)."""
    if famiglia(k) == "Valute":
        if "USD" not in (k[:3], k[3:]):
            return None
        return k[3:] if k[:3] == "USD" else k[:3]
    return k


def stat(v):
    n = len(v)
    if n < 2:
        return {"n": n}
    m = sum(v) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1))
    return {"n": n, "pos": round(100 * sum(1 for x in v if x > 0) / n, 1), "media": round(m, 3),
            "t": round(m / (sd / math.sqrt(n)), 2) if sd else 0.0}


def diff(a, b):
    """t di Welch della differenza tra le medie di due gruppi (None con meno di 5 casi per parte)."""
    if len(a) < 5 or len(b) < 5:
        return None
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    se = math.sqrt(va / len(a) + vb / len(b))
    return {"d": round(ma - mb, 3), "t": round((ma - mb) / se, 2) if se else 0.0}


def lettura(s, v):
    if s.get("n", 0) < 30 or v.get("n", 0) < 20:
        return "corto"
    if s["pos"] >= 55 and s["media"] > 0 and s["t"] >= 2 and v["pos"] > 50 and v["media"] > 0:
        return "segue"
    if s["pos"] <= 45 and s["media"] < 0 and s["t"] <= -2 and v["pos"] < 50 and v["media"] < 0:
        return "contro"
    return "neutro"


def costo(k):
    return motore.costo(k, k[:3], k[3:]) if famiglia(k) == "Valute" else motore.costo(k)


def episodi_tutti(righe_cot, prezzi, bande=None):
    """Un record per episodio CHIUSO con esito netto e condizioni all'ingresso.
    v8.84 bande = dizionario da riempire (facoltativo): {strumento: [[ingresso, uscita o None se in corso, verso,
    1 se spinta forte, settimane]]} degli episodi degli ultimi 2 anni, ANCHE quello in corso. Servono al grafico
    giornaliero della scheda Live (13c_candele.js): fasce verdi/rosse dove gli speculatori spingevano."""
    from datetime import date, timedelta
    dal_bande = (date.today() - timedelta(days=BANDE_GIORNI)).isoformat()
    serie = cot_series(righe_cot)
    oi = {a[0]: {x["date"]: x["oi"] for x in serie[a[1]]} for a in ASSETS if a[1] in serie}
    out = []
    for k, st_ in SP.direzioni(righe_cot, prezzi).items():
        pts, cls = st_["pts"], st_["cls"]
        date_px = [p[0] for p in pts]
        indice = {d: i for i, d in enumerate(date_px)}
        sett = [x[0] for x in st_["sett"]]
        pos_sett = {d: i for i, d in enumerate(sett)}
        g, cst = gamba_oi(k), costo(k)
        for e in SP.episodi(st_, None):
            if bande is not None and e["ing"] >= dal_bande:
                bande.setdefault(k, []).append([e["ing"], None if e["attivo"] else e["usc"], e["verso"],
                                                1 if e["aggr"] else 0, e["sett"]])
            if e["attivo"]:
                continue
            v, a, b = e["verso"], indice[e["ing"]], indice[e["usc"]]
            i0 = pos_sett[e["inizio"]]
            ris = (pts[b][1] / pts[a][1] - 1) * 100 * v - cst
            v20, v250 = SP._vol(pts, max(1, a - 20), a), SP._vol(pts, max(1, a - 250), a)
            rv = round(v20 / v250, 2) if v20 and v250 and a >= 250 else None   # arrotondato come nello studio
            oi_su = px_fav = None
            if i0 >= 4:
                d0, d4 = sett[i0], sett[i0 - 4]
                if g and g in oi and d0 in oi[g] and d4 in oi[g] and oi[g][d0] != oi[g][d4]:
                    oi_su = oi[g][d0] > oi[g][d4]
                # ultima chiusura nota al martedi' del report e 4 martedi' prima
                j0, j4 = bisect.bisect_right(date_px, d0) - 1, bisect.bisect_right(date_px, d4) - 1
                if j4 >= 0 and j0 > j4:
                    px_fav = (pts[j0][1] - pts[j4][1]) * v > 0
            out.append({"k": k, "inizio": e["inizio"], "fine": e["fine"], "verso": v, "sett": e["sett"],
                        "ris": round(ris, 3), "mfe": e["mfe"], "mae": e["mae"], "g_mae": e["g_mae"],
                        "forte": e["aggr"], "rip": e["rip"], "rv": rv, "oi_su": oi_su, "px_fav": px_fav,
                        "studio": e["inizio"] <= FINE_STUDIO})
    return out


def _quota(E):
    return {"n": len(E), "pos": round(100 * sum(1 for e in E if e["ris"] > 0) / len(E))} if E else None


def calcola(righe_cot, prezzi):
    if not righe_cot or not prezzi:
        return None
    bande = {}
    T = episodi_tutti(righe_cot, prezzi, bande)
    if not T:
        return None
    per = {}
    for e in T:
        per.setdefault(e["k"], []).append(e)
    out = {}
    for k, E in per.items():
        E.sort(key=lambda e: e["inizio"])
        s, v = stat([e["ris"] for e in E if e["studio"]]), stat([e["ris"] for e in E if not e["studio"]])
        if v.get("n", 0) < 10:                    # troppo poco anche solo per descrivere
            continue
        l, cst = lettura(s, v), costo(k)
        lordo_v = stat([e["ris"] + cst for e in E if not e["studio"]])
        # la lettura regge solo grazie ai costi stimati: senza costi, nella verifica il segno si gira
        nota = ("costi" if l in ("segue", "contro") and lordo_v.get("media") is not None
                and (lordo_v["media"] > 0) != (l == "segue") else None)
        n = len(E)
        durd = [sum(1 for e in E if (e["sett"] == i if i < 4 else e["sett"] >= 4)) for i in (1, 2, 3, 4)]
        cond = {}
        for na, fa, nb, fb in COND:
            cond[na], cond[nb] = _quota([e for e in E if fa(e)]), _quota([e for e in E if fb(e)])
        out[k] = {"fam": famiglia(k), "s": s, "v": v, "lett": l, "nota": nota, "cst": cst,
                  "dur": round(sum(e["sett"] for e in E) / n, 1), "durd": [round(100 * x / n) for x in durd],
                  "mfe": round(st.median(e["mfe"] for e in E), 2), "mae": round(st.median(e["mae"] for e in E), 2),
                  "gmae": round(st.median(e["g_mae"] for e in E)), "cond": cond,
                  "ultimi": [{x: e[x] for x in ("inizio", "fine", "verso", "sett", "forte", "ris", "mae", "oi_su", "px_fav")}
                             for e in E[-ULTIMI:]][::-1]}
    famc = {}
    for fam in ("Valute", "Materie prime", "Indici", "Tassi", "Crypto"):
        F = [e for e in T if famiglia(e["k"]) == fam]
        righe = []
        for na, fa, nb, fb in COND:
            ds = diff([e["ris"] for e in F if fa(e) and e["studio"]], [e["ris"] for e in F if fb(e) and e["studio"]])
            dv = diff([e["ris"] for e in F if fa(e) and not e["studio"]], [e["ris"] for e in F if fb(e) and not e["studio"]])
            ok = bool(ds and dv and ((ds["t"] >= 2 and dv["t"] >= 1.5) or (ds["t"] <= -2 and dv["t"] <= -1.5)))
            righe.append({"a": na, "b": nb, "ok": ok})
        famc[fam] = righe
    return {"str": out, "famc": famc, "al": max(e["fine"] for e in T), "n": len(T), "ep": bande}
