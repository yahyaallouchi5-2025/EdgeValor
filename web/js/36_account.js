/* ---------- ACCOUNT (v7.76): accesso con email, profilo, lista che segue l'utente ----------
   SERVIZIO: Supabase (progetto "boardedge", Francoforte). Qui si usa solo la chiave PUBBLICA ("publishable"): e' fatta
   per stare nel browser e da sola non apre nulla, perche' il database lascia leggere a ognuno solo le proprie righe
   (regole RLS). La chiave segreta NON e' in questo file ne' nel repository.
   Nessuna libreria esterna: poche chiamate fetch alle API standard di Supabase.

   COME FUNZIONA L'ACCESSO (senza password):
     1) l'utente scrive l'email -> Supabase gli manda un link;
     2) il link riapre questa pagina con "#access_token=...&refresh_token=..." in fondo all'indirizzo;
     3) qui si salvano i due codici nel browser (localStorage "ebSess") e si pulisce l'indirizzo;
     4) il codice di accesso dura 1 ora: quando sta per scadere si rinnova da solo con il secondo codice.

   COSA SI LEGGE / SCRIVE:
     profili -> prova gratuita, premium, codice invito (sola lettura: li scrive il server)
     liste   -> "La mia lista": qui si unisce a quella del browser e poi si salva a ogni modifica

   UNIONE DELLA LISTA (tre vie, per non far "resuscitare" le voci tolte su un altro dispositivo):
     base   = ultima copia sincronizzata da QUESTO browser (localStorage "ebListaSync")
     locale = lista di adesso in questo browser        remoto = lista salvata sul profilo
     risultato = remoto + (aggiunte fatte qui dopo la base) - (tolte qui dopo la base)

   DEBUG (F12 -> Console): ebAccount.stato() dice se c'e' una sessione e cosa ha letto; gli errori iniziano con "[BoardEdge] account". */
(function(){try{
 const API="https://ucsfdpbnrboazxxcbduv.supabase.co",CHIAVE="sb_publishable_7GTNuVHrNDQvU2pBZcnbsQ_8ZQdEbVg";
 const KS="ebSess",KB="ebListaSync",TIPI=["az","pa","fx","me"];
 const btn=$("pfapri"),eti=$("pfeti");if(!btn)return;
 const intest=t=>Object.assign({apikey:CHIAVE,"Content-Type":"application/json"},t?{Authorization:"Bearer "+t}:{});
 let S=null,P=null,esito="";                                   // sessione, profilo letto, messaggio dopo il ritorno dal link
 try{S=JSON.parse(localStorage.getItem(KS)||"null");}catch(e){}
 const salva=()=>{try{S?localStorage.setItem(KS,JSON.stringify(S)):localStorage.removeItem(KS);}catch(e){}};

 /* --- codice invito: se si arriva con ?invito=CODICE lo si ricorda fino alla registrazione --- */
 try{const c=new URLSearchParams(location.search).get("invito");if(c&&/^[a-z0-9]{6,16}$/i.test(c))localStorage.setItem("ebInvito",c);}catch(e){}

 /* --- 2) ritorno dal link dell'email --- */
 (function(){const h=location.hash.slice(1);if(!/(^|&)(access_token|error_description)=/.test(h))return;
  const q=new URLSearchParams(h);
  if(q.get("access_token")){S={a:q.get("access_token"),r:q.get("refresh_token"),s:Date.now()+(+q.get("expires_in")||3600)*1000};salva();esito="ok";}
  else esito=/expired|invalid/i.test(q.get("error_description")||"")?"scaduto":"errore";
  // i codici non devono restare nell'indirizzo (cronologia, copia-incolla): si toglie tutto quello che segue "#"
  try{history.replaceState(null,"",location.href.split("#")[0]);}catch(e){try{location.hash="";}catch(_){}}})();

 // dati dell'utente scritti dentro il codice di accesso (email e identificativo): si leggono senza chiamate
 const chi=()=>{try{const p=JSON.parse(decodeURIComponent(escape(atob(S.a.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))));return {id:p.sub,email:p.email||""};}catch(e){return null;}};

 /* --- 4) codice di accesso valido (rinnovo automatico; una sola richiesta per volta) --- */
 let rinnovo=null;
 function codice(){if(!S)return Promise.resolve(null);
  if(S.s-Date.now()>90000)return Promise.resolve(S.a);
  if(!rinnovo)rinnovo=fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:intest(),body:JSON.stringify({refresh_token:S.r})})
   .then(r=>r.json().then(j=>({ok:r.ok,st:r.status,j})))
   .then(x=>{if(x.ok&&x.j.access_token){S={a:x.j.access_token,r:x.j.refresh_token,s:Date.now()+(x.j.expires_in||3600)*1000};salva();return S.a;}
    if(x.st==400||x.st==401||x.st==403){S=null;P=null;salva();aggiorna();}                 // sessione finita: si torna a "Accedi"
    return null;})
   .catch(e=>{console.warn("[BoardEdge] account: rinnovo non riuscito",e);return S&&S.s>Date.now()?S.a:null;})
   .finally(()=>{rinnovo=null;});
  return rinnovo;}
 async function db(percorso,opz){const t=await codice();if(!t)throw new Error("senza sessione");
  const r=await fetch(API+"/rest/v1/"+percorso,Object.assign({headers:Object.assign(intest(t),(opz&&opz.h)||{})},opz||{}));
  if(!r.ok)throw new Error("HTTP "+r.status);return r.status==204?null:r.json().catch(()=>null);}

 /* --- stato dell'abbonamento in parole semplici: [etichetta breve, frase, classe colore] --- */
 function piano(){if(!P)return ["","",""];const ora=Date.now(),g=d=>Math.max(0,Math.ceil((Date.parse(d)-ora)/864e5));
  if(P.sempre_premium)return ["Premium","Accesso completo, senza scadenza.","ok"];
  if(P.premium_fino&&Date.parse(P.premium_fino)>ora)return ["Premium",`Abbonamento attivo fino al ${new Date(P.premium_fino).toLocaleDateString("it-IT")}.`,"ok"];
  if(P.prova_fino&&Date.parse(P.prova_fino)>ora){const n=g(P.prova_fino);return [`Prova · ${n} g`,`Prova gratuita: ${n==1?"ti resta 1 giorno":"ti restano "+n+" giorni"}.`,"prova"];}
  return ["Gratis","La prova gratuita è finita.",""];}
 function aggiorna(){const u=S&&chi();
  eti.textContent=u?(piano()[0]||"…"):"Accedi";eti.className="pfeti"+(u&&piano()[2]?" "+piano()[2]:"");
  btn.title=u?"Il tuo profilo: "+u.email:"Accedi o registrati con la tua email";}

 /* --- lista: unione a tre vie e salvataggio --- */
 const norm=o=>{const x={};TIPI.forEach(t=>{x[t]=Array.isArray(o&&o[t])?o[t].filter(v=>typeof v=="string").slice(0,60):[];});return x;};
 const uguali=(a,b)=>TIPI.every(t=>a[t].length==b[t].length&&a[t].every(v=>b[t].includes(v)));
 let pronto=false,attesa=null;
 async function sincronizza(){if(!window.ebLista||!ebLista.esporta)return;
  const u=chi();if(!u)return;
  const riga=(await db("liste?select=dati"))||[],rem=norm((riga[0]||{}).dati&&riga[0].dati.lista),loc=norm(ebLista.esporta());
  let base=null;try{const b=JSON.parse(localStorage.getItem(KB)||"null");if(b&&b.u==u.id)base=norm(b.l);}catch(e){}
  const ris={};TIPI.forEach(t=>{const b=base?base[t]:[];
   const tolte=b.filter(v=>!loc[t].includes(v)),agg=loc[t].filter(v=>!b.includes(v));
   ris[t]=rem[t].filter(v=>!tolte.includes(v)).concat(agg.filter(v=>!rem[t].includes(v))).slice(0,60);});
  if(!uguali(ris,loc))ebLista.importa(ris);
  if(!uguali(ris,rem))await db("liste?utente=eq."+u.id,{method:"PATCH",h:{Prefer:"return=minimal"},body:JSON.stringify({dati:{lista:ris}})});
  try{localStorage.setItem(KB,JSON.stringify({u:u.id,l:ris}));}catch(e){}
  pronto=true;}
 // a ogni stellina: si aspetta 1,2 secondi (cosi' piu' tocchi di fila fanno un solo salvataggio) e si scrive sul profilo
 document.addEventListener("eblista",()=>{if(!S||!pronto)return;clearTimeout(attesa);attesa=setTimeout(async()=>{
  try{const u=chi(),l=norm(ebLista.esporta());if(!u)return;
   await db("liste?utente=eq."+u.id,{method:"PATCH",h:{Prefer:"return=minimal"},body:JSON.stringify({dati:{lista:l}})});
   localStorage.setItem(KB,JSON.stringify({u:u.id,l}));}
  catch(e){console.warn("[BoardEdge] account: lista non salvata, riprovo alla prossima modifica",e);}},1200);});

 async function carica(){if(!S)return aggiorna();aggiorna();
  try{const r=await db("profili?select=prova_fino,premium_fino,sempre_premium,codice_invito");P=(r&&r[0])||null;}
  catch(e){console.warn("[BoardEdge] account: profilo non letto",e);}
  aggiorna();
  try{await sincronizza();}catch(e){console.warn("[BoardEdge] account: lista non sincronizzata",e);}}

 /* --- finestra Profilo / Accedi (stessa grafica della finestra Feedback) --- */
 const ICO='<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
 let ultimoInvio=0;
 function finestra(msg){const v=document.querySelector(".pfmodal");if(v)v.remove();
  const box=document.createElement("div");box.className="cmodal pfmodal";document.body.appendChild(box);
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});
  const testa=(t,s)=>`<div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true">${ICO}</span><div><h3 id="pft">${t}</h3><p>${s}</p></div><button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>`;
  function disegna(){const u=S&&chi();
   if(u){const pn=piano();
    box.innerHTML=`<div class="cmodal-box fbbox pfbox" role="dialog" aria-modal="true" aria-labelledby="pft">${testa("Il tuo profilo",esc(u.email))}
      ${msg?`<p class="pfok">${msg}</p>`:""}
      <div class="pfstato ${pn[2]}"><b>${pn[0]?esc(pn[0].split(" · ")[0]):"…"}</b><span>${pn[1]||"Sto leggendo il tuo profilo…"}</span></div>
      <p class="small pfnota">La tua lista è salvata sul profilo: la ritrovi su telefono e PC accedendo con la stessa email.</p>
      <div class="cmodal-btn"><button type="button" class="cno pfesci">Esci</button><button type="button" class="csi pfchiudi">Chiudi</button></div></div>`;
    box.querySelector(".pfchiudi").onclick=chiudi;
    box.querySelector(".pfesci").onclick=async()=>{const t=S&&S.a;S=null;P=null;pronto=false;salva();aggiorna();chiudi();
     if(t)fetch(API+"/auth/v1/logout?scope=local",{method:"POST",headers:intest(t)}).catch(()=>{});};}
   else{
    box.innerHTML=`<form class="cmodal-box fbbox pfbox" role="dialog" aria-modal="true" aria-labelledby="pft" novalidate>${testa("Accedi a BoardEdge","Niente password: ti mandiamo un link via email.")}
      ${msg?`<p class="pfko">${msg}</p>`:""}
      <label class="fbcampo"><span>La tua email</span><input type="email" name="email" autocomplete="email" inputmode="email" placeholder="nome@esempio.it" required></label>
      <div class="fbesito" role="status" aria-live="polite"></div>
      <div class="cmodal-btn"><button type="button" class="cno pfchiudi">Annulla</button><button type="submit" class="csi pfinvia">Mandami il link</button></div>
      <p class="small fbpriv">La prima volta crea il tuo profilo, con 14 giorni di prova gratuita. Usiamo l'email solo per farti accedere. <a href="../legale/#privacy" target="_blank" rel="noopener">Privacy</a></p></form>`;
    const f=box.querySelector("form"),es=f.querySelector(".fbesito"),inv=f.querySelector(".pfinvia");
    f.querySelector(".pfchiudi").onclick=chiudi;setTimeout(()=>f.email.focus(),60);
    f.onsubmit=async e=>{e.preventDefault();const mail=f.email.value.trim().toLowerCase();
     if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){es.className="fbesito ko";es.textContent="L'email non sembra valida.";f.email.focus();return;}
     if(Date.now()-ultimoInvio<60000){es.className="fbesito ko";es.textContent="Ti ho appena mandato un link: aspetta un minuto prima di chiederne un altro.";return;}
     inv.disabled=true;inv.textContent="Invio…";es.className="fbesito";es.textContent="";
     let inv_c="";try{inv_c=localStorage.getItem("ebInvito")||"";}catch(_){}
     try{const torna=location.origin+location.pathname;
      const r=await fetch(API+"/auth/v1/otp?redirect_to="+encodeURIComponent(torna),{method:"POST",headers:intest(),
       body:JSON.stringify({email:mail,create_user:true,data:inv_c?{codice_invito:inv_c}:{}})});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw Object.assign(new Error(j.msg||j.error_description||("HTTP "+r.status)),{st:r.status});}
      ultimoInvio=Date.now();try{window.ebStat&&ebStat.ev("accesso",{passo:"link_inviato"});}catch(_){}
      f.innerHTML=`<div class="fbgrazie"><span class="cmodal-ico ok" aria-hidden="true">&#10003;</span><h3>Controlla la posta</h3><p>Ho mandato un link a <b>${esc(mail)}</b>.<br>Aprilo da questo dispositivo per entrare. Se non lo vedi, guarda nello spam.</p><button type="button" class="csi">Ho capito</button></div>`;
      f.querySelector(".csi").onclick=chiudi;f.querySelector(".csi").focus();}
     catch(err){console.warn("[BoardEdge] account: invio link",err);inv.disabled=false;inv.textContent="Mandami il link";es.className="fbesito ko";
      es.textContent=err.st==429?"Troppe richieste in poco tempo: riprova tra qualche minuto.":"Invio non riuscito (connessione o servizio). Riprova tra poco.";}};}
   const x=box.querySelector(".fbx");if(x)x.onclick=chiudi;}
  disegna();requestAnimationFrame(()=>box.classList.add("on"));
  return disegna;}
 btn.onclick=()=>{document.documentElement.classList.remove("sideon");const o=$("sombra");if(o)o.hidden=true;   // telefono: chiude il menu
  const ridisegna=finestra("");if(S&&!P)carica().then(()=>{if(document.querySelector(".pfmodal"))ridisegna();});};

 window.ebAccount={stato:()=>({sessione:!!S,utente:S?chi():null,profilo:P,listaSincronizzata:pronto}),premium:()=>{const p=piano();return p[2]=="ok"||p[2]=="prova";}};
 aggiorna();
 carica().then(()=>{
  if(esito=="ok"){try{window.ebStat&&ebStat.ev("accesso",{passo:"entrato"});}catch(_){}finestra("Accesso riuscito. Benvenuto!");}
  else if(esito=="scaduto")finestra("Il link è scaduto o è già stato usato. Chiedine uno nuovo.");
  else if(esito=="errore")finestra("Accesso non riuscito. Chiedi un nuovo link.");});
}catch(e){console.error("[BoardEdge] account:",e);}})();
