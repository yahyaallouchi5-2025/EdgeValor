
/* ---------- ADMIN (v7.95): gestione iscritti e Premium, solo per l'admin ----------
   Si apre dal Profilo (voce "Admin", visibile solo se il database risponde si' a "sono admin?").
   L'email dell'admin NON e' nel codice: decide il database (funzione privato.e_admin, email confermata).
   Dati: rpc admin_utenti()  -> elenco iscritti (ID, email, prova, premium, accesso)
   Azioni: rpc admin_premium(utente, azione) con azione = "mese" (+30 g), "anno" (+365 g);
          v8.93 rpc admin_revoca(utente, motivo) = subito Basic, motivo "abuso" | "minacce" | "condivisione";
          dopo ogni azione l'utente riceve un'email (funzione email-abbonamento: tipi "regalo" e "revoca").
          rpc admin_scadenza(utente, fino) = calendario: Premium fino al giorno scelto, alle 23:59.
   Il rinnovo si somma alla scadenza se e' ancora attiva (chi rinnova prima non perde giorni).
   Ogni azione finisce nel registro del database (privato.admin_registro) per riconciliare i pagamenti PayPal.
   Se un utente qualsiasi chiamasse queste funzioni, il database risponde "non autorizzato".
   v9.33 in fondo "Motivi di uscita": rpc admin_motivi_uscita() (perche' disdicono o spengono le offerte).
   DEBUG: ebAdmin.apri() apre il riquadro; ebAdmin.dati() restituisce l'ultimo elenco letto. */
(function(){try{
 const GIORNO=864e5;
 let elenco=[],filtro="tutti",cerca="";
 const data=d=>d?new Date(d).toLocaleDateString(EB_LOC,{day:"2-digit",month:"short",year:"numeric"}):"—";
 const idDi=u=>u.numero?"EV-"+String(u.numero).padStart(4,"0"):"—";
 // stato di un iscritto: [chiave, etichetta, scadenza da mostrare]
 function stato(u){const ora=Date.now();
  if(u.sempre)return ["sempre","Sempre Premium",null];
  if(u.premium_fino&&Date.parse(u.premium_fino)>ora)return ["premium","Premium",u.premium_fino];
  if(u.prova_fino&&Date.parse(u.prova_fino)>ora)return ["prova","In prova",u.prova_fino];
  return ["basic","Basic",null];}
 // "in scadenza": Premium o prova che finisce entro 7 giorni
 const inScadenza=u=>{const s=stato(u);return (s[0]=="premium"||s[0]=="prova")&&Date.parse(s[2])-Date.now()<7*GIORNO;};
 // calendario: data locale "aaaa-mm-gg" (per il campo data) e icona
 const ymd=ms=>{const d=new Date(ms);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
 const CAL='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';
 const giorniA=d=>Math.max(0,Math.ceil((Date.parse(d)-Date.now())/GIORNO));
 const FILTRI=[["tutti","Tutti"],["premium","Premium"],["prova","In prova"],["basic","Basic"],["scade","In scadenza"]];
 const passa=u=>{const s=stato(u)[0];
  if(filtro=="premium"&&!(s=="premium"||s=="sempre"))return false;
  if(filtro=="prova"&&s!="prova")return false;if(filtro=="basic"&&s!="basic")return false;
  if(filtro=="scade"&&!inScadenza(u))return false;
  const q=cerca.trim().toLowerCase();return !q||(u.email||"").toLowerCase().includes(q)||idDi(u).toLowerCase().includes(q);};

 function apri(){if(document.querySelector(".admodal"))return;
  const box=document.createElement("div");box.className="cmodal admodal";
  box.innerHTML=`<div class="cmodal-box adbox" role="dialog" aria-modal="true" aria-labelledby="adt">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg></span>
    <div><h3 id="adt">Admin · Iscritti <button type="button" class="info" data-apri="adinfo" data-k="admin" aria-expanded="false" aria-label="Come funziona">i</button></h3><p class="adsott">Attiva Premium dopo il pagamento PayPal.</p></div>
    <button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
   <p id="adinfo" class="sub infotesto">+1 mese aggiunge 30 giorni, +1 anno 365: se l'utente è ancora Premium si sommano alla scadenza, altrimenti partono da oggi. Revoca riporta subito a Basic. Alla scadenza l'utente torna Basic da solo. Ogni azione resta registrata.</p>
   <div class="adnum"></div>
   <input type="search" class="adcerca" placeholder="Cerca email o ID" aria-label="Cerca email o ID">
   <div class="adlista" aria-live="polite"><p class="advuoto">Carico gli iscritti…</p></div>
   <details class="admotivi"><summary>Motivi di uscita <b class="admn"></b></summary><div class="admcorpo"><p class="advuoto">Carico…</p></div></details></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});box.querySelector(".fbx").onclick=chiudi;
  // il pulsante (i) usa il gestore comune di 01_base.js (data-apri="adinfo")
  const lista=box.querySelector(".adlista"),num=box.querySelector(".adnum");
  box.querySelector(".adcerca").oninput=e=>{cerca=e.target.value;disegna();};

  // riepilogo in alto: un numero per stato; ogni riquadro e' anche il filtro (niente filtri doppi)
  function riepilogo(){const c={tutti:elenco.length,premium:0,prova:0,basic:0,scade:0};
   elenco.forEach(u=>{const s=stato(u)[0];c[s=="sempre"?"premium":s]++;if(inScadenza(u))c.scade++;});
   num.innerHTML=FILTRI.map(f=>`<button type="button" class="adn ${f[0]}${filtro==f[0]?" on":""}" data-f="${f[0]}"><b>${c[f[0]]}</b><span>${f[1]}</span></button>`).join("");
   num.querySelectorAll(".adn").forEach(b=>b.onclick=()=>{filtro=b.dataset.f;disegna();});}

  function disegna(){riepilogo();
   const righe=elenco.filter(passa);
   if(!righe.length){lista.innerHTML=`<p class="advuoto">${elenco.length?"Nessun iscritto con questi filtri.":"Ancora nessun iscritto."}</p>`;return;}
   lista.innerHTML=righe.map(u=>{const s=stato(u),fisso=s[0]=="sempre";
    const scad=s[2]?`${s[0]=="prova"?"prova ":""}fino al ${data(s[2])} · ${giorniA(s[2])} g`:(fisso?"senza scadenza":"");
    return `<div class="adriga" data-id="${u.id}">
     <div class="adchi"><span class="adid">${idDi(u)}</span><b title="${esc(u.email||"")}">${esc(u.email||"")}</b>
      <small>Iscritto il ${data(u.creato)} · ultimo accesso ${data(u.ultimo_accesso)}</small></div>
     <div class="adst"><span class="adpill ${s[0]}">${s[1]}</span><small class="${inScadenza(u)?"adwarn":""}">${scad}</small></div>
     <div class="adazioni">${fisso?`<small class="admuto">Gestito dal sistema</small>`:
      `<button type="button" class="adb pri" data-a="mese">+1 mese</button><button type="button" class="adb" data-a="anno">+1 anno</button>${s[0]=="premium"||s[0]=="prova"?`<button type="button" class="adb ko" data-a="revoca">Revoca</button>`:`<span class="adb vuoto" aria-hidden="true">Revoca</span>`}`}</div></div>`;}).join("");
   // v8.41 tolto il calendario (decisione di Ya, 20/11/2026): bastano +1 mese e +1 anno
   lista.querySelectorAll("button.adb").forEach(b=>b.onclick=()=>azione(b));}

  // (in Basic al posto di Revoca c'e' uno spazio invisibile: i pulsanti restano allineati in colonna)
  // azione su un iscritto: la revoca chiede conferma sul pulsante stesso (secondo tocco entro 4 s)
  async function azione(b,fino){const riga=b.closest(".adriga"),id=riga.dataset.id,a=b.dataset.a,u=elenco.find(x=>x.id==id);
   // v8.93 la revoca chiede il MOTIVO (finisce nel registro e nell'email all'utente, vedi condizioni d'uso #revoca)
   if(a=="revoca"){const box=riga.querySelector(".adazioni");
    box.innerHTML=`<select class="admot" aria-label="Motivo della revoca"><option value="">Motivo…</option><option value="abuso">Abuso del servizio</option>
     <option value="minacce">Minacce, ricatti o offese</option><option value="condivisione">Condivisione o rivendita</option></select>
     <button type="button" class="adb ko" data-a="revoca2" disabled>Revoca</button><button type="button" class="adb" data-a="annulla">Annulla</button>`;
    const sel=box.querySelector(".admot"),ok=box.querySelector('[data-a="revoca2"]');
    sel.onchange=()=>{ok.disabled=!sel.value;};ok.onclick=()=>azione(ok);box.querySelector('[data-a="annulla"]').onclick=()=>disegna();sel.focus();return;}
   if(a=="annulla")return disegna();
   const motivo=a=="revoca2"?riga.querySelector(".admot").value:"";
   riga.querySelectorAll(".adb").forEach(x=>x.disabled=true);if(a!="data")b.textContent="…";
   try{const f=a=="data"?await ebAccount.rpc("admin_scadenza",{utente:id,fino})
     :a=="revoca2"?await ebAccount.rpc("admin_revoca",{utente:id,motivo}):await ebAccount.rpc("admin_premium",{utente:id,azione:a});
    u.premium_fino=f;if(a=="revoca2"&&u.prova_fino&&Date.parse(u.prova_fino)>Date.now())u.prova_fino=new Date().toISOString();
    // l'utente riceve l'email (regalo o revoca) al prossimo giro delle email (entro un'ora)
    disegna();avviso(a=="revoca2"?`${idDi(u)} è tornato Basic · email all'utente entro un'ora`:`${idDi(u)} Premium fino al ${data(f)} · email all'utente entro un'ora`);}
   catch(e){console.warn("[EdgeValor] admin: azione non riuscita",e);disegna();avviso("Azione non riuscita: riprova.");}}

  // v9.33 MOTIVI DI USCITA: perche' disdicono Premium o spengono le offerte (facoltativo per l'utente). Conteggio per
  // motivo in alto, poi le ultime risposte con la nota. Ogni nuovo motivo arriva anche via email all'admin.
  const MOT={costo:"Costa troppo",manca:"Manca qualcosa",complesso:"Troppo complesso",poco_uso:"Lo usa poco",altro_servizio:"Altro servizio",
   troppe_email:"Troppe email",non_interessa:"Offerte non interessano",altro:"Altro"};
  const mc=box.querySelector(".admcorpo"),mn=box.querySelector(".admn");
  ebAccount.rpc("admin_motivi_uscita",{}).then(r=>{r=Array.isArray(r)?r:[];mn.textContent=r.length||"";
   if(!r.length){mc.innerHTML=`<p class="advuoto">Ancora nessun motivo.</p>`;return;}
   const c={};r.forEach(x=>{c[x.motivo]=(c[x.motivo]||0)+1;});
   const top=Object.entries(c).sort((a,b)=>b[1]-a[1]),max=top[0][1];
   mc.innerHTML=`<div class="admconta">${top.map(([k,n])=>`<div><span>${MOT[k]||k}</span><i style="--w:${Math.round(n/max*100)}%"></i><b>${n}</b></div>`).join("")}</div>
    ${r.slice(0,50).map(x=>`<div class="admriga"><small>${data(x.creato)} · ${esc(x.ev||"—")} · ${x.tipo=="abbonamento"?"Disdetta":"Offerte"}</small>
     <b>${MOT[x.motivo]||esc(x.motivo)}</b>${x.nota?`<p>${esc(x.nota)}</p>`:""}</div>`).join("")}`;})
   .catch(e=>{console.warn("[EdgeValor] admin: motivi non letti",e);mc.innerHTML=`<p class="advuoto">Motivi non disponibili.</p>`;});

  ebAccount.rpc("admin_utenti",{}).then(r=>{elenco=Array.isArray(r)?r:[];disegna();})
   .catch(e=>{console.warn("[EdgeValor] admin: elenco non letto",e);lista.innerHTML=`<p class="advuoto">Elenco non disponibile. Riprova tra poco.</p>`;});}

 function avviso(t){const a=document.createElement("div");a.className="lavv";a.setAttribute("role","status");a.textContent=t;document.body.appendChild(a);setTimeout(()=>a.remove(),3800);}
 window.ebAdmin={apri,dati:()=>elenco};
}catch(e){console.error("[EdgeValor] admin:",e);}})();
