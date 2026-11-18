# -*- coding: utf-8 -*-
"""
studio_bolle_sconti.py - BOLLE E SCONTI SUI SINGOLI TITOLI USA (ricerca "Eventi", Ya 18/11/2026). Solo studio: il sito non cambia.

DOMANDE
  A) BOLLA: un titolo salito MOLTO piu' del mercato in 2 anni (+50%, +100%, +150% oltre l'S&P 500) poi crolla?
     Quanto spesso perde il 40% entro 2 anni, e come va in media nei 6/12/24 mesi dopo?
     Ricerca di partenza: Greenwood, Shleifer e You, "Bubbles for Fama" (2019), sui SETTORI USA 1926-2014: a +100%
     oltre il mercato il crollo arriva nel 53% dei casi, ma il rendimento medio dopo NON e' negativo; i crolli si
     annunciano con prezzo che accelera, volatilita' in salita, piu' scambi e nuove azioni emesse.
     Qui si rifa' la prova sui singoli titoli e si misurano tre "sintomi": ACCELERAZIONE (piu' di meta' del rialzo dei
     2 anni fatta negli ultimi 6 mesi), VOLATILITA' IN SALITA (volatilita' degli ultimi 12 mesi > 1,3 volte i 12 mesi
     prima), SCAMBI IN SALITA (azioni scambiate al mese negli ultimi 6 mesi > 1,5 volte quelle di 13-24 mesi prima).
  B) SCONTO: un titolo a -60% (o peggio) dal massimo dei 24 mesi poi recupera? Si separa lo "SCONTO CON CASSA"
     (ultimo bilancio annuale con flusso di cassa libero = cassa operativa - investimenti POSITIVO: il caso Amazon
     2001 che convinse Bill Miller) dallo "SCONTO SENZA CASSA" (flusso di cassa libero negativo).
     Ricerca di partenza: Campbell, Hilscher e Szilagyi, "In Search of Distress Risk": in media le azioni vicine al
     fallimento rendono MENO del mercato.
DATI (senza bias di sopravvivenza): prezzi mensili rettificati e controvalore scambiato di 22.609 azioni USA quotate
  E uscite dalla borsa (cartella "delistate", EODHD); S&P 500 = SPY; bilanci annuali SEC dal 2009 usati solo dopo la
  data di deposito (studi/sec_bilanci_storia.py, abbinamento per nome come lo studio Buffett).
REGOLE (fissate PRIMA di guardare i risultati)
  - ogni mese, universo = le 1.000 azioni piu' scambiate dei 12 mesi prima (prezzo almeno 1 dollaro);
  - un titolo entra in un gruppo il PRIMO mese in cui supera la soglia (poi non conta di nuovo per 12 mesi: niente
    doppioni dello stesso episodio);
  - risultato = rendimento del titolo MENO quello dell'S&P 500 nello stesso periodo ("oltre il mercato");
  - CROLLO = il prezzo scende del 40% (A) o di un altro 50% (B) sotto il prezzo del segnale entro 24 mesi;
  - titolo uscito dalla borsa prima della fine: si usa l'ultimo prezzo disponibile (non sappiamo se e' stato comprato o
    e' fallito: limite dichiarato, conta "usciti");
  - medie "pulite" (senza il 5% piu' alto e piu' basso) e mediane: alcuni titoli piccoli hanno prezzi errati;
  - due periodi separati (A: 1997-2010 e 2011-2024; B: 2010-2016 e 2017-2024): un risultato "regge" solo se ha lo
    stesso segno in entrambi.
USO: python studi/studio_bolle_sconti.py <cartella delistate> <cartella bilanci SEC> <cartella storico>
"""
import json
import math
import os
import statistics as st
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cot_radar import satellite as S          # noqa: E402
import studio_onesto as O                      # noqa: E402
import studio_buffett as BF                    # noqa: E402

O.TOP = 1000
SOGLIE_A = [0.5, 1.0, 1.5]                     # rialzo oltre il mercato in 24 mesi
PERIODI_A = [("1997-01", "2010-12"), ("2011-01", "2024-10")]
PERIODI_B = [("2010-06", "2016-12"), ("2017-01", "2024-10")]
DD_B = 0.40                                    # prezzo <= 40% del massimo dei 24 mesi = drawdown di almeno il 60%


def prezzo_dopo(x, t, k):
    """Prezzo a t+k; se il titolo e' uscito prima, l'ultimo disponibile (e True = uscito)."""
    for j in range(k, -1, -1):
        p = x.p.get(t + j)
        if p:
            return p, j < k
    return None, True


def minimo_dopo(x, t, k):
    v = [x.p[t + j] for j in range(1, k + 1) if x.p.get(t + j)]
    return min(v) if v else None


def oltre(x, spy, t, k):
    p0, (p1, usc) = x.p.get(t), prezzo_dopo(x, t, k)
    s0, s1 = spy.get(t), spy.get(t + k)
    if not (p0 and p1 and s0 and s1):
        return None, usc
    return (p1 / p0 - 1) - (s1 / s0 - 1), usc


def riepilogo(nome, ev, chiave_crollo):
    """ev = lista di dict con r6, r12, r24 (oltre il mercato), crollo, usc."""
    if not ev:
        return f"  {nome:<34} nessun caso"
    def m(k):
        v = [e[k] for e in ev if e[k] is not None]
        if not v:
            return (0, 0, 0)
        # media "pulita": senza il 5% piu' alto e il 5% piu' basso (pochi titoli con prezzi errati o x100 falsano la media)
        w = sorted(v)[int(len(v) * 0.05):max(int(len(v) * 0.95), 1)] or v
        return (st.mean(w) * 100, st.median(v) * 100, sum(1 for z in v if z > 0) / len(v) * 100)
    c = sum(1 for e in ev if e[chiave_crollo]) / len(ev) * 100
    u = sum(1 for e in ev if e["usc"]) / len(ev) * 100
    a12, md12, h12 = m("r12")
    a24, md24, h24 = m("r24")
    a6 = m("r6")[0]
    return (f"  {nome:<34} n={len(ev):>5}  crollo {c:5.1f}%  usciti {u:4.1f}%  | oltre mercato: 6m {a6:+6.1f}%  "
            f"12m {a12:+6.1f}% (mediana {md12:+6.1f}%, positivi {h12:4.1f}%)  24m {a24:+6.1f}% (mediana {md24:+6.1f}%, positivi {h24:4.1f}%)")


def vol(x, t, a, b):
    r = [math.log(x.p[t - j] / x.p[t - j - 1]) for j in range(a, b) if x.p.get(t - j) and x.p.get(t - j - 1)]
    return st.pstdev(r) if len(r) >= 10 else None


def main():
    cart, csec, cst = sys.argv[1], sys.argv[2], sys.argv[3]
    el, dati = O.carica(cart)
    tt = O.titoli(dati)
    spy = O.spy_mensile(cst)
    ultimo_m = max(max(x.p) for x, _ in tt.values())
    print(f"titoli con prezzi: {len(tt)} (usciti dalla borsa: {sum(1 for c in tt if el.get(c, {}).get('stato') == 'delistata')}); "
          f"ultimo mese {S._ym(ultimo_m)}")

    # ---------------------------------------------------------------- A) BOLLE
    print("\n" + "=" * 110 + "\nA) BOLLE: titoli saliti molto piu' del mercato in 24 mesi. CROLLO = -40% sotto il prezzo del segnale entro 24 mesi")
    ultimo_segnale = {}
    evA = []
    for t in range(S._n("1997-01"), S._n("2024-11")):
        univ = O.universo_onesto(tt, t)
        s0, s24 = spy.get(t), spy.get(t - 24)
        if not (s0 and s24):
            continue
        for x in univ:
            p0, p24 = x.p.get(t), x.p.get(t - 24)
            if not (p0 and p24):
                continue
            rel = (p0 / p24) / (s0 / s24) - 1
            if rel < SOGLIE_A[0] or t - ultimo_segnale.get(x.t, -99) < 12:
                continue
            ultimo_segnale[x.t] = t
            p6 = x.p.get(t - 6)
            acc = p6 and p0 > p24 and math.log(p0 / p6) / math.log(p0 / p24) > 0.5
            v1, v0 = vol(x, t, 0, 12), vol(x, t, 12, 24)
            vs = bool(v1 and v0 and v1 > 1.3 * v0)
            cv = tt[x.t][1]
            q1 = [cv.get(t - j, 0) / x.p[t - j] for j in range(0, 6) if x.p.get(t - j)]
            q0 = [cv.get(t - j, 0) / x.p[t - j] for j in range(12, 24) if x.p.get(t - j)]
            sc = bool(q1 and q0 and st.mean(q0) > 0 and st.mean(q1) > 1.5 * st.mean(q0))
            mn = minimo_dopo(x, t, 24)
            e = {"t": t, "rel": rel, "acc": bool(acc), "vs": vs, "sc": sc, "crollo": bool(mn and mn <= 0.6 * p0)}
            for k in (6, 12, 24):
                e[f"r{k}"], u = oltre(x, spy, t, k)
            e["usc"] = u
            evA.append(e)
    for a, b in PERIODI_A:
        ta, tb = S._n(a), S._n(b)
        print(f"\n -- periodo {a} -> {b}")
        sub = [e for e in evA if ta <= e["t"] <= tb]
        for i, s in enumerate(SOGLIE_A):
            hi = SOGLIE_A[i + 1] if i + 1 < len(SOGLIE_A) else 99
            print(riepilogo(f"rialzo oltre mercato +{int(s*100)}%..{'' if hi==99 else '+'+str(int(hi*100))+'%'}",
                            [e for e in sub if s <= e["rel"] < hi], "crollo"))
        big = [e for e in sub if e["rel"] >= 1.0]
        print("   sintomi, solo rialzi oltre +100%:")
        for k, nome in (("acc", "accelerazione"), ("vs", "volatilita' in salita"), ("sc", "scambi in salita")):
            print(riepilogo(f"   con {nome}", [e for e in big if e[k]], "crollo"))
            print(riepilogo(f"   senza {nome}", [e for e in big if not e[k]], "crollo"))
        print(riepilogo("   tutti e 3 i sintomi", [e for e in big if e["acc"] and e["vs"] and e["sc"]], "crollo"))
        print(riepilogo("   nessun sintomo", [e for e in big if not (e["acc"] or e["vs"] or e["sc"])], "crollo"))
    # base di confronto: un titolo qualsiasi dell'universo (stesso periodo), per sapere quanto e' "normale" un crollo
    print("\n -- base: titoli QUALSIASI dell'universo (un mese a caso ogni 12 per titolo)")
    for a, b in PERIODI_A:
        ev = []
        for t in range(S._n(a), S._n(b) + 1, 12):
            for x in O.universo_onesto(tt, t):
                p0 = x.p.get(t)
                mn = minimo_dopo(x, t, 24)
                e = {"t": t, "crollo": bool(mn and mn <= 0.6 * p0)}
                for k in (6, 12, 24):
                    e[f"r{k}"], u = oltre(x, spy, t, k)
                e["usc"] = u
                ev.append(e)
        print(riepilogo(f"base {a} -> {b}", ev, "crollo"))

    # ---------------------------------------------------------------- B) SCONTI
    print("\n" + "=" * 110 + "\nB) SCONTI: titoli a -60% o peggio dal massimo dei 24 mesi. CROLLO = un altro -50% entro 24 mesi")
    nomi = json.load(open(os.path.join(csec, "sec_nomi.json")))
    scambi = {c: sum(cv.values()) for c, (_, cv) in tt.items()}
    mappa = {t: c for t, c in BF.abbina(el, nomi, scambi).items() if t in tt}
    bil = BF.carica_bilanci(csec, set(mappa.values()))
    print(f"titoli abbinati a un bilancio SEC: {len(mappa)}")
    ultimo_segnale = {}
    evB = []
    for t in range(S._n("2010-06"), S._n("2024-11")):
        fm = BF.fine_mese(S._ym(t))
        for x in O.universo_onesto(tt, t):
            p0 = x.p.get(t)
            mx = max((x.p[t - j] for j in range(0, 25) if x.p.get(t - j)), default=None)
            if not (p0 and mx) or p0 > DD_B * mx or t - ultimo_segnale.get(x.t, -99) < 12:
                continue
            ultimo_segnale[x.t] = t
            fcf = None
            b = bil.get(mappa.get(x.t))
            if b:
                fco = BF.valore_anno(b, ("fco",), fm)
                if fco and BF._mesi_fra(fco[1], fm) <= 18:
                    cx = BF.valore_anno(b, ("capex", "capex2"), fm, fco[1])
                    fcf = fco[3] - (abs(cx[3]) if cx else 0.0)
            mn = minimo_dopo(x, t, 24)
            e = {"t": t, "fcf": fcf, "crollo": bool(mn and mn <= 0.5 * p0)}
            for k in (6, 12, 24):
                e[f"r{k}"], u = oltre(x, spy, t, k)
            e["usc"] = u
            evB.append(e)
    for a, b in PERIODI_B:
        ta, tb = S._n(a), S._n(b)
        sub = [e for e in evB if ta <= e["t"] <= tb]
        print(f"\n -- periodo {a} -> {b}")
        print(riepilogo("tutti gli sconti -60%", sub, "crollo"))
        print(riepilogo("SCONTO CON CASSA (FCF > 0)", [e for e in sub if e["fcf"] is not None and e["fcf"] > 0], "crollo"))
        print(riepilogo("SCONTO SENZA CASSA (FCF <= 0)", [e for e in sub if e["fcf"] is not None and e["fcf"] <= 0], "crollo"))
        print(riepilogo("senza bilancio abbinato", [e for e in sub if e["fcf"] is None], "crollo"))


if __name__ == "__main__":
    main()
