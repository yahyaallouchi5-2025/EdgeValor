# -*- coding: utf-8 -*-
"""
studio_yen.py - RIESAME DELLO YEN (Ya, 26/11/2026). Solo studio: il sito non cambia.

PARTENZA: in studi/risultati_nuovi_cot_prova.txt lo Yen (097741) NON passa la regola v2: guadagno medio nel verso
  del segnale, al netto della salita del cambio, +0,13% nello studio (fino al 2015) e -0,43% nella verifica (dal 2016),
  profit factor 0,67. Qui si guarda PERCHE' e se una lettura diversa regge.
PROVE (fissate prima di guardare i numeri, stessa regola v2 per ognuna: guadagno medio netto > 0 sia nello studio
  sia nella verifica, almeno 30 segnali in verifica):
  A  orizzonte: 1, 2, 4 (quello del sito) e 8 settimane dopo l'uscita del report;
  B  CON IL CARRY: chi compra yen con un future o un CFD paga ogni giorno la differenza di tasso tra dollaro e yen
     (chi lo vende la incassa). Il rendimento "vero" del segnale = cambio + carry nel verso del segnale.
     Tassi a 3 mesi mensili OCSE da FRED: USA IR3TIB01USM156N, Giappone IR3TIB01JPM156N;
  C  CONTRARIO: stesso punteggio, verso opposto (lo yen e' il mercato dei "carry trade affollati" che si sgonfiano);
  D  SOLO SEGNALI FORTI: |punteggio| >= STRONG del sito.
PREZZI: FRED DEXJPUS (yen per dollaro): prezzo dello yen in dollari = 1/DEXJPUS. Ingresso al primo prezzo dopo
  il venerdi' di pubblicazione, come nel sito.
USO: python studi/studio_yen.py
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from cot_radar import cot as C                    # noqa: E402
import studio_nuovi_cot as N                      # noqa: E402  (stessi download e stessa misura della deriva)

TAGLIO = "2016-01-01"
PASSI = (("1 settimana", 5), ("2 settimane", 10), ("4 settimane (sito)", 20), ("8 settimane", 40))


def tasso_mensile(sid):
    """{AAAA-MM: tasso %} da una serie mensile FRED."""
    return {d[:7]: v for d, v in N.fred(sid).items()}


def carry(us, jp, d0, d1):
    """Differenza di tasso dollaro - yen (% sul periodo) tra due date: chi e' LUNGO yen la paga."""
    giorni = (date.fromisoformat(d1) - date.fromisoformat(d0)).days
    m = d0[:7]
    if m not in us or m not in jp:
        return None
    return (us[m] - jp[m]) * giorni / 365


def segnali(ser, px, passi, us, jp, soglia):
    """[(data report, verso, rendimento cambio %, carry % nel verso del segnale)] per ogni segnale del sito."""
    date_px = sorted(px)
    out = []
    for t in range(30, len(ser)):
        s = C.cot_strength(ser, t)
        sc = s["cot"] if s else None
        if sc is None or abs(sc) < soglia:
            continue
        uscita = (date.fromisoformat(ser[t]["date"]) + timedelta(days=3)).isoformat()
        i = next((j for j, d in enumerate(date_px) if d > uscita), None)
        if i is None or i + passi >= len(date_px):
            continue
        a, b = date_px[i], date_px[i + passi]
        verso = 1 if sc > 0 else -1
        c = carry(us, jp, a, b)
        out.append((ser[t]["date"], verso, (px[b] / px[a] - 1) * 100 * verso, None if c is None else -c * verso))
    return out


def stat(x, salita, con_carry=False, contro=False):
    """Guadagno medio netto della salita, giusti %, profit factor (stessa regola v2 di studio_nuovi_cot)."""
    v = []
    for _, verso, r, c in x:
        if con_carry and c is None:
            continue
        g = r + (c if con_carry else 0)
        v.append(-g if contro else g)
    if not v:
        return None
    versi = [(-d if contro else d) for _, d, _, c in x if not (con_carry and c is None)]
    netto = sum(v) / len(v) - salita * sum(versi) / len(versi)
    vinte, perse = [a for a in v if a > 0], [-a for a in v if a < 0]
    pf = sum(vinte) / sum(perse) if perse else float("inf")
    return {"n": len(v), "giusti": sum(1 for a in v if a > 0) / len(v) * 100, "pf": pf, "netto": netto}


def riga(nome, st, ve):
    f = lambda s: (f"n {s['n']:4}  giusti {s['giusti']:5.1f}%  PF {s['pf']:4.2f}  netto {s['netto']:+6.2f}%"
                   if s else "nessun segnale")
    ok = st and ve and ve["n"] >= 30 and st["netto"] > 0 and ve["netto"] > 0
    return f"  {nome:32} STUDIO {f(st)}  |  VERIFICA {f(ve)}  -> {'PASSA' if ok else 'no'}"


def main():
    ser = C.cot_series(N.cot("097741")).get("097741") or []
    px = {d: 1 / v for d, v in N.fred("DEXJPUS").items() if v}
    us, jp = tasso_mensile("IR3TIB01USM156N"), tasso_mensile("IR3TIB01JPM156N")
    print(f"Yen (097741): {len(ser)} settimane COT dal {ser[0]['date']}; divisione studio/verifica al {TAGLIO}")
    print("Regola v2: guadagno medio nel verso del segnale AL NETTO della salita del cambio, > 0 nello studio E nella"
          " verifica, almeno 30 segnali in verifica. Giusti % e PF solo informativi.\n")
    for titolo, soglia in (("Segnali del sito (soglia NORMAL)", C.NORMAL), ("D  Solo segnali forti (STRONG)", C.STRONG)):
        print(titolo)
        for nome, passi in PASSI:
            x = segnali(ser, px, passi, us, jp, soglia)
            st, ve = [a for a in x if a[0] < TAGLIO], [a for a in x if a[0] >= TAGLIO]
            s_st, s_ve = N.deriva(px, passi, "1990-01-01", TAGLIO), N.deriva(px, passi, TAGLIO, "2099-01-01")
            print(riga(f"A  {nome}", stat(st, s_st), stat(ve, s_ve)))
            print(riga(f"B  {nome} + carry", stat(st, s_st, True), stat(ve, s_ve, True)))
            print(riga(f"C  {nome} contrario", stat(st, s_st, contro=True), stat(ve, s_ve, contro=True)))
        print()


if __name__ == "__main__":
    main()
