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
 function grafico(){const Sr=X.serie||[];if(Sr.length<10)return "";
  const W=Math.round(Math.min(900,Math.max(330,(box.clientWidth||900)-44))),H=W<600?220:270,L=6,R=58,T=12,B=28,lg=Math.log;
  const ys=Sr.map(s=>lg(s[1])),lo=Math.min(...ys),hi=Math.max(...ys),x=i=>L+i*(W-L-R)/(Sr.length-1),y=v=>T+(hi-lg(v))/((hi-lo)||1)*(H-T-B);
  let fasce="",i0=0;for(let i=1;i<=Sr.length;i++)if(i==Sr.length||Sr[i][2]!=Sr[i0][2]){
   const a=i0?(x(i0-1)+x(i0))/2:L,b=i<Sr.length?(x(i-1)+x(i))/2:x(Sr.length-1);
   fasce+=`<rect x="${a.toFixed(1)}" y="${T}" width="${(b-a).toFixed(1)}" height="${H-T-B}" class="bmf${Sr[i0][2]}"/>`;i0=i;}
  const pts=Sr.map((s,i)=>`${x(i).toFixed(1)},${y(s[1]).toFixed(1)}`).join(" ");
  const prezzi=[hi,(hi+lo)/2,lo].map(v=>Math.exp(v)).map(p=>`<text x="${W-R+8}" y="${y(p)+4}" class="bmt">$${Math.round(p/1000)}k</text>`).join("");
  const anni=Sr.map((s,i)=>i&&s[0].slice(0,4)!=Sr[i-1][0].slice(0,4)?`<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H-B}" class="bmg"/><text x="${x(i)+4}" y="${H-8}" class="bmt">${s[0].slice(0,4)}</text>`:"").join("");
  const u=Sr[Sr.length-1];
  return `<div class="bmgraf"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bitcoin negli ultimi 3 anni con il punteggio macro di ogni settimana">
   <defs><linearGradient id="bmarea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ink)" stop-opacity=".16"/><stop offset="1" stop-color="var(--ink)" stop-opacity="0"/></linearGradient></defs>
   ${fasce}${anni}<polygon points="${x(0)},${H-B} ${pts} ${x(Sr.length-1)},${H-B}" fill="url(#bmarea)"/><polyline points="${pts}" class="bml"/>
   <circle cx="${x(Sr.length-1)}" cy="${y(u[1])}" r="4.5" class="bmp"/>${prezzi}</svg>
   <div class="bmleg">${[3,2,1,0].map(k=>`<span><i class="bmf${k}"></i>${k} su 3</span>`).join("")}<em>Bitcoin settimanale, scala logaritmica</em></div></div>`;}
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
     <small>Bitcoin $${Number(X.btc).toLocaleString("it-IT")} &middot; 3 mesi <b class="${X.btc3>=0?"up":"down"}">${pc(X.btc3)}</b></small></div>
    <div class="bmfat">${X.fattori.map(f=>`<div class="bmfc ${f.fav?"si":"no"}"><div class="bmfch"><span>${esc(f.nome)}</span><em>${f.fav?"Favorevole":"Sfavorevole"}</em></div>
      <b>${valF(f)}</b><small>3 mesi &middot; favorevole se ${f.verso=="giu"?"scende":"sale"}</small>${spark(f.spark,f.fav)}</div>`).join("")}</div></div>
   ${grafico()}
   <div class="bmdue">${barre()}${legami()}</div>
   <p class="small bmpie">${X.vecchio?"Fonti non disponibili oggi: ultimo calcolo valido del ":"Dati al "}${gg(X.agg)}. Statistica sul passato, non un consiglio.</p></div>`;}
 disegna();new MutationObserver(metti).observe(el,{childList:true});
 let lw=0;new ResizeObserver(()=>{const w=box.clientWidth;if(w&&Math.abs(w-lw)>40){lw=w;disegna();}}).observe(box);
})();}catch(e){fail("Bussola macro di Bitcoin","btc",e);}

/* ---------- v7.94 TERMOMETRO DEL SENTIMENT (D.btcsent da btc_macro.sentimento, pubblico: lo vede anche Basic) ----------
   Fear & Greed Index (alternative.me, 0-100, citato accanto al dato come chiedono le sue condizioni) e COT CFTC sui
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
 const fng=F?`<div class="bmtbox"><div class="bmtt"><span>Fear &amp; Greed</span><em>Fonte: <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noopener">alternative.me</a></em></div>
   <div class="bmtv"><b style="color:${fngCol(F.v)}">${F.v}</b><span style="color:${fngCol(F.v)}">${esc(F.cl||"")}</span></div>
   ${scala(F.v,fngCol(F.v))}${spark(F.serie)}<small>Ultimo anno &middot; dato del ${gg(F.d)}</small></div>`:"";
 const riga=(nome,x)=>x&&x.indice!=null?`<div class="bmtr"><div class="bmtrn"><b>${nome}</b><span>${x.indice}/100 &middot; ${parola(x.indice)}</span></div>${scala(x.indice,x.indice<=20?"var(--s)":x.indice>=80?"var(--b)":"var(--n)")}</div>`:"";
 const cot=C?`<div class="bmtbox"><div class="bmtt"><span>Futures Bitcoin (CME)</span><em>COT CFTC</em></div>
   ${riga("Piccoli trader",C.retail)}${riga("Grandi speculatori",C.spec)}<small>Posizione rispetto all'ultimo anno &middot; report del ${gg(C.d)}</small></div>`:"";
 const html=`<div class="bmtm"><h2>Termometro del sentiment <details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div>
  <b>Fear &amp; Greed</b>: umore del mercato crypto da 0 (paura estrema) a 100 (avidit&agrave; estrema), calcolato da alternative.me.<br><br>
  <b>Futures Bitcoin del CME</b>: posizioni settimanali dalla CFTC. Il numero dice dove sono oggi rispetto all'ultimo anno: 0 = il punto pi&ugrave; pessimista, 100 = il pi&ugrave; ottimista.<br><br>
  <b>&Egrave; contesto, non un segnale</b>: nel nostro studio dal 2018 il sentiment non ha anticipato Bitcoin in modo stabile (la regola &laquo;compra con la paura estrema&raquo; ha funzionato nel 2018-21 e non nel 2022-26).
  Unico indizio coerente, ma piccolo: grandi speculatori molto ottimisti, mese dopo leggermente pi&ugrave; debole.</div></details></h2>
  <div class="bmtg">${fng}${cot}</div></div>`;
 el.insertAdjacentHTML("beforeend",html);}
