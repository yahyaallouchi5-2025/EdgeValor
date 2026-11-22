# -*- coding: utf-8 -*-
"""
studio_comportamento_cot.py - COMPORTAMENTO DEL DATO COT, STRUMENTO PER STRUMENTO (Ya, 22/11/2026).
Base della sottoscheda "Comportamento COT" (al posto di "Backtest simulato" nella scheda Live).
Solo offline: dati gia' archiviati (ramo "storico": COT.csv, prezzi FRED, copie Yahoo).

DOMANDA DI YA: "se comprendo il comportamento del dato posso associare una strategia swing con probabilita' a mio
favore". Quindi: quando gli speculatori iniziano a spingere uno strumento, quante volte il prezzo va con loro, e IN
QUALI CONDIZIONI (note al momento dell'ingresso) va meglio o peggio. Piu' il flusso dell'open interest dei futures.

REGOLE FISSATE PRIMA DI GUARDARE I RISULTATI (scritte il 22/11/2026 prima del primo calcolo)
  EPISODIO   = come cot_radar/speculatori.py (stesse soglie del sito): dal report in cui la direzione degli
               speculatori diventa "comprano" o "vendono" fino al primo report in cui cambia. Tutti gli episodi
               dello storico (nessun limite a 60).
  INGRESSO   = prima chiusura dopo la pubblicazione del report (venerdi' 15:30 di New York).
  ESITI      = (a) EPISODIO: uscita alla prima chiusura dopo il report che chiude l'episodio;
               (b) 1 SETTIMANA: uscita alla prima chiusura dopo il report successivo (tenuta fissa).
               Rendimento nella direzione degli speculatori, MENO i costi del sito (motore.costo) andata e ritorno.
               "A favore" = rendimento netto > 0.
  PERIODI    = STUDIO fino al 31/12/2014, VERIFICA dal 01/01/2015 (mai usata per scegliere nulla), come gli altri
               studi COT del progetto. L'episodio appartiene al periodo della sua data di inizio.
  CONDIZIONI (tutte note all'ingresso, niente dati del futuro):
    C1 Forza del flusso:   forte se |z| del flusso settimanale >= 1,28 nella direzione degli speculatori (speculatori.py).
    C2 Volatilita':        calmo se la volatilita' delle 20 sedute prima dell'ingresso e' < 0,9 volte quella delle
                           250 sedute prima; agitato se > 1,1. (Diversa dal campo "vol" di speculatori.py, che e'
                           misurato DURANTE l'episodio e quindi non si conosce all'ingresso.)
    C3 Spinta:             ripetizione se un episodio nella stessa direzione e' finito nelle 3 settimane prima.
    C4 Open interest:      variazione dell'open interest del future (dal report COT) nelle 4 settimane fino al report
                           di partenza: in aumento / in calo (Belveal). Solo strumenti con UN future: materie prime,
                           indici, tassi, crypto e coppie col dollaro (future della valuta non USD). Non per i cross.
    C5 Prezzo nelle 4 settimane prima (chiusura del martedi' del report contro 4 martedi' prima): gia' a favore degli
                           speculatori / contro.
    C6 OI + prezzo (C4 x C5) = "denaro nuovo con il prezzo" (OI su e prezzo a favore) e "ricoperture" (OI giu e prezzo
                           a favore), come nello studio Belveal.
    (La curva dei futures - contango/backwardation - NON entra: storico disponibile solo per 6 materie dal 2007-2012.)
  LETTURA DI UNO STRUMENTO (esito a = episodio):
    "Segue gli speculatori" se, con almeno 30 episodi nello STUDIO e 20 nella VERIFICA:
        STUDIO: % a favore >= 55 e media netta > 0 con t >= 2;  VERIFICA: % a favore > 50 e media netta > 0.
    "Va contro" = stesse regole a specchio (<= 45%, media < 0 con t <= -2; verifica < 50% e media < 0).
    "Storico corto" se mancano gli episodi minimi; altrimenti "Nessuna tendenza dimostrata".
  CONDIZIONE CHE AIUTA (per famiglia e per tutto l'insieme, episodi raggruppati):
    differenza tra le due meta' (es. OI su - OI giu) nella stessa direzione in ENTRAMBI i periodi con t >= 2 nello
    studio e t >= 1,5 nella verifica. Gli episodi di strumenti diversi nella stessa settimana non sono indipendenti
    (le coppie condividono le valute): il t e' quindi ottimistico, per questo si chiede la conferma nella verifica.
  Le condizioni per singolo strumento sono mostrate come DESCRIZIONE (pochi casi), il giudizio vale per famiglia.
USO: python studi/studio_comportamento_cot.py <cartella archivio storico> [file json di uscita]
"""
import json
import math
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from cot_radar import motore, speculatori as SP, storico as S   # noqa: E402
from cot_radar.config import ASSETS, PRICES                       # noqa: E402
from cot_radar.cot import cot_series                              # noqa: E402

FINE_STUDIO = "2014-12-31"
VALUTE = ("EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "BRL", "ZAR", "USD")


INDICI = {"SP500", "NASDAQ", "DOW", "RUSSELL", "EAFE", "EM"}
TASSI = {"US2Y", "US5Y", "US10Y", "USBOND", "ULTRA"}
CRYPTO = {"BTC", "ETH"}


def famiglia(k, cls=None):
    """Famiglia della pagina (la classe di prezzo di motore.py mette tassi ed ETF tra materie/etf: qui elenco esplicito)."""
    if len(k) == 6 and k[:3] in VALUTE and k[3:] in VALUTE:
        return "Valute"
    return "Indici" if k in INDICI else "Tassi" if k in TASSI else "Crypto" if k in CRYPTO else "Materie prime"


def stat(v):
    """n, % a favore, media, t di una lista di rendimenti netti."""
    n = len(v)
    if n < 2:
        return {"n": n}
    m = sum(v) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1))
    return {"n": n, "pos": round(100 * sum(1 for x in v if x > 0) / n, 1), "media": round(m, 3),
            "t": round(m / (sd / math.sqrt(n)), 2) if sd else 0.0}


def diff(a, b):
    """t della differenza tra le medie di due gruppi (Welch)."""
    if len(a) < 5 or len(b) < 5:
        return None
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    se = math.sqrt(va / len(a) + vb / len(b))
    return {"d": round(ma - mb, 3), "t": round((ma - mb) / se, 2) if se else 0.0}


def lettura(st_, ve):
    if st_.get("n", 0) < 30 or ve.get("n", 0) < 20:
        return "corto"
    if st_["pos"] >= 55 and st_["media"] > 0 and st_["t"] >= 2 and ve["pos"] > 50 and ve["media"] > 0:
        return "segue"
    if st_["pos"] <= 45 and st_["media"] < 0 and st_["t"] <= -2 and ve["pos"] < 50 and ve["media"] < 0:
        return "contro"
    return "neutro"


def gamba_oi(k):
    """Chiave del future di cui leggere l'open interest (None per i cross)."""
    if len(k) == 6 and k[:3] in VALUTE and k[3:] in VALUTE:
        if "USD" not in (k[:3], k[3:]):
            return None
        return k[3:] if k[:3] == "USD" else k[:3]
    return k


def main():
    cart = sys.argv[1]
    uscita = sys.argv[2] if len(sys.argv) > 2 else None
    righe = S.leggi_cot(cart)
    arch = {sid: S.leggi(cart, sid) for sid, _ in PRICES.values()}
    prezzi = S.prezzi_usd(arch, cart)
    serie = cot_series(righe)
    oi = {a[0]: {x["date"]: x["oi"] for x in serie[a[1]]} for a in ASSETS if a[1] in serie}
    tutti = []                                         # un record per episodio chiuso
    for k, st in SP.direzioni(righe, prezzi).items():
        pts, cls = st["pts"], st["cls"]
        date_px = [p[0] for p in pts]
        eps = SP.episodi(st, None)
        sett = [x[0] for x in st["sett"]]
        g = gamba_oi(k)
        cst = motore.costo(k, k[:3], k[3:]) if cls == "fx" else motore.costo(k)
        for e in eps:
            if e["attivo"]:
                continue
            v = e["verso"]
            a = date_px.index(e["ing"])
            b = date_px.index(e["usc"])
            # esito a 1 settimana: prima chiusura dopo la pubblicazione del report successivo
            i0 = sett.index(e["inizio"])
            r1 = None
            if i0 + 1 < len(sett):
                x1 = motore._primo_dopo(pts, motore.pubblicazione_cot(sett[i0 + 1]), cls, a)
                if x1 is not None and x1 > a:
                    r1 = (pts[x1][1] / pts[a][1] - 1) * 100 * v - cst
            ris = (pts[b][1] / pts[a][1] - 1) * 100 * v - cst
            # C2 volatilita' prima dell'ingresso
            v20, v250 = SP._vol(pts, max(1, a - 20), a), SP._vol(pts, max(1, a - 250), a)
            rv = v20 / v250 if v20 and v250 and a >= 250 else None
            # C4/C5 open interest e prezzo nelle 4 settimane prima (martedi' del report)
            oi_su = px_fav = None
            if i0 >= 4:
                d0, d4 = sett[i0], sett[i0 - 4]
                if g and g in oi and d0 in oi[g] and d4 in oi[g] and oi[g][d0] != oi[g][d4]:
                    oi_su = oi[g][d0] > oi[g][d4]
                j0 = max(0, next((n for n in range(len(date_px) - 1, -1, -1) if date_px[n] <= d0), 0))
                j4 = max(0, next((n for n in range(j0, -1, -1) if date_px[n] <= d4), 0))
                if date_px[j0] <= d0 and date_px[j4] <= d4 and j0 > j4:
                    px_fav = (pts[j0][1] - pts[j4][1]) * v > 0
            tutti.append({"k": k, "fam": famiglia(k, cls), "inizio": e["inizio"], "fine": e["fine"], "verso": v,
                          "sett": e["sett"], "ris": round(ris, 3), "r1": None if r1 is None else round(r1, 3),
                          "mfe": e["mfe"], "mae": e["mae"], "g_mae": e["g_mae"], "d_mae": e["d_mae"],
                          "forte": e["aggr"], "rip": e["rip"], "rv": None if rv is None else round(rv, 2),
                          "oi_su": oi_su, "px_fav": px_fav, "studio": e["inizio"] <= FINE_STUDIO})
    stampa(tutti)
    if uscita:
        json.dump(tutti, open(uscita, "w"), separators=(",", ":"))


COND = (("Flusso forte", lambda e: e["forte"], "Flusso normale", lambda e: not e["forte"]),
        ("Mercato calmo", lambda e: e["rv"] is not None and e["rv"] < .9,
         "Mercato agitato", lambda e: e["rv"] is not None and e["rv"] > 1.1),
        ("Prima spinta", lambda e: not e["rip"], "Ripetizione", lambda e: e["rip"]),
        ("OI in aumento", lambda e: e["oi_su"] is True, "OI in calo", lambda e: e["oi_su"] is False),
        ("Prezzo gia' a favore", lambda e: e["px_fav"] is True, "Prezzo contro", lambda e: e["px_fav"] is False),
        ("Denaro nuovo col prezzo", lambda e: e["oi_su"] is True and e["px_fav"] is True,
         "Ricoperture", lambda e: e["oi_su"] is False and e["px_fav"] is True))


def stampa(tutti):
    print(f"episodi chiusi {len(tutti)}, strumenti {len({e['k'] for e in tutti})}")
    for campo, tit in (("ris", "ESITO A FINE EPISODIO"), ("r1", "ESITO A 1 SETTIMANA")):
        print(f"\n===== {tit} (netto costi) =====")
        for fam in ("TUTTI", "Valute", "Materie prime", "Indici", "Tassi", "Crypto"):
            E = [e for e in tutti if (fam == "TUTTI" or e["fam"] == fam) and e[campo] is not None]
            s, v = stat([e[campo] for e in E if e["studio"]]), stat([e[campo] for e in E if not e["studio"]])
            print(f"\n{fam:14} base  studio {s}  verifica {v}")
            for na, fa, nb, fb in COND:
                A = [e for e in E if fa(e)]
                B = [e for e in E if fb(e)]
                ds = diff([e[campo] for e in A if e["studio"]], [e[campo] for e in B if e["studio"]])
                dv = diff([e[campo] for e in A if not e["studio"]], [e[campo] for e in B if not e["studio"]])
                aiuta = bool(ds and dv and ((ds["t"] >= 2 and dv["t"] >= 1.5) or (ds["t"] <= -2 and dv["t"] <= -1.5)))
                sa, va_ = stat([e[campo] for e in A if e["studio"]]), stat([e[campo] for e in A if not e["studio"]])
                sb, vb = stat([e[campo] for e in B if e["studio"]]), stat([e[campo] for e in B if not e["studio"]])
                print(f"   {na:24} S {sa.get('n',0):5} {sa.get('pos','-'):>5}% {sa.get('media','-'):>7} | V {va_.get('n',0):5} {va_.get('pos','-'):>5}% {va_.get('media','-'):>7}"
                      f"   vs {nb:22} S {sb.get('pos','-'):>5}% {sb.get('media','-'):>7} | V {vb.get('pos','-'):>5}% {vb.get('media','-'):>7}"
                      f"   diff S {ds} V {dv} {'<== AIUTA' if aiuta else ''}")
    print("\n===== LETTURA PER STRUMENTO (esito a fine episodio) =====")
    per = defaultdict(list)
    for e in tutti:
        per[e["k"]].append(e)
    cont = defaultdict(int)
    for k in sorted(per, key=lambda k: (per[k][0]["fam"], k)):
        E = per[k]
        s, v = stat([e["ris"] for e in E if e["studio"]]), stat([e["ris"] for e in E if not e["studio"]])
        l = lettura(s, v)
        cont[l] += 1
        print(f"{per[k][0]['fam']:13} {k:9} {l:7} studio {s}  verifica {v}")
    print(dict(cont))


if __name__ == "__main__":
    main()
