/* ---------- 46_abbonamento.js - v8.18 AREA ABBONAMENTO (PayPal, rinnovo automatico fino a disdetta) ----------
   Finestra "Passa a Premium" / "Il tuo abbonamento". L'utente deve aver fatto l'accesso: l'abbonamento PayPal porta con se'
   il suo ID (custom_id) e la funzione Supabase "paypal" attiva Premium SOLO dopo aver riletto lo stato vero da PayPal.
   FLUSSO:
     1) scelta del piano (prezzi da EB_PREZZI, 01c_prezzi.js: 27,00 / 19,99 fino al 30/11/2026, poi 29,99 / 24,99);
     2) casella obbligatoria "Accetto le condizioni. Si rinnova da solo, disdici quando vuoi." (senza spunta niente pagamento);
     3) pulsanti PayPal (conto PayPal o carta) -> abbonamento creato -> ?azione=attiva -> Premium attivo;
     4) chi ha gia' un abbonamento vede stato, prossimo rinnovo e "Disdici abbonamento";
        v8.18 (decisione di Ya): la disdetta chiede conferma (cosa si perdera'), Premium resta fino alla fine del periodo
        pagato e arriva l'email di conferma. Solo rimborso o contestazione PayPal portano subito al Basic (funzione "paypal").
        Dopo l'attivazione la pagina si ricarica da sola: le schede Premium si sbloccano subito.
        chi ha disdetto vede "Riattiva": il nuovo abbonamento parte alla fine del periodo gia' pagato (nessun doppio addebito).
   APERTURA: per tutti dal v8.12 (APERTO=true). Con APERTO=false la vede solo l'admin e gli altri tornano al modulo "Assistenza".
   ARRIVO DA FUORI: .../terminale/?premium=1 (pagina Prezzi) o ?rinnova=1 (email): appena l'utente e' dentro si apre questa finestra.
   CHIAVI: qui solo il Client ID PayPal (pubblico per natura). Il Secret sta solo nei secret di Supabase.
   DEBUG (F12 -> Console): ebAbbonamento.attivo() dice se la finestra nuova e' accesa; errori con "[EdgeValor] abbonamento". */
(function(){try{
 const APERTO=true;                                          // true = per tutti (dopo il pagamento di prova di Ya)
 const API="https://cwwmqujccwzmqougtedh.supabase.co/functions/v1/paypal";
 const CLIENT="BAAG2KF3dRqXUD-lXpCqjZ9inaD5AOT6OKetoDMtkowcMNatVIBKLZ5-2_Rp4BFb9bP5skp1mrJE52zWtA";
 // v9.14 prezzi da EB_PREZZI (01c_prezzi.js): dal 1/12/2026 listino nuovo; chi si e' abbonato prima vede il suo prezzo
 const piani=listino=>({annuale:{id:listino.annuale.id,nome:"Annuale",prezzo:listino.annuale.prezzo,per:"all'anno",
                         nota:`${listino.annuale.mese} al mese · risparmi il ${listino.annuale.risp}%`},
                        mensile:{id:listino.mensile.id,nome:"Mensile",prezzo:listino.mensile.prezzo,per:"al mese",nota:"Massima flessibilità"}});
 let PIANI=piani(EB_PREZZI.listino());
 const attivo=()=>APERTO||document.documentElement.classList.contains("eb-admin");
 const data=d=>new Date(d).toLocaleDateString(typeof EB_LOC!="undefined"?EB_LOC:"it-IT",{day:"numeric",month:"long",year:"numeric"});
 const ICO='<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>';

 // SDK PayPal caricato una volta sola, solo quando serve
 let sdk=null;
 const caricaSdk=()=>sdk||(sdk=new Promise((ok,ko)=>{const s=document.createElement("script");
  s.src="https://www.paypal.com/sdk/js?client-id="+CLIENT+"&vault=true&intent=subscription&currency=EUR&locale=it_IT&components=buttons";
  s.onload=()=>ok(window.paypal);s.onerror=()=>{sdk=null;ko(new Error("SDK PayPal non caricato"));};document.head.appendChild(s);}));

 // chiamata alla funzione "paypal" con l'accesso dell'utente
 async function chiama(azione,corpo){const t=window.ebAccount&&ebAccount.token&&await ebAccount.token();if(!t)throw new Error("accesso");
  const r=await fetch(API+"?azione="+azione,{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify(corpo||{})});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.errore||("HTTP "+r.status));return j;}

 // v9.14 apri("mensile"|"annuale"): piano gia' scelto (es. dalla finestra Black Friday)
 let preferito=null;
 function apri(pref){if(document.querySelector(".abmodal"))return;preferito=pref=="mensile"||pref=="annuale"?pref:null;
  const st=window.ebAccount&&ebAccount.stato();
  if(!st||!st.sessione){if(window.ebFeedback)ebFeedback({premium:true});return;}       // senza accesso: prima si entra
  const box=document.createElement("div");box.className="cmodal abmodal";
  box.innerHTML=`<div class="cmodal-box abbox" role="dialog" aria-modal="true" aria-labelledby="abt">
    <div class="cmodal-testa"><span class="cmodal-ico abico" aria-hidden="true">${ICO}</span>
     <div><h3 id="abt">Premium</h3><p class="absott">Sto leggendo il tuo abbonamento…</p></div>
     <button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
    <div class="abcorpo"></div></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const corpo=box.querySelector(".abcorpo"),sott=box.querySelector(".absott"),chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),200);};
  box.querySelector(".fbx").onclick=chiudi;box.onclick=e=>{if(e.target==box)chiudi();};
  document.addEventListener("keydown",function k(e){if(e.key=="Escape"){chiudi();document.removeEventListener("keydown",k);}});

  // v8.23 FONDATORE / account riservati ("sempre Premium"): niente abbonamento da pagare, Premium a vita
  const pr=st.profilo||{};
  if(pr.sempre_premium){sott.textContent="Hai Premium a vita.";
   corpo.innerHTML=`<div class="abstato"><div><small>Piano</small><b>Premium · fondatore</b></div><div><small>Scadenza</small><b>Nessuna</b></div></div>
    <div class="cmodal-btn"><button type="button" class="csi abchiudi">Chiudi</button></div>`;
   corpo.querySelector(".abchiudi").onclick=chiudi;return;}
  // --- stato attuale (database) -> quale vista mostrare
  PIANI=piani(EB_PREZZI.listino());                             // il listino giusto all'apertura (anche dopo mezzanotte)
  (window.ebAccount.rpc("mio_abbonamento").catch(()=>[])).then(async r=>{const a=(r||[])[0];
   // v9.14 abbonamento attivo: prezzo del listino valido quando si e' abbonato (prezzo bloccato)
   if(a&&a.stato=="ACTIVE"){const dal=await window.ebAccount.rpc("mio_abbonamento_creato").catch(()=>null);
    return vistaAttivo(a,piani(EB_PREZZI.di(dal)));}
   const fino=a&&a.premium_fino&&Date.parse(a.premium_fino)>Date.now()?a.premium_fino:null;
   if(a&&fino&&a.stato!="RIMBORSATO")return vistaScelta(fino,`Disdetto · Premium attivo fino al ${data(fino)}`);
   vistaScelta(null,"Sblocca tutte le potenzialità del terminale.");});

  // --- vista 1: abbonamento attivo -> stato + Disdici abbonamento
  function vistaAttivo(a,lis){lis=lis||PIANI;vistaAttivo.lis=lis;const p=lis[a.piano]||lis.mensile;
   sott.textContent="Il tuo abbonamento è attivo.";
   corpo.innerHTML=`<div class="abstato"><div><small>Piano</small><b>${p.nome} · ${p.prezzo} ${p.per}</b></div>
     <div><small>Prossimo rinnovo</small><b>${a.prossimo?data(a.prossimo):"—"}</b></div></div>
    <div class="cmodal-btn"><button type="button" class="cno abdisdici">Disdici abbonamento</button><button type="button" class="csi abchiudi">Chiudi</button></div>`;
   corpo.querySelector(".abchiudi").onclick=chiudi;
   corpo.querySelector(".abdisdici").onclick=()=>vistaConferma(a);}

  // --- vista 1b: conferma della disdetta (cosa si perdera'). Il pulsante in evidenza e' "Mantieni Premium".
  function vistaConferma(a){const fine=a.premium_fino||a.prossimo;sott.textContent="Vuoi davvero disdire?";
   corpo.innerHTML=`<div class="abperdi"><b>${fine?"Dal "+data(fine)+" perderai":"Alla scadenza perderai"} l'accesso a:</b>
     <ul><li>Portafogli completi e acquisto guidato</li><li>Selezione di oggi e schede delle aziende</li>
     <li>COT completo, Forex e Crypto</li><li>Macro, Live e statistiche avanzate</li></ul></div>
    <p class="small abnota">Non ci saranno altri addebiti. Fino a quella data Premium resta attivo, poi passi al piano Basic. Ti mandiamo la conferma via email.</p>
    <div class="abesito" role="status" aria-live="polite"></div>
    <div class="cmodal-btn"><button type="button" class="cno abannulla">Sì, disdici</button><button type="button" class="csi abtieni">Mantieni Premium</button></div>`;
   const d=corpo.querySelector(".abannulla"),es=corpo.querySelector(".abesito");
   corpo.querySelector(".abtieni").onclick=()=>vistaAttivo(a,vistaAttivo.lis);
   d.onclick=async()=>{d.disabled=true;d.textContent="Disdetta…";
    try{await chiama("disdici");sott.textContent="Disdetta confermata.";
     corpo.innerHTML=`<p class="abesito ok">${fine?"Premium resta attivo fino al "+data(fine)+".":"Premium resta attivo fino alla scadenza."} Ti abbiamo mandato la conferma via email.</p>
      <div class="cmodal-btn"><button type="button" class="csi abchiudi">Chiudi</button></div>`;
     corpo.querySelector(".abchiudi").onclick=chiudi;window.ebAccount.ricarica&&ebAccount.ricarica();}
    catch(e){console.warn("[EdgeValor] abbonamento: disdetta",e);d.disabled=false;d.textContent="Sì, disdici";
     es.className="abesito ko";es.textContent="Disdetta non riuscita. Riprova tra poco.";}};}

  // --- vista 2: scelta del piano + condizioni + PayPal. parte = data di partenza (riattivazione) o null (subito)
  function vistaScelta(parte,frase){let scelto=preferito||"annuale";
   sott.textContent=frase;
   corpo.innerHTML=`<div class="abpiani" role="radiogroup" aria-label="Piano">${Object.entries(PIANI).map(([k,p])=>`
     <button type="button" role="radio" class="abpiano${k==scelto?" on":""}" data-k="${k}" aria-checked="${k==scelto}">
      ${k=="annuale"?'<span class="abtag">Più conveniente</span>':""}<small>${p.nome}</small><b>${p.prezzo}</b><span>${p.per}</span><em>${p.nota}</em></button>`).join("")}</div>
    ${EB_PREZZI.nuovi()?"":`<p class="abblocca"><b>${T("Tariffa bloccata")}</b> ${T("Abbonati entro il 30 novembre: mantieni questa tariffa finché resti abbonato. Dal 1° dicembre il listino passa a 29,99 € al mese.")}</p>`}
    <label class="abok"><input type="checkbox"><span>Accetto le <a href="../legale/#abbonamento" target="_blank" rel="noopener">condizioni</a> e ho compreso che EdgeValor non è un broker né un consulente: offre analisi a scopo educativo. Si rinnova da solo, disdici quando vuoi.</span></label>
    ${parte?`<p class="small abparte">Il primo addebito parte il ${data(parte)}, alla fine del periodo già pagato.</p>`:""}
    <div class="abpp" aria-disabled="true"><div class="abppin"></div></div>
    <div class="abesito" role="status" aria-live="polite"></div>`;
   const ok=corpo.querySelector(".abok input"),pp=corpo.querySelector(".abpp"),es=corpo.querySelector(".abesito");
   corpo.querySelectorAll(".abpiano").forEach(b=>b.onclick=()=>{scelto=b.dataset.k;
    corpo.querySelectorAll(".abpiano").forEach(x=>{x.classList.toggle("on",x==b);x.setAttribute("aria-checked",x==b);});});
   let azioni=null;
   const blocca=()=>{const si=ok.checked;pp.setAttribute("aria-disabled",!si);if(azioni)si?azioni.enable():azioni.disable();};
   ok.onchange=blocca;
   caricaSdk().then(paypal=>paypal.Buttons({style:{shape:"pill",color:"gold",layout:"vertical",label:"subscribe",height:46},
     onInit:(d,a)=>{azioni=a;blocca();},
     onClick:()=>{if(!ok.checked){es.className="abesito ko";es.textContent="Spunta la casella delle condizioni per continuare.";}},
     createSubscription:(d,a)=>{const u=window.ebAccount.stato().utente;
      const o={plan_id:PIANI[scelto].id,custom_id:u.id,
       application_context:{brand_name:"EdgeValor",locale:"it-IT",shipping_preference:"NO_SHIPPING",user_action:"SUBSCRIBE_NOW"}};
      if(parte)o.start_time=new Date(Math.max(Date.parse(parte),Date.now()+3600e3)).toISOString();
      return a.subscription.create(o);},
     onApprove:async d=>{pp.hidden=true;es.className="abesito";es.textContent="Attivo Premium sul tuo account…";
      try{const r=await chiama("attiva",{id:d.subscriptionID});vistaFatto(r.fino);}
      catch(e){console.warn("[EdgeValor] abbonamento: attivazione",e);es.className="abesito ko";
       es.textContent="Pagamento ricevuto. L'attivazione arriva entro pochi minuti: riceverai un'email.";}},
     onError:e=>{console.warn("[EdgeValor] abbonamento: PayPal",e);es.className="abesito ko";es.textContent="Pagamento non riuscito. Riprova tra poco.";}
    }).render(corpo.querySelector(".abppin"))).catch(e=>{console.warn("[EdgeValor] abbonamento:",e);es.className="abesito ko";
     es.textContent="PayPal non si è caricato. Controlla la connessione e riprova.";});}

  // --- vista 3: fatto
  function vistaFatto(fino){sott.textContent="Benvenuto in Premium.";box.querySelector(".abico").classList.add("ok");
   corpo.innerHTML=`<div class="abstato"><div><small>Premium attivo</small><b>${fino?"fino al "+data(fino):"Attivato"}</b></div></div>
    <p class="small">Ti abbiamo mandato la conferma via email. Si rinnova da solo: lo disdici quando vuoi da qui.</p>
    <div class="cmodal-btn"><button type="button" class="csi abvai">Apri il terminale</button></div>`;
   corpo.querySelector(".abvai").onclick=()=>location.reload();       // ricarica: i dati Premium si aprono con la chiave
   setTimeout(()=>location.reload(),3500);}}                         // v8.18 e comunque da sola: schede sbloccate subito

 window.ebAbbonamento={apri,attivo};
 // v8.12 ARRIVO DALLA PAGINA PREZZI O DALLE EMAIL (?premium=1 / ?rinnova=1). Il link di accesso via email riapre la pagina
 // senza parametri: per questo l'intenzione si ricorda nel browser (ebVaiPremium, valida 1 ora) e si usa appena si e' dentro.
 const KV="ebVaiPremium";
 try{if(/[?&](premium|rinnova)=1/.test(location.search)){localStorage.setItem(KV,String(Date.now()));
   history.replaceState(null,"",location.pathname+location.hash);}}catch(e){}
 let quando=0;try{quando=+localStorage.getItem(KV)||0;}catch(e){}
 if(quando&&Date.now()-quando<3600e3){let n=0;const t=setInterval(()=>{n++;
   const u=window.ebAccount&&ebAccount.stato&&ebAccount.stato().utente;
   if(u&&!document.querySelector(".cmodal")){clearInterval(t);try{localStorage.removeItem(KV);}catch(e){}if(attivo())apri();}
   else if(n>240)clearInterval(t);},500);}
}catch(e){console.error("[EdgeValor] abbonamento:",e);}})();
