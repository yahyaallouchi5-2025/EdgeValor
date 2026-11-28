# -*- coding: utf-8 -*-
"""
studio_cuscinetto.py - v9.74 STUDIO: TENERE UN MERCATO ANCHE SE SCENDE DI POCO SOTTO LA MEDIA? (Ya, 28/11/2026)

DOMANDA (di Ya): "come combattiamo le commissioni del broker? Qualche mercato avrebbe avuto senso mantenerlo (anche se
in drawdown) il mese dopo o per piu' mesi, con un cuscinetto, invece di venderlo e ricomprarlo".
OGGI il sito vende un mercato appena, al controllo di inizio mese, il prezzo e' sotto la media a 200 giorni, anche di
un soffio; e lo ricompra appena torna sopra. Ogni giro "esco / rientro" sono due ordini e spesso una vendita in basso.

COSA SI PROVA (una regola alla volta; tutto il resto resta come nel sito, compresa la soglia di 2 punti al
ribilanciamento approvata il 20/11/2026, studi/studio_banda.py):
  A  CUSCINETTO SULL'USCITA: un mercato GIA' TENUTO resta finche' il prezzo non scende sotto la media di oltre C%
     (C = 1, 2, 3, 5). Per ENTRARE serve sempre il prezzo sopra la media (regola di oggi).
  B  CONFERMA DELL'USCITA: un mercato gia' tenuto esce solo se e' sotto la media a DUE controlli mensili di fila.
  0  Regola di oggi (riferimento).

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI
  - stessa misura onesta del sito: euro, acquisto alla chiusura del giorno di rotazione, liquidita' al tasso BCE,
    azioni scelte contate come S&P 500, costo 0,10% sullo scambiato;
  - seconda misura "netto 5k": in piu' 2 euro di commissione fissa a ordine su 5.000 euro iniziali (come studio_banda);
  - periodi separati: storico 2006-2015 (in campione) e 2016-oggi (fuori campione);
  - una variante SI ACCETTA solo se, in TUTTI E TRE i profili, nel FUORI CAMPIONE: il rendimento netto 5k non
    peggiora, il drawdown massimo non peggiora di oltre 1 punto e gli ordini l'anno scendono; e nello storico il
    drawdown massimo non peggiora di oltre 2 punti (e' li' che ci sono il 2008 e il 2011);
  - se piu' varianti passano, si sceglie la piu' semplice e con il cuscinetto piu' piccolo.
NON CAMBIA IL SITO: e' solo uno studio. La decisione sulle regole dei portafogli e' di Ya.

USO: python -m studi.studio_cuscinetto <cartella storico>
DEBUG: la riga "0" deve dare gli stessi numeri della riga "2p" di studi/risultati_banda.txt (stessa regola).
"""
import sys

from cot_radar import portafogli as P
from studi import studio_banda as B

SOGLIA_RIB = 0.02                 # soglia al ribilanciamento gia' in uso nel sito (2 punti)
MOTIVO = "prezzo sotto la media"  # inizio del motivo con cui scegli() mette in pausa un mercato per il trend


def piani(g, prof, giorni, cuscinetto=None, conferma=1):
    """Pesi obiettivo alle date di scambio. cuscinetto = % sotto la media tollerata per un mercato gia' tenuto
    (None = regola di oggi); conferma = controlli mensili di fila sotto la media prima di uscire (1 = oggi)."""
    out, prec, tenuti, sotto = {}, None, set(), {}
    for i in giorni:
        pesi, _, esclusi = P.scegli(prof, g, i, {})
        pesi = dict(pesi)
        for e in esclusi:
            k = e["k"]
            if not str(e.get("motivo", "")).startswith(MOTIVO) or e.get("trend") is None:
                continue
            sotto[k] = sotto.get(k, 0) + 1
            resta = k in tenuti and ((cuscinetto is not None and e["trend"] >= -cuscinetto) or sotto[k] < conferma)
            if resta:                                   # il peso torna dalla liquidita' al mercato
                w = e["base"] / 100
                pesi[k] = round(pesi.get(k, 0) + w, 4)
                pesi["CASH"] = round(pesi.get("CASH", 0) - w, 4)
                if pesi["CASH"] < 0.005:
                    pesi.pop("CASH")
        fuori = {e["k"] for e in esclusi}
        for k in list(sotto):
            if k not in fuori:
                sotto[k] = 0                            # tornato sopra la media: il conto riparte
        insieme = frozenset(k for k in pesi if k != "CASH")
        if prec is None or insieme != prec or g.date[i][5:7] in P.TRIMESTRI:
            out[i] = pesi
        prec, tenuti = insieme, set(insieme)
    return out


def main(cartella):
    px = P.prezzi(scarica=None, cartella=cartella)
    px["SAT"] = px["SPY"]
    g = P.Griglia(px)
    giorni = P.date_ribilancio(g)
    fx, te = P.cambio_eur(cartella), P.tassi_eur(cartella)
    PERIODI = [("storico 2006-2015", "2006-01-01", "2016-01-01"), ("fuori campione 2016-oggi", "2016-01-01", "2100-01-01"),
               ("tutto", "2006-01-01", "2100-01-01")]
    VARIANTI = [("0 oggi", None, 1), ("A 1%", 1.0, 1), ("A 2%", 2.0, 1), ("A 3%", 3.0, 1), ("A 5%", 5.0, 1), ("B 2 mesi", None, 2)]
    for prof in P.PROFILI:
        print(f"\n=== {prof['id'].upper()} ===")
        print(f"{'variante':>9} | {'periodo':<26} | {'rend. %':>7} {'maxDD %':>8} {'ordini/a':>8} | {'netto 5k %':>10} | {'uscite/a':>8}")
        for nome_v, c, n in VARIANTI:
            pn = piani(g, prof, giorni, c, n)
            # uscite = volte in cui un mercato lascia il portafoglio (ognuna e' una vendita e, dopo, un riacquisto)
            date_p = sorted(pn)
            usc = [(g.date[b], len({k for k in pn[a] if k != "CASH"} - {k for k in pn[b] if k != "CASH"}))
                   for a, b in zip(date_p, date_p[1:])]
            curva, curva_n, ordini = B.simula(g, pn, giorni[0], fx, te, SOGLIA_RIB)
            for nome, dal, al in PERIODI:
                r, dd, o = B.misure(curva, ordini, dal, al)
                rn, _, _ = B.misure(curva_n, ordini, dal, al)
                anni = max(1e-9, (min(al, g.date[-1]) > dal) and
                           ((P.date.fromisoformat(min(al, g.date[-1])) - P.date.fromisoformat(max(dal, g.date[giorni[0]]))).days / 365.25))
                u = sum(x for d, x in usc if dal <= d < al) / anni
                print(f"{nome_v:>9} | {nome:<26} | {r:>7.2f} {dd:>8.2f} {o:>8.1f} | {rn:>10.2f} | {u:>8.1f}")


if __name__ == "__main__":
    main(sys.argv[1])
