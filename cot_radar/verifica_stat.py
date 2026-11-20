# -*- coding: utf-8 -*-
"""
verifica_stat.py - v8.34 VERIFICA STATISTICA STANDARD (dal libro CFA Vol. 1 "Quantitative Methods", Ya 20/11/2026)

Regola del progetto: una regola nuova arriva sul sito solo se passa questa verifica. Tutto in Python puro (nessuna
libreria esterna), cosi' gira ovunque (PC di Ya, GitHub Actions).

  coppie(diff)        test sulle COPPIE di rendimenti (cap. 8 "dependent samples"): diff = rendimento nuova regola
                      meno vecchia, periodo per periodo. Restituisce media, t di Student con p-value, test dei segni
                      (non parametrico, cap. 8) e intervallo di confidenza al 95% col BOOTSTRAP (cap. 7).
  contingenza(a,b,c,d) tabella 2x2 (cap. 9 "tests of independence"): segnale si/no contro esito si/no.
                      Chi-quadro con p-value: dice se il legame tra segnale ed esito puo' essere solo caso.

DEBUG: python -c "from cot_radar import verifica_stat as v; print(v.coppie([0.01,-0.002,0.004]*20))"
"""
import math
import random


def _p_normale(z):
    """p-value a due code per uno z (approssimazione normale: va bene da ~30 osservazioni in su)."""
    return math.erfc(abs(z) / math.sqrt(2))


def _p_t(t, gl):
    """p-value a due code della t di Student con gl gradi di liberta' (integrale numerico della densita').
    Per gl >= 30 la differenza con la normale e' trascurabile."""
    if gl >= 30:
        return _p_normale(t)
    t = abs(t)
    c = math.gamma((gl + 1) / 2) / (math.sqrt(gl * math.pi) * math.gamma(gl / 2))
    f = lambda x: c * (1 + x * x / gl) ** (-(gl + 1) / 2)
    n, alto = 2000, t + 60.0                       # coda: da t a "quasi infinito" (regola di Simpson)
    h = (alto - t) / n
    s = f(t) + f(alto) + sum((4 if i % 2 else 2) * f(t + i * h) for i in range(1, n))
    return min(1.0, 2 * s * h / 3)


def coppie(diff, n_boot=4000, seme=1):
    """Test sulle coppie. diff = [differenze periodo per periodo]. -> dict con media, t, p_t, p_segni, ic95."""
    d = [x for x in diff if x is not None]
    n = len(d)
    if n < 10:
        return None
    m = sum(d) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1)) or 1e-12
    t = m / (sd / math.sqrt(n))
    # TEST DEI SEGNI: quante volte la nuova regola fa meglio (zeri esclusi); approssimazione normale della binomiale
    pos, neg = sum(1 for x in d if x > 0), sum(1 for x in d if x < 0)
    k = pos + neg
    p_segni = _p_normale((pos - k / 2) / math.sqrt(k / 4)) if k else 1.0
    # BOOTSTRAP: si ripesca n volte con reinserimento e si guarda la distribuzione della media
    rnd = random.Random(seme)
    medie = sorted(sum(rnd.choice(d) for _ in range(n)) / n for _ in range(n_boot))
    ic = (medie[int(n_boot * 0.025)], medie[int(n_boot * 0.975) - 1])
    return {"n": n, "media": m, "t": t, "p_t": _p_t(t, n - 1), "meglio": pos, "peggio": neg,
            "p_segni": p_segni, "ic95": ic}


def contingenza(a, b, c, d):
    """Tabella 2x2:            esito SI   esito NO
                  segnale SI      a          b
                  segnale NO      c          d
    -> dict con le due frequenze dell'esito (con e senza segnale), chi-quadro (correzione di Yates) e p-value."""
    n = a + b + c + d
    if min(a + b, c + d, a + c, b + d) == 0:
        return None
    chi = n * (max(0.0, abs(a * d - b * c) - n / 2)) ** 2 / ((a + b) * (c + d) * (a + c) * (b + d))
    return {"freq_con": a / (a + b), "freq_senza": c / (c + d), "chi2": chi,
            "p": math.erfc(math.sqrt(chi / 2))}      # chi-quadro con 1 grado di liberta'
