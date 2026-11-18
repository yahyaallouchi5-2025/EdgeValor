# -*- coding: utf-8 -*-
"""
studio_eventi_sp500.py - TEST C ALLARGATO: TUTTE le aziende dell'S&P 500 con una storia lunga (Ya, 18/11/2026).
Solo studio: il sito non cambia.

DOMANDA: davanti agli stessi fatti (inizio di una guerra, primo taglio o primo rialzo dei tassi della Fed, elezioni USA)
quali SETTORI e quali AZIENDE reagiscono sempre nello stesso modo? Non solo i titoli citati, ma tutti.
UNIVERSO: i titoli dell'S&P 500 di oggi con prezzi giornalieri almeno dal gennaio 2008 (408 aziende: "solide con un
  passato"). Limite dichiarato: sono le aziende di OGGI (chi e' uscito dall'indice non c'e').
MISURA (come studio_eventi.py): giorno 0 = ultima chiusura prima dell'evento; rendimento OLTRE l'S&P 500 a 1, 5 e
  20 giorni dopo, e nei 20 giorni prima.
QUANDO UNA REAZIONE "REGGE" (regole fissate prima):
  - SETTORE: mediana dei titoli del settore, evento per evento; regge se ha lo stesso segno in almeno l'80% degli
    eventi del gruppo (con almeno 5 eventi);
  - AZIENDA: stesso segno in almeno 6 eventi su 7 (guerre) o 5 su 5 (elezioni) A 5 GIORNI, e la media e' di almeno
    1 punto. Con 408 aziende alcune ci riescono PER CASO: si stampa anche quante ce ne aspetteremmo a caso
    (moneta a due facce), cosi' si vede se il risultato e' vero o rumore.
USO: python studi/studio_eventi_sp500.py <cartella giornaliero> <indice azioni (indice.json)>
"""
import json
import math
import os
import statistics as st
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import studio_eventi as E                      # noqa: E402

GUERRE = [("2008-08-08", "Russia-Georgia"), ("2014-02-27", "Crimea"), ("2017-04-07", "attacco USA in Siria"),
          ("2020-01-03", "Soleimani"), ("2022-02-24", "Ucraina"), ("2023-10-09", "7 ottobre"),
          ("2025-06-13", "Israele-Iran")]
ELEZIONI = [("2008-11-04", "Obama"), ("2012-11-06", "Obama 2"), ("2016-11-08", "Trump"), ("2020-11-03", "Biden"),
            ("2024-11-05", "Trump 2")]
TAGLI = [("2007-09-18", "2007"), ("2019-07-31", "2019"), ("2024-09-18", "2024")]
RIALZI = [("2015-12-16", "2015"), ("2022-03-16", "2022")]
GRUPPI = [("Inizio di una guerra", GUERRE, 6), ("Elezioni USA", ELEZIONI, 5),
          ("Fed: primo taglio del ciclo", TAGLI, 3), ("Fed: primo rialzo del ciclo", RIALZI, 2)]
NOMI = {"tech": "Tecnologia", "tlc": "Comunicazione", "cdis": "Beni voluttuari", "cstap": "Beni di prima necessita'",
        "salute": "Salute", "fin": "Finanza", "ind": "Industria", "mat": "Materiali", "ener": "Energia",
        "util": "Servizi pubblici", "imm": "Immobiliare"}


def caso(n, k):
    """probabilita' che una moneta dia lo stesso segno in almeno k lanci su n (in una delle due direzioni)"""
    p = sum(math.comb(n, j) for j in range(k, n + 1)) / 2 ** n
    return min(1.0, 2 * p)


def main():
    cart, fidx = sys.argv[1], sys.argv[2]
    idx = json.load(open(fidx))
    spy = E.leggi(cart, "SPY")
    tit = []
    for t in idx["titoli"]:
        if "sp500" not in (t.get("l") or []):
            continue
        s = E.leggi(cart, t["t"])
        if s and s[0][0] <= "2008-01-31":
            tit.append((t["t"], t["n"], t["s"], s))
    print(f"aziende S&P 500 con prezzi dal 2008: {len(tit)}\n")
    for nome, eventi, kmin in GRUPPI:
        n = len(eventi)
        print("=" * 100 + f"\n{nome} ({n} eventi){'  -> POCHI EVENTI: solo descrizione' if n < 5 else ''}")
        # misure per titolo ed evento
        M = {}
        for tk, nm, sett, s in tit:
            for d, _ in eventi:
                m = E.misura(s, spy, d)
                if m:
                    M[(tk, d)] = m
        # SETTORI: mediana per evento, poi coerenza tra eventi
        print("  SETTORI (mediana dei titoli, oltre l'S&P 500)     5g dopo: media eventi | eventi positivi   20g prima | 20g dopo")
        righe = []
        for sett in NOMI:
            per_ev = []
            for d, _ in eventi:
                v = [M[(tk, d)] for tk, _, s_, _ in tit if s_ == sett and (tk, d) in M]
                if v:
                    per_ev.append({k: st.median([x[k] for x in v if x[k] is not None]) for k in ("p20", "d5", "d20")
                                   if any(x[k] is not None for x in v)})
            if not per_ev:
                continue
            d5 = [e["d5"] for e in per_ev if "d5" in e]
            pos = sum(1 for z in d5 if z > 0)
            coer = max(pos, len(d5) - pos) / len(d5)
            regge = n >= 5 and coer >= 0.8
            righe.append((st.mean(d5), sett, pos, len(d5), st.mean([e["p20"] for e in per_ev if "p20" in e]),
                          st.mean([e["d20"] for e in per_ev if "d20" in e]), regge))
        for m5, sett, pos, tot, p20, d20, regge in sorted(righe, reverse=True):
            print(f"  {NOMI[sett]:<28} {m5*100:+6.2f}%   {pos}/{tot}{'  REGGE' if regge else '       '}   "
                  f"{p20*100:+6.2f}%   {d20*100:+6.2f}%")
        if n < 5:
            print()
            continue
        # AZIENDE coerenti
        tro = []
        for tk, nm, sett, _ in tit:
            v = [M[(tk, d)]["d5"] for d, _ in eventi if (tk, d) in M and M[(tk, d)]["d5"] is not None]
            if len(v) < n:
                continue
            pos = sum(1 for z in v if z > 0)
            k = max(pos, n - pos)
            if k >= kmin and abs(st.mean(v)) >= 0.01:
                tro.append((st.mean(v), tk, nm, sett, pos))
        attese = sum(1 for tk, _, _, _ in tit) * caso(n, kmin)
        print(f"\n  AZIENDE con lo stesso segno in almeno {kmin} eventi su {n} a 5 giorni (media >= 1 punto): {len(tro)}"
              f"  | a caso ce ne aspetteremmo circa {attese:.0f}")
        for m5, tk, nm, sett, pos in sorted(tro, reverse=True):
            print(f"    {tk:<7} {nm[:34]:<34} {NOMI.get(sett, sett):<24} {m5*100:+6.2f}%  ({pos}/{n} positivi)")
        print()


if __name__ == "__main__":
    main()
