# -*- coding: utf-8 -*-
"""
studio_freno_volatilita.py - DRAWDOWN E VOLATILITA' DEI PORTAFOGLI: SERVE UN FRENO? (Ya, 26/11/2026). Solo studio.

PARTENZA: lo studio per singolo strumento (risultati_volatilita_breve_lunga.txt) ha trovato che dimezzare la posizione
quando la volatilita' dell'ultimo mese supera di oltre il 25% quella dell'ultimo anno (R = vol21/vol252 > 1,25)
migliora rendimento/volatilita' su 44 strumenti su 56 fuori campione e riduce il drawdown massimo medio di 5 punti.
Qui si prova la stessa idea SUI PORTAFOGLI MODELLO, che hanno gia' il filtro di trend a 200 giorni.

VARIANTI (regole fissate PRIMA di guardare i numeri):
  0   Attuale (cot_radar/portafogli.py: trend a 200 giorni, Treasury e oro sempre presenti, ribilancio lento)
  F1  FRENO PER MERCATO: al controllo del mese ogni mercato rischioso tenuto (azioni, materie prime, Bitcoin, azioni
      scelte) con R = vol 21 giorni / vol 252 giorni > 1,25 pesa la META'; l'altra meta' va in liquidita'.
  F2  TETTO DI VOLATILITA' DEL PORTAFOGLIO: al controllo del mese si stima la volatilita' del portafoglio con le
      covarianze degli ultimi 63 giorni; se supera il tetto del profilo (conservativo 6%, moderato 8%, aggressivo 12%,
      circa la sua volatilita' storica) la parte rischiosa si riduce in proporzione fino al tetto. Mai leva.
  F3  F1 + F2.
MISURA: quella del sito (euro senza copertura, liquidita' al tasso BCE, acquisto prudente, azioni scelte = S&P 500,
  costi 0,10%). Si riportano anche i drawdown nelle tre crisi (2008, 2020, 2022) e gli ordini in piu' all'anno.
REGOLA DI SCELTA (identica agli studi del 07/11 e 13/11): una variante entra solo se FUORI CAMPIONE (dal 2016)
  migliora rendimento/volatilita' E non peggiora il drawdown massimo di oltre 1 punto, E nello STUDIO (2006-2015)
  il rapporto rendimento/volatilita' non scende di oltre 0,05, E il rendimento annuo resta almeno 2,6% (regola di Ya).
USO: python studi/studio_freno_volatilita.py <cartella storico> <satellite.json>
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
from cot_radar import portafogli as P          # noqa: E402
import studio_ribilancio as R                   # noqa: E402

SOGLIA_R = 1.25
TETTO = {"conservativo": 0.06, "moderato": 0.08, "aggressivo": 0.12}
FIN_COV = 63
MIN_RENDIMENTO = 2.6
CRISI = (("2008", "2007-10-01", "2009-03-31"), ("2020", "2020-02-01", "2020-04-30"), ("2022", "2022-01-01", "2022-10-31"))


def tick(k):
    return P._ticker("SPY" if k == "AZ" else k)


def vol(g, k, i, n):
    """Volatilita' annua dei rendimenti giornalieri degli ultimi n giorni fino a i-1 (None se mancano dati)."""
    r = [g.rend(tick(k), j) for j in range(max(1, i - n), i)]
    r = [x for x in r if x is not None]
    if len(r) < n * 0.8:
        return None
    m = sum(r) / len(r)
    return math.sqrt(sum((x - m) ** 2 for x in r) / (len(r) - 1) * 252)


def freno(pesi, g, i):
    """F1: mercati rischiosi con vol21/vol252 > SOGLIA_R a meta' peso, il resto in liquidita'."""
    out, liberi = dict(pesi), 0.0
    for k, w in pesi.items():
        if k in R.DIFESA or w <= 0:
            continue
        v21, v252 = vol(g, k, i, 21), vol(g, k, i, 252)
        if v21 and v252 and v21 / v252 > SOGLIA_R:
            out[k] = w / 2
            liberi += w / 2
    if liberi:
        out["CASH"] = out.get("CASH", 0) + liberi
    return out


def vol_portafoglio(pesi, g, i):
    """Volatilita' stimata del portafoglio (covarianze degli ultimi FIN_COV giorni; la liquidita' non oscilla)."""
    ch = [k for k, w in pesi.items() if k != "CASH" and w > 0]
    rs = []
    for k in ch:
        r = [g.rend(tick(k), j) or 0.0 for j in range(max(1, i - FIN_COV), i)]
        rs.append(r)
    if not rs:
        return 0.0
    n = len(rs[0])
    m = [sum(r) / n for r in rs]
    var = 0.0
    for a in range(len(ch)):
        for b in range(len(ch)):
            c = sum((rs[a][j] - m[a]) * (rs[b][j] - m[b]) for j in range(n)) / (n - 1) * 252
            var += pesi[ch[a]] * pesi[ch[b]] * c
    return math.sqrt(max(0.0, var))


def tetto(pesi, g, i, limite):
    """F2: se la volatilita' stimata supera il tetto, la parte rischiosa scende in proporzione (resto in liquidita')."""
    v = vol_portafoglio(pesi, g, i)
    if v <= limite:
        return pesi
    rischio = {k: w for k, w in pesi.items() if k not in R.DIFESA}
    # la volatilita' viene quasi tutta dalla parte rischiosa: la si scala del rapporto, poi si ricontrolla una volta
    f = limite / v
    for _ in range(2):
        prova = {k: (w * f if k in rischio else w) for k, w in pesi.items()}
        prova["CASH"] = prova.get("CASH", 0) + sum(rischio.values()) * (1 - f)
        v2 = vol_portafoglio(prova, g, i)
        if v2 <= limite * 1.02:
            return prova
        f *= limite / v2
    return prova


def piano(prof, g, giorni, f1=False, f2=False):
    """Calendario del sito; con F1/F2 si scambia anche quando cambia il freno (pesi diversi di oltre 1 punto)."""
    out, prec, prec_w = {}, None, None
    for i in giorni:
        pesi, info, _ = P.scegli(prof, g, i, {})
        if f1:
            pesi = freno(pesi, g, i)
        if f2:
            pesi = tetto(pesi, g, i, TETTO[prof["id"]])
        insieme = frozenset(k for k in pesi if k != "CASH")
        diverso = prec_w is not None and any(abs(pesi.get(k, 0) - prec_w.get(k, 0)) > 0.01 for k in set(pesi) | set(prec_w))
        if prec is None or insieme != prec or g.date[i][5:7] in P.TRIMESTRI or ((f1 or f2) and diverso):
            out[i] = pesi
            prec_w = pesi
        prec = insieme
    return out


def dd_periodo(curva, dal, al):
    """Drawdown massimo (%) della curva tra due date."""
    picco, peggio = None, 0.0
    for d, v in curva:
        if d < dal or d > al:
            continue
        picco = v if picco is None else max(picco, v)
        peggio = min(peggio, v / picco - 1)
    return peggio * 100


def main():
    cartella, satf = sys.argv[1], sys.argv[2]
    px = P.prezzi(scarica=None, cartella=cartella)
    ss = P.serie_satellite(json.load(open(satf, encoding="utf-8")), [d for d, _ in px["SPY"]])
    if ss:
        px["SAT"] = ss
    fx, te = P.cambio_eur(cartella), P.tassi_eur(cartella)
    g = P.Griglia(px)
    giorni = P.date_ribilancio(g)
    anni = (len(g.date) - giorni[0]) / 252
    print(f"Periodo {g.date[giorni[0]]} - {g.date[-1]} ({anni:.1f} anni). Misura: EURO, acquisto prudente, AZ = S&P 500")
    f = lambda s: f"{s['cagr']:6.1f}{s['vol']:6.1f}{s['maxdd']:7.1f}{(s['cagr'] / s['vol'] if s['vol'] else 0):6.3f}"
    rv = lambda s: s["cagr"] / s["vol"] if s["vol"] else 0
    for prof in P.PROFILI:
        print(f"\n=== {prof['nome']} (tetto F2 {TETTO[prof['id']] * 100:.0f}%) ===")
        print(f"{'':24}{'STUDIO 2006-2015':^25}|{'FUORI CAMPIONE 2016+':^25}| ribil./anno | crisi 2008  2020  2022")
        print(f"{'':24}" + ("  CAGR   Vol  MaxDD  R/V|" * 2))
        prove = [("0 attuale", False, False), ("F1 freno per mercato", True, False),
                 ("F2 tetto di volatilita'", False, True), ("F3 F1 + F2", True, True)]
        rif = None
        for nome, a, b in prove:
            pi = piano(prof, g, giorni, a, b)
            c, _ = R.simula(g, pi, giorni[0], fx, te)
            st, oo = R.misura(c)
            cr = "  ".join(f"{dd_periodo(c, d0, d1):5.1f}" for _, d0, d1 in CRISI)
            esito = ""
            if rif is None:
                rif = (st, oo)
            else:
                ok = (rv(oo) > rv(rif[1]) and oo["maxdd"] >= rif[1]["maxdd"] - 1 and rv(st) >= rv(rif[0]) - 0.05
                      and oo["cagr"] >= MIN_RENDIMENTO)
                esito = "  ENTRA" if ok else "  scartata"
            print(f"{nome:24}{f(st)}|{f(oo)}|   {len(pi) / anni:5.1f}     | {cr}{esito}")


def robustezza(g, giorni, fx, te):
    """Prova di robustezza di F1: la soglia 1,25 non deve essere un caso fortunato (1,15 e 1,35 vicine)."""
    global SOGLIA_R
    rv = lambda s: s["cagr"] / s["vol"] if s["vol"] else 0
    print("\n=== ROBUSTEZZA F1: soglie vicine (fuori campione 2016+: CAGR / MaxDD / R/V) ===")
    for prof in P.PROFILI:
        riga = []
        for sg in (None, 1.15, 1.25, 1.35):
            if sg:
                SOGLIA_R = sg
            c, _ = R.simula(g, piano(prof, g, giorni, bool(sg), False), giorni[0], fx, te)
            oo = R.misura(c)[1]
            riga.append(f"{'attuale' if not sg else sg:>7}: {oo['cagr']:4.1f} {oo['maxdd']:6.1f} {rv(oo):5.3f}")
        print(f"{prof['nome']:13}" + " | ".join(riga))
    SOGLIA_R = 1.25


if __name__ == "__main__":
    main()
    if "--robustezza" in sys.argv:
        _px = P.prezzi(scarica=None, cartella=sys.argv[1])
        _ss = P.serie_satellite(json.load(open(sys.argv[2], encoding="utf-8")), [d for d, _ in _px["SPY"]])
        if _ss:
            _px["SAT"] = _ss
        _g = P.Griglia(_px)
        robustezza(_g, P.date_ribilancio(_g), P.cambio_eur(sys.argv[1]), P.tassi_eur(sys.argv[1]))
