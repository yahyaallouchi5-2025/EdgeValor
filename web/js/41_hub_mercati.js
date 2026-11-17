
/* ---------- 41_hub_mercati.js - v7.95 PAGINA "MERCATI" A CARD ----------
   Il pulsante "Mercati" della barra apre questa pagina (#mercati) invece della tendina: una griglia di card,
   una per scheda (Forex, Strumenti, Macro, Bitcoin, Volatilita', Stagionalita', Correlazioni, Live).
   Ogni card ha uno sfondo disegnato a tema (SVG, nessuna immagine esterna), un'icona al centro e il nome:
   il tocco porta alla scheda di sempre (go). Le schede sono lette dai bottoni nascosti nella barra (index.html),
   quindi una scheda nascosta (es. "Registro" per chi non e' admin) non compare.
   Dopo, il pulsante "Mercati" mostra anche il nome della scheda aperta ("Mercati · Forex"): un tocco riporta qui.
   DEBUG: ebHub.disegna() ridisegna la griglia. */
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
  // righe di registro
  registro:[...Array(6)].map((_,i)=>`<rect x="24" y="${18+i*21}" width="${150+((i*41)%110)}" height="7" rx="3.5" class="hbd"/>`).join("")};
 function disegna(){
  const bt=[...document.querySelectorAll('#nav .nghub .ngm button[data-t]')].filter(b=>b.style.display!="none");
  el.innerHTML=`<h2>Mercati</h2>
   <div class="hbgrid">${bt.map(b=>{const t=b.dataset.t;return `<button type="button" class="hbcard" data-vai="${t}">
    <span class="hbart" aria-hidden="true"><svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice">${ART[t]||""}</svg>
     <span class="hbico"><svg viewBox="0 0 24 24">${ICO[t]||""}</svg></span></span>
    <span class="hbnome">${b.innerHTML}</span></button>`;}).join("")}</div>`;}
 disegna();
 // ogni volta che si apre la pagina si ridisegna (es. "Registro" compare solo dopo l'accesso admin)
 const t=document.querySelector('#nav button[data-t="mercati"]');if(t)t.addEventListener("click",disegna);
 window.ebHub={disegna};
}catch(e){console.error("[EdgeValor] hub mercati:",e);}})();
