# -*- coding: utf-8 -*-
"""
studio_banda.py - v8.31 STUDIO: RIBILANCIAMENTO CON SOGLIA (Ya, 20/11/2026)

DOMANDA: con un broker a commissione FISSA (es. 2 euro a ordine) e un capitale piccolo (5.000 euro) i portafogli
fanno ~22-30 ordini l'anno, quasi tutti al ribilanciamento di inizio trimestre (ogni strumento torna al suo peso,
anche se si e' spostato di poco). Se al ribilanciamento correggiamo SOLO gli strumenti lontani dal peso di almeno
SOGLIA punti, quanti ordini si risparmiano e cosa succede a rendimento e drawdown?

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI:
  - stesse decisioni del sito (scegli(), ribilancio lento: si scambia se cambia l'insieme dei mercati o a inizio
    trimestre), stessa misura onesta (euro, acquisto alla chiusura, liquidita' al tasso BCE, AZ = S&P 500);
  - un mercato che ENTRA o ESCE si compra/vende sempre per intero (la soglia non tocca le rotazioni);
  - con la soglia T, al ribilanciamento uno strumento gia' tenuto si corregge solo se |peso attuale - obiettivo| >= T;
    gli altri restano come sono e la differenza si distribuisce tra quelli corretti (in proporzione all'obiettivo);
  - ORDINE = strumento il cui peso cambia di almeno 0,5 punti (come nel sito); costo 0,10% sullo scambiato (come nel
    sito) + commissione fissa di 2 euro a ordine su un capitale iniziale di 5.000 euro (seconda misura, "netto 5k");
  - periodi: storico 2006-2015 (in campione) e 2016-oggi (fuori campione) riportati separatamente;
  - si accetta una soglia solo se nel FUORI CAMPIONE il rendimento netto 5k non peggiora e il drawdown massimo non
    peggiora di oltre 1 punto.
USO: python -m studi.studio_banda <cartella storico>
"""
import sys
from datetime import date

from cot_radar import portafogli as P

COMM, CAP0 = 2.0, 5000.0          # commissione fissa per ordine (euro) e capitale iniziale (euro)


def piani_sito(g, prof, giorni):
    """Pesi obiettivo alle date di scambio, con la stessa regola del sito (ribilancio lento)."""
    piani, prec = {}, None
    for i in giorni:
        pesi, _, _ = P.scegli(prof, g, i, {})
        insieme = frozenset(k for k in pesi if k != "CASH")
        if prec is None or insieme != prec or g.date[i][5:7] in P.TRIMESTRI:
            piani[i] = pesi
        prec = insieme
    return piani


def con_soglia(vec, obi, soglia):
    """Pesi DOPO il ribilanciamento: gli strumenti gia' tenuti e vicini all'obiettivo (sotto la soglia) restano."""
    if not vec or soglia <= 0:
        return dict(obi)
    fermi = {k: vec[k] for k in obi if k in vec and abs(vec[k] - obi[k]) < soglia}
    muovi = {k: w for k, w in obi.items() if k not in fermi}
    if not muovi:
        if set(vec) - set(obi):                     # esce un mercato ma gli altri sono vicini: si ribilancia tutto
            return dict(obi)
        return {k: vec[k] for k in obi}             # tutti vicini: nessun ordine
    resto = 1.0 - sum(fermi.values())
    tot = sum(muovi.values()) or 1.0
    out = dict(fermi)
    out.update({k: resto * w / tot for k, w in muovi.items()})
    return out


def simula(g, piani, dal_i, fx, tassi, soglia):
    """Come simula_prudente (euro, acquisto alla chiusura, AZ = SPY) ma con la soglia. -> (curva, curva netta 5k, ordini)"""
    sost = {"AZ": "SPY"}
    cambio, tasso, uf, ut = [], [], None, 0.0
    for d in g.date:
        uf = fx.get(d, uf)
        ut = tassi.get(d, ut)
        cambio.append(uf)
        tasso.append(ut)
    quote, valore, netto, curva, curva_n, ordini = {}, 100.0, CAP0, [], [], []
    for i in range(dal_i, len(g.date)):
        if quote:
            f = cambio[i - 1] / cambio[i] if cambio[i] and cambio[i - 1] else 1.0
            gg = (date.fromisoformat(g.date[i]) - date.fromisoformat(g.date[i - 1])).days
            rc = (1 + P.tasso_liquidita(tasso[i]) / 100) ** (gg / 365) - 1
            nuove = {k: v * (1 + rc) if k == "CASH" else v * (1 + g.rend(P._ticker(sost.get(k, k)), i)) * f
                     for k, v in quote.items()}
            crescita = sum(nuove.values()) / sum(quote.values())
            quote, valore, netto = nuove, sum(nuove.values()), netto * crescita
        if i in piani:
            tot = sum(quote.values()) or 1.0
            vec = {k: v / tot for k, v in quote.items()}
            nuovi = con_soglia(vec, piani[i], soglia)
            assert abs(sum(nuovi.values()) - 1) < 2e-3, (g.date[i], nuovi)   # controllo: i pesi sommano a 1 (arrotondamenti del sito a parte)
            scambio = sum(abs(nuovi.get(k, 0) - vec.get(k, 0)) for k in set(nuovi) | set(vec))
            # la liquidita' resta sul conto del broker (21_portafogli.js): non e' un ordine
            n = sum(1 for k in set(nuovi) | set(vec) if k != "CASH" and abs(nuovi.get(k, 0) - vec.get(k, 0)) >= P.ORDINE_MIN)
            if not vec:                              # acquisto iniziale: un ordine per strumento (liquidita' esclusa)
                n, scambio = sum(1 for k in nuovi if k != "CASH"), 0.0
            ordini.append((g.date[i], n))
            valore *= 1 - P.COSTO * scambio
            netto = netto * (1 - P.COSTO * scambio) - n * COMM
            quote = {k: valore * w for k, w in nuovi.items()}
        curva.append((g.date[i], valore))
        curva_n.append((g.date[i], netto))
    return curva, curva_n, ordini


def misure(curva, ordini, dal, al):
    c = [(d, v) for d, v in curva if dal <= d < al]
    s = P.statistiche(c) or {}
    anni = (date.fromisoformat(c[-1][0]) - date.fromisoformat(c[0][0])).days / 365.25
    o = sum(n for d, n in ordini if dal < d < al) / anni        # escluso l'acquisto iniziale del periodo
    return s.get("cagr"), s.get("maxdd"), round(o, 1)


def main(cartella):
    px = P.prezzi(scarica=None, cartella=cartella)
    px["SAT"] = px["SPY"]                              # quota AZ come S&P 500 (misura prudente del sito)
    g = P.Griglia(px)
    giorni = P.date_ribilancio(g)
    fx, te = P.cambio_eur(cartella), P.tassi_eur(cartella)
    PERIODI = [("storico 2006-2015", "2006-01-01", "2016-01-01"), ("fuori campione 2016-oggi", "2016-01-01", "2100-01-01"),
               ("tutto", "2006-01-01", "2100-01-01")]
    for prof in P.PROFILI:
        piani = piani_sito(g, prof, giorni)
        print(f"\n=== {prof['id'].upper()} ===")
        print(f"{'soglia':>7} | {'periodo':<26} | {'rend. %':>7} {'maxDD %':>8} {'ordini/a':>8} | {'netto 5k rend. %':>16}")
        for soglia in (0.0, 0.02, 0.03, 0.05):
            curva, curva_n, ordini = simula(g, piani, giorni[0], fx, te, soglia)
            for nome, dal, al in PERIODI:
                r, dd, o = misure(curva, ordini, dal, al)
                rn, _, _ = misure(curva_n, ordini, dal, al)
                print(f"{soglia*100:>6.0f}p | {nome:<26} | {r:>7.2f} {dd:>8.2f} {o:>8.1f} | {rn:>16.2f}")


if __name__ == "__main__":
    main(sys.argv[1])
