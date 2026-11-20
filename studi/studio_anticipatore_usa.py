# -*- coding: utf-8 -*-
"""
studio_anticipatore_usa.py - v8.34 STUDIO: INDICATORE ANTICIPATORE USA DA DATI FRED (libro CFA Vol. 2, cap. 2:
componenti del Conference Board LEI) - Ya, 20/11/2026.

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  Componenti (dati FRED gratuiti), valutati a fine mese con il RITARDO DI PUBBLICAZIONE (niente dati dal futuro):
    ICSA      richieste di sussidi di disoccupazione (settimanali, media del mese)   migliora se SCENDE in 6 mesi
    PERMIT    permessi di costruzione (mensile, ritardo 1 mese)                      migliora se SALE in 6 mesi
    NEWORDER  ordini beni capitali esclusi difesa e aerei (mensile, ritardo 1 mese)  migliora se SALE in 6 mesi
    AWHMAN    ore settimanali nella manifattura (mensile, ritardo 1 mese)            migliora se SALE in 6 mesi
    UMCSENT   fiducia dei consumatori (mensile, ritardo 1 mese)                      migliora se SALE in 6 mesi
    T10YFF    Treasury 10 anni meno fondi federali (giornaliero)                     migliora se > 0 (curva non invertita)
    BAA10Y    spread del credito Baa contro Treasury (giornaliero)                   migliora se SCENDE in 6 mesi
    DRTSCILM  banche che stringono il credito alle imprese, SLOOS (trimestrale, ritardo 1 mese)
                                                                                     migliora se SCENDE in 6 mesi
  DIFFUSIONE = % delle componenti disponibili che migliorano. Clima FAVOREVOLE se >= 50%.
  Periodo: dal 1993 (prima di allora mancano gli ordini). In campione 1993-2009, fuori campione 2010-oggi.
  TEST (verifica_stat.py, libro CFA Vol. 1):
    A) recessione USA (NBER, USREC) nei 6 mesi successivi: tabella 2x2 clima sfavorevole / recessione;
    B) S&P 500 il mese dopo: rendimento medio con clima favorevole e sfavorevole;
    C) strategia S&P 500 quando il trend e' sopra la media a 10 mesi (come il filtro dei portafogli) CONTRO
       la stessa strategia che in piu' richiede il clima favorevole (altrimenti titoli a 3 mesi): test sulle coppie.
  DECISIONI PREFISSATE: il riquadro si mostra nel Quadro economico se A e' significativo (p < 0,05) sia in campione
  sia fuori campione. Entra nelle REGOLE dei portafogli solo se in C, fuori campione, migliora il rapporto
  rendimento/drawdown e il test sulle coppie non e' negativo (p < 0,10 a favore).
USO: python studi/studio_anticipatore_usa.py <cartella con i CSV FRED> <file prezzi SPY (data,prezzo)>
"""
import csv
import math
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import verifica_stat as V

# (serie, ritardo in mesi, verso: +1 migliora se sale, -1 se scende, 0 = livello > 0)
COMP = [("ICSA", 0, -1), ("PERMIT", 1, 1), ("NEWORDER", 1, 1), ("AWHMAN", 1, 1), ("UMCSENT", 1, 1),
        ("T10YFF", 0, 0), ("BAA10Y", 0, -1), ("DRTSCILM", 1, -1)]


def leggi(f):
    out = {}
    with open(f, encoding="utf-8") as fh:
        rd = csv.reader(fh)
        next(rd)
        for r in rd:
            try:
                out[r[0]] = float(r[1])
            except (ValueError, IndexError):
                pass
    return out


def mensile(serie):
    """{AAAA-MM: valore} = media del mese (per le serie giornaliere e settimanali), ultimo noto per le altre."""
    acc = {}
    for d, v in serie.items():
        acc.setdefault(d[:7], []).append(v)
    return {m: sum(v) / len(v) for m, v in acc.items()}


def mesi(dal, al):
    a, m = int(dal[:4]), int(dal[5:7])
    while f"{a:04d}-{m:02d}" <= al:
        yield f"{a:04d}-{m:02d}"
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)


def indietro(mese, n):
    a, m = int(mese[:4]), int(mese[5:7]) - n
    while m <= 0:
        a, m = a - 1, m + 12
    return f"{a:04d}-{m:02d}"


def ultimo_noto(s, mese):
    """Ultimo valore disponibile fino al mese (le trimestrali restano valide fino al dato dopo)."""
    for k in range(0, 4):
        x = s.get(indietro(mese, k))
        if x is not None:
            return x
    return None


def diffusione(dati, mese):
    """% delle componenti che migliorano a fine mese (con il ritardo di pubblicazione)."""
    su, tot = 0, 0
    for nome, rit, verso in COMP:
        s = dati[nome]
        m = indietro(mese, rit)
        ora = ultimo_noto(s, m)
        if ora is None:
            continue
        if verso == 0:
            su += ora > 0
        else:
            prima = ultimo_noto(s, indietro(m, 6))
            if prima is None:
                continue
            su += (ora - prima) * verso > 0
        tot += 1
    return su / tot if tot >= 6 else None


def main(cartella, file_spy):
    dati = {n: mensile(leggi(os.path.join(cartella, n + ".csv"))) for n, _, _ in COMP}
    rec = mensile(leggi(os.path.join(cartella, "USREC.csv")))
    tb = mensile(leggi(os.path.join(cartella, "TB3MS.csv")))
    spy = {}
    for d, v in leggi(file_spy).items():
        spy[d[:7]] = v                                   # ultimo prezzo del mese
    elenco = [m for m in mesi("1993-07", max(spy)) if m in spy]
    righe = []
    for i, m in enumerate(elenco[:-1]):
        dif = diffusione(dati, m)
        if dif is None:
            continue
        r_spy = spy[elenco[i + 1]] / spy[m] - 1
        r_cash = (tb.get(m) or 0) / 100 / 12
        storia = [spy[x] for x in elenco[max(0, i - 9):i + 1]]
        trend = spy[m] > sum(storia) / len(storia) if len(storia) == 10 else True
        rec6 = any(rec.get(x) == 1 for x in mesi(indietro(m, -1), indietro(m, -6))) if m <= max(rec) else None
        righe.append((m, dif, r_spy, r_cash, trend, rec6))
    print(f"mesi analizzati: {len(righe)} ({righe[0][0]} - {righe[-1][0]}); ultimo clima: "
          f"{righe[-1][1]*100:.0f}% delle componenti in miglioramento")
    for nome, dal, al in (("IN CAMPIONE 1993-2009", "1993", "2010"), ("FUORI CAMPIONE 2010-oggi", "2010", "9999")):
        R = [r for r in righe if dal <= r[0] < al]
        print(f"\n===== {nome} ({len(R)} mesi) =====")
        # A) recessione nei 6 mesi dopo
        A = [r for r in R if r[5] is not None]
        a = sum(1 for r in A if r[1] < 0.5 and r[5]); b = sum(1 for r in A if r[1] < 0.5 and not r[5])
        c = sum(1 for r in A if r[1] >= 0.5 and r[5]); d = sum(1 for r in A if r[1] >= 0.5 and not r[5])
        x = V.contingenza(a, b, c, d)
        print(f"A) recessione nei 6 mesi: con clima sfavorevole {a}/{a+b} mesi, con clima favorevole {c}/{c+d}"
              + (f"  -> chi2 p = {x['p']:.4f}" if x else "  -> non calcolabile"))
        # B) S&P 500 il mese dopo
        fav = [r[2] for r in R if r[1] >= 0.5]; sfa = [r[2] for r in R if r[1] < 0.5]
        if fav and sfa:
            print(f"B) S&P 500 il mese dopo: favorevole {sum(fav)/len(fav)*1200:.1f}% annuo ({len(fav)} mesi), "
                  f"sfavorevole {sum(sfa)/len(sfa)*1200:.1f}% annuo ({len(sfa)} mesi)")
        # C) trend da solo contro trend + clima
        def curva(usa_clima):
            v, picco, dd, rr = 1.0, 1.0, 0.0, []
            for r in R:
                dentro = r[4] and (r[1] >= 0.5 or not usa_clima)
                x_ = r[2] if dentro else r[3]
                rr.append(x_)
                v *= 1 + x_
                picco = max(picco, v); dd = min(dd, v / picco - 1)
            anni = len(R) / 12
            return v ** (1 / anni) - 1, dd, rr
        bh = curva(False)
        cg, ddg, r1 = curva(False)
        tg, ddt, r2 = curva(True)
        bh_v = math.prod(1 + r[2] for r in R) ** (12 / len(R)) - 1
        print(f"C) S&P 500 comprato e tenuto: {bh_v*100:.1f}% annuo")
        print(f"   solo trend (10 mesi):  {cg*100:.1f}% annuo, drawdown {ddg*100:.1f}%, rend/dd {cg/abs(ddg):.2f}")
        print(f"   trend + clima macro:   {tg*100:.1f}% annuo, drawdown {ddt*100:.1f}%, rend/dd {tg/abs(ddt):.2f}")
        t = V.coppie([q - p for p, q in zip(r1, r2)])
        print(f"   coppie (trend+clima meno trend): media {t['media']*1200:.2f}% annuo, p = {t['p_t']:.2f}, "
              f"IC95 [{t['ic95'][0]*1200:.2f}, {t['ic95'][1]*1200:.2f}]% annuo")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
