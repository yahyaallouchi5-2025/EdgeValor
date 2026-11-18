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
    Nessun pagamento automatico: "Contattaci" -> l'utente lascia l'email -> arriva al titolare (web3forms, la stessa
    chiave pubblica dell'Assistenza) che gli manda le istruzioni.
  ACCEDI: manda il link di accesso con Supabase (come il terminale) e riporta al terminale.
DEBUG: python -c "from cot_radar import pagine_pubbliche as p; print(p.RISP, p.eu(p.ANNO_TOT))"
"""
import os
import re

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
    v = [("/#pilastri", "Il terminale", ""), ("/metodo/", "Il metodo", "metodo"), ("/prezzi/", "Prezzi", "prezzi"), ("/faq/", "Domande", "faq")]
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
  <p class="sotto" data-sotto>{eu(ANNO_TOT)} &euro; in un unico pagamento &middot; <b>risparmi {eu(ANNO_RISP)} &euro; (&minus;{RISP}%)</b></p>
  <p class="piu">Tutto Basic, più:</p>
  <ul><li><b>Composizione e pesi</b> di ogni portafoglio</li><li><b>Acquisto guidato</b> con il rischio del mese</li><li><b>Selezione di oggi</b>: le aziende con l'edge</li><li><b>Scheda completa</b> di ogni azienda</li><li><b>COT completo, Forex e Crypto</b></li><li><b>Macro e Live</b></li><li><b>Stagionalità, volatilità e correlazioni</b></li><li><b>Paesi emergenti</b>, tabella completa</li></ul>
  <a class="btn pri" href="#contatto">{FRECCIA}Contattaci</a></div>
</div>
<div class="contatto" id="contatto"><form class="modulo" id="fprem" novalidate>
 <h3>Richiedi Premium</h3><p>Inserisci la tua email: riceverai le istruzioni per l'attivazione.</p>
 <label for="cm">La tua email</label><input id="cm" type="email" placeholder="nome@esempio.it" autocomplete="email" required>
 <label for="cp">Piano</label><select id="cp"><option>Annuale &middot; {eu(ANNO_TOT)} &euro; in un unico pagamento</option><option>Mensile &middot; {eu(MENSILE)} &euro; al mese</option></select>
 <input class="trap" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"><button class="btn pri">Invia la richiesta</button><p class="esito" role="status"></p><small>Usiamo la tua email solo per risponderti. <a href="/legale/#privacy">Privacy</a></small></form></div>
<script>(function(){{var M="{eu(MENSILE)} \\u20ac",A="{eu(ANNUALE)} \\u20ac",S=document.querySelector("[data-sotto]"),T=S.innerHTML,sel=document.getElementById("cp");
 document.querySelectorAll(".cambio button").forEach(function(b){{b.onclick=function(){{var a=b.dataset.d=="a";
  document.querySelectorAll(".cambio button").forEach(function(x){{x.classList.toggle("on",x==b)}});
  document.querySelector("[data-prezzo]").textContent=a?A:M;document.querySelector("[data-vecchio]").hidden=!a;S.innerHTML=a?T:"Paghi mese per mese.";sel.selectedIndex=a?0:1;}}}});}})();</script>
"""

ACCEDI = f"""
<div class="titsez" style="margin-left:auto;margin-right:auto;text-align:center"><small>Accesso</small><h1>Entra nel terminale.</h1>
 <p>Niente password: ti arriva un link via email. Se è la prima volta, parte la prova di 14 giorni.</p></div>
<form class="modulo" id="facc" novalidate><label for="am">La tua email</label><input id="am" type="email" placeholder="nome@esempio.it" autocomplete="email" required>
 <button class="btn pri">{FRECCIA}Mandami il link</button><p class="esito" role="status"></p><small>Niente carta, nessun rinnovo automatico.</small></form>
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

DOMANDE = [("Devo avere esperienza?", "No. Ogni scheda ha testi brevi e una (i) che spiega come leggerla. Si parte dal profilo e dal portafoglio del mese."),
           ("Quanto tempo richiede?", "Al massimo 10 minuti. I portafogli modello cambiano una volta al mese: alla rotazione guardi cosa è cambiato e hai finito."),
           ("Quanto costa?", f"La registrazione è gratuita e comprende 14 giorni di Premium, senza carta. Poi resti in Basic, gratis. Premium costa {eu(MENSILE)} € al mese, oppure {eu(ANNUALE)} € al mese con il piano annuale, pagato in un'unica soluzione da {eu(ANNO_TOT)} € (−{RISP}%). Vedi <a href=\"/prezzi/\">piani e prezzi</a>."),
           ("Come attivo Premium?", "Dalla pagina <a href=\"/prezzi/\">Prezzi</a> inserisci la tua email con «Contattaci»: riceverai le istruzioni per l'attivazione."),
           ("È una consulenza finanziaria?", "No. EdgeValor pubblica analisi statistiche di dati pubblici con finalità esclusivamente educative. Ogni decisione resta tua. Dettagli nelle <a href=\"/legale/#rischi\">avvertenze sui rischi</a>."),
           ("Posso perdere denaro?", "Sì. Ogni investimento può perdere in parte o del tutto il capitale, anche senza leva. Per questo il terminale mostra sempre il drawdown accanto al rendimento."),
           ("Da dove provengono i dati?", "Da fonti pubbliche e da un fornitore di dati di mercato. L'elenco completo è nelle <a href=\"/legale/#fonti\">fonti dei dati</a>."),
           ("Che cos'è il report COT?", "È il report settimanale dell'autorità statunitense dei mercati futures: dice come sono posizionati i grandi operatori. Nel terminale è contesto, non un'indicazione operativa.")]
FAQ = ('<div class="titsez"><small>Domande frequenti</small><h1>Le risposte, prima di entrare.</h1></div><div class="faq">' +
       "".join(f"<details{' open' if i == 0 else ''}><summary>{d}</summary><p>{r}</p></details>" for i, (d, r) in enumerate(DOMANDE)) +
       f'</div><div class="fine"><a class="btn pri" href="/accedi/">{FRECCIA}Inizia la prova</a><a class="btn sec" href="{TG}" target="_blank" rel="noopener">Scrivimi su Telegram</a></div>')

PAGINE = {"prezzi": ("Prezzi · EdgeValor", "Basic gratis per sempre. Premium a 27,00 € al mese o 19,99 € al mese con il piano annuale. 14 giorni di prova senza carta.", PREZZI),
          "accedi": ("Accedi o registrati · EdgeValor", "Entra nel terminale EdgeValor con la tua email: nessuna password, 14 giorni di Premium in prova.", ACCEDI),
          "metodo": ("Il metodo · EdgeValor", "Come nascono i portafogli modello di EdgeValor: dati pubblici, filtro di trend, prova su vent'anni di storico e rotazione mensile.", METODO),
          "faq": ("Domande frequenti · EdgeValor", "Costi, tempo richiesto, rischi e fonti dei dati: le risposte alle domande più comuni su EdgeValor.", FAQ)}


# --- script dei due moduli (ES5, come la home) ---
JS_PREZZI = """<script>(function(){var f=document.getElementById("fprem");if(!f)return;var K="__K__",es=f.querySelector(".esito"),b=f.querySelector("button");
 if(!K){b.disabled=true;es.textContent="Modulo in attivazione: riprova tra poco.";}
 f.addEventListener("submit",function(e){e.preventDefault();var m=document.getElementById("cm").value.trim(),p=document.getElementById("cp").value;
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(m)){es.textContent="Controlla l'email: non sembra valida.";return;}
  b.disabled=true;b.textContent="Invio\u2026";es.textContent="";
  // v8.10 email automatica all'utente (Supabase, funzione richiesta-premium): link PayPal del piano e passaggi
  fetch("__API__/functions/v1/richiesta-premium",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({email:m,piano:p,botcheck:f.botcheck.checked})}).catch(function(){});
  fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
   body:JSON.stringify({access_key:K,subject:"EdgeValor \u00b7 Richiesta Premium ("+p+")",from_name:"EdgeValor prezzi",email:m,piano:p,pagina:"prezzi",botcheck:f.botcheck.checked})})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok||j.success===false)throw new Error(j.message||r.status);});})
  .then(function(){f.innerHTML='<div class="ok"><b>Richiesta inviata.</b><p>Riceverai le istruzioni via email.</p></div>';})
  .catch(function(){b.disabled=false;b.textContent="Invia la richiesta";es.textContent="Invio non riuscito. Riprova tra poco.";});});})();</script>"""
JS_ACCEDI = """<script>(function(){var f=document.getElementById("facc");if(!f)return;var es=f.querySelector(".esito"),b=f.querySelector("button"),t=b.innerHTML;
 f.addEventListener("submit",function(e){e.preventDefault();var m=document.getElementById("am").value.trim().toLowerCase();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(m)){es.textContent="L'email non sembra valida.";return;}
  b.disabled=true;es.textContent="";
  fetch("__API__/auth/v1/otp?redirect_to="+encodeURIComponent("__TERM__"),{method:"POST",headers:{apikey:"__PUB__","Content-Type":"application/json"},
   body:JSON.stringify({email:m,create_user:true,data:{}})})
  .then(function(r){if(!r.ok)throw r.status;f.innerHTML='<div class="ok"><b>Link inviato.</b><p>Apri l\'email e tocca il link per entrare.</p></div>';})
  .catch(function(s){b.disabled=false;b.innerHTML=t;es.textContent=s==429?"Troppe richieste: riprova tra qualche minuto.":"Invio non riuscito. Riprova tra poco.";});});})();</script>"""


def crea(cartella, home):
    """Scrive le 4 pagine in cartella/<nome>/index.html partendo dall'HTML della home. -> elenco degli indirizzi (sitemap)."""
    try:
        testa = home[:home.index("</head>")]
        piede = home[home.index("<footer>"):home.index("</footer>") + 9]
    except ValueError:
        log.warning("pagine pubbliche non create: la home non ha la forma attesa")
        return []
    piede = piede.replace('href="#', 'href="/#').replace('href="legale/', 'href="/legale/').replace('href="terminale/', 'href="/terminale/')
    piede = piede.replace('href="/#faq"', 'href="/faq/"').replace('href="/#metodo"', 'href="/metodo/"').replace('href="/#accesso"', 'href="/prezzi/"')
    k = re.search(r'var CHIAVE="([^"]*)"', home)
    extra = {"prezzi": JS_PREZZI.replace("__K__", k.group(1) if k else "").replace("__API__", SUPABASE_URL),
             "accedi": JS_ACCEDI.replace("__API__", SUPABASE_URL).replace("__PUB__", SUPABASE_PUBBLICA).replace("__TERM__", SITO_PUBBLICO + "terminale/")}
    fatte = []
    for nome, (titolo, desc, corpo) in PAGINE.items():
        t = re.sub(r"<title>.*?</title>", lambda m: f"<title>{titolo}</title>", testa, count=1, flags=re.S)
        t = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{desc}">', t, count=1)
        t = re.sub(r'<link rel="canonical" href="[^"]*">', lambda m: f'<link rel="canonical" href="{SITO_PUBBLICO}{nome}/">', t, count=1)
        t = re.sub(r'<script type="application/ld\+json">.*?</script>', "", t, flags=re.S)       # i dati strutturati sono della home
        t = re.sub(r'<meta property="og:(title|description|url)" content="[^"]*">', "", t)
        t = t.replace("</style>", CSS + "</style>", 1)
        html = (t + '</head>\n<body><div class="cielo"></div><div class="aurora a1"></div><div class="aurora a2"></div>\n' + testata(nome) +
                f'\n<main><div class="box pag">{corpo}</div></main>\n' + piede + "\n" + extra.get(nome, "") + "</body></html>")
        os.makedirs(os.path.join(cartella, nome), exist_ok=True)
        with open(os.path.join(cartella, nome, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(html)
        fatte.append(SITO_PUBBLICO + nome + "/")
    return fatte
