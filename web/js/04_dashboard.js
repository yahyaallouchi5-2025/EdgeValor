/* ---------- segnali ----------
   Riepilogo in alto, settori, schede delle coppie (card) e degli altri strumenti (acard).
   Le schede sono fatte di righe-segnale (sg): speculatori, mercato, stagionalita', notizie. */
try{

/* RIQUADRI IN ALTO (v6.40): ognuno risponde a UNA domanda semplice con un disegno che si capisce a colpo d'occhio:
   1) segnali attivi = barra verde/rossa rialzo-ribasso + etichetta STRONG;  2) clima = tachimetro PAURA -> FIDUCIA;
   3) prossima rotazione e 4) nuovi dati COT = conto alla rovescia (giorni/ore/min) + barra del tempo gia' passato.
   Il conto alla rovescia si aggiorna ogni 30 s e si ferma da solo se i riquadri spariscono dalla pagina. */
(function kpis(){
 const altri=Object.values(D.assets).filter(a=>a.key!="USD"&&a.group!="Valute");
 const tutti=D.pairs.map(p=>p.label).concat(altri.map(a=>a.label));
 let su=tutti.filter(l=>l.includes("BUY")).length,giu=tutti.filter(l=>l.includes("SELL")).length,strong=tutti.filter(l=>l.startsWith("STRONG")).length;
 // v8.09 Basic: i segnali sono cifrati, la card usa i conteggi lasciati in chiaro da premium.py (D.cotsum)
 if(!tutti.length&&D.cotsum){su=D.cotsum.su;giu=D.cotsum.giu;strong=D.cotsum.forti;}
 const r=D.market?D.market.risk:null;                       // -100 (paura) ... +100 (fiducia)
 const [rl,rc]=r==null?["n/d","var(--mute)"]:r>=30?["FIDUCIA","var(--b)"]:r<=-30?["PAURA","var(--s)"]:["NEUTRO","var(--warn)"];
 const po=D.port,cot=D.sources[0]||{};
 const GG=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"],MM=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
 const roma=(ymd,h)=>{const [y,m,d]=ymd.split("-").map(Number),g=Date.UTC(y,m-1,d,h);   // "ymd hh:00" a Roma (ora legale/solare)
  const hr=+new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",hour:"2-digit",hourCycle:"h23"}).formatToParts(new Date(g)).find(x=>x.type=="hour").value;
  return new Date(g-((hr-h+24)%24)*3600e3);};
 let rotA=null,rotDa=null;try{if(po&&po.prossima){rotA=roma(po.prossima,9);rotDa=po.rotazione?roma(po.rotazione,9):new Date(rotA-30*864e5);}}catch(e){}
 const cotA=cot.next_ms?new Date(cot.next_ms):null,cotDa=cotA?new Date(cotA-7*864e5):null;
 const ico={seg:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',clima:'<path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17 7l1.4-1.4"/><circle cx="12" cy="14" r="5"/>',
  rot:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',cot:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'};
 const testa=(k,t,q)=>`<div class="kzt"><span class="kzico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ico[k]}</svg></span><h3>${t}</h3><span class="kzvai" aria-hidden="true">&rsaquo;</span></div><p class="kzq">${q}</p>`;
 const tot=su+giu||1,ang=r==null?0:Math.max(-1,Math.min(1,r/100))*80;
 const rd=rotA?`${GG[rotA.getDay()]} ${rotA.getDate()} ${MM[rotA.getMonth()]}`:"n/d";
 $("kpis").className="kzg";
 $("kpis").innerHTML=`<a class="kz kz1" href="#cards" data-scorri="cards" title="Vai al posizionamento">${testa("seg","Posizionamento","Dove puntano oggi gli speculatori?")}
   <div class="kzb"><div class="kzbig">${su+giu}</div>${strong?`<span class="kzforti" title="${strong} posizionament${strong==1?"o":"i"} pi&ugrave; fort${strong==1?"e":"i"}">&#9733;${strong}</span>`:""}</div>
   <div class="kzsplit"><i class="su" style="width:${su/tot*100}%"></i><i class="giu" style="width:${giu/tot*100}%"></i></div>
   <div class="kzleg"><span><b class="up">&#9650; ${su}</b> al rialzo</span><span>al ribasso <b class="dn">&#9660; ${giu}</b></span></div></a>
  <a class="kz kz2" href="#mkt" data-vai="mkt" title="Vai al clima di mercato" style="--clima:${rc}">${testa("clima","Clima del mercato","Gli investitori hanno paura o fiducia?")}
   <div class="kzb kzbc"><div class="kzgauge" aria-hidden="true"><svg viewBox="0 0 132 74"><defs><linearGradient id="kzarco" x1="0" x2="1"><stop offset="0" stop-color="#f2716b"/><stop offset=".5" stop-color="#e9b44c"/><stop offset="1" stop-color="#4fd6a3"/></linearGradient></defs>
     <path d="M12 66 A54 54 0 0 1 120 66" fill="none" stroke="#121d31" stroke-width="12" stroke-linecap="round"/><path d="M12 66 A54 54 0 0 1 120 66" fill="none" stroke="url(#kzarco)" stroke-width="12" stroke-linecap="round" opacity=".9"/>
     <g class="kzago" style="transform:rotate(${ang}deg)"><line x1="66" y1="66" x2="66" y2="22" stroke="#f1f5fb" stroke-width="3.5" stroke-linecap="round"/></g><circle cx="66" cy="66" r="6" fill="#f1f5fb"/></svg>
     <div class="kzestremi"><span class="p">PAURA</span><span class="f">FIDUCIA</span></div></div><div class="kzstato">${rl}</div></div>
   <div class="kzn" title="Misurato su paura (VIX), rischio delle obbligazioni e tassi, ultime 4 settimane">Paura (VIX), obbligazioni e tassi</div></a>
  <a class="kz kz3" href="#port" data-vai="port" title="Apri i Portafogli">${testa("rot","Prossima rotazione","Quando si aggiornano i portafogli?")}
   <div class="kzcd" data-cd="rot"></div><div class="kzprog"><i data-pr="rot"></i></div><div class="kzquando"><b>${rd}</b>${rotA?" &middot; ore 9:00":""}</div></a>
  <a class="kz kz4" href="#assets" data-vai="assets" title="Vedi la forza di ogni strumento">${testa("cot","Nuovi dati COT","Quando arrivano i dati nuovi?")}
   <div class="kzcd" data-cd="cot"></div><div class="kzprog"><i data-pr="cot"></i></div><div class="kzquando"><b>${esc(cot.next||"n/d")}</b>${cot.last?` &middot; dati del ${esc(String(cot.last).replace(/^\w+ /,"").slice(0,5))}`:""}</div></a>`;
 // clic su "Segnali attivi": scorre alle card dei segnali nella stessa scheda
 const s1=$("kpis").querySelector("[data-scorri]");if(s1)s1.onclick=e=>{e.preventDefault();const t=$("cards");if(t)t.scrollIntoView({behavior:"smooth",block:"start"});};
 const z=n=>String(n).padStart(2,"0");
 function cd(k,da,a){const box=$("kpis").querySelector(`[data-cd=${k}]`),bar=$("kpis").querySelector(`[data-pr=${k}]`);if(!box)return false;
  if(!a){box.innerHTML='<span class="small">data non disponibile</span>';return true;}
  const ms=Math.max(0,a-Date.now()),g=Math.floor(ms/864e5),h=Math.floor(ms/36e5)%24,m=Math.floor(ms/6e4)%60;
  box.innerHTML=[[g,"giorni"],[h,"ore"],[m,"min"]].map(([v,l])=>`<div><b>${z(v)}</b><small>${l}</small></div>`).join("");
  bar.style.width=Math.min(100,Math.max(0,(Date.now()-da)/(a-da)*100))+"%";return true;}
 const giro=()=>{if(!cd("rot",rotDa,rotA)||!cd("cot",cotDa,cotA))clearInterval(t);};
 const t=setInterval(giro,30000);giro();})();

/* PROSSIMI EVENTI ad alto impatto (motore notizie): BANNER A SCORRIMENTO LENTO (ticker).
   Ogni evento e' una "pillola": valuta, nome, giorno e ora, quanto manca. Colori: ambra = banca centrale (Fed, BCE),
   blu = dato macro (CPI, NFP); OGGI in rosso, DOMANI in ambra.
   - Scorre da destra a sinistra a velocita' costante (VEL px al secondo), all'infinito senza salti: la lista e'
     ripetuta finche' riempie la larghezza e poi duplicata, l'animazione sposta il nastro di meta' della sua lunghezza.
   - Si ferma passando il mouse o toccando (per leggere), riparte uscendo. Ai bordi sfuma.
   - Chi ha chiesto "riduci animazioni" nel sistema operativo vede le pillole ferme, una accanto all'altra (a capo).
   - Si ricalcola quando cambia la larghezza della finestra. La spiegazione sta nel tasto (i). */
try{const VEL=38,SC=(D.agenda&&D.agenda.scenari)||{};
 /* v6.73 EVENTI: tutta l'agenda ad alto impatto dei prossimi 7 giorni (v7.31: dati USA dalla FRED + banche centrali; prima financecalendar: NFP, CPI, PCE, ISM, banche
    centrali di tutte le valute...). Orario UTC -> ora di Roma. Senza agenda: i 4 eventi principali di D.eventi.
    senzaora = la fonte non da' l'orario (es. CPI Eurozona flash): si mostra solo il giorno. */
 const romaTxt=u=>{const p={};new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})
   .formatToParts(new Date(u.replace("Z",":00Z"))).forEach(x=>{p[x.type]=x.value;});return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;};
 const AG=((D.agenda&&D.agenda.eventi)||[]).filter(e=>!e.uscito&&(e.impatto||"high")=="high");
 const ev=AG.length?AG.map(e=>({quando:e.utc?romaTxt(e.utc):e.data+" 23:59",senzaora:!e.utc,nome:e.nome.replace(/\s*\(.*\)$/,""),
   nomeL:e.nome,valuta:e.valuta,tipo:e.tipo,cod:e.codice})).sort((a,b)=>a.quando<b.quando?-1:1)
   // v7.30 di norma i prossimi 7 giorni; in una settimana senza eventi il nastro NON sparisce: mostra i prossimi 4
   .filter((e,i,tutti)=>{const vicini=tutti.filter(x=>Date.parse(x.quando.slice(0,10))-Date.now()<7.5*864e5);
     return vicini.length?vicini.includes(e):i<4;}):(D.eventi||[]);
 const GG=["dom","lun","mar","mer","gio","ven","sab"];
 /* ORA DI ROMA: gli orari degli eventi sono "ora di Roma"; li confrontiamo con l'adesso di Roma (non del dispositivo),
    cosi' chi guarda da un altro fuso vede comunque lo stato giusto. Tutto in "minuti da epoca" fittizia (UTC finto). */
 const adessoRoma=()=>{const p={};new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})
   .formatToParts(new Date()).forEach(x=>{p[x.type]=x.value;});return {g:`${p.year}-${p.month}-${p.day}`,m:Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)/6e4};};
 const minEv=q=>{const [d,h]=q.split(" "),[y,mo,g]=d.split("-").map(Number),[hh,mm]=h.split(":").map(Number);return Date.UTC(y,mo-1,g,hh,mm)/6e4;};
 /* SCADENZA: dall'ora dell'evento la pillola e' "IN CORSO" (il mercato si muove proprio ora), poi sparisce:
    dopo 60 minuti per un dato macro, 90 per una banca centrale (conferenza stampa). */
 const FINESTRA=e=>e.tipo=="banca"?90:60;
 const attivi=()=>{const n=adessoRoma();return ev.filter(e=>n.m-minEv(e.quando)<=(e.senzaora?0:FINESTRA(e)));};
 const pill=e=>{const n=adessoRoma(),q=new Date(e.quando.replace(" ","T")),dm=minEv(e.quando)-n.m;
  const diff=Math.round((Date.UTC(...e.quando.slice(0,10).split("-").map((v,i)=>i==1?v-1:+v))-Date.UTC(...n.g.split("-").map((v,i)=>i==1?v-1:+v)))/864e5);
  const incorso=dm<=0,quando=incorso?"IN CORSO":diff<=0?"OGGI":diff==1?"DOMANI":`tra ${diff} giorni`;
  return `<span class="evp ${e.tipo=="banca"?"banca":"dato"}${incorso&&!e.senzaora?" incorso":diff<=0?" oggi":diff==1?" domani":""}" data-i="${ev.indexOf(e)}">
   <span class="evv">${esc(e.valuta)}</span><b>${esc(e.nome)}</b><span class="evq">${GG[q.getDay()]} ${e.quando.slice(8,10)}/${e.quando.slice(5,7)}${e.senzaora?"":` <b>${e.quando.slice(11)}</b>`}</span><em>${incorso&&!e.senzaora?"<i class='evlive'></i>IN CORSO":incorso?"OGGI":quando}</em></span>`;};
 $("prossimi").innerHTML=attivi().length?`<div class="card eventi"><div class="evhead"><h3>Prossimi eventi ad alto impatto</h3>
  <details class="info"><summary title="Come usarli" aria-label="Informazioni">i</summary><div>Il giorno del dato la volatilit&agrave; sale: per lo swing conviene valutare l'ingresso <b>dopo</b> l'uscita. Dopo il dato la riga "Notizie" delle card mostra se la sorpresa rafforza o penalizza il segnale.<br><br><b>Passa il mouse (o tocca) un evento</b> per lo scenario: cosa misura, dato precedente, cosa succede alla valuta se esce sopra o sotto e quanto reagisce di solito il mercato. Il confronto &egrave; con il dato precedente, non con le attese degli analisti (non incluse nei nostri dati). Reazione tipica = quante delle ultime uscite hanno mosso il tasso USA a 2 anni pi&ugrave; di una giornata normale (solo dati USA).</div></details>
  ${false&&D.agenda&&String(D.agenda.fonte||"").startsWith("financecalendar")?`<span class="small evfonte">Calendario: <a href="https://www.financecalendar.com" target="_blank" rel="noopener">financecalendar.com</a></span>`
   :false&&D.agenda&&String(D.agenda.fonte||"").startsWith("FRED")?`<span class="small evfonte">Fonti: <a href="https://fred.stlouisfed.org/releases/calendar" target="_blank" rel="noopener">FRED</a> e calendari ufficiali delle banche centrali</span>`:""}</div>
  <div class="evnastro" role="marquee" aria-label="Prossimi eventi"><div class="evtrack"></div></div></div>`:"";
 const nastro=$("prossimi").querySelector(".evnastro"),track=nastro&&nastro.querySelector(".evtrack");
 let base=attivi().map(pill).join("");
 // Nastro a scorrimento lento CONTROLLATO DA JS (non piu' da CSS): si puo' trascinare avanti e indietro con dito o mouse,
 // al rilascio prosegue per inerzia e poi torna dolcemente alla velocita' di crociera (mai "inchiodato").
 // x = spostamento corrente in px (0 .. -L, ciclico), vel = velocita' istantanea px/s, crociera = -VEL.
 let x=0,vel=-VEL,L=1,trascina=false,sopra=false,ultimoT=0,rafId=0,mosso=0,px0=0,pt=0,vm=0;
 const applica=()=>{track.style.transform=`translate3d(${x.toFixed(2)}px,0,0)`;};
 const cicla=()=>{if(L>1){x=x%L;if(x>0)x-=L;}};
 function giro(t){rafId=requestAnimationFrame(giro);
  const dt=Math.min(0.05,(t-(ultimoT||t))/1000);ultimoT=t;if(trascina||!L)return;
  const meta=sopra?0:-VEL;                          // col mouse sopra rallenta fino a fermarsi (si legge), senza scatti
  vel+=(meta-vel)*Math.min(1,dt*(sopra?5:1.6));      // ritorno morbido alla crociera dopo il rilascio
  x+=vel*dt;cicla();applica();}
 function monta(){if(!track)return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){track.innerHTML=base;nastro.classList.add("fermo");cancelAnimationFrame(rafId);return;}
  nastro.classList.remove("fermo");track.innerHTML=`<span class="evmeta">${base}</span>`;
  const meta=track.firstChild,W=nastro.clientWidth||800;let n=1;
  while(meta.scrollWidth<W&&n<30){meta.insertAdjacentHTML("beforeend",base);n++;}   // riempi la larghezza
  track.insertAdjacentHTML("beforeend",`<span class="evmeta" aria-hidden="true">${meta.innerHTML}</span>`);
  L=meta.getBoundingClientRect().width;cicla();applica();
  cancelAnimationFrame(rafId);ultimoT=0;rafId=requestAnimationFrame(giro);}
 monta();
 // ogni minuto: se un evento e' scaduto o e' appena iniziato, si ridisegna; se non resta nulla la card sparisce
 setInterval(()=>{const l=attivi(),nb=l.map(pill).join("");if(nb==base)return;base=nb;
  if(!l.length){$("prossimi").innerHTML="";return;}monta();},60000);
 let rt=0;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(monta,250);});
 if(nastro&&track){
  nastro.addEventListener("pointerdown",e=>{if(e.pointerType=="mouse"&&e.button!==0)return;
   trascina=true;mosso=0;px0=e.clientX;pt=performance.now();vm=0;nastro.classList.add("presa");
   try{nastro.setPointerCapture(e.pointerId);}catch(_){}});
  nastro.addEventListener("pointermove",e=>{if(!trascina)return;
   const dx=e.clientX-px0,now=performance.now(),dtm=Math.max(1,now-pt);px0=e.clientX;pt=now;
   mosso+=Math.abs(dx);x+=dx;cicla();applica();
   vm=vm*0.6+(dx/dtm*1000)*0.4;});                   // velocita' del gesto (media mobile) per l'inerzia
  const rilascia=()=>{if(!trascina)return;trascina=false;nastro.classList.remove("presa");
   vel=Math.max(-1400,Math.min(1400,vm));ultimoT=0;};
  nastro.addEventListener("pointerup",rilascia);nastro.addEventListener("pointercancel",rilascia);
  nastro.addEventListener("pointerenter",e=>{if(e.pointerType=="mouse")sopra=true;});
  nastro.addEventListener("pointerleave",e=>{if(e.pointerType=="mouse")sopra=false;});
  nastro.addEventListener("click",e=>{if(mosso>6){e.preventDefault();e.stopPropagation();}},true);   // un trascinamento non e' un clic
  nastro.addEventListener("keydown",e=>{if(e.key=="ArrowLeft"||e.key=="ArrowRight"){x+=(e.key=="ArrowLeft"?1:-1)*140;cicla();applica();e.preventDefault();}});
  nastro.tabIndex=0;
  document.addEventListener("visibilitychange",()=>{ultimoT=0;});
  /* SCENARIO DELL'EVENTO (v6.73): un solo fumetto #evpop nel body (fuori dal nastro che scorre e taglia),
     posizionato sotto la pillola. PC: compare al passaggio del mouse. Telefono: tocco apre/chiude, tocco fuori chiude. */
  const pop=document.body.appendChild(Object.assign(document.createElement("div"),{id:"evpop",className:"evpop",hidden:true}));
  pop.setAttribute("role","tooltip");
  const LIV={forte:["Forte","up"],media:[EB_LANG=="en"?"Medium":"Media","flat"],debole:["Debole","down"]};
  // v9.12 valori del precedente scritti all'italiana dal server (+1,8%): in inglese il punto decimale
  const numL=t=>EB_LANG=="en"?String(t).replace(/(\d),(\d)/g,"$1.$2"):t;
  const testo=e=>{const s=SC[e.cod]||{},V=esc(e.valuta),r=s.reaz,q=new Date(e.quando.replace(" ","T"));
   return `<div class="eptesta"><span class="evv">${V}</span><b>${esc(e.nomeL||e.nome)}</b></div>
   <div class="small">${GG[q.getDay()]} ${e.quando.slice(8,10)}/${e.quando.slice(5,7)}${e.senzaora?"":" ore "+e.quando.slice(11)}${s.cosa?" &middot; "+esc(s.cosa):""}</div>
   ${s.prec?`<div class="eprec">Precedente: <b>${esc(numL(s.prec))}</b>${s.periodo?` <span class="small">(${esc(s.periodo)})</span>`:""}</div>`:""}
   ${s.alto?(s.inv?`<div class="epcaso"><span class="down">&#9650; Sopra</span><span><b class="down">${V} pi&ugrave; debole</b>: ${esc(s.alto)}</span></div>
   <div class="epcaso"><span class="up">&#9660; Sotto</span><span><b class="up">${V} pi&ugrave; forte</b>: ${esc(s.basso)}</span></div>`
   :`<div class="epcaso"><span class="up">&#9650; ${e.tipo=="banca"?"Falco":"Sopra"}</span><span><b class="up">${V} pi&ugrave; forte</b>: ${esc(s.alto)}</span></div>
   <div class="epcaso"><span class="down">&#9660; ${e.tipo=="banca"?"Colomba":"Sotto"}</span><span><b class="down">${V} pi&ugrave; debole</b>: ${esc(s.basso)}</span></div>`):""}
   ${r?`<div class="epreaz">Reazione tipica <b class="${LIV[r.livello][1]}">${LIV[r.livello][0]}</b> <span class="small">${r.quota}% delle ultime ${r.n} uscite</span></div>`:""}`;};
  let aperto=null;
  const mostra=el=>{const e=ev[+el.dataset.i];if(!e)return;pop.innerHTML=testo(e);pop.className="evpop"+(e.tipo=="banca"?" banca":"");pop.hidden=false;aperto=el;
   // dentro i bordi del riquadro eventi (mai sopra la barra laterale), e comunque dentro lo schermo
   const r=el.getBoundingClientRect(),c=nastro.closest(".card").getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,M=12;
   const sx=Math.max(M,c.left),dx=Math.min(innerWidth-M,c.right);
   let L=Math.min(Math.max(sx,r.left+r.width/2-w/2),dx-w),T=r.bottom+10;L=Math.max(M,L);
   if(T+h>innerHeight-M)T=Math.max(M,r.top-h-10);                     // poco spazio sotto: sopra la pillola
   pop.style.left=L+"px";pop.style.top=T+"px";};
  const nascondi=()=>{pop.hidden=true;aperto=null;};
  nastro.addEventListener("pointerover",e=>{if(e.pointerType!="mouse"||trascina)return;const el=e.target.closest(".evp");if(el&&el!==aperto)mostra(el);});
  nastro.addEventListener("pointerleave",e=>{if(e.pointerType=="mouse")nascondi();});
  nastro.addEventListener("click",e=>{if(mosso>6)return;const el=e.target.closest(".evp");if(!el)return;
   if(aperto===el&&matchMedia("(hover:none)").matches){nascondi();return;}mostra(el);sopra=true;});   // tocco: si ferma per leggere
  document.addEventListener("pointerdown",e=>{if(aperto&&!e.target.closest(".evp,#evpop")){nascondi();sopra=false;}});
  addEventListener("scroll",()=>{if(aperto&&matchMedia("(hover:none)").matches){nascondi();sopra=false;}},{passive:true});
  document.addEventListener("keydown",e=>{if(e.key=="Escape")nascondi();});
  // il fumetto segue la pillola mentre il nastro rallenta e si ferma
  (function segui(){if(aperto&&!pop.hidden&&aperto.isConnected)mostra(aperto);requestAnimationFrame(segui);})();}
}catch(e){fail("Prossimi eventi","eventi",e);}
/* v9.48 (Ya) SETTORI E FOREX RIDISEGNATI: prima erano riquadri pieni di testo ("3 in acquisto · 0 in vendita").
   SETTORE: icona + nome + punteggio medio, barra che parte dal centro (sinistra = vendono, destra = comprano) e
   composizione dei mercati del settore in una barra a tre colori (in acquisto / neutri / in vendita).
   FOREX: un solo riquadro con la distribuzione delle coppie sulle 5 etichette (barra a segmenti + legenda).
   Stessi numeri di prima (media dei punteggi, soglie M.normal / M.strong), solo un altro disegno. */
const SEC_IC={"Valute":'<path d="M17 7.5A6 6 0 1 0 17 16.5M4.5 10.5h9M4.5 13.5h9"/>',"Indici azionari":'<path d="M3 17l5-5 4 3 8-8M15 7h5v5"/>',
 "Tassi USA":'<path d="M19 5L5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>',
 "Energia":'<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.6 2.5 3-.5-3 .2-5.5 0-8z"/>',
 "Metalli":'<path d="M4 17l3-8h10l3 8zM9 9l1.5-4h3L15 9"/>',"Cereali":'<path d="M12 21V9M12 13c-3 0-4.5-2-4.5-4.5C10 8.5 12 10 12 13zm0 0c3 0 4.5-2 4.5-4.5C14 8.5 12 10 12 13zM12 9c-2 0-3-1.5-3-3.5C11 5.5 12 7 12 9zm0 0c2 0 3-1.5 3-3.5C13 5.5 12 7 12 9z"/>',
 "Soft":'<path d="M6 18c-2-5 1-11 7-12 3-.5 5 1 5 1s.5 2-.5 5c-1.5 5-6.5 8-11.5 6zM6 18c3-4 6-7 10-9"/>',
 "Bestiame":'<path d="M5 8l-2-3M19 8l2-3M5 8h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5zM10 15h.01M14 15h.01"/>',
 "Crypto":'<path d="M9 5v14M13 5v2M13 17v2M7 7h7a3 3 0 0 1 0 6H7m0 0h8a3 3 0 0 1 0 6H7"/>'};
// v9.48 (Ya) DELTA IN VERTICALE: una colonna per settore, la barra sale (comprano) o scende (vendono) dalla linea
//   dello zero; sopra/sotto il punteggio medio, in basso icona, nome e quanti mercati sono in acquisto e in vendita.
//   Sul telefono (9 colonne non ci stanno) lo stesso grafico diventa una riga per settore, con la barra dal centro.
const SEC_BREVE={"Indici azionari":"Indici","Tassi USA":"Tassi USA"};
// SCALA FISSA (v9.48, Ya): 60 punti di media = barra piena (oltre si ferma al massimo). Cosi' la lunghezza ha lo stesso
//   significato ogni settimana: -28 sta a meta' corsa, non riempie la colonna solo perche' e' il valore piu' grande.
// SPAZI: il numero sta DENTRO la meta' della colonna, sopra (o sotto) la barra, in uno spazio riservato: non puo'
//   toccare la linea dello zero, l'icona o il nome, qualunque sia il valore (provato da -100 a +100).
// DEBUG (F12): ebSettori([{g:"Metalli",avg:-100,n:5,up:0,dn:5}, ...]) ridisegna con valori di prova.
const SEC_SCALA=60,meno=t=>String(t).replace("-","−");
function settori(righe){$("sectors").innerHTML=`<div class="secv" style="--cols:${righe.length}">`+righe.map(r=>{
  const hn=Math.min(1,Math.abs(r.avg)/SEC_SCALA).toFixed(3),pos=Math.round(r.avg)>=0,v=meno(fmt(r.avg));
  return `<div class="sec" data-g="${r.g}" data-v="${v}" role="button" tabindex="0" style="--bc:${COL[lab(r.avg*1.6)]}" title="${r.g}: ${v}">
   <div class="secv-area" style="--hn:${hn}"><div class="secv-meta su">${pos?`<span class="sec-n">${v}</span><i></i>`:""}</div><div class="secv-meta giu">${pos?"":`<i></i><span class="sec-n">${v}</span>`}</div></div>
   <span class="sec-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${SEC_IC[r.g]||""}</svg></span>
   <b>${SEC_BREVE[r.g]||r.g}</b><small><b class="su">${r.up}&#9650;</b> <b class="giu">${r.dn}&#9660;</b></small></div>`;}).join("")+`</div>`;
 document.querySelectorAll(".sec").forEach(x=>{x.onclick=()=>{go("assets");selS(x.dataset.g);};
  x.onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();x.click();}};});}
settori(SEC.filter(g=>byS[g]).map(g=>{const l=byS[g];
 return {g,avg:l.reduce((x,a)=>x+a.score,0)/l.length,n:l.length,up:l.filter(a=>a.score>=M.normal).length,dn:l.filter(a=>a.score<=-M.normal).length};}));
window.ebSettori=settori;
var L5=["STRONG BUY","BUY","NEUTRO","SELL","STRONG SELL"];
(function(){const n=L5.map(l=>D.pairs.filter(p=>p.label==l).length),tot=n.reduce((a,b)=>a+b,0)||1;
 $("summary").innerHTML=`<div class="fxd">
  <div class="fxd-t"><b>${tot}</b><span>${T("coppie")}</span></div>
  <div class="fxd-bar" aria-hidden="true">${L5.map((l,i)=>n[i]?`<i style="--bc:${COL[l]};flex:${n[i]}"></i>`:"").join("")}</div>
  <div class="fxd-leg">${L5.map((l,i)=>`<span class="${n[i]?"":"zero"}" style="--bc:${COL[l]}"><i></i><b>${n[i]}</b><small>${eti(l)}</small></span>`).join("")}</div></div>`;})();
/* v7.73 SCHEDA A SEGNALI: ogni scheda (coppia o strumento) e' una pila di righe, una per domanda:
     Grandi speculatori -> cosa stanno facendo (freccia su = comprano, giu' = vendono)
     Mercato            -> solo dove il modello macro esiste (niente piu' "n/d")
     Stagionalita'      -> cosa ha fatto di solito il prezzo nelle prossime 4 settimane (grigia se il dato non e' solido)
     Notizie            -> IN ATTESA prima del dato; dopo, l'esito misurato (solo forex). Vedi sgNews
   Colori: verde = su, rosso = giu', grigio = neutro, giallo = attenzione.
   DEBUG: sg("up","Prova","Testo","dettaglio") restituisce l'HTML di una riga. */
const SGI={up:'<path d="M12 19V5M6 11l6-6 6 6"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',flat:'<path d="M5 12h14"/>',av:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'};
function sg(c,nome,txt,dx,tip){return `<div class="sg ${c}"${tip?` title="${tip}"`:""}><span class="sgi"><svg viewBox="0 0 24 24" aria-hidden="true">${SGI[c]}</svg></span><div><small>${nome}</small><b>${txt}</b></div><em>${dx}</em></div>`;}
// numero con segno e punto delle migliaia sempre (toLocaleString in italiano non lo mette sotto 10.000)
const mig=n=>n==null||isNaN(n)?"n/d":(n>0?"+":n<0?"&minus;":"")+String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+$)/g,".");
const accenti=t=>String(t).replace(/([aeiou])'(?=\)|$)/g,(m,v)=>({a:"à",e:"è",i:"ì",o:"ò",u:"ù"}[v]));   // "Caffe'" -> "Caffè"
/* riga SPECULATORI di uno strumento: verso dal punteggio COT, a destra i contratti netti comprati/venduti */
function sgSpec(a){const c=verb(a.cot)[1];
 return sg(c,"Grandi speculatori",c=="up"?"Comprano":c=="down"?"Vendono":"Neutri",`${mig(a.d_net)} &middot; 1 sett.<br>${mig(a.d_net4)} &middot; 4 sett.`,
  `Contratti netti comprati (+) o venduti (&minus;) in 1 e in 4 settimane. COT Index ${a.idx}/100: quanto sono carichi rispetto agli ultimi 3 anni (0 = minimo, 100 = massimo)`);}
/* riga SPECULATORI di una coppia: verso della coppia, a destra cosa fanno sulle due valute */
function sgSpecP(p){const c=p.cot>=M.normal?"up":p.cot<=-M.normal?"down":"flat";
 const t=k=>{const v=verb((D.assets[k]||{score:0}).score)[1];return (v=="up"?"comprano ":v=="down"?"vendono ":"neutri su ")+k;};
 return sg(c,"Grandi speculatori",c=="up"?"Puntano al rialzo":c=="down"?"Puntano al ribasso":"Neutri",`${t(p.base)}<br>${t(p.quote)}`);}
/* riga MERCATO: compare solo se il modello macro esiste e spiega lo strumento. Sotto 25 punti = mossa gia' fatta. */
function sgMerc(mac,mkt){if(mac==null||(mkt&&/spiega poco/.test(mkt.status||"")))return "";
 if(Math.abs(mac)<25)return sg("flat","Mercato","Gi&agrave; scontato","il prezzo ha gi&agrave; fatto<br>la sua mossa");
 const top=mkt&&mkt.top&&mkt.top[0]?`pesa di pi&ugrave;:<br>${esc(mkt.top[0].name)}`:"tassi e dati macro<br>davanti al prezzo";
 return sg(mac>0?"up":"down","Mercato",mac>0?"Spinge al rialzo":"Spinge al ribasso",top,"Tassi, dollaro e dati macro indicano un prezzo diverso da quello di oggi");}
/* riga STAGIONALITA' (prossime 4 settimane, vedi stagionalita.py): colorata solo se il dato storico e' solido */
function sgStag(st){if(!st)return "";
 if(!st.robusto)return sg("flat","Stagionalit&agrave;","Neutra","nessuna tendenza<br>nel prossimo mese");
 const su=st.score>0,k=su?st.su:st.n-st.su;
 return sg(su?"up":"down","Stagionalit&agrave;",su?"Tende a salire":"Tende a scendere",`${k} anni su ${st.n}<br>nel prossimo mese`,`Mediana delle prossime 4 settimane: ${st.med>=0?"+":""}${fx(st.med)}%`);}
/* riga NOTIZIE (v7.73): due soli stati, il resto non compare.
   1) IN ATTESA: c'e' un dato ad alto impatto entro 7 giorni sulle valute dello strumento (lampo giallo, giorno e ora di Roma)
   2) ESITO (solo coppie forex): dopo l'uscita, la reazione MISURATA dal motore notizie (notizie.py: movimento del tasso
      a 2 anni della valuta, che si dimezza ogni giorno) diventa FORTE RIALZO / RIALZO / NEUTRO / RIBASSO / FORTE RIBASSO.
      Soglie sul correttivo "adj" della coppia: sotto 5 punti = reazione nella norma, da 10 = molto marcata.
      Per materie prime, indici, tassi e crypto l'esito NON c'e': il legame dato -> prezzo non e' mai stato provato.
   Quali dati sono: solo al passaggio del mouse o toccando la riga (elenco .sgd), come chiesto.
   valute = ["USD"] per gli strumenti in dollari, [base, quotata] per una coppia; news = p.news della coppia (o niente). */
const AGE=((D.agenda||{}).eventi||[]).filter(e=>e.impatto=="high");
const fGiorno=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",weekday:"short",day:"numeric",month:"short"}),
      fOra=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit"}),
      fYmd=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome"});
const SGFRECCIA='<svg class="sgv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function sgNews(valute,news){const ora=Date.now(),G=864e5,tm=e=>Date.parse(e.utc||e.data+"T22:59Z"),nome=e=>esc(e.nome.replace(/\s*\(.*\)$/,""));
 const ev=AGE.filter(e=>valute.includes(e.valuta)&&!isNaN(tm(e))).sort((x,y)=>tm(x)-tm(y));
 const att=ev.filter(e=>!e.uscito&&tm(e)>ora-36e5&&tm(e)-ora<=7*G),usc=ev.filter(e=>e.uscito&&ora-tm(e)<=7*G);
 const quando=e=>`${fGiorno.format(tm(e))}${e.utc?" &middot; "+fOra.format(tm(e)):""}`;
 const elenco=`<ul class="sgd">${att.map(e=>`<li><b>${nome(e)}</b><span>${quando(e)}</span></li>`).join("")}${usc.map(e=>`<li><b>${nome(e)}</b><span>uscito ${fGiorno.format(tm(e))}</span></li>`).join("")}</ul>`;
 const riga=(c,txt,dx)=>`<div class="sg nw ${c}" title="Tocca per vedere quali dati" role="button" tabindex="0" aria-expanded="false"><span class="sgi"><svg viewBox="0 0 24 24" aria-hidden="true">${SGI[c]}</svg></span><div><small>Notizie</small><b>${txt}</b></div><em>${dx}</em>${SGFRECCIA}${elenco}</div>`;
 if(att.length){const t=tm(att[0]),d=Math.round((Date.parse(fYmd.format(t))-Date.parse(fYmd.format(ora)))/G);
  return riga("av","In attesa",`${quando(att[0])}<br>${d<=0?"oggi":d==1?"domani":"tra "+d+" giorni"}`);}
 if(news&&(news.eventi||[]).some(e=>e.z!=null)&&usc.length){const a=news.adj||0,f=Math.abs(a)>=10,c=Math.abs(a)<5?"flat":a>0?"up":"down";
  return riga(c,c=="flat"?"Neutro":(f?"Forte ":"")+(f?(a>0?"rialzo":"ribasso"):(a>0?"Rialzo":"Ribasso")),`dopo il dato<br>${Math.abs(a)<5?"reazione nella norma":f?"reazione molto forte":"reazione marcata"}`);}
 return "";}
/* un tocco sulla riga Notizie apre/chiude l'elenco dei dati SENZA aprire il grafico (fase di cattura: arriva prima del clic sulla scheda) */
document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest(".sg.nw");if(!r)return;
 e.stopPropagation();e.preventDefault();r.setAttribute("aria-expanded",r.classList.toggle("aperta"));},true);
document.addEventListener("keydown",e=>{const r=(e.key=="Enter"||e.key==" ")&&e.target.closest&&e.target.closest(".sg.nw");if(!r)return;
 e.stopPropagation();e.preventDefault();r.setAttribute("aria-expanded",r.classList.toggle("aperta"));},true);
/* PIEDE: etichette brevi (solo quelle vere), per il VIX la nota su cosa vuol dire comprare, e "Approfondisci":
   tutta la scheda apre gia' il grafico al clic, ma senza una scritta visibile nessuno lo scopriva.
   (per i tassi la nota e' gia' nella (i) del titolo "Tassi": qui sarebbe un doppione su ogni scheda) */
function piede(x,nota,nv){const t=[];
 if(x.div)t.push(`<span class="tag div" title="Una valuta comprata, l'altra venduta">Divergenza</span>`);
 if(x.crowded)t.push(`<span class="tag ko" title="Posizioni agli estremi: rischio di inversione">Affollato</span>`);
 if(x.comm_acc)t.push(`<span class="tag ${x.comm_acc=="conferma"?"ok":"ko"}" title="Chi usa la materia prima per lavoro (hedger), quando &egrave; agli estremi">Operatori commerciali ${x.comm_acc=="conferma"?"a favore":"in contrasto"}</span>`);
 return `<div class="piede">${t.length?`<div class="tags">${t.join("")}</div>`:""}${nota?`<p class="small">${nota}</p>`:""}<div class="pfondo">${nv||""}<span class="appr">Approfondisci<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></div>`;}
/* v7.95 "Nuovo segnale" in basso, piccolo, accanto ad "Approfondisci" (prima stava accanto all'etichetta):
   il segnale e' cambiato questa settimana (prima = etichetta della settimana scorsa) */
const nuovo=(x,prima)=>x.new?`<span class="nuovo" title="La settimana scorsa era: ${eti(prima)}"><i aria-hidden="true"></i>Nuovo segnale</span>`:"";
function card(p){return `<div class="card clic" data-tv="p:${p.pair}" title="Clic: grafico a candele"><div class="pairhead"><div><span class="pair">${p.pair}</span><div class="sotto">${badge(p.label)}</div></div>${anello(p.score)}</div>
 <div class="segni">${sgSpecP(p)}${sgMerc(p.macro,(D.assets[p.base]||{}).mkt)}${sgStag(p.stag)}${sgNews([p.base,p.quote],p.news)}</div>${piede(p,"",nuovo(p,p.prev))}</div>`;}
var act=D.pairs.filter(p=>p.label!="NEUTRO");
$("cards").innerHTML=act.length?act.map(card).join(""):`<div class="card">Nessun segnale attivo sulle valute questa settimana.</div>`;
function acard(a){const it=accenti(a.it||a.name);return `<div class="card clic" data-tv="a:${a.key}" title="Clic: grafico a candele"><div class="pairhead"><div><span class="pair" style="font-size:19px" title="${esc(it)}">${esc(it)}</span><div class="sotto">${badge(a.label)}</div></div>${anello(a.score)}</div>
 <div class="small sottot">${a.it&&a.it!=a.name?esc(a.name)+" &middot; ":""}${a.group}</div>
 <div class="segni">${sgSpec(a)}${sgMerc(a.macro,a.mkt)}${sgStag(a.stag)}${sgNews(["USD"])}</div>${piede(a,NOTE[a.key],nuovo(a,a.prev_label))}</div>`;}
var oth=Object.values(D.assets).filter(a=>a.group!="Valute"&&a.label!="NEUTRO").sort((x,y)=>Math.abs(y.score)-Math.abs(x.score));
// v6.72: una griglia per famiglia (stesso ordine dei titoli in pagina); famiglia senza segnali = riga breve
const FAM=[["ac-mp",["Energia","Metalli","Cereali","Soft","Bestiame"]],["ac-ind",["Indici azionari"]],["ac-tas",["Tassi USA"]],["ac-cry",["Crypto"]]];
FAM.forEach(([id,gr])=>{const el=$(id);if(!el)return;const v=oth.filter(a=>gr.includes(a.group));
 el.innerHTML=v.length?v.map(acard).join(""):`<div class="card vuota">Nessun segnale attivo questa settimana.</div>`;});
/* ANELLI ALLINEATI: il diametro dell'anello = altezza del blocco a sinistra (nome + pillola).
   ResizeObserver ricalcola quando la scheda diventa visibile, cambia larghezza o il nome va a capo. */
(function(){const allinea=sx=>{const a=sx.parentElement.querySelector(".anello"),h=Math.round(sx.getBoundingClientRect().height);
  if(a&&h>=40){a.style.width=a.style.height=h+"px";}};      // h<40: scheda nascosta o misura non pronta
 // requestAnimationFrame: la misura si applica al fotogramma dopo, cosi' il browser non entra in un ciclo di ridimensionamenti
 const ro=window.ResizeObserver?new ResizeObserver(v=>requestAnimationFrame(()=>v.forEach(x=>allinea(x.target)))):null;
 document.querySelectorAll(".pairhead").forEach(h=>{const sx=h.firstElementChild;if(!sx||!h.querySelector(".anello"))return;allinea(sx);if(ro)ro.observe(sx);});})();

/* v8.66 TORNATI NEUTRI (Ya, 22/11/2026): in fondo a ogni famiglia una riga compatta con i posizionamenti chiusi negli
   ultimi 7 giorni perche' tornati neutri (D.neutri7, dal registro: gli stessi annunciati su Telegram). Niente card
   intere (31 neutri sarebbero rumore): nome, da cosa veniva, durata e IL PERCHE' in una riga. Clic = grafico.
   Il perche' si legge dai dati di oggi: se il COT degli speculatori e' ancora nella stessa direzione la neutralita'
   viene dalla parte di mercato; altrimenti si dice cosa hanno fatto gli speculatori (alleggeriscono, ricoprono,
   aumentano le vendite, tornano ad acquistare) sulla valuta o sullo strumento che si e' mosso di piu'.
   v8.68 aperta a tutti dopo la prova del fondatore. */
(function(){
 const fai=()=>{const L=(D.neutri7||[]).filter(n=>{const p=D.pairs.find(x=>x.pair==n.s),a=D.assets[n.s];return (p||a)&&(p||a).label=="NEUTRO";});
  document.querySelectorAll(".neu7").forEach(x=>x.remove());if(!L.length)return;
  const ver=l=>/BUY/.test(l||"")?1:-1,ETI2={"STRONG BUY":"Forte rialzo",BUY:"Rialzo",SELL:"Ribasso","STRONG SELL":"Forte ribasso"};
  const NOR=(D.meta||{}).normal||25;
  // cosa hanno fatto gli speculatori su un singolo strumento/valuta nella direzione v
  const flusso=(a,v,su)=>{if(!a)return "";const dl=a.d_long||0,ds=a.d_short||0,dove=su?" su "+esc(su):"";
   if(v>0&&dl<0&&-dl>=Math.abs(ds))return "alleggeriscono gli acquisti"+dove;if(v>0&&ds>0)return "aumentano le vendite"+dove;
   if(v<0&&ds<0&&-ds>=Math.abs(dl))return "ricoprono le vendite"+dove;if(v<0&&dl>0)return "tornano ad acquistare"+dove;
   return "spinta esaurita"+dove;};
  const perche=n=>{const v=ver(n.prima),p=D.pairs.find(x=>x.pair==n.s);
   if(p){const cot=(p.cot||0)*v,mkt=(p.macro||0)*v;
    if(cot>=NOR&&mkt<0)return `COT ancora a favore (${fmt(p.cot)}), il mercato spinge contro`;
    const B=D.assets[p.base],Q=D.assets[p.quote],db=B?Math.abs((B.cot||0)-(B.cot_prev||0)):0,dq=Q?Math.abs((Q.cot||0)-(Q.cot_prev||0)):0;
    return "Speculatori: "+(db>=dq?flusso(B,v,p.base):flusso(Q,-v,p.quote));}
   const a=D.assets[n.s];if(!a)return "";const cot=(a.cot||0)*v,mkt=(a.macro||0)*v;
   if(cot>=NOR&&mkt<0)return `COT ancora a favore (${fmt(a.cot)}), il mercato spinge contro`;
   return "Speculatori: "+flusso(a,v,"");};
  const dur=n=>{const g=(new Date(n.q.replace("Z",":00Z"))-new Date((n.dal||n.q).replace("Z",":00Z")))/864e5;return g<1?"meno di 1 giorno":Math.round(g)+(Math.round(g)==1?" giorno":" giorni");};
  const riga=l=>`<div class="neu7"><div class="neu7-t">Tornati neutri negli ultimi 7 giorni</div><div class="neu7-l">${l.map(n=>{const p=D.pairs.find(x=>x.pair==n.s);
   return `<div class="neu7-i clic" data-tv="${p?"p:":"a:"}${esc(n.s)}" title="Clic: grafico a candele"><div class="neu7-h"><b>${esc(p?n.s:accenti((D.assets[n.s]||{}).it||n.s))}</b><span class="neu7-da v${ver(n.prima)>0?"su":"giu"}">era ${ETI2[n.prima]||eti(n.prima)}</span><span class="neu7-d">${dur(n)}</span></div><em>${perche(n)}</em></div>`;}).join("")}</div></div>`;
  const per={cards:[]};const FAMG=[["ac-mp",["Energia","Metalli","Cereali","Soft","Bestiame"]],["ac-ind",["Indici azionari"]],["ac-tas",["Tassi USA"]],["ac-cry",["Crypto"]]];
  L.forEach(n=>{if(D.pairs.some(x=>x.pair==n.s)){per.cards.push(n);return;}const g=(D.assets[n.s]||{}).group,f=FAMG.find(x=>x[1].includes(g));if(f)(per[f[0]]=per[f[0]]||[]).push(n);});
  Object.entries(per).forEach(([id,l])=>{const el=$(id);if(el&&l.length)el.insertAdjacentHTML("afterend",riga(l));});};
 fai();                                                  // v8.68 aperta a tutti (prima solo il fondatore)
})();
}catch(e){fail('Dashboard','sig',e);}

