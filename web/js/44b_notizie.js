/* ---------- 44b_notizie.js - v8.87 SCHEDA "NOTIZIE" (Mercati > Notizie, Premium; il Basic vede il lucchetto) ----------
   Richiesta di Ya (23/11/2026): studiare come reagiscono i mercati alle notizie macro ad alto impatto (NFP, CPI, Fed,
   vendite, PPI, PCE, PIL, JOLTS e banche centrali): un registro del passato che si allunga ogni giorno, e una "formula"
   per ogni esito: quando la notizia rende forte o debole la sua valuta, come si muove ogni mercato (cambi, oro, indici,
   ETF, BTC...). Ogni notizia lascia una traccia sul grafico orario.
   CINQUE PEZZI (strumento dal menu, driver dai bottoni):
     1. grafico orario/giornaliero (motore di 13c_candele.js in modalita' "notizie": linea gialla all'ora esatta,
        barretta verde/rossa = mossa della prima ora, etichetta con la mossa);
     2. "Dopo l'esito": per lo strumento, con valuta forte e con valuta debole, mossa mediana della prima ora,
        quante volte e' salito e mossa a 24 ore;
     3. "Su tutti gli strumenti": per il driver scelto, la stessa formula su tutti i mercati (o la grandezza della mossa),
        con i filtri per famiglia;
     4. "Come reagisce": grandezza della mossa e se prosegue, contro un'ora qualsiasi (il caso);
     5. "Registro": tutte le notizie, dalla piu' recente, con l'esito (tocco = il grafico va a quella notizia).
   ESITO (cot_radar/impatto.py): letto dal prezzo, non dal dato atteso: forza della valuta della notizia nella prima ora,
   media su tutte le coppie di valute che la contengono; forte/debole se almeno 1,5 volte un'ora normale.
   DATI (ramo "orari", scritti ogni notte da impatto.py): pubblico/impatto/indice.json e <SIMBOLO>.json
     ev = [[ora UTC, driver, r1, r4, r24, x, dopo, esito]], st = [{n, casi, r1, x, forte, seg, segG, nG, dal}],
     es = {driver: {"+": [n, r1, %su, r24, %su24], "-": [...]}}, ctrl = {forte, seg, segG}
     indice: val = {driver: valuta}, sim = [{s, n, c, m: {driver: [casi, x, r1, es+, es-]}}]
   Niente previsioni e niente consigli: e' il registro di quello che e' successo.
   DEBUG: ebNotizieMacro.stato (strumento, driver, vista, dati letti) */
(function(){try{
 const el=$("notizie"),bt=document.querySelector('#nav button[data-t="notizie"]');if(!el)return;
 const BASE=EB_RAW+"orari/pubblico/impatto/",H1_DAL="2026-08-01";
 const cache={},leggi=u=>cache[u]||(cache[u]=fetch(u).then(r=>r.ok?r.json():null).catch(()=>null));
 const S={s:"EURUSD.FOREX",d:"",n:10,v:"+",f:"",tutti:false,I:null,X:null};
 const pc=v=>v==null?"n/d":(v>0?"+":v<0?"−":"")+fx(Math.abs(v),2)+"%";
 const cl=v=>v>0?"up":v<0?"down":"";
 const GG=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",day:"2-digit",month:"2-digit",year:"2-digit"});
 const HH=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit"});
 const GRUPPI=[["Cambi",s=>s.endsWith(".FOREX")&&!/^X(AU|AG)/.test(s)],["Metalli",s=>/^X(AU|AG)/.test(s)],["Indici",s=>s.endsWith(".INDX")],
  ["ETF USA",s=>s.endsWith(".US")],["Crypto",s=>s.endsWith(".CC")]];
 const etichetta=s=>{const b=s.split(".")[0];return s.endsWith(".FOREX")&&b.length==6?b.slice(0,3)+"/"+b.slice(3):b.replace("-USD","");};
 const VNOME={USD:"dollaro",EUR:"euro",GBP:"sterlina",JPY:"yen",CHF:"franco svizzero",CAD:"dollaro canadese",AUD:"dollaro australiano",NZD:"dollaro neozelandese"};
 const valuta=d=>VNOME[(S.I&&S.I.val||{})[d]]||"valuta";
 const ESITO={1:"forte","-1":"debole",0:"in linea"};
 // v8.90 COS'E' OGNI NOTIZIA (Ya, 23/11/2026): due righe semplici per chi non le conosce. PC: fumetto al passaggio del
 // mouse sul bottone; telefono (niente passaggio del mouse): la riga sotto i bottoni per la notizia scelta.
 const INFO={
  "NFP USA":"Non Farm Payrolls: i nuovi posti di lavoro creati negli USA in un mese (agricoltura esclusa), insieme a disoccupazione e salari. È il dato più seguito sul lavoro americano.",
  "CPI USA":"Inflazione al consumo negli USA: di quanto salgono i prezzi che pagano le famiglie. È il dato che pesa di più sulle scelte della Fed.",
  "Fed":"Decisione sui tassi della banca centrale americana (FOMC), con il comunicato e la conferenza stampa. Muove dollaro, Treasury, oro e borse.",
  "Vendite USA":"Vendite al dettaglio negli USA: quanto spendono i consumatori nei negozi e online. Misura la forza dei consumi, la parte più grande dell'economia americana.",
  "PPI USA":"Prezzi alla produzione negli USA: quanto costano beni e servizi per le aziende. Spesso anticipa l'inflazione al consumo.",
  "PCE USA":"Inflazione PCE: la misura dei prezzi preferita dalla Fed, insieme a redditi e spese delle famiglie americane.",
  "PIL USA":"Prodotto interno lordo, prima stima del trimestre: quanto è cresciuta l'economia americana.",
  "JOLTS USA":"Posti di lavoro vacanti negli USA: quante offerte di lavoro aspettano un candidato. Dice quanto è teso il mercato del lavoro.",
  "BCE":"Decisione sui tassi della Banca centrale europea, con la conferenza stampa. Muove soprattutto l'euro.",
  "BoE":"Decisione sui tassi della Bank of England, la banca centrale del Regno Unito. Muove soprattutto la sterlina.",
  "BoJ":"Decisione sui tassi della Bank of Japan. Non ha un orario fisso: sul grafico l'ora è indicativa. Muove soprattutto lo yen.",
  "BoC":"Decisione sui tassi della Bank of Canada. Muove soprattutto il dollaro canadese.",
  "RBA":"Decisione sui tassi della Reserve Bank of Australia. Muove soprattutto il dollaro australiano.",
  "RBNZ":"Decisione sui tassi della Reserve Bank of New Zealand. Muove soprattutto il dollaro neozelandese.",
  "SNB":"Decisione sui tassi della Banca nazionale svizzera. Muove soprattutto il franco svizzero."};
 const TOCCO=matchMedia("(hover:none)").matches;
 // strumento con lo storico orario fermo (es. oro e argento a pronti: candele orarie solo fino al 2020): si dice nel menu
 const vecchio=x=>x.al&&Date.now()-Date.parse(x.al)>120*864e5;

 function struttura(){
  el.innerHTML=`<h2>Notizie</h2>
   <p class="sub">Come reagiscono i mercati alle notizie macro ad alto impatto, ora per ora. <b>Prima ora</b> = dalla chiusura dell'ora prima alla chiusura della candela della notizia. <b>Esito</b> = come ha reagito la valuta della notizia nella prima ora (per i dati USA il dollaro, misurato su tutte le coppie di valute): <b>forte</b> o <b>debole</b> se si è mossa almeno 1,5 volte un'ora normale, altrimenti <b>in linea</b>. È l'esito letto dal prezzo, non il confronto con il dato atteso. <b>× normale</b> = quante volte la mossa è più grande della stessa ora negli altri giorni (ultimi 30). Se il mercato era chiuso all'ora della notizia (azioni USA alle 14:30) la notizia non si conta. Le banche centrali fuori dagli USA si registrano da settembre 2026. Registro di quello che è successo, non una previsione né un consiglio.</p>
   <div class="nm-ctl"><select class="nm-sel" aria-label="Strumento"></select><div class="nm-chips" role="group" aria-label="Driver"></div></div>
   <p class="nm-desc" hidden></p>
   <div class="nm-graf"></div>
   <h3 class="vft">Dopo l'esito</h3>
   <p class="sub">Mossa mediana dello strumento nella prima ora quando la notizia rende la sua valuta forte o debole, quante volte è salito e la mossa mediana a 24 ore. Servono almeno 8 casi.</p>
   <div class="nm-es"></div>
   <h3 class="vft nm-tutti-t">Su tutti gli strumenti</h3>
   <p class="sub">La stessa misura su tutti i mercati, per il driver scelto. «Grandezza» = mediana della prima ora in volte un'ora normale. Tocca uno strumento per aprirlo.</p>
   <div class="nm-tctl"><div class="vfc-seg nm-vis" role="group"></div><div class="nm-chips nm-fam" role="group" aria-label="Famiglia"></div></div>
   <div class="nm-tutti"></div>
   <h3 class="vft">Come reagisce</h3>
   <p class="sub"><b>Forte</b> = notizie con una prima ora almeno 2 volte un'ora normale. <b>Prosegue</b> = quante volte, nelle 23 ore dopo, il prezzo continua nel verso della prima ora. Accanto, lo stesso conto su ore qualsiasi: il caso.</p>
   <div class="nm-tab"></div>
   <h3 class="vft">Registro</h3>
   <div class="nm-reg"></div>`;
  el.querySelector(".nm-sel").onchange=e=>{S.s=e.target.value;S.n=10;strumento();};
  el.style.position="relative";
  const ch=el.querySelector(".nm-ctl .nm-chips");
  ch.onclick=e=>{const b=e.target.closest("button");if(!b)return;S.d=b.dataset.d;S.n=10;togliFumetto();resto();};
  ch.addEventListener("pointerover",e=>{if(e.pointerType!="mouse")return;const b=e.target.closest("button[data-d]");if(!b||!INFO[b.dataset.d])return;
   togliFumetto();const f=document.createElement("div");f.className="nm-tt";f.setAttribute("role","tooltip");
   f.innerHTML=`<b>${esc(b.dataset.d)}</b>${esc(INFO[b.dataset.d])}`;el.appendChild(f);
   // sopra il bottone, centrato, sempre dentro lo schermo
   const r=b.getBoundingClientRect(),q=el.getBoundingClientRect(),w=f.offsetWidth,x=Math.max(8-q.left,Math.min(r.left-q.left+r.width/2-w/2,innerWidth-q.left-w-8));
   f.style.left=x+"px";f.style.top=(r.top-q.top-f.offsetHeight-8)+"px";requestAnimationFrame(()=>f.classList.add("on"));});
  ch.addEventListener("pointerout",e=>{if(e.pointerType=="mouse"&&!e.relatedTarget?.closest?.("button[data-d]"))togliFumetto();});
  el.querySelector(".nm-reg").onclick=e=>{const r=e.target.closest("[data-t]");
   if(r){grafico(r.dataset.t);el.querySelector(".nm-graf").scrollIntoView({behavior:"smooth",block:"center"});return;}
   if(e.target.closest(".nm-piu")){S.n+=20;registro();}};
  el.querySelector(".nm-tab").onclick=e=>{const r=e.target.closest("tr[data-d]");if(r){S.d=r.dataset.d;resto();}};
  el.querySelector(".nm-es").onclick=e=>{const r=e.target.closest("tr[data-d]");if(r){S.d=r.dataset.d;resto();}};
  el.querySelector(".nm-vis").onclick=e=>{const b=e.target.closest("button");if(!b)return;S.v=b.dataset.v;tutti();};
  el.querySelector(".nm-fam").onclick=e=>{const b=e.target.closest("button");if(!b)return;S.f=b.dataset.f;S.tutti=false;tutti();};
  el.querySelector(".nm-tutti").onclick=e=>{if(e.target.closest(".nm-ogni")){S.tutti=true;tutti();return;}
   const r=e.target.closest("[data-s]");if(!r)return;S.s=r.dataset.s;S.n=10;
   el.querySelector(".nm-sel").value=S.s;strumento();el.scrollIntoView({behavior:"smooth"});};}

 function togliFumetto(){el.querySelectorAll(".nm-tt").forEach(x=>x.remove());}
 function menu(){const L=S.I.sim;if(!L.some(x=>x.s==S.s))S.s=L[0].s;
  el.querySelector(".nm-sel").innerHTML=GRUPPI.map(([g,f])=>{const q=L.filter(x=>f(x.s));
   return q.length?`<optgroup label="${g}">${q.map(x=>`<option value="${esc(x.s)}"${x.s==S.s?" selected":""}>${esc(etichetta(x.s))}${vecchio(x)?` (fino al ${x.al.slice(0,4)})`:""}</option>`).join("")}</optgroup>`:"";}).join("");}

 function strumento(){const g=el.querySelector(".nm-graf");g.innerHTML=`<p class="small">Caricamento&hellip;</p>`;
  leggi(BASE+S.s+".json").then(X=>{if(!X){g.innerHTML=`<p class="small">Dati non disponibili per questo strumento.</p>`;return;}
   S.X=X;const dd=[...new Set(X.ev.map(e=>e[1]))];if(S.d&&!dd.includes(S.d))S.d="";
   resto();});}

 // grafico: la notizia piu' recente (del driver scelto) oppure quella toccata nel registro
 function grafico(t){const X=S.X,E=X.ev.filter(e=>!S.d||e[1]==S.d),g=el.querySelector(".nm-graf");
  const foco=t||(E.length?E[E.length-1][0]:X.ev[X.ev.length-1][0]),ult=X.ev[X.ev.length-1][0];
  if(ult<H1_DAL){g.innerHTML=`<p class="small">Grafico non disponibile: candele orarie di questo strumento fino al ${GG.format(Date.parse(ult))}. Per l'oro e l'argento di oggi: GLD e SLV.</p>`;return;}
  if(!window.ebCandele){g.innerHTML="";return;}
  window.ebCandele(g,{id:"nm",generato:foco,opz:{sym:X.s,ann:E,dal:H1_DAL}});}

 function resto(){const X=S.X,n={};X.ev.forEach(e=>n[e[1]]=(n[e[1]]||0)+1);
  const dd=Object.keys(n).sort((a,b)=>n[b]-n[a]);
  el.querySelector(".nm-ctl .nm-chips").innerHTML=[["","Tutte"]].concat(dd.map(d=>[d,d])).map(([d,t])=>`<button type="button" data-d="${esc(d)}" class="${d==S.d?"on":""}">${esc(t)}</button>`).join("");
  const ds=el.querySelector(".nm-desc"),txt=TOCCO&&S.d&&INFO[S.d];ds.hidden=!txt;if(txt)ds.textContent=INFO[S.d];
  esiti();tutti();tabella();registro();grafico();}

 // 2) la formula per lo strumento scelto: valuta forte / valuta debole
 const cella=r=>r?`<b class="${cl(r[1])}">${pc(r[1])}</b><small>sale ${r[2]}% · ${r[0]} casi</small><small>24 ore ${pc(r[3])}</small>`:`<span class="nm-nd">pochi casi</span>`;
 function esiti(){const X=S.X,E=X.es||{},T=X.st.map(x=>x.n).filter(d=>(!S.d||d==S.d)&&E[d]),box=el.querySelector(".nm-es");
  if(!T.length){box.innerHTML=`<p class="small">Non ancora abbastanza casi con un esito netto.</p>`;return;}
  const uno=new Set(T.map(valuta)).size==1,v=uno?valuta(T[0]):"valuta";
  box.innerHTML=`<div class="nm-tw"><table class="nm-t nm-e"><thead><tr><th>Driver</th><th>${v.charAt(0).toUpperCase()+v.slice(1)} forte</th><th>${uno?v.charAt(0).toUpperCase()+v.slice(1)+" debole":"Debole"}</th></tr></thead><tbody>`+
   T.map(d=>`<tr data-d="${esc(d)}"><td><b>${esc(d)}</b>${uno?"":`<small>${valuta(d)}</small>`}</td><td>${cella(E[d]["+"])}</td><td>${cella(E[d]["-"])}</td></tr>`).join("")+`</tbody></table></div>`;}

 // 3) su tutti gli strumenti: esito forte, esito debole o grandezza; filtro per famiglia
 function tutti(){const d=S.d||"NFP USA",fam=GRUPPI.find(g=>g[0]==S.f),v=valuta(d);
  el.querySelector(".nm-tutti-t").firstChild.textContent=`${d} su tutti gli strumenti`;
  el.querySelector(".nm-vis").innerHTML=[["+",`${v.charAt(0).toUpperCase()+v.slice(1)} forte`],["-","Debole"],["x","Grandezza"]].map(([k,t])=>`<button type="button" data-v="${k}" class="${S.v==k?"on":""}">${t}</button>`).join("");
  el.querySelector(".nm-fam").innerHTML=[["","Tutti"]].concat(GRUPPI.map(g=>[g[0],g[0]])).map(([k,t])=>`<button type="button" data-f="${k}" class="${S.f==k?"on":""}">${t}</button>`).join("");
  const box=el.querySelector(".nm-tutti"),es=S.v!="x",idx=S.v=="+"?3:4;
  let L=S.I.sim.filter(x=>x.m[d]&&(!fam||fam[1](x.s)));
  L=es?L.filter(x=>x.m[d][idx]).sort((a,b)=>b.m[d][idx][1]-a.m[d][idx][1]):L.sort((a,b)=>b.m[d][1]-a.m[d][1]);
  if(!L.length){box.innerHTML=`<p class="small">Non ancora abbastanza casi per questo driver.</p>`;return;}
  const M=S.tutti?L:L.slice(0,12);
  if(es){const mx=Math.max(...L.map(x=>Math.abs(x.m[d][idx][1])))||1;
   box.innerHTML=`<div class="nm-bars nm-div">${M.map(x=>{const r=x.m[d][idx],w=(Math.abs(r[1])/mx*50).toFixed(1);
    return `<button type="button" data-s="${esc(x.s)}" class="${x.s==S.s?"on":""}"><span>${esc(etichetta(x.s))}</span>
     <i><i class="${r[1]>=0?"su":"giu"}" style="${r[1]>=0?"left:50%":"right:50%"};width:${w}%"></i></i><b class="${cl(r[1])}">${pc(r[1])}</b><small>sale ${r[2]}% · ${r[0]}</small></button>`;}).join("")}</div>`;}
  else{const mx=Math.max(...L.map(x=>x.m[d][1]));
   box.innerHTML=`<div class="nm-bars">${M.map(x=>`<button type="button" data-s="${esc(x.s)}" class="${x.s==S.s?"on":""}"><span>${esc(etichetta(x.s))}</span>
    <i><i style="width:${(x.m[d][1]/mx*100).toFixed(1)}%"></i></i><b>${fx(x.m[d][1],1)}×</b><small>${fx(x.m[d][2],2)}% · ${x.m[d][0]}</small></button>`).join("")}</div>`;}
  if(L.length>M.length)box.insertAdjacentHTML("beforeend",`<button type="button" class="nm-piu nm-ogni">Mostra tutti (${L.length})</button>`);}

 // 4) grandezza e prosecuzione contro il caso
 function tabella(){const X=S.X,c=X.ctrl||{},T=X.st.filter(x=>!S.d||x.n==S.d),box=el.querySelector(".nm-tab");
  if(!T.length){box.innerHTML=`<p class="small">Meno di 12 notizie misurate: statistiche quando il registro sarà più lungo.</p>`;return;}
  box.innerHTML=`<div class="nm-tw"><table class="nm-t"><thead><tr><th>Driver</th><th>Prima ora</th><th>Forte (≥2×)</th><th>Prosegue</th><th class="nm-x">Prosegue se grande (≥3×)</th></tr></thead><tbody>`+
   T.map(x=>`<tr data-d="${esc(x.n)}"><td><b>${esc(x.n)}</b><small>${x.casi} casi · dal ${x.dal}</small></td>
    <td>${fx(x.r1,2)}%<small>${fx(x.x,1)}× normale</small></td>
    <td>${x.forte}%<small>caso ${c.forte}%</small></td>
    <td>${x.seg}%<small>caso ${c.seg}%</small></td>
    <td class="nm-x">${x.segG==null?"n/d":x.segG+"%"}<small>${x.nG} casi · caso ${c.segG}%</small></td></tr>`).join("")+`</tbody></table></div>`;}

 // 5) registro con l'esito di ogni notizia
 function registro(){const X=S.X,E=X.ev.filter(e=>!S.d||e[1]==S.d).slice().reverse(),box=el.querySelector(".nm-reg");
  const conGraf=t=>t>=H1_DAL;
  box.innerHTML=`<div class="nm-tw"><table class="nm-t nm-r"><thead><tr><th>Quando</th><th>Driver</th><th>Prima ora</th><th class="nm-x">4 ore</th><th>24 ore</th></tr></thead><tbody>`+
   E.slice(0,S.n).map(e=>`<tr${conGraf(e[0])?` data-t="${e[0]}" class="nm-cl"`:""}><td>${GG.format(Date.parse(e[0]))}<small>${HH.format(Date.parse(e[0]))}</small></td>
    <td>${esc(e[1])}${e[7]!=null?`<small class="nm-es${e[7]}">${valuta(e[1])} ${ESITO[e[7]]}</small>`:""}</td>
    <td><b class="${cl(e[2])}">${pc(e[2])}</b><small>${fx(e[5],1)}×</small></td><td class="nm-x">${pc(e[3])}</td><td>${pc(e[4])}</td></tr>`).join("")+`</tbody></table></div>`+
   (E.length>S.n?`<button type="button" class="nm-piu">Mostra altre (${E.length-S.n})</button>`:"");}

 // si disegna alla prima apertura della scheda (i dati si scaricano solo allora); il Basic vede il lucchetto (45_chiuse.js)
 let fatto=false;
 function apri(){if(fatto||!EB_PREMIUM)return;fatto=true;struttura();
  leggi(BASE+"indice.json").then(I=>{if(!I||!I.sim||!I.sim.length){el.querySelector(".nm-graf").innerHTML=`<p class="small">Il registro delle notizie arriva con il prossimo aggiornamento notturno.</p>`;return;}
   S.I=I;menu();strumento();});}
 if(bt)bt.addEventListener("click",apri);
 if(el.classList.contains("on"))apri();
 window.ebNotizieMacro={stato:S,apri};
}catch(e){console.warn("[EdgeValor] notizie",e);}})();
