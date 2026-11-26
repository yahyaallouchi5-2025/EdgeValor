/* ---------- 39b_novita_chat.js - v8.06 NOVITA' IN UNA CHAT IN BASSO + ILLUMINAZIONE DELLA NOVITA' (anteprima admin) ----------
   Idea di Ya (18/11/2026): le novita' non stanno piu' nel Profilo ma in una BOLLA in basso a destra che avvisa, e
   quando apri una novita' la pagina ti PORTA sull'elemento nuovo e lo illumina.
   COME FUNZIONA:
     - BOLLA (.nvfab) in basso a destra: stellina + numero delle novita' non viste; se ce ne sono, un alone respira
       tre volte e si ferma (niente animazioni infinite).
     - CHAT (.nvchat): si apre dalla bolla, sale dal basso (su telefono a tutta larghezza). Ogni novita' e' un messaggio
       di EdgeValor con data, titolo, una riga e il pulsante "Mostrami".
     - MOSTRAMI: apre la scheda (go) e accende un FARO sull'elemento nuovo: la pagina si scurisce intorno, l'elemento
       resta acceso con un bordo verde acqua che pulsa e un'etichetta "Nuovo". Si chiude con un tocco o da solo.
     - PUNTINO sulla scheda del menu che contiene novita' non viste (es. "Mercati"), finche' non la apri.
   Ogni voce di NOVITA (in 39_novita.js) puo' avere q = elemento da illuminare (selettore CSS) dentro la scheda s.
   v8.06: approvata da Ya e visibile a tutti; la vecchia voce "Novita'" del Profilo e' nascosta (stile.css).
   DEBUG: localStorage.removeItem("ebNovita") fa ricomparire le novita' come non viste. */
(function(){try{
 const N=window.EB_NOVITA||[];if(!N.length)return;
 let vista="";try{vista=localStorage.getItem("ebNovita")||"";}catch(e){}
 const nuove=()=>N.filter(n=>n.d>vista);
 const gg=d=>new Date(d.slice(0,10)+"T12:00:00").toLocaleDateString(typeof EB_LOC=="string"?EB_LOC:"it-IT",{day:"numeric",month:"short"});
 const STELLA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/></svg>';
 // --- bolla ---
 const fab=document.createElement("button");fab.type="button";fab.className="nvfab";fab.setAttribute("aria-label","Novità");
 fab.innerHTML=STELLA+'<span class="nvnum" hidden></span>';document.body.appendChild(fab);
 function segna(){const n=nuove().length,b=fab.querySelector(".nvnum");b.hidden=!n;b.textContent=n;fab.classList.toggle("vivo",n>0);
  // puntino sulle schede del menu che hanno novita' non viste
  document.querySelectorAll(".nvdot").forEach(x=>x.remove());
  nuove().forEach(v=>{const t=document.querySelector(`[data-t="${v.s}"]:not([hidden]),[data-hub="${v.h||""}"]`);if(t&&!t.querySelector(".nvdot")){if(getComputedStyle(t).position=="static")t.style.position="relative";const s=document.createElement("i");s.className="nvdot";t.appendChild(s);}});}
 // --- chat ---
 let chat=null;
 function apri(){if(chat)return chiudi();
  chat=document.createElement("div");chat.className="nvchat";chat.setAttribute("role","dialog");chat.setAttribute("aria-label","Novità");
  chat.innerHTML=`<div class="nvtesta"><span class="nvav">${STELLA}</span><div><b>Novità</b><small>Aggiornamenti di EdgeValor</small></div>
   <button type="button" class="nvx" aria-label="Chiudi">&#x2715;</button></div>
   <div class="nvcorpo">${N.slice(0,10).map((n,i)=>`<div class="nvmsg${n.d>vista?" nvnew":""}" style="--i:${i}">
    <div class="nvmeta"><time>${gg(n.d)}</time>${n.d>vista?'<em>Nuovo</em>':""}${n.p?'<em class="p">Premium</em>':""}${n.cambio?'<em class="c">Mercati</em>':""}</div>
    <b>${esc(n.t)}</b><p>${esc(n.x)}</p>${n.s?`<button type="button" class="nvvai" data-i="${i}">Mostrami <span aria-hidden="true">→</span></button>`:""}</div>`).join("")}</div>`;
  document.body.appendChild(chat);vicino();requestAnimationFrame(()=>chat.classList.add("on"));fab.classList.add("aperto");
  chat.querySelector(".nvx").onclick=chiudi;
  chat.querySelectorAll(".nvvai").forEach(b=>b.onclick=()=>{const n=N[+b.dataset.i];chiudi();mostra(n);});
  vista=N[0].d;try{localStorage.setItem("ebNovita",vista);}catch(e){}segna();
  setTimeout(()=>document.addEventListener("mousedown",fuori),0);document.addEventListener("keydown",esc1);}
 // v9.34 con la bolla spostata la chat si apre accanto a lei (sopra o sotto, dove c'e' piu' spazio), sempre dentro
 //   lo schermo. Su telefono (fino a 600 px) resta il foglio a tutta larghezza in basso.
 function vicino(){if(!pos||innerWidth<=600)return;const b=fab.getBoundingClientRect(),c=chat.getBoundingClientRect(),g=12;
  const L=Math.min(Math.max(MARGINE,b.right-c.width),innerWidth-c.width-MARGINE);
  const sopra=b.top-g-MARGINE,sotto=innerHeight-b.bottom-g-MARGINE,suSopra=sopra>=sotto;
  chat.style.left=Math.round(L)+"px";chat.style.right="auto";chat.style.maxHeight=Math.round(Math.min(560,innerHeight*.7,Math.max(sopra,sotto)))+"px";
  if(suSopra){chat.style.top="auto";chat.style.bottom=Math.round(innerHeight-b.top+g)+"px";chat.style.transformOrigin="bottom right";}
  else{chat.style.bottom="auto";chat.style.top=Math.round(b.bottom+g)+"px";chat.style.transformOrigin="top right";}}
 function chiudi(){if(!chat)return;const c=chat;chat=null;c.classList.remove("on");setTimeout(()=>c.remove(),220);fab.classList.remove("aperto");
  document.removeEventListener("mousedown",fuori);document.removeEventListener("keydown",esc1);}
 const fuori=e=>{if(chat&&!chat.contains(e.target)&&!fab.contains(e.target))chiudi();};
 const esc1=e=>{if(e.key=="Escape")chiudi();};
 fab.onclick=e=>{if(spostato){spostato=false;e.preventDefault();return;}apri();};
 // --- v9.34 BOLLA SPOSTABILE (idea di Ya, 25/11/2026): si trascina ovunque nella pagina, col mouse su PC e col dito su
 //   telefono (tieni premuto e sposta). Un tocco o un clic senza spostamento la apre come prima.
 //   ANTI-SFARFALLIO: un solo sistema di eventi (pointer, uguale per mouse e dito), posizione con left/top aggiornata
 //   al massimo una volta per fotogramma (requestAnimationFrame), nessuna transizione durante il trascinamento,
 //   niente effetto hover sui telefoni (stile.css). La bolla resta sempre dentro lo schermo, anche quando lo schermo
 //   cambia (rotazione del telefono, finestra ridimensionata).
 //   POSIZIONE RICORDATA su questo dispositivo (localStorage "ebNovitaPos", in frazioni dello schermo: vale per ogni misura).
 //   DEBUG: localStorage.removeItem("ebNovitaPos") riporta la bolla nell'angolo in basso a destra.
 const MARGINE=8,SOGLIA=6;let spostato=false,pos=null;
 try{const v=JSON.parse(localStorage.getItem("ebNovitaPos")||"null");if(v&&isFinite(v.x)&&isFinite(v.y))pos=v;}catch(e){}
 // frazioni (0..1) -> pixel dentro lo schermo
 function metti(){if(!pos)return;const w=fab.offsetWidth,h=fab.offsetHeight,
   L=MARGINE+pos.x*Math.max(0,innerWidth-w-2*MARGINE),T=MARGINE+pos.y*Math.max(0,innerHeight-h-2*MARGINE);
  fab.style.left=Math.round(L)+"px";fab.style.top=Math.round(T)+"px";fab.style.right="auto";fab.style.bottom="auto";}
 let tr=null,rif=0;
 fab.addEventListener("pointerdown",e=>{if(e.button!==0)return;const r=fab.getBoundingClientRect();
  tr={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top,via:false};
  try{fab.setPointerCapture(e.pointerId);}catch(x){}       // i movimenti arrivano alla bolla anche se il puntatore corre via
  if(e.pointerType=="mouse")e.preventDefault();});          // niente selezione del testo trascinando col mouse
 fab.addEventListener("pointermove",e=>{if(!tr||e.pointerId!==tr.id)return;
  if(!tr.via){if(Math.hypot(e.clientX-tr.x0,e.clientY-tr.y0)<SOGLIA)return;
   tr.via=true;fab.classList.add("nvdrag");if(chat)chiudi();}
  tr.cx=e.clientX;tr.cy=e.clientY;
  if(!rif)rif=requestAnimationFrame(()=>{rif=0;if(!tr)return;const w=fab.offsetWidth,h=fab.offsetHeight,
    L=Math.min(Math.max(MARGINE,tr.cx-tr.dx),innerWidth-w-MARGINE),T=Math.min(Math.max(MARGINE,tr.cy-tr.dy),innerHeight-h-MARGINE);
   pos={x:(L-MARGINE)/Math.max(1,innerWidth-w-2*MARGINE),y:(T-MARGINE)/Math.max(1,innerHeight-h-2*MARGINE)};metti();});});
 function fine(e){if(!tr||e.pointerId!==tr.id)return;const via=tr.via;tr=null;
  if(rif){cancelAnimationFrame(rif);rif=0;}
  try{fab.releasePointerCapture(e.pointerId);}catch(x){}
  if(!via)return;spostato=true;setTimeout(()=>{spostato=false;},350);   // il clic che segue il rilascio non apre la chat
  fab.classList.remove("nvdrag");
  try{localStorage.setItem("ebNovitaPos",JSON.stringify(pos));}catch(x){}}
 fab.addEventListener("pointerup",fine);fab.addEventListener("pointercancel",fine);
 fab.addEventListener("dragstart",e=>e.preventDefault());
 addEventListener("resize",()=>{if(pos)requestAnimationFrame(metti);});
 metti();
 // --- faro sull'elemento nuovo ---
 function mostra(n){if(typeof go=="function"&&n.s)go(n.s);
  // v8.79 n.fn = nome di una funzione della scheda che apre da sola il punto giusto e restituisce l'elemento da
  //   illuminare (es. ebLiveMostra: strumento, "I segnali di X", candele). La scheda Live carica i dati a parte:
  //   si aspetta fino a 6 secondi che la funzione esista e risponda, poi si illumina la scheda intera.
  if(n.fn){let t=0;const prova=()=>{const f=window[n.fn],el=f&&document.getElementById("vfdati")&&f();
    if(el)faro(n,el);else if((t+=300)<6000)setTimeout(prova,300);else faro(n,document.getElementById(n.s));};
   setTimeout(prova,250);return;}
  setTimeout(()=>{if(n.apri){const a=document.querySelector(n.apri);if(a)a.click();}   // v8.40 apre prima il dettaglio che contiene l'elemento
   faro(n,n.q&&document.querySelector(n.q)||document.getElementById(n.s));},250);}
 // porta l'elemento in vista e lo illumina per qualche secondo
 function faro(n,el){if(!el)return;{
   const y=el.getBoundingClientRect().top+scrollY-Math.max(120,innerHeight*.3);scrollTo({top:y,behavior:"smooth"});
   setTimeout(()=>{const r=el.getBoundingClientRect(),p=8;
    const f=document.createElement("div");f.className="nvfaro";
    f.style.cssText=`left:${r.left-p}px;top:${r.top-p}px;width:${r.width+2*p}px;height:${Math.min(r.height+2*p,innerHeight*.45)}px`;if(r.top<90)f.classList.add("giu");
    f.innerHTML=`<span class="nvlab">${STELLA}Novità · ${esc(n.lab||n.t)}</span>`;document.body.appendChild(f);
    requestAnimationFrame(()=>f.classList.add("on"));
    const via=()=>{f.classList.remove("on");setTimeout(()=>f.remove(),300);removeEventListener("scroll",via,true);document.removeEventListener("mousedown",via);};
    setTimeout(()=>{addEventListener("scroll",via,true);document.addEventListener("mousedown",via);},400);setTimeout(via,6000);},650);}}
 window.ebNovitaMostra=i=>mostra(N[i||0]);
 segna();
}catch(e){console.error("[EdgeValor] novita chat:",e);}})();
