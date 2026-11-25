/* ---------- MOTIVO DI USCITA (v9.33): "Ci dici perché?" dopo una disdetta o quando si spengono le offerte ----------
   Richiesta di Ya: chi se ne va puo' lasciare il motivo, cosi' arriva il feedback (prezzo, cosa manca, complessita'...).
   REGOLE: e' SEMPRE facoltativo e compare DOPO l'azione (la disdetta o il "No" alle offerte sono gia' fatti):
   non deve mai rallentare chi vuole andarsene.
   DUE FORME:
     - completa (finestra abbonamento): scelta del motivo + nota facoltativa + "Invia";
     - compatta (Profilo, riga "Email con le offerte"): solo le scelte, un tocco invia.
   DOVE VA: funzione motivo-uscita (Supabase) -> tabella privata letta solo dall'admin + email a Ya.
   DEBUG: ebMotivo.monta(document.body,{tipo:"abbonamento"}) mostra il riquadro in fondo alla pagina. */
(function(){try{
 const API="https://cwwmqujccwzmqougtedh.supabase.co/functions/v1/motivo-uscita";
 // [codice, etichetta]: gli stessi codici della funzione e del database
 const MOTIVI={
  abbonamento:[["costo","Costa troppo"],["manca","Manca qualcosa che mi serve"],["complesso","È troppo complesso"],
               ["poco_uso","Lo uso poco"],["altro_servizio","Ho scelto un altro servizio"],["altro","Altro"]],
  offerte:[["troppe_email","Troppe email"],["non_interessa","Le offerte non mi interessano"],["costo","Costa troppo"],["altro","Altro"]]};
 // testi in inglese: T() di 00a_lingua.js (dizionario in 00q_lingua.js)

 // invio: con l'accesso dell'utente (il token lo verifica la funzione)
 async function invia(tipo,motivo,nota){const t=window.ebAccount&&ebAccount.token&&await ebAccount.token();if(!t)throw new Error("accesso");
  const r=await fetch(API,{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({tipo,motivo,nota:nota||""})});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.errore||("HTTP "+r.status));}

 // o = {tipo:"abbonamento"|"offerte", compatto:true|false}. Ritorna l'elemento creato (gia' dentro "dove").
 function monta(dove,o){o=o||{};const tipo=MOTIVI[o.tipo]?o.tipo:"abbonamento",c=!!o.compatto;
  const box=document.createElement("div");box.className="mvbox"+(c?" mvc":"");
  box.innerHTML=`<p class="mvtit">${T("Ci dici perché?")} <span>${T("Facoltativo")}</span></p>
   <div class="mvchip" role="radiogroup" aria-label="${T("Motivo")}">${MOTIVI[tipo].map(m=>`<button type="button" role="radio" aria-checked="false" data-m="${m[0]}">${T(m[1])}</button>`).join("")}</div>
   ${c?"":`<textarea class="mvnota" rows="3" maxlength="500" placeholder="${T("Vuoi aggiungere qualcosa? Lo leggo personalmente.")}" aria-label="${T("Nota facoltativa")}"></textarea>
   <div class="mvazioni cmodal-btn"><button type="button" class="csi mvinvia" disabled>${T("Invia")}</button></div>`}
   <p class="mvesito" role="status" aria-live="polite"></p>`;
  dove.appendChild(box);
  const bs=[...box.querySelectorAll(".mvchip button")],es=box.querySelector(".mvesito"),ok=box.querySelector(".mvinvia");let scelto="";
  const fatto=()=>{box.classList.add("mvok");box.innerHTML=`<p class="mvgrazie"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${T("Grazie, ricevuto.")}</p>`;
   // forma compatta (Profilo): il grazie sparisce da solo, la riga torna pulita
   if(c)setTimeout(()=>{const p=box.parentElement;(p&&p.classList.contains("pfmotivo")?p:box).remove();},2600);};
  const errore=()=>{es.className="mvesito ko";es.textContent=T("Invio non riuscito. Riprova tra poco.");};
  bs.forEach(b=>b.onclick=async()=>{scelto=b.dataset.m;es.textContent="";
   bs.forEach(x=>{const on=x==b;x.classList.toggle("on",on);x.setAttribute("aria-checked",on?"true":"false");});
   if(!c){ok.disabled=false;return;}
   // forma compatta: il tocco invia subito
   bs.forEach(x=>x.disabled=true);
   try{await invia(tipo,scelto,"");fatto();}catch(e){console.warn("[EdgeValor] motivo:",e);bs.forEach(x=>x.disabled=false);errore();}});
  if(ok)ok.onclick=async()=>{if(!scelto)return;ok.disabled=true;ok.textContent=T("Invio…");
   try{await invia(tipo,scelto,box.querySelector(".mvnota").value.trim());fatto();}
   catch(e){console.warn("[EdgeValor] motivo:",e);ok.disabled=false;ok.textContent=T("Invia");errore();}};
  return box;}

 window.ebMotivo={monta};
}catch(e){console.error("[EdgeValor] motivo:",e);}})();
