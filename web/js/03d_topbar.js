/* ---------- v9.61 BARRA IN ALTO A DESTRA (Ya, 27/11/2026: "me l'hai intasata", "necessitiamo anche menu orizzontale") ----------
   Solo PC (larghezza > 900px) con la barra laterale nuova (html.sidev2). Stile TradingView:
     Novita' · Guida · Assistenza · Lingua IT/EN · avatar con le iniziali (+ etichetta Premium/Prova) -> menu del profilo a tendina.
   La barra laterale resta per le schede; il riquadro del Profilo (#pfbox) che prima si apriva in basso, intasato,
   si sposta DENTRO la tendina e diventa compatto (stile.css, "v9.61"): intestazione, Admin e Anomalie affiancati,
   abbonamento, recensione, email con le offerte, Esci. Le voci gia' presenti nella barra (lingua, Novita', Guida,
   Assistenza) nella tendina non si ripetono.
   NIENTE COPIE DI LOGICA: i pulsanti della barra "cliccano" quelli di sempre (#novapri, #gapri, #fbapri, lingua),
   e la tendina usa ebAccount.mostra() di 36_account.js. Sul telefono tutto torna com'era (cassetto laterale).
   DEBUG: document.getElementById("tbar") ; ebAccount.mostra(true) apre la tendina. */
try{(function(){
 const h=document.documentElement,wrap=document.querySelector(".wrap"),box=$("pfbox"),pf=$("pfapri");
 if(!wrap||!box||!pf)return;
 const pc=matchMedia("(min-width:901px)");
 const ICO={nov:'<path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/>',
  gui:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',ass:'<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  giu:'<path d="M6 9l6 6 6-6"/>'};
 const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
 const bar=document.createElement("header");bar.id="tbar";bar.className="tbar";
 bar.innerHTML=`<div class="tbdx">
   <button type="button" class="tbtn" data-k="novapri" title="${T("Le ultime novità della piattaforma")}">${svg("nov")}<span>${T("Novità")}</span><i class="tbpunto" hidden></i></button>
   <button type="button" class="tbtn" data-k="gapri" title="${T("Come funziona")}">${svg("gui")}<span>${T("Guida")}</span></button>
   <button type="button" class="tbtn" data-k="fbapri" title="${T("Abbonamento, segnalazioni e call live con il team")}">${svg("ass")}<span>${T("Assistenza")}</span></button>
   <div class="vfseg tblang" role="group" aria-label="${T("Lingua")}"><button type="button" data-l="it">IT</button><button type="button" data-l="en">EN</button></div>
   <div class="tbprof"><button type="button" id="tbav" class="tbav" aria-haspopup="true" aria-expanded="false" aria-controls="pfbox" title="${T("Il tuo profilo")}">
     <span class="tbini" aria-hidden="true"></span><span class="tbnome">${T("Accedi")}</span><small class="tbeti" hidden></small>${svg("giu")}</button>
    <div id="tbmenu" class="tbmenu"></div></div></div>`;
 wrap.prepend(bar);
 const av=$("tbav"),menu=$("tbmenu"),ini=av.querySelector(".tbini"),nome=av.querySelector(".tbnome"),eti=av.querySelector(".tbeti");
 // i pulsanti della barra usano quelli originali (stessa logica, stesse statistiche)
 bar.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const o=$(b.dataset.k);if(o)o.click();});
 // lingua: stessa scelta della riga "Lingua" del profilo
 const lingua=()=>{const on=(typeof EB_LANG!="undefined"?EB_LANG:"it");bar.querySelectorAll(".tblang button").forEach(b=>b.classList.toggle("on",b.dataset.l==on));};
 bar.querySelectorAll(".tblang button").forEach(b=>b.onclick=()=>{const o=box.querySelector(`.pflingua [data-lang="${b.dataset.l}"]`);if(o)o.click();});
 lingua();
 // pallino delle Novita' e stato dell'avatar copiati dagli originali (pallino rosso = dati in ritardo o anomalie)
 const punto=bar.querySelector(".tbpunto");
 function copia(){const np=document.querySelector("#novapri .novpunto");punto.hidden=!np||np.hidden;
  const st=window.ebAccount&&ebAccount.stato&&ebAccount.stato(),em=st&&st.utente&&st.utente.email;
  ini.textContent=em?(em.split("@")[0].replace(/[^a-z0-9]/gi,"").slice(0,2).toUpperCase()||"?"):"";
  av.classList.toggle("conav",!!em);nome.hidden=!!em;
  const pe=$("pfeti");eti.hidden=!pe||pe.hidden||!pe.textContent.trim();if(!eti.hidden){eti.textContent=pe.textContent;eti.className="tbeti "+[...pe.classList].filter(c=>c!="pfeti").join(" ");}
  av.classList.toggle("tbrit",pf.classList.contains("pfrit")||pf.classList.contains("pfanom"));
  av.setAttribute("aria-expanded",!box.hidden&&menu.contains(box)?"true":"false");}
 new MutationObserver(copia).observe(pf,{attributes:true,subtree:true,childList:true,characterData:true});
 const np=document.querySelector("#novapri .novpunto");if(np)new MutationObserver(copia).observe(np,{attributes:true});
 new MutationObserver(copia).observe(box,{attributes:true,attributeFilter:["hidden"]});
 let n=0;const t=setInterval(()=>{copia();if(++n>40)clearInterval(t);},1500);
 // il riquadro del profilo va nella tendina sul PC e torna nella barra laterale sul telefono
 const casa=document.createComment("pfbox");box.before(casa);
 function sposta(){if(pc.matches){if(!menu.contains(box)){menu.append(box);box.classList.add("v3");}}
  else if(menu.contains(box)){casa.after(box);box.classList.remove("v3");}
  copia();}
 sposta();(pc.addEventListener?pc.addEventListener("change",sposta):pc.addListener(sposta));
 av.onclick=()=>{if(!window.ebAccount||!ebAccount.mostra)return pf.click();ebAccount.mostra(box.hidden);copia();};
 document.addEventListener("keydown",e=>{if(e.key=="Escape"&&!box.hidden&&menu.contains(box)&&window.ebAccount){ebAccount.mostra(false);av.focus();}});
 window.ebTopbar={copia};
})();}catch(e){console.warn("[EdgeValor] barra in alto",e);}
