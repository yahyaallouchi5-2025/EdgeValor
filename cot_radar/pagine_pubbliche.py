# -*- coding: utf-8 -*-
"""
pagine_pubbliche.py - v8.07 PAGINE PUBBLICHE per i "sitelink" di Google (Ya, 18/11/2026):
  /prezzi/  /accedi/  /metodo/  /faq/
Google mostra le sotto-voci sotto il risultato (come "Seleziona il tuo piano", "Registrati"...) solo se il sito ha
piu' pagine vere, ognuna con titolo e descrizione propri e collegata dal menu. Prima c'erano solo home e note legali.

COME FUNZIONA
  Le pagine riusano stile, sfondo e pie' di pagina della home gia' costruita (vetrina.html): qui cambia solo il centro.
  PREZZI (decisi da Ya): Basic gratis; Premium 27,00 EUR al mese oppure 19,99 EUR al mese con il piano annuale (239,88 EUR in un unico pagamento)
    (il risparmio in % e in euro e' CALCOLATO qui sotto, non scritto a mano).
    v8.12: "Attiva Premium" porta al terminale (?premium=1) dove si paga con PayPal (abbonamento con rinnovo automatico).
    Prima (v8.07-8.11): "Contattaci" -> l'utente lasciava l'email -> arrivava al titolare (web3forms, la stessa
    chiave pubblica dell'Assistenza) che gli manda le istruzioni.
  ACCEDI: manda il link di accesso con Supabase (come il terminale) e riporta al terminale.
DEBUG: python -c "from cot_radar import pagine_pubbliche as p; print(p.RISP, p.eu(p.ANNO_TOT))"
"""
import os
import re

from urllib.parse import quote   # v8.23 indirizzo di ritorno del pulsante Google
from .config import SITO_PUBBLICO, SUPABASE_PUBBLICA, SUPABASE_URL, TELEGRAM_CANALE
from .log import log

TG = TELEGRAM_CANALE
MENSILE, ANNUALE = 27.00, 19.99                              # euro al mese: mensile, e annuale (pagato in un'unica rata)
RISP = round((1 - ANNUALE / MENSILE) * 100)                  # sconto dell'annuale in %
ANNO_TOT, ANNO_RISP = ANNUALE * 12, (MENSILE - ANNUALE) * 12
eu = lambda v: ("%.2f" % v).replace(".", ",")

CSS = """
/* pagine interne (prezzi, accedi, metodo, domande) */
.pag{padding-top:64px;padding-bottom:96px}.pag .titsez{margin-bottom:40px}.pag h1{min-height:0!important;font:800 clamp(32px,4.6vw,54px)/1.08 "Inter Display","Inter",system-ui;letter-spacing:-1.6px;margin:12px 0 14px}
.voci a.qui{color:var(--ink)}
.cambio{display:inline-flex;padding:5px;border-radius:14px;border:1px solid var(--line);background:rgba(10,22,48,.7);margin-bottom:26px}
.cambio button{display:flex;align-items:center;gap:8px;padding:10px 18px;border:0;border-radius:10px;background:transparent;color:var(--mute);font:700 14.5px "Inter",system-ui;cursor:pointer;transition:background .2s,color .2s}
.cambio button.on{background:rgba(46,196,182,.14);color:var(--ink)}
.cambio em{font-style:normal;font-size:12px;font-weight:800;padding:3px 8px;border-radius:99px;color:#03141a;background:var(--acc)}
.prezzo{display:flex;align-items:baseline;gap:8px;margin:14px 0 4px}.prezzo b{font:800 46px/1 "Inter Display","Inter",system-ui;letter-spacing:-1.6px}
.prezzo span{color:var(--mute);font-size:15px}.prezzo s{color:var(--mute);font-size:18px}
.sotto{min-height:22px;margin:0 0 20px;font-size:14.5px;color:var(--mute)}.sotto b{color:var(--su,#4fd6a3)}
.piano.pro .ptag{color:#2a1d00;border-color:transparent;background:linear-gradient(135deg,#ffe7a3,#f3c75f 55%,#c9962b);box-shadow:0 4px 14px rgba(243,199,95,.25)}
.piano .btn{margin-top:26px;width:100%}.piano ul{flex:1;align-content:start}
.nota{margin-top:22px;text-align:center;color:var(--mute);font-size:14.5px}
.modulo{max-width:520px;margin:0 auto;padding:30px 32px;border-radius:24px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(11,29,66,.7),rgba(7,20,49,.5))}
.modulo h3{font:750 22px/1.25 "Inter Display","Inter",system-ui;margin:0 0 6px}.modulo p{margin:0 0 18px;color:var(--ink2);font-size:15.5px}
.gbtn{display:flex;align-items:center;justify-content:center;gap:10px;height:48px;border-radius:14px;background:#fff;color:#1f1f1f;font:650 15px "Inter",system-ui;text-decoration:none;transition:box-shadow .15s,transform .15s}
.gbtn:hover{box-shadow:0 6px 18px rgba(0,0,0,.25);transform:translateY(-1px)}.gbtn svg{width:20px;height:20px}
.oppure{display:flex;align-items:center;gap:12px;margin:18px 0;font-size:12.5px;color:var(--mute)}.oppure:before,.oppure:after{content:"";flex:1;height:1px;background:var(--line)}
.modulo label{display:block;font-size:13px;font-weight:700;color:var(--mute);margin:0 0 6px}
.modulo input,.modulo select{width:100%;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:#060f24;color:var(--ink);font:500 16px "Inter",system-ui;margin-bottom:14px}
.modulo input:focus,.modulo select:focus{outline:0;border-color:var(--acc)}
.modulo .btn{width:100%}.modulo small{display:block;margin-top:12px;color:var(--mute);font-size:13px;text-align:center}.modulo small a{color:inherit}
.modulo .esito{min-height:20px;margin:12px 0 0;font-size:14.5px;text-align:center;color:var(--ink2)}.modulo .ok{text-align:center}.modulo .ok b{display:block;font:750 20px "Inter Display","Inter",system-ui;margin-bottom:6px}
.modulo .trap{position:absolute;left:-9999px}
.contatto{margin-top:56px;scroll-margin-top:90px}
.passi{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}
.passo{padding:26px;border-radius:22px;border:1px solid var(--line);background:rgba(10,22,48,.7)}
.passo i{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;font:800 15px "Inter",system-ui;font-style:normal;color:#03141a;background:var(--acc);margin-bottom:14px}
.passo b{display:block;font:750 18px "Inter Display","Inter",system-ui;margin-bottom:6px}.passo p{margin:0;color:var(--ink2);font-size:15px}
.sez2{margin-top:72px}.sez2 h2{font:800 clamp(24px,3vw,34px)/1.15 "Inter Display","Inter",system-ui;letter-spacing:-.8px;margin:0 0 8px}.sez2>p{margin:0;color:var(--ink2);max-width:720px}
.fine{margin-top:64px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
@media (max-width:900px){.passi{grid-template-columns:1fr 1fr}.pag{padding-top:36px;padding-bottom:70px}}
@media (max-width:640px){.passi{grid-template-columns:1fr}.piani{grid-template-columns:1fr}.per{grid-template-columns:1fr}.modulo{padding:24px 20px}.cambio{display:flex}.cambio button{flex:1;justify-content:center;padding:10px 8px}
 .voci{display:none}.piano{padding:26px 22px}}
"""


def testata(qui):
    v = [("/#pilastri", "Il terminale", ""), ("/metodo/", "Il metodo", "metodo"), ("/cot/", "Report COT", "cot"), ("/prezzi/", "Prezzi", "prezzi"), ("/faq/", "Domande", "faq")]
    return ('<header id="testata" class="su"><div class="box"><a class="blogo" href="/" aria-label="EdgeValor"><i></i><b>EDGE<br><span class="g">VALOR</span></b></a>'
            '<nav class="voci">' + "".join(f'<a href="{u}"{" class=qui" if k == qui else ""}>{t}</a>' for u, t, k in v) +
            f'<a href="{TG}" target="_blank" rel="noopener">Telegram</a></nav><a class="btn pri pic" href="/accedi/">Accedi</a></div></header>')


FRECCIA = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

PREZZI = f"""
<div class="titsez"><small>Piani e prezzi</small><h1>Parti gratis. Premium quando vuoi.</h1>
 <p>Registrandoti con l'email otterrai 14 giorni di Premium. Nessuna carta di credito richiesta.</p></div>
<div class="cambio" role="group" aria-label="Durata"><button type="button" data-d="m">Mensile</button><button type="button" class="on" data-d="a">Annuale <em>&minus;{RISP}%</em></button></div>
<div class="piani">
 <div class="piano"><span class="ptag">Basic</span><h3>Capire i mercati</h3>
  <div class="prezzo"><b>0 &euro;</b><span>per sempre</span></div><p class="sotto">Nessuna carta richiesta.</p>
  <ul><li>Quadro economico</li><li>Clima di mercato</li><li>Posizionamento COT</li><li>Notizie macro</li><li>Andamento dei portafogli</li><li>Settori e ricerca dei titoli</li><li>Newsletter su Telegram</li></ul>
  <a class="btn sec" href="/accedi/">Inizia gratis</a></div>
 <div class="piano pro"><span class="ptag">Premium</span><h3>Sblocca tutte le potenzialità del terminale</h3>
  <div class="prezzo"><s data-vecchio>{eu(MENSILE)} &euro;</s><b data-prezzo>{eu(ANNUALE)} &euro;</b><span>al mese</span></div>
  <p class="sotto" data-sotto>{eu(ANNO_TOT)} &euro; all'anno &middot; <b>risparmi {eu(ANNO_RISP)} &euro; (&minus;{RISP}%)</b></p>
  <p class="piu">Tutto Basic, più:</p>
  <ul><li><b>Azionario globale e portafogli</b> completi</li><li><b>Composizione e pesi</b> di ogni portafoglio</li><li><b>Acquisto guidato</b> con il rischio del mese</li><li><b>Selezione di oggi</b>: le aziende con l'edge</li><li><b>Scheda completa</b> di ogni azienda</li><li><b>COT completo, Forex e Crypto</b></li><li><b>Macro e Live</b></li><li><b>Stagionalità, volatilità e correlazioni</b></li><li><b>Paesi emergenti</b>, tabella completa</li></ul>
  <a class="btn pri" href="/terminale/?premium=1">{FRECCIA}Attiva Premium</a>
  <p class="sotto" style="margin:12px 0 0;text-align:center">Paghi con PayPal o carta. Si rinnova da solo, disdici quando vuoi.</p></div>
</div>
<script>(function(){{var M="{eu(MENSILE)} \\u20ac",A="{eu(ANNUALE)} \\u20ac",S=document.querySelector("[data-sotto]"),T=S.innerHTML;
 document.querySelectorAll(".cambio button").forEach(function(b){{b.onclick=function(){{var a=b.dataset.d=="a";
  document.querySelectorAll(".cambio button").forEach(function(x){{x.classList.toggle("on",x==b)}});
  document.querySelector("[data-prezzo]").textContent=a?A:M;document.querySelector("[data-vecchio]").hidden=!a;S.innerHTML=a?T:"Paghi mese per mese.";}}}});}})();</script>
"""

ACCEDI = f"""
<div class="titsez" style="margin-left:auto;margin-right:auto;text-align:center"><small>Accesso</small><h1>Entra nel terminale.</h1>
 <p>Niente password: ti arriva un link via email. Se è la prima volta, parte la prova di 14 giorni.</p></div>
<form class="modulo" id="facc" novalidate>
 <a class="gbtn" href="{SUPABASE_URL}/auth/v1/authorize?provider=google&amp;redirect_to={quote(SITO_PUBBLICO + "terminale/", safe="")}"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>Continua con Google</a>
 <div class="oppure"><span>oppure con il link via email</span></div>
 <label for="am">La tua email</label><input id="am" type="email" placeholder="nome@esempio.it" autocomplete="email" required>
 <button class="btn pri">{FRECCIA}Mandami il link</button><p class="esito" role="status"></p><small>Per la prova non serve la carta.</small></form>
"""

METODO = f"""
<div class="titsez"><small>Il metodo</small><h1>Dati, non opinioni.</h1>
 <p>Gli algoritmi di EdgeValor filtrano i dati e lasciano passare solo ciò che ha una probabilità statistica a favore: l'edge. Il resto resta fuori dal terminale.</p></div>
<div class="per">
 <div class="dato"><b>Dal 2006</b><p>I portafogli sono provati su vent'anni di storico e messi sotto stress nelle crisi del 2008 e del 2020. Gli anni dal 2016 servono solo da verifica.</p></div>
 <div class="dato"><b>Andamento live</b><p>Il mese in corso si segue mentre accade. Alla chiusura il suo risultato resta scritto, anche quando è negativo.</p></div>
 <div class="dato"><b>10 minuti</b><p>Un portafoglio si completa in 10 minuti: ogni strumento ha il codice ISIN da copiare nel tuo broker. Senza leva.</p></div>
</div>
<div class="sez2"><h2>Come nasce un portafoglio</h2><p>Tre profili di rischio, solo acquisti, un controllo al mese.</p>
 <div class="passi">
  <div class="passo"><i>1</i><b>Dati pubblici</b><p>Prezzi di borsa, CFTC, Federal Reserve, BCE e Fondo Monetario.</p></div>
  <div class="passo"><i>2</i><b>Filtro di trend</b><p>Un mercato sotto la sua media di lungo periodo va in pausa nella liquidità.</p></div>
  <div class="passo"><i>3</i><b>Prova sullo storico</b><p>Numeri in euro, costi inclusi, sempre con il drawdown accanto al rendimento.</p></div>
  <div class="passo"><i>4</i><b>Rotazione mensile</b><p>Il primo giorno di borsa del mese si controlla. Poi non si tocca nulla.</p></div>
 </div></div>
<div class="fine"><a class="btn pri" href="/accedi/">{FRECCIA}Inizia la prova</a><a class="btn sec" href="/prezzi/">Vedi i piani</a></div>
"""

# v8.30 le domande stanno in domande.py (una sola fonte per home, /faq/ e dati strutturati per Google):
#       qui resta solo la cornice; "__FAQ__" si sostituisce in crea() (import li', per evitare il giro di import)
FAQ = ('<div class="titsez"><small>Domande frequenti</small><h1>Le risposte, prima di entrare.</h1></div><div class="faq">__FAQ__' +
       f'</div><div class="fine"><a class="btn pri" href="/accedi/">{FRECCIA}Inizia la prova</a><a class="btn sec" href="{TG}" target="_blank" rel="noopener">Iscriviti al canale Telegram</a></div>')

PAGINE = {"prezzi": ("Prezzi · EdgeValor", "Basic gratis per sempre. Premium a 27,00 € al mese o 19,99 € al mese con il piano annuale. 14 giorni di prova senza carta.", PREZZI),
          "accedi": ("Accedi o registrati · EdgeValor", "Entra nel terminale EdgeValor con la tua email: nessuna password, 14 giorni di Premium in prova.", ACCEDI),
          "metodo": ("Il metodo · EdgeValor", "Come nascono i portafogli modello di EdgeValor: dati pubblici, filtro di trend, prova su vent'anni di storico e rotazione mensile.", METODO),
          "faq": ("Domande frequenti · EdgeValor", "Cos'è EdgeValor, cosa analizza (report COT, stagionalità, correlazioni, azionario, macro, paesi emergenti), canale Telegram, prezzi e rischi.", FAQ)}


# --- script del modulo di accesso (ES5, come la home). v8.19: tolto il vecchio modulo "Richiesta Premium"
#     (ora Premium si attiva da solo con l'abbonamento PayPal nel terminale)
JS_ACCEDI = """<script>(function(){var f=document.getElementById("facc");if(!f)return;var es=f.querySelector(".esito"),b=f.querySelector("button"),t=b.innerHTML;
 f.addEventListener("submit",function(e){e.preventDefault();var m=document.getElementById("am").value.trim().toLowerCase();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(m)){es.textContent="L'email non sembra valida.";return;}
  b.disabled=true;es.textContent="";
  // v8.19 email temporanee rifiutate prima di mandare il link (lista nel database)
  fetch("__API__/rest/v1/rpc/email_temporanea",{method:"POST",headers:{apikey:"__PUB__","Content-Type":"application/json"},body:JSON.stringify({p_email:m})})
  .then(function(r){return r.ok?r.json():false;}).catch(function(){return false;}).then(function(tmp){
  if(tmp===true){b.disabled=false;es.textContent="Le email temporanee non sono accettate: usa la tua email personale.";return;}
  fetch("__API__/auth/v1/otp?redirect_to="+encodeURIComponent("__TERM__"),{method:"POST",headers:{apikey:"__PUB__","Content-Type":"application/json"},
   body:JSON.stringify({email:m,create_user:true,data:(function(){try{var c=localStorage.getItem("ebInvito");return c?{codice_invito:c}:{};}catch(e){return {};}})()})})
  .then(function(r){if(!r.ok)throw r.status;f.innerHTML='<div class="ok"><b>Link inviato.</b><p>Apri l’email e tocca il link per entrare.</p></div>';})
  .catch(function(s){b.disabled=false;b.innerHTML=t;es.textContent=s==429?"Troppe richieste: riprova tra qualche minuto.":"Invio non riuscito. Riprova tra poco.";});});});})();</script>"""


def cornice(home):
    """(testa, piede) della home gia' costruita: le pagine pubbliche riusano stile, sfondo e pie' di pagina.
    None se la home non ha la forma attesa."""
    try:
        testa = home[:home.index("</head>")]
        piede = home[home.index("<footer>"):home.index("</footer>") + 9]
    except ValueError:
        return None
    piede = piede.replace('href="#', 'href="/#')
    # v8.39 tutti i collegamenti relativi della home (faq/, prezzi/, cot/...) diventano assoluti: nelle pagine interne
    # "faq/" portava a /prezzi/faq/ (pagina inesistente)
    piede = re.sub(r'href="(?![a-z]+:|/|\{)', 'href="/', piede)
    piede = piede.replace('href="/#faq"', 'href="/faq/"').replace('href="/#metodo"', 'href="/metodo/"').replace('href="/#accesso"', 'href="/prezzi/"')
    return testa, piede


def scrivi(cartella, percorso, titolo, desc, corpo, testa, piede, qui="", extra="", css="", head=""):
    """Scrive cartella/<percorso>/index.html con la cornice della home. percorso senza slash ("cot/2026-11-10").
    css = regole in piu' per questa pagina, head = blocchi in piu' nella <head> (es. dati strutturati)."""
    t = re.sub(r"<title>.*?</title>", lambda m: f"<title>{titolo}</title>", testa, count=1, flags=re.S)
    t = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{desc}">', t, count=1)
    t = re.sub(r'<link rel="canonical" href="[^"]*">', lambda m: f'<link rel="canonical" href="{SITO_PUBBLICO}{percorso}/">', t, count=1)
    t = re.sub(r'<script type="application/ld\+json">.*?</script>', "", t, flags=re.S)       # i dati strutturati sono della home
    t = re.sub(r'<meta property="og:(title|description|url)" content="[^"]*">', "", t)
    t = t.replace("</style>", CSS + css + "</style>", 1) + head
    html = (t + '</head>\n<body><div class="cielo"></div><div class="aurora a1"></div><div class="aurora a2"></div>\n' + testata(qui) +
            f'\n<main><div class="box pag">{corpo}</div></main>\n' + piede + "\n" + extra + "</body></html>")
    os.makedirs(os.path.join(cartella, percorso), exist_ok=True)
    with open(os.path.join(cartella, percorso, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(html)
    return SITO_PUBBLICO + percorso + "/"


def crea(cartella, home):
    """Scrive le 4 pagine in cartella/<nome>/index.html partendo dall'HTML della home. -> elenco degli indirizzi (sitemap)."""
    c = cornice(home)
    if not c:
        log.warning("pagine pubbliche non create: la home non ha la forma attesa")
        return []
    testa, piede = c
    extra = {"accedi": JS_ACCEDI.replace("__API__", SUPABASE_URL).replace("__PUB__", SUPABASE_PUBBLICA).replace("__TERM__", SITO_PUBBLICO + "terminale/")}
    from . import domande                                    # v8.30 domande frequenti (fonte unica)
    fatte = []
    for nome, (titolo, desc, corpo) in PAGINE.items():
        corpo = corpo.replace("__FAQ__", domande.html(aperta=True))
        fatte.append(scrivi(cartella, nome, titolo, desc, corpo, testa, piede, qui=nome, extra=extra.get(nome, ""),
                            head=domande.dati_strutturati() if nome == "faq" else ""))   # v8.30 FAQPage anche su /faq/
    return fatte
