# -*- coding: utf-8 -*-
"""
studio_carry_materie.py - v8.48 STUDIO: IL "CARRY" DELLE MATERIE PRIME (libro CFA Vol. 7 "Derivatives", cap. 4-6:
costo di mantenimento, backwardation e contango) - richiesto da Ya il 21/11/2026.

IDEA: quando i contratti future lontani costano MENO di quelli vicini (backwardation) chi rinnova guadagna; quando
costano di piu' (contango) perde. Non abbiamo la curva completa dei future, ma il rendimento del rinnovo si MISURA
da cio' che abbiamo: un ETF che compra i future e li rinnova (rendimento totale, rinnovo compreso) contro il prezzo
del contratto piu' vicino o il prezzo a pronti (senza rinnovo). La differenza degli ultimi 12 mesi, meno l'interesse
dei titoli a 3 mesi che l'ETF incassa sulla liquidita', e' il CARRY realizzato: > 0 = backwardation.
COPPIE (ETF / prezzo senza rinnovo): USO / petrolio WTI a pronti (FRED), UNG / gas Henry Hub a pronti (FRED),
  CPER / rame contratto vicino (HG=F), CORN / mais (ZC=F), WEAT / grano (ZW=F), SOYB / soia (ZS=F).
REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI (fine mese, mese dopo, rendimenti dell'ETF, costo 0,10% a cambio):
  A) solo trend (come i portafogli): ETF sopra la sua media a 10 mesi, altrimenti liquidita' (titoli a 3 mesi);
  B) trend + carry: in piu' carry degli ultimi 12 mesi > 0;
  C) incrociato (Erb-Harvey): ogni mese le materie con carry sopra la mediana, pesi uguali, contro tutte a pesi uguali.
  Periodi: SVILUPPO fino al 2017, VERIFICA 2018-oggi. ENTRA solo se in VERIFICA migliora rendimento E drawdown
  (B contro A, sommando le materie a pesi uguali) e il test sulle coppie (verifica_stat) non e' contro;
  per C: media mensile > 0 in entrambi i periodi con t >= 2 in verifica.
USO: python studi/studio_carry_materie.py <cartella storico>
"""
import csv
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from cot_radar import verifica_stat as V

COPPIE = [("Petrolio WTI", "yahoo/USO.csv", "DCOILWTICO.csv"), ("Gas naturale", "yahoo/UNG.csv", "DHHNGSP.csv"),
          ("Rame", "yahoo/CPER.csv", "yahoo/HG=F.csv"), ("Mais", "yahoo/CORN.csv", "yahoo/ZC=F.csv"),
          ("Grano", "yahoo/WEAT.csv", "yahoo/ZW=F.csv"), ("Soia", "yahoo/SOYB.csv", "yahoo/ZS=F.csv")]
TAGLIO, COSTO = "2018-01", 0.001


def mensile(f):
    out = {}
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r)
        for x in r:
            try:
                v = float(x[-1])
            except (ValueError, IndexError):
                continue
            if v > 0:
                out[x[0][:7]] = v
    return out


def stat(r):
    v, pk, dd = 1.0, 1.0, 0.0
    for x in r:
        v *= 1 + x
        pk = max(pk, v)
        dd = min(dd, v / pk - 1)
    return (v ** (12 / len(r)) - 1) * 100, dd * 100


def main(cart):
    tb = mensile(os.path.join(cart, "DTB3.csv"))
    dati = {}
    for nome, fe, fs in COPPIE:
        e, s = mensile(os.path.join(cart, fe)), mensile(os.path.join(cart, fs))
        mesi = sorted(m for m in e if m in s and m in tb)
        car, tre, rnd = {}, {}, {}
        for i in range(12, len(mesi) - 1):
            m, m12, n = mesi[i], mesi[i - 12], mesi[i + 1]
            interesse = sum(tb[mesi[i - k]] for k in range(12)) / 12 / 100
            car[m] = math.log(e[m] / e[m12]) - math.log(s[m] / s[m12]) - interesse
            tre[m] = e[m] > sum(e[mesi[i - k]] for k in range(10)) / 10
            rnd[m] = (e[n] / e[m] - 1, tb[m] / 1200)          # (rendimento ETF mese dopo, liquidita')
        dati[nome] = (car, tre, rnd)
        cc = [v for v in car.values()]
        print(f"{nome:13} dal {min(car)}: carry medio {sum(cc) / len(cc) * 100:+.1f}% l'anno, "
              f"in backwardation il {sum(1 for v in cc if v > 0) / len(cc) * 100:.0f}% dei mesi, oggi {car[max(car)] * 100:+.1f}%")
    mesi = sorted(set().union(*[set(d[0]) for d in dati.values()]))
    # ---------- A contro B (pesi uguali tra le materie disponibili quel mese)
    rA, rB, per, prima = [], [], [], {"A": {}, "B": {}}
    for m in mesi:
        att = [k for k in dati if m in dati[k][0]]
        if len(att) < 3:
            continue
        ra = rb = 0.0
        pos = {"A": {}, "B": {}}
        for k in att:
            car, tre, rnd = dati[k]
            re, rl = rnd[m]
            ina = tre[m]
            inb = tre[m] and car[m] > 0
            pos["A"][k], pos["B"][k] = ina, inb
            ra += (re if ina else rl) / len(att)
            rb += (re if inb else rl) / len(att)
        ca = sum(1 for k in att if pos["A"][k] != prima["A"].get(k, False)) / len(att) * COSTO
        cb = sum(1 for k in att if pos["B"][k] != prima["B"].get(k, False)) / len(att) * COSTO
        prima = pos
        rA.append(ra - ca); rB.append(rb - cb); per.append(m)
    print("\nA) solo trend  contro  B) trend + carry > 0   (materie a pesi uguali, mese dopo, costi inclusi)")
    for nome, ok in (("sviluppo fino al 2017", lambda m: m < TAGLIO), ("verifica 2018-oggi", lambda m: m >= TAGLIO)):
        a = [x for x, m in zip(rA, per) if ok(m)]
        b = [x for x, m in zip(rB, per) if ok(m)]
        (ca, da), (cb, db) = stat(a), stat(b)
        c = V.coppie([q - p for p, q in zip(a, b)])
        print(f"  {nome:22} A {ca:+.2f}% annuo, drawdown {da:.1f}% | B {cb:+.2f}% annuo, drawdown {db:.1f}% | "
              f"coppie {c['media'] * 1200:+.2f}% annuo, p {c['p_t']:.2f} ({len(a)} mesi)")
    # ---------- C incrociato: carry sopra la mediana contro tutte
    print("\nC) materie con carry sopra la mediana (pesi uguali) contro tutte (pesi uguali), mese dopo")
    diff = []
    for m in mesi:
        att = [k for k in dati if m in dati[k][0]]
        if len(att) < 4:
            continue
        ordine = sorted(att, key=lambda k: dati[k][0][m], reverse=True)
        top = ordine[:len(att) // 2]
        rt = sum(dati[k][2][m][0] for k in top) / len(top)
        rall = sum(dati[k][2][m][0] for k in att) / len(att)
        diff.append((m, rt - rall))
    for nome, ok in (("sviluppo fino al 2017", lambda m: m < TAGLIO), ("verifica 2018-oggi", lambda m: m >= TAGLIO)):
        x = [d for m, d in diff if ok(m)]
        c = V.coppie(x)
        print(f"  {nome:22} media {c['media'] * 100:+.2f}% al mese ({c['media'] * 1200:+.1f}% annuo), t {c['t']:+.2f}, "
              f"p {c['p_t']:.3f}, meglio {c['meglio']} peggio {c['peggio']} ({len(x)} mesi)")


if __name__ == "__main__":
    main(sys.argv[1])
