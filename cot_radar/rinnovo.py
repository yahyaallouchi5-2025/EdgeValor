# -*- coding: utf-8 -*-
"""
rinnovo.py - v8.50 COSTO / GUADAGNO DEL RINNOVO DEI FUTURE SULLE MATERIE PRIME ("carry", libro CFA Vol. 7)

Chi tiene una materia prima con i future (ETF/ETC) deve rinnovare i contratti: se quelli lontani costano MENO
(backwardation) il rinnovo fa guadagnare, se costano DI PIU' (contango) fa perdere. Senza la curva dei future lo si
misura da cio' che e' nell'archivio: rendimento a 12 mesi dell'ETF sui future (rinnovo compreso) meno quello del prezzo
senza rinnovo, meno l'interesse dei titoli a 3 mesi incassato dall'ETF. Studio: studi/studio_carry_materie.py
(come SEGNALE per i portafogli non conviene: qui e' solo un dato informativo nelle schede dei mercati).
USCITA: {chiave mercato: {"v": % annuo, "mese": "AAAA-MM"}}; vuoto se mancano i file.
"""
import csv
import math
import os

# chiave del mercato -> (ETF sui future, prezzo senza rinnovo), file dell'archivio storico
COPPIE = {"WTI": ("yahoo/USO.csv", "DCOILWTICO.csv"), "NATGAS": ("yahoo/UNG.csv", "DHHNGSP.csv"),
          "COPPER": ("yahoo/CPER.csv", "yahoo/HG=F.csv"), "CORN": ("yahoo/CORN.csv", "yahoo/ZC=F.csv"),
          "WHEAT": ("yahoo/WEAT.csv", "yahoo/ZW=F.csv"), "SOY": ("yahoo/SOYB.csv", "yahoo/ZS=F.csv")}


def _mensile(f):
    out = {}
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r, None)
        for x in r:
            try:
                v = float(x[-1])
            except (ValueError, IndexError):
                continue
            if v > 0:
                out[x[0][:7]] = v
    return out


def calcola(cartella):
    out = {}
    f_tb = os.path.join(cartella or "", "DTB3.csv")
    if not cartella or not os.path.exists(f_tb):
        return out
    tb = _mensile(f_tb)
    for k, (fe, fs) in COPPIE.items():
        fe, fs = os.path.join(cartella, fe), os.path.join(cartella, fs)
        if not (os.path.exists(fe) and os.path.exists(fs)):
            continue
        e, s = _mensile(fe), _mensile(fs)
        mesi = sorted(m for m in e if m in s)
        if len(mesi) < 13:
            continue
        m, m12 = mesi[-1], mesi[-13]
        interesse = [tb[x] for x in mesi[-12:] if x in tb]
        if not interesse:
            continue
        v = math.log(e[m] / e[m12]) - math.log(s[m] / s[m12]) - sum(interesse) / len(interesse) / 100
        out[k] = {"v": round(v * 100, 1), "mese": m}
    return out
