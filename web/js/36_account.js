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

   DEBUG (F12 -> Console): ebAccount.stato() dice se c'e' una sessione e cosa ha letto; gli errori iniziano con "[EdgeValor] account". */
(function(){try{
 const API="https://cwwmqujccwzmqougtedh.supabase.co",CHIAVE="sb_publishable_dACPf8QgDBCygllXsPKOHw_phFdDH-X";
 const KS="ebSess",KB="ebListaSync",TIPI=["az","pa","fx","me"];
 const btn=$("pfapri"),eti=$("pfeti");if(!btn||!$("pfbox"))return;
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
   .catch(e=>{console.warn("[EdgeValor] account: rinnovo non riuscito",e);return S&&S.s>Date.now()?S.a:null;})
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
  eti.textContent=u?(piano()[0]||"…"):"";eti.hidden=!u;eti.className="pfeti"+(u&&piano()[2]?" "+piano()[2]:"");
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
  catch(e){console.warn("[EdgeValor] account: lista non salvata, riprovo alla prossima modifica",e);}},1200);});

 async function carica(){if(!S)return aggiorna();aggiorna();
  try{const r=await db("profili?select=prova_fino,premium_fino,sempre_premium,codice_invito");P=(r&&r[0])||null;}
  catch(e){console.warn("[EdgeValor] account: profilo non letto",e);}
  aggiorna();
  try{await sincronizza();}catch(e){console.warn("[EdgeValor] account: lista non sincronizzata",e);}}

 /* --- RIQUADRO PROFILO (v7.77): si apre DENTRO la barra laterale, appena sopra la voce "Profilo", e cresce verso l'alto
        (il gruppo in fondo alla barra e' ancorato in basso). Niente finestre al centro dello schermo.
        Senza accesso: campo email + "Mandami il link".   Con accesso: email, stato, Gestisci abbonamento, Esci.
        v7.80: nello stesso riquadro (parte fissa in index.html) ci sono anche Feedback, Guida e lo stato dei dati. --- */
 const box=$("pfbox"),conto=$("pfconto")||box,coda=$("pfcoda"),mob=()=>matchMedia("(max-width:900px)").matches;
 const I={carta:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/></svg>',
          esci:'<svg viewBox="0 0 24 24"><path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"/><path d="M15 8l4 4-4 4M19 12H10"/></svg>'};
 let ultimoInvio=0,inviato="";                                  // inviato = email a cui e' appena partito il link
 function avviso(t){const a=document.createElement("div");a.className="lavv";a.setAttribute("role","status");a.textContent=t;document.body.appendChild(a);setTimeout(()=>a.remove(),3800);}
 function disegna(msg){const u=S&&chi();if(coda&&!u)coda.innerHTML="";
  if(u){const pn=piano();
   conto.innerHTML=`<div class="pfchi"><b title="${esc(u.email)}">${esc(u.email)}</b><span class="pfst ${pn[2]}">${pn[1]||"Sto leggendo il tuo profilo…"}</span></div>
    <button type="button" class="sitem pfvoce" disabled title="I pagamenti arrivano con l'apertura degli abbonamenti">${I.carta}<span>Gestisci abbonamento <small>presto</small></span></button>
`;
   // "Esci" va in fondo al riquadro (#pfcoda), dopo Feedback, Guida e stato dei dati
   if(coda)coda.innerHTML=`<button type="button" class="sitem pfvoce pfesci">${I.esci}<span>Esci</span></button>`;
   box.querySelector(".pfesci").onclick=()=>{const t=S&&S.a;S=null;P=null;pronto=false;inviato="";salva();aggiorna();mostra(false);avviso("Sei uscito dal profilo");
    if(t)fetch(API+"/auth/v1/logout?scope=local",{method:"POST",headers:intest(t)}).catch(()=>{});};
   return;}
  if(inviato){conto.innerHTML=`<div class="pfchi"><b>Controlla la posta</b><span class="pfst">Ho mandato un link a ${esc(inviato)}. Aprilo da questo dispositivo. Se non lo vedi, guarda nello spam.</span></div>
    <button type="button" class="sitem pfvoce pfaltra"><span>Usa un'altra email</span></button>`;
   box.querySelector(".pfaltra").onclick=()=>{inviato="";disegna();};return;}
  conto.innerHTML=`<form class="pfform" novalidate><div class="pfchi"><b>Entra con la tua email</b><span class="pfst">Niente password: ti mando un link. La prima volta parte la prova gratuita di 14 giorni.</span></div>
    ${msg?`<p class="pfko">${msg}</p>`:""}
    <input type="email" name="email" autocomplete="email" inputmode="email" placeholder="nome@esempio.it" aria-label="La tua email" required>
    <div class="fbesito" role="status" aria-live="polite"></div>
    <button type="submit" class="csi pfinvia">Mandami il link</button>
    <p class="small pfpriv">Usiamo l'email solo per farti accedere. <a href="../legale/#privacy" target="_blank" rel="noopener">Privacy</a></p></form>`;
  const f=box.querySelector("form"),es=f.querySelector(".fbesito"),inv=f.querySelector(".pfinvia");
  f.onsubmit=async e=>{e.preventDefault();const mail=f.email.value.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){es.className="fbesito ko";es.textContent="L'email non sembra valida.";f.email.focus();return;}
   if(Date.now()-ultimoInvio<60000){es.className="fbesito ko";es.textContent="Ti ho appena mandato un link: aspetta un minuto.";return;}
   inv.disabled=true;inv.textContent="Invio…";es.className="fbesito";es.textContent="";
   let inv_c="";try{inv_c=localStorage.getItem("ebInvito")||"";}catch(_){}
   try{const torna=location.href.split("#")[0].split("?")[0];
    const r=await fetch(API+"/auth/v1/otp?redirect_to="+encodeURIComponent(torna),{method:"POST",headers:intest(),
     body:JSON.stringify({email:mail,create_user:true,data:inv_c?{codice_invito:inv_c}:{}})});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw Object.assign(new Error(j.msg||j.error_description||("HTTP "+r.status)),{st:r.status});}
    ultimoInvio=Date.now();inviato=mail;try{window.ebStat&&ebStat.ev("accesso",{passo:"link_inviato"});}catch(_){}
    disegna();}
   catch(err){console.warn("[EdgeValor] account: invio link",err);inv.disabled=false;inv.textContent="Mandami il link";es.className="fbesito ko";
    es.textContent=err.st==429?"Troppe richieste in poco tempo: riprova tra qualche minuto.":"Invio non riuscito (connessione o servizio). Riprova tra poco.";}};}
 function mostra(si,msg){box.hidden=!si;btn.setAttribute("aria-expanded",si?"true":"false");if(!si)return;
  disegna(msg);const c=box.querySelector("input[type=email]");if(c&&!mob())setTimeout(()=>c.focus(),60);
  setTimeout(()=>{try{box.scrollIntoView({block:"nearest"});}catch(e){}},30);                   // barra corta: il riquadro resta in vista
  if(S&&!P)carica().then(()=>{if(!box.hidden)disegna();});}
 btn.onclick=()=>{const h=document.documentElement;
  if(!mob()&&h.classList.contains("ridotta")){h.classList.remove("ridotta");try{localStorage.setItem("ebSide","aperta");}catch(e){}return mostra(true);}
  mostra(box.hidden);};

 window.ebAccount={stato:()=>({sessione:!!S,utente:S?chi():null,profilo:P,listaSincronizzata:pronto}),premium:()=>{const p=piano();return p[2]=="ok"||p[2]=="prova";}};
 aggiorna();
 carica().then(()=>{if(!box.hidden)disegna();
  // ritorno dal link dell'email: un avviso breve; su PC si apre anche il riquadro del profilo
  if(esito=="ok"){try{window.ebStat&&ebStat.ev("accesso",{passo:"entrato"});}catch(_){}avviso("Accesso riuscito. Benvenuto!");if(!mob())mostra(true);}
  else if(esito){const m=esito=="scaduto"?"Il link è scaduto o è già stato usato: chiedine uno nuovo.":"Accesso non riuscito: chiedi un nuovo link.";
   avviso(m);if(!mob())mostra(true,m);}});
}catch(e){console.error("[EdgeValor] account:",e);}})();
