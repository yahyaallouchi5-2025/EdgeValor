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
 const gg=d=>new Date(d+"T12:00:00").toLocaleDateString(typeof EB_LOC=="string"?EB_LOC:"it-IT",{day:"numeric",month:"short"});
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
   <div class="nvcorpo">${N.slice(0,6).map((n,i)=>`<div class="nvmsg${n.d>vista?" nvnew":""}" style="--i:${i}">
    <div class="nvmeta"><time>${gg(n.d)}</time>${n.d>vista?'<em>Nuovo</em>':""}${n.p?'<em class="p">Premium</em>':""}</div>
    <b>${esc(n.t)}</b><p>${esc(n.x)}</p>${n.s?`<button type="button" class="nvvai" data-i="${i}">Mostrami <span aria-hidden="true">→</span></button>`:""}</div>`).join("")}</div>`;
  document.body.appendChild(chat);requestAnimationFrame(()=>chat.classList.add("on"));fab.classList.add("aperto");
  chat.querySelector(".nvx").onclick=chiudi;
  chat.querySelectorAll(".nvvai").forEach(b=>b.onclick=()=>{const n=N[+b.dataset.i];chiudi();mostra(n);});
  vista=N[0].d;try{localStorage.setItem("ebNovita",vista);}catch(e){}segna();
  setTimeout(()=>document.addEventListener("mousedown",fuori),0);document.addEventListener("keydown",esc1);}
 function chiudi(){if(!chat)return;const c=chat;chat=null;c.classList.remove("on");setTimeout(()=>c.remove(),220);fab.classList.remove("aperto");
  document.removeEventListener("mousedown",fuori);document.removeEventListener("keydown",esc1);}
 const fuori=e=>{if(chat&&!chat.contains(e.target)&&!fab.contains(e.target))chiudi();};
 const esc1=e=>{if(e.key=="Escape")chiudi();};
 fab.onclick=apri;
 // --- faro sull'elemento nuovo ---
 function mostra(n){if(typeof go=="function"&&n.s)go(n.s);
  setTimeout(()=>{const el=n.q&&document.querySelector(n.q)||document.getElementById(n.s);if(!el)return;
   const y=el.getBoundingClientRect().top+scrollY-Math.max(120,innerHeight*.3);scrollTo({top:y,behavior:"smooth"});
   setTimeout(()=>{const r=el.getBoundingClientRect(),p=8;
    const f=document.createElement("div");f.className="nvfaro";
    f.style.cssText=`left:${r.left-p}px;top:${r.top-p}px;width:${r.width+2*p}px;height:${Math.min(r.height+2*p,innerHeight*.45)}px`;if(r.top<90)f.classList.add("giu");
    f.innerHTML=`<span class="nvlab">${STELLA}Novità · ${esc(n.t)}</span>`;document.body.appendChild(f);
    requestAnimationFrame(()=>f.classList.add("on"));
    const via=()=>{f.classList.remove("on");setTimeout(()=>f.remove(),300);removeEventListener("scroll",via,true);document.removeEventListener("mousedown",via);};
    setTimeout(()=>{addEventListener("scroll",via,true);document.addEventListener("mousedown",via);},400);setTimeout(via,6000);},650);},250);}
 window.ebNovitaMostra=i=>mostra(N[i||0]);
 segna();
}catch(e){console.error("[EdgeValor] novita chat:",e);}})();
