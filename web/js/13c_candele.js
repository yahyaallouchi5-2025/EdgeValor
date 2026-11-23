/* ---------- 13c_candele.js - v8.75 CANDELE ORARIE DI UN SEGNALE (scheda Live > I segnali di X) ----------
   Un tocco su un segnale apre il suo "perche'" (13_verifica.js) e, sotto, le candele orarie vere della settimana:
     - linea turchese  = la spinta degli speculatori (quando il segnale e' nato, report COT);
     - linea bianca    = ingresso (prima chiusura dopo il segnale);  linea grigia = uscita;
     - linee gialle    = annunci (Fed, NFP, CPI, BCE e le altre banche centrali) con la loro ora esatta.
   Dati: ramo "orari", file mensili pubblico/h1/<SIMBOLO>/<AAAA-MM>.json scritti ogni notte da
   cot_radar/stagionalita_orari.py (candele_mensili). Si scaricano solo i mesi che servono, una volta sola.
   Ore mostrate in ora di Roma (anche con l'ora legale). Se un mese non c'e' ancora: messaggio, niente errore.
   DEBUG: F12 -> Console -> ebCandele.cache */
(function(){try{
 const BASE=EB_RAW+"orari/pubblico/h1/";
 // strumento del registro -> simbolo delle candele orarie (+ nota se e' un ETF che lo segue, non lo stesso prezzo)
 const SIM={GOLD:["GLD.US"],SILVER:["SLV.US"],SP500:["GSPC.INDX"],NASDAQ:["NDX.INDX","Nasdaq 100"],DOW:["DJI.INDX"],
  RUSSELL:["IWM.US"],EM:["EEM.US"],EAFE:["EFA.US"],BTC:["BTC-USD.CC"],ETH:["ETH-USD.CC"],
  WTI:["USO.US","ETF USO sul petrolio WTI"],NATGAS:["UNG.US","ETF UNG sul gas naturale"],COPPER:["CPER.US","ETF CPER sul rame"],
  // v8.79 cambi emergenti e Brent: file scritti dalla fase 5 di cot_radar/orari.py (solo per queste candele)
  USDBRL:["USDBRL.FOREX"],USDMXN:["USDMXN.FOREX"],USDZAR:["USDZAR.FOREX"],BRENT:["BNO.US","ETF BNO sul petrolio Brent"]};
 const FX=["EUR","GBP","AUD","NZD","USD","CAD","CHF","JPY"];
 function simbolo(k){if(SIM[k])return SIM[k];
  if(k&&k.length==6&&FX.includes(k.slice(0,3))&&FX.includes(k.slice(3)))return [k+".FOREX"];
  return null;}
 const cache={};                                     // url -> Promise(dati | null)
 const leggi=url=>cache[url]||(cache[url]=fetch(url).then(r=>r.ok?r.json():null).catch(()=>null));
 const mesi=(a,b)=>{const out=[];const d=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),1));
  while(d<=b){out.push(d.toISOString().slice(0,7));d.setUTCMonth(d.getUTCMonth()+1);}return out;};
 const ts=s=>s?Date.parse(s):NaN;                     // "2026-11-13T20:30Z" (ISO, UTC)
 const ORA=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 const GIORNO=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",weekday:"short",day:"numeric"});
 const DGIORNO=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"});
 const fmt=v=>{const a=Math.abs(v),d=a>=1000?1:a>=100?2:a>=10?3:a>=1?4:5;return v.toLocaleString(EB_LOC,{minimumFractionDigits:d,maximumFractionDigits:d});};
 const SETT=7*864e5,MAXSETT=12;

 /* box = contenitore; z = riga del registro (strumento, generato, m.ingresso.utc, m.A.fine.utc, nt.ev) */
 window.ebCandele=function(box,z){try{
  const s=simbolo(z.strumento),t0=ts(z.generato);
  if(!s||isNaN(t0)){box.innerHTML=`<p class="small vfc-v">Candele orarie non disponibili per questo strumento.</p>`;return;}
  const m=z.m||{},ing=ts((m.ingresso||{}).utc),fine=(m.A||{}).fine||{},aperto=!z.chiuso||(m.fine||{}).in_corso;
  const usc=aperto?NaN:ts(fine.utc);
  const inizio=t0-864e5,fineVista=Math.min(isNaN(usc)?Date.now():usc+864e5,Date.now());
  const nS=Math.max(1,Math.min(MAXSETT,Math.ceil((fineVista-inizio)/SETT)));
  let sett=0;
  const linee=[[t0,"cot","Spinta COT"],[ing,"ing","Ingresso"],[usc,"usc","Uscita"]]
   .concat(((z.nt||{}).ev||[]).map(e=>[ts(e.t),"ev",e.n+(e.x?" ~":"")]));
  function disegna(){
   const a=inizio+sett*SETT,b=a+SETT;
   box.innerHTML=`<div class="vfc-t"><b>Candele orarie</b>${s[1]?`<span class="vfc-n">${esc(s[1])}</span>`:""}${nS>1?`<div class="vfc-s">${Array.from({length:nS},(_,i)=>`<button type="button" data-w="${i}" class="${i==sett?"on":""}">Sett. ${i+1}</button>`).join("")}</div>`:""}</div><div class="vfc-g"><p class="small vfc-v">Caricamento&hellip;</p></div>`;
   box.querySelectorAll(".vfc-s button").forEach(x=>x.onclick=e=>{e.stopPropagation();sett=+x.dataset.w;disegna();});
   const g=box.querySelector(".vfc-g");
   Promise.all(mesi(new Date(a),new Date(b)).map(me=>leggi(BASE+s[0]+"/"+me+".json"))).then(L=>{
    const barre=[];for(const d of L){if(!d)continue;for(const r of d.b){const t=(d.t0+r[0]*3600)*1000;if(t>=a&&t<b)barre.push([t,r[1],r[2],r[3],r[4]]);}}
    barre.sort((x,y)=>x[0]-y[0]);
    if(barre.length<3){g.innerHTML=`<p class="small vfc-v">Candele orarie non ancora disponibili per questa settimana (si aggiornano ogni notte).</p>`;return;}
    grafico(g,barre,linee.filter(l=>!isNaN(l[0])&&l[0]>=a&&l[0]<b));});}
  disegna();
 }catch(e){console.warn("[EdgeValor] candele",e);box.innerHTML="";}};
 window.ebCandele.cache=cache;

 /* candele in SVG: x per indice di barra (niente buchi nei weekend), y con un margine del 6% */
 function grafico(g,B,L){
  const W=Math.max(280,g.clientWidth||600),H=W<500?210:250,pl=6,pr=58,pt=18,pb=22,n=B.length;
  let lo=Math.min(...B.map(x=>x[3])),hi=Math.max(...B.map(x=>x[2]));const pad=(hi-lo)*.06||hi*.001;lo-=pad;hi+=pad;
  const cw=(W-pl-pr)/n,X=i=>pl+cw*(i+.5),Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  // posizione di un istante: la barra che lo contiene (o la prima dopo)
  const idx=t=>{let i=B.findIndex(x=>x[0]+3600e3>t);return i<0?n-1:i;};
  const corpo=Math.max(1,Math.min(9,cw*.62));
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Candele orarie">`;
  // griglia di prezzo (4 livelli) con le etichette a destra
  for(let k=0;k<=3;k++){const v=lo+(hi-lo)*(k+.5)/4,y=Y(v);svg+=`<line class="vfc-gr" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="vfc-ax" x="${W-pr+6}" y="${y+4}">${fmt(v)}</text>`;}
  // un'etichetta per giorno (ora di Roma), alla prima barra del giorno
  let prima="",ultimaEt=-99;B.forEach((x,i)=>{const d=DGIORNO.format(x[0]);if(d!=prima){prima=d;const xg=X(i)-cw/2;if(i>0)svg+=`<line class="vfc-gd" x1="${xg}" x2="${xg}" y1="${pt}" y2="${H-pb}"/>`;
   if(xg-ultimaEt>=44&&xg<W-pr-30){ultimaEt=xg;svg+=`<text class="vfc-ax" x="${xg+3}" y="${H-6}">${GIORNO.format(x[0])}</text>`;}}});   // etichette mai sovrapposte
  B.forEach((x,i)=>{const su=x[4]>=x[1],c=su?"vfc-su":"vfc-giu",y1=Y(Math.max(x[1],x[4])),y2=Y(Math.min(x[1],x[4]));
   svg+=`<line class="${c}" x1="${X(i)}" x2="${X(i)}" y1="${Y(x[2])}" y2="${Y(x[3])}"/><rect class="${c}" x="${X(i)-corpo/2}" y="${y1}" width="${corpo}" height="${Math.max(1,y2-y1)}"/>`;});
  // linee: spinta COT, ingresso, uscita, annunci (etichette in alto, sfalsate se vicine)
  let ultimaX=-99,riga=0;
  L.sort((p,q)=>p[0]-q[0]).forEach(([t,tipo,nome])=>{const x=X(idx(t));riga=x-ultimaX<46?(riga+1)%2:0;ultimaX=x;
   svg+=`<line class="vfc-l ${tipo}" x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}"/><text class="vfc-lt ${tipo}" x="${x+3}" y="${pt-5+riga*11}">${esc(nome)}</text>`;});
  svg+=`<line class="vfc-x" x1="0" x2="0" y1="${pt}" y2="${H-pb}" visibility="hidden"/></svg><div class="vfc-tip"><span>Passa sopra o tocca una candela per leggerla</span></div>`;
  g.innerHTML=svg;
  // lettura con mouse o dito: ora di Roma e prezzi della candela
  const el=g.querySelector("svg"),tip=g.querySelector(".vfc-tip"),cx=g.querySelector(".vfc-x");
  const mostra=ev=>{const r=el.getBoundingClientRect(),px=(ev.clientX-r.left)*W/r.width,i=Math.max(0,Math.min(n-1,Math.floor((px-pl)/cw)));
   const x=B[i];cx.setAttribute("x1",X(i));cx.setAttribute("x2",X(i));cx.setAttribute("visibility","visible");
   tip.innerHTML=`<b>${ORA.format(x[0])}</b><span>A ${fmt(x[1])} · Max ${fmt(x[2])} · Min ${fmt(x[3])} · C <b class="${x[4]>=x[1]?"up":"down"}">${fmt(x[4])}</b></span>`;};
  const vuoto=tip.innerHTML;                         // riga di lettura SOTTO il grafico: non copre mai le etichette
  el.addEventListener("pointermove",mostra);el.addEventListener("pointerdown",mostra);
  el.addEventListener("pointerleave",()=>{tip.innerHTML=vuoto;cx.setAttribute("visibility","hidden");});}
}catch(e){console.warn("[EdgeValor] candele",e);}})();
