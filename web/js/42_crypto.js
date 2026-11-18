
/* ---------- 42_crypto.js - v8.01 SCHEDA CRYPTO: tabella delle principali criptovalute (scheda "Crypto", menu Mercati) ----------
   Dati: D.crypto da cot_radar/crypto.py, ricalcolato a ogni costruzione del sito (nessun numero scritto a mano):
     {agg, fond (true = c'e' la capitalizzazione), ordine ("mcap"|"volume"), n_tot (solo in Basic), vecchio,
      monete:[{s, n, cat, anno, desc, p, data, v1g, v7g, v30g, v1a, vytd, ath, ath_d, dd, vol30, volu, volm,
               mcap, circ, max, circ_pct, quota, spark:[90 chiusure], sett:[[data, prezzo] x 156 settimane], dal}]}
   DISEGNO: in fondo alla scheda (sopra restano bussola macro e termometro di Bitcoin):
     1) tre numeri di sintesi (monete in rialzo a 7 giorni, peso di Bitcoin o volume totale, la migliore a 7 giorni);
     2) filtri per categoria; 3) tabella ordinabile (sul telefono ogni riga diventa una scheda);
     4) il tocco su una riga apre il PROFILO della moneta sotto la riga: descrizione, numeri chiave, grafico 3 anni.
   Basic: le prime 5 monete; il resto con il lucchetto. Spiegazioni solo nella (i), niente fonti in pagina.
   DEBUG: F12 -> Console -> D.crypto  oppure  ebCrypto.disegna() */
try{(function(){const el=$("btc"),C=D.crypto;if(!el)return;
 const box=document.createElement("div");box.className="cysez";el.appendChild(box);
 if(!C||!C.monete||!C.monete.length){box.innerHTML=`<h2>Mercato crypto</h2><div class="card small" style="padding:18px 20px">I dati delle criptovalute arrivano con il prossimo aggiornamento.</div>`;return;}
 const M=C.monete,FOND=!!C.fond;
 // ---------- formati (italiano: 1.234,56)
 const pr=v=>v==null?"&ndash;":(v>=1000?fx(v,0):v>=1?fx(v,2):v.toLocaleString("it-IT",{maximumSignificantDigits:4}))+"&nbsp;$";
 const pc=(v,d=1)=>v==null?"&ndash;":(v>0?"+":v<0?"&minus;":"")+fx(Math.abs(v),d)+"%";
 const cl=v=>v>0?"up":v<0?"down":"";
 const gr=(v,u="")=>v==null?"&ndash;":v>=1e9?fx(v/1e9,v>=1e11?0:1)+"&nbsp;mld"+u:v>=1e6?fx(v/1e6,v>=1e8?0:1)+"&nbsp;mln"+u:fx(v,0)+u;
 const gg=d=>d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";
 // icona: cerchio colorato con la sigla (tinta ricavata dalla sigla: sempre la stessa per ogni moneta)
 const tinta=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h;};
 const ico=m=>`<span class="cyico" style="--h:${tinta(m.s)}" aria-hidden="true">${esc(m.s.slice(0,m.s.length>3?4:3))}</span>`;
 // mini-grafico 90 giorni: verde se sale nel periodo, rosso se scende
 const spark=a=>{if(!a||a.length<2)return "";const lo=Math.min(...a),hi=Math.max(...a),W=96,H=28,k=(hi-lo)||1;
  const pts=a.map((v,i)=>(i*W/(a.length-1)).toFixed(1)+","+(H-2-(v-lo)/k*(H-4)).toFixed(1)).join(" ");
  return `<svg class="cyspk ${a[a.length-1]>=a[0]?"up":"down"}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;};
 // ---------- colonne: [chiave, titolo, valore per ordinare, cella, etichetta corta sul telefono]
 const COL=[
  ["p","Prezzo",m=>m.p,m=>`<b>${pr(m.p)}</b>`,"Prezzo"],
  ["v1g","24 ore",m=>m.v1g,m=>`<b class="${cl(m.v1g)}">${pc(m.v1g)}</b>`,"24 ore"],
  ["v7g","7 giorni",m=>m.v7g,m=>`<b class="${cl(m.v7g)}">${pc(m.v7g)}</b>`,"7 giorni"],
  ["v30g","30 giorni",m=>m.v30g,m=>`<b class="${cl(m.v30g)}">${pc(m.v30g)}</b>`,"30 giorni"],
  ["spk","90 giorni",null,m=>spark(m.spark),"90 giorni"],
  ...(FOND?[["mcap","Capitalizz.",m=>m.mcap,m=>gr(m.mcap,"&nbsp;$"),"Capitalizz."]]:[]),
  ["volu","Volume 24h",m=>m.volu,m=>gr(m.volu,"&nbsp;$"),"Volume 24h"],
  ["dd","Dal max",m=>m.dd,m=>`<span class="${m.dd<=-0.05?"down":""}">${pc(m.dd)}</span>`,"Dal massimo"],
  ["vol30","Volatilit&agrave;",m=>m.vol30,m=>m.vol30==null?"&ndash;":fx(m.vol30,0)+"%","Volatilit&agrave;"]];
 // ---------- filtri: Tutte + le categorie presenti (in ordine di quante monete hanno)
 const cats=[...M.reduce((a,m)=>a.set(m.cat,(a.get(m.cat)||0)+1),new Map())].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 let sel="Tutte",ord=null,giu=true,aperta=null,tutte=false;
 const PRIMI=10;                                      // all'inizio le prime 10: il resto con "Mostra tutte"
 // ---------- tre numeri di sintesi
 function sintesi(){const su=M.filter(m=>m.v7g>0).length,b=M.find(m=>m.s=="BTC");
  const top=M.filter(m=>m.v7g!=null).sort((a,b)=>b.v7g-a.v7g)[0];
  const k2=FOND&&b&&b.quota!=null?[`Peso di Bitcoin`,`${fx(b.quota,1)}%`,"sul totale in tabella"]
   :[`Volume 24 ore`,gr(M.reduce((a,m)=>a+(m.volu||0),0),"&nbsp;$"),"monete in tabella"];
  return `<div class="cykpi">
   <div><small>In rialzo a 7 giorni</small><b>${su} <em>su ${M.length}</em></b><i class="cybar"><i style="width:${(su/M.length*100).toFixed(0)}%"></i></i></div>
   <div><small>${k2[0]}</small><b>${k2[1]}</b><span>${k2[2]}</span></div>
   ${top?`<div><small>Migliore a 7 giorni</small><b>${esc(top.n)} <em class="${cl(top.v7g)}">${pc(top.v7g)}</em></b><span>${pr(top.p)}</span></div>`:""}</div>`;}
 // ---------- riga della tabella e intestazione
 const riga=m=>`<div class="cyr${aperta==m.s?" on":""}" data-s="${esc(m.s)}" tabindex="0" role="button" aria-expanded="${aperta==m.s}">
   <div class="cyn">${ico(m)}<span><b>${esc(m.n)}</b><small>${esc(m.s)}</small></span></div>
   ${COL.map(c=>`<div class="cyc cyc-${c[0]}" data-l="${c[4]}">${c[3](m)}</div>`).join("")}</div>${aperta==m.s?profilo(m):""}`;
 const testa=()=>`<div class="cyr cyth"><div class="cyn">Moneta</div>${COL.map(c=>c[2]?`<button type="button" class="cyc cyc-${c[0]}${ord==c[0]?" on":""}" data-o="${c[0]}" title="Ordina">${c[1]}<i>${ord==c[0]?(giu?"&#9662;":"&#9652;"):""}</i></button>`:`<span class="cyc cyc-${c[0]}">${c[1]}</span>`).join("")}</div>`;
 // ---------- profilo della moneta e suo grafico: in 43_crypto_profilo.js (file separato per restare leggeri)
 const H={pr,pc,cl,gr,gg,ico};
 const profilo=m=>window.ebCryptoProfilo?ebCryptoProfilo.html(m,H):"";
 const grafico=m=>{if(window.ebCryptoProfilo)ebCryptoProfilo.grafico(box,m,H);};
 // ---------- disegno della scheda
 function disegna(){
  const f=sel=="Tutte"?M:M.filter(m=>m.cat==sel),v=f.slice();
  if(ord){const c=COL.find(x=>x[0]==ord);v.sort((a,b)=>{const x=c[2](a),y=c[2](b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return giu?y-x:x-y;});}
  const blocco=!EB_PREMIUM&&C.n_tot>M.length?ebBlocco(`Altre ${C.n_tot-M.length} criptovalute`,"Tabella completa con volumi, volatilità e profilo di ogni moneta.",{cls:"cylk"}):"";
  box.innerHTML=`<h2>Mercato crypto <button type="button" class="info" data-apri="cyinfo" data-k="crypto" aria-expanded="false" aria-label="Come si legge">i</button></h2>
   <p id="cyinfo" class="sub infotesto">Le principali criptovalute, ordinate per ${C.ordine=="mcap"?"capitalizzazione":"volume scambiato"}. <b>24 ore, 7 e 30 giorni</b> = variazione del prezzo. <b>Dal massimo</b> = drawdown dal massimo storico. <b>Volatilit&agrave;</b> = oscillazione annua stimata sugli ultimi 30 giorni. Tocca un titolo di colonna per ordinare e una moneta per aprire il suo profilo. Stablecoin escluse: valgono sempre circa 1 dollaro.</p>
   ${sintesi()}
   <div class="filters cyfil">${["Tutte",...cats].map(n=>`<button type="button" data-f="${esc(n)}" class="${sel==n?"on":""}">${esc(n)} <small>${n=="Tutte"?M.length:M.filter(m=>m.cat==n).length}</small></button>`).join("")}</div>
   <div class="cytab${FOND?" cyfond":""}">${testa()}${(tutte||v.length<=PRIMI+2?v:v.slice(0,PRIMI)).map(riga).join("")}${v.length>PRIMI+2?`<button type="button" class="cypiu">${tutte?"Mostra meno":`Mostra tutte (${v.length})`}</button>`:""}</div>${blocco}
   <div class="small cypiede">Prezzi al ${gg(C.agg)}${C.vecchio?" &middot; ultimo aggiornamento disponibile":""}</div>`;
  if(aperta)requestAnimationFrame(()=>{const m=M.find(x=>x.s==aperta);if(m)grafico(m);});}
 // ---------- eventi (delegati: la tabella si ridisegna spesso)
 box.addEventListener("click",e=>{const t=e.target;
  if(t.closest(".cypiu")){tutte=!tutte;disegna();return;}
  const fb=t.closest(".cyfil button");if(fb){sel=fb.dataset.f;aperta=null;tutte=false;disegna();return;}
  const ob=t.closest(".cyth button[data-o]");if(ob){if(ord==ob.dataset.o)giu=!giu;else{ord=ob.dataset.o;giu=true;}disegna();return;}
  if(t.closest(".cyprof"))return;
  const r=t.closest(".cyr:not(.cyth)");if(r){aperta=aperta==r.dataset.s?null:r.dataset.s;disegna();
   const n=box.querySelector(`.cyr[data-s="${aperta}"]`);if(n&&n.getBoundingClientRect().top<70)n.scrollIntoView({block:"start",behavior:"smooth"});}});
 box.addEventListener("keydown",e=>{if((e.key=="Enter"||e.key==" ")&&e.target.matches(".cyr:not(.cyth)")){e.preventDefault();e.target.click();}});
 // il grafico del profilo aperto segue la larghezza della finestra (solo se cambia davvero)
 let lw=0,rt=0;new ResizeObserver(()=>{if(!aperta||box.clientWidth==lw)return;lw=box.clientWidth;clearTimeout(rt);rt=setTimeout(()=>{const m=M.find(x=>x.s==aperta);if(m)grafico(m);},120);}).observe(box);
 disegna();
 window.ebCrypto={disegna};
})();}catch(e){fail('Crypto','btc',e);}
