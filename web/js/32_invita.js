/* ---------- v6.94 LOGO E INVITA AMICI ----------
   1) LOGO: il marchio EdgeValor (barra laterale e in alto) riporta alla Dashboard, senza ricaricare la pagina.
   2) INVITA AMICI: su telefono apre la condivisione del sistema (WhatsApp, Telegram...); dove non c'e' (PC),
      copia il link della pagina di presentazione e lo conferma con un piccolo avviso che sparisce da solo. */
try{(function(){
 const LINK=EB_SITO;              // pagina di presentazione (landing)
 const TESTO="EdgeValor: analisi quantitativa dei mercati (COT, forex, portafogli). Dai un'occhiata:";
 document.querySelectorAll(".blhome").forEach(a=>a.addEventListener("click",e=>{
  e.preventDefault();
  if(typeof go=="function")go("sig");                                       // stessa funzione delle schede
  try{history.replaceState(null,"","#sig");}catch(x){}
  document.documentElement.classList.remove("sideon");const o=$("sombra");if(o)o.hidden=true;   // telefono: chiude il menu
  window.scrollTo({top:0,behavior:"smooth"});}));
 function avviso(t){                                                         // piccolo avviso in basso, 2,5 secondi
  let d=document.querySelector(".invavv");if(!d){d=document.createElement("div");d.className="invavv";d.setAttribute("role","status");document.body.appendChild(d);}
  d.textContent=t;d.classList.add("on");clearTimeout(d._t);d._t=setTimeout(()=>d.classList.remove("on"),2500);}
 const b=$("invita");if(!b)return;
 // v8.29 PORTA UN AMICO: con l'accesso fatto il link contiene il proprio codice (?invito=...). Quando l'amico si
 // registra e fa il primo pagamento, il database regala 1 mese di Premium a chi l'ha invitato (paypal_registra).
 const mio=()=>{try{const p=window.ebAccount&&ebAccount.stato().profilo;return p&&p.codice_invito||"";}catch(e){return "";}};
 // ---- condivisione semplice (chi non ha fatto l'accesso: link della pagina di presentazione, nessun premio)
 async function condividi(url,c){
  if(navigator.share){try{await navigator.share({title:"EdgeValor",text:TESTO,url});if(c)avviso(T("Link condiviso"));return;}catch(e){if(e&&e.name=="AbortError")return;}}
  try{await navigator.clipboard.writeText(TESTO+" "+url);avviso(c?T("Link personale copiato"):T("Link copiato: incollalo dove vuoi"));}
  catch(e){prompt(T("Copia il link:"),url);}}

 // ---- v9.60 (Ya, 27/11/2026) PANNELLO "INVITA AMICI" con tracciabilita'
 //   Chi ha fatto l'accesso apre un pannello: link personale (Copia / Condividi), tre numeri (iscritti con il link,
 //   abbonati, mesi guadagnati) e l'elenco degli amici SENZA nomi ne' email (solo "Amico N", stato e data).
 //   I dati arrivano da Supabase rpc/miei_inviti (solo i propri inviti). Le regole stanno nel fumetto (i).
 //   REGOLA DEL PREMIO (database, paypal_registra): +1 mese a chi invita quando l'amico fa il PRIMO pagamento;
 //   se quel pagamento viene rimborsato il mese si toglie. Una semplice iscrizione non basta (niente account finti).
 const STATI={abbonato:["Abbonato","ok"],prova:["In prova","pr"],iscritto:["Iscritto","is"]};
 const ICO_COPIA='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
 const ICO_COND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
 function numeri(box,d){
  const n=(k,t,x)=>`<div class="ivn${x?" "+x:""}"><b>${d?d[k]:"–"}</b><span>${T(t)}</span></div>`;
  box.querySelector(".ivnum").innerHTML=n("iscritti","Iscritti con il tuo link")+n("abbonati","Abbonati")+n("mesi","Mesi Premium guadagnati","oro");
  const el=d&&d.elenco||[];
  box.querySelector(".ivlista").innerHTML=!d?`<p class="ivvuoto">${T("carico…")}</p>`:el.length
   ?`<ul>${el.map(a=>{const s=STATI[a.stato]||STATI.iscritto;return `<li><span class="ivav">${a.n}</span><div><b>${T("Amico")} ${a.n}</b><small>${T("dal")} ${esc(a.dal)}</small></div><span class="ivst ${s[1]}">${T(s[0])}</span></li>`;}).join("")}</ul>`
   :`<p class="ivvuoto">${T("Ancora nessun amico iscritto con il tuo link.")}</p>`;}
 function pannello(c){if(document.querySelector(".ivmodal"))return;
  const url=LINK+"?invito="+encodeURIComponent(c);
  const box=document.createElement("div");box.className="cmodal ivmodal";
  box.innerHTML=`<div class="cmodal-box ivbox" role="dialog" aria-modal="true" aria-labelledby="ivt">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.6 3.4-5.5 6.5-5.5s5.5 1.9 6.5 5.5"/><path d="M19 8v6M16 11h6"/></svg></span>
    <div><h3 id="ivt">${T("Invita amici")} <button type="button" class="info" data-apri="ivinfo" aria-expanded="false" aria-label="${T("Come funziona")}">i</button></h3>
     <p>${T("Il tuo amico prova Premium per 14 giorni. Se si abbona, tu ricevi 1 mese di Premium.")}</p></div>
    <button type="button" class="fbx" aria-label="${T("Chiudi")}">&#x2715;</button></div>
   <p id="ivinfo" class="sub infotesto">${T("Chi si iscrive con il tuo link prova Premium per 14 giorni invece di 7. Il tuo mese si aggiunge da solo quando l'amico fa il primo pagamento, ed è segnato qui sotto. La sola iscrizione non basta; se il pagamento viene rimborsato, il mese si toglie. Non c'è un limite di amici. Degli amici vedi solo lo stato, mai nome o email.")}</p>
   <div class="ivlink"><input type="text" readonly value="${esc(url)}" aria-label="${T("Il tuo link personale")}">
    <button type="button" class="ivcopia">${ICO_COPIA}<span>${T("Copia")}</span></button>
    ${navigator.share?`<button type="button" class="ivcond" aria-label="${T("Condividi")}">${ICO_COND}<span>${T("Condividi")}</span></button>`:""}</div>
   <div class="ivnum"></div>
   <div class="ivel"><h4>${T("I tuoi amici")}</h4><div class="ivlista"></div></div></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});box.querySelector(".fbx").onclick=chiudi;
  const inp=box.querySelector(".ivlink input");inp.addEventListener("focus",()=>inp.select());
  const cp=box.querySelector(".ivcopia");
  cp.onclick=async()=>{try{await navigator.clipboard.writeText(url);}catch(e){inp.focus();inp.select();try{document.execCommand("copy");}catch(_){}}
   cp.classList.add("fatto");cp.querySelector("span").textContent=T("Copiato");clearTimeout(cp._t);
   cp._t=setTimeout(()=>{cp.classList.remove("fatto");cp.querySelector("span").textContent=T("Copia");},1800);};
  const cd=box.querySelector(".ivcond");if(cd)cd.onclick=()=>condividi(url,c);
  numeri(box,null);
  (async()=>{let d=null;try{d=await ebAccount.rpc("miei_inviti");}catch(e){console.warn("[EdgeValor] inviti",e);}
   numeri(box,d||{iscritti:0,abbonati:0,mesi:0,elenco:[]});})();}
 b.onclick=()=>{const c=mio();if(c)return pannello(c);condividi(LINK,"");};
 window.ebInvita={pannello:()=>pannello(mio()||"demo")};   // DEBUG/anteprima: ebInvita.pannello()
})();}catch(e){console.warn("invita",e);}
