/* ---------- 13c_candele.js - v8.84 GRAFICO DI UN SEGNALE: GIORNALIERO / ORARIO (scheda Live > I segnali di X) ----------
   Idea di Ya (23/11/2026): non e' un segnale da seguire, e' un MONITORAGGIO di come si muove il prezzo dopo ogni report
   COT e dopo ogni notizia che muove il mercato, prima e dopo il segnale. Due viste con lo switch:
     - GIORNALIERO = la storia (ultimi ~2 anni): fasce verdi/rosse dove gli speculatori spingevano (episodi di
       cot_radar/speculatori.py, anche quello in corso), tacche turchesi = uscite del report COT, punti gialli = notizie;
     - ORARIO = dal segnale a oggi: linee verticali all'ora esatta di ogni uscita COT, di ogni notizia, dell'ingresso e
       dell'uscita del segnale.
   COME SI USA (come TradingView): trascina per spostarti nel tempo; rotella del mouse, due dita o i pulsanti +/- per lo
   zoom; trascina la scala dei prezzi (a destra) in su o in giu' per allungare o schiacciare il grafico (poi trascinando
   il grafico si sposta anche in verticale); doppio clic sulla scala = scala automatica; pulsante ⟲ = vista iniziale;
   pulsante ⤢ = schermo intero (Esc o il tasto indietro per uscire). Tocco o passaggio su una candela = lettura sotto.
   v8.88 COME TRADINGVIEW, ANCHE DA TELEFONO (Ya, 23/11/2026: "sfarfalla, impreciso al tocco"):
     - scala dei prezzi con numeri tondi che restano fermi mentre ci si sposta, etichetta colorata dell'ultimo prezzo;
     - mirino: linea verticale + orizzontale e prezzo sulla scala (mouse: segue il puntatore; dito: tocco breve = legge
       la candela, dito fermo 0,35 s poi trascina = mirino che scorre candela per candela);
     - trascina orizzontale = sposta; verticale col dito fuori dallo schermo intero = scorre la pagina; due dita = zoom
       (il dito che resta continua a spostare); scala del tempo (sotto) trascinata in orizzontale = zoom;
     - la scala si adatta per gradi (niente salti) e il disegno aggiorna sempre lo stesso <svg> (niente lampi su iPhone).
   DATI (ramo "orari", scritti ogni notte da cot_radar/stagionalita_orari.py):
     - orarie:      pubblico/h1/<SIMBOLO>/<AAAA-MM>.json  {t0, b:[[ore dall'inizio del mese, o, h, l, c]]}
     - giornaliere: pubblico/d1/<SIMBOLO>.json             {d:[["AAAA-MM-GG", o, h, l, c]]}
     - notizie e uscite COT: D.reg.mon {ann:[[ora UTC, nome, valuta, (1 = ora indicativa)]], cot:[ore UTC]} (registro.py)
     - spinte degli speculatori: D.cmp.ep[strumento] = [[ingresso, uscita|null, verso, forte, settimane]] (comportamento.py)
   NOTIZIE PERTINENTI: coppia di valute -> le sue due valute; tutto il resto (indici, materie prime, crypto) -> USA
   (stessa regola di cot_radar/perche.py). Ore mostrate in ora di Roma. Se un file manca: messaggio, niente errore.
   DEBUG: F12 -> Console -> ebCandele.cache (file scaricati) */
(function(){try{
 const BASE_H=EB_RAW+"orari/pubblico/h1/",BASE_D=EB_RAW+"orari/pubblico/d1/";
 // strumento del registro -> simbolo delle candele (+ nota se e' un ETF che lo segue, non lo stesso prezzo)
 // v9.55 nota per OGNI ETF: il prezzo e' quello dell'ETF, non del future (l'oro con GLD vale circa un decimo dell'oncia)
 const SIM={GOLD:["GLD.US","ETF GLD sull'oro"],SILVER:["SLV.US","ETF SLV sull'argento"],SP500:["GSPC.INDX"],NASDAQ:["NDX.INDX","Nasdaq 100"],DOW:["DJI.INDX"],
  RUSSELL:["IWM.US","ETF IWM sul Russell 2000"],NIKKEI:["N225.INDX"],EM:["EEM.US","ETF EEM sui mercati emergenti"],EAFE:["EFA.US","ETF EFA su Europa, Australia ed Estremo Oriente"],BTC:["BTC-USD.CC"],ETH:["ETH-USD.CC"],
  WTI:["USO.US","ETF USO sul petrolio WTI"],NATGAS:["UNG.US","ETF UNG sul gas naturale"],COPPER:["CPER.US","ETF CPER sul rame"],
  // v8.79 cambi emergenti e Brent: file scritti dalla fase 5 di cot_radar/orari.py
  USDBRL:["USDBRL.FOREX"],USDMXN:["USDMXN.FOREX"],USDZAR:["USDZAR.FOREX"],BRENT:["BNO.US","ETF BNO sul petrolio Brent"],
  // v9.55 agricoli e benzina (fase 5 di cot_radar/orari.py): finche' i file non ci sono, la scheda usa TradingView
  CORN:["CORN.US","ETF CORN sul mais"],SOY:["SOYB.US","ETF SOYB sulla soia"],WHEAT:["WEAT.US","ETF WEAT sul grano"],
  SUGAR:["CANE.US","ETF CANE sullo zucchero"],GASOLINE:["UGA.US","ETF UGA sulla benzina"]};
 const FX=["EUR","GBP","AUD","NZD","USD","CAD","CHF","JPY"],VAL=["EUR","GBP","JPY","CHF","CAD","AUD","NZD","MXN","BRL","ZAR","USD"];
 function simbolo(k){if(SIM[k])return SIM[k];
  if(k&&k.length==6&&FX.includes(k.slice(0,3))&&FX.includes(k.slice(3)))return [k+".FOREX"];
  return null;}
 const valute=k=>k&&k.length==6&&VAL.includes(k.slice(0,3))&&VAL.includes(k.slice(3))?[k.slice(0,3),k.slice(3)]:["USD"];
 const cache={};                                     // url -> Promise(dati | null)
 const leggi=url=>cache[url]||(cache[url]=fetch(url).then(r=>r.ok?r.json():null).catch(()=>null));
 const mesi=(a,b)=>{const out=[];const d=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),1));
  while(d<=b){out.push(d.toISOString().slice(0,7));d.setUTCMonth(d.getUTCMonth()+1);}return out;};
 const ts=s=>s?Date.parse(s):NaN;
 const pcM=v=>v==null?"n/d":(v>0?"+":v<0?"−":"")+fx(Math.abs(v),2)+"%";   // v8.86 mossa in % (modalita' notizie)                     // "2026-11-13T20:30Z" (ISO, UTC)
 const ORA=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 const GIORNO=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",weekday:"short",day:"numeric"});
 const DGIORNO=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"});
 const DATA=new Intl.DateTimeFormat(EB_LOC,{timeZone:"UTC",weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
 const MESE=new Intl.DateTimeFormat(EB_LOC,{timeZone:"UTC",month:"short",year:"2-digit"});
 const GNUM=new Intl.DateTimeFormat(EB_LOC,{timeZone:"UTC",day:"numeric",month:"short"});
 const DNY=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"});
 // giorno di mercato di un istante (chiusura delle 17 di New York, come le candele giornaliere): sab/dom -> lunedi'
 const giornoDi=t=>{let d=new Date(DNY.format(t+7*36e5)+"T12:00Z");while(d.getUTCDay()%6==0)d=new Date(d.getTime()+864e5);return d.toISOString().slice(0,10);};
 const fmt=v=>{const a=Math.abs(v),d=a>=1000?1:a>=100?2:a>=10?3:a>=1?4:5;return v.toLocaleString(EB_LOC,{minimumFractionDigits:d,maximumFractionDigits:d});};
 const ICO={meno:'<path d="M6 12h12"/>',piu:'<path d="M6 12h12M12 6v12"/>',reset:'<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
  full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',esci:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'};
 const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;

 /* box = contenitore; z = riga del registro (strumento, generato, m.ingresso.utc, m.A.fine.utc, nt.ev) */
 window.ebCandele=function(box,z){try{
  // v8.86 z.opz = modalita' "notizie macro" (44b_notizie.js): {sym, nota, ann:[[ora UTC, driver, r1, r4, r24, x, dopo]], dal}
  // -> niente segnale, niente COT, niente fasce: solo candele e traccia di ogni notizia con la mossa della prima ora
  // v9.55 z.opz.scheda = SCHEDA DELLO STRUMENTO (12_grafico.js, al posto di TradingView): niente segnale, parte dal
  //   giornaliero, indicatori MA 50 / MA 200 / RSI 14 attivabili; O.manca() se le candele non ci sono (si torna a TradingView)
  const O=z.opz||{},NM=!!O.ann,SK=!!O.scheda,s=O.sym?[O.sym,O.nota]:simbolo(z.strumento),t0=ts(z.generato);
  if(!s||isNaN(t0)){box.innerHTML=`<p class="small vfc-v">Grafico non disponibile per questo strumento.</p>`;return;}
  const m=z.m||{},ing=ts((m.ingresso||{}).utc),fine=(m.A||{}).fine||{},aperto=!z.chiuso||(m.fine||{}).in_corso;
  const usc=aperto?NaN:ts(fine.utc);
  // notizie e uscite COT (registro); se il registro e' di una versione vecchia, solo le notizie dentro il trade
  const MON=(D.reg||{}).mon,VV=O.valute||valute(z.strumento);
  const ANN=NM?O.ann.map(a=>({t:ts(a[0]),n:a[1],r:a})):MON?MON.ann.filter(a=>VV.includes(a[2])).map(a=>({t:ts(a[0]),n:a[1]+(a[3]?" ~":"")}))
              :((z.nt||{}).ev||[]).map(e=>({t:ts(e.t),n:e.n+(e.x?" ~":"")}));
  const COT=NM?[]:MON?MON.cot.map(ts):SK?[]:[t0];
  // v9.55 O.inv: grafico quotato al contrario (valuta del COT mostrata come USDJPY): le fasce seguono il grafico
  const EP=NM?[]:(((D.cmp||{}).ep||{})[z.strumento]||[]).map(e=>({a:e[0],b:e[1],v:e[2]*(O.inv?-1:1),forte:!!e[3]}));
  const S={tf:SK?"d":"h",B:{},v:{},yz:1,yo:0,full:false,I:{},ind:{m50:true,m200:true,prof:false,rsi:false,atr:false,cot:true,cor:false}};   // stato: timeframe, candele, vista, scala, indicatori
  // v9.55 indicatori scelti: restano in questo browser (comodita' di chi guarda, mai dati importanti)
  if(SK)try{const v=JSON.parse(localStorage.getItem("ebInd")||"null");if(v&&typeof v=="object")for(const k in S.ind)if(typeof v[k]=="boolean")S.ind[k]=v[k];}catch(_){}
  box.innerHTML=`<div class="vfc-w${SK?" vfc-sk":""}"><div class="vfc-t">${SK?"":"<b>Grafico</b>"}${s[1]?`<span class="vfc-n">${esc(s[1])}</span>`:""}
    <div class="vfc-seg" role="group"><button type="button" data-tf="d"${SK?' class="on"':""}>Giornaliero</button><button type="button" data-tf="h"${SK?"":' class="on"'}>Orario</button></div>
    ${SK?`<div class="vfc-ind" role="group" aria-label="Indicatori">${[["m50","MA 50","Media mobile delle ultime 50 candele"],["m200","MA 200","Media mobile delle ultime 200 candele"],
     ["prof","Profilo","Profilo del prezzo: dove il prezzo e' rimasto piu' a lungo nella parte visibile"],["cot","COT","Posizione netta degli speculatori in % dei contratti aperti"],
     ["atr","ATR","Volatilita': movimento medio per candela in %, con il regime calma / normale / agitata"],["rsi","RSI","RSI a 14 candele: sopra 70 ipercomprato, sotto 30 ipervenduto"],
     ["cor","Correlazione","Correlazione a 60 sedute con il dollaro e con l'S&P 500 (solo giornaliero)"]].map(([k,t,ti])=>`<button type="button" data-i="${k}" title="${ti}">${t}</button>`).join("")}
     <details class="info vfc-ii"><summary title="Come leggere gli indicatori" aria-label="Informazioni">i</summary><div><b>MA 50 / MA 200</b>: medie mobili delle chiusure; sopra la MA 200 = tendenza di fondo al rialzo.
      <b>Profilo</b>: barre a sinistra = quanto tempo il prezzo e' rimasto a ogni livello nella parte visibile; zona piu' chiara = 70% del tempo; <b>POC</b> = il livello piu' frequentato. Il forex non ha un volume centrale, per questo si misura il tempo.
      <b>COT</b>: posizione netta degli speculatori in % dei contratti aperti, ricostruita dalle variazioni settimanali. Il dato &egrave; del marted&igrave; ma cambia sul grafico solo il venerd&igrave; dell'uscita, come le fasce: niente "senno di poi".
      <b>ATR</b>: movimento medio di una candela in % del prezzo (14 candele). Colore sotto la linea: <span class="vfc-c0">calma</span>, normale, <span class="vfc-c2">agitata</span> rispetto all'ultimo anno. Serve a dimensionare le posizioni, non &egrave; un segnale.
      <b>RSI</b>: forza delle ultime 14 candele; sopra 70 ipercomprato, sotto 30 ipervenduto.
      <b>Correlazione</b>: quanto si muove insieme al dollaro (ETF UUP) e all'S&P 500 nelle ultime 60 sedute: +1 insieme, &minus;1 al contrario, 0 indipendente.</div></details></div>`:""}
    <div class="vfc-btn"><button type="button" data-z="-1" title="Riduci" aria-label="Riduci">${ico("meno")}</button><button type="button" data-z="1" title="Ingrandisci" aria-label="Ingrandisci">${ico("piu")}</button><button type="button" data-r title="Ripristina la vista" aria-label="Ripristina la vista">${ico("reset")}</button><button type="button" data-f title="Schermo intero" aria-label="Schermo intero">${ico("full")}</button></div></div>
   <div class="vfc-leg"></div><div class="vfc-g"><p class="small vfc-v">Caricamento&hellip;</p></div>
   <div class="vfc-tip"><span>${matchMedia("(pointer:coarse)").matches?"Trascina per spostarti, due dita per lo zoom, dito fermo per il mirino":"Trascina per spostarti, rotella o due dita per lo zoom"}</span></div></div>`;
  const W0=box.querySelector(".vfc-w"),g=box.querySelector(".vfc-g"),tip=box.querySelector(".vfc-tip"),leg=box.querySelector(".vfc-leg");
  const vuoto=tip.innerHTML;

  // ---------- dati: orari dal segnale (una settimana prima) a oggi; giornalieri gli ultimi ~2 anni
  function carica(tf){
   if(S.B[tf])return Promise.resolve(S.B[tf]);
   if(tf=="h")return Promise.all(mesi(new Date(O.dal?Date.parse(O.dal):SK?Date.now()-45*864e5:t0-8*864e5),new Date()).map(me=>leggi(BASE_H+s[0]+"/"+me+".json"))).then(L=>{
     const B=[];for(const d of L){if(!d)continue;for(const r of d.b)B.push({t:(d.t0+r[0]*3600)*1000,o:r[1],h:r[2],l:r[3],c:r[4]});}
     B.sort((a,b)=>a.t-b.t);return S.B.h=B;});
   return leggi(BASE_D+s[0]+".json").then(d=>S.B.d=(d&&d.d||[]).map(r=>({t:Date.parse(r[0]+"T12:00Z"),g:r[0],o:r[1],h:r[2],l:r[3],c:r[4]})));}
  // vista iniziale: orario = la settimana del segnale; giornaliero = ultimi 6 mesi (3 da telefono)
  function vistaIniziale(tf){const B=S.B[tf],N=B.length;
   if(tf=="h"){let a=B.findIndex(x=>x.t>=t0-(NM?2:1)*864e5),b=B.findIndex(x=>x.t>=t0+(NM?3:6)*864e5);if(a<0)a=Math.max(0,N-120);if(b<0)b=N;
    if(b-a<20){a=Math.max(0,N-120);b=N;}return {i0:a,i1:b+1};}
   const n=Math.min(N,(S.full?innerWidth:g.clientWidth)<560?66:130);return {i0:N-n,i1:N+2};}
  function mostra(tf){S.tf=tf;S.yz=1;S.yo=0;S.ys=null;S.ci=null;
   W0.querySelectorAll("[data-tf]").forEach(b=>b.classList.toggle("on",b.dataset.tf==tf));
   leg.innerHTML=SK?legSK(tf):NM?(tf=="d"?`<span><i class="lg-ev"></i>Notizie</span>`:`<span><i class="lg-lev"></i>Notizie</span><span><i class="lg-rz"></i>Mossa della prima ora</span>`)
    :tf=="d"?`<span><i class="lg-su"></i>Speculatori comprano</span><span><i class="lg-giu"></i>vendono</span><span><i class="lg-cot"></i>Report COT</span><span><i class="lg-ev"></i>Notizie</span>`
    :`<span><i class="lg-lcot"></i>Report COT</span><span><i class="lg-lev"></i>Notizie</span><span><i class="lg-sgn"></i>Segnale</span><span><i class="lg-ling"></i>Ingresso</span>`;
   if(!S.B[tf])g.innerHTML=`<p class="small vfc-v">Caricamento&hellip;</p>`;
   carica(tf).then(B=>{if(S.tf!=tf)return;
    if((!B||B.length<3)&&SK&&tf=="d"&&O.manca){O.manca();return;}      // v9.55 niente candele: la scheda torna a TradingView
    if(!B||B.length<3){g.innerHTML=`<p class="small vfc-v">${tf=="h"?"Candele orarie non ancora disponibili (si aggiornano ogni notte).":"Candele giornaliere non ancora disponibili (si aggiornano ogni notte)."}</p>`;return;}
    if(!S.v[tf])S.v[tf]=vistaIniziale(tf);disegna();});}
  W0.querySelectorAll("[data-tf]").forEach(b=>b.onclick=e=>{e.stopPropagation();if(b.dataset.tf!=S.tf)mostra(b.dataset.tf);});
  // v9.55 legenda della scheda: fasce e tacche del COT, notizie e solo gli indicatori accesi (niente voci a vuoto)
  function legSK(tf){return (tf=="d"?`<span><i class="lg-su"></i>Speculatori comprano</span><span><i class="lg-giu"></i>vendono</span><span><i class="lg-cot"></i>Report COT</span><span><i class="lg-ev"></i>Notizie</span>`
    :`<span><i class="lg-lcot"></i>Report COT</span><span><i class="lg-lev"></i>Notizie</span>`)+
   "";}   // MA 50 / MA 200: il colore e' gia' sui pulsanti degli indicatori (niente voce doppia in legenda)
  // v9.55 INDICATORI calcolati una volta sola su tutte le candele del timeframe (non solo su quelle visibili:
  //   la MA 200 della prima candela a schermo usa le 199 precedenti). RSI 14 e ATR 14 con la media di Wilder, come TradingView.
  // v9.57 + ATR in % con regime (percentile dell'ATR sulle 250 candele prima: sotto 25% calma, sopra 75% agitata),
  //   posizione COT per candela (O.cot: [[martedi', % open interest]], l'ultimo dato uscito prima della candela)
  function indicatori(tf){if(S.I[tf])return S.I[tf];const B=S.B[tf]||[],N=B.length,ma=n=>{const o=new Array(N).fill(null);let sm=0;
    for(let i=0;i<N;i++){sm+=B[i].c;if(i>=n)sm-=B[i-n].c;if(i>=n-1)o[i]=sm/n;}return o;};
   const rsi=new Array(N).fill(null);let ag=0,al=0;
   for(let i=1;i<N;i++){const d=B[i].c-B[i-1].c,u=Math.max(d,0),w=Math.max(-d,0);
    if(i<=14){ag+=u/14;al+=w/14;if(i<14)continue;}else{ag=(ag*13+u)/14;al=(al*13+w)/14;}
    rsi[i]=al==0?100:100-100/(1+ag/al);}
   const atr=new Array(N).fill(null),reg=new Array(N).fill(null);let tr=0;
   for(let i=1;i<N;i++){const x=B[i],pc=B[i-1].c,v=Math.max(x.h-x.l,Math.abs(x.h-pc),Math.abs(x.l-pc));
    if(i<=14){tr+=v/14;if(i<14)continue;}else tr=(tr*13+v)/14;atr[i]=x.c?tr/x.c*100:null;}
   for(let i=40;i<N;i++){if(atr[i]==null)continue;const w=atr.slice(Math.max(0,i-250),i).filter(v=>v!=null);if(w.length<30)continue;
    const sotto=w.filter(v=>v<atr[i]).length/w.length;reg[i]=sotto<.25?0:sotto>.75?2:1;}
   const cot=new Array(N).fill(null),C=(O.cot||[]).slice().sort((p,q)=>p[0]<q[0]?-1:1);
   if(C.length){let k=-1;for(let i=0;i<N;i++){const g0=tf=="d"?B[i].g:new Date(B[i].t).toISOString().slice(0,10);
     while(k+1<C.length&&C[k+1][0]<=g0)k++;if(k>=0&&g0<=addGiorni(C[C.length-1][0],10))cot[i]=C[k][1];}}
   return S.I[tf]={m50:ma(50),m200:ma(200),rsi,atr,reg,cot};}
  const addGiorni=(g0,n)=>new Date(Date.parse(g0+"T12:00Z")+n*864e5).toISOString().slice(0,10);
  // v9.57 CORRELAZIONE a 60 sedute (solo giornaliero) con il dollaro (ETF UUP) e l'S&P 500, sui rendimenti giornalieri
  //   dei giorni presenti in tutte e due le serie. Le due serie si scaricano solo quando l'indicatore e' acceso.
  const RIF=[["usd","UUP.US","Dollaro"],["spx","GSPC.INDX","S&P 500"]];
  function correlazioni(){if(S.COR!==undefined||S.CORc)return;const B=S.B.d;if(!B||!B.length)return;S.CORc=true;
   Promise.all(RIF.map(r=>r[1]==s[0]?Promise.resolve(null):leggi(BASE_D+r[1]+".json"))).then(L=>{const B=S.B.d,N=B.length,out={};
    RIF.forEach(([k],j)=>{const d=L[j];if(!d||!d.d){out[k]=null;return;}const M=new Map(d.d.map(r=>[r[0],r[4]])),c=new Array(N).fill(null),xs=[],ys=[];
     for(let i=1;i<N;i++){const a=M.get(B[i].g),b=M.get(B[i-1].g);
      if(a&&b&&B[i-1].c){xs.push(B[i].c/B[i-1].c-1);ys.push(a/b-1);}else{c[i]=c[i-1];continue;}   // giorno senza dato: resta l'ultimo valore
      if(xs.length>60){xs.shift();ys.shift();}
      if(xs.length>=40){const n=xs.length,mx=xs.reduce((p,q)=>p+q,0)/n,my=ys.reduce((p,q)=>p+q,0)/n;let sxy=0,sxx=0,syy=0;
       for(let t=0;t<n;t++){const u=xs[t]-mx,v=ys[t]-my;sxy+=u*v;sxx+=u*u;syy+=v*v;}c[i]=sxx&&syy?sxy/Math.sqrt(sxx*syy):null;}}
     out[k]=c;});
    S.COR=out;S.CORc=false;ridisegna();}).catch(()=>{S.COR=null;S.CORc=false;});}
  if(SK){const aggiorna=()=>W0.querySelectorAll("[data-i]").forEach(b=>{b.classList.toggle("on",!!S.ind[b.dataset.i]);b.setAttribute("aria-pressed",!!S.ind[b.dataset.i]);});
   aggiorna();
   // v9.57 TELEFONO: al massimo 2 riquadri sotto le candele; accendendone un terzo si spegne quello acceso da piu' tempo
   S.ord=["cot","atr","rsi","cor"].filter(k=>S.ind[k]);
   if((box.clientWidth||innerWidth)<600)while(S.ord.length>2){S.ind[S.ord.shift()]=false;}   // anche all'apertura da telefono
   aggiorna();
   W0.querySelectorAll("[data-i]").forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.i;S.ind[k]=!S.ind[k];
    if(["cot","atr","rsi","cor"].includes(k)){S.ord=S.ord.filter(x=>x!=k);if(S.ind[k])S.ord.push(k);
     while(g.clientWidth<600&&S.ord.length>2){S.ind[S.ord.shift()]=false;}}
    aggiorna();
    try{localStorage.setItem("ebInd",JSON.stringify(S.ind));}catch(_){}leg.innerHTML=legSK(S.tf);ridisegna();});
   // il pulsante COT si nasconde se per lo strumento non c'e' la serie del COT
   if(!(O.cot&&O.cot.length)){const b=W0.querySelector('[data-i="cot"]');if(b)b.hidden=true;S.ind.cot=false;}}

  // ---------- geometria comune a disegno e gesti
  const G={};
  function misure(){const W=Math.max(280,g.clientWidth||600),full=S.full;
   // v9.55 nella scheda l'altezza la decide il contenitore (CSS: piu' alto su PC, ~metà schermo su telefono)
   //   il riquadro .vfc-g occupa lo spazio rimasto (flex) e il disegno prende esattamente la sua altezza
   const libero=SK&&!full?g.clientHeight:0;
   G.W=W;G.H=full?Math.max(260,innerHeight-W0.querySelector(".vfc-t").offsetHeight-leg.offsetHeight-tip.offsetHeight-70):libero>=200?Math.floor(libero):W<500?240:300;
   G.pl=6;G.pr=62;G.pt=24;G.pb=S.tf=="d"?34:22;
   // v9.57 RIQUADRI sotto le candele (stessa scala del tempo, 10 px tra uno e l'altro), nell'ordine COT, ATR, RSI,
   //   correlazione. Le candele tengono sempre almeno il 45% dell'altezza: con tanti riquadri accesi si stringono loro.
   let att=SK?["cot","atr","rsi","cor"].filter(k=>S.ind[k]&&(k!="cot"||(O.cot&&O.cot.length))):[];const lib=G.H-G.pt-G.pb;
   if(W<600&&att.length>2)att=att.filter(k=>(S.ord||[]).slice(-2).includes(k)).slice(0,2);   // telefono: gli ultimi 2 accesi
   W0.dataset.np=att.length;                                     // il CSS allunga il riquadro del grafico con i riquadri accesi
   let ph=att.length?Math.round(Math.max(44,Math.min(86,G.H*.17))):0;
   if(att.length&&lib-att.length*(ph+10)<lib*.45)ph=Math.max(34,Math.floor((lib*.55)/att.length-10));
   G.PW=G.W-G.pl-G.pr;G.PH=lib-att.length*(ph+10);
   G.panes=att.map((k,j)=>({k,y0:G.pt+G.PH+10+j*(ph+10),h:ph}));G.rh=0;}
  // limiti della vista: almeno 12 candele, al massimo tutte (+ un po' di spazio vuoto a destra, come TradingView)
  function limita(v,N){let n=v.i1-v.i0;n=Math.max(12,Math.min(N+12,n));
   if(v.i1-v.i0!=n){const c=(v.i0+v.i1)/2;v.i0=c-n/2;v.i1=c+n/2;}
   if(v.i0<-2){v.i1+=-2-v.i0;v.i0=-2;}if(v.i1>N+n*.2){v.i0-=v.i1-(N+n*.2);v.i1=N+n*.2;}}

  function disegna(){const B=S.B[S.tf];if(!B||!B.length)return;const v=S.v[S.tf],N=B.length,d=S.tf=="d";
   misure();limita(v,N);const {W,H,pl,pr,pt,pb,PW,PH}=G,n=v.i1-v.i0,cw=PW/n;
   const X=i=>pl+(i-v.i0+.5)*cw,a0=Math.max(0,Math.floor(v.i0)),a1=Math.min(N-1,Math.ceil(v.i1));
   const vis=B.slice(a0,a1+1);if(!vis.length)return;
   // scala verticale: automatica sulle candele visibili, poi allungata (yz) e spostata (yo) dall'utente
   let lo=Math.min(...vis.map(x=>x.l)),hi=Math.max(...vis.map(x=>x.h));const mid=(lo+hi)/2+S.yo;let half=(hi-lo)/2*1.08*S.yz||hi*.001;
   lo=mid-half;hi=mid+half;
   // v8.88 SCALA MORBIDA (telefono, Ya 23/11/2026: "sfarfalla"): mentre si trascina o si fa lo zoom la scala non salta
   // alla nuova misura in un colpo, ci va per gradi (35% a ogni fotogramma) e si ferma quando e' arrivata.
   if(S.ys&&(gesto||S.ys.anima)){const k=.35,dl=lo-S.ys.lo,dh=hi-S.ys.hi;
    if(Math.abs(dl)+Math.abs(dh)>(hi-lo)*.004){lo=S.ys.lo+dl*k;hi=S.ys.hi+dh*k;S.ys.anima=true;requestAnimationFrame(()=>ridisegna());}
    else S.ys.anima=false;}
   S.ys={lo,hi,anima:S.ys?S.ys.anima:false};G.lo=lo;G.hi=hi;G.cw=cw;
   const Y=p=>pt+(hi-p)/(hi-lo)*PH;
   // indice della candela che contiene l'istante t (orario) o il giorno g0 (giornaliero): ricerca binaria
   const idx=t=>{let a=0,b=N-1;if(t<=B[0].t)return 0;if(t>=B[N-1].t)return N-1;while(b-a>1){const c=(a+b)>>1;B[c].t<=t?a=c:b=c;}return a;};
   const idxG=g0=>{let a=0,b=N-1;while(b-a>1){const c=(a+b)>>1;B[c].g<=g0?a=c:b=c;}return B[b].g<=g0?b:a;};
   let svg=`<defs><clipPath id="vfcclip${esc(z.id)}"><rect x="${pl}" y="0" width="${PW}" height="${H}"/></clipPath></defs><g clip-path="url(#vfcclip${esc(z.id)})">`;
   // fasce degli speculatori (sotto a tutto): giornaliero e orario
   for(const e of EP){const ia=d?idxG(e.a):idx(Date.parse(e.a+"T00:00Z")),ib=e.b?(d?idxG(e.b):idx(Date.parse(e.b+"T23:59Z"))):N-1;
    if(ib<a0||ia>a1)continue;svg+=`<rect class="vfc-b ${e.v>0?"su":"giu"}${e.forte?" forte":""}" x="${X(ia)-cw/2}" y="${pt}" width="${(ib-ia+1)*cw}" height="${PH}"/>`;}
   // separatori e etichette del tempo (mai sovrapposte): mesi nel giornaliero (giorni se molto ingrandito), giorni nell'orario
   const fmtT=d?(n>45?x=>MESE.format(x.t):x=>GNUM.format(x.t)):x=>GIORNO.format(x.t),chiave=d?(n>45?x=>x.g.slice(0,7):x=>x.g):x=>DGIORNO.format(x.t);
   let prima=a0>0?chiave(B[a0-1]):"",ultEt=-99,ultSep=-99;
   for(let i=a0;i<=a1;i++){const x=B[i],k=chiave(x);if(k==prima)continue;prima=k;const xx=X(i)-cw/2;
    if(xx-ultSep>=(d&&n<=45?28:6)){ultSep=xx;svg+=`<line class="vfc-gd" x1="${xx}" x2="${xx}" y1="${pt}" y2="${H-pb}"/>`;}
    if(xx-ultEt>=52&&xx>pl-2&&xx<W-pr-34){ultEt=xx;svg+=`<text class="vfc-ax" x="${xx+3}" y="${d?H-pb+13:H-6}">${fmtT(x)}</text>`;}}
   const corpo=Math.max(1,Math.min(11,cw*.64));
   for(let i=a0;i<=a1;i++){const x=B[i],c=x.c>=x.o?"vfc-su":"vfc-giu",y1=Y(Math.max(x.o,x.c)),y2=Y(Math.min(x.o,x.c));
    svg+=`<line class="${c}" x1="${X(i)}" x2="${X(i)}" y1="${Y(x.h)}" y2="${Y(x.l)}"/><rect class="${c}" x="${X(i)-corpo/2}" y="${y1}" width="${corpo}" height="${Math.max(1,y2-y1)}"/>`;}
   const tMin=B[a0].t-(d?864e5:36e5),tMax=B[a1].t+(d?864e5:36e5);
   // etichetta di una linea: a destra della linea, oppure a sinistra se uscirebbe dal grafico (mai tagliata)
   const etichetta=(x,y,cl,nome,r1)=>{const extra=r1==null?"":" "+pcM(r1),w=(nome.length+extra.length)*6.3+4,sx=x+3+w>W-pr;
    return `<text class="vfc-lt ${cl}" x="${sx?x-3:x+3}" y="${y}"${sx?' text-anchor="end"':""}>${esc(nome)}${extra?`<tspan class="${r1>=0?"vfc-rs":"vfc-rg"}">${extra}</tspan>`:""}</text>`;};
   if(d){ // giornaliero: tacche COT sull'asse, punti delle notizie in basso, linee del segnale
    for(const t of COT){if(t<tMin||t>tMax)continue;const x=X(idxG(giornoDi(t)));svg+=`<line class="vfc-tk" x1="${x}" x2="${x}" y1="${H-pb}" y2="${H-pb+5}"/>`;}
    for(const a of ANN){if(a.t<tMin||a.t>tMax)continue;svg+=`<circle class="vfc-pt" cx="${X(idxG(giornoDi(a.t)))}" cy="${H-5}" r="2.6"/>`;}
    for(const [t,cl,nome] of [[ing,"ing","Ingresso"],[usc,"usc","Uscita"]]){if(isNaN(t)||t<tMin||t>tMax)continue;const x=X(idxG(giornoDi(t)));
     svg+=`<line class="vfc-l ${cl}" x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}"/>`+etichetta(x,pt-7,cl,nome);}
   }else{ // orario: linee all'ora esatta (COT, notizie, ingresso, uscita), etichette sfalsate se vicine
    // "Segnale" = quando il terminale ha registrato il segnale (COT 70% + mercato 30%: non sempre coincide con l'uscita del COT)
    const L=[];for(const t of COT)if(t>=tMin&&t<=tMax)L.push([t,"cot","COT"]);
    for(const a of ANN)if(a.t>=tMin&&a.t<=tMax){L.push([a.t,"ev",a.n,a.r&&a.r[2]]);
     // v8.86 traccia della reazione: barretta dalla chiusura dell'ora prima alla chiusura della candela della notizia
     if(a.r){const k=idx(a.t);if(k>0&&B[k].t<=a.t&&a.t<B[k].t+36e5){const x=X(k)+cw*.55;
      svg+=`<line class="vfc-rz ${B[k].c>=B[k-1].c?"su":"giu"}" x1="${x}" x2="${x}" y1="${Y(B[k-1].c)}" y2="${Y(B[k].c)}"/>`;}}}
    for(const [t,cl,nome] of (NM?[]:[[t0,"sgn","Segnale"],[ing,"ing","Ingresso"],[usc,"usc","Uscita"]]))if(!isNaN(t)&&t>=tMin&&t<=tMax)L.push([t,cl,nome]);
    let ux=-99,r=0;L.sort((p,q)=>p[0]-q[0]).forEach(([t,cl,nome,r1])=>{const k=idx(t),x=X(k+Math.max(0,Math.min(1,(t-B[k].t)/36e5))-.5);r=x-ux<48?(r+1)%3:0;ux=x;
     svg+=`<line class="vfc-l ${cl}" x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}"/>`+etichetta(x,pt-7+r*11,cl,nome,r1);});}
   // v9.55/v9.57 INDICATORI: MA e profilo sulle candele, riquadri sotto (COT, ATR, RSI, correlazione)
   let destra="";                                               // etichette sulla scala di destra (disegnate fuori dal ritaglio)
   if(SK){const I=indicatori(S.tf),linea=(arr,yf)=>{let dd="",su=false;for(let i=a0;i<=a1;i++){const v=arr[i];if(v==null){su=false;continue;}
      dd+=(su?"L":"M")+X(i).toFixed(1)+" "+yf(v).toFixed(1);su=true;}return dd;};
    // PROFILO DEL PREZZO: tempo passato a ogni livello nelle candele visibili (ogni candela pesa 1, distribuita sul suo range)
    if(S.ind.prof){const nb=Math.max(20,Math.min(60,Math.round(PH/9))),bh=(hi-lo)/nb,w=new Array(nb).fill(0);
     for(let i=a0;i<=a1;i++){const x=B[i],r=Math.max(x.h-x.l,bh*.01);
      for(let b=Math.max(0,Math.floor((x.l-lo)/bh));b<=Math.min(nb-1,Math.floor((x.h-lo)/bh));b++){const da=lo+b*bh,ab=da+bh;w[b]+=Math.max(0,Math.min(ab,x.h)-Math.max(da,x.l))/r;}}
     const tot=w.reduce((p,q)=>p+q,0),mx=Math.max(...w);
     if(tot>0){const ord=w.map((v,b)=>[v,b]).sort((p,q)=>q[0]-p[0]),va=new Set();let acc=0;for(const [v,b] of ord){if(acc>=tot*.7)break;va.add(b);acc+=v;}
      const poc=ord[0][1],larg=PW*.22;
      for(let b=0;b<nb;b++){if(!w[b])continue;const y1=Y(lo+(b+1)*bh),y2=Y(lo+b*bh);
       svg+=`<rect class="vfc-pf${va.has(b)?" va":""}" x="${pl}" y="${(y1+.5).toFixed(1)}" width="${(w[b]/mx*larg).toFixed(1)}" height="${Math.max(1,y2-y1-1).toFixed(1)}"/>`;}
      const yp=Y(lo+(poc+.5)*bh);svg+=`<line class="vfc-poc" x1="${pl}" x2="${W-pr}" y1="${yp}" y2="${yp}"/><text class="vfc-pt2" x="${pl+4}" y="${yp-4}">POC</text>`;}}
    if(S.ind.m200)svg+=`<path class="vfc-ma m200" d="${linea(I.m200,Y)}"/>`;
    if(S.ind.m50)svg+=`<path class="vfc-ma m50" d="${linea(I.m50,Y)}"/>`;
    const tag=(y,txt,cl)=>`<rect class="vfc-rt ${cl}" x="${W-pr+1}" y="${(y-9).toFixed(1)}" width="${pr-2}" height="18" rx="3"/><text class="vfc-rtt" x="${W-pr+6}" y="${(y+4).toFixed(1)}">${txt}</text>`;
    const ult=arr=>{for(let i=Math.min(N-1,a1);i>=a0;i--)if(arr[i]!=null)return arr[i];return null;};
    for(const P of G.panes||[]){const r0=P.y0,h=P.h,TXT=t=>`<text class="vfc-rl" x="${pl+4}" y="${r0+12}">${t}</text>`;
     svg+=`<rect class="vfc-rb" x="${pl}" y="${r0}" width="${PW}" height="${h}"/>`;
     if(P.k=="rsi"){const YR=v=>r0+(100-v)/100*h,u=ult(I.rsi);
      svg+=`<rect class="vfc-rz7" x="${pl}" y="${YR(70)}" width="${PW}" height="${YR(30)-YR(70)}"/><line class="vfc-r37" x1="${pl}" x2="${W-pr}" y1="${YR(70)}" y2="${YR(70)}"/><line class="vfc-r37" x1="${pl}" x2="${W-pr}" y1="${YR(30)}" y2="${YR(30)}"/>`+
       `<path class="vfc-rsi" d="${linea(I.rsi,YR)}"/>`+TXT("RSI 14");
      destra+=(h>=50?`<text class="vfc-ax" x="${W-pr+6}" y="${YR(70)+4}">70</text><text class="vfc-ax" x="${W-pr+6}" y="${YR(30)+4}">30</text>`:"")+(u!=null?tag(YR(u),fx(u,0),"rsi"+(u>=70||u<=30?" alto":"")):"");}
     if(P.k=="atr"){let m=0;for(let i=a0;i<=a1;i++)if(I.atr[i]!=null)m=Math.max(m,I.atr[i]);m=m*1.15||1;const YA=v=>r0+h-(v/m)*(h-14),u=ult(I.atr);
      // regime: striscia colorata alla base, una cella per candela
      for(let i=a0;i<=a1;i++){const rg=I.reg[i];if(rg==null||rg==1)continue;svg+=`<rect class="vfc-rg${rg}" x="${(X(i)-cw/2).toFixed(1)}" y="${r0+h-4}" width="${(cw+.4).toFixed(1)}" height="4"/>`;}
      svg+=`<path class="vfc-atr" d="${linea(I.atr,YA)}"/>`+TXT(S.tf=="d"?"ATR 14 · % al giorno":"ATR 14 · % all'ora");
      if(u!=null)destra+=tag(YA(u),fx(u,2)+"%","atr");}
     if(P.k=="cot"){let m=0;for(let i=a0;i<=a1;i++)if(I.cot[i]!=null)m=Math.max(m,Math.abs(I.cot[i]));m=(m||1)*1.15;
      const YC=v=>r0+h/2-(v/m)*(h/2-6),z0=YC(0);let pos="",neg="",dd="",su=false,px=null;
      for(let i=a0;i<=a1;i++){const v=I.cot[i];if(v==null){su=false;continue;}const x=X(i)-cw/2,y=YC(v);
       dd+=(su?"H"+x.toFixed(1)+"V"+y.toFixed(1):"M"+x.toFixed(1)+" "+y.toFixed(1))+"H"+(x+cw).toFixed(1);su=true;
       const r=`<rect x="${x.toFixed(1)}" y="${Math.min(y,z0).toFixed(1)}" width="${(cw+.4).toFixed(1)}" height="${Math.abs(y-z0).toFixed(1)}"/>`;if(v>=0)pos+=r;else neg+=r;}
      const u=ult(I.cot);
      svg+=`<g class="vfc-cp">${pos}</g><g class="vfc-cn">${neg}</g><line class="vfc-r37" x1="${pl}" x2="${W-pr}" y1="${z0}" y2="${z0}"/><path class="vfc-cl" d="${dd}"/>`+TXT("Speculatori · % open interest");
      destra+=(h>=50?`<text class="vfc-ax" x="${W-pr+6}" y="${z0+4}">0</text>`:"")+(u!=null?tag(YC(u),(u>0?"+":"")+fx(u,1)+"%",u>=0?"su":"giu"):"");}
     if(P.k=="cor"){const YK=v=>r0+h/2-v*(h/2-6);
      svg+=`<line class="vfc-r37" x1="${pl}" x2="${W-pr}" y1="${YK(0)}" y2="${YK(0)}"/>`;
      if(S.tf!="d")svg+=TXT("Correlazione · solo nel grafico giornaliero");
      else{correlazioni();const C=S.COR;let et="";
       if(C)for(const [k,,nome] of RIF){if(!C[k])continue;svg+=`<path class="vfc-cor ${k}" d="${linea(C[k],YK)}"/>`;const u=ult(C[k]);et+=`<tspan class="vfc-k${k}"> ● </tspan>${nome}${u!=null?" "+(u>0?"+":"")+fx(u,2):""}`;}
       svg+=`<text class="vfc-rl" x="${pl+4}" y="${r0+12}">${W<600?"Correl. 60 s.":"Correlazione 60 sedute"}${C===undefined||S.CORc?" · carico…":C===null?" · non disponibile":""}${et}</text>`;
       if(h>=50)destra+=`<text class="vfc-ax" x="${W-pr+6}" y="${YK(1)+8}">+1</text><text class="vfc-ax" x="${W-pr+6}" y="${YK(0)+4}">0</text><text class="vfc-ax" x="${W-pr+6}" y="${YK(-1)}">&minus;1</text>`;}}}}
   svg+=`<line class="vfc-x" x1="0" x2="0" y1="${pt}" y2="${H-pb}" visibility="hidden"/><line class="vfc-y" x1="${pl}" x2="${W-pr}" y1="0" y2="0" visibility="hidden"/></g>`;
   // v8.88 SCALA DEI PREZZI COME TRADINGVIEW: livelli "tondi" (passo 1, 2 o 5 x 10^n, circa uno ogni 48 px) che restano
   // fermi mentre si sposta il grafico (prima 5 livelli calcolati sui bordi: i numeri cambiavano a ogni fotogramma)
   const grezzo=(hi-lo)/Math.max(2,PH/48),e10=Math.pow(10,Math.floor(Math.log10(grezzo))),r=grezzo/e10;
   let passo=(r<=1?1:r<=2?2:r<=5?5:10)*e10;
   // almeno 4 livelli visibili: se sono meno si scende al passo tondo piu' piccolo (5 -> 2 -> 1 -> 0,5 ...)
   const conta=q=>Math.floor(hi/q)-Math.ceil(lo/q)+1;
   for(let k=0;k<4&&conta(passo)<4;k++){const m=passo/Math.pow(10,Math.floor(Math.log10(passo)+1e-9));passo=passo*(m>4.9?.4:.5);}
   const dec=Math.max(0,-Math.floor(Math.log10(passo)+1e-9)+(String(+(passo/Math.pow(10,Math.floor(Math.log10(passo)+1e-9))).toFixed(1)).includes(".5")?1:0));G.dec=dec;
   const fmtA=v=>v.toLocaleString(EB_LOC,{minimumFractionDigits:dec,maximumFractionDigits:dec});
   // ultimo prezzo: linea tratteggiata ed etichetta colorata sulla scala (verde se l'ultima candela sale, rossa se scende)
   const U=B[N-1],yu=Y(U.c);
   // v9.55 il numero della scala sotto l'etichetta dell'ultimo prezzo non si scrive (prima si vedeva mezzo, coperto)
   for(let p=Math.ceil(lo/passo)*passo;p<=hi;p+=passo){const y=Y(p);if(y<pt+6||y>pt+PH-4)continue;
    svg+=`<line class="vfc-gr" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/>`+(Math.abs(y-yu)<15?"":`<text class="vfc-ax" x="${W-pr+6}" y="${y+4}">${fmtA(p)}</text>`);}
   if(yu>=pt&&yu<=pt+PH){const c=U.c>=U.o?"su":"giu";
    svg+=`<line class="vfc-ul ${c}" x1="${pl}" x2="${W-pr}" y1="${yu}" y2="${yu}"/><rect class="vfc-ut ${c}" x="${W-pr+1}" y="${yu-9}" width="${pr-2}" height="18" rx="3"/><text class="vfc-utt" x="${W-pr+6}" y="${yu+4}">${fmt(U.c)}</text>`;}
   svg+=destra;                                                 // v9.57 etichette dei riquadri sulla scala di destra
   // v9.58 timeframe scritto sul grafico (si legge anche quando la barra dei pulsanti e' fuori schermo)
   if(SK)svg+=`<text class="vfc-tfl" x="${pl+6}" y="${pt-8}">${d?"Giornaliero · 1 candela = 1 giorno":"Orario · 1 candela = 1 ora"}</text>`;
   // etichetta del mirino (prezzo dove sta il dito o il mouse): sopra a tutto
   svg+=`<g class="vfc-yt" visibility="hidden"><rect x="${W-pr+1}" y="-9" width="${pr-2}" height="18" rx="3"/><text x="${W-pr+6}" y="4"></text></g>`;
   svg+=`<rect class="vfc-asse" x="${W-pr}" y="${pt}" width="${pr}" height="${PH}"><title>Trascina in su o in giù per allungare il grafico · doppio clic: scala automatica</title></rect></svg>`;
   let el=g.querySelector("svg.vfc-s0");
   if(!el){g.innerHTML=`<svg class="vfc-s0" width="100%" role="img" aria-label="Grafico"></svg>`;el=g.firstChild;}
   el.setAttribute("viewBox",`0 0 ${W} ${H}`);el.setAttribute("height",H);el.innerHTML=svg.replace(/<\/svg>$/,"");
   G.X=X;G.B=B;G.a0=a0;G.a1=a1;
   // la linea della candela letta resta dove era (prima spariva a ogni ridisegno: tremolio)
   if(S.ci!=null&&S.ci>=a0&&S.ci<=a1)mirino();}
  // mirino stile TradingView: linea verticale sulla candela, linea orizzontale al prezzo, prezzo sulla scala
  function mirino(){const el=g.querySelector("svg.vfc-s0");if(!el||S.ci==null||!G.X)return;
   const cx=el.querySelector(".vfc-x"),cy=el.querySelector(".vfc-y"),ct=el.querySelector(".vfc-yt");
   if(cx){cx.setAttribute("x1",G.X(S.ci));cx.setAttribute("x2",G.X(S.ci));cx.setAttribute("visibility","visible");}
   if(S.cp==null||!cy||!ct)return;const y=G.pt+(G.hi-S.cp)/(G.hi-G.lo)*G.PH;
   if(y<G.pt||y>G.pt+G.PH){cy.setAttribute("visibility","hidden");ct.setAttribute("visibility","hidden");return;}
   cy.setAttribute("y1",y);cy.setAttribute("y2",y);cy.setAttribute("visibility","visible");
   ct.setAttribute("transform",`translate(0,${y})`);ct.querySelector("text").textContent=fmt(S.cp);   // precisione piena dello strumento (la scala usa i numeri tondi)
   ct.setAttribute("visibility","visible");}

  // ---------- lettura di una candela (data, prezzi, speculatori, notizie e COT di quella candela)
  function leggiCandela(px,py){const B=S.B[S.tf],v=S.v[S.tf];if(!B||G.cw==null)return;const d=S.tf=="d";
   const i=Math.max(G.a0,Math.min(G.a1,Math.round(v.i0+(px-G.pl)/G.cw-.5))),x=B[i];if(!x)return;S.ci=i;
   // prezzo del mirino: dove sta il mouse; col dito (tocco) la chiusura della candela, che e' quella che si legge
   S.cp=py!=null?G.hi-(py-G.pt)/G.PH*(G.hi-G.lo):x.c;mirino();
   const dentro=t=>d?giornoDi(t)==x.g:t>=x.t&&t<x.t+36e5,g0=d?x.g:new Date(x.t).toISOString().slice(0,10);
   const ep=EP.find(e=>g0>=e.a&&(!e.b||g0<=e.b)),na=ANN.filter(a=>dentro(a.t)),nn=na.map(a=>a.n),cc=COT.some(dentro);
   const rz=!d&&na.find(a=>a.r);                       // v8.86 modalita' notizie: la reazione misurata (cot_radar/impatto.py)
   tip.innerHTML=`<b>${d?DATA.format(x.t):ORA.format(x.t)}</b><span>A ${fmt(x.o)} · Max ${fmt(x.h)} · Min ${fmt(x.l)} · C <b class="${x.c>=x.o?"up":"down"}">${fmt(x.c)}</b></span>`+
    (ep?`<span class="${ep.v>0?"up":"down"}">${ep.v>0?"Speculatori: comprano":"Speculatori: vendono"}${ep.forte?" (spinta forte)":""}</span>`:"")+
    (nn.length?`<span class="vfc-tn">${nn.map(esc).join(", ")}</span>`:"")+
    (SK?(()=>{const I=indicatori(S.tf),q=[];if(S.ind.m50&&I.m50[i]!=null)q.push(`MA 50 ${fmt(I.m50[i])}`);if(S.ind.m200&&I.m200[i]!=null)q.push(`MA 200 ${fmt(I.m200[i])}`);
     if(S.ind.cot&&I.cot[i]!=null)q.push(`Speculatori ${I.cot[i]>0?"+":""}${fx(I.cot[i],1)}%`);
     if(S.ind.atr&&I.atr[i]!=null)q.push(`ATR ${fx(I.atr[i],2)}%${I.reg[i]==0?" (calma)":I.reg[i]==2?" (agitata)":""}`);
     if(S.ind.rsi&&I.rsi[i]!=null)q.push(`RSI <b class="${I.rsi[i]>=70||I.rsi[i]<=30?"vfc-rw":""}">${fx(I.rsi[i],0)}</b>`);
     if(S.ind.cor&&d&&S.COR)for(const [k,,nome] of RIF){const c=S.COR[k];if(c&&c[i]!=null)q.push(`${nome} ${c[i]>0?"+":""}${fx(c[i],2)}`);}
     return q.length?`<span>${q.join(" · ")}</span>`:"";})():"")+
    (rz?`<span>Prima ora <b class="${rz.r[2]>=0?"up":"down"}">${pcM(rz.r[2])}</b> (${fx(rz.r[5],1)}× la stessa ora) · 4 ore ${pcM(rz.r[3])} · 24 ore ${pcM(rz.r[4])}</span>`:"")+(cc?`<span class="vfc-tc">Report COT</span>`:"");}
  function nascondi(){S.ci=null;S.cp=null;g.querySelectorAll(".vfc-x,.vfc-y,.vfc-yt").forEach(x=>x.setAttribute("visibility","hidden"));tip.innerHTML=vuoto;}

  // ---------- gesti: trascina = sposta; due dita / rotella = zoom; scala prezzi = allunga; tocco = lettura
  let raf=0;const ridisegna=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;disegna();});};
  const zoom=(f,px)=>{const v=S.v[S.tf];if(!v||G.cw==null)return;if(S.ys)S.ys.anima=true;const a=v.i0+((px??G.pl+G.PW/2)-G.pl)/G.cw;v.i0=a-(a-v.i0)*f;v.i1=a+(v.i1-a)*f;ridisegna();};
  const P=new Map();let gesto=null;
  const pos=e=>{const r=g.getBoundingClientRect();return {x:(e.clientX-r.left)*G.W/r.width,y:(e.clientY-r.top)*G.H/r.height};};
  g.addEventListener("pointerdown",e=>{if(!S.v[S.tf]||G.W==null)return;const p=pos(e);P.set(e.pointerId,p);
   if(P.size==2){clearTimeout(S.tm);if(S.ci!=null)nascondi();const [a,b]=[...P.values()];gesto={tipo:"pinch",d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2};return;}
   // zona del tocco: scala dei prezzi (destra) = allunga in verticale; scala del tempo (sotto) = zoom orizzontale
   gesto={tipo:p.x>G.W-G.pr?"asse":p.y>G.H-G.pb?"tempo":"sposta",x:p.x,y:p.y,mosso:false,v:{...S.v[S.tf]},yz:S.yz,yo:S.yo,touch:e.pointerType!="mouse",id:e.pointerId};
   // v8.88 DITO FERMO 0,35 s = MIRINO (come TradingView da telefono): poi trascinando si legge candela per candela
   if(gesto.touch&&gesto.tipo=="sposta"){const gg=gesto;clearTimeout(S.tm);
    S.tm=setTimeout(()=>{if(gesto===gg&&!gg.mosso){gg.tipo="mirino";gg.mosso=true;try{g.setPointerCapture(gg.id);}catch(_){}leggiCandela(gg.x,gg.y);}},350);}});
  // v8.88 un dito che resta dopo lo zoom a due dita continua a spostare (prima si bloccava fino al rilascio)
  const nuovoSposta=(id,p)=>{gesto={tipo:"sposta",x:p.x,y:p.y,mosso:true,v:{...S.v[S.tf]},yz:S.yz,yo:S.yo,touch:true,id};};
  g.addEventListener("pointermove",e=>{if(G.W==null)return;const p=pos(e);
   if(!P.has(e.pointerId)){if(e.pointerType=="mouse"&&S.v[S.tf])leggiCandela(p.x,p.y);return;}
   P.set(e.pointerId,p);if(!gesto)return;
   if(gesto.tipo=="pinch"&&P.size==2){const [a,b]=[...P.values()],dd=Math.hypot(a.x-b.x,a.y-b.y);if(dd>10){zoom(gesto.d/dd,gesto.cx);gesto.d=dd;}return;}
   let dx=p.x-gesto.x,dy=p.y-gesto.y;
   if(gesto.tipo=="mirino"){leggiCandela(p.x,p.y);return;}
   if(!gesto.mosso){if(Math.hypot(dx,dy)<(gesto.touch?10:5))return;      // dito: 10 px di tolleranza = tocco preciso
    clearTimeout(S.tm);
    const vert=Math.abs(dy)>Math.abs(dx);
    // da telefono, fuori dallo schermo intero, un trascinamento verticale scorre la pagina (anche sulla scala dei prezzi)
    if(gesto.touch&&!S.full&&vert){P.delete(e.pointerId);gesto=null;return;}
    // sulla scala dei prezzi solo il gesto verticale allunga il grafico: in orizzontale si sposta come altrove;
    // sulla scala del tempo solo il gesto orizzontale fa lo zoom
    if(gesto.tipo=="asse"&&!vert)gesto.tipo="sposta";
    if(gesto.tipo=="tempo"&&vert)gesto.tipo="sposta";
    gesto.x=p.x;gesto.y=p.y;                                   // si parte da qui: niente scatto iniziale
    gesto.mosso=true;dx=0;dy=0;try{g.setPointerCapture(e.pointerId);}catch(_){}}
   if(gesto.touch&&S.ci!=null)nascondi();                     // trascinando col dito la lettura si chiude
   if(gesto.tipo=="asse"){S.yz=Math.max(.1,Math.min(20,gesto.yz*Math.exp(dy*.006)));ridisegna();return;}
   if(gesto.tipo=="tempo"){const v=S.v[S.tf],f=Math.exp(-dx*.006),dst=gesto.v.i1,n0=gesto.v.i1-gesto.v.i0;   // ancorato a destra
    v.i1=dst;v.i0=dst-n0*f;ridisegna();return;}
   const v=S.v[S.tf];v.i0=gesto.v.i0-dx/G.cw;v.i1=gesto.v.i1-dx/G.cw;
   if(S.yz!=1||gesto.yo)S.yo=gesto.yo+dy*(G.hi-G.lo)/G.PH;        // scala manuale: si sposta anche in verticale
   ridisegna();if(e.pointerType=="mouse")leggiCandela(p.x,p.y);});
  const rilascio=e=>{const p=P.get(e.pointerId);P.delete(e.pointerId);clearTimeout(S.tm);
   if(gesto&&gesto.tipo=="sposta"&&!gesto.mosso&&p)leggiCandela(p.x);
   if(gesto&&gesto.tipo=="pinch"&&P.size==1){const [[id,q]]=[...P.entries()];nuovoSposta(id,q);return;}
   if(!P.size){gesto=null;if(S.ys)S.ys.anima=true;ridisegna();}};   // a gesto finito la scala finisce di adattarsi
  g.addEventListener("pointerup",rilascio);g.addEventListener("pointercancel",e=>{clearTimeout(S.tm);P.delete(e.pointerId);if(!P.size)gesto=null;});
  // iPhone: mentre il dito sposta o fa lo zoom, la pagina sotto non deve muoversi (touch-action da solo non basta su Safari)
  g.addEventListener("touchmove",e=>{if(gesto&&(gesto.mosso||gesto.tipo=="pinch"||gesto.tipo=="mirino"))e.preventDefault();},{passive:false});
  // niente menu del tocco lungo (copia/salva immagine) sul grafico
  g.addEventListener("contextmenu",e=>{if(gesto&&gesto.touch)e.preventDefault();});
  g.addEventListener("pointerleave",e=>{if(e.pointerType=="mouse"&&!P.size)nascondi();});
  g.addEventListener("dblclick",e=>{const p=pos(e);if(p.x>G.W-G.pr){S.yz=1;S.yo=0;ridisegna();}});
  g.addEventListener("wheel",e=>{if(!S.v[S.tf]||G.W==null)return;e.preventDefault();const p=pos(e);
   if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){const v=S.v[S.tf],sh=e.deltaX/G.cw*.6;v.i0+=sh;v.i1+=sh;ridisegna();}
   else zoom(Math.exp(e.deltaY*.0015),p.x);},{passive:false});
  W0.querySelectorAll("[data-z]").forEach(b=>b.onclick=e=>{e.stopPropagation();zoom(b.dataset.z>0?.7:1/.7);});
  W0.querySelector("[data-r]").onclick=e=>{e.stopPropagation();if(!S.B[S.tf])return;S.yz=1;S.yo=0;S.ys=null;S.ci=null;S.v[S.tf]=vistaIniziale(S.tf);ridisegna();};

  // ---------- schermo intero (Esc, tasto indietro o lo stesso pulsante per uscire)
  const bf=W0.querySelector("[data-f]");
  function stile(on){S.full=on;W0.classList.toggle("vfc-full",on);document.documentElement.classList.toggle("vfcaperto",on);
   bf.innerHTML=ico(on?"esci":"full");bf.title=on?"Esci dallo schermo intero":"Schermo intero";bf.setAttribute("aria-label",bf.title);ridisegna();}
  const tasto=e=>{if(e.key=="Escape")esci(true);};
  const indietro=()=>esci(false);                     // tasto indietro del telefono/browser: la voce e' gia' tolta
  function esci(togliVoce){if(!S.full)return;removeEventListener("keydown",tasto);removeEventListener("popstate",indietro);stile(false);
   if(togliVoce){try{if(history.state&&history.state.vfcFull)history.back();}catch(_){}}}
  bf.onclick=e=>{e.stopPropagation();if(S.full){esci(true);return;}
   try{history.pushState({vfcFull:1},"");}catch(_){}addEventListener("keydown",tasto);addEventListener("popstate",indietro);stile(true);};
  // i clic dentro il grafico non devono chiudere la riga del segnale (13_verifica.js apre/chiude al clic sulla riga)
  W0.addEventListener("click",e=>e.stopPropagation());
  const ro=new ResizeObserver(()=>ridisegna());ro.observe(g);if(SK)ro.observe(box);
  mostra(SK?"d":"h");
 }catch(e){console.warn("[EdgeValor] grafico",e);box.innerHTML="";try{window.ebErrore&&ebErrore("Grafico candele",e);}catch(_){}}};
 window.ebCandele.cache=cache;
 window.ebCandele.simbolo=simbolo;          // v9.55 la scheda chiede se abbiamo le candele di uno strumento
}catch(e){console.warn("[EdgeValor] grafico",e);}})();
