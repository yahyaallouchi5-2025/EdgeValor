# -*- coding: utf-8 -*-
"""
studio_allarmi.py - v8.42 STUDIO: I "SEGNALI D'ALLARME SUI CONTI" ANTICIPANO RENDIMENTI PEGGIORI?
(libro CFA Vol. 4 "Financial Statement Analysis", cap. 10 "Warning signs") - Ya, 20/11/2026.

I QUATTRO SEGNALI DEL LIBRO (ogni 31 marzo, SOLO con i 10-K gia' depositati, valore della PRIMA pubblicazione;
f = ultimo anno fiscale noto, p = anno prima, entrambi con i dati necessari):
  S1 CREDITI     crediti / ricavi sale di oltre il 10% da p a f (i giorni di incasso si allungano)
  S2 MAGAZZINO   crescita del magazzino meno crescita dei ricavi > 10 punti (magazzino > 0 in entrambi gli anni)
  S3 CASSA       utile positivo e flusso di cassa operativo SOTTO l'utile negli ultimi 2 anni (utili non incassati)
  S4 ROTAZIONE   ricavi / attivo in calo in ciascuno degli ultimi 2 anni e di oltre il 10% in tutto
REGOLE FISSATE PRIMA DI VEDERE I RISULTATI
  - titoli USA del sito (S&P 500 e Nasdaq-100), esclusi finanziari e immobiliari; bilancio non piu' vecchio di 2 anni;
  - ALLARME = almeno 2 segnali su quelli calcolabili; rendimento 12 mesi fine marzo -> fine marzo (prezzi EODHD);
  - misura principale: ALLARME meno TUTTI, un'osservazione per anno; sviluppo 2010-2017, verifica 2018-2025;
  - AVVISO utile solo se la media e' < 0 in ENTRAMBI i periodi E il limite ALTO (z = 2,81) sull'intero periodo
    e' < 0 (stessa severita' di studio_qualita, a specchio); in piu' il test sulle coppie (verifica_stat);
  - si riportano anche i segnali uno per uno (stessa misura), per sapere quale conta.
LIMITE NOTO: titoli presenti OGGI negli indici (sopravvissuti): le aziende finite male per i conti mancano, quindi un
  eventuale effetto e' SOTTOSTIMATO (gioca contro l'avviso, non a favore).
USO:  python studi/studio_allarmi.py scarica <cartella cache> <file sec_cik.json>   (SEC companyfacts)
      python studi/studio_allarmi.py studio  <cartella cache> <cartella grezzi prezzi>
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cot_radar import azioni as A, fondamentali as F, verifica_stat as V   # noqa: E402
from studio_roic import ANNI, ESCLUSI, TAGLIO, Z, _vicino, noti, sintesi   # noqa: E402

VOCI = {"ricavi": (F.RICAVI, True), "utile": (F.UTILE, True), "fco": (F.FCO, True),
        "crediti": (["AccountsReceivableNetCurrent", "ReceivablesNetCurrent", "AccountsNotesAndLoansReceivableNetCurrent"], False),
        "magazzino": (["InventoryNet", "InventoryFinishedGoodsNetOfReserves"], False),
        "attivo": (["Assets"], False)}
SEGNALI = ("crediti", "magazzino", "cassa", "rotazione")


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
        time.sleep(0.15)
        if fatti:
            json.dump({k: F._prima_pubblicazione(fatti, c, d) for k, (c, d) in VOCI.items()}, open(f, "w"))
        print(x["t"], "ok" if fatti else "assente", flush=True)


def segnali(s, data):
    """{segnale: True/False} dei segnali CALCOLABILI alla data (manca il dato = segnale assente dal conto)."""
    ric = noti(s, "ricavi", data)
    fini = sorted(ric)
    if len(fini) < 2 or fini[-1] < f"{int(data[:4]) - 2}-01-01":
        return None
    f, p = fini[-1], fini[-2]
    out = {}
    cr = noti(s, "crediti", data)
    cf, cp = _vicino(cr, f), _vicino(cr, p)
    if cf is not None and cp and ric[f] > 0 and ric[p] > 0:
        out["crediti"] = (cf / ric[f]) / (cp / ric[p]) > 1.10
    mg = noti(s, "magazzino", data)
    mf, mp = _vicino(mg, f), _vicino(mg, p)
    if mf and mp and mf > 0 and mp > 0 and ric[p] > 0:
        out["magazzino"] = (mf / mp - 1) - (ric[f] / ric[p] - 1) > 0.10
    ut, fc = noti(s, "utile", data), noti(s, "fco", data)
    u = [_vicino(ut, x) for x in (p, f)]
    c = [_vicino(fc, x) for x in (p, f)]
    if None not in u and None not in c:
        out["cassa"] = all(u[k] > 0 and c[k] < u[k] for k in range(2))
    if len(fini) >= 3:
        at = noti(s, "attivo", data)
        r = [ric[x] / _vicino(at, x) if _vicino(at, x) else None for x in fini[-3:]]
        if None not in r:
            out["rotazione"] = r[2] < r[1] < r[0] and r[2] / r[0] < 0.90
    return out


def studio(cache, grezzi):
    dati = {}
    for x in F.titoli_usa(A.elenco()):
        f, g = os.path.join(cache, x["t"] + ".json"), os.path.join(grezzi, x["t"] + ".json")
        if x.get("s") in ESCLUSI or not os.path.exists(f) or not os.path.exists(g):
            continue
        dati[x["t"]] = (json.load(open(f)), dict(json.load(open(g)).get("m") or []))
    print("titoli con bilanci e prezzi:", len(dati))
    gruppi = ("allarme",) + SEGNALI
    per_anno, oggi = {}, []
    for a in ANNI:
        data = f"{a}-03-31"
        gr = {k: [] for k in gruppi + ("tutti",)}
        for t, (s, px) in dati.items():
            p0, p1 = px.get(f"{a}-03"), px.get(f"{a + 1}-03")
            sg = segnali(s, data)
            if not p0 or not p1 or not sg:
                continue
            r = p1 / p0 - 1
            gr["tutti"].append(r)
            if sum(sg.values()) >= 2:
                gr["allarme"].append(r)
            for k in SEGNALI:
                if sg.get(k):
                    gr[k].append(r)
        med = {k: sum(v) / len(v) for k, v in gr.items() if len(v) >= 5}
        if "tutti" in med and "allarme" in med:
            per_anno[a] = {"n": {k: len(v) for k, v in gr.items()},
                           **{f"{k}_meno_tutti": med[k] - med["tutti"] for k in gruppi if k in med}}
            print(a, per_anno[a]["n"], {k: round(v * 100, 1) for k, v in per_anno[a].items() if k != "n"})
    out = {}
    for k in gruppi:
        mis = f"{k}_meno_tutti"
        out[mis] = {per: sintesi([v[mis] for a, v in per_anno.items() if ok(a) and mis in v])
                    for per, ok in (("sviluppo", lambda a: a < TAGLIO), ("verifica", lambda a: a >= TAGLIO),
                                    ("tutto", lambda a: True))}
        c = V.coppie([v[mis] for v in per_anno.values() if mis in v])
        out[mis]["coppie"] = {"p_t": round(c["p_t"], 4), "meglio": c["meglio"], "peggio": c["peggio"]} if c else None
    p = out["allarme_meno_tutti"]
    out["AVVISO"] = bool(p["sviluppo"] and p["verifica"] and p["sviluppo"]["media_%"] < 0
                         and p["verifica"]["media_%"] < 0 and p["tutto"]["ic_%"][1] < 0)
    # quanti titoli oggi (31/3/2026) hanno l'allarme: per capire quanto "rumore" darebbe nella scheda
    for t, (s, _) in dati.items():
        sg = segnali(s, "2026-11-20")
        if sg and sum(sg.values()) >= 2:
            oggi.append((t, [k for k, v in sg.items() if v]))
    out["oggi_con_allarme"] = f"{len(oggi)} su {len(dati)}"
    print(json.dumps(out, indent=1))
    print("esempi oggi:", oggi[:15])


if __name__ == "__main__":
    {"scarica": scarica, "studio": studio}[sys.argv[1]](*sys.argv[2:])
