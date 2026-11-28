/* ---------- v9.50 SIDEBAR NUOVA (Ya, 26/11/2026: modello approvato) ----------
   Riordina la barra laterale SENZA cambiare id e funzioni degli elementi che esistono gia' (lista, invita, profilo,
   Telegram, stato dei dati): qui si spostano i nodi e si aggiungono solo le parti nuove. Ordine dall'alto:
     marchio + riduci | Cerca (apre la watchlist con il campo di ricerca) |
     TERMINALE: Dashboard, Portafogli, Azionario, Mercati (apribile: Forex, COT, Macro, Live, Stagionalita', Notizie,
                Tutti i mercati = la pagina Mercati con le card di oggi) |
     IL MIO SPAZIO: La mia watchlist, Invita amici (+1 mese) |
     in fondo, fissi: Telegram, stato dei dati, card del profilo (il suo menu si apre SOPRA la card, non spinge nulla).
   REGOLE DI SPAZIO: solo la parte centrale scorre; una sola sezione aperta alla volta (Mercati o watchlist).
   PC (oltre 900px): le schede in alto e il titolo della pagina spariscono, la navigazione e' tutta qui.
   Telefono e tablet: barra a cassetto (pulsante menu), le schede in alto restano; scegliendo una voce si chiude.
   Le Novita' restano sulla stellina a forma di palla (39b_novita_chat.js), non qui.
   DEBUG (F12): ebSidebar.segna() riallinea la voce attiva; document.querySelector(".side").classList.contains("v2") */
try{(function(){const side=$("side"),nav=$("nav");if(!side||!nav)return;
 const h=document.documentElement,mob=()=>matchMedia("(max-width:900px)").matches;
 side.classList.add("v2");h.classList.add("sidev2");
 const ICO={sig:'<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  port:'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',azioni:'<path d="M3 17l5-5 4 3 8-8M15 7h5v5"/>',
  mercati:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  cerca:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',giu:'<path d="M6 9l6 6 6-6"/>',dx:'<path d="M9 6l6 6-6 6"/>'};
 const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
 // sul telefono il pulsante della barra chiude il cassetto: si vede una X al posto della freccia
 const sc=$("scomprimi");if(sc&&!sc.querySelector(".sx"))sc.insertAdjacentHTML("beforeend",'<svg class="sx" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>');
 const chiudiCassetto=()=>{if(!mob())return;h.classList.remove("sideon");const o=$("sombra");if(o)o.hidden=true;};
 const brand=side.querySelector(".sbrand"),lista=$("lapri"),gLista=lista&&lista.closest(".sgruppo"),gInvita=$("invita")&&$("invita").closest(".sgruppo"),
  fondo=side.querySelector(".sfondo"),tg=side.querySelector(".stg"),sdati=$("sdati"),stato=$("status");

 // ---- 1) CERCA: apre la watchlist e mette il cursore nel suo campo di ricerca (un solo campo, niente doppioni)
 const cerca=document.createElement("button");cerca.type="button";cerca.className="scerca";
 cerca.title=T("Cerca titoli, paesi, valute");cerca.innerHTML=`${svg("cerca")}<span>${T("Cerca titoli, paesi, valute")}</span><kbd>/</kbd>`;
 brand.after(cerca);
 function focusCerca(){const i=$("lbox")&&$("lbox").querySelector("input");if(i){i.focus({preventScroll:true});i.scrollIntoView({block:"nearest"});}}
 // v9.78 (Ya, 28/11/2026: "cerco un titolo e al click non si clicca") con la barra RIDOTTA e la watchlist gia' aperta
 //   (aria-expanded="true" salvato) il clic non riallargava la barra: il campo restava nascosto. Ora la riallarga sempre.
 cerca.onclick=()=>{if(lista&&(lista.getAttribute("aria-expanded")!="true"||(!mob()&&document.documentElement.classList.contains("ridotta"))))lista.click();setTimeout(focusCerca,60);};
 // "/" sul PC porta alla ricerca (mai mentre si scrive in un campo)
 document.addEventListener("keydown",e=>{if(e.key!="/"||e.ctrlKey||e.metaKey||e.altKey||mob())return;
  const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;e.preventDefault();cerca.click();});

 // ---- 2) PARTE CENTRALE CHE SCORRE: Terminale + Il mio spazio
 const mezzo=document.createElement("div");mezzo.className="smezzo";cerca.after(mezzo);
 const voce=(t,txt)=>{const b=nav.querySelector(`button[data-t="${t}"]`);return b?(b.textContent||txt).trim():txt;};
 const mercatiT=[...nav.querySelectorAll(".ngm button[data-t]")].map(b=>b.dataset.t).concat("mercati");
 const SUB=["pairs","assets","mkt","verifica","stag","notizie"].filter(t=>nav.querySelector(`.ngm button[data-t="${t}"]`));
 const term=document.createElement("div");term.className="sgruppo snavg";
 term.innerHTML=`<small class="stit2">${T("Principale")}</small>`+
  ["sig","port","azioni"].map(t=>`<button type="button" class="sitem snav" data-vai="${t}">${svg(t)}<span>${voce(t,t)}</span><i class="snuovo" hidden></i></button>`).join("")+
  `<button type="button" class="sitem snav smerc" data-vai="mercati" aria-expanded="false">${svg("mercati")}<span>${T("Mercati")}</span><svg class="sfr" viewBox="0 0 24 24" aria-hidden="true">${ICO.giu}</svg></button>
   <div class="ssub2" hidden>${SUB.map(t=>`<button type="button" class="ssv" data-vai="${t}">${voce(t,t)}</button>`).join("")}
    <button type="button" class="ssv stutti" data-vai="mercati">${T("Tutti i mercati")}<svg viewBox="0 0 24 24" aria-hidden="true">${ICO.dx}</svg></button></div>`;
 // v9.64 (Ya, 27/11/2026) due gruppi distinti: PRINCIPALE (le schede) e IL MIO SPAZIO (watchlist, invita amici)
 const spazio=document.createElement("div");spazio.className="sgruppo spaziog";spazio.innerHTML=`<small class="stit2">${T("Il mio spazio")}</small>`;
 mezzo.append(term,spazio);
 if(gLista)spazio.append(gLista);if(gInvita)spazio.append(gInvita);
 // nomi chiari: "La mia watchlist" (una sola parola, niente doppione) e "+1 mese" sull'invito
 const ls=lista&&lista.querySelector("span");if(ls)ls.textContent=T("La mia watchlist");    // il numero resta nel badge #lnum di sempre
 const iv=$("invita");if(iv&&!iv.querySelector(".schip")){const s=iv.querySelector("span");if(s)s.insertAdjacentHTML("afterend",`<em class="schip">${T("+1 mese")}</em>`);}

 // ---- 3) PIEDE FISSO: Telegram compatto, stato dei dati, profilo (menu a comparsa sopra la card)
 const piede=document.createElement("div");piede.className="spiede";
 if(fondo){fondo.before(piede);if(tg)piede.append(tg);if(sdati)piede.append(sdati);if(stato)piede.append(stato);piede.append(fondo);}
 const nov=$("novapri");if(nov)nov.hidden=true;                         // le Novita' sono sulla stellina
 // avatar con le iniziali al posto dell'icona (quando l'account e' letto)
 const pf=$("pfapri");
 function avatar(){if(!pf)return true;const st=window.ebAccount&&ebAccount.stato&&ebAccount.stato();const em=st&&st.utente&&st.utente.email;
  let a=pf.querySelector(".sav");if(!em){if(a)a.remove();pf.classList.remove("conav");return false;}
  const ini=em.split("@")[0].replace(/[^a-z0-9]/gi,"").slice(0,2).toUpperCase()||"?";
  if(!a){a=document.createElement("span");a.className="sav";a.setAttribute("aria-hidden","true");pf.prepend(a);}a.textContent=ini;pf.classList.add("conav");return true;}
 let na=0;const ta=setInterval(()=>{if(avatar()||++na>40)clearInterval(ta);},1500);
 // il menu del profilo si chiude toccando fuori
 // v9.61 si chiude con ebAccount.mostra(false): pf.click() riapriva la barra ridotta; fuori anche l'avatar della barra in alto
 document.addEventListener("pointerdown",e=>{const b=$("pfbox");if(!b||b.hidden||!pf)return;
  if(e.target.closest("#pfbox,#pfapri,#hdav"))return;
  if(window.ebAccount&&ebAccount.mostra)ebAccount.mostra(false);else if(pf.getAttribute("aria-expanded")=="true")pf.click();});

 // v9.63 PROFILO A COMPARSA: sul PC il riquadro #pfbox esce dalla barra e compare accanto, ancorato in basso
 //   (prima si apriva dentro la barra e la intasava). Sul telefono torna al suo posto nel cassetto.
 (function(){const box=$("pfbox");if(!box||!pf)return;const pc=matchMedia("(min-width:901px)");
  const pop=document.createElement("div");pop.className="pfpop";document.body.appendChild(pop);
  const casa=document.createComment("pfbox");box.before(casa);
  // v9.64 con la testata globale (03d_testata.js) il menu si apre sotto l'avatar, in alto a destra
  const posto=()=>{const av=$("hdav");if(av&&av.offsetParent){const r=av.getBoundingClientRect();pop.style.left="auto";pop.style.bottom="auto";
    pop.style.right=Math.max(12,Math.round(innerWidth-r.right))+"px";pop.style.top=Math.round(r.bottom+8)+"px";return;}
   const r=side.getBoundingClientRect();pop.style.right="auto";pop.style.top="auto";pop.style.left=Math.round(r.right+8)+"px";pop.style.bottom="16px";};
  const sposta=()=>{if(pc.matches){if(!pop.contains(box)){pop.append(box);box.classList.add("v3");}posto();}
   else if(pop.contains(box)){casa.after(box);box.classList.remove("v3");}};
  sposta();(pc.addEventListener?pc.addEventListener("change",sposta):pc.addListener(sposta));
  new MutationObserver(()=>{if(!box.hidden&&pc.matches)requestAnimationFrame(posto);}).observe(box,{attributes:true,attributeFilter:["hidden"]});
  new MutationObserver(()=>{if(pc.matches)setTimeout(posto,260);}).observe(h,{attributes:true,attributeFilter:["class"]});   // barra larga/ridotta
  addEventListener("resize",()=>{if(pc.matches)posto();});
  document.addEventListener("keydown",e=>{if(e.key=="Escape"&&!box.hidden&&pc.matches&&window.ebAccount&&ebAccount.mostra)ebAccount.mostra(false);});})();

 // ---- 4) NAVIGAZIONE: le voci usano go() delle schede di sempre (link diretti e statistiche invariati)
 const sub=term.querySelector(".ssub2"),merc=term.querySelector(".smerc");
 function apriMercati(si){merc.setAttribute("aria-expanded",si);sub.hidden=!si;
  // una sola sezione aperta: se si apre Mercati si richiude la watchlist
  if(si&&lista&&lista.getAttribute("aria-expanded")=="true")lista.click();}
 term.addEventListener("click",e=>{const b=e.target.closest("[data-vai]");if(!b)return;const t=b.dataset.vai;
  if(b===merc&&!h.classList.contains("ridotta")){apriMercati(sub.hidden);return;}
  go(t);segna();chiudiCassetto();});
 if(lista)lista.addEventListener("click",()=>setTimeout(()=>{if(lista.getAttribute("aria-expanded")=="true"&&!sub.hidden){merc.setAttribute("aria-expanded",false);sub.hidden=true;}},0));
 // voce attiva = scheda attiva in #nav (anche quando si cambia scheda da un link o da una card)
 let ultimo="";
 function segna(){const on=nav.querySelector("button[data-t].on"),t=on?on.dataset.t:"sig",inM=mercatiT.includes(t);
  // arrivando su un mercato (link diretto, card della pagina Mercati) il sottomenu si apre e mostra dove si e'
  if(t!=ultimo){ultimo=t;if(inM&&t!="mercati"&&sub.hidden&&!mob()&&!h.classList.contains("ridotta"))apriMercati(true);}
  term.querySelectorAll(".snav").forEach(b=>{const s=b.dataset.vai=="mercati"?inM:b.dataset.vai==t;b.classList.toggle("on",s);if(s)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  sub.querySelectorAll(".ssv").forEach(b=>b.classList.toggle("on",b.dataset.vai==t&&!b.classList.contains("stutti")||b.classList.contains("stutti")&&t=="mercati"));
  // pallino "nuovo" delle schede (stesso segnale delle schede in alto)
  term.querySelectorAll(".snav[data-vai]").forEach(b=>{const n=nav.querySelector(`button[data-t="${b.dataset.vai}"]`),i=b.querySelector(".snuovo");
   if(n&&i)i.hidden=!(n.classList.contains("nuovo")||n.querySelector(".ndot,.nvpunto"));});}
 new MutationObserver(segna).observe(nav,{attributes:true,attributeFilter:["class"],subtree:true});segna();
 // ---- 5) v9.51 ALLINEAMENTO CON LA PRIMA CARD (solo PC): la fascia del logo prende l'altezza della prima card della pagina
 //   (striscia Black Friday, avviso dati, ecc.) cosi' inizio e fine coincidono. Card piu' alta di 64px = resta 48px (allinea l'inizio).
 const wrap=document.querySelector(".wrap");
 function primaCard(){if(!wrap)return null;const vis=e=>e&&e.id!="foot"&&e.offsetHeight>0&&getComputedStyle(e).position!="fixed";   // v9.59 il pie' pagina non e' mai la prima card
  let el=[...wrap.children].find(vis);if(el&&el.id=="sig")el=[...el.children].find(vis);return el||null;}
 let roC=null,ultimaC=null,attesa=0;
 // v9.59 (Ya, 27/11/2026) "una volta per tutte": la prima card visibile di ogni scheda prende la classe .eb-primo, che le toglie
 //   il margine in alto (stile.css). Cosi' parte sempre a 28px come il logo, qualunque cosa ci sia sopra o venga chiusa
 //   (striscia Black Friday, avviso festivita', dati demo): prima, chiuso l'avviso, "Prossimi eventi" restava 28px piu' in basso.
 function fascia(){attesa=0;const c=primaCard();
  if(c!==ultimaC){if(ultimaC)ultimaC.classList.remove("eb-primo");if(c)c.classList.add("eb-primo");if(roC)roC.disconnect();ultimaC=c;if(c&&window.ResizeObserver){roC=new ResizeObserver(()=>pianifica());roC.observe(c);}}
  const hh=c?Math.round(c.getBoundingClientRect().height):0,v=hh>=36&&hh<=64?hh:48;
  if(side.style.getPropertyValue("--fascia")!=v+"px")side.style.setProperty("--fascia",v+"px");}
 const pianifica=()=>{if(!attesa)attesa=requestAnimationFrame(fascia);};
 if(wrap){const mo=new MutationObserver(pianifica),att={attributes:true,attributeFilter:["hidden","style","class"]};
  // v9.59 si osservano anche le sezioni figlie (cambio scheda = classe "on" su una sezione): prima la fascia restava quella della scheda precedente
  const osserva=()=>{mo.observe(wrap,{childList:true,...att});[...wrap.children].forEach(e=>mo.observe(e,att));};osserva();
  new MutationObserver(osserva).observe(wrap,{childList:true});
  const sg=$("sig");if(sg)new MutationObserver(pianifica).observe(sg,{childList:true,subtree:true});}   // v9.59 subtree: anche l'avviso che si svuota
 addEventListener("resize",pianifica);fascia();
 window.ebSidebar={segna,apriMercati,fascia};
})();}catch(e){fail("Barra laterale","side",e);}
