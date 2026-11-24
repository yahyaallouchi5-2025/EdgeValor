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
v9.20 (Ya) FINESTRA SULLA LANDING (finestra()): la stessa card del terminale, una sola, quando il visitatore sta leggendo
  (25 secondi di lettura con la scheda in primo piano e almeno un quinto della pagina scorsa) oppure sta per uscire
  (PC, dopo 15 s). Mai mentre scrive in un campo, mai sopra un'altra finestra, mai a chi ha gia' fatto l'accesso
  (quelli la vedono nel terminale, che sa se hanno gia' Premium). Al massimo una volta al giorno, piu' una nelle
  ULTIME 8 ORE della campagna. Memoria condivisa con il terminale (localStorage "ebBF", stesso sito): niente doppioni.
  Prestazioni (lezione v9.19 sfarfallio): niente backdrop-filter ne' mix-blend, animazioni solo di transform.
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


def _ms(d):
    return int(datetime(d.year, d.month, d.day, tzinfo=ROMA).timestamp() * 1000)


def finestra(c, link="/terminale/?premium=1"):
    """v9.20 finestra della campagna per la landing (HTML autonomo). Vedi l'intestazione del file."""
    if not c:
        return ""
    c1, c2, c3 = COLORI.get(c["tema"], COLORI["black"])
    da, a = int(c["da"].timestamp() * 1000), int(c["a"].timestamp() * 1000)
    bf = _ms(c["bf"]) if c["k"] == "black" else 0
    sab = _ms(c["bf"] + timedelta(days=1)) if bf else 0
    cy = _ms(c["ultimo"]) if bf else 0
    mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre",
            "novembre", "dicembre"]
    fino = f"{c['ultimo'].day} {mesi[c['ultimo'].month - 1]}"
    if c["offerta"] == "blocco":
        tit, sott, poi, cta = ("Blocca la tariffa attuale.",
                               f"Fino al {fino}: Premium annuale a 19,99 € al mese invece di 24,99 €, finché resti abbonato.",
                               "239,88 € all'anno · dal 1/12", "Blocca la tariffa")
    else:
        tit, sott, poi, cta = ("Premium annuale −20%.", f"Fino al {fino}: il primo anno a 19,99 € al mese invece di 24,99 €.",
                               "239,88 € il primo anno · invece di", "Attiva l'offerta")
    return f"""<div class="evf" id="evf" hidden data-da="{da}" data-a="{a}" data-bf="{bf}" data-sab="{sab}" data-cy="{cy}" data-k="{c['k']}" data-anno="{c['anno']}" style="--c1:{c1};--c2:{c2};--c3:{c3}">
<style>.evf{{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);opacity:0;transition:opacity .22s}}
.evf[hidden]{{display:none}}.evf.on{{opacity:1}}
.evf .evb{{position:relative;isolation:isolate;overflow:hidden;contain:paint;transform:translateZ(0) scale(.97);transition:transform .22s;width:100%;max-width:440px;padding:26px 22px 18px;border-radius:22px;background:#07070a;color:#e8e8e8;font:15px/1.5 "Inter",system-ui;box-shadow:0 30px 80px rgba(0,0,0,.6)}}
.evf.on .evb{{transform:translateZ(0) scale(1)}}
.evf .evb::before{{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(135deg,var(--c1),var(--c2) 45%,var(--c3));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}}
.evf .evl{{position:absolute;z-index:-1;inset:0;pointer-events:none}}.evf .evl b{{position:absolute;width:62%;aspect-ratio:1;border-radius:50%;filter:blur(46px);opacity:.42;will-change:transform}}
.evf .evl b:nth-child(1){{background:var(--c1);left:-18%;top:-22%;animation:evv1 13s ease-in-out infinite alternate}}
.evf .evl b:nth-child(2){{background:var(--c2);right:-22%;top:18%;animation:evv2 16s ease-in-out infinite alternate}}
.evf .evl b:nth-child(3){{background:var(--c3);left:12%;bottom:-30%;animation:evv3 19s ease-in-out infinite alternate}}
@keyframes evv1{{to{{transform:translate(55%,40%) scale(1.15)}}}}@keyframes evv2{{to{{transform:translate(-50%,35%) scale(.9)}}}}@keyframes evv3{{to{{transform:translate(40%,-45%) scale(1.1)}}}}
.evf .evx{{position:absolute;top:12px;right:12px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#ccc;font-size:15px;cursor:pointer}}
.evf .eva{{display:flex;gap:10px;align-items:center}}.evf .evt{{padding:5px 10px;border-radius:8px;color:#0a0a0a;font:900 11.5px/1 "Inter",system-ui;letter-spacing:.6px;text-transform:uppercase;background:linear-gradient(100deg,var(--c1),var(--c2))}}
.evf .evu{{font:800 11.5px "Inter",system-ui;letter-spacing:.5px;text-transform:uppercase;color:var(--c2)}}
.evf h2{{margin:14px 0 6px;font:800 25px/1.15 "Inter",system-ui;color:#fff;letter-spacing:-.4px}}.evf .evs{{margin:0 0 16px;color:#bdbdbd;font-size:14.5px}}
.evf .evn{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}}.evf .evn span{{padding:9px 0 7px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);text-align:center}}
.evf .evn b{{display:block;font:800 22px/1.1 ui-monospace,monospace;color:#fff;font-variant-numeric:tabular-nums}}.evf .evn small{{font-size:11px;color:#9a9a9a}}
.evf .evp{{position:relative;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid var(--c2)}}
.evf .evp i{{position:absolute;top:-10px;right:14px;padding:3px 9px;border-radius:99px;color:#0a0a0a;font:900 12px/1.2 "Inter",system-ui;font-style:normal;background:linear-gradient(100deg,var(--c1),var(--c2))}}
.evf .evp small{{color:#9a9a9a;font-size:12.5px}}.evf .evp div{{display:flex;align-items:baseline;gap:8px}}.evf .evp strong{{font:800 26px "Inter",system-ui;color:#fff}}.evf .evp s{{color:#8a8a8a}}
.evf .evv{{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;padding:14px;border-radius:14px;color:#0a0a0a;font:800 15.5px "Inter",system-ui;text-decoration:none;background:linear-gradient(100deg,var(--c1),var(--c2))}}
.evf .evd{{display:block;margin:8px auto 0;padding:8px 14px;border:0;background:none;color:#9a9a9a;font:600 13.5px "Inter",system-ui;cursor:pointer}}
@media (max-width:420px){{.evf .evb{{padding:22px 16px 14px}}.evf h2{{font-size:22px}}.evf .evn b{{font-size:19px}}}}
@media (prefers-reduced-motion:reduce){{.evf .evl b{{animation:none}}.evf,.evf .evb{{transition:none}}}}</style>
<div class="evb" role="dialog" aria-modal="true" aria-labelledby="evft"><i class="evl" aria-hidden="true"><b></b><b></b><b></b></i>
<button type="button" class="evx" aria-label="Chiudi">&#x2715;</button>
<div class="eva"><span class="evt">{c["nome"]}</span><span class="evu"></span></div>
<h2 id="evft">{tit}</h2><p class="evs">{sott}</p>
<div class="evn" role="timer" aria-label="Tempo rimasto"><span><b>00</b><small>giorni</small></span><span><b>00</b><small>ore</small></span><span><b>00</b><small>min</small></span><span><b>00</b><small>sec</small></span></div>
<div class="evp"><i>−20%</i><small>Premium annuale</small><div><strong>19,99 €</strong><span>/mese</span></div><small>{poi} <s>24,99 €</s></small></div>
<a class="evv" href="{link}">{cta} &rarr;</a><button type="button" class="evd">Più tardi</button></div>
<script>(function(){{var f=document.getElementById("evf");if(!f)return;var D=f.dataset,da=+D.da,a=+D.a,bf=+D.bf,sab=+D.sab,cy=+D.cy,ORE8=288e5;
var oggi=function(){{return new Intl.DateTimeFormat("en-CA",{{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}}).format(new Date());}};
var mem={{}};try{{mem=JSON.parse(localStorage.getItem("ebBF")||"{{}}");}}catch(e){{}}var salva=function(){{try{{localStorage.setItem("ebBF",JSON.stringify(mem));}}catch(e){{}}}};
// chi ha gia' fatto l'accesso la vede nel terminale (che sa se e' gia' Premium)
var dentro=false;try{{for(var i=0;i<localStorage.length;i++)if(/^sb-.*-auth-token$/.test(localStorage.key(i)))dentro=true;}}catch(e){{}}
if(dentro)return;
function fase(n){{if(!bf)return D.k;return n>=cy?"cyber":n>=sab?"weekend":n>=bf?"friday":"week";}}
var p=function(x){{return("0"+x).slice(-2);}},bb=f.querySelectorAll(".evn b"),t=f.querySelector(".evt"),u=f.querySelector(".evu");
function tic(){{var n=Date.now(),s=Math.max(0,Math.floor((a-n)/1000));[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60].forEach(function(v,i){{bb[i].textContent=p(v);}});
 u.textContent=a-n<ORE8?"Ultime ore":(cy&&n>=cy)||(!cy&&n>=a-864e5)?"Ultimo giorno":"";
 if(cy&&n>=cy){{t.textContent="Cyber Monday";f.style.setProperty("--c1","#00e5ff");f.style.setProperty("--c2","#3d7bff");f.style.setProperty("--c3","#b14bff");}}
 if(n>=a)chiudi();}}
var giro=null,aperta=false;
function chiudi(){{f.classList.remove("on");clearInterval(giro);document.removeEventListener("keydown",tasto);setTimeout(function(){{f.hidden=true;}},230);}}
function tasto(e){{if(e.key=="Escape")chiudi();}}
// mai mentre scrive in un campo o sopra un'altra finestra aperta
function libero(){{var x=document.activeElement;if(x&&/^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName))return false;
 return !document.querySelector('dialog[open],[aria-modal="true"]:not(#evf *)');}}
function apri(motivo){{var n=Date.now();if(aperta||n<da||n>=a||!libero())return false;var k8="ore8_"+D.anno+"_"+D.k;
 if(a-n<ORE8&&!mem[k8])mem[k8]=1;else if(mem.auto==oggi())return false;
 aperta=true;mem.auto=oggi();mem.motivo="landing_"+motivo;mem["vista_"+D.anno+"_"+fase(n)]=1;salva();
 tic();giro=setInterval(tic,1000);f.hidden=false;requestAnimationFrame(function(){{f.classList.add("on");}});document.addEventListener("keydown",tasto);
 if(window.ebStat&&ebStat.ev)try{{ebStat.ev("campagna_finestra");}}catch(e){{}}return true;}}
f.querySelector(".evx").onclick=chiudi;f.querySelector(".evd").onclick=chiudi;f.addEventListener("mousedown",function(e){{if(e.target==f)chiudi();}});
// lettura: secondi con la scheda in primo piano + quanto ha scorso la pagina
var letti=0,scorso=0;setInterval(function(){{if(aperta)return;if(document.visibilityState=="visible")letti++;
 var h=document.documentElement.scrollHeight-innerHeight;scorso=Math.max(scorso,h>0?scrollY/h:1);
 var n=Date.now();if(letti>=25&&scorso>=.2||letti>=10&&a-n<ORE8&&!mem["ore8_"+D.anno+"_"+D.k])apri("lettura");}},1000);
// PC: mouse verso la barra del browser (sta per uscire) dopo 15 secondi
document.addEventListener("mouseout",function(e){{if(!e.relatedTarget&&e.clientY<=0&&letti>=15)apri("uscita");}});
window.ebFinestraCampagna=apri;}})();</script></div>"""
