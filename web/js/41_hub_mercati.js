
/* ---------- 41_hub_mercati.js - v7.95 PAGINA "MERCATI" A CARD ----------
   Il pulsante "Mercati" della barra apre questa pagina (#mercati) invece della tendina: una griglia di card,
   una per scheda (Forex, Strumenti, Macro, Bitcoin, Volatilita', Stagionalita', Correlazioni, Live).
   Ogni card ha uno sfondo disegnato a tema (SVG, nessuna immagine esterna), un'icona al centro e il nome:
   il tocco porta alla scheda di sempre (go). Le schede sono lette dai bottoni nascosti nella barra (index.html),
   quindi una scheda nascosta (es. "Registro" per chi non e' admin) non compare.
   Dopo, il pulsante "Mercati" mostra anche il nome della scheda aperta ("Mercati · Forex"): un tocco riporta qui.
   v8.95 RIORDINO COME LE APP DEL TELEFONO (Ya, 23/11/2026):
     - tenendo premuta una card (dito o mouse) per 0,5 s le card iniziano a "traballare" (modalita' modifica);
     - si trascina una card sopra un'altra e le altre scorrono al loro posto (animazione FLIP), anche senza
       staccare il dito dopo la pressione lunga, come su iPhone e Android;
     - si esce con "Fine", con un tocco fuori dalle card, con Esc o da soli dopo 8 secondi senza spostamenti;
     - in modalita' modifica il tocco NON apre la scheda; fuori dalla modalita' tutto resta come prima;
     - l'ordine si salva subito nel browser (localStorage "ebOrdineHub") e nel profilo (tabella liste, colonna
       "ordine"): sullo stesso account si ritrova su telefono, tablet e PC. "Ripristina" torna all'ordine di base.
     - da tastiera: in modalita' modifica le frecce spostano la card selezionata.
   DEBUG: ebHub.disegna() ridisegna la griglia; ebHub.ordine() ordine attuale; ebHub.modifica(true) entra in modifica. */
(function(){try{
 const el=document.getElementById("mercati");if(!el)return;
 // i disegni stanno tra x=30 e x=270: su PC la card e' piu' stretta del disegno e i lati vengono tagliati
 // icone (tratto, 24x24) e sfondi a tema (viewBox 300x150, colori tenui sul fondo scuro della card)
 const ICO={
  pairs:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  assets:'<path d="M6 4v16M6 8h-2v6h2M12 6v14M12 9h-2v5h2M18 3v16M18 6h-2v8h2" />',
  mkt:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
  btc:'<path d="M8 5h6a3 3 0 0 1 0 6H8zM8 11h7a3 3 0 0 1 0 6H8zM8 5v12M10 3v2M13 3v2M10 17v2M13 17v2"/>',
  volat:'<path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>',
  stag:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4M8 14h2M14 14h2M8 17h2"/>',
  corr:'<circle cx="7" cy="16" r="1.6"/><circle cx="11" cy="12" r="1.6"/><circle cx="15" cy="13" r="1.6"/><circle cx="17.5" cy="7.5" r="1.6"/><path d="M4 19L20 5"/>',
  verifica:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  notizie:'<path d="M5 4h11a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
  eventi:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 16l3-3 2 2 3-4"/>',
  registro:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'};
 const ART={
  // valute che "scorrono"
  pairs:`${[["€",46,60],["$",96,100],["¥",150,46],["£",204,102],["₣",250,62]].map(([s,x,y])=>`<text x="${x}" y="${y}" class="hbt">${s}</text>`).join("")}<path d="M0 120 C60 100 120 132 180 112 S260 96 300 104" class="hbl"/>`,
  // candele
  assets:[...Array(14)].map((_,i)=>{const x=12+i*21,h=22+((i*37)%46),y=40+((i*53)%50);return `<line x1="${x}" x2="${x}" y1="${y-10}" y2="${y+h+10}" class="hbl"/><rect x="${x-5}" y="${y}" width="10" height="${h}" rx="2" class="${i%3==1?"hbr":"hbg"}"/>`;}).join(""),
  // globo a puntini
  mkt:[...Array(9)].map((_,r)=>[...Array(17)].map((_,c)=>{const x=c*19+6,y=r*17+6,dx=(x-150)/150,dy=(y-75)/90;return dx*dx+dy*dy<1?`<circle cx="${x}" cy="${y}" r="1.6" class="hbd"/>`:"";}).join("")).join(""),
  // simbolo e linea di prezzo
  btc:`<text x="196" y="118" class="hbt hbbig">₿</text><path d="M0 118 L40 104 L70 110 L105 82 L140 92 L175 60 L210 70 L250 38 L300 46" class="hbl hbacc"/>`,
  // onde
  volat:[0,1,2].map(k=>`<path d="M0 ${75+k*18} C40 ${35+k*14} 80 ${115-k*10} 120 ${75+k*18} S200 ${35+k*14} 240 ${75+k*18} S300 ${100} 320 ${75+k*18}" class="hbl" style="opacity:${.5-k*.13}"/>`).join(""),
  // giorni del mese
  stag:[...Array(3)].map((_,r)=>[...Array(5)].map((_,c)=>`<text x="${28+c*62}" y="${38+r*46}" class="hbt hbnum">${8+r*7+c}</text>`).join("")).join(""),
  // nuvola di punti e retta
  corr:[...Array(26)].map((_,i)=>{const x=14+i*11,y=128-i*4.2+((i*29)%26-13);return `<circle cx="${x}" cy="${y}" r="2.4" class="hbd"/>`;}).join("")+`<path d="M8 134 L292 18" class="hbl hbacc"/>`,
  // battito
  verifica:`<path d="M0 82 H80 L95 56 L110 112 L128 30 L146 98 L160 82 H300" class="hbl hbacc"/><circle cx="196" cy="30" r="5" class="hblive"/><text x="207" y="35" class="hbt hblivet">LIVE</text>`,
  // percorso con il giorno dell'evento (linea verticale) e il pallino
  eventi:`<rect x="0" y="0" width="150" height="150" class="hbd" style="opacity:.08"/><line x1="150" x2="150" y1="8" y2="142" class="hbl"/><path d="M0 112 C30 104 60 98 90 84 S130 70 150 64 S200 74 230 70 S270 60 300 66" class="hbl hbacc"/><circle cx="150" cy="64" r="6" class="hblive"/>`,
  // v8.87 candele con la linea gialla della notizia e la barretta della mossa della prima ora
  notizie:[...Array(13)].map((_,i)=>{const x=14+i*22,h=14+((i*29)%30),y=i<6?54+((i*17)%18):(i==6?40:84+((i*13)%16));return `<rect x="${x-5}" y="${y}" width="10" height="${i==6?62:h}" rx="2" class="${i==6||i%4==1?"hbr":"hbg"}"/>`;}).join("")+`<line x1="146" x2="146" y1="10" y2="140" class="hbl hbacc" style="stroke-dasharray:4 4"/>`,
  // righe di registro
  registro:[...Array(6)].map((_,i)=>`<rect x="24" y="${18+i*21}" width="${150+((i*41)%110)}" height="7" rx="3.5" class="hbd"/>`).join("")};
 // v8.62 ORDINE DI BASE deciso da Ya: Macro, COT, Stagionalita', Volatilita', Correlazioni, Forex, Crypto, Live, poi il resto.
 const BASE=["mkt","assets","stag","volat","corr","pairs","btc","verifica","notizie","eventi","registro"],KO="ebOrdineHub";
 // v8.95 ordine dell'utente: le schede nuove (non ancora nel suo ordine) vanno in coda nell'ordine di base
 let ORD=BASE.slice();
 function applica(o){if(!Array.isArray(o))return false;const v=o.filter(t=>BASE.includes(t));if(!v.length)return false;
  ORD=v.concat(BASE.filter(t=>!v.includes(t)));return true;}
 try{applica(JSON.parse(localStorage.getItem(KO)||"null"));}catch(e){}
 function disegna(){
  //   Si riordinano anche i bottoni del menu nascosto, cosi' l'ordine e' lo stesso ovunque.
  const pos=t=>{const i=ORD.indexOf(t);return i<0?99:i;};
  const menu=document.querySelector('#nav .nghub .ngm');
  if(menu){const tutti=[...menu.querySelectorAll('button[data-t]')].sort((x,y)=>pos(x.dataset.t)-pos(y.dataset.t));tutti.forEach(x=>x.parentElement.appendChild(x));}
  const bt=[...document.querySelectorAll('#nav .nghub .ngm button[data-t]')].filter(b=>b.style.display!="none").sort((x,y)=>pos(x.dataset.t)-pos(y.dataset.t));
  el.innerHTML=`<h2>Mercati</h2>
   <p class="sub">Tieni premuta una card per riordinarle come le app del telefono: trascinala dove vuoi e tocca <b>Fine</b>. L'ordine resta salvato nel tuo profilo.</p>
   <div class="hbedit" role="toolbar" aria-label="Riordino delle schede"><span>Trascina le card per riordinarle</span>
    <button type="button" class="hbrip">Ripristina</button><button type="button" class="hbfine">Fine</button></div>
   <div class="hbgrid">${bt.map(b=>{const t=b.dataset.t;return `<button type="button" class="hbcard" data-vai="${t}">
    <span class="hbart" aria-hidden="true"><svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice">${ART[t]||""}</svg>
     <span class="hbico"><svg viewBox="0 0 24 24">${ICO[t]||""}</svg></span></span>
    <span class="hbnome">${b.innerHTML}</span></button>`;}).join("")}</div>`;
  modifica(false);}

 /* ---------- v8.95 modalita' modifica, trascinamento e salvataggio ---------- */
 const PRESSIONE=500,SOGLIA=8,RIPOSO=8000;            // ms per la pressione lunga, px di tolleranza, ms prima dell'uscita da sola
 let inModifica=false,riposo=null,lungo=null,P=null,salvaT=null,ignoraClick=false;
 const griglia=()=>el.querySelector(".hbgrid"),carte=()=>[...el.querySelectorAll(".hbcard")];
 function modifica(si){inModifica=si;const g=griglia();if(!g)return;
  g.classList.toggle("hbjig",si);el.classList.toggle("hbmod",si);
  // ogni card traballa con un ritmo leggermente diverso (come le icone di iPhone)
  carte().forEach((c,i)=>{c.style.setProperty("--jd",(-(i*97)%280)+"ms");c.setAttribute("aria-grabbed",si?"false":"");if(!si)c.removeAttribute("aria-grabbed");});
  clearTimeout(riposo);if(si)aspetta();}
 const aspetta=()=>{clearTimeout(riposo);riposo=setTimeout(()=>{if(!P)modifica(false);},RIPOSO);};
 const ordineDom=()=>carte().map(c=>c.dataset.vai);
 // salvataggio: subito nel browser, nel profilo dopo 0,8 s (piu' spostamenti di fila = una sola scrittura)
 function salva(o){ORD=o.concat(BASE.filter(t=>!o.includes(t)));
  try{localStorage.setItem(KO,JSON.stringify(ORD));}catch(e){}
  const menu=document.querySelector('#nav .nghub .ngm');                 // stesso ordine anche nel menu nascosto
  if(menu)ORD.forEach(t=>{const b=menu.querySelector(`button[data-t="${t}"]`);if(b)b.parentElement.appendChild(b);});
  clearTimeout(salvaT);salvaT=setTimeout(()=>{try{window.ebAccount&&ebAccount.ordine&&ebAccount.ordine.salva(ORD).catch(()=>{});}catch(e){}},800);}
 // FLIP: le card che cambiano posto scorrono dalla posizione vecchia alla nuova
 function sposta(fn){const ce=carte().filter(c=>!c.classList.contains("hbdrag")),prima=new Map(ce.map(c=>[c,c.getBoundingClientRect()]));fn();
  ce.forEach(c=>{const a=prima.get(c),b=c.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)return;
   c.style.transition="none";c.style.transform=`translate(${dx}px,${dy}px)`;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{c.style.transition="transform .28s cubic-bezier(.2,.8,.2,1)";c.style.transform="";}));});}

 el.addEventListener("pointerdown",e=>{const c=e.target.closest(".hbcard");if(!c||e.button>0)return;
  P={c,id:e.pointerId,x:e.clientX,y:e.clientY,tipo:e.pointerType,drag:false,tx:0,ty:0};
  if(inModifica){aspetta();return;}
  clearTimeout(lungo);
  lungo=setTimeout(()=>{if(!P||P.c!==c)return;modifica(true);ignoraClick=true;
   try{navigator.vibrate&&navigator.vibrate(12);}catch(_){}},PRESSIONE);});
 el.addEventListener("pointermove",e=>{if(!P||e.pointerId!==P.id)return;const dx=e.clientX-P.x,dy=e.clientY-P.y;
  if(!inModifica){if(Math.hypot(dx,dy)>SOGLIA){clearTimeout(lungo);P=null;}return;}     // si sta scorrendo la pagina
  if(!P.drag){if(Math.hypot(dx,dy)<SOGLIA)return;inizia();}
  trascina(e.clientX,e.clientY);});
 function inizia(){const c=P.c,r=c.getBoundingClientRect();P.drag=true;P.ox=P.x-r.left;P.oy=P.y-r.top;
  c.classList.add("hbdrag");c.setAttribute("aria-grabbed","true");try{c.setPointerCapture(P.id);}catch(_){}clearTimeout(riposo);}
 function trascina(x,y){const c=P.c;
  // posizione "di griglia" della card (senza lo spostamento in corso) e spostamento che la porta sotto il dito
  const r=c.getBoundingClientRect(),bx=r.left-P.tx,by=r.top-P.ty;P.tx=x-P.ox-bx;P.ty=y-P.oy-by;
  c.style.transform=`translate(${P.tx}px,${P.ty}px) scale(1.06)`;
  // la card sotto il dito (tranne quella trascinata): si prende il suo posto
  const sotto=carte().find(k=>{if(k===c)return false;const q=k.getBoundingClientRect();return x>q.left&&x<q.right&&y>q.top&&y<q.bottom;});
  if(!sotto)return;const L=carte(),i=L.indexOf(c),j=L.indexOf(sotto);
  sposta(()=>{j>i?sotto.after(c):sotto.before(c);});
  const r2=c.getBoundingClientRect(),bx2=r2.left-P.tx,by2=r2.top-P.ty;P.tx=x-P.ox-bx2;P.ty=y-P.oy-by2;   // ricalcolo dopo lo scambio
  c.style.transform=`translate(${P.tx}px,${P.ty}px) scale(1.06)`;}
 function lascia(){clearTimeout(lungo);if(!P)return;const {c,drag}=P;P=null;
  if(!drag){if(inModifica)aspetta();return;}
  // la card torna al suo nuovo posto con una piccola animazione, poi si salva l'ordine
  c.style.transition="transform .22s cubic-bezier(.2,.8,.2,1)";c.style.transform="";
  setTimeout(()=>{c.classList.remove("hbdrag");c.style.transition="";c.setAttribute("aria-grabbed","false");},230);
  ignoraClick=true;salva(ordineDom());aspetta();}
 el.addEventListener("pointerup",lascia);el.addEventListener("pointercancel",lascia);
 // telefono: durante la modifica il dito trascina la card e non fa scorrere la pagina
 el.addEventListener("touchmove",e=>{if(inModifica&&P)e.preventDefault();},{passive:false});
 // niente menu del tasto destro / fumetto del telefono sulla pressione lunga
 el.addEventListener("contextmenu",e=>{if(e.target.closest(".hbcard"))e.preventDefault();});
 // in modifica (e subito dopo la pressione lunga) il tocco non apre la scheda: si ferma prima dell'ascoltatore globale
 el.addEventListener("click",e=>{if(e.target.closest(".hbfine")){modifica(false);return;}
  if(e.target.closest(".hbrip")){sposta(()=>{const g=griglia();BASE.forEach(t=>{const c=g.querySelector(`.hbcard[data-vai="${t}"]`);if(c)g.appendChild(c);});});
   salva(ordineDom());aspetta();return;}
  if((inModifica||ignoraClick)&&e.target.closest(".hbcard")){e.preventDefault();e.stopPropagation();}ignoraClick=false;},true);
 // un tocco fuori dalle card (e fuori dalla barra) chiude la modifica, come su iPhone
 document.addEventListener("pointerdown",e=>{if(inModifica&&!e.target.closest(".hbcard,.hbedit"))modifica(false);});
 // tastiera: Esc esce; le frecce spostano la card che ha il fuoco
 el.addEventListener("keydown",e=>{if(!inModifica)return;if(e.key=="Escape"){modifica(false);return;}
  const c=e.target.closest(".hbcard");if(!c)return;const L=carte(),i=L.indexOf(c);
  const passo={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];if(!passo)return;e.preventDefault();
  const j=i+passo;if(j<0||j>=L.length)return;sposta(()=>{passo>0?L[j].after(c):L[j].before(c);});c.focus();salva(ordineDom());aspetta();});

 disegna();
 // l'ordine salvato nel profilo vince su quello del browser (stesso account su piu' dispositivi): letto una volta
 let letto=false;
 function dalProfilo(){if(letto||!window.ebAccount||!ebAccount.ordine)return;const s=ebAccount.stato&&ebAccount.stato();if(!s||!s.sessione)return;letto=true;
  ebAccount.ordine.leggi().then(o=>{if(o&&JSON.stringify(o)!=JSON.stringify(ORD)&&applica(o)){try{localStorage.setItem(KO,JSON.stringify(ORD));}catch(e){}if(!inModifica)disegna();}})
   .catch(()=>{letto=false;});}
 setTimeout(dalProfilo,2500);
 // ogni volta che si apre la pagina si ridisegna (es. "Registro" compare solo dopo l'accesso admin)
 const t=document.querySelector('#nav button[data-t="mercati"]');if(t)t.addEventListener("click",()=>{disegna();dalProfilo();});
 window.ebHub={disegna,ordine:()=>ORD.slice(),modifica};
}catch(e){console.error("[EdgeValor] hub mercati:",e);}})();
