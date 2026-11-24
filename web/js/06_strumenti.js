/* ---------- 06_strumenti.js - v8.91 SCHEDA COT IN VERSIONE SEMPLICE (Ya, 23/11/2026) ----------
   Prima: una riga per strumento con un paragrafo pieno di numeri. Ora, per chi non e' esperto:
     1. in alto una FRASE: cosa comprano e cosa vendono soprattutto i grandi investitori questa settimana;
     2. due colonne "Comprano di piu'" / "Vendono di piu'" (i primi 5, con una barra);
     3. una CARD per strumento: davanti nome in italiano semplice, freccia e UNA parola (Comprano forte, Comprano,
        Neutri, Vendono, Vendono forte), cosa vuol dire (es. sui Treasury "scommettono su tassi in calo"), cursore
        da "vendono" a "comprano" e il bollino "Affollato" solo quando serve. Un tocco GIRA la card: dietro i numeri
        (punteggio, posizione sui 3 anni, netto, 4 settimane, produttori e banche, storico dei segnali) e "Grafico".
   I filtri per settore restano: selS(settore) e' usato anche dai riquadri dei settori della Dashboard.
   Le card che si girano (classi fc-*) le usa anche la scheda Notizie (44b_notizie.js); il tocco le gira qui sotto.
   DEBUG: drawAssets() ridisegna; selS("Metalli") filtra. */
try{
var SF="Tutti";
// nomi semplici: chi non conosce le sigle capisce subito (gli altri restano con il nome italiano del terminale)
const NOMI_S={EAFE:"Azioni Europa e Asia",EM:"Azioni emergenti",VIX:"Volatilità (VIX)",USBOND:"Treasury 30 anni",ULTRA:"Treasury ultra lungo",
 US10Y:"Treasury 10 anni",US5Y:"Treasury 5 anni",US2Y:"Treasury 2 anni",NASDAQ:"Nasdaq",SP500:"S&P 500",DOW:"Dow Jones",RUSSELL:"Russell 2000",
 FEDFUNDS:"Tassi Fed",SOFR:"Tasso SOFR",WTI:"Petrolio WTI",BRENT:"Petrolio Brent",NATGAS:"Gas naturale",HEATOIL:"Gasolio",GASOLINE:"Benzina",
 GOLD:"Oro",SILVER:"Argento",COPPER:"Rame",PLATINUM:"Platino",PALLADIUM:"Palladio",CORN:"Mais",SOY:"Soia",SOYOIL:"Olio di soia",SOYMEAL:"Farina di soia",
 WHEAT:"Grano",KCWHEAT:"Grano duro",RICE:"Riso",SUGAR:"Zucchero",COFFEE:"Caffè",COCOA:"Cacao",COTTON:"Cotone",OJ:"Succo d'arancia",
 CATTLE:"Bovini",FEEDER:"Vitelli",HOGS:"Suini",MILK:"Latte",BTC:"Bitcoin",ETH:"Ether",DXY:"Dollaro USA"};
// in inglese nomi brevi equivalenti (gli altri: il nome originale del contratto)
const NOMI_EN={EAFE:"Europe & Asia stocks",EM:"Emerging stocks",VIX:"Volatility (VIX)",USBOND:"Treasury 30Y",ULTRA:"Ultra Treasury",US10Y:"Treasury 10Y",
 US5Y:"Treasury 5Y",US2Y:"Treasury 2Y",FEDFUNDS:"Fed rates",SOFR:"SOFR rate",WTI:"WTI oil",BRENT:"Brent oil",NATGAS:"Natural gas",HEATOIL:"Heating oil",
 SOY:"Soybeans",SOYOIL:"Soybean oil",SOYMEAL:"Soybean meal",KCWHEAT:"Hard wheat",OJ:"Orange juice",CATTLE:"Live cattle",FEEDER:"Feeder cattle",
 HOGS:"Lean hogs",MILK:"Milk",ETH:"Ether",DXY:"US dollar",RICE:"Rice",COTTON:"Cotton",WHEAT:"Wheat",CORN:"Corn",COCOA:"Cocoa",COFFEE:"Coffee",SUGAR:"Sugar",
 GASOLINE:"Gasoline",SP500:"S&P 500",NASDAQ:"Nasdaq",DOW:"Dow Jones",RUSSELL:"Russell 2000",GOLD:"Gold",SILVER:"Silver",COPPER:"Copper",PLATINUM:"Platinum",PALLADIUM:"Palladium",BTC:"Bitcoin"};
const EN_S=typeof EB_LANG!="undefined"&&EB_LANG=="en";
const nomeS=a=>EN_S?(NOMI_EN[a.key]||a.name):NOMI_S[a.key]||(typeof accenti=="function"?accenti(a.it||a.name):(a.it||a.name));
// cinque livelli dal punteggio: classe colore, parola, freccia
const livello=s=>s>=40?[5,"Comprano forte","su"]:s>=15?[4,"Comprano","su"]:s>-15?[3,"Neutri","piatto"]:s>-40?[2,"Vendono","giu"]:[1,"Vendono forte","giu"];
// cosa vuol dire, in parole (per tassi e VIX "comprare" non e' intuitivo)
function significato(a,c){if(c==3)return "nessuna direzione netta";const su=c>3;
 if(a.group=="Tassi USA")return su?"scommettono su tassi in calo":"scommettono su tassi in rialzo";
 if(a.key=="VIX")return su?"si aspettano più volatilità":"si aspettano mercati calmi";
 return su?"scommettono sul rialzo":"scommettono sul ribasso";}
const FC_ICO={su:'<path d="M12 19V5M5 12l7-7 7 7"/>',giu:'<path d="M12 5v14M5 12l7 7 7-7"/>',piatto:'<path d="M5 12h14"/>',
 gira:'<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',graf:'<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>'};
const fcIco=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${FC_ICO[k]}</svg>`;
window.fcIco=fcIco;
// un tocco gira la card (e la rigira); il pulsante "Grafico" sul retro apre il grafico (12_grafico.js) senza girare
if(!window.fcGira){window.fcGira=1;document.addEventListener("click",e=>{if(e.target.closest("[data-tv],a,select,input"))return;
 const f=e.target.closest(".fc");if(f){f.classList.toggle("on");f.setAttribute("aria-pressed",f.classList.contains("on"));}});
 document.addEventListener("keydown",e=>{if((e.key=="Enter"||e.key==" ")&&e.target.classList&&e.target.classList.contains("fc")){e.preventDefault();e.target.click();}});}

function selS(g){SF=g;document.querySelectorAll("#sfilters button").forEach(x=>x.classList.toggle("on",x.textContent==g));drawAssets();}
$("sfilters").innerHTML=["Tutti",...SEC.filter(g=>byS[g])].map(g=>`<button class="${g==SF?'on':''}">${g}</button>`).join("");
document.querySelectorAll("#sfilters button").forEach(b=>b.onclick=()=>selS(b.textContent));

// frase e colonne in alto (sempre su tutti gli strumenti, non cambiano con il filtro)
function testata(){const L=Object.values(D.assets).filter(a=>a.key!="USD"&&!a.composite&&a.score!=null).sort((a,b)=>b.score-a.score);
 const su=L.filter(a=>a.score>=15).slice(0,5),giu=L.filter(a=>a.score<=-15).reverse().slice(0,5);
 const tre=l=>l.slice(0,3).map(a=>esc(nomeS(a))).join(", ").replace(/, ([^,]*)$/,(EN_S?" and ":" e ")+"$1");
 const data=L.map(a=>a.date).filter(Boolean).sort().pop();
 const riga=a=>`<li><span><i class="qe-fr ${a.score>0?"up":"down"}">${a.score>0?"&#9650;":"&#9660;"}</i> ${esc(nomeS(a))}</span><i><i style="width:${Math.min(100,Math.abs(a.score)).toFixed(0)}%"></i></i></li>`;
 $("ctesta").innerHTML=`<div class="chero"><small>Report COT${data?" · "+new Date(data+"T12:00Z").toLocaleDateString(EB_LOC,{day:"numeric",month:"long"}):""}</small>
   <h3>Dove scommettono i grandi investitori</h3>
   <p>${su.length?`Questa settimana comprano soprattutto <b class="ch-su">${tre(su)}</b>.`:""} ${giu.length?`Vendono soprattutto <b class="ch-giu">${tre(giu)}</b>.`:""}</p></div>
  <div class="clanes"><div class="clane cl-su"><h4>Comprano di più</h4><ol>${su.map(riga).join("")}</ol></div>
   <div class="clane cl-giu"><h4>Vendono di più</h4><ol>${giu.map(riga).join("")}</ol></div></div>`;}

// v9.21 (Ya) il pallino sta nella fascia del segnale (5 fasce da 20%: vendono forte | vendono | neutri | comprano | comprano forte)
// e dentro la fascia si sposta col punteggio; colore per segnale (stile.css .fc-metro i.m1..m5). Niente animazioni: niente sfarfallio.
const FASCE={1:[-100,-40,4,20],2:[-40,-15,22,38],3:[-15,15,42,58],4:[15,40,62,78],5:[40,100,80,96]};
function posMetro(s,c){const [a,b,x,y]=FASCE[c],t=Math.max(0,Math.min(1,((+s||0)-a)/(b-a)));return (x+t*(y-x)).toFixed(1);}
function carta(a){const s=a.score,[c,t,ic]=livello(s),n=nomeS(a);
 const kv=[["Punteggio",fmt(s)],["Livello sui 3 anni",a.idx!=null?a.idx+"/100":null],["Netto",a.pct_oi!=null?(a.pct_oi>0?"+":"")+fx(a.pct_oi,1)+"%":null],
  ["In 4 settimane",a.d_net4!=null?`<i class="qe-fr ${a.d_net4>0?"up":a.d_net4<0?"down":"neu"}">${a.d_net4>0?"&#9650;":a.d_net4<0?"&#9660;":"&#9654;"}</i> ${fmt(a.d_net4)}`:null],["Produttori e banche",a.comm?a.comm.idx+"/100":null],
  ["Segnali giusti",a.affid?`${a.affid.hit}% su ${a.affid.n}`:null]].filter(x=>x[1]!=null);
 return `<div class="fc c${c}" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(n)}: ${t}. Tocca per i numeri"><div class="fc-in">
  <div class="fc-fr"><div class="fc-top"><div><b>${esc(n)}</b><small>${esc(a.group)}</small></div><span class="fc-gira" title="Tocca per i numeri">${fcIco("gira")}</span></div>
   ${a.d_net4?`<span class="fc-tend"><i class="qe-fr ${a.d_net4>0?"up":"down"}">${a.d_net4>0?"&#9650;":"&#9660;"}</i>${a.d_net4>0?"più acquisti":"più vendite"} nel mese</span>`:""}
   ${a.crowded?`<span class="fc-pill" title="Quasi tutti già dalla stessa parte: spesso è lì che il prezzo gira">Affollato</span>`:""}
   <div class="fc-stato"><div class="fc-ic">${fcIco(ic)}</div><div><strong>${t}</strong><span>${significato(a,c)}</span></div></div>
   <div class="fc-metro"><i class="m${c}" style="left:${posMetro(s,c)}%"></i></div><div class="fc-metro-l"><span>vendono</span><span>comprano</span></div></div>
  <div class="fc-bk"><div class="fc-top"><div><b>${esc(n)}</b><small>I numeri</small></div><span class="fc-azioni"><span class="fc-graf" role="button" tabindex="0" data-tv="a:${a.key}" title="Grafico a candele">${fcIco("graf")}Grafico</span><span class="fc-gira">${fcIco("gira")}</span></span></div>
   <dl class="fc-kv">${kv.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div></div></div>`;}

function drawAssets(){testata();
 const L=Object.values(D.assets).filter(a=>a.key!="USD"&&!a.composite&&(SF=="Tutti"||a.group==SF)).sort((a,b)=>b.score-a.score);
 $("alist").innerHTML=`<div class="fc-grid">${L.map(carta).join("")}</div>`+(NOTE[SF]?`<p class="small" style="margin:10px 0 0">${NOTE[SF]}</p>`:"");}
drawAssets();
}catch(e){fail('Strumenti','assets',e);}
