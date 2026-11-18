
/* ---------- ASSISTENZA (v7.93, prima "Feedback"): voce "Assistenza" nel Profilo e "Passa a Premium" dei lucchetti ----------
   Un utente apre una RICHIESTA (ticket) di uno di questi tipi:
     - Abbonamento : informazioni su Premium o richiesta di attivazione;
     - Segnalazione: con la tipologia (errore nei dati, problema tecnico, suggerimento, altro);
     - Call live   : prenotare una call di assistenza con il team. Servono una breve PRESENTAZIONE e il TEMA da trattare.
   EMAIL: quella con cui l'utente e' entrato (dal suo account), mostrata e non modificabile: e' li' che gli si risponde.
     Senza account (caso raro: la porta d'ingresso chiede l'accesso) l'email si scrive a mano ed e' obbligatoria.
   Ogni richiesta ha un NUMERO (es. T-7K2Q9M) mostrato all'utente a fine invio: lo cita se riscrive.
   Nella mail all'admin: tipo, tipologia/tema, messaggio, email, ID utente (EV-0001), scheda aperta, versione del sito.
   Invio con Web3Forms (servizio gratuito, nessun server nostro): il messaggio arriva SOLO alla casella email dell'admin
   collegata alla chiave, non viene pubblicato da nessuna parte. La chiave pubblica del modulo arriva da Python (pagina.py).
   Protezione anti-spam: campo nascosto "botcheck" + limite di 1 invio al minuto.
   Nelle statistiche anonime conta come evento "feedback" (solo il tipo, mai il testo).
   DEBUG: ebFeedback({tipo:"call"}) apre direttamente la prenotazione della call. */
(function(){try{
 const CHIAVE="__FEEDBACK_KEY__".indexOf("__")===0?"":"__FEEDBACK_KEY__";
 const apri=document.getElementById("fbapri");if(!apri)return;
 // tipi di richiesta: [codice, etichetta, sottotitolo del modulo]
 const TIPI=[["abbonamento","Abbonamento","Informazioni su Premium o attivazione."],
             ["segnalazione","Segnalazione","Un errore, un problema o un'idea."],
             ["call","Call live","Una call con il team, su prenotazione."]];
 const SEGN=["Errore nei dati","Problema tecnico","Suggerimento","Altro"];
 const TEMI=["Uso del terminale","Portafogli modello","Azionario","Abbonamento Premium","Altro"];
 let ultimo=0;
 const scheda=()=>{const b=document.querySelector("#nav button.on");return b?b.textContent.trim():"";};
 const mio=()=>{try{const s=window.ebAccount&&ebAccount.stato();return {email:((s&&s.utente)||{}).email||"",id:(ebAccount.id&&ebAccount.id())||""};}catch(e){return {email:"",id:""};}};
 // numero della richiesta: T- e 6 caratteri senza lettere ambigue (0/O, 1/I)
 const numero=()=>"T-"+Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>"23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[b%32]).join("");
 // o = {tipo:"abbonamento"|"segnalazione"|"call"} oppure {premium:true} (dal lucchetto: Abbonamento gia' scelto)
 function mostra(o){o=o||{};if(document.querySelector(".fbmodal"))return;
  let tipo=o.premium||o.rinnova?"abbonamento":(TIPI.some(t=>t[0]==o.tipo)?o.tipo:"segnalazione");
  const me=mio(),box=document.createElement("div");box.className="cmodal fbmodal";
  box.innerHTML=`<form class="cmodal-box fbbox" role="dialog" aria-modal="true" aria-labelledby="fbt" novalidate>
    <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg></span>
     <div><h3 id="fbt">Assistenza</h3><p class="fbsott"></p></div>
     <button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
    <div class="fbtipi" role="radiogroup" aria-label="Tipo di richiesta">${TIPI.map(t=>`<button type="button" role="radio" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
    <div class="fbvar"></div>
    ${me.email?`<div class="fbmail"><span>Ti rispondiamo a</span><b title="Email del tuo account">${esc(me.email)}</b>${me.id?`<em>${esc(me.id)}</em>`:""}</div>`
     :`<label class="fbcampo"><span>Email <em>(obbligatoria: ti rispondiamo qui)</em></span><input type="email" name="email" autocomplete="email" placeholder="nome@esempio.it" required></label>`}
    <input type="checkbox" name="botcheck" class="fbbot" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="fbesito" role="status" aria-live="polite"></div>
    <div class="cmodal-btn"><button type="button" class="cno fbannulla">Annulla</button><button type="submit" class="csi fbinvia">Invia</button></div>
    <p class="small fbpriv">Inviando accetti che la richiesta e la tua email siano trattate solo per risponderti e migliorare il servizio. <a href="../legale/" target="_blank" rel="noopener">Privacy</a></p></form>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const f=box.querySelector("form"),varia=f.querySelector(".fbvar"),esito=f.querySelector(".fbesito"),invia=f.querySelector(".fbinvia");
  // campi che cambiano con il tipo: tipologia (segnalazione), tema + presentazione (call), messaggio (tutti)
  const sel=(nome,lab,voci)=>`<label class="fbcampo"><span>${lab}</span><select name="${nome}" class="fbsel">${voci.map(v=>`<option>${v}</option>`).join("")}</select></label>`;
  const area=(nome,lab,nota,ph,righe,val)=>`<label class="fbcampo"><span>${lab}${nota?` <em>${nota}</em>`:""}</span><textarea name="${nome}" rows="${righe}" maxlength="2000" placeholder="${ph}">${val||""}</textarea><small class="fbconta">${(val||"").length} / 2000</small></label>`;
  function disegnaTipo(){
   f.querySelector(".fbsott").textContent=TIPI.find(t=>t[0]==tipo)[2];
   f.querySelectorAll(".fbtipi button").forEach(b=>{b.classList.toggle("on",b.dataset.t==tipo);b.setAttribute("aria-checked",b.dataset.t==tipo);});
   varia.innerHTML=tipo=="segnalazione"?sel("tipologia","Tipologia",SEGN)+area("messaggio","Cosa succede","","Descrivi cosa hai visto e in quale scheda",4)
    :tipo=="call"?sel("tema","Tema da trattare",TEMI)+area("presentazione","Presentati in breve","(chi sei, cosa ti serve)","Es.: investo da 2 anni con un ETF, vorrei capire come usare i portafogli modello",4)
     +`<p class="small fbnota">Ti scriviamo per fissare giorno e ora della call.</p>`
    :area("messaggio","Messaggio","","Cosa vuoi sapere sull'abbonamento?",4,o.rinnova?"Vorrei rinnovare il mio abbonamento Premium.":o.premium?"Vorrei passare a Premium.":"");
   varia.querySelectorAll("textarea").forEach(ta=>ta.addEventListener("input",()=>{ta.nextElementSibling.textContent=ta.value.length+" / 2000";}));
   esito.textContent="";esito.className="fbesito";
   setTimeout(()=>{const ta=varia.querySelector("textarea");ta&&ta.focus();},60);}
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);apri.focus({preventScroll:true});};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});
  f.querySelector(".fbx").onclick=chiudi;f.querySelector(".fbannulla").onclick=chiudi;
  f.querySelectorAll(".fbtipi button").forEach(b=>b.onclick=()=>{tipo=b.dataset.t;disegnaTipo();});
  disegnaTipo();
  if(!CHIAVE){esito.className="fbesito avv";esito.textContent="Il modulo è in attivazione: tra poco potrai inviare la tua richiesta.";invia.disabled=true;}
  f.onsubmit=async e=>{e.preventDefault();
   const ko=(t,campo)=>{esito.className="fbesito ko";esito.textContent=t;campo&&campo.focus();};
   const val=n=>((f.elements[n]||{}).value||"").trim();
   const testo=tipo=="call"?val("presentazione"):val("messaggio"),campoT=f.elements[tipo=="call"?"presentazione":"messaggio"];
   const mail=me.email||val("email");
   if(tipo=="call"&&testo.length<30)return ko("Presentati in almeno 30 caratteri: ci serve per preparare la call.",campoT);
   if(testo.length<10)return ko("Scrivi almeno 10 caratteri.",campoT);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))return ko("Scrivi un'email valida: ti rispondiamo lì.",f.elements.email);
   if(Date.now()-ultimo<60000)return ko("Hai appena inviato una richiesta: riprova tra un minuto.");
   const nr=numero(),nome=TIPI.find(t=>t[0]==tipo)[1],det=tipo=="segnalazione"?val("tipologia"):tipo=="call"?val("tema"):"";
   invia.disabled=true;invia.textContent="Invio…";esito.className="fbesito";esito.textContent="";
   try{const r=await fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
     body:JSON.stringify({access_key:CHIAVE,subject:`EdgeValor · ${nome}${det?": "+det:""} · ${me.id||"senza ID"} · ${nr}`,from_name:"EdgeValor assistenza",
      replyto:mail,richiesta:nr,tipo:nome,[tipo=="call"?"tema":"tipologia"]:det||undefined,
      [tipo=="call"?"presentazione":"messaggio"]:testo,email:mail,utente:me.id||undefined,scheda:scheda(),versione:(D.meta&&D.meta.version)||"",botcheck:f.botcheck.checked})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.success===false)throw new Error(j.message||("HTTP "+r.status));
    ultimo=Date.now();try{window.ebStat&&ebStat.ev("feedback",{tipo});}catch(_){}
    f.innerHTML=`<div class="fbgrazie"><span class="cmodal-ico ok" aria-hidden="true">&#10003;</span><h3>Richiesta inviata</h3>
     <p>Numero <b class="fbnr">${nr}</b>. ${tipo=="call"?"Ti scriviamo per fissare la call":"Ti rispondiamo"} a ${esc(mail)}.</p><button type="button" class="csi">Chiudi</button></div>`;
    f.querySelector(".csi").onclick=chiudi;f.querySelector(".csi").focus();}
   catch(err){console.warn("[EdgeValor] assistenza:",err);invia.disabled=false;invia.textContent="Invia";
    ko("Invio non riuscito (connessione o servizio). Riprova tra poco.");}};}
 apri.onclick=()=>mostra();
 window.ebFeedback=mostra;
 // v7.97 RINNOVO DALL'EMAIL: il pulsante "Rinnova" delle email di abbonamento porta a .../terminale/?rinnova=1.
 // Appena l'utente e' dentro (anche dopo l'accesso dalla porta d'ingresso) si apre la richiesta Abbonamento gia' scritta;
 // il parametro si toglie dall'indirizzo, cosi' ricaricando la pagina non si riapre.
 if(/[?&]rinnova=1/.test(location.search)){let n=0;const t=setInterval(()=>{n++;
  if(window.ebAbbonamento&&ebAbbonamento.attivo()){clearInterval(t);return;}   // v8.12 ora ci pensa l'area abbonamento (46_abbonamento.js)
  const u=window.ebAccount&&ebAccount.stato&&ebAccount.stato().utente;
  if(u&&!document.querySelector(".cmodal")){clearInterval(t);
   try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){}mostra({rinnova:true});}
  else if(n>240)clearInterval(t);},500);}
}catch(e){console.error("[EdgeValor] assistenza:",e);}})();
