/* ---------- 44b_notizie.js - SCHEDA "NOTIZIE" (Mercati > Notizie, Premium; il Basic vede il lucchetto) ----------
   v8.87 registro delle notizie macro con esito; v8.91 VERSIONE SEMPLICE (Ya, 23/11/2026: "troppi numeri noiosi"):
   davanti il messaggio in parole, frecce e colori, i numeri dietro le card che si girano (classi fc-*, 06_strumenti.js).
   PEZZI, dall'alto:
     1. mercato: 8 bottoni grandi (oro, euro/dollaro, S&P 500, Nasdaq, Bitcoin, petrolio, dollaro/yen, Treasury) + "Altri";
     2. frase: quali notizie lo muovono di piu' e un esempio con l'esito;
     3. una CARD per notizia: cos'e' in una riga, quanto muove (4 tacche), cosa fa con dollaro forte e con dollaro debole
        ("scende 90 volte su 100"); dietro i numeri (mossa tipica, volte un'ora normale, 1 ora e 24 ore, prosegue);
     4. grafico orario con la traccia di ogni notizia (filtro per notizia, fumetto "cos'e'" al passaggio del mouse);
     5. mappa: una notizia su 20 mercati noti divisi per famiglia, con dollaro forte o debole (verde/rosso, "93 su 100");
     6. registro di tutte le notizie, chiuso (si apre a richiesta).
   ESITO (cot_radar/impatto.py): letto dal prezzo, non dal dato atteso: forza della valuta della notizia nella prima ora,
   media su tutte le coppie di valute che la contengono; forte/debole se almeno 1,5 volte un'ora normale.
   DATI (ramo "orari", scritti ogni notte da impatto.py): pubblico/impatto/indice.json e <SIMBOLO>.json
     ev = [[ora UTC, driver, r1, r4, r24, x, dopo, esito]], st = [{n, casi, r1, x, forte, seg, segG, nG, dal}],
     es = {driver: {"+": [n, r1, %su, r24, %su24], "-": [...]}}, ctrl = {forte, seg, segG}
     indice: val = {driver: valuta}, sim = [{s, n, c, al, m: {driver: [casi, x, r1, es+, es-]}}]
   Niente previsioni e niente consigli: e' il registro di quello che e' successo.
   DEBUG: ebNotizieMacro.stato (strumento, driver, vista, dati letti) */
(function(){try{
 const el=$("notizie"),bt=document.querySelector('#nav button[data-t="notizie"]');if(!el)return;
 const BASE=EB_RAW+"orari/pubblico/impatto/",H1_DAL="2026-08-01";
 const fcIco=window.fcIco||(()=>"");                 // icone delle card (06_strumenti.js)
 const cache={},leggi=u=>cache[u]||(cache[u]=fetch(u).then(r=>r.ok?r.json():null).catch(()=>null));
 const S={s:"GLD.US",d:"",n:10,md:"NFP USA",mv:3,I:null,X:null};
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

 // v8.91 versione semplice: frasi brevi per le card (le spiegazioni lunghe restano nel fumetto dei bottoni)
 const BREVE={"NFP USA":"Nuovi posti di lavoro negli USA, con disoccupazione e salari.","CPI USA":"Inflazione: di quanto salgono i prezzi per le famiglie USA.",
  "Fed":"Decisione sui tassi della banca centrale americana.","Vendite USA":"Quanto spendono i consumatori americani.",
  "PPI USA":"Prezzi pagati dalle aziende USA: anticipa l'inflazione.","PCE USA":"L'inflazione preferita dalla Fed.",
  "PIL USA":"Quanto cresce l'economia americana nel trimestre.","JOLTS USA":"Offerte di lavoro aperte negli USA.",
  "BCE":"Decisione sui tassi della Banca centrale europea.","BoE":"Decisione sui tassi della banca centrale inglese.","BoJ":"Decisione sui tassi della banca centrale giapponese.",
  "BoC":"Decisione sui tassi della banca centrale canadese.","RBA":"Decisione sui tassi della banca centrale australiana.",
  "RBNZ":"Decisione sui tassi della banca centrale neozelandese.","SNB":"Decisione sui tassi della banca centrale svizzera."};
 // mercati in evidenza (bottoni grandi) e mappa: solo nomi che tutti conoscono
 const TOP=[["GLD.US","Oro"],["EURUSD.FOREX","Euro/Dollaro"],["SPY.US","S&P 500"],["QQQ.US","Nasdaq"],["BTC-USD.CC","Bitcoin"],["USO.US","Petrolio"],["USDJPY.FOREX","Dollaro/Yen"],["TLT.US","Treasury 20 anni"]];
 const MAPPA=[["Metalli",[["GLD.US","Oro"],["SLV.US","Argento"]]],
  ["Azioni",[["SPY.US","S&P 500"],["QQQ.US","Nasdaq"],["DIA.US","Dow Jones"],["IWM.US","Russell 2000"],["GDAXI.INDX","DAX"],["STOXX50E.INDX","Euro Stoxx 50"],["EEM.US","Emergenti"]]],
  ["Valute",[["EURUSD.FOREX","EUR/USD"],["GBPUSD.FOREX","GBP/USD"],["USDJPY.FOREX","USD/JPY"],["AUDUSD.FOREX","AUD/USD"],["USDCHF.FOREX","USD/CHF"],["USDCAD.FOREX","USD/CAD"]]],
  ["Tassi e materie prime",[["TLT.US","Treasury 20 anni"],["USO.US","Petrolio"],["VIX.INDX","VIX"]]],
  ["Crypto",[["BTC-USD.CC","Bitcoin"],["ETH-USD.CC","Ether"]]]];
 const NOMI_M=Object.fromEntries(TOP.concat(...MAPPA.map(f=>f[1])));
 const nomeM=s=>NOMI_M[s]||etichetta(s);
 const maiusc=t=>t.charAt(0).toUpperCase()+t.slice(1);
 // nomi delle notizie in inglese dentro le frasi composte (il traduttore 00t traduce solo testi interi)
 const EN_N=typeof EB_LANG!="undefined"&&EB_LANG=="en",tn=t=>(EN_N&&typeof EB_EN!="undefined"&&EB_EN[t])||t;
 // verso di una reazione [n, r1, %su, ...]: netto solo se almeno 65 volte su 100 nello stesso verso
 const verso=r=>{if(!r)return null;const p=r[2];return p>=65?["su",`sale ${p} volte su 100`]:p<=35?["giu",`scende ${100-p} volte su 100`]:["piatto","nessuna direzione chiara"];};
 const forza=x=>x>=3?[4,"moltissimo"]:x>=2?[3,"molto"]:x>=1.4?[2,"abbastanza"]:[1,"poco"];
 const freccina=v=>v=="su"?`<i class="qe-fr up">&#9650;</i>`:v=="giu"?`<i class="qe-fr down">&#9660;</i>`:`<i class="qe-fr neu">&#8212;</i>`;

 function struttura(){
  el.innerHTML=`<h2>Notizie</h2>
   <p class="sub">Come reagiscono i mercati alle notizie macro più importanti. <b>Dollaro forte</b> o <b>debole</b> = come ha reagito il dollaro nella prima ora dopo la notizia, misurato su tutte le coppie di valute (per le banche centrali fuori dagli USA, la loro valuta): è l'esito letto dal prezzo. <b>90 volte su 100</b> = in 90 notizie su 100 con quell'esito il mercato è andato in quella direzione nella prima ora. <b>Quanto muove</b> = quanto è grande la prima ora rispetto alla stessa ora negli altri giorni. Tocca una card per vedere i numeri. Se il mercato era chiuso all'ora della notizia (azioni USA alle 14:30) la notizia non si conta. Registro di quello che è successo, non una previsione.</p>
   <div class="nm-mk" role="group" aria-label="Mercato"></div>
   <div class="chero nm-hero"></div>
   <div class="fc-grid nm-cards"></div>
   <div class="nm-ctl nm-ctl2"><div class="nm-chips" role="group" aria-label="Notizia"></div></div>
   <p class="nm-desc" hidden></p>
   <div class="nm-graf"></div>
   <h3 class="vft nm-tutti-t">Cosa fanno tutti i mercati</h3>
   <p class="sub">Una notizia su 20 mercati che tutti conoscono: verde sale, rosso scende, grigio nessuna direzione chiara. Più è intenso il colore, più spesso va in quella direzione. Tocca un mercato per aprirlo.</p>
   <div class="nm-chips nm-md" role="group" aria-label="Notizia della mappa"></div>
   <div class="vfc-seg nm-mv" role="group"></div>
   <div class="nm-map"></div>
   <details class="nm-regd"><summary>Registro di tutte le notizie</summary><div class="nm-reg"></div></details>`;
  el.style.position="relative";
  el.querySelector(".nm-mk").addEventListener("click",e=>{const b=e.target.closest("button[data-s]");if(!b)return;S.s=b.dataset.s;S.n=10;bottoni();strumento();});
  el.querySelector(".nm-mk").addEventListener("change",e=>{if(!e.target.matches("select")||!e.target.value)return;S.s=e.target.value;S.n=10;bottoni();strumento();});
  const ch=el.querySelector(".nm-ctl .nm-chips");
  ch.onclick=e=>{const b=e.target.closest("button");if(!b)return;S.d=b.dataset.d;S.n=10;togliFumetto();filtro();grafico();registro();};
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
  el.querySelector(".nm-md").onclick=e=>{const b=e.target.closest("button");if(b){S.md=b.dataset.d;mappa();}};
  el.querySelector(".nm-mv").onclick=e=>{const b=e.target.closest("button");if(b){S.mv=+b.dataset.v;mappa();}};
  el.querySelector(".nm-map").onclick=e=>{const t=e.target.closest("[data-s]");if(!t)return;S.s=t.dataset.s;S.n=10;bottoni();strumento();
   el.querySelector(".nm-mk").scrollIntoView({behavior:"smooth",block:"start"});};}

 function togliFumetto(){el.querySelectorAll(".nm-tt").forEach(x=>x.remove());}
 // 1) mercati: 8 bottoni grandi + "Altri mercati" (tutti gli altri, per famiglia)
 function bottoni(){const L=S.I.sim,ci=new Set(L.map(x=>x.s)),top=TOP.filter(t=>ci.has(t[0])),inTop=top.some(t=>t[0]==S.s);
  el.querySelector(".nm-mk").innerHTML=top.map(([s,n])=>`<button type="button" data-s="${s}" class="${s==S.s?"on":""}">${n}</button>`).join("")+
   `<select class="nm-sel${inTop?"":" on"}" aria-label="Altri mercati"><option value="">${inTop?"Altri mercati":esc(nomeM(S.s))}</option>`+
   GRUPPI.map(([g,f])=>{const q=L.filter(x=>f(x.s)&&!top.some(t=>t[0]==x.s));
    return q.length?`<optgroup label="${g}">${q.map(x=>`<option value="${esc(x.s)}">${esc(etichetta(x.s))}${vecchio(x)?` (fino al ${x.al.slice(0,4)})`:""}</option>`).join("")}</optgroup>`:"";}).join("")+`</select>`;}

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

 function filtro(){const X=S.X,n={};X.ev.forEach(e=>n[e[1]]=(n[e[1]]||0)+1);
  const dd=Object.keys(n).sort((a,b)=>n[b]-n[a]);
  el.querySelector(".nm-ctl .nm-chips").innerHTML=[["","Tutte"]].concat(dd.map(d=>[d,d])).map(([d,t])=>`<button type="button" data-d="${esc(d)}" class="${d==S.d?"on":""}">${esc(t)}</button>`).join("");
  const ds=el.querySelector(".nm-desc"),txt=TOCCO&&S.d&&INFO[S.d];ds.hidden=!txt;if(txt)ds.textContent=INFO[S.d];}

 function resto(){filtro();testata();carte();grafico();mappa();registro();}

 // 2) frase in alto: le notizie che lo muovono di piu' e un esempio con l'esito
 function testata(){const X=S.X,T=X.st.slice().sort((a,b)=>b.x-a.x),nm=nomeM(S.s);
  const tre=T.slice(0,3).map(d=>esc(tn(d.n))).join(", ").replace(/, ([^,]*)$/,(EN_N?" and ":" e ")+"$1");
  const d=T.find(d=>X.es&&X.es[d.n]&&verso(X.es[d.n]["+"])&&verso(X.es[d.n]["+"])[0]!="piatto"),v=d&&verso(X.es[d.n]["+"]);
  el.querySelector(".nm-hero").innerHTML=`<small>Notizie · ${esc(nm)}</small><h3>Cosa muove ${nm=="Oro"?"l'oro":esc(nm)}</h3>
   <p>${T.length?`Le notizie che lo muovono di più: <b>${tre}</b>.`:"Non ancora abbastanza notizie misurate."}${v?` Esempio: dopo ${d.n=="Fed"?"la Fed":esc(d.n)}, se il ${valuta(d.n)} esce forte <b class="${v[0]=="su"?"ch-su":"ch-giu"}">${v[1]}</b>.`:""}</p>`;}

 // 3) una card per notizia: davanti il messaggio, dietro i numeri
 function carte(){const X=S.X,T=X.st.slice().sort((a,b)=>b.x-a.x),c=X.ctrl||{},box=el.querySelector(".nm-cards");
  if(!T.length){box.innerHTML=`<p class="small">Meno di 12 notizie misurate: le card arrivano quando il registro sarà più lungo.</p>`;return;}
  box.innerHTML=T.map(d=>{const [k,w]=forza(d.x),e=(X.es||{})[d.n]||{},v=maiusc(valuta(d.n)),p=verso(e["+"]),m=verso(e["-"]);
   const riga=(lab,r)=>`<div class="nm-er"><span class="fc-ic2 ${r?r[0]:"piatto"}">${fcIco(r?r[0]:"piatto")}</span><div><b>${r?r[1]:"pochi casi"}</b><small>${lab}</small></div></div>`;
   const kv=[["Mossa tipica",`${fx(d.r1,2)}%<span class="nm-caso">${fx(d.x,1)}× il normale</span>`],["Prosegue dopo",`${d.seg}%<span class="nm-caso">caso ${c.seg}%</span>`],
    e["+"]?[`${v} forte`,`${freccina(e["+"][1]>=0?"su":"giu")} ${pc(e["+"][1])}<span class="nm-caso">a 24 ore ${pc(e["+"][3])}</span>`]:null,
    e["-"]?[`${v} debole`,`${freccina(e["-"][1]>=0?"su":"giu")} ${pc(e["-"][1])}<span class="nm-caso">a 24 ore ${pc(e["-"][3])}</span>`]:null].filter(Boolean);
   return `<div class="fc nm-fc" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(d.n)}: tocca per i numeri"><div class="fc-in">
    <div class="fc-fr"><div class="fc-top"><div><b>${esc(d.n)}</b></div><span class="fc-gira" title="Tocca per i numeri">${fcIco("gira")}</span></div>
     <p class="nm-cosa">${esc(BREVE[d.n]||INFO[d.n]||"")}</p>
     <div class="nm-forza" title="Quanto è grande la prima ora rispetto a un'ora normale"><i>${[1,2,3,4].map(i=>`<b class="${i<=k?"on":""}"></b>`).join("")}</i>muove ${w}</div>
     <div class="nm-esiti">${riga(v+" forte",p)}${riga(v+" debole",m)}</div></div>
    <div class="fc-bk"><div class="fc-top"><div><b>${esc(d.n)}</b><small>${d.casi} notizie dal ${d.dal}</small></div><span class="fc-gira">${fcIco("gira")}</span></div>
     <dl class="fc-kv nm-kv">${kv.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></div></div></div>`;}).join("");}

 // 5) mappa: una notizia su 20 mercati noti, con dollaro forte o debole
 function mappa(){const I=S.I,usati=new Set(I.sim.flatMap(x=>Object.keys(x.m)));
  const dd=Object.keys(BREVE).filter(d=>usati.has(d)&&I.sim.some(x=>x.m[d]&&(x.m[d][3]||x.m[d][4])));
  if(!dd.includes(S.md))S.md=dd[0];const v=maiusc(valuta(S.md));
  el.querySelector(".nm-tutti-t").firstChild.textContent=`${S.md}: cosa fanno tutti i mercati`;
  el.querySelector(".nm-md").innerHTML=dd.map(d=>`<button type="button" data-d="${esc(d)}" class="${d==S.md?"on":""}">${esc(d)}</button>`).join("");
  el.querySelector(".nm-mv").innerHTML=[[3,`Se esce ${v.toLowerCase()} forte`],[4,`Se esce ${v.toLowerCase()} debole`]].map(([k,t])=>`<button type="button" data-v="${k}" class="${S.mv==k?"on":""}">${t}</button>`).join("");
  const per=Object.fromEntries(I.sim.map(x=>[x.s,x]));
  el.querySelector(".nm-map").innerHTML=MAPPA.map(([f,L])=>{const q=L.filter(([s])=>per[s]&&per[s].m[S.md]&&per[s].m[S.md][S.mv]);
   if(!q.length)return "";
   return `<div class="nm-fam2">${f}</div><div class="nm-tiles">${q.map(([s,n])=>{const r=per[s].m[S.md][S.mv],vv=verso(r),a=vv[0]=="piatto"?0:Math.abs(r[2]-50)/50;
    return `<button type="button" class="nm-tile ${vv[0]}${s==S.s?" sel":""}" data-s="${s}" style="--a:${a.toFixed(2)}" title="${esc(n)}: ${vv[1]} (${r[0]} notizie)"><b>${esc(n)}</b><span>${freccina(vv[0])}${vv[0]=="piatto"?"incerto":(vv[0]=="su"?r[2]:100-r[2])+" su 100"}</span></button>`;}).join("")}</div>`;}).join("")||`<p class="small">Non ancora abbastanza casi per questa notizia.</p>`;}

 // 6) registro con l'esito di ogni notizia (chiuso: si apre a richiesta)
 function registro(){const X=S.X,E=X.ev.filter(e=>!S.d||e[1]==S.d).slice().reverse(),box=el.querySelector(".nm-reg");
  const conGraf=t=>t>=H1_DAL;
  box.innerHTML=`<div class="nm-tw"><table class="nm-t nm-r"><thead><tr><th>Quando</th><th>Notizia</th><th>Prima ora</th><th class="nm-x">4 ore</th><th>24 ore</th></tr></thead><tbody>`+
   E.slice(0,S.n).map(e=>`<tr${conGraf(e[0])?` data-t="${e[0]}" class="nm-cl"`:""}><td>${GG.format(Date.parse(e[0]))}<small>${HH.format(Date.parse(e[0]))}</small></td>
    <td>${esc(e[1])}${e[7]!=null?`<small class="nm-es${e[7]}">${valuta(e[1])} ${ESITO[e[7]]}</small>`:""}</td>
    <td><b class="${cl(e[2])}">${pc(e[2])}</b><small>${fx(e[5],1)}×</small></td><td class="nm-x">${pc(e[3])}</td><td>${pc(e[4])}</td></tr>`).join("")+`</tbody></table></div>`+
   (E.length>S.n?`<button type="button" class="nm-piu">Mostra altre (${E.length-S.n})</button>`:"");}

 // si disegna alla prima apertura della scheda (i dati si scaricano solo allora); il Basic vede il lucchetto (45_chiuse.js)
 let fatto=false;
 function apri(){if(fatto||!EB_PREMIUM)return;fatto=true;struttura();
  leggi(BASE+"indice.json").then(I=>{if(!I||!I.sim||!I.sim.length){el.querySelector(".nm-graf").innerHTML=`<p class="small">Il registro delle notizie arriva con il prossimo aggiornamento notturno.</p>`;return;}
   S.I=I;if(!I.sim.some(x=>x.s==S.s))S.s=I.sim[0].s;bottoni();strumento();});}
 if(bt)bt.addEventListener("click",apri);
 if(el.classList.contains("on"))apri();
 window.ebNotizieMacro={stato:S,apri};
}catch(e){console.warn("[EdgeValor] notizie",e);}})();
