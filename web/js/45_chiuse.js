/* ---------- 45_chiuse.js - v8.07 SCHEDE CHIUSE AL BASIC (Ya, 18/11/2026) ----------
   Per chi NON ha Premium (EB_PREMIUM falso) queste schede sono chiuse: COT, Forex, Crypto, Volatilita',
   Stagionalita', Correlazioni. I loro dati NON sono nella pagina (premium.py li cifra e lascia contenitori vuoti):
   qui si mette solo la grafica del lucchetto. Ultimo file: lavora dopo che le altre schede si sono disegnate.
   COSA FA:
     1) ogni scheda chiusa mostra titolo + lucchetto "Passa a Premium" (ebBlocco di 01_base.js);
     2) DASHBOARD: le card "Posizionamento" e "Nuovi dati COT" restano visibili ma con il lucchetto al posto dei
        numeri; tutta la parte dei segnali COT (Settori, Forex, Materie prime, Indici, Tassi, Crypto) diventa un
        solo riquadro con lucchetto. Quadro economico, Clima, Prossima rotazione, Notizie e Paesi restano aperti;
     3) NIENTE PONTI: le card della pagina Mercati delle schede chiuse hanno il lucchetto, e nessun collegamento
        porta a contenuti veri (non ci sono nella pagina).
   Chi e' in prova o Premium non passa di qui: vede tutto come prima.
   DEBUG: EB_PREMIUM in console dice se i dati Premium sono aperti. */
(function(){try{
 if(EB_PREMIUM)return;
 const CHIUSE={
  assets:["COT","Posizionamento dei grandi speculatori su ogni strumento, con forza e conferme."],
  pairs:["Forex","Tutte le coppie di valute ordinate per punteggio, con carry e divergenze."],
  btc:["Crypto","Bussola macro di Bitcoin, sentiment e tabella completa delle criptovalute."],
  volat:["Volatilità","Quanto si muove ogni strumento: regime di adesso, settimana, giorno e mese."],
  stag:["Stagionalità","Gli effetti stagionali affidabili, strumento per strumento."],
  corr:["Correlazioni","Chi si muove insieme e chi al contrario, tra prezzi e flussi."]};
 window.EB_CHIUSE=Object.keys(CHIUSE);
 // 1) schede chiuse
 for(const k in CHIUSE){const s=$(k);if(!s)continue;const [t,x]=CHIUSE[k];
  s.innerHTML=`<h2>${t}</h2>${ebBlocco(t,x,{velo:true,righe:7,cls:"plk-scheda"})}`;}
 // 2) Dashboard: card con lucchetto e blocco dei segnali
 const corpo=`<div class="kzlk"><span>${LUCCHETTO}</span><b>Premium</b></div>`;
 document.querySelectorAll("#kpis .kz1,#kpis .kz4").forEach(a=>{
  ["href","data-scorri","data-vai","title"].forEach(n=>a.removeAttribute(n));a.setAttribute("data-premium","");a.setAttribute("role","button");a.tabIndex=0;
  a.classList.add("kzchiusa");a.onclick=null;
  [...a.children].forEach(c=>{if(!c.classList.contains("kzt")&&!c.classList.contains("kzq"))c.remove();});
  a.insertAdjacentHTML("beforeend",corpo);});
 const da=$("topaz"),a=$("peblocco");
 if(da&&a&&da.parentNode==a.parentNode){let n=da.nextSibling;while(n&&n!=a){const p=n.nextSibling;n.remove();n=p;}
  a.insertAdjacentHTML("beforebegin",`<h2>Posizionamento</h2>${ebBlocco("Dove puntano gli speculatori","Forex, materie prime, indici, tassi e crypto: i segnali attivi di questa settimana.",{velo:true,righe:6,cls:"plk-scheda"})}`);}
 // Macro resta aperta, tranne la tabella per strumento (punteggio "Mercato" di ogni strumento = parte del COT)
 const mt=$("mtable");if(mt){const w=mt.closest(".tablewrap")||mt;w.outerHTML=ebBlocco("Quanto è già scontato, strumento per strumento","Mossa implicita, mossa reale e punteggio di ogni strumento.",{velo:true,righe:5});}
 // 3) pagina Mercati: lucchetto sulle card delle schede chiuse (la card apre la scheda, che mostra solo il lucchetto)
 function hub(){document.querySelectorAll("#mercati [data-t],#mercati [data-vai]").forEach(c=>{const k=c.dataset.t||c.dataset.vai;
   if(CHIUSE[k]&&!c.querySelector(".hblk")){c.classList.add("hbchiusa");c.insertAdjacentHTML("beforeend",`<span class="hblk" title="Premium">${LUCCHETTO}</span>`);}});}
 hub();const m=$("mercati");if(m)new MutationObserver(hub).observe(m,{childList:true,subtree:true});
}catch(e){console.error("[EdgeValor] schede chiuse:",e);}})();
