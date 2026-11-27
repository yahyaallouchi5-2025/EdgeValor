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
   v8.19 ACCESSO CON GOOGLE: "Continua con Google" porta a Supabase (/auth/v1/authorize?provider=google), Google chiede
     il consenso e si torna qui con lo stesso "#access_token=..." del link email: il resto del flusso e' identico.
     Le credenziali Google (Client ID/Secret) stanno solo nelle impostazioni di Supabase, mai qui.
     GOOGLE=false: il pulsante si vede solo in anteprima (indirizzo con ?google=1, ricordato nel browser) finche' non e' collaudato.

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
 const GOOGLE=true;                                                            // true = pulsante Google per tutti (acceso il 19/11/2026)
 try{if(/[?&]google=1/.test(location.search))localStorage.setItem("ebGoogle","1");}catch(e){}
 const conGoogle=()=>{if(GOOGLE)return true;try{return localStorage.getItem("ebGoogle")=="1";}catch(e){return false;}};
 const GICO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
 const btn=$("pfapri"),eti=$("pfeti");if(!btn||!$("pfbox"))return;
 const intest=t=>Object.assign({apikey:CHIAVE,"Content-Type":"application/json"},t?{Authorization:"Bearer "+t}:{});
 let S=null,P=null,ADM=false,esito="",tipo="";                                   // sessione, profilo letto, messaggio dopo il ritorno dal link
 try{S=JSON.parse(localStorage.getItem(KS)||"null");}catch(e){}
 const salva=()=>{try{S?localStorage.setItem(KS,JSON.stringify(S)):localStorage.removeItem(KS);}catch(e){}};

 /* --- codice invito: se si arriva con ?invito=CODICE lo si ricorda fino alla registrazione --- */
 try{const c=new URLSearchParams(location.search).get("invito");if(c&&/^[a-z0-9]{6,16}$/i.test(c))localStorage.setItem("ebInvito",c);}catch(e){}

 /* --- 2) ritorno dal link dell'email --- */
 (function(){const h=location.hash.slice(1);if(!/(^|&)(access_token|error_description)=/.test(h))return;
  const q=new URLSearchParams(h);
  if(q.get("access_token")){S={a:q.get("access_token"),r:q.get("refresh_token"),s:Date.now()+(+q.get("expires_in")||3600)*1000};salva();esito="ok";}
  else esito=/expired|invalid/i.test(q.get("error_description")||"")?"scaduto":"errore";
  tipo=q.get("type")||"";                                       // v7.86: "recovery" = link per scegliere una nuova password
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
    if(x.st==400||x.st==401||x.st==403){S=null;P=null;salva();aggiorna();                 // sessione finita: si torna alla porta d'ingresso
     try{window.ebPorta&&ebPorta.apri("acc","La sessione è scaduta: accedi di nuovo.");}catch(_){}}
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
  if(P.premium_fino&&Date.parse(P.premium_fino)>ora)return ["Premium",`Abbonamento attivo fino al ${new Date(P.premium_fino).toLocaleDateString(EB_LOC)}.`,"ok"];
  if(P.prova_fino&&Date.parse(P.prova_fino)>ora){const n=g(P.prova_fino);return [`Prova · ${n} g`,`Prova Premium: ${n==1?"ti resta 1 giorno":"ti restano "+n+" giorni"}.`,"prova"];}
  return ["Basic","Sei in Basic: le funzioni Basic restano attive.",""];}
 // v7.93 ID UTENTE leggibile (EV-0001...): numero progressivo dato dal database alla registrazione
 const idUtente=()=>P&&P.numero?"EV-"+String(P.numero).padStart(4,"0"):"";
 /* --- v7.92 RIEPILOGO DELLA PROVA (solo durante la prova: 14 giorni, 7 dal 1/12/2026): giorno X di 14, barra, data di fine e (i) con cosa resta
        in Basic. Il giorno si ricava dalla fine della prova (prova_fino - 14 giorni = inizio). --- */
 // v9.14 la prova dura 14 giorni per chi si e' registrato fino al 30/11/2026, 7 giorni dopo: si ricava dalla
 // registrazione (created_at) e dalla fine della prova; senza data di registrazione vale la regola di oggi.
 let PROVA=14;
 function riepilogoProva(){if(!P||!P.prova_fino)return "";const fine=Date.parse(P.prova_fino),ora=Date.now();
  const u=chi(),inizio=u&&Date.parse(u.created_at||"");
  PROVA=inizio?(Math.round((fine-inizio)/864e5)>10?14:7):EB_PREZZI.prova();
  const g=Math.min(PROVA,Math.max(1,Math.floor((ora-(fine-PROVA*864e5))/864e5)+1)),pc=Math.round(g/PROVA*100);
  const data=new Date(fine).toLocaleDateString(EB_LOC,{day:"numeric",month:"long"});
  return `<div class="pfprova"><div class="pfpt"><b>Prova Premium</b><button type="button" class="info" data-apri="pfprinfo" data-k="pfprova" aria-expanded="false" aria-label="Cosa succede dopo la prova">i</button></div>
   <div class="pfbar" role="progressbar" aria-valuemin="1" aria-valuemax="${PROVA}" aria-valuenow="${g}"><i style="width:${pc}%"></i></div>
   <div class="pfpg"><span>Giorno ${g} di ${PROVA}</span><span>fino al ${data}</span></div>
   <p id="pfprinfo" class="sub infotesto">Fino al ${data} hai tutto Premium. Poi passi a Basic: le funzioni Premium si bloccano. Nessun pagamento automatico.</p></div>`;}
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

 // v8.05 l'inglese e' ancora parziale: finche' non e' completo lo usa solo l'admin. Chi non e' admin e aveva scelto EN
 // torna all'italiano (si cancella la scelta e si ricarica la pagina una sola volta).
 // v9.09 lingua inglese aperta a tutti (ok di Ya, 24/11/2026): niente piu' ritorno forzato all'italiano
 function soloItaliano(){return;if(typeof EB_LANG=="undefined"||EB_LANG!="en")return;
  try{localStorage.removeItem("ebLang");}catch(e){}location.reload();}
 async function carica(){if(!S){soloItaliano();return aggiorna();}aggiorna();
  try{const r=await db("profili?select=prova_fino,premium_fino,sempre_premium,codice_invito,numero");P=(r&&r[0])||null;}
  catch(e){console.warn("[EdgeValor] account: profilo non letto",e);}
  aggiorna();
  // v8.29 codice invito per chi entra con Google (i dati della registrazione non passano): una sola chiamata,
  // il database lo accetta solo per account nuovi e senza invitante, poi il codice ricordato si cancella
  try{const c=localStorage.getItem("ebInvito");if(c){await db("rpc/registra_invito",{method:"POST",body:JSON.stringify({p_codice:c})});localStorage.removeItem("ebInvito");}}
  catch(e){console.warn("[EdgeValor] account: invito non registrato",e);}
  // v7.95 voce Admin: si chiede al database "sono admin?" (l'email dell'admin non e' mai nel codice del sito)
  let certo=true;                        // false se la domanda al database non e' riuscita (allora non si tocca la lingua)
  try{ADM=(await db("rpc/sono_admin",{method:"POST",body:"{}"}))===true;}catch(e){ADM=false;certo=false;}
  if(certo&&!ADM)soloItaliano();
  // la classe "eb-admin" mostra le parti riservate all'admin (es. stato dei dati nel Profilo, vedi stile.css)
  document.documentElement.classList.toggle("eb-admin",ADM);
  try{await sincronizza();}catch(e){console.warn("[EdgeValor] account: lista non sincronizzata",e);}}

 /* --- RIQUADRO PROFILO (v7.77): si apre DENTRO la barra laterale, appena sopra la voce "Profilo", e cresce verso l'alto
        (il gruppo in fondo alla barra e' ancorato in basso). Niente finestre al centro dello schermo.
        Senza accesso: campo email + "Mandami il link".   Con accesso: email, stato, Gestisci abbonamento, Esci.
        v7.80: nello stesso riquadro (parte fissa in index.html) ci sono anche Feedback, Guida e lo stato dei dati. --- */
 const box=$("pfbox"),conto=$("pfconto")||box,coda=$("pfcoda"),mob=()=>matchMedia("(max-width:900px)").matches;
 // v8.26 stella per "Lascia una recensione" (Trustpilot, si apre in una nuova scheda)
 const I={cestino:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5"/></svg>',stella:'<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',carta:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/></svg>',
          admin:'<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
          esci:'<svg viewBox="0 0 24 24"><path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"/><path d="M15 8l4 4-4 4M19 12H10"/></svg>'};
 let ultimoInvio=0,inviato="";                                  // inviato = email a cui e' appena partito il link
 /* v9.28 EMAIL CON LE OFFERTE (Black Friday, saldi...): Si'/No nel Profilo, salvato nel database (public.profili.offerte).
    Le email di servizio sull'account arrivano sempre; questo spegne solo le offerte. Mai bloccante: se il database
    non risponde i due pulsanti restano spenti. */
 //  La riga sta subito sotto "Lingua" (stesse impostazioni, stesso allineamento) e c'e' solo con l'accesso fatto.
 function offerte(){const ln=box.querySelector(".pflingua:not(.pfoff)");if(!ln||!window.ebAccount)return;
  let r=box.querySelector(".pfoff");
  if(!r){r=document.createElement("div");r.className="pflingua pfoff";
   r.innerHTML=`<span>Email con le offerte</span><div class="vfseg" role="group" aria-label="Email con le offerte"><button type="button" data-off="1">S&igrave;</button><button type="button" data-off="0">No</button></div>`;
   ln.after(r);}
  const bs=[...r.querySelectorAll("button")];
  const segna=v=>bs.forEach(b=>{b.classList.toggle("on",(b.dataset.off=="1")==!!v);b.disabled=false;});bs.forEach(b=>b.disabled=true);
  ebAccount.rpc("mie_offerte").then(v=>segna(v!==false)).catch(()=>{});
  bs.forEach(b=>b.onclick=()=>{const si=b.dataset.off=="1";bs.forEach(x=>x.disabled=true);
   ebAccount.rpc("imposta_offerte",{si}).then(v=>{segna(v!==false&&si);avviso(si?"Riceverai le email con le offerte":"Non riceverai più email con le offerte");
    // v9.33 dopo il "No": motivo facoltativo con un tocco, sotto la riga (sparisce se si torna a "Sì")
    const m=box.querySelector(".pfmotivo");if(m)m.remove();
    if(!si&&window.ebMotivo){const d=document.createElement("div");d.className="pfmotivo";r.after(d);ebMotivo.monta(d,{tipo:"offerte",compatto:true});}})
   .catch(()=>{ebAccount.rpc("mie_offerte").then(v=>segna(v!==false)).catch(()=>{});avviso("Non riuscito: riprova tra poco");});});}
 function avviso(t){const a=document.createElement("div");a.className="lavv";a.setAttribute("role","status");a.textContent=t;document.body.appendChild(a);setTimeout(()=>a.remove(),3800);}
 function disegna(msg){const u=S&&chi();if(coda&&!u)coda.innerHTML="";
  if(u){const pn=piano();
   conto.innerHTML=`<div class="pfchi"><b title="${esc(u.email)}">${esc(u.email)}</b>${idUtente()?`<span class="pfid" title="Il tuo codice: citalo quando ci scrivi">ID ${idUtente()}</span>`:""}<span class="pfst ${pn[2]}">${pn[2]=="prova"?"":(pn[1]||"Sto leggendo il tuo profilo…")}</span></div>${pn[2]=="prova"?riepilogoProva():""}
    ${ADM?`<button type="button" class="sitem pfvoce pfadmin">${I.admin}<span>Admin · Iscritti</span></button>`:""}
    ${window.ebAbbonamento&&ebAbbonamento.attivo()?`<button type="button" class="sitem pfvoce pfabb">${I.carta}<span>Gestisci abbonamento</span></button>`
     :`<button type="button" class="sitem pfvoce" disabled title="I pagamenti arrivano con l'apertura degli abbonamenti">${I.carta}<span>Gestisci abbonamento <small>presto</small></span></button>`}
    <a class="sitem pfvoce pfrec" href="${EB_TRUSTPILOT}" target="_blank" rel="noopener">${I.stella}<span>Lascia una recensione</span></a>
`;
   offerte();   // v9.28 interruttore delle email con le offerte stagionali
   const ab=box.querySelector(".pfabb");if(ab)ab.onclick=()=>{mostra(false);ebAbbonamento.apri();};   // v8.11 area abbonamento PayPal
   const ad=box.querySelector(".pfadmin");if(ad)ad.onclick=()=>{mostra(false);window.ebAdmin&&ebAdmin.apri();};
   // "Esci" va in fondo al riquadro (#pfcoda), dopo Feedback, Guida e stato dei dati
   if(coda)coda.innerHTML=`<button type="button" class="sitem pfvoce pfesci">${I.esci}<span>Esci</span></button>
    <button type="button" class="sitem pfvoce pfelim" hidden>${I.cestino}<span>Elimina account</span></button>`;
   // v9.35 "Elimina account": solo se il database lo consente (mai per fondatore e team), finestre in 49_elimina.js
   const el=box.querySelector(".pfelim");
   if(el&&window.ebElimina)ebAccount.rpc("posso_eliminare_account").then(v=>{if(v===true){el.hidden=false;el.onclick=()=>{mostra(false);ebElimina.apri();};}}).catch(()=>{});
   box.querySelector(".pfesci").onclick=()=>{const t=S&&S.a;S=null;P=null;ADM=false;pronto=false;inviato="";salva();try{localStorage.removeItem("ebPK");}catch(e){}   // v7.93 la chiave Premium resta solo a chi e' dentro
aggiorna();mostra(false);avviso("Sei uscito dal profilo");
    // v7.86: dopo l'uscita la pagina si ricarica e mostra la porta d'ingresso
    (t?fetch(API+"/auth/v1/logout?scope=local",{method:"POST",headers:intest(t)}).catch(()=>{}):Promise.resolve()).finally(()=>location.reload());};
   return;}
  if(inviato){conto.innerHTML=`<div class="pfchi"><b>Controlla la posta</b><span class="pfst">Ho mandato un link a ${esc(inviato)}. Aprilo da questo dispositivo. Se non lo vedi, guarda nello spam.</span></div>
    <button type="button" class="sitem pfvoce pfaltra"><span>Usa un'altra email</span></button>`;
   box.querySelector(".pfaltra").onclick=()=>{inviato="";disegna();};return;}
  conto.innerHTML=`<form class="pfform" novalidate><div class="pfchi"><b>Entra con la tua email</b><span class="pfst">Niente password: ti mando un link. La prima volta parte la prova Premium gratuita di ${EB_PREZZI.prova()} giorni.</span></div>
    ${msg?`<p class="pfko">${msg}</p>`:""}
    ${conGoogle()?`<button type="button" class="pfgoogle">${GICO}<span>Continua con Google</span></button><div class="pfoppure"><span>oppure</span></div>`:""}
    <input type="email" name="email" autocomplete="email" inputmode="email" placeholder="nome@esempio.it" aria-label="La tua email" required>
    <div class="fbesito" role="status" aria-live="polite"></div>
    <button type="submit" class="csi pfinvia">Mandami il link</button>
    <p class="small pfpriv">Usiamo l'email solo per farti accedere. Entrando accetti <a href="../legale/" target="_blank" rel="noopener">condizioni e privacy</a>.</p></form>`;
  const f=box.querySelector("form"),es=f.querySelector(".fbesito"),inv=f.querySelector(".pfinvia");
  // v8.19 accesso con Google: si torna su questa pagina con i codici di accesso (gestiti dal blocco "ritorno dal link")
  const g=f.querySelector(".pfgoogle");if(g)g.onclick=()=>{try{window.ebStat&&ebStat.ev("accesso",{passo:"google"});}catch(_){}
   if(window.ebGoogle&&ebGoogle.attivo())return ebGoogle.reindirizza();          // v9.00 riserva diretta a Google (niente supabase.co)
   const torna=location.href.split("#")[0].split("?")[0];
   location.href=API+"/auth/v1/authorize?provider=google&redirect_to="+encodeURIComponent(torna);};
  // v8.92 pulsante ufficiale di Google (35z_google.js): la finestra di Google mostra edgevalor.com e non Supabase
  if(g&&window.ebGoogle)ebGoogle.monta(f,{sel:".pfgoogle",tema:"outline",errore:m=>{es.className="fbesito ko";es.textContent=m;}});
  f.onsubmit=async e=>{e.preventDefault();const mail=f.email.value.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){es.className="fbesito ko";es.textContent="L'email non sembra valida.";f.email.focus();return;}
   if(Date.now()-ultimoInvio<60000){es.className="fbesito ko";es.textContent="Ti ho appena mandato un link: aspetta un minuto.";return;}
   inv.disabled=true;inv.textContent="Invio…";es.className="fbesito";es.textContent="";
   // v8.19 email temporanee (10minutemail, yopmail...): rifiutate prima di mandare il link (lista nel database)
   try{const t=await fetch(API+"/rest/v1/rpc/email_temporanea",{method:"POST",headers:intest(),body:JSON.stringify({p_email:mail})});
    if(t.ok&&(await t.json())===true){inv.disabled=false;inv.textContent="Mandami il link";es.className="fbesito ko";
     es.textContent="Le email temporanee non sono accettate: usa la tua email personale.";return;}}catch(_){}
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
  // v9.63 sul PC il riquadro compare accanto alla barra (.pfpop): a barra ridotta non serve piu' riallargarla
  mostra(box.hidden);};

 // v9.35 dopo l'eliminazione dell'account: si dimentica la sessione su questo dispositivo (l'account non esiste piu')
 function dimentica(){S=null;P=null;ADM=false;pronto=false;inviato="";salva();try{localStorage.removeItem("ebPK");}catch(e){}}
 window.ebAccount={mostra:(si)=>mostra(!!si),aperto:()=>!box.hidden,   // v9.61 apertura/chiusura da fuori (03c_sidebar.js)
  dimentica,ritorno:{esito,tipo},stato:()=>({sessione:!!S,utente:S?chi():null,profilo:P,listaSincronizzata:pronto}),premium:()=>{const p=piano();return p[2]=="ok"||p[2]=="prova";},id:()=>idUtente(),
  // v7.95 chiamata a una funzione del database con l'accesso dell'utente (usata dal riquadro Admin)
  rpc:(nome,corpo)=>db("rpc/"+nome,{method:"POST",body:JSON.stringify(corpo||{})}),
  // v8.11 per l'area abbonamento (46_abbonamento.js): codice di accesso valido e rilettura del profilo
  token:()=>codice(),ricarica:()=>{P=null;return carica().then(()=>{if(!box.hidden)disegna();});},
  // v8.95 ordine delle card della pagina Mercati (41_hub_mercati.js), colonna "ordine" della propria riga in "liste"
  ordine:{leggi:()=>db("liste?select=ordine").then(r=>((r||[])[0]||{}).ordine||null),
   salva:o=>{const u=chi();if(!u)return Promise.reject(new Error("senza sessione"));
    return db("liste?utente=eq."+u.id,{method:"PATCH",h:{Prefer:"return=minimal"},body:JSON.stringify({ordine:o})});}}};
 aggiorna();
 carica().then(()=>{if(!box.hidden)disegna();
  // ritorno dal link dell'email: un avviso breve; su PC si apre anche il riquadro del profilo
  if(esito=="ok"&&tipo!="recovery"){try{window.ebStat&&ebStat.ev("accesso",{passo:"entrato"});}catch(_){}avviso("Accesso riuscito. Benvenuto!");if(!mob())mostra(true);}
  else if(esito){const m=esito=="scaduto"?"Il link è scaduto o è già stato usato: chiedine uno nuovo.":"Accesso non riuscito: chiedi un nuovo link.";
   avviso(m);if(!mob())mostra(true,m);}});
}catch(e){console.error("[EdgeValor] account:",e);}})();
