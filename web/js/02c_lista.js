/* ---------- LA MIA LISTA (watchlist) v7.71 ----------
   L'utente salva con la STELLINA le aziende (scheda Azionario) e i paesi emergenti (Dashboard) che vuole seguire.
   "La mia lista" nella barra laterale apre un pannello con le voci salvate e i numeri che il terminale calcola gia'
   (nessun dato nuovo da scaricare): un tocco su una voce porta al suo dettaglio.

   v7.72 RICERCA UNIVERSALE in cima al pannello: si scrive un nome e si aggiunge alla lista direttamente da li'.
   Cerca in tutto il terminale: aziende, paesi emergenti, coppie forex e mercati (crypto, indici, materie prime...).

   DOVE SI SALVA: nel browser (localStorage "ebLista" = {az:[ticker], pa:[iso], fx:[coppia], me:[mercato]}). Funziona senza account;
   quando arrivera' il login la lista si spostera' sul profilo, cosi' segue l'utente su telefono e PC.

   COME SI USA DAGLI ALTRI FILE:
     ebLista.stella("az","AAPL")   -> HTML del pulsante stellina (22_azioni.js, 31_paesi.js lo mettono nelle righe)
     ebLista.ha("az","AAPL")       -> true/false
   Il clic sulle stelline e' gestito qui una volta sola per tutta la pagina (non serve collegarlo riga per riga).
   Questo file si carica presto (02c) perche' le tabelle disegnate dopo chiamano ebLista.stella(). */
try{(function(){
 const K="ebLista",MAX=60;                                      // tetto di sicurezza: 60 voci per tipo
 const TIPI=["az","pa","fx","me"];                             // aziende, paesi emergenti, forex, mercati
 let L={az:[],pa:[],fx:[],me:[]};
 try{const v=JSON.parse(localStorage.getItem(K)||"{}");TIPI.forEach(t=>{if(Array.isArray(v[t]))L[t]=v[t];});}catch(e){}
 const salva=()=>{try{localStorage.setItem(K,JSON.stringify(L));}catch(e){}};
 const ha=(tp,id)=>(L[tp]||[]).includes(id);
 const SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>';
 const stella=(tp,id)=>{const on=ha(tp,id);
  return `<button type="button" class="stl${on?" on":""}" data-stl="${tp}:${esc(id)}" aria-pressed="${on}" title="${on?"Togli dalla mia lista":"Aggiungi alla mia lista"}" aria-label="${on?"Togli dalla mia lista":"Aggiungi alla mia lista"}">${SVG}</button>`;};
 function conta(){const n=TIPI.reduce((s,t)=>s+L[t].length,0),b=$("lnum");if(b){b.hidden=!n;b.textContent=n;}}
 function cambia(tp,id){const a=L[tp],i=a.indexOf(id);
  if(i>=0)a.splice(i,1);else{if(a.length>=MAX)return false;a.push(id);}
  salva();conta();
  // tutte le stelline della stessa voce (tabella, scheda, pannello) cambiano insieme
  document.querySelectorAll(".stl").forEach(b=>{if(b.dataset.stl!=tp+":"+id)return;const on=i<0;
   b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);b.title=on?"Togli dalla mia lista":"Aggiungi alla mia lista";b.setAttribute("aria-label",b.title);});
  try{window.ebStat&&ebStat.ev("lista",{azione:i<0?"aggiungi":"togli",tipo:tp});}catch(e){}
  if(!pan.hidden){disegna();if(cerca.value.trim())risultati();}
  return true;}
 // un solo ascolto per tutta la pagina, in "cattura": il clic sulla stellina non apre la riga che la contiene
 document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest(".stl");if(!b)return;
  ev.preventDefault();ev.stopPropagation();const [tp,...r]=b.dataset.stl.split(":");
  if(!cambia(tp,r.join(":")))avviso("La lista è piena: togli una voce per aggiungerne un'altra.");},true);
 document.addEventListener("keydown",ev=>{if((ev.key=="Enter"||ev.key==" ")&&ev.target.classList&&ev.target.classList.contains("stl"))ev.stopPropagation();},true);

 /* ----- pannello laterale (stessa grafica della Guida) ----- */
 const pan=document.createElement("aside");pan.id="lista";pan.className="guida";pan.hidden=true;
 pan.innerHTML=`<div class="gpannello"><div class="gtop"><div class="gtesta"><b>La mia lista</b><button id="lchiudi" class="tvbtn" title="Chiudi (Esc)">&#x2715;</button></div>
   <label class="lcerca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="lq" type="search" placeholder="Cerca azienda, paese, valuta, crypto…" aria-label="Cerca e aggiungi alla lista" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>
  <div id="lris" class="lris" hidden></div><div id="lcorpo" class="lcorpo"></div></div>`;
 document.body.appendChild(pan);
 const corpo=pan.querySelector("#lcorpo"),cerca=pan.querySelector("#lq"),ris=pan.querySelector("#lris");
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
 const SEG={"STRONG BUY":"up","BUY":"up","SELL":"down","STRONG SELL":"down"},cop=p=>p.slice(0,3)+"/"+p.slice(3);
 const pt=v=>v==null?"n/d":(v>0?"+":"")+fx(v,0);
 function rigaFx(c){const p=(D.pairs||[]).find(x=>x.pair==c);
  if(!p)return `<div class="lrig" data-fx="${esc(c)}"><div class="ln"><b>${esc(cop(c))}</b><span>Non più in elenco</span></div>${stella("fx",c)}</div>`;
  return `<div class="lrig clic" data-fx="${esc(c)}" tabindex="0" role="button"><div class="ln"><b>${esc(cop(c))}</b><span>Forex</span></div>
   <div class="lv"><small>Punti</small><b class="${cl(p.score)}">${pt(p.score)}</b></div>
   <div class="lv"><small>Carry</small><b class="${cl(p.carry)}">${p.carry==null?"n/d":pct(p.carry)}</b></div>
   <div class="lv lv3"><small>Segnale</small><b class="${SEG[p.label]||"flat"}">${esc(p.label||"n/d")}</b></div>${stella("fx",c)}</div>`;}
 function rigaMe(k){const a=(D.assets||{})[k];
  if(!a)return `<div class="lrig" data-me="${esc(k)}"><div class="ln"><b>${esc(k)}</b><span>Non più in elenco</span></div>${stella("me",k)}</div>`;
  return `<div class="lrig clic" data-me="${esc(k)}" tabindex="0" role="button"><div class="ln"><b>${esc(a.it||a.name||k)}</b><span>${esc(a.group||"")}</span></div>
   <div class="lv"><small>Punti</small><b class="${cl(a.score)}">${pt(a.score)}</b></div>
   <div class="lv"><small>COT</small><b class="${cl(a.cot)}">${pt(a.cot)}</b></div>
   <div class="lv lv3"><small>Segnale</small><b class="${SEG[a.label]||"flat"}">${esc(a.label||"n/d")}</b></div>${stella("me",k)}</div>`;}

 /* ----- ricerca universale: [tipo, id, nome, dettaglio, testo in cui cercare] ----- */
 const ETI={az:"Azienda",pa:"Paese",fx:"Forex",me:"Mercato"};
 function universo(){const u=[];
  ((D.paesi||{}).paesi||[]).forEach(r=>u.push(["pa",r.iso,r.nome,r.area||"Paese emergente",(r.nome+" "+r.iso+" "+(r.etf||"")).toLowerCase()]));
  (D.pairs||[]).forEach(p=>u.push(["fx",p.pair,cop(p.pair),"Forex",(p.pair+" "+cop(p.pair)+" forex").toLowerCase()]));
  Object.entries(D.assets||{}).forEach(([k,a])=>u.push(["me",k,a.it||a.name||k,a.group||"Mercato",(k+" "+(a.it||"")+" "+(a.name||"")+" "+(a.group||"")).toLowerCase()]));
  (titoli||[]).forEach(t=>u.push(["az",t.t,t.n,t.t,(t.n+" "+t.t).toLowerCase()]));
  return u;}
 let U=null;
 function risultati(){const q=cerca.value.trim().toLowerCase();
  if(q.length<2){ris.hidden=true;ris.innerHTML="";corpo.hidden=false;return;}
  if(!U||(!U.az&&titoli)){U=universo();U.az=!!titoli;}
  const par=q.split(/\s+/);
  // prima chi INIZIA con il testo cercato, poi chi lo contiene; al massimo 12 risultati
  const tro=U.filter(x=>par.every(w=>x[4].includes(w))).sort((a,b)=>(a[2].toLowerCase().startsWith(q)?0:1)-(b[2].toLowerCase().startsWith(q)?0:1)||a[2].length-b[2].length).slice(0,12);
  corpo.hidden=true;ris.hidden=false;
  ris.innerHTML=tro.length?tro.map(x=>`<div class="lres${ha(x[0],x[1])?" on":""}" data-add="${x[0]}:${esc(x[1])}" tabindex="0" role="button"><em class="le le-${x[0]}">${ETI[x[0]]}</em><div class="ln"><b>${esc(x[2])}</b><span>${esc(x[3])}</span></div>${stella(x[0],x[1])}</div>`).join("")
    +`<p class="lnota">Tocca una riga per aggiungerla o toglierla dalla lista.</p>`
   :`<div class="lvuota"><b>Nessun risultato</b><span>${titoli?"Prova con il nome o con la sigla.":"Sto caricando l'elenco delle aziende…"}</span></div>`;}
 cerca.addEventListener("input",risultati);
 cerca.addEventListener("focus",()=>{if(!titoli)caricaTitoli().then(()=>{U=null;if(cerca.value.trim())risultati();});});
 ris.addEventListener("click",ev=>{const r=ev.target.closest(".lres");if(!r||ev.target.closest(".stl"))return;
  const [tp,...id]=r.dataset.add.split(":");if(!cambia(tp,id.join(":")))avviso("La lista è piena: togli una voce per aggiungerne un'altra.");});
 ris.addEventListener("keydown",ev=>{if(ev.key=="Enter"&&ev.target.classList.contains("lres"))ev.target.click();});

 function disegna(){
  if(!TIPI.some(t=>L[t].length)){corpo.innerHTML=`<div class="lvuota">${SVG}<b>La lista è vuota</b><span>Cerca qui sopra un'azienda, un paese, una valuta o una crypto e aggiungila con un tocco. Oppure usa la stellina nelle tabelle.</span></div>`;return;}
  corpo.innerHTML=(L.az.length?`<h3 class="lt">Aziende <small>${L.az.length}</small></h3><div class="lgr">${L.az.map(rigaAz).join("")}</div>`:"")
   +(L.pa.length?`<h3 class="lt">Paesi emergenti <small>${L.pa.length}</small></h3><div class="lgr">${L.pa.map(rigaPa).join("")}</div>`:"")
   +(L.fx.length?`<h3 class="lt">Forex <small>${L.fx.length}</small></h3><div class="lgr">${L.fx.map(rigaFx).join("")}</div>`:"")
   +(L.me.length?`<h3 class="lt">Mercati <small>${L.me.length}</small></h3><div class="lgr">${L.me.map(rigaMe).join("")}</div>`:"")
   +`<p class="lnota">Salvata in questo browser. Con l'accesso via email ti seguirà su ogni dispositivo.</p>`;}
 function vaiPaese(iso){try{go("sig");}catch(e){}
  setTimeout(()=>{let r=document.querySelector(`.per[data-iso="${iso}"]`);
   if(!r){const t=document.querySelector('#pefiltri button[data-f="Tutti"]');if(t)t.click();const p=$("pepiu");if(p&&/Mostra tutti/.test(p.textContent))p.click();r=document.querySelector(`.per[data-iso="${iso}"]`);}
   const dove=r||$("peblocco");if(!dove)return;dove.scrollIntoView({behavior:"smooth",block:"center"});
   if(r){r.classList.add("levid");setTimeout(()=>r.classList.remove("levid"),2200);}},120);}
 // forex e mercati: si va alla scheda e si apre il grafico della riga, se in quel momento e' visibile in tabella
 function vaiRiga(scheda,tv){try{go(scheda);}catch(e){}
  setTimeout(()=>{const r=[...document.querySelectorAll(`[data-tv="${tv}"]`)].find(x=>x.offsetParent);if(r){r.scrollIntoView({block:"center"});r.click();}},150);}
 corpo.addEventListener("click",ev=>{const r=ev.target.closest(".lrig.clic");if(!r)return;chiudi();
  if(r.dataset.az){if(window.ebApriTitolo)ebApriTitolo(r.dataset.az);}
  else if(r.dataset.pa)vaiPaese(r.dataset.pa);
  else if(r.dataset.fx)vaiRiga("pairs","p:"+r.dataset.fx);
  else vaiRiga("assets","a:"+r.dataset.me);});
 corpo.addEventListener("keydown",ev=>{if(ev.key=="Enter"&&ev.target.classList.contains("lrig"))ev.target.click();});
 function apri(){const h=document.documentElement;h.classList.remove("sideon");const o=$("sombra");if(o)o.hidden=true;   // telefono: chiude il menu
  pan.hidden=false;h.classList.add("guidaon");setTimeout(()=>pan.classList.add("on"),10);cerca.value="";risultati();disegna();
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
