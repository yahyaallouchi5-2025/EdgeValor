# -*- coding: utf-8 -*-
"""
studio_roic.py - v8.39 STUDIO: ROIC E COPERTURA DEGLI INTERESSI ANTICIPANO RENDIMENTI MIGLIORI? (libro CFA Vol. 3,
"Financial Statement Analysis": rendimento del capitale investito e capacita' di pagare gli interessi) - Ya, 20/11/2026.

DEFINIZIONI (ogni 31 marzo, SOLO con bilanci 10-K gia' depositati quel giorno, valore della PRIMA pubblicazione):
  ROIC      = utile operativo x (1 - aliquota) / capitale investito
              aliquota = imposte / utile ante imposte dello stesso anno, limitata tra 0 e 35% (manca -> 25%)
              capitale investito = debito (totale, oppure lungo + breve) + patrimonio netto - cassa; se <= 0 escluso
  COPERTURA = utile operativo / interessi passivi (nessun interesse o nessun debito = copertura piena)
REGOLE FISSATE PRIMA DI VEDERE I RISULTATI
  - titoli USA del sito (S&P 500 e Nasdaq-100), esclusi finanziari e immobiliari (come studio_qualita);
  - CREA VALORE = ROIC >= 10% negli ULTIMI DUE anni fiscali (sopra un costo del capitale tipico: valore che dura);
  - DISTRUGGE  = ROIC < 5% nell'ultimo anno (sotto il costo del capitale);
  - FRAGILE    = copertura < 3 nell'ultimo anno (utile operativo meno di 3 volte gli interessi, o negativo con debito);
  - rendimento a 12 mesi: fine marzo -> fine marzo dell'anno dopo (prezzi mensili rettificati EODHD del sito);
  - misura principale: CREA VALORE meno TUTTI, un'osservazione per anno; sviluppo 2010-2017, verifica 2018-2025;
  - VANTAGGIO solo se la media e' > 0 in ENTRAMBI i periodi E il limite basso (z = 2,81) e' > 0 sull'intero periodo
    (stessa regola di studio_qualita); in piu' il test sulle coppie di verifica_stat sugli anni.
  - FRAGILE: avviso utile solo se FRAGILE meno TUTTI e' < 0 in entrambi i periodi.
LIMITE NOTO: titoli presenti OGGI negli indici (sopravvissuti): pesa su tutti i gruppi, per questo conta la differenza.
USO:  python studi/studio_roic.py scarica <cartella cache> <file sec_cik.json>     (SEC companyfacts, SEC_CONTATTO)
      python studi/studio_roic.py studio  <cartella cache> <cartella grezzi prezzi>
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cot_radar import azioni as A, fondamentali as F, verifica_stat as V   # noqa: E402

VOCI = {"ebit": (["OperatingIncomeLoss"], True),
        "interessi": (["InterestExpense", "InterestExpenseNonoperating", "InterestExpenseDebt", "InterestAndDebtExpense"], True),
        "tasse": (["IncomeTaxExpenseBenefit"], True),
        "ante": (["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
                  "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"], True)}
VOCI.update({k: F.VOCI_STORIA[k] for k in ("debito", "debito_lungo", "debito_breve", "cassa", "pn")})
ANNI, TAGLIO, Z, ESCLUSI = range(2010, 2026), 2018, 2.81, ("fin", "imm")


def scarica(cache, file_cik):
    ua = f"EdgeValor studio {os.environ.get('SEC_CONTATTO', 'info@edgevalor.com')}"
    mappa = json.load(open(file_cik))["mappa"]
    os.makedirs(cache, exist_ok=True)
    for x in F.titoli_usa(A.elenco()):
        f = os.path.join(cache, x["t"] + ".json")
        if x.get("s") in ESCLUSI or os.path.exists(f):
            continue
        cik = mappa.get(x["t"].upper()) or mappa.get(x["t"].upper().replace(".", "-"))
        fatti = F._get(F.URL_FATTI.format(cik=cik), ua) if cik else None
        time.sleep(0.15)                                   # gentile con la SEC
        if fatti:
            json.dump({k: F._prima_pubblicazione(fatti, c, d) for k, (c, d) in VOCI.items()}, open(f, "w"))
        print(x["t"], "ok" if fatti else "assente", flush=True)


def noti(serie, voce, data):
    return {fn: v for fn, v, dep in (serie.get(voce) or []) if dep <= data and v is not None}


def _vicino(d, fine):
    """valore con data di fine entro 10 giorni (gli anni fiscali a 52/53 settimane cambiano di qualche giorno)."""
    for k, v in d.items():
        if abs((int(k[:4]) * 372 + int(k[5:7]) * 31 + int(k[8:10])) - (int(fine[:4]) * 372 + int(fine[5:7]) * 31 + int(fine[8:10]))) <= 10:
            return v
    return None


def misure(s, data):
    """[(fine, roic, copertura)] degli anni fiscali noti alla data (dal piu' vecchio), solo anni completi."""
    eb, pn = noti(s, "ebit", data), noti(s, "pn", data)
    out = []
    for fine in sorted(eb):
        p = _vicino(pn, fine)
        if p is None:
            continue
        deb = _vicino(noti(s, "debito", data), fine)
        if deb is None:
            deb = (_vicino(noti(s, "debito_lungo", data), fine) or 0) + (_vicino(noti(s, "debito_breve", data), fine) or 0)
        cassa = _vicino(noti(s, "cassa", data), fine) or 0
        tasse, ante = _vicino(noti(s, "tasse", data), fine), _vicino(noti(s, "ante", data), fine)
        ali = min(0.35, max(0.0, tasse / ante)) if tasse is not None and ante and ante > 0 else 0.25
        cap = deb + p - cassa
        roic = eb[fine] * (1 - ali) / cap if cap > 0 else None
        inter = _vicino(noti(s, "interessi", data), fine)
        cop = math.inf if (not inter or inter <= 0 or deb <= 0) else eb[fine] / inter
        out.append((fine, roic, cop))
    return out


def prezzo_mese(px, mese):
    return px.get(mese)


def sintesi(x):
    n = len(x)
    if n < 3:
        return None
    m = sum(x) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in x) / (n - 1))
    e = Z * sd / math.sqrt(n)
    return {"anni": n, "media_%": round(m * 100, 2), "ic_%": [round((m - e) * 100, 2), round((m + e) * 100, 2)]}


def studio(cache, grezzi):
    dati = {}
    for x in F.titoli_usa(A.elenco()):
        f, g = os.path.join(cache, x["t"] + ".json"), os.path.join(grezzi, x["t"] + ".json")
        if x.get("s") in ESCLUSI or not os.path.exists(f) or not os.path.exists(g):
            continue
        dati[x["t"]] = (json.load(open(f)), dict(json.load(open(g)).get("m") or []))
    print("titoli con bilanci e prezzi:", len(dati))
    per_anno = {}
    for a in ANNI:
        data = f"{a}-03-31"
        gr = {"crea": [], "distrugge": [], "fragile": [], "tutti": []}
        for t, (s, px) in dati.items():
            p0, p1 = px.get(f"{a}-03"), px.get(f"{a + 1}-03")
            if not p0 or not p1:
                continue
            m = [x for x in misure(s, data) if x[0] >= f"{a - 2}-01-01"]    # bilanci troppo vecchi: niente giudizio
            if not m or m[-1][1] is None:
                continue
            r = p1 / p0 - 1
            gr["tutti"].append(r)
            if len(m) >= 2 and all(x[1] is not None and x[1] >= 0.10 for x in m[-2:]):
                gr["crea"].append(r)
            if m[-1][1] < 0.05:
                gr["distrugge"].append(r)
            if m[-1][2] < 3:
                gr["fragile"].append(r)
        med = {k: sum(v) / len(v) for k, v in gr.items() if len(v) >= 5}
        if len(med) == 4:
            per_anno[a] = {"n": {k: len(v) for k, v in gr.items()},
                           **{f"{k}_meno_tutti": med[k] - med["tutti"] for k in ("crea", "distrugge", "fragile")},
                           "crea_meno_distrugge": med["crea"] - med["distrugge"]}
            print(a, per_anno[a]["n"], {k: round(v * 100, 1) for k, v in per_anno[a].items() if k != "n"})
    out = {}
    for mis in ("crea_meno_tutti", "distrugge_meno_tutti", "fragile_meno_tutti", "crea_meno_distrugge"):
        out[mis] = {per: sintesi([v[mis] for a, v in per_anno.items() if ok(a)])
                    for per, ok in (("sviluppo", lambda a: a < TAGLIO), ("verifica", lambda a: a >= TAGLIO),
                                    ("tutto", lambda a: True))}
        c = V.coppie([v[mis] for v in per_anno.values()])
        out[mis]["coppie"] = {"p_t": round(c["p_t"], 4), "p_segni": round(c["p_segni"], 4), "meglio": c["meglio"],
                              "peggio": c["peggio"]} if c else None
    p = out["crea_meno_tutti"]
    out["VANTAGGIO_ROIC"] = bool(p["sviluppo"] and p["verifica"] and p["sviluppo"]["media_%"] > 0
                                 and p["verifica"]["media_%"] > 0 and p["tutto"]["ic_%"][0] > 0)
    q = out["fragile_meno_tutti"]
    out["AVVISO_FRAGILE"] = bool(q["sviluppo"] and q["verifica"] and q["sviluppo"]["media_%"] < 0
                                 and q["verifica"]["media_%"] < 0)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    {"scarica": scarica, "studio": studio}[sys.argv[1]](*sys.argv[2:])
