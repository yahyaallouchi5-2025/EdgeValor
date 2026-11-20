# -*- coding: utf-8 -*-
"""
studio_bilanci_onesto.py - v8.42 PROVA ONESTA (SENZA BIAS DEI SOPRAVVISSUTI) DEGLI STUDI SUI BILANCI DEI LIBRI CFA
  Vol. 3: ROIC e copertura degli interessi (studio_roic.py)    Vol. 4: segnali d'allarme sui conti (studio_allarmi.py)
Sui titoli di OGGI i due studi non hanno dato vantaggi, ma le aziende finite male (fallite, delistate) mancavano:
qui si rifanno con le STESSE regole sull'universo com'era ogni anno. Ya, 20/11/2026.

DATI
  bilanci = archivi SEC dal 2009 di TUTTE le aziende USA (ramo studio-buffett, studi/sec_bilanci_storia.py v8.42),
            solo 10-K annuali, usati solo dopo la data di deposito;
  prezzi  = mensili rettificati di 22.609 titoli USA anche delistati (ramo studio-delistate);
  abbinamento azienda SEC -> titolo per nome (studi/studio_buffett.abbina, stessi limiti dichiarati).
UNIVERSO (ogni 31 marzo, 2010-2025): le 500 azioni piu' scambiate dei 12 mesi prima (studio_onesto.universo_onesto),
  con bilancio abbinato; esclusi per nome banche, assicurazioni e immobiliari (BANK, BANCORP, BANCSHARES, FINANCIAL,
  INSURANCE, REIT, REALTY, TRUST, ASSURANCE).
RENDIMENTO 12 MESI: fine marzo -> fine marzo, mese per mese; un titolo senza prezzo del mese dopo (uscito dalla borsa)
  rende 0 da li' in poi (stessa convenzione dello studio onesto). Rendimenti mensili oltre -95% / +300% scartati.
REGOLE: identiche a studio_roic.py (CREA VALORE, DISTRUGGE, FRAGILE) e studio_allarmi.py (4 segnali, ALLARME >= 2),
  stesse soglie di decisione (sviluppo 2010-2017, verifica 2018-2025, z = 2,81, test sulle coppie).
USO: python studi/studio_bilanci_onesto.py <cartella delistate> <cartella bilanci SEC>
"""
import json
import math
import os
import re
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cot_radar import satellite as S, verifica_stat as V        # noqa: E402
import studio_onesto as O                                      # noqa: E402
from studio_buffett import abbina, carica_bilanci, valore_anno, valore_bil   # noqa: E402
from studio_roic import ANNI, TAGLIO, sintesi                   # noqa: E402

VIA = re.compile(r"\b(BANK|BANCORP|BANCSHARES|FINANCIAL|INSURANCE|REIT|REALTY|TRUST|ASSURANCE)\b")
RICAVI = ("ricavi", "ricavi2", "ricavi3")


def misure(b, data):
    """(roic e copertura dell'ultimo anno e di quello prima, segnali d'allarme) alla data, oppure None."""
    r = valore_anno(b, RICAVI, data)
    if not r or r[1] < f"{int(data[:4]) - 2}-01-01":
        return None
    f = r[1]
    d0 = date.fromisoformat(f)                     # anni prima: 365 / 730 giorni (gli anni fiscali a 52/53 settimane e il 29/2)
    p, pp = (d0 - timedelta(days=365)).isoformat(), (d0 - timedelta(days=730)).isoformat()
    g = lambda voci, fp: (valore_anno(b, voci, data, fp) or (None, None, None, None))[3]     # noqa: E731
    s = lambda voci, fp: valore_bil(b, voci, data, fp)                                       # noqa: E731
    out = {}
    # --- ROIC e copertura (studio_roic.py) per gli anni f e p
    def roic(fp):
        eb = g(("ebit",), fp)
        pn = s(("pn",), fp)
        if eb is None or pn is None:
            return None, None
        deb = s(("debito",), fp)
        if deb is None:
            deb = (s(("debito_lungo",), fp) or 0)
        cassa = s(("cassa",), fp) or 0
        t, a = g(("tasse",), fp), g(("ante",), fp)
        ali = min(0.35, max(0.0, t / a)) if t is not None and a and a > 0 else 0.25
        cap = deb + pn - cassa
        ro = eb * (1 - ali) / cap if cap > 0 else None
        it = g(("interessi", "interessi2"), fp)
        cop = math.inf if (not it or it <= 0 or deb <= 0) else eb / it
        return ro, cop
    out["roic"] = [roic(p), roic(f)]
    # --- segnali d'allarme (studio_allarmi.py)
    rf, rp = r[3], g(RICAVI, p)
    sg = {}
    if rp:
        cf, cp = s(("crediti",), f), s(("crediti",), p)
        if cf is not None and cp and rf > 0 and rp > 0:
            sg["crediti"] = (cf / rf) / (cp / rp) > 1.10
        mf, mp = s(("magazzino",), f), s(("magazzino",), p)
        if mf and mp and mf > 0 and mp > 0 and rp > 0:
            sg["magazzino"] = (mf / mp - 1) - (rf / rp - 1) > 0.10
        u = [g(("utile", "utile_tot"), x) for x in (p, f)]
        c = [g(("fco",), x) for x in (p, f)]
        if None not in u and None not in c:
            sg["cassa"] = all(u[k] > 0 and c[k] < u[k] for k in range(2))
        rpp = g(RICAVI, pp)
        at = [s(("attivo",), x) for x in (pp, p, f)]
        if rpp and None not in at and all(at):
            q = [rpp / at[0], rp / at[1], rf / at[2]]
            sg["rotazione"] = q[2] < q[1] < q[0] and q[2] / q[0] < 0.90
    out["allarmi"] = sg
    return out


def rend12(x, t):
    """Rendimento composto da t a t+12 (mesi interi); uscito dalla borsa = 0 da li' in poi."""
    v = 1.0
    for k in range(12):
        a, b = x.p.get(t + k), x.p.get(t + k + 1)
        if a and b:
            q = b / a - 1
            if -0.95 <= q <= 3.0:
                v *= 1 + q
    return v - 1


def main():
    cart, csec = sys.argv[1], sys.argv[2]
    el, dati = O.carica(cart)
    tt = O.titoli(dati)
    nomi = json.load(open(os.path.join(csec, "sec_nomi.json")))
    scambi = {c: sum(cv.values()) for c, (_, cv) in tt.items()}
    mappa = {t: c for t, c in abbina(el, nomi, scambi).items() if t in tt and not VIA.search((el[t].get("n") or "").upper())}
    bil = carica_bilanci(csec, set(mappa.values()))
    print(f"titoli abbinati: {len(mappa)} (usciti dalla borsa: {sum(1 for t in mappa if el[t]['stato'] == 'delistata')})")
    G = ("crea", "distrugge", "fragile", "allarme", "crediti", "magazzino", "cassa", "rotazione")
    per_anno, usciti = {}, {}
    for a in ANNI:
        t = S._n(f"{a}-03")
        data = f"{a}-03-31"
        gr = {k: [] for k in G + ("tutti",)}
        for x in O.universo_onesto(tt, t):
            c = x.t
            if c not in mappa or mappa[c] not in bil:
                continue
            m = misure(bil[mappa[c]], data)
            if not m:
                continue
            r = rend12(x, t)
            gr["tutti"].append(r)
            (rp, cp), (rf, cf) = m["roic"]
            if rf is not None and rp is not None and rf >= 0.10 and rp >= 0.10:
                gr["crea"].append(r)
            if rf is not None and rf < 0.05:
                gr["distrugge"].append(r)
            if cf is not None and cf < 3:
                gr["fragile"].append(r)
            sg = m["allarmi"]
            if sum(sg.values()) >= 2:
                gr["allarme"].append(r)
            for k in ("crediti", "magazzino", "cassa", "rotazione"):
                if sg.get(k):
                    gr[k].append(r)
            if el[c]["stato"] == "delistata" and x.p.get(t + 12) is None:
                usciti[a] = usciti.get(a, 0) + 1
        med = {k: sum(v) / len(v) for k, v in gr.items() if len(v) >= 5}
        if "tutti" in med:
            per_anno[a] = {"n": {k: len(v) for k, v in gr.items()}, **{k: med[k] - med["tutti"] for k in G if k in med}}
            print(a, per_anno[a]["n"], {k: round(v * 100, 1) for k, v in per_anno[a].items() if k != "n"}, flush=True)
    print("titoli dell'universo usciti dalla borsa entro 12 mesi, per anno:", usciti)
    out = {}
    for k in G:
        out[k + "_meno_tutti"] = {per: sintesi([v[k] for a, v in per_anno.items() if ok(a) and k in v])
                                  for per, ok in (("sviluppo", lambda a: a < TAGLIO), ("verifica", lambda a: a >= TAGLIO),
                                                  ("tutto", lambda a: True))}
        c = V.coppie([v[k] for v in per_anno.values() if k in v])
        out[k + "_meno_tutti"]["coppie"] = {"p_t": round(c["p_t"], 4), "meglio": c["meglio"], "peggio": c["peggio"]} if c else None
    for k, segno in (("crea", 1), ("allarme", -1), ("fragile", -1), ("distrugge", -1)):
        p = out[k + "_meno_tutti"]
        ok = p["sviluppo"] and p["verifica"] and p["tutto"]
        out[f"ESITO_{k}"] = bool(ok and segno * p["sviluppo"]["media_%"] > 0 and segno * p["verifica"]["media_%"] > 0
                                 and (p["tutto"]["ic_%"][0] > 0 if segno > 0 else p["tutto"]["ic_%"][1] < 0))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
