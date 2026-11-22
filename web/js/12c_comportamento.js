/* ---------- 12c_comportamento.js - v8.71 COMPORTAMENTO COT (scheda Live, al posto del Backtest simulato) ----------
   Cosa fa il prezzo quando i grandi speculatori iniziano a spingere uno strumento ("episodio": da quando comprano o
   vendono fino a quando cambiano direzione), su tutto lo storico. Dati: D.cmp da cot_radar/comportamento.py
   (regole fissate prima: studio fino al 2014, verifica dal 2015, costi inclusi), arrivano con verifica.json.
   Disegnata da 13_verifica.js dentro #cmpbox con ebComportamento(box). v8.73 aperta a tutti i Premium (traduzioni in 00k_lingua.js).
   Struttura: famiglie (chip) -> elenco degli strumenti (PC: colonna a sinistra; telefono: i primi 6 + "Mostra tutti")
   -> dettaglio dello strumento scelto (lettura, 4 numeri, condizioni all'ingresso, ultimi episodi).
   DEBUG: F12 -> Console -> D.cmp.str.GOLD */
window.ebComportamento=function(box){try{
 const X=D.cmp;if(!box||!X||!X.str)return;
 const S=X.str,FC=X.famc||{};
 const NOMI={GOLD:"Oro",SILVER:"Argento",COPPER:"Rame",PLATINUM:"Platino",PALLADIUM:"Palladio",WTI:"Petrolio WTI",BRENT:"Petrolio Brent",NATGAS:"Gas naturale",HEATOIL:"Gasolio",GASOLINE:"Benzina",CORN:"Mais",WHEAT:"Grano",KCWHEAT:"Grano KC",SOY:"Soia",SOYMEAL:"Farina di soia",SOYOIL:"Olio di soia",RICE:"Riso",SUGAR:"Zucchero",COFFEE:"Caffè",COCOA:"Cacao",COTTON:"Cotone",OJ:"Succo d'arancia",CATTLE:"Bovini",FEEDER:"Bovini da ingrasso",HOGS:"Suini",SP500:"S&P 500",NASDAQ:"Nasdaq 100",DOW:"Dow Jones",RUSSELL:"Russell 2000",EAFE:"MSCI EAFE",EM:"MSCI Emergenti",US2Y:"Treasury 2 anni",US5Y:"Treasury 5 anni",US10Y:"Treasury 10 anni",USBOND:"Treasury 30 anni",ULTRA:"Treasury Ultra",BTC:"Bitcoin",ETH:"Ether"};
 const FAM=["Valute","Materie prime","Indici","Tassi","Crypto"].filter(f=>Object.values(S).some(x=>x.fam==f));
 const LETT={segue:["Segue gli speculatori","cm-segue"],contro:["Va contro","cm-contro"],neutro:["Nessuna tendenza","cm-neutro"],corto:["Storico corto","cm-corto"]};
 const ORD={segue:0,contro:1,neutro:2,corto:3};
 const nome=k=>NOMI[k]||k.slice(0,3)+"/"+k.slice(3);
 const P=v=>Math.round(v);                                           // percentuali intere in pagina
 const DEC=typeof EB_LANG!="undefined"&&EB_LANG=="en"?".":",";        // v8.73 decimali come la lingua scelta
 const num=v=>String(v).replace(".",DEC);
 const pct=(v,d=2)=>{const t=Math.abs(v).toFixed(d);return (+t===0?"":v>0?"+":"−")+t.replace(".",DEC)+"%";};   // niente "-0,00%"
 const gg=s=>s?s.split("-").reverse().join("/"):"";
 const info=(tit,testo)=>`<details class="info"><summary title="${tit}" aria-label="${tit}">i</summary><div>${testo}</div></details>`;
 // stato: famiglia e strumento scelti (ricordati nel browser), elenco aperto sul telefono
 const V={fam:"Materie prime",k:"",tutti:false};
 try{const s=JSON.parse(localStorage.getItem("ebCmp")||"{}");if(FAM.includes(s.fam))V.fam=s.fam;if(S[s.k])V.k=s.k;}catch(e){}
 if(!FAM.includes(V.fam))V.fam=FAM[0];
 const salva=()=>{try{localStorage.setItem("ebCmp",JSON.stringify({fam:V.fam,k:V.k}));}catch(e){}};
 // ordine: prima chi ha una lettura (segue / contro), poi per % a favore dal 2015
 const elenco=()=>Object.keys(S).filter(k=>S[k].fam==V.fam).sort((a,b)=>ORD[S[a].lett]-ORD[S[b].lett]||(S[b].v.pos||0)-(S[a].v.pos||0));
 if(!V.k||S[V.k].fam!=V.fam)V.k=elenco()[0];
 const barra=p=>`<div class="cm-barra"><i style="width:${p}%"></i><em style="left:calc(${p}% - 1px)"></em></div>`;

 function righe(){const ks=elenco();
  return `<div class="cm-r cm-h"><div>Strumento</div><div>A favore dal 2015</div></div>`+ks.map((k,i)=>{const x=S[k];
   return `<button type="button" class="cm-r${k==V.k?" on":""}${i>=6&&k!=V.k?" cm-oltre":""}" data-k="${k}"><div class="cm-n"><b><i class="cm-dot ${LETT[x.lett][1]}"></i>${esc(nome(k))}</b><span>${x.s.n?"fino al 2014: "+P(x.s.pos)+"%":"fino al 2014: nessun dato"}</span></div>
    <div class="cm-f"><div class="cm-fv"><b>${P(x.v.pos)}%</b><span>${x.v.n} episodi</span></div>${barra(P(x.v.pos))}</div></button>`;}).join("")
   +(ks.length>6?`<button type="button" class="cm-piu">${V.tutti?"Mostra meno":"Mostra tutti ("+ks.length+")"}</button>`:"");}

 function frase(x){
  if(x.lett=="segue")return "In entrambi i periodi il prezzo è andato con gli speculatori più spesso del caso.";
  if(x.lett=="contro")return "In entrambi i periodi il prezzo è andato più spesso <b>contro</b> gli speculatori: qui il COT si legge al contrario.";
  if(x.lett=="corto")return "Lo storico prima del 2015 è troppo corto per un giudizio: i numeri sono solo descrittivi.";
  return "Il risultato non si distingue dal caso: <b>seguire gli speculatori da soli non dà un vantaggio</b> su questo strumento.";}

 const COP=[["Flusso","Flusso forte","Flusso normale"],["Volatilità","Mercato calmo","Mercato agitato"],["Spinta","Prima spinta","Ripetizione"],
  ["Open interest","OI in aumento","OI in calo"],["Prezzo","Prezzo già a favore","Prezzo contro"],["OI + prezzo","Denaro nuovo col prezzo","Ricoperture"]];
 function condizioni(x){const C=x.cond||{},ok=COP.filter(([,a,b])=>C[a]||C[b]);
  const riga=(t,g)=>{if(!g)return `<div class="cm-cr"><span>${t}</span><b>&ndash;</b></div>`;const c=g.pos>=55?"cm-su":g.pos<=45?"cm-giu":"";
   return `<div class="cm-cr"><span>${t} <small>(${g.n})</small></span><b>${g.pos}%</b><div class="cm-mini"><i class="${c}" style="width:${g.pos}%"></i></div></div>`;};
  return `<div class="cm-cond${ok.length==4?" due":""}">${ok.map(([t,a,b])=>`<div class="cm-cc"><small>${t}</small>${riga(a,C[a])}${riga(b,C[b])}${[C[a],C[b]].some(g=>!g||g.n<30)?'<div class="cm-poc">Pochi casi: solo indicativo</div>':""}</div>`).join("")}</div>`;}

 function verdetto(f){const ok=(FC[f]||[]).filter(r=>r.ok);
  return ok.length?`Confermate dalla verifica nella famiglia ${f}: ${ok.map(r=>`<b>${r.a}</b>`).join(", ")}.`
   :`Nella famiglia ${f} <b>nessuna condizione ha superato la verifica</b>: leggile come descrizione, non come regola.`;}

 function dettaglio(){const k=V.k,x=S[k];if(!x)return "";const l=LETT[x.lett],d=x.durd;
  const ent=e=>[e.oi_su===true?"OI in aumento":e.oi_su===false?"OI in calo":null,e.px_fav===true?"prezzo già a favore":e.px_fav===false?"prezzo contro":null].filter(Boolean).join(" · ");
  const ep=(x.ultimi||[]).map(e=>`<div class="cm-ep"><div class="cm-e1">${gg(e.inizio)} &rarr; ${gg(e.fine)}</div><div class="${e.verso>0?"up":"down"} cm-e2">${e.verso>0?"Comprano":"Vendono"}${e.forte?" &middot; forte":""}</div>
   <div class="cm-e3">${e.sett} sett.</div><div class="cm-e4 ${e.ris>0?"up":"down"}"><b>${pct(e.ris)}</b></div><div class="cm-e5 down">${pct(e.mae)}</div>
   ${ent(e)?`<div class="cm-e6">All'ingresso: ${ent(e)}</div>`:""}</div>`).join("");
  return `<div class="cm-dt"><span class="cm-nome">${esc(nome(k))}</span><span class="cm-fam">${x.fam}</span><span class="cm-pill ${l[1]}">${l[0]}</span></div>
  <p class="cm-frase">${frase(x)}</p>${x.nota?`<p class="cm-nc">Dipende dai costi stimati (${num(x.cst)}% a operazione): senza costi, dal 2015 la tendenza sparisce.</p>`:""}
  <div class="cm-kpi">
   <div class="cm-k"><small>Chiusi a favore</small><div class="cm-v">${P(x.v.pos)}%</div><p>Dal 2015 (${x.v.n} episodi)<br>${x.s.n?`Fino al 2014: ${P(x.s.pos)}% (${x.s.n})`:"Fino al 2014: nessun dato"}</p>${barra(P(x.v.pos))}</div>
   <div class="cm-k"><small>Durata della spinta</small><div class="cm-v">${num(x.dur)} sett.</div><p>${d[0]}% finisce dopo 1 settimana</p><div class="cm-dur">${d.map((p,i)=>`<i title="${i<3?i+1:"4+"} sett.: ${p}%" style="flex:${Math.max(p,2)};opacity:${1-i*.22}"></i>`).join("")}</div></div>
   <div class="cm-k"><small>Drawdown tipico</small><div class="cm-v down">${pct(x.mae)}</div><p>Di solito entro il ${x.gmae}° giorno</p></div>
   <div class="cm-k"><small>Guadagno massimo tipico</small><div class="cm-v up">${pct(x.mfe)}</div><p>Risultato medio dal 2015 ${pct(x.v.media)}, costi inclusi</p></div>
  </div>
  <div class="cm-sez"><h3>Quando va meglio ${info("Come si legge","Percentuale di episodi chiusi a favore in ogni condizione, su tutto lo storico; tra parentesi quanti episodi. Le condizioni sono note al momento dell'ingresso. Open interest = contratti aperti sul future (dal report COT), variazione nelle 4 settimane prima; non c'è per i cambi incrociati. Denaro nuovo = open interest in aumento e prezzo già nella direzione degli speculatori; ricoperture = open interest in calo con il prezzo a favore.")}</h3>
   <p class="cm-verd">${verdetto(x.fam)}</p>${condizioni(x)}</div>
  <div class="cm-sez"><h3>Ultimi episodi ${info("Come si legge","Risultato e drawdown nella direzione degli speculatori, dalla prima chiusura dopo il report all'uscita (prima chiusura dopo il report che cambia direzione), costi inclusi.")}</h3>
   <div class="cm-reg"><div class="cm-ep cm-eh"><div>Periodo</div><div>Speculatori</div><div class="cm-e3">Durata</div><div class="cm-e4">Risultato</div><div class="cm-e5">Drawdown</div></div>${ep}</div></div>`;}

 function disegna(){
  box.innerHTML=`<div class="cm-leg"><span><i class="cm-dot cm-segue"></i>Segue gli speculatori</span><span><i class="cm-dot cm-neutro"></i>Nessuna tendenza</span><span><i class="cm-dot cm-contro"></i>Va contro</span><span><i class="cm-dot cm-corto"></i>Storico corto</span>${info("Come si legge",`Episodio = da quando i grandi speculatori iniziano a comprare o vendere fino a quando cambiano direzione. Chiuso a favore = alla fine il prezzo era andato dove spingevano, al netto dei costi. La lettura usa regole fissate prima di calcolare: deve valere sia fino al 2014 sia dal 2015, un periodo mai usato per scegliere nulla. ${X.n?X.n.toLocaleString(EB_LOC)+" episodi":""}${X.al?", ultimo chiuso il "+gg(X.al):""}.`)}</div>
   <div class="filters cm-fami">${FAM.map(f=>`<button data-f="${f}" class="${f==V.fam?"on":""}">${f} <small>${Object.values(S).filter(x=>x.fam==f).length}</small></button>`).join("")}</div>
   <div class="cm-lay"><div class="cm-tab${V.tutti?"":" corta"}">${righe()}</div><div class="cm-det card" id="cmdet">${dettaglio()}</div></div>`;
  box.querySelectorAll(".cm-fami button").forEach(b=>b.onclick=()=>{V.fam=b.dataset.f;V.tutti=false;V.k=elenco()[0];salva();disegna();});
  box.querySelectorAll(".cm-r[data-k]").forEach(b=>b.onclick=()=>{V.k=b.dataset.k;salva();
   box.querySelectorAll(".cm-r[data-k]").forEach(x=>x.classList.toggle("on",x==b));$("cmdet").innerHTML=dettaglio();
   if(innerWidth<821)$("cmdet").scrollIntoView({behavior:"smooth",block:"start"});});
  const piu=box.querySelector(".cm-piu");if(piu)piu.onclick=()=>{V.tutti=!V.tutti;disegna();};}
 disegna();
}catch(e){fail("Comportamento COT","verifica",e);}};
