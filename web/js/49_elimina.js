/* ---------- ELIMINA ACCOUNT (v9.35): Profilo -> "Elimina account", due conferme e poi cancellazione definitiva ----------
   Richiesta e testi di Ya (26/11/2026):
     1) "Sei sicuro di voler eliminare il tuo account?" + "Ci dispiace che tu te ne vada. Cliccando Sì, confermi
        l'eliminazione definitiva del tuo account e dei tuoi dati." Se c'e' un abbonamento attivo: riquadro con la
        disdetta e i vantaggi che si perdono (stesso riquadro della disdetta, 46_abbonamento.js). [Annulla] [Sì, confermo]
     2) "Ultima conferma": [Torna indietro] [Elimina definitivamente il mio account] (rosso).
     v9.63 (Ya, 27/11/2026): con l'abbonamento ATTIVO l'account NON si elimina: compare solo il messaggio "Potrai eliminare
        il tuo account solo dopo aver terminato l'abbonamento" con il pulsante per gestirlo. Il punto 1 vale senza abbonamento.
     3) funzione elimina-account: rifiuta se l'abbonamento e' attivo, archivia i pagamenti (obbligo fiscale), cancella tutto il resto.
        Poi si esce dall'account e si torna alla pagina iniziale.
   La voce non compare per fondatore e team (rpc posso_eliminare_account) e la funzione li rifiuta comunque.
   DEBUG: ebElimina.apri({prova:true}) mostra le finestre senza eliminare niente. */
(function(){try{
 const API="https://cwwmqujccwzmqougtedh.supabase.co/functions/v1/elimina-account";
 const ICO={cestino:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5"/></svg>',
  avviso:'<svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>',
  ok:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'};

 function apri(o){o=o||{};if(document.querySelector(".elmodal"))return;
  const box=document.createElement("div");box.className="cmodal elmodal";
  box.innerHTML=`<div class="cmodal-box elbox" role="alertdialog" aria-modal="true" aria-labelledby="elt"></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const corpo=box.querySelector(".elbox");let occupato=false;
  const chiudi=()=>{if(occupato)return;box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});
  const testa=(ico,cls,tit)=>`<div class="cmodal-testa"><span class="cmodal-ico ${cls}" aria-hidden="true">${ico}</span><div><h3 id="elt">${tit}</h3></div></div>`;

  // --- passo 1: conferma con il messaggio di Ya (+ abbonamento attivo, se c'e')
  function passo1(attivo){
   corpo.innerHTML=testa(ICO.cestino,"ko",T("Sei sicuro di voler eliminare il tuo account?"))+
    `<p class="eltxt">${T("Ci dispiace che tu te ne vada. Cliccando Sì, confermi l'eliminazione definitiva del tuo account e dei tuoi dati.")}</p>
    ${attivo?`<div class="abperdi"><b>${T("Il tuo abbonamento Premium verrà disdetto e perderai tutti i vantaggi:")}</b>
     <ul><li>${T("Portafogli completi e acquisto guidato")}</li><li>${T("Selezione di oggi e schede delle aziende")}</li>
     <li>${T("COT completo, Forex e Crypto")}</li><li>${T("Macro, Live e statistiche avanzate")}</li></ul></div>
     <p class="small abnota">${T("Non ci saranno altri addebiti.")}</p>`:""}
    <div class="cmodal-btn"><button type="button" class="cno elno">${T("Annulla")}</button><button type="button" class="csi elsi">${T("Sì, confermo")}</button></div>`;
   corpo.querySelector(".elno").onclick=chiudi;corpo.querySelector(".elsi").onclick=()=>passo2(attivo);
   corpo.querySelector(".elno").focus();}

  // --- passo 2: ultima conferma, pulsante rosso
  function passo2(attivo){
   corpo.innerHTML=testa(ICO.avviso,"ko",T("Ultima conferma"))+
    `<p class="eltxt">${T(attivo?"L'eliminazione è definitiva: account, lista, impostazioni e abbonamento non potranno essere recuperati."
     :"L'eliminazione è definitiva: account, lista e impostazioni non potranno essere recuperati.")}</p>
    <p class="abesito" role="status" aria-live="polite"></p>
    <div class="cmodal-btn"><button type="button" class="cno elind">${T("Torna indietro")}</button><button type="button" class="ckill elvia">${T("Elimina definitivamente il mio account")}</button></div>`;
   const ind=corpo.querySelector(".elind"),via=corpo.querySelector(".elvia"),es=corpo.querySelector(".abesito");
   ind.onclick=()=>passo1(attivo);ind.focus();
   via.onclick=async()=>{if(o.prova){es.className="abesito";es.textContent="Prova: nessuna eliminazione.";return;}
    occupato=true;via.disabled=ind.disabled=true;via.textContent=T("Elimino l'account…");es.textContent="";
    try{const t=await ebAccount.token();if(!t)throw {e:"accesso"};
     const r=await fetch(API,{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:"{}"});
     const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw {e:j.errore||"interno"};
     fatto();}
    catch(x){occupato=false;via.disabled=ind.disabled=false;via.textContent=T("Elimina definitivamente il mio account");es.className="abesito ko";
     const e=x&&x.e;console.warn("[EdgeValor] elimina account:",x);
     es.textContent=T(e=="disdetta"?"Non siamo riusciti a disdire l'abbonamento su PayPal, quindi l'account non è stato eliminato. Riprova tra poco."
      :e=="abbonamento"?"Potrai eliminare il tuo account solo dopo aver terminato l'abbonamento.":e=="protetto"?"Questo account non si può eliminare.":e=="accesso"?"Accesso scaduto: entra di nuovo e riprova."
      :"Eliminazione non riuscita. Riprova tra poco.");}};}

  // --- v9.63 (Ya, 27/11/2026) ABBONAMENTO ATTIVO: l'account non si elimina. Solo il messaggio e la strada per la disdetta
  //     (prima l'eliminazione disdiceva PayPal da sola). Anche la funzione elimina-account rifiuta (errore "abbonamento").
  function bloccato(){
   corpo.innerHTML=testa(ICO.avviso,"",T("Prima disdici l'abbonamento"))+
    `<p class="eltxt">${T("Potrai eliminare il tuo account solo dopo aver terminato l'abbonamento.")}</p>
     <p class="small abnota">${T("Puoi disdirlo da «Gestisci abbonamento»: non ci saranno altri addebiti.")}</p>
    <div class="cmodal-btn"><button type="button" class="cno elno">${T("Ho capito")}</button>${window.ebAbbonamento?`<button type="button" class="csi elabb">${T("Gestisci abbonamento")}</button>`:""}</div>`;
   corpo.querySelector(".elno").onclick=chiudi;corpo.querySelector(".elno").focus();
   const g=corpo.querySelector(".elabb");if(g)g.onclick=()=>{chiudi();setTimeout(()=>ebAbbonamento.apri(),240);};}

  // --- fine: account eliminato, si esce e si torna alla pagina iniziale
  function fatto(){
   corpo.innerHTML=testa(ICO.ok,"",T("Account eliminato"))+`<p class="eltxt">${T("Il tuo account e i tuoi dati sono stati eliminati. Grazie di aver provato EdgeValor.")}</p>`;
   try{ebAccount.dimentica();}catch(e){}
   setTimeout(()=>{location.href="/";},2800);}

  // abbonamento attivo? (lo dice il database)
  corpo.innerHTML=testa(ICO.cestino,"ko",T("Elimina account"))+`<p class="eltxt">${T("Un momento…")}</p>`;
  (window.ebAccount&&ebAccount.rpc?ebAccount.rpc("mio_abbonamento").catch(()=>[]):Promise.resolve([]))
   .then(r=>{const a=(r||[])[0];(!!(a&&a.stato=="ACTIVE")||!!o.attivo)?bloccato():passo1(false);});}

 window.ebElimina={apri};
}catch(e){console.error("[EdgeValor] elimina account:",e);}})();
