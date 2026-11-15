/* ---------- LA MIA LISTA (watchlist) v7.71 ----------
   L'utente salva con la STELLINA le aziende (scheda Azionario) e i paesi emergenti (Dashboard) che vuole seguire.
   "La mia lista" nella barra laterale apre un pannello con le voci salvate e i numeri che il terminale calcola gia'
   (nessun dato nuovo da scaricare): un tocco su una voce porta al suo dettaglio.

   DOVE SI SALVA: nel browser (localStorage "ebLista" = {az:[ticker...], pa:[iso...]}). Funziona senza account;
   quando arrivera' il login la lista si spostera' sul profilo, cosi' segue l'utente su telefono e PC.

   COME SI USA DAGLI ALTRI FILE:
     ebLista.stella("az","AAPL")   -> HTML del pulsante stellina (22_azioni.js, 31_paesi.js lo mettono nelle righe)
     ebLista.ha("az","AAPL")       -> true/false
   Il clic sulle stelline e' gestito qui una volta sola per tutta la pagina (non serve collegarlo riga per riga).
   Questo file si carica presto (02c) perche' le tabelle disegnate dopo chiamano ebLista.stella(). */
try{(function(){
 const K="ebLista",MAX=60;                                      // tetto di sicurezza: 60 voci per tipo
 let L={az:[],pa:[]};
 try{const v=JSON.parse(localStorage.getItem(K)||"{}");L={az:Array.isArray(v.az)?v.az:[],pa:Array.isArray(v.pa)?v.pa:[]};}catch(e){}
 const salva=()=>{try{localStorage.setItem(K,JSON.stringify(L));}catch(e){}};
 const ha=(tp,id)=>(L[tp]||[]).includes(id);
 const SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>';
 const stella=(tp,id)=>{const on=ha(tp,id);
  return `<button type="button" class="stl${on?" on":""}" data-stl="${tp}:${esc(id)}" aria-pressed="${on}" title="${on?"Togli dalla mia lista":"Aggiungi alla mia lista"}" aria-label="${on?"Togli dalla mia lista":"Aggiungi alla mia lista"}">${SVG}</button>`;};
 function conta(){const n=L.az.length+L.pa.length,b=$("lnum");if(b){b.hidden=!n;b.textContent=n;}}
 function cambia(tp,id){const a=L[tp],i=a.indexOf(id);
  if(i>=0)a.splice(i,1);else{if(a.length>=MAX)return false;a.push(id);}
  salva();conta();
  // tutte le stelline della stessa voce (tabella, scheda, pannello) cambiano insieme
  document.querySelectorAll(".stl").forEach(b=>{if(b.dataset.stl!=tp+":"+id)return;const on=i<0;
   b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);b.title=on?"Togli dalla mia lista":"Aggiungi alla mia lista";b.setAttribute("aria-label",b.title);});
  try{window.ebStat&&ebStat.ev("lista",{azione:i<0?"aggiungi":"togli",tipo:tp});}catch(e){}
  if(!pan.hidden)disegna();
  return true;}
 // un solo ascolto per tutta la pagina, in "cattura": il clic sulla stellina non apre la riga che la contiene
 document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest(".stl");if(!b)return;
  ev.preventDefault();ev.stopPropagation();const [tp,...r]=b.dataset.stl.split(":");
  if(!cambia(tp,r.join(":")))avviso("La lista è piena: togli una voce per aggiungerne un'altra.");},true);
 document.addEventListener("keydown",ev=>{if((ev.key=="Enter"||ev.key==" ")&&ev.target.classList&&ev.target.classList.contains("stl"))ev.stopPropagation();},true);

 /* ----- pannello laterale (stessa grafica della Guida) ----- */
 const pan=document.createElement("aside");pan.id="lista";pan.className="guida";pan.hidden=true;
 pan.innerHTML=`<div class="gpannello"><div class="gtop"><div class="gtesta"><b>La mia lista</b><button id="lchiudi" class="tvbtn" title="Chiudi (Esc)">&#x2715;</button></div></div><div id="lcorpo" class="lcorpo"></div></div>`;
 document.body.appendChild(pan);
 const corpo=pan.querySelector("#lcorpo");
 let titoli=null,attesa=null;                                   // elenco delle aziende (azioni/indice.json), letto una volta
 function caricaTitoli(){if(titoli||attesa)return attesa||Promise.resolve();
  return attesa=fetch("../azioni/indice.json",{cache:"no-cache"}).then(r=>r.ok?r.json():Promise.reject(r.status))
   .then(d=>{titoli=d.titoli||[];}).catch(e=>{console.warn("[BoardEdge] lista: elenco aziende non letto",e);titoli=[];}).finally(()=>{attesa=null;});}
 const pct=v=>v==null?"n/d":(v>0?"+":"")+fx(v,1)+"%",cl=v=>v>0?"up":v<0?"down":"flat";
 const REG={calma:["Calma","up"],normale:["Normale","flat"],agitata:["Agitata","down"]};
 function avviso(t){const a=document.createElement("div");a.className="lavv";a.textContent=t;document.body.appendChild(a);setTimeout(()=>a.remove(),3200);}
 function rigaAz(tk){const t=(titoli||[]).find(x=>x.t==tk);
  if(!t)return `<div class="lrig" data-az="${esc(tk)}"><div class="ln"><b>${esc(tk)}</b><span>${titoli?"Non più in elenco":"Caricamento…"}</span></div>${stella("az",tk)}</div>`;
  const f=typeof forzaLiv=="function"?forzaLiv(t.pt):null,fc=f?({f:"up",d:"down",n:"flat"})[f[0]]:"flat";
  return `<div class="lrig clic" data-az="${esc(tk)}" tabindex="0" role="button"><div class="ln"><b>${esc(t.n)}</b><span>${esc(tk)}</span></div>
   <div class="lv"><small>Forza</small><b class="${fc}">${t.pt==null?"n/d":t.pt}</b></div>
   <div class="lv"><small>12 mesi</small><b class="${cl(t.v1a)}">${pct(t.v1a)}</b></div>
   <div class="lv lv3"><small>Trend</small><b class="${t.tr>0?"up":t.tr<0?"down":"flat"}">${t.tr>0?"&#9650; Rialzo":t.tr<0?"&#9660; Ribasso":"Laterale"}</b></div>${stella("az",tk)}</div>`;}
 function rigaPa(iso){const r=((D.paesi||{}).paesi||[]).find(x=>x.iso==iso);
  if(!r)return `<div class="lrig" data-pa="${esc(iso)}"><div class="ln"><b>${esc(iso)}</b><span>Non più in elenco</span></div>${stella("pa",iso)}</div>`;
  const b=r.b||{},g=REG[b.reg];
  return `<div class="lrig clic" data-pa="${esc(iso)}" tabindex="0" role="button"><div class="ln"><b>${esc(r.nome)}</b><span>${esc(r.area||"")}</span></div>
   <div class="lv"><small>PIL ${D.paesi.anno||""}</small><b class="${cl(r.pil)}">${pct(r.pil)}</b></div>
   <div class="lv"><small>12 mesi</small><b class="${cl(b.a1)}">${pct(b.a1)}</b></div>
   <div class="lv lv3"><small>Regime</small><b class="${g?g[1]:"flat"}">${g?g[0]:"n/d"}</b></div>${stella("pa",iso)}</div>`;}
 function disegna(){
  if(!L.az.length&&!L.pa.length){corpo.innerHTML=`<div class="lvuota">${SVG}<b>La lista è vuota</b><span>Tocca la stellina accanto a un'azienda o a un paese emergente per seguirlo da qui.</span>
    <div><button class="tvbtn" data-vai="azioni">Vai all'Azionario</button><button class="tvbtn" data-vai="paesi">Vai ai Paesi emergenti</button></div></div>`;return;}
  corpo.innerHTML=(L.az.length?`<h3 class="lt">Aziende <small>${L.az.length}</small></h3><div class="lgr">${L.az.map(rigaAz).join("")}</div>`:"")
   +(L.pa.length?`<h3 class="lt">Paesi emergenti <small>${L.pa.length}</small></h3><div class="lgr">${L.pa.map(rigaPa).join("")}</div>`:"")
   +`<p class="lnota">Salvata in questo browser. Con l'accesso via email ti seguirà su ogni dispositivo.</p>`;}
 function vaiPaese(iso){try{go("sig");}catch(e){}
  setTimeout(()=>{let r=document.querySelector(`.per[data-iso="${iso}"]`);
   if(!r){const t=document.querySelector('#pefiltri button[data-f="Tutti"]');if(t)t.click();const p=$("pepiu");if(p&&/Mostra tutti/.test(p.textContent))p.click();r=document.querySelector(`.per[data-iso="${iso}"]`);}
   const dove=r||$("peblocco");if(!dove)return;dove.scrollIntoView({behavior:"smooth",block:"center"});
   if(r){r.classList.add("levid");setTimeout(()=>r.classList.remove("levid"),2200);}},120);}
 corpo.addEventListener("click",ev=>{const v=ev.target.closest("[data-vai]");
  if(v){chiudi();if(v.dataset.vai=="paesi")vaiPaese("");else{try{go("azioni");}catch(e){}}return;}
  const r=ev.target.closest(".lrig.clic");if(!r)return;chiudi();
  if(r.dataset.az){if(window.ebApriTitolo)ebApriTitolo(r.dataset.az);}else vaiPaese(r.dataset.pa);});
 corpo.addEventListener("keydown",ev=>{if(ev.key=="Enter"&&ev.target.classList.contains("lrig"))ev.target.click();});
 function apri(){const h=document.documentElement;h.classList.remove("sideon");const o=$("sombra");if(o)o.hidden=true;   // telefono: chiude il menu
  pan.hidden=false;h.classList.add("guidaon");setTimeout(()=>pan.classList.add("on"),10);disegna();
  if(L.az.length&&!titoli)caricaTitoli().then(()=>{if(!pan.hidden)disegna();});
  try{window.ebStat&&ebStat.ev("lista",{azione:"apri"});}catch(e){}}
 function chiudi(){pan.classList.remove("on");document.documentElement.classList.remove("guidaon");setTimeout(()=>pan.hidden=true,250);}
 pan.querySelector("#lchiudi").onclick=chiudi;
 pan.addEventListener("click",ev=>{if(ev.target===pan)chiudi();});
 document.addEventListener("keydown",ev=>{if(ev.key=="Escape"&&!pan.hidden)chiudi();});
 const b=$("lapri");if(b)b.onclick=apri;
 conta();
 window.ebLista={ha,stella,cambia,apri};
})();}catch(e){console.error("[BoardEdge] la mia lista:",e);window.ebLista=window.ebLista||{ha:()=>false,stella:()=>"",cambia:()=>false,apri:()=>{}};}
