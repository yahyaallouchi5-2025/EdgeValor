# -*- coding: utf-8 -*-
"""
archivio_cot.py - v8.39 ARCHIVIO PUBBLICO DEI REPORT COT SETTIMANALI (Ya, 20/11/2026)

PERCHE': ogni settimana una pagina vera e indicizzabile (/cot/AAAA-MM-GG/) con la direzione dei grandi speculatori
su ogni mercato: e' cio' che le persone cercano su Google ("report COT questa settimana", "posizionamento COT oro")
e resta online per sempre, una pagina in piu' ogni venerdi'. Indice di tutte le settimane in /cot/.

FONTE: gli STESSI segnali del riepilogo Telegram del venerdi' (riepilogo.segnali sui dati della dashboard): il sito e
il canale non possono mai dire cose diverse. Nessun dato nuovo: il canale gratuito li pubblica gia'.

COME FUNZIONA
  - salva(): a ogni giro del sito su GitHub, se il report COT mostrato dalla dashboard e' NUOVO, la sua fotografia
    va in storico/cot_settimane/<data COT>.json (ramo "storico"). Una settimana gia' salvata NON si riscrive mai:
    resta quella vista al primo giro dopo l'uscita del report, come il messaggio Telegram.
  - crea(): scrive /cot/ (indice) e una pagina per settimana con la cornice delle pagine pubbliche
    (pagine_pubbliche.scrivi). Restituisce gli indirizzi per la sitemap.
DEBUG: python -c "from cot_radar import archivio_cot as a; print(a.settimane())"
"""
import html
import json
import os
import re

from . import riepilogo
from .config import SITO_PUBBLICO, TELEGRAM_CANALE
from .log import log

CARTELLA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storico", "cot_settimane")
# stesse parole del terminale (web/js: ETI)
ETI = {"STRONG BUY": "Forte rialzo", "BUY": "Rialzo", "SELL": "Ribasso", "STRONG SELL": "Forte ribasso", "NEUTRO": "Neutro"}
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre",
        "novembre", "dicembre"]
FRECCIA = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

CSS = """
/* archivio COT (archivio_cot.py) */
.cotin{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:0 0 34px}
.cotin div{padding:18px 20px;border-radius:18px;border:1px solid var(--line);background:rgba(10,22,48,.7)}
.cotin b{display:block;font:800 30px/1 "Inter Display","Inter",system-ui;letter-spacing:-.8px}.cotin span{color:var(--mute);font-size:14px}
.cotgr{columns:2;column-gap:18px}.cotgr .cotc{break-inside:avoid;margin:0 0 18px}
.cotc{padding:22px 24px;border-radius:22px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(11,29,66,.7),rgba(7,20,49,.5))}
.cotc h2{margin:0 0 12px;font:750 13px/1 "Inter",system-ui;letter-spacing:1.4px;text-transform:uppercase;color:var(--mute)}
.cotr{display:grid;grid-template-columns:1fr auto 62px;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.06)}
.cotr:first-of-type{border-top:0}.cotr b{font:650 15.5px "Inter",system-ui}.cotr em{font-style:normal;color:#f3c75f;margin-left:6px;font-size:13px}
.cotr span{font:700 12.5px "Inter",system-ui;padding:5px 10px;border-radius:99px;white-space:nowrap}
.cotr .su{color:#4fd6a3;background:rgba(79,214,163,.12)}.cotr .giu{color:#ff7a8a;background:rgba(255,122,138,.12)}
.cotr .forte.su{color:#03141a;background:#4fd6a3}.cotr .forte.giu{color:#2a0008;background:#ff7a8a}
.cotr i{font:700 14.5px "Inter",system-ui;font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2)}
.cotch{margin-top:0}.cotch div{display:flex;flex-wrap:wrap;gap:8px}.cotch span{padding:6px 12px;border-radius:99px;border:1px solid var(--line);color:var(--ink2);font-size:14px}.cotch span b{font-weight:650;color:var(--ink)}
.cotnav{display:flex;justify-content:space-between;gap:12px;margin-top:34px}.cotnav a{color:var(--ink2);text-decoration:none;font-weight:650}
.cotnav a:hover{color:var(--ink)}
.cotinfo{margin:0 0 26px;color:var(--mute);font-size:14.5px}.cotinfo summary{cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--ink2);list-style:none}
.cotinfo summary::-webkit-details-marker{display:none}.cotinfo summary i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--line);font:800 12px "Inter",system-ui;font-style:normal}
.cotinfo p{max-width:760px;margin:10px 0 0;line-height:1.55}
.cotel{display:grid;gap:10px}.cotel a{display:flex;justify-content:space-between;gap:12px;padding:16px 20px;border-radius:16px;border:1px solid var(--line);background:rgba(10,22,48,.7);color:var(--ink);text-decoration:none;transition:border-color .2s,transform .2s}
.cotel a:hover{border-color:var(--acc);transform:translateY(-1px)}.cotel a span{color:var(--mute);font-size:14.5px}
@media (max-width:900px){.cotgr{columns:1}}
@media (max-width:640px){.cotin{gap:8px}.cotin div{padding:14px 12px}.cotin b{font-size:24px}.cotin span{font-size:12.5px}.cotc{padding:18px}.cotr{grid-template-columns:1fr auto 52px;gap:8px}.cotel a{flex-direction:column;gap:4px}}
"""


def data_it(d):
    """'2026-11-10' -> '10 novembre 2026'."""
    return f"{int(d[8:10])} {MESI[int(d[5:7]) - 1]} {d[:4]}"


def istantanea(dati):
    """Fotografia della settimana: {cot, attivi: {categoria: [segnali]}, chiusi} oppure None se manca la data."""
    cot = riepilogo.data_cot(dati)
    if not cot:
        return None
    attivi, chiusi = riepilogo.segnali(dati)
    return {"cot": cot, "attivi": attivi, "chiusi": chiusi}


def salva(dati, cartella=CARTELLA):
    """Salva la settimana se non c'e' ancora (mai riscritta). -> data COT salvata ora, oppure None."""
    f = istantanea(dati)
    if not f or not f["attivi"]:
        return None
    nome = os.path.join(cartella, f["cot"] + ".json")
    if os.path.exists(nome):
        return None
    os.makedirs(cartella, exist_ok=True)
    with open(nome, "w", encoding="utf-8") as fh:
        json.dump(f, fh, ensure_ascii=False, separators=(",", ":"))
    log.info("archivio COT: salvata la settimana del %s", f["cot"])
    return f["cot"]


def settimane(cartella=CARTELLA):
    """[fotografie] dalla piu' recente."""
    if not os.path.isdir(cartella):
        return []
    out = []
    for n in sorted(os.listdir(cartella), reverse=True):
        if n.endswith(".json") and len(n) == 15:
            try:
                with open(os.path.join(cartella, n), encoding="utf-8") as fh:
                    out.append(json.load(fh))
            except (OSError, ValueError):
                log.warning("archivio COT: %s illeggibile, saltato", n)
    return out


def _numero(p):
    return f"{p:+.1f}".replace(".", ",") if isinstance(p, (int, float)) else "n.d."


def _nome(n):
    """Nome leggibile: gli accenti scritti con l'apostrofo nei dati ("Caffe'", "volatilita'") tornano accenti veri."""
    n = re.sub(r"([aiou])'(?=\W|$)", lambda m: {"a": "à", "i": "ì", "o": "ò", "u": "ù"}[m.group(1)], n)
    return html.escape(re.sub(r"e'(?=\W|$)", "è", n))


def _riga(s):
    e = s["etichetta"]
    cls = ("forte " if "STRONG" in e else "") + ("su" if "BUY" in e else "giu")
    return (f'<div class="cotr"><b>{_nome(s["nome"])}' + ('<em title="nuovo con questo report">★</em>' if s["nuovo"] else "") +
            f'</b><span class="{cls}">{ETI.get(e, e)}</span><i>{_numero(s["punteggio"])}</i></div>')


def pagina_settimana(f, prima=None, dopo=None):
    """(titolo, descrizione, corpo HTML) della pagina di una settimana."""
    d = data_it(f["cot"])
    tutti = [s for v in f["attivi"].values() for s in v]
    su, giu = sum(1 for s in tutti if "BUY" in s["etichetta"]), sum(1 for s in tutti if "SELL" in s["etichetta"])
    nuovi = sum(1 for s in tutti if s["nuovo"])
    top = sorted(tutti, key=lambda s: -abs(s["punteggio"] or 0))[:3]
    titolo = f"Report COT del {d}: posizionamento dei grandi speculatori · EdgeValor"
    desc = (f"Report COT della CFTC del {d}: {len(tutti)} mercati con una direzione chiara dei grandi speculatori "
            f"({su} al rialzo, {giu} al ribasso). Più forti: " + ", ".join(f"{html.unescape(_nome(s['nome']))} {ETI[s['etichetta']].lower()}" for s in top) + ".")
    carte = "".join(f'<section class="cotc"><h2>{html.escape(c)}</h2>' + "".join(_riga(s) for s in v) + "</section>"
                    for c, v in f["attivi"].items())
    chiusi = ""
    if f["chiusi"]:
        chiusi = ('<section class="cotc cotch"><h2>Tornati neutri con questo report</h2>' +
                  "<div>" + "".join(f'<span><b>{_nome(c["nome"])}</b> · era {ETI.get(c["prima"], c["prima"]).lower()}</span>' for c in f["chiusi"]) + "</div></section>")
    nav = '<nav class="cotnav">' + (f'<a href="/cot/{prima}/">&larr; {data_it(prima)}</a>' if prima else "<span></span>") + \
        '<a href="/cot/">Tutte le settimane</a>' + (f'<a href="/cot/{dopo}/">{data_it(dopo)} &rarr;</a>' if dopo else "<span></span>") + "</nav>"
    corpo = (f'<div class="titsez"><small>Report COT · {d}</small><h1>Cosa fanno i grandi speculatori.</h1>'
             f'<p>La direzione dei non commercial su ogni mercato, dal report Commitments of Traders della CFTC.</p></div>'
             f'<div class="cotin"><div><b>{su}</b><span>al rialzo</span></div><div><b>{giu}</b><span>al ribasso</span></div>'
             f'<div><b>{nuovi}</b><span>nuovi con questo report</span></div></div>'
             '<details class="cotinfo"><summary><i>i</i>Come si legge</summary><p>Il punteggio va da &minus;100 a +100 e misura '
             "quanto e con quanta forza i grandi speculatori (hedge fund e gestori) comprano o vendono un mercato, settimana dopo "
             "settimana. Compaiono solo i mercati con una direzione chiara; ★ = direzione nata con questo report. I dati del "
             "report sono di martedì e la CFTC li pubblica il venerdì. È un'informazione statistica, non una consulenza "
             "finanziaria.</p></details>"
             f'<div class="cotgr">{carte}</div>{chiusi}{nav}'
             f'<div class="fine"><a class="btn pri" href="/accedi/">{FRECCIA}Apri il terminale</a>'
             f'<a class="btn sec" href="{TELEGRAM_CANALE}" target="_blank" rel="noopener">Ricevilo ogni venerdì su Telegram</a></div>')
    return titolo, desc, corpo


def pagina_indice(tutte):
    righe = "".join(f'<a href="/cot/{f["cot"]}/"><b>Report COT del {data_it(f["cot"])}</b><span>'
                    f'{sum(len(v) for v in f["attivi"].values())} mercati con una direzione chiara</span></a>' for f in tutte)
    corpo = ('<div class="titsez"><small>Archivio</small><h1>Report COT, settimana per settimana.</h1>'
             "<p>Ogni venerdì la direzione dei grandi speculatori su forex, materie prime, indici, tassi e crypto. "
             "Le settimane restano qui, così come sono uscite.</p></div>" + f'<div class="cotel">{righe}</div>' +
             f'<div class="fine"><a class="btn pri" href="/accedi/">{FRECCIA}Apri il terminale</a>'
             f'<a class="btn sec" href="{TELEGRAM_CANALE}" target="_blank" rel="noopener">Iscriviti al canale Telegram</a></div>')
    return ("Archivio dei report COT settimanali · EdgeValor",
            "Tutti i report COT della CFTC letti da EdgeValor: ogni settimana la direzione dei grandi speculatori su forex, "
            "materie prime, indici azionari, tassi e crypto.", corpo)


def crea(cartella_sito, home, cartella=CARTELLA):
    """Scrive /cot/ e /cot/<data>/ per ogni settimana salvata. -> indirizzi per la sitemap."""
    from . import pagine_pubbliche as P
    tutte = settimane(cartella)
    c = P.cornice(home)
    if not tutte or not c:
        return []
    testa, piede = c
    fatte = [P.scrivi(cartella_sito, "cot", *pagina_indice(tutte), testa, piede, qui="cot", css=CSS)]
    for i, f in enumerate(tutte):
        prima = tutte[i + 1]["cot"] if i + 1 < len(tutte) else None
        dopo = tutte[i - 1]["cot"] if i > 0 else None
        fatte.append(P.scrivi(cartella_sito, f"cot/{f['cot']}", *pagina_settimana(f, prima, dopo), testa, piede, qui="cot", css=CSS))
    return fatte


def indirizzo(cot):
    """Indirizzo pubblico della pagina di una settimana (per il messaggio Telegram)."""
    return f"{SITO_PUBBLICO}cot/{cot}/"
