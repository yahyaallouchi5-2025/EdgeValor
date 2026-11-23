/* ---------- 38_bussola_btc.js - v7.94 BUSSOLA MACRO DI BITCOIN (Premium), scheda dedicata "Bitcoin" (menu Mercati) ----------
   Dati: D.btcmacro da cot_radar/btc_macro.py, ricalcolato a ogni costruzione del sito (nessun numero scritto a mano):
     {agg, punteggio 0-3, fattori:[{k, nome, v3, unita, fav, verso, al, spark}], storico:{"0".."3":{media,pos,n}},
      dal, btc, btc3, serie:[[venerdi', prezzo, punteggio]], corr:{regime, spx:{ora,tipica,normale,stress}, oro:{...}},
      vecchio (true = fonti non disponibili oggi: e' l'ultimo calcolo valido)}
   LETTURA (studio del 17/11/2026, Bitcoin dal 2011): tre fattori macro anticipano il mese dopo di Bitcoin.
     Condizioni finanziarie in allentamento, dollaro in discesa, credito high yield in salita: ognuno vale un punto.
   DISEGNO (dall'alto):
     1) indicatore a semicerchio con il punteggio e la parola (Vento contrario / debole / a favore / forte)
        + tre riquadri, uno per fattore, con semaforo, variazione a 3 mesi e mini-grafico dell'ultimo anno;
     2) grafico di Bitcoin (3 anni, settimanale, scala logaritmica) con lo sfondo colorato dal punteggio di ogni settimana;
     3) a sinistra: barre "il mese dopo, per punteggio" (storia dal 2011, evidenziato il punteggio di oggi);
        a destra: "con chi si muove" = correlazione con S&P 500 e oro, ultime 52 settimane e tipica del regime attuale.
   Basic: lucchetto. Spiegazioni solo nella (i). DEBUG: F12 -> Console -> D.btcmacro */
try{(function(){const el=$("btc"),X=D.btcmacro;if(!el)return;
 // senza dati (PC senza chiave EODHD, primo giro) la scheda lo dice in una riga invece di restare vuota
 termometro(el);                                           // v7.94 termometro del sentiment: anche in Basic, anche senza bussola
 // senza dati della bussola: in Basic sono cifrati (lucchetto), in Premium arrivano al prossimo aggiornamento
 if(!X){el.insertAdjacentHTML("afterbegin",`<div class="bmsez"><h2>Bussola macro di Bitcoin</h2>${EB_PREMIUM?`<div class="card small" style="padding:18px 20px">I dati della bussola macro arrivano con il prossimo aggiornamento.</div>`
   :ebBlocco("Bussola macro di Bitcoin","Tre fattori macro, il punteggio di oggi e la storia dal 2011, con grafici.",{velo:true,righe:7})}</div>`);return;}
 const box=document.createElement("div");box.className="bmsez";
 // la scheda e' tutta della bussola: si mette in cima
 const metti=()=>{if(!el.contains(box))el.prepend(box);};     // la bussola sta sempre sopra al termometro
 const pc=(v,d=1)=>v==null?"n/d":(v>0?"+":"")+fx(v,d)+"%";
 const gg=d=>d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";
 const PAROLA=["Vento contrario","Vento debole","Vento a favore","Vento forte"];
 const COL=["var(--s)","var(--warn)","color-mix(in srgb,var(--b) 55%,var(--warn))","var(--b)"];     // colore di ogni punteggio
 const P=X.punteggio,S=X.storico||{};
 const valF=f=>f.v3==null?"n/d":f.unita=="pt"?(f.v3>0?"+":"")+fx(f.v3,2)+" pt":pc(f.v3);
 const titolo=`<h2>Bussola macro di Bitcoin <details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div>
  <b>Cosa misura</b>: tre fattori macro negli ultimi 3 mesi. Ognuno vale un punto quando &egrave; favorevole:
  <b>condizioni finanziarie</b> che si allentano (indice NFCI della Fed di Chicago in discesa), <b>dollaro</b> (DXY) in discesa,
  <b>credito high yield</b> (ETF HYG) in salita.<br><br>
  <b>Cosa dice la storia</b>: dal ${X.dal}, mese per mese, con 3 punti su 3 Bitcoin il mese dopo ha reso in media
  ${pc((S["3"]||{}).media)} (positivo ${(S["3"]||{}).pos}% dei mesi); con 0 punti ${pc((S["0"]||{}).media)} (${(S["0"]||{}).pos}%).
  Il risultato tiene nei periodi 2011-16, 2017-21 e 2022-26.<br><br>
  <b>Cosa non conta</b>: S&amp;P 500, Nasdaq, oro, tassi e decisioni della Fed non anticipano la direzione di Bitcoin.
  S&amp;P 500 e oro dicono solo <b>con chi si muove</b>: con l'S&amp;P 500 il legame &egrave; cresciuto dal 2020; con l'oro
  compare nei momenti di stress (VIX sopra 25 o S&amp;P 500 sotto la media a 200 giorni).<br><br>
  Statistica sul passato, non una previsione n&eacute; un consiglio di investimento.</div></details></h2>`;
 // --- 1) semicerchio del punteggio: 3 archi, accesi quelli guadagnati, lancetta sul punteggio
 function semicerchio(){const cx=110,cy=104,r=82,arco=(a0,a1)=>{const p=a=>[cx+r*Math.cos(Math.PI*(1-a)),cy-r*Math.sin(Math.PI*(1-a))];
   const [x0,y0]=p(a0),[x1,y1]=p(a1);return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;};
  // ogni arco ha sempre il suo colore (rosso -> verde) tenue; quelli guadagnati si accendono
  const CA=["var(--s)","var(--warn)","var(--b)"];
  const seg=[0,1,2].map(i=>`<path d="${arco(i/3+.012,(i+1)/3-.012)}" class="bmarc${i<P?" on":""}" style="stroke:${CA[i]}"/>`).join("");
  const a=Math.PI*(1-(P/3)),lx=cx+(r-26)*Math.cos(a),ly=cy-(r-26)*Math.sin(a);
  return `<svg class="bmgauge" viewBox="0 0 220 122" aria-hidden="true">${seg}<line x1="${cx}" y1="${cy}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" class="bmago"/><circle cx="${cx}" cy="${cy}" r="7" class="bmperno"/></svg>`;}
 // --- mini-grafico di un fattore (ultimo anno): linea + area, colore = semaforo del fattore
 function spark(v,fav){if(!v||v.length<3)return "";const W=160,H=40,lo=Math.min(...v),hi=Math.max(...v),x=i=>i*W/(v.length-1),y=t=>H-3-(t-lo)/((hi-lo)||1)*(H-6);
  const pts=v.map((t,i)=>`${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(" ");
  return `<svg class="bmspark ${fav?"si":"no"}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,${H} ${pts} ${W},${H}"/><polyline points="${pts}"/></svg>`;}
 // --- 2) Bitcoin 3 anni con lo sfondo colorato dal punteggio della settimana
 /* --- 2) GRAFICO (v7.95): prezzo settimanale in scala log, sfondo = punteggio macro della settimana.
        TOP e BOTTOM: massimi e minimi delle chiusure settimanali, trovati con uno "zigzag": un massimo conta quando
        dopo il prezzo scende di almeno il 20%, un minimo quando dopo sale di almeno il 20% (movimenti piccoli ignorati).
        Pallino finale = prezzo di oggi (X.btc); v9.02 l'etichetta sta a DESTRA del pallino, sulla colonna dei prezzi (come TradingView).  Legenda: ogni punteggio si accende/spegne con un tocco.
        Mouse o dito sul grafico: linea verticale tratteggiata con data, prezzo e punteggio della settimana. --- */
 const SPENTI=new Set();                 // punteggi nascosti dalla legenda (restano anche quando il grafico si ridisegna)
 let GR=null;                            // misure dell'ultimo grafico disegnato (servono al mirino)
 const kk=p=>"$"+(p>=1e5?Math.round(p/1000):fx(p/1000,1))+"k";          // es. $73,8k ; $124k
 const dataIt=d=>new Date(d+"T12:00:00").toLocaleDateString(EB_LOC,{day:"numeric",month:"short",year:"numeric"});
 function zigzag(Sr,soglia){const lg=Math.log,P=Sr.map(s=>s[1]),piv=[];let hi=0,lo=0,ult=null;
  for(let i=1;i<P.length;i++){
   if(P[i]>P[hi])hi=i;if(P[i]<P[lo])lo=i;
   // il pivot non ancora "chiuso" si sposta se il prezzo fa un nuovo estremo nella stessa direzione
   if(ult=="H"&&P[i]>P[piv[piv.length-1][1]]){piv[piv.length-1][1]=i;lo=i;continue;}
   if(ult=="L"&&P[i]<P[piv[piv.length-1][1]]){piv[piv.length-1][1]=i;hi=i;continue;}
   if(ult!="H"&&lg(P[hi])-lg(P[i])>=soglia){piv.push(["H",hi]);ult="H";lo=i;}
   else if(ult!="L"&&lg(P[i])-lg(P[lo])>=soglia){piv.push(["L",lo]);ult="L";hi=i;}}
  return piv.filter(v=>v[1]>0&&v[1]<P.length-1);}               // la prima settimana non e' un vero top/bottom; l'ultima ha il pallino di oggi
 function grafico(){const Sr=X.serie||[];if(Sr.length<10)return "";
  const W=Math.round(Math.min(900,Math.max(330,(box.clientWidth||900)-44))),H=W<600?236:290,L=6,R=70,T=24,B=28,lg=Math.log;
  const oggi=Number(X.btc)||Sr[Sr.length-1][1];
  const ys=Sr.map(s=>lg(s[1])).concat(lg(oggi)),lo=Math.min(...ys),hi=Math.max(...ys),x=i=>L+i*(W-L-R)/(Sr.length-1),y=v=>T+(hi-lg(v))/((hi-lo)||1)*(H-T-B);
  let fasce="",i0=0;for(let i=1;i<=Sr.length;i++)if(i==Sr.length||Sr[i][2]!=Sr[i0][2]){
   const a=i0?(x(i0-1)+x(i0))/2:L,b=i<Sr.length?(x(i-1)+x(i))/2:x(Sr.length-1);
   fasce+=`<rect x="${a.toFixed(1)}" y="${T}" width="${(b-a).toFixed(1)}" height="${H-T-B}" class="bmf${Sr[i0][2]}"/>`;i0=i;}
  const pts=Sr.map((s,i)=>`${x(i).toFixed(1)},${y(s[1]).toFixed(1)}`).join(" ");
  const oggi_y=y(oggi);
  // v9.02 prezzi dell'asse: si salta quello che finirebbe sotto l'etichetta del prezzo di oggi (stessa colonna a destra)
  const prezzi=[hi,(hi+lo)/2,lo].map(v=>Math.exp(v)).filter(p=>Math.abs(y(p)-oggi_y)>16).map(p=>`<text x="${W-R+12}" y="${y(p)+4}" class="bmt">$${Math.round(p/1000)}k</text>`).join("");
  const anni=Sr.map((s,i)=>i&&s[0].slice(0,4)!=Sr[i-1][0].slice(0,4)?`<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H-B}" class="bmg"/><text x="${x(i)+4}" y="${H-8}" class="bmt">${s[0].slice(0,4)}</text>`:"").join("");
  // top (sopra il punto) e bottom (sotto), etichetta tenuta dentro il grafico
  const piv=zigzag(Sr,Math.log(1.2)).map(([k,i])=>{const px=x(i),py=y(Sr[i][1]),ax=Math.min(Math.max(px,24),W-R-24);
   // v9.02 etichetta mai fuori dal riquadro: vicino al bordo alto/basso va accanto al punto (non copre gli anni)
   const fuori=k=="H"?py-9<T-6:py+17>H-B-2,tx=fuori?px+7:ax,ty=fuori?py+4:(k=="H"?py-9:py+17),an=fuori?"start":"middle";
   return `<g class="bmpv ${k=="H"?"top":"bot"}"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${an}">${kk(Sr[i][1])}</text></g>`;}).join("");
  const xo=x(Sr.length-1),yo=y(oggi);
  GR={Sr,x,y,W,H,T,B,L,R};
  return `<div class="bmgraf${[...SPENTI].map(k=>" off"+k).join("")}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bitcoin negli ultimi 3 anni con il punteggio macro di ogni settimana">
   <defs><linearGradient id="bmarea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ink)" stop-opacity=".16"/><stop offset="1" stop-color="var(--ink)" stop-opacity="0"/></linearGradient></defs>
   ${fasce}${anni}<polygon points="${x(0)},${H-B} ${pts} ${xo},${H-B}" fill="url(#bmarea)"/><polyline points="${pts} ${xo.toFixed(1)},${yo.toFixed(1)}" class="bml"/>
   ${piv}<g class="bmoggi"><circle cx="${xo}" cy="${yo}" r="5" class="bmp"/><rect x="${(xo+9).toFixed(1)}" y="${(yo-10).toFixed(1)}" width="56" height="20" rx="6"/><text x="${(xo+37).toFixed(1)}" y="${(yo+4).toFixed(1)}" text-anchor="middle">${kk(oggi)}</text></g>
   ${prezzi}<g class="bmmira" style="display:none"><line y1="${T}" y2="${H-B}"/><circle r="4"/></g></svg>
   <div class="bmtip" hidden></div>
   <div class="bmleg">${[3,2,1,0].map(k=>`<button type="button" class="bmlb${SPENTI.has(k)?" spento":""}" data-k="${k}" aria-pressed="${!SPENTI.has(k)}" title="Mostra o nascondi"><i class="bmf${k}"></i>${k} su 3</button>`).join("")}
    <details class="info bmleginfo"><summary title="Cosa sono" aria-label="Cosa sono i colori">i</summary><div>Il colore di sfondo &egrave; il <b>punteggio macro</b> di quella settimana: quanti dei 3 fattori della bussola erano favorevoli a Bitcoin.
     <b>3 su 3</b> = tutti favorevoli (storicamente il mese dopo &egrave; andato meglio), <b>0 su 3</b> = nessuno. Tocca una voce per nasconderla o mostrarla.<br><br>
     <b>Top e bottom</b>: massimi e minimi delle chiusure settimanali, solo dopo movimenti di almeno il 20%. Il pallino verde &egrave; il prezzo di oggi.</div></details>
    <em>Bitcoin settimanale, scala logaritmica</em></div></div>`;}
 // mirino: linea verticale tratteggiata sulla settimana piu' vicina al mouse/dito, con data, prezzo e punteggio
 function mirino(){const g=box.querySelector(".bmgraf");if(!g||!GR)return;const svg=g.querySelector("svg"),m=g.querySelector(".bmmira"),tip=g.querySelector(".bmtip");
  const L=m.querySelector("line"),C=m.querySelector("circle"),{Sr,x,y,W}=GR;
  const via=()=>{m.style.display="none";tip.hidden=true;};
  svg.addEventListener("pointermove",e=>{const r=svg.getBoundingClientRect(),vx=(e.clientX-r.left)*W/r.width;
   const i=Math.max(0,Math.min(Sr.length-1,Math.round((vx-GR.L)/((W-GR.L-GR.R)/(Sr.length-1))))),s=Sr[i],px=x(i),py=y(s[1]);
   L.setAttribute("x1",px);L.setAttribute("x2",px);C.setAttribute("cx",px);C.setAttribute("cy",py);m.style.display="";
   tip.innerHTML=`<b>$${Math.round(s[1]).toLocaleString(EB_LOC)}</b><span>settimana al ${dataIt(s[0])}</span><span class="bmtk" style="--c:${COL[s[2]]}">${s[2]} su 3</span>`;
   tip.hidden=false;const sx=px*r.width/W,sy=py*r.height/GR.H,tw=tip.offsetWidth,th=tip.offsetHeight;
   tip.style.left=Math.min(Math.max(sx-tw/2,0),r.width-tw)+"px";
   // il riquadro sta sotto il punto se il punto e' nella meta' alta, sopra se e' nella meta' bassa (non copre top e bottom vicini)
   tip.style.top=(sy<r.height/2?sy+16:sy-th-16)+"px";});
  svg.addEventListener("pointerleave",via);
  g.querySelectorAll(".bmlb").forEach(b=>b.onclick=()=>{const k=+b.dataset.k;SPENTI.has(k)?SPENTI.delete(k):SPENTI.add(k);
   g.classList.toggle("off"+k,SPENTI.has(k));b.classList.toggle("spento",SPENTI.has(k));b.setAttribute("aria-pressed",!SPENTI.has(k));});}
 // --- 3a) barre "il mese dopo, per punteggio"
 function barre(){const v=[0,1,2,3].map(k=>S[String(k)]);if(v.some(x=>!x))return "";
  const mx=Math.max(...v.map(x=>Math.abs(x.media)),1);   // la barra piu' lunga riempie meta' colonna
  return `<div class="bmbox"><h4>Il mese dopo, dal ${X.dal}</h4><div class="bmbars">${v.map((s,k)=>{const h=Math.max(3,Math.abs(s.media)/mx*48);
   return `<div class="bmbar${k==P?" ora":""}" title="${k} su 3: ${pc(s.media)} in media, positivo ${s.pos}% dei mesi (${s.n} mesi)">
    <b class="${s.media>=0?"up":"down"}">${pc(s.media)}</b><div class="bmcol"><i style="height:${h.toFixed(1)}%;${s.media>=0?"bottom:50%":"top:50%"};background:${COL[k]}"></i></div>
    <span>${k} su 3</span><small>${s.pos}% positivi</small></div>`;}).join("")}</div></div>`;}
 // --- 3b) "con chi si muove": correlazione da -1 a +1, pallino pieno = ultime 52 settimane, vuoto = tipica del regime
 function legami(){const C=X.corr;if(!C)return "";const pos=v=>((v+1)/2*100).toFixed(1);
  const riga=(nome,c)=>c&&c.ora!=null?`<div class="bmcr"><div class="bmcrn"><b>${nome}</b><span>${fx(c.ora,2)} <em>ultime 52 sett.</em></span></div>
   <div class="bmscala"><u></u>${c.tipica!=null?`<i class="tip" style="left:${pos(c.tipica)}%" title="Tipica nel regime attuale: ${fx(c.tipica,2)}"></i>`:""}<i class="ora" style="left:${pos(c.ora)}%"></i></div></div>`:"";
  return `<div class="bmbox"><h4>Con chi si muove <span class="bmreg ${C.regime}">${C.regime=="stress"?"Mercato in stress":"Mercato normale"}</span></h4>
   ${riga("S&amp;P 500",C.spx)}${riga("Oro",C.oro)}
   <div class="bmscl"><span>-1 opposti</span><span>0</span><span>+1 insieme</span></div>
   <p class="small bmnota"><i class="ora"></i>ultime 52 settimane <i class="tip"></i>tipica con mercato ${C.regime=="stress"?"in stress":"normale"}</p></div>`;}
 function disegna(){metti();
  if(!EB_PREMIUM){box.innerHTML=`${titolo}${ebBlocco("Bussola macro di Bitcoin","Tre fattori macro, il punteggio di oggi e la storia dal 2011, con grafici.",{velo:true,righe:7})}`;return;}
  box.innerHTML=`${titolo}<div class="card bm">
   <div class="bmtesta"><div class="bmver" style="--c:${COL[P]}">${semicerchio()}<div class="bmvtx"><b>${P} su 3</b><span>${PAROLA[P]}</span></div>
     <small>Bitcoin $${Number(X.btc).toLocaleString(EB_LOC)} &middot; 3 mesi <b class="${X.btc3>=0?"up":"down"}">${pc(X.btc3)}</b></small></div>
    <div class="bmfat">${X.fattori.map(f=>`<div class="bmfc ${f.fav?"si":"no"}"><div class="bmfch"><span>${esc(f.nome)}</span><em>${f.fav?"Favorevole":"Sfavorevole"}</em></div>
      <b>${valF(f)}</b><small>3 mesi &middot; favorevole se ${f.verso=="giu"?"scende":"sale"}</small>${spark(f.spark,f.fav)}</div>`).join("")}</div></div>
   ${grafico()}
   <div class="bmdue">${barre()}${legami()}</div>
   <p class="small bmpie">${X.vecchio?"Fonti non disponibili oggi: ultimo calcolo valido del ":"Dati al "}${gg(X.agg)}. Statistica sul passato, non un consiglio.</p></div>`;
  mirino();}
 disegna();new MutationObserver(metti).observe(el,{childList:true});
 let lw=0;new ResizeObserver(()=>{const w=box.clientWidth;if(w&&Math.abs(w-lw)>40){lw=w;disegna();}}).observe(box);
})();}catch(e){fail("Bussola macro di Bitcoin","btc",e);}

/* ---------- v7.94 TERMOMETRO DEL SENTIMENT (D.btcsent da btc_macro.sentimento, pubblico: lo vede anche Basic) ----------
   Fear & Greed Index (alternative.me, 0-100, v8.05: fonte citata in fondo alla scheda Crypto, 42_crypto.js, su richiesta di Ya) e COT CFTC sui
   futures Bitcoin del CME: indice 0-100 sulle ultime 52 settimane di piccoli trader (retail) e grandi speculatori.
   E' CONTESTO, non un segnale: lo studio (studi/studio_btc_sentiment.py) non ha trovato un effetto stabile. */
function termometro(el){const T=D.btcsent;if(!el||!T||(!T.fng&&!T.cot)||el.querySelector(".bmtm"))return;
 const gg=d=>d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";
 const parola=v=>v==null?"n/d":v<=20?"molto pessimisti":v>=80?"molto ottimisti":"nel mezzo";
 const fngCol=v=>v<25?"var(--s)":v<45?"var(--warn)":v<=55?"var(--n)":v<=75?"color-mix(in srgb,var(--b) 55%,var(--warn))":"var(--b)";
 const scala=(v,col)=>`<div class="bmts"><u></u><i style="left:${Math.max(0,Math.min(100,v))}%;--mc:${col}"></i></div><div class="bmtsl"><span>0</span><span>50</span><span>100</span></div>`;
 const spark=a=>{if(!a||a.length<3)return "";const W=300,H=46,x=i=>i*W/(a.length-1),y=v=>H-3-v/100*(H-6);
  const p=a.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="bmtsp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(50)}" y2="${y(50)}"/><polyline points="${p}"/></svg>`;};
 const F=T.fng,C=T.cot;
 const fng=F?`<div class="bmtbox"><div class="bmtt"><span>Fear &amp; Greed</span></div>
   <div class="bmtv"><b style="color:${fngCol(F.v)}">${F.v}</b><span style="color:${fngCol(F.v)}">${esc(F.cl||"")}</span></div>
   ${scala(F.v,fngCol(F.v))}${spark(F.serie)}<small>Ultimo anno &middot; dato del ${gg(F.d)}</small></div>`:"";
 const riga=(nome,x)=>x&&x.indice!=null?`<div class="bmtr"><div class="bmtrn"><b>${nome}</b><span>${x.indice}/100 &middot; ${parola(x.indice)}</span></div>${scala(x.indice,x.indice<=20?"var(--s)":x.indice>=80?"var(--b)":"var(--n)")}</div>`:"";
 const cot=C?`<div class="bmtbox"><div class="bmtt"><span>Futures Bitcoin (CME)</span><em>COT</em></div>
   ${riga("Piccoli trader",C.retail)}${riga("Grandi speculatori",C.spec)}<small>Posizione rispetto all'ultimo anno &middot; report del ${gg(C.d)}</small></div>`:"";
 const html=`<div class="bmtm"><h2>Termometro del sentiment <details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div>
  <b>Fear &amp; Greed</b>: umore del mercato crypto da 0 (paura estrema) a 100 (avidit&agrave; estrema).<br><br>
  <b>Futures Bitcoin del CME</b>: posizioni settimanali (COT). Il numero dice dove sono oggi rispetto all'ultimo anno: 0 = il punto pi&ugrave; pessimista, 100 = il pi&ugrave; ottimista.<br><br>
  <b>&Egrave; contesto, non un segnale</b>: nel nostro studio dal 2018 il sentiment non ha anticipato Bitcoin in modo stabile (la regola &laquo;compra con la paura estrema&raquo; ha funzionato nel 2018-21 e non nel 2022-26).
  Unico indizio coerente, ma piccolo: grandi speculatori molto ottimisti, mese dopo leggermente pi&ugrave; debole.</div></details></h2>
  <div class="bmtg">${fng}${cot}</div></div>`;
 el.insertAdjacentHTML("beforeend",html);}
