
/* ---------- VETRINA DELLA DASHBOARD: le azioni piu' forti di oggi (carosello) ----------
   Dati da ../azioni/top.json (cot_radar/azioni.py -> vetrina(), ricalcolati ogni sera, ~3 KB):
   al massimo 5 titoli, uno per settore, con punteggio alto E tutte le condizioni favorevoli
   (sopra la media a 200 giorni, 3 e 12 mesi positivi, mese in corso positivo in almeno il 60% degli anni,
   vicino ai massimi dell'anno). Solo lato acquisto.
   - cambia da sola ogni 6 secondi (barra di avanzamento); si ferma con il mouse sopra o con il focus;
   - frecce, pallini, tastiera (frecce sinistra/destra) e scorrimento col dito sul telefono;
   - "Apri grafico" porta alla scheda Azionario con il dettaglio del titolo (window.ebApriTitolo);
   - con "riduci movimento" attivo nel sistema non scorre da sola.
   v7.22d: tolto il riquadro "In sconto" (v6.66): lo stesso dato e' nell'Azionario, ordinando per la colonna "Dal massimo".
   DEBUG: F12 -> Console -> window.__top */
try{(function(){const el=$("topaz");if(!el)return;
 const DUR=6000,SIMB={USD:"$",EUR:"€",GBP:"£",CHF:"CHF ",JPY:"¥",HKD:"HK$",CNY:"CN¥",INR:"₹",CAD:"C$",AUD:"A$"};
 const MESI=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
 const pc=(v,d=1)=>v==null?"n/d":(v>0?"+":"")+fx(v,d)+"%";
 const prezzo=(v,val)=>v==null?"n/d":(SIMB[val]||"")+Number(v).toLocaleString(EB_LOC,{minimumFractionDigits:2,maximumFractionDigits:2});
 const gg=d=>d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";
 const fermo=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 // scheletro mentre arriva il file
 el.innerHTML=`<div class="card tz tzsk"><i class="sk" style="width:180px;height:14px"></i><i class="sk" style="width:55%;height:28px;margin-top:12px"></i><i class="sk" style="width:100%;height:120px;margin-top:16px;border-radius:14px"></i></div>`;
 fetch("../azioni/top.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(premJ).then(d=>{window.__top=d;disegna(d);
   // v7.46 "Dati al" dell'Azionario spostato nella sidebar (Stato dati): verde se aggiornato, rosso se c'e' un'anomalia
   // o se l'ultima seduta ha piu' di 4 giorni (copre weekend + un festivo)
   {const eta=d.aggiornato?(Date.now()-new Date(d.aggiornato+"T22:00:00Z").getTime())/864e5:99;
    window.ebRigaStato&&ebRigaStato("srow-az","Azionario",d.aggiornato?"Dati al "+gg(d.aggiornato):"n/d",(d.anomalia||eta>4)?"late":"ok","ogni sera dopo la chiusura USA");}
   if(d.anomalia)ebManutenzione({scheda:"sig",codice:d.anomalia.codice,quando:d.anomalia.quando,dal:d.aggiornato});})
  .catch(e=>{console.error("[EdgeValor] vetrina azioni non caricata:",e);el.innerHTML="";});

 function spark(sp){if(!sp||sp.length<2)return "";const W=220,H=60;
  const p=sp.map((v,i)=>`${(i/(sp.length-1)*W).toFixed(1)},${(H-3-v/99*(H-6)).toFixed(1)}`).join(" ");
  return `<svg class="tzsp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="tzg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".3"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${p} ${W},${H}" fill="url(#tzg)"/><polyline points="${p}"/></svg>`;}
 function anello(v){const r=30,c=2*Math.PI*r,l=forzaLiv(v)||["n","Forza"];return `<div class="tzring fz${l[0]}" title="Forza ${v} su 100: ${l[1]}"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="${r}" class="f"/><circle cx="38" cy="38" r="${r}" class="a" stroke-dasharray="${(c*v/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/></svg><b>${v}</b><small>${l[1]}</small></div>`;}

 // v7.22d il riquadro "In sconto" non e' piu' in Dashboard: i titoli scontati si trovano nell'Azionario (ordinando per
 //     Smart Discount). I dati "sconto" restano in top.json.
 // "Apri grafico" della vetrina: scheda Azionario con il dettaglio del titolo
 function apriSc(){el.querySelectorAll(".tzapri[data-t]").forEach(b=>b.onclick=()=>{try{window.ebStat&&ebStat.ev("vetrina",{ticker:b.dataset.t});}catch(e){}window.ebApriTitolo&&ebApriTitolo(b.dataset.t);});}
 // v7.9 AMPIEZZA DEL MERCATO: dalla v7.21 non e' piu' mostrata (sostituita dalle ciambelle dei settori nel Quadro economico)
 function ampiezzaHTML(d){const a=d.ampiezza;if(!a||!a.tot||!a.tot.n)return "";
  const q=x=>x.n?Math.round(x.su/x.n*100):0,tot=q(a.tot),[parola,cls]=tot>=60?["Forte","up"]:tot>=40?["Misto","tzamp-m"]:["Debole","down"];
  const barra=x=>`<span class="tzamp-bar"><i class="su" style="width:${x.su/x.n*100}%"></i><i class="lat" style="width:${x.lat/x.n*100}%"></i><i class="giu" style="width:${x.giu/x.n*100}%"></i></span>`;
  return `<div class="card tzamp"><div class="tzamp-t"><h3>Mercato azionario</h3><details class="info"><summary title="Come si calcola" aria-label="Come si calcola">i</summary><div>Quota dei titoli dell'Azionario (${a.tot.n.toLocaleString(EB_LOC)}) in <b>trend rialzista</b> (prezzo e SMA 50 sopra la SMA 200): verde rialzista, grigio laterale, rosso ribassista.<br><br><b>Come leggerla</b>: dice quanto &egrave; <b>largo</b> il rialzo. <b>Sopra il 60%</b> sale gran parte del mercato: il trend &egrave; diffuso. <b>Tra 40 e 60%</b> il mercato &egrave; selettivo: salgono alcuni settori e altri no, conta scegliere i titoli e i settori pi&ugrave; forti. <b>Sotto il 40%</b> pochi titoli tengono in piedi l'indice: un indice in salita con poca ampiezza &egrave; un rialzo fragile, da guardare con pi&ugrave; prudenza.<br><br><b>Aree</b>: confrontale per vedere dove il trend &egrave; pi&ugrave; forte (USA, Europa, Asia). &Egrave; un'indicazione di contesto, non un segnale di acquisto o vendita.</div></details></div>
   <div class="tzamp-big"><b class="${cls}">${tot}%</b><span>in trend rialzista &middot; <b class="${cls}">${parola}</b></span></div>${barra(a.tot)}
   <div class="tzamp-aree">${(a.aree||[]).filter(x=>x.n).map(x=>`<div><span>${esc(x.nome)}</span>${barra(x)}<b>${q(x)}%</b></div>`).join("")}</div></div>`;}
 function disegna(d){
  // v7.93 Basic: la Selezione di oggi (nomi delle azioni con l'edge) e' Premium
  // v8.65 (Ya, 22/11/2026): il Basic vede le prime 2 aziende (premium.py manda solo quelle); le altre restano Premium.
  //   Per il Basic niente collegamenti alle schede complete delle aziende (chiuse): i pulsanti aprono l'offerta Premium.
  // v9.80 (Ya, 28/11/2026: "passo all'inglese e la Selezione di oggi resta in italiano") testi in due lingue.
  //   Qui T e' l'elenco dei titoli (non la funzione di traduzione), quindi si sceglie con EN.
  const BASIC=!EB_PREMIUM,T=d.titoli||[],EN=typeof EB_LANG!="undefined"&&EB_LANG=="en",L=(it,en)=>EN?en:it;
  const MESI_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];
  if(BASIC&&!T.length){el.innerHTML=ebBlocco(L("Le azioni di oggi","Today's stocks"),L("Le aziende che superano tutti i filtri di trend, forza e stagionalità, ricalcolate ogni sera.","Companies that pass every trend, strength and seasonality filter, recalculated every evening."),{velo:true,righe:5});return;}const mese=(EN?MESI_EN:MESI)[(d.mese||oggiRoma().m+1)-1];
  if(!T.length){el.innerHTML=`<div class="card tz"><div class="tztesta"><div><span class="tzchip">${L("Selezione di oggi","Today's selection")}</span><h3>${L("Le azioni pi&ugrave; forti","The strongest stocks")}</h3></div></div><p class="small" style="margin:8px 0 0">${L("Oggi nessun titolo supera tutti i filtri: la selezione torna appena trend, forza e stagionalit&agrave; si allineano.","Today no stock passes every filter: the selection returns as soon as trend, strength and seasonality line up.")}</p></div>`;apriSc();return;}
  const slide=(t,i)=>`<article class="tzs${i?"":" on"}" data-i="${i}" aria-roledescription="slide" aria-label="${i+1} ${L("di","of")} ${T.length}">
   <div class="tzinfo"><span class="tzpos">#${i+1} ${L("di","of")} ${T.length} &middot; ${esc((d.settori||{})[t.s]||t.s)}</span>
    <h4>${esc(t.n)}</h4><span class="small">${esc(t.t)} &middot; ${t.l.map(x=>esc((d.listini||{})[x]||x)).join(", ")}</span>
    <div class="tzprz"><b>${prezzo(t.p,t.val)}</b><span class="${(t.v1g||0)>=0?"up":"down"}">${pc(t.v1g,2)}</span></div></div>
   <ul class="tzperche">
    <li><i class="ok"></i><span>${L("Ultimi 12 mesi","Last 12 months")} <b class="up">${pc(t.v1a)}</b>, ${L("ultimi 3 mesi","last 3 months")} <b class="up">${pc(t.v3m)}</b></span></li>
    <li><i class="ok"></i><span>${L("Sopra la media a 200 giorni del","Above the 200-day average by")} <b>${fx(t.t200,1)}%</b>${t.dmax!=null?` &middot; ${t.dmax>-0.5?L("sui massimi dell'anno","at the year's high"):L("a "+fx(-t.dmax,1)+"% dal massimo dell'anno",fx(-t.dmax,1)+"% from the year's high")}`:""}</span></li>
    <li><i class="ok"></i><span>${mese[0].toUpperCase()+mese.slice(1)} ${L("positivo nel","positive in")} <b>${t.st_pos}%</b> ${L("degli anni","of years")} (${t.st_n} ${L("anni, media","years, average")} <b>${pc(t.st_media)}</b>)</span></li></ul>
   <div class="tzdx">${anello(t.pt)}<div class="tzgraf">${spark(t.sp)}<span class="small">${L("ultimo anno","last year")}</span></div>
    ${BASIC?`<button class="tzapri tzprem" data-premium>${L("Scheda completa con Premium","Full page with Premium")} <span aria-hidden="true">&rarr;</span></button>`
     :`<button class="tzapri" data-t="${esc(t.t)}">${L("Apri grafico e stagionalit&agrave;","Open chart and seasonality")} <span aria-hidden="true">&rarr;</span></button>`}</div></article>`;
  el.innerHTML=`<div class="card tz" tabindex="0" aria-roledescription="carosello" aria-label="${L("Le azioni pi&ugrave; forti di oggi","Today's strongest stocks")}">
   <div class="tztesta"><div><span class="tzchip"><i></i>${L("Selezione di oggi","Today's selection")}</span><h3>${L(`Le ${T.length} azioni pi&ugrave; forti`,`The ${T.length} strongest stocks`)} <details class="info tzinf"><summary title="${L("Da dove vengono","Where they come from")}" aria-label="${L("Da dove vengono","Where they come from")}">i</summary><div>${L("Solo titoli che si comprano davvero in euro su Scalable: <b>Wall Street ed Europa continentale</b>. Londra (imposta di bollo dello 0,5% in acquisto), Toronto, Sydney e Asia restano nell'Azionario per l'analisi ma non entrano qui n&eacute; nei portafogli. Le seconde quotazioni della stessa societ&agrave; (es. ASML ad Amsterdam e al Nasdaq) contano una volta sola.","Only stocks you can actually buy in euro on Scalable: <b>Wall Street and continental Europe</b>. London (0.5% stamp duty on purchases), Toronto, Sydney and Asia stay in Stocks for analysis but do not enter here or the portfolios. Second listings of the same company (e.g. ASML in Amsterdam and on the Nasdaq) count once.")}</div></details></h3>
    <span class="small">${L("Una per settore, solo lato acquisto &middot; dati al","One per sector, buy side only &middot; data as of")} ${gg(d.aggiornato)}</span></div>
    <div class="tzcom"><button class="tzfr" data-v="-1" aria-label="${L("Precedente","Previous")}">&lsaquo;</button><div class="tzdots">${T.map((t,i)=>`<button class="${i?"":"on"}" data-i="${i}" aria-label="${esc(t.n)}"><i></i></button>`).join("")}</div><button class="tzfr" data-v="1" aria-label="${L("Successiva","Next")}">&rsaquo;</button>
     ${BASIC?`<button class="tzvedi" data-premium>${L("Tutte con Premium","All with Premium")}</button>`:`<button class="tzvedi">${L("Classifica completa","Full ranking")}</button>`}</div></div>
   <div class="tzbox">${T.map(slide).join("")}</div></div>`;
  const box=el.querySelector(".tz"),sl=[...el.querySelectorAll(".tzs")],dots=[...el.querySelectorAll(".tzdots button")];
  let cur=0,tm=null,inizio=0,pausa=false;
  function vai(i){cur=(i+T.length)%T.length;sl.forEach((s,k)=>s.classList.toggle("on",k==cur));dots.forEach((b,k)=>{b.classList.toggle("on",k==cur);b.querySelector("i").style.animation="none";void b.offsetWidth;b.querySelector("i").style.animation="";});avvia();}
  function avvia(){clearTimeout(tm);if(fermo||pausa||T.length<2)return;inizio=Date.now();tm=setTimeout(()=>vai(cur+1),DUR);}
  box.style.setProperty("--tzdur",DUR+"ms");box.classList.toggle("fermo",fermo);
  box.addEventListener("mouseenter",()=>{pausa=true;box.classList.add("pausa");clearTimeout(tm);});
  box.addEventListener("mouseleave",()=>{pausa=false;box.classList.remove("pausa");vai(cur);});
  box.addEventListener("keydown",e=>{if(e.key=="ArrowRight")vai(cur+1);if(e.key=="ArrowLeft")vai(cur-1);});
  let x0=null;box.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
  box.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)vai(cur+(dx<0?1:-1));x0=null;});
  el.querySelectorAll(".tzfr").forEach(b=>b.onclick=()=>vai(cur+ +b.dataset.v));
  dots.forEach(b=>b.onclick=()=>vai(+b.dataset.i));
  apriSc();
  if(!BASIC)el.querySelector(".tzvedi").onclick=()=>{try{go("azioni");}catch(e){}};
  // la vetrina scorre solo quando e' visibile (Dashboard aperta e pagina in primo piano)
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(tm);else avvia();});
  avvia();}
})();}catch(e){fail('Vetrina azioni','topaz',e);}
