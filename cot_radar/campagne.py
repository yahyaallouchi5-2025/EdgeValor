# -*- coding: utf-8 -*-
"""
campagne.py - v9.18 CAMPAGNE STAGIONALI SULLE PAGINE PUBBLICHE (home e /prezzi/), visibili anche a Google.

Stessa agenda del terminale (web/js/47_blackfriday.js), calcolata ogni anno in ORA ITALIANA (zoneinfo: ora legale
e solare comprese):
  inverno   Saldi d'inverno     2-10 gennaio
  pasqua    Offerta di Pasqua   dal lunedi' della Settimana Santa a Pasquetta
  estate    Saldi d'estate      dal primo sabato di luglio, 9 giorni
  black     Black Friday        dal lunedi' prima del Black Friday al Cyber Monday (Cyber Monday = ultimo giorno)
Offerta: 2026 Black Friday = tariffa attuale bloccata (il listino sale il 1/12/2026); dopo = Premium annuale -20%
il primo anno (piano PayPal promozionale, vedi supabase/functions/paypal).

COME SI VEDE
  La pagina si costruisce due volte al giorno: si inserisce la striscia della campagna in corso e anche quella che
  parte nelle prossime 36 ore. Uno script la mostra solo tra inizio e fine (all'ora esatta) e aggiorna il conto alla
  rovescia; dopo la fine sparisce da sola. Cosi' nessun prezzo vecchio resta in pagina (lezione della v8.28).
  /prezzi/ riceve anche i dati strutturati dell'offerta (schema.org Offer con validFrom e priceValidUntil).
DEBUG: python -c "from cot_radar import campagne as c; [print(x) for x in c.agenda(2027)]"
"""
import json
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROMA = ZoneInfo("Europe/Rome")
COLORI = {"black": ("#ff8a00", "#ff2e7e", "#8b5cf6"), "cyber": ("#00e5ff", "#3d7bff", "#b14bff"),
          "inverno": ("#7dd3fc", "#818cf8", "#e0f2fe"), "pasqua": ("#34d399", "#f472b6", "#fde047"),
          "estate": ("#fde047", "#fb923c", "#f43f5e")}
PROMO_PRONTA = True           # v9.18 piano PayPal promozionale creato (P-9WC59158HM233862FNMC6AXQ, -20% il primo anno)


def pasqua(y):
    """Domenica di Pasqua (algoritmo gregoriano di Meeus/Jones/Butcher)."""
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    return date(y, (h + l_ - 7 * m + 114) // 31, (h + l_ - 7 * m + 114) % 31 + 1)


def _primo(d, wd):
    """Primo giorno della settimana wd (0=lunedi') a partire da d."""
    return d + timedelta(days=(wd - d.weekday()) % 7)


def black_friday(y):
    return _primo(date(y, 11, 1), 3) + timedelta(days=22)      # venerdi' dopo il quarto giovedi' di novembre


def agenda(y):
    """Campagne dell'anno y: dict con k, nome, tema, da/a (datetime ora italiana, a = fine esclusa), offerta, pronta."""
    out = []

    def metti(k, nome, da, ultimo, **extra):
        c = {"k": k, "nome": nome, "tema": k, "anno": y, "ultimo": ultimo,
             "da": datetime(da.year, da.month, da.day, tzinfo=ROMA),
             "a": datetime(ultimo.year, ultimo.month, ultimo.day, tzinfo=ROMA) + timedelta(days=1)}
        c.update(extra)
        out.append(c)
    metti("inverno", "Saldi d'inverno", date(y, 1, 2), date(y, 1, 10))
    p = pasqua(y)
    metti("pasqua", "Offerta di Pasqua", p - timedelta(days=6), p + timedelta(days=1))
    est = _primo(date(y, 7, 1), 5)
    metti("estate", "Saldi d'estate", est, est + timedelta(days=8))
    bf = black_friday(y)
    metti("black", "Black Friday", bf - timedelta(days=4), bf + timedelta(days=3), bf=bf)
    for c in out:
        c["offerta"] = "blocco" if (c["k"] == "black" and y == 2026) else "sconto"
        c["pronta"] = c["offerta"] == "blocco" or PROMO_PRONTA
    return out


def in_vista(adesso=None, anticipo_ore=36):
    """Campagna pronta in corso adesso o che parte entro anticipo_ore (la pagina vive fino alla ricostruzione dopo)."""
    adesso = adesso or datetime.now(ROMA)
    for y in (adesso.year - 1, adesso.year, adesso.year + 1):
        for c in agenda(y):
            if c["pronta"] and c["da"] - timedelta(hours=anticipo_ore) <= adesso < c["a"]:
                return c
    return None


def _testi(c):
    fino = c["ultimo"].day
    mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre",
            "novembre", "dicembre"]
    data = f"{fino} {mesi[c['ultimo'].month - 1]}"
    if c["offerta"] == "blocco":
        return (f"Fino al {data}: Premium annuale a 19,99 € al mese invece di 24,99 € (−20%), "
                "bloccato finché resti abbonato.", "Blocca la tariffa")
    return (f"Fino al {data}: Premium annuale −20% il primo anno, 19,99 € al mese invece di 24,99 €.",
            "Attiva l'offerta")


def striscia(c, link="/prezzi/"):
    """HTML autonomo (stile e script inclusi) della striscia della campagna c per le pagine pubbliche."""
    if not c:
        return ""
    testo, cta = _testi(c)
    c1, c2, c3 = COLORI.get(c["tema"], COLORI["black"])
    da, a = int(c["da"].timestamp() * 1000), int(c["a"].timestamp() * 1000)
    cyber = int((datetime(c["ultimo"].year, c["ultimo"].month, c["ultimo"].day, tzinfo=ROMA)).timestamp() * 1000) if c["k"] == "black" else 0
    return f"""<div class="evpromo" id="evpromo" data-da="{da}" data-a="{a}" hidden style="--c1:{c1};--c2:{c2};--c3:{c3}">
<style>.evpromo{{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:1180px;margin:14px auto 0;padding:12px 16px;border-radius:16px;background:#050505;border:1px solid rgba(255,255,255,.08);color:#e8e8e8;font:600 14.5px/1.45 "Inter",system-ui}}
.evpromo[hidden]{{display:none}}
.evpromo::before{{content:"";position:absolute;z-index:-1;inset:-80% auto -80% -10%;width:60%;filter:blur(34px);opacity:.6;background:radial-gradient(closest-side,var(--c2),transparent),radial-gradient(closest-side at 70% 50%,var(--c1),transparent),radial-gradient(closest-side at 30% 50%,var(--c3),transparent);animation:evresp 9s ease-in-out infinite alternate}}
.evpromo::after{{content:"";position:absolute;inset:auto 0 0 0;height:2px;background:linear-gradient(90deg,var(--c1),var(--c2),var(--c3),var(--c1));background-size:300% 100%;animation:evscor 6s linear infinite}}
@keyframes evresp{{50%{{transform:translateX(90%) scale(1.2)}}100%{{transform:translateX(160%) scale(.95)}}}}@keyframes evscor{{to{{background-position:300% 0}}}}
.evpromo .evt{{flex:none;padding:5px 10px;border-radius:8px;color:#0a0a0a;font:900 12px/1 "Inter",system-ui;letter-spacing:.6px;text-transform:uppercase;background:linear-gradient(100deg,var(--c1),var(--c2))}}
.evpromo .evx{{flex:1;min-width:220px}}.evpromo .evc{{font:700 14px ui-monospace,monospace;color:#fff;font-variant-numeric:tabular-nums}}
.evpromo a{{flex:none;padding:9px 16px;border-radius:99px;color:#0a0a0a;font:800 13.5px "Inter",system-ui;text-decoration:none;background:linear-gradient(100deg,var(--c1),var(--c2))}}
@media (max-width:700px){{.evpromo{{margin:10px 12px 0;gap:10px}}.evpromo .evc{{margin-left:auto}}.evpromo .evx{{min-width:100%;order:3;font-size:13.5px}}.evpromo a{{order:4;width:100%;text-align:center}}}}
@media (prefers-reduced-motion:reduce){{.evpromo::before,.evpromo::after{{animation:none}}}}</style>
<span class="evt">{c["nome"]}</span><span class="evx">{testo}</span><span class="evc" aria-live="off"></span><a href="{link}">{cta}</a>
<script>(function(){{var b=document.getElementById("evpromo"),da=+b.dataset.da,a=+b.dataset.a,cy={cyber},t=b.querySelector(".evt"),c=b.querySelector(".evc");
function g(){{var n=Date.now();if(n<da||n>=a){{b.hidden=true;if(n>=a)clearInterval(i);return;}}b.hidden=false;
if(cy&&n>=cy){{t.textContent="Cyber Monday";b.style.setProperty("--c1","#00e5ff");b.style.setProperty("--c2","#3d7bff");b.style.setProperty("--c3","#b14bff");}}
var s=Math.floor((a-n)/1000),p=function(x){{return("0"+x).slice(-2)}};c.textContent=Math.floor(s/86400)+"g "+p(Math.floor(s%86400/3600))+":"+p(Math.floor(s%3600/60))+":"+p(s%60);}}
var i=setInterval(g,1000);g();}})();</script></div>"""


def dati_strutturati(c, mensile, annuale_anno):
    """schema.org Offer per /prezzi/ durante la campagna (Google: prezzo e date di validita')."""
    if not c:
        return ""
    prezzo = "239.88" if c["offerta"] == "sconto" else f"{annuale_anno:.2f}"
    d = {"@context": "https://schema.org", "@type": "Product", "name": "EdgeValor Premium",
         "description": "Terminale di analisi dei mercati finanziari: abbonamento Premium.",
         "brand": {"@type": "Brand", "name": "EdgeValor"},
         "offers": [{"@type": "Offer", "name": f"{c['nome']} - Premium annuale", "price": prezzo, "priceCurrency": "EUR",
                     "availability": "https://schema.org/InStock", "url": "https://edgevalor.com/prezzi/",
                     "validFrom": c["da"].isoformat(), "priceValidUntil": (c["a"] - timedelta(seconds=1)).date().isoformat()},
                    {"@type": "Offer", "name": "Premium mensile", "price": f"{mensile:.2f}", "priceCurrency": "EUR",
                     "availability": "https://schema.org/InStock", "url": "https://edgevalor.com/prezzi/"}]}
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False).replace("</", "<\\/") + "</script>"
