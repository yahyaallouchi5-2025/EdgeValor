# -*- coding: utf-8 -*-
"""
stato_titolo.py - v8.04 STATO DEL TITOLO nell'Azionario: EUFORIA (spia di bolla) e SCONTO con o senza cassa.
Ya, 18/11/2026. Per ora l'etichetta la vede solo l'admin (22_azioni.js); i numeri vengono dagli studi:
  studi/studio_bolle_sconti.py -> studi/risultati_bolle_sconti.txt (azioni USA anche uscite dalla borsa, 1997-2024).

EUFORIA (spia di bolla) = tutte e tre:
  1) negli ultimi 24 mesi il titolo ha fatto almeno +100% PIU' dell'S&P 500;
  2) il prezzo ACCELERA: piu' di meta' del rialzo dei 24 mesi (in scala logaritmica) e' arrivata negli ultimi 6 mesi;
  3) la VOLATILITA' SALE: oscillazione dei rendimenti mensili degli ultimi 12 mesi > 1,3 volte quella dei 12 mesi prima.
  Storia (stesse regole): drawdown del 40% entro 2 anni nel 50% (1997-2010) e nel 65% (2011-2024) dei casi, contro il
  30% e 20% di un titolo qualsiasi; titolo tipico dopo 2 anni -28% e -70% oltre il mercato.
  (Nello studio c'era anche il terzo sintomo "scambi in salita": qui non si usa perche' i volumi non sono nei dati
  della scheda; con i soli due sintomi i risultati sono uguali: vedi la riga "accelerazione + volatilita'".)
SCONTO = prezzo a -60% o peggio dal massimo dei 24 mesi (prezzi di fine mese), diviso in:
  SCONTO CON CASSA  = ultimo bilancio annuale SEC (al massimo 18 mesi fa) con flusso di cassa libero POSITIVO
                      (cassa operativa - investimenti): drawdown di un altro 50% entro 2 anni nel 29-33% dei casi;
  SCONTO SENZA CASSA = flusso di cassa libero negativo: drawdown di un altro 50% nel 46-48% dei casi.
  Solo aziende USA con bilancio SEC; banche e assicurazioni escluse (il flusso di cassa libero non ha senso per loro).
SOLO LIBRERIA STANDARD. DEBUG: python -c "from cot_radar import stato_titolo as s; help(s.calcola)"
"""
import math
from datetime import date

RIALZO = 1.0             # +100% oltre l'S&P 500 in 24 mesi
ACCEL = 0.5              # quota del rialzo (log) arrivata negli ultimi 6 mesi
VOL_SALE = 1.3           # volatilita' 12 mesi / 12 mesi prima
SCONTO = 0.40            # prezzo <= 40% del massimo dei 24 mesi
MESI_BILANCIO = 18       # bilancio annuale al massimo 18 mesi prima di oggi


def mensili(rec):
    """{'AAAA-MM': ultimo prezzo del mese} dallo storico mensile, corretto con i prezzi giornalieri dove ci sono
    (lo storico mensile di Yahoo a volte salta un mese)."""
    out = {m: v for m, v in (rec.get("m") or []) if v}
    for d, v in rec.get("d") or []:
        if v:
            out[d[:7]] = v                       # i giornalieri arrivano in ordine: resta l'ultimo del mese
    return out


def _mese(ym, k):
    """mese 'AAAA-MM' spostato di k mesi"""
    a, m = int(ym[:4]), int(ym[5:7]) - 1 + k
    return "%d-%02d" % (a + m // 12, m % 12 + 1)


def _sd(v):
    if len(v) < 10:
        return None
    m = sum(v) / len(v)
    return math.sqrt(sum((x - m) ** 2 for x in v) / len(v))


def euforia(pm, im):
    """pm, im = mensili del titolo e dell'S&P 500. -> dict con i tre sintomi, oppure None se manca la storia."""
    if not pm or not im:
        return None
    ult = max(pm)
    m24, m6 = _mese(ult, -24), _mese(ult, -6)
    p, p24, p6 = pm.get(ult), pm.get(m24), pm.get(m6)
    i, i24 = im.get(ult) or im.get(_mese(ult, -1)), im.get(m24)
    if not (p and p24 and p6 and i and i24):
        return None
    rel = (p / p24) / (i / i24) - 1
    acc = p > p24 and math.log(p / p6) / math.log(p / p24) > ACCEL
    r = []
    for k in range(-24, 0):
        a, b = pm.get(_mese(ult, k)), pm.get(_mese(ult, k + 1))
        r.append(math.log(b / a) if a and b else None)
    v1, v0 = _sd([x for x in r[12:] if x is not None]), _sd([x for x in r[:12] if x is not None])
    vs = bool(v1 and v0 and v1 > VOL_SALE * v0)
    return {"rel": round(rel * 100), "acc": bool(acc), "vs": vs, "on": rel >= RIALZO and bool(acc) and vs}


def fcf_recente(bil, oggi):
    """flusso di cassa libero dell'ultimo bilancio annuale (al massimo 18 mesi fa) oppure None"""
    for a in reversed((bil or {}).get("anni") or []):
        if a.get("fcf") is None:
            continue
        mesi = (oggi.year - int(a["fine"][:4])) * 12 + oggi.month - int(a["fine"][5:7])
        return a["fcf"] if mesi <= MESI_BILANCIO else None
    return None


def calcola(rec, indice_rec, bil=None, settore=None, oggi=None):
    """Stato del titolo: {"k": "eu"|"sc"|"ss", ...dettagli} oppure None (nessuna etichetta: il caso normale)."""
    oggi = oggi or date.today()
    pm, im = mensili(rec or {}), mensili(indice_rec or {})
    if len(pm) < 26:
        return None
    eu = euforia(pm, im)
    if eu and eu["on"]:
        return {"k": "eu", "rel": eu["rel"], "acc": eu["acc"], "vs": eu["vs"]}
    ult = max(pm)
    mx = max((v for m, v in pm.items() if _mese(ult, -24) <= m <= ult), default=None)
    p = pm[ult]
    if mx and p <= SCONTO * mx and settore != "fin":
        f = fcf_recente(bil, oggi)
        if f is None:
            return None                          # senza bilancio recente non si puo' dire se la cassa regge
        return {"k": "sc" if f > 0 else "ss", "dd": round((p / mx - 1) * 100), "fcf": f}
    return None
