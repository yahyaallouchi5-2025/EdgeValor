/* ---------- SIDEBAR v7.71: stato dati richiudibile + gruppo Assistenza ----------
   STATO DATI: di solito e' una riga sola ("Dati aggiornati" + data e ora). Un tocco apre l'elenco delle fonti.
   Il pallino e il titolo riassumono la fonte messa peggio: verde = tutto aggiornato, giallo = dati salvati,
   rosso = una fonte in ritardo. Col rosso l'elenco si apre da solo: l'utente lo vede quando serve.
   ASSISTENZA: raggruppa Feedback e Guida (i due pulsanti restano gli stessi, con gli stessi id).
   Le scelte aperto/chiuso restano nel browser (localStorage "ebSideBox": "ebSide" e' gia' usato da 11_guida.js per barra larga/ridotta e le due cose si cancellavano a vicenda). */
(function(){try{
 const btn=$("sdati"),box=$("status"),tit=$("sdtit"),ass=$("sassist"),sub=$("sassbox");
 let mem={};try{mem=JSON.parse(localStorage.getItem("ebSideBox")||"{}");}catch(e){}
 const salva=()=>{try{localStorage.setItem("ebSideBox",JSON.stringify(mem));}catch(e){}};
 const apri=(b,p,si)=>{p.hidden=!si;b.setAttribute("aria-expanded",si?"true":"false");};
 // riassunto dello stato: guarda il colore dei pallini delle righe (li scrive 02_stato.js e ebRigaStato)
 let forzato=false;
 function riassunto(){const col=[...box.querySelectorAll(".srow>i")].map(i=>i.style.background);
  const rit=col.filter(c=>/--s\)/.test(c)).length,avv=col.some(c=>/--warn/.test(c));
  btn.classList.toggle("rit",rit>0);btn.classList.toggle("avv",!rit&&avv);
  tit.textContent=rit?(rit==1?"1 dato in ritardo":rit+" dati in ritardo"):avv?"Dati salvati":"Dati aggiornati";
  if(rit&&!forzato){forzato=true;apri(btn,box,true);}
  // lo stato dei dati ora sta dentro il Profilo: se una fonte e' in ritardo, un puntino rosso sulla voce "Profilo" lo segnala
  const pf=$("pfapri");if(pf)pf.classList.toggle("pfrit",rit>0);}                 // col rosso si apre da solo (una volta)
 apri(btn,box,!!mem.dati);riassunto();
 new MutationObserver(riassunto).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:["style"]});
 btn.onclick=()=>{mem.dati=box.hidden;apri(btn,box,mem.dati);salva();};
 // v7.80: il gruppo "Assistenza" non c'e' piu' (Feedback e Guida sono nel riquadro del Profilo): si collega solo se esiste
 if(ass&&sub){apri(ass,sub,!!mem.ass);ass.onclick=()=>{mem.ass=sub.hidden;apri(ass,sub,mem.ass);salva();};}
}catch(e){console.error("[BoardEdge] sidebar:",e);}})();
