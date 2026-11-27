/* ---------- v9.64 TESTATA GLOBALE (Ya, 27/11/2026: riferimento "terminale finanziario professionale") ----------
   Solo PC (larghezza > 900px). Una barra fissa in alto, indipendente dalla barra laterale:
     sinistra  logo EdgeValor + pulsante che stringe/allarga la barra laterale
     centro    ricerca globale (titoli, paesi, valute: la stessa ricerca della watchlist, tasto "/")
     destra    Novita' (con il numero delle non lette) · Guida · Assistenza · lingua IT/EN · account (iniziali + piano)
   La barra laterale resta SOLO per la navigazione: PRINCIPALE, IL MIO SPAZIO, Telegram, stato dei dati.
   UNA COSA SOLA PER FUNZIONE (niente doppioni): logo, ricerca e pulsante della barra vengono SPOSTATI qui dalla barra
   laterale (non copiati) e tornano al loro posto sul telefono; la stellina delle Novita' in basso a destra sul PC
   sparisce perche' c'e' la voce in testata (stesso pannello); Profilo in fondo alla barra sparisce perche' c'e' l'account.
   I pulsanti "cliccano" quelli di sempre (#gapri, #fbapri, lingua, .nvfab): nessuna logica copiata.
   Il menu dell'account e' il riquadro #pfbox (36_account.js) che 03c_sidebar.js apre sotto l'avatar (.pfpop).
   DEBUG: document.documentElement.classList.contains("tst") ; ebAccount.mostra(true) apre il menu dell'account. */
try{(function(){
 const h=document.documentElement,side=$("side"),box=$("pfbox"),pf=$("pfapri");
 if(!side||!h.classList.contains("sidev2")||!box||!pf)return;
 const pc=matchMedia("(min-width:901px)");
 const ICO={nov:'<path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/>',
  gui:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',ass:'<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',giu:'<path d="M6 9l6 6 6-6"/>'};
 const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
 const bar=document.createElement("header");bar.id="hdr";bar.className="hdr";
 bar.innerHTML=`<div class="hdsx"></div><div class="hdcerca"></div>
  <div class="hddx">
   <button type="button" class="hdbtn" data-k="nov">${svg("nov")}<span>${T("Novità")}</span><em class="hdnum" hidden></em></button>
   <button type="button" class="hdbtn" data-k="gapri">${svg("gui")}<span>${T("Guida")}</span></button>
   <button type="button" class="hdbtn" data-k="fbapri">${svg("ass")}<span>${T("Assistenza")}</span></button>
   <div class="vfseg hdlang" role="group" aria-label="${T("Lingua")}"><button type="button" data-l="it">IT</button><button type="button" data-l="en">EN</button></div>
   <button type="button" id="hdav" class="hdav" aria-haspopup="true" aria-expanded="false" aria-controls="pfbox" title="${T("Il tuo profilo")}">
    <span class="hdini" aria-hidden="true"></span><span class="hdnome">${T("Accedi")}</span><small class="hdeti" hidden></small>${svg("giu")}</button></div>`;
 document.body.prepend(bar);
 const sx=bar.querySelector(".hdsx"),ce=bar.querySelector(".hdcerca"),av=$("hdav"),ini=av.querySelector(".hdini"),nome=av.querySelector(".hdnome"),eti=av.querySelector(".hdeti"),num=bar.querySelector(".hdnum");
 // --- logo, pulsante della barra e ricerca: spostati qui sul PC, di nuovo nella barra laterale sul telefono
 const mossi=[[side.querySelector(".blogo"),sx],[$("scomprimi"),sx],[side.querySelector(".scerca"),ce]].filter(x=>x[0])
  .map(([el,dove])=>{const casa=document.createComment("testata");el.before(casa);return {el,dove,casa};});
 function sposta(){const su=pc.matches;h.classList.toggle("tst",su);
  mossi.forEach(m=>{if(su){if(!m.dove.contains(m.el))m.dove.append(m.el);}else if(m.dove.contains(m.el))m.casa.after(m.el);});
  copia();if(su)setTimeout(ancora,0);}
 // --- pulsanti: usano quelli di sempre
 const fab=()=>document.querySelector(".nvfab");
 bar.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const o=b.dataset.k=="nov"?fab():$(b.dataset.k);if(o)o.click();});
 bar.querySelectorAll(".hdlang button").forEach(b=>{b.classList.toggle("on",b.dataset.l==(typeof EB_LANG!="undefined"?EB_LANG:"it"));
  b.onclick=()=>{const o=box.querySelector(`.pflingua [data-lang="${b.dataset.l}"]`);if(o)o.click();};});
 av.onclick=()=>{if(window.ebAccount&&ebAccount.mostra)ebAccount.mostra(box.hidden);else pf.click();copia();};
 // --- stato copiato dagli originali: iniziali, piano, pallino rosso (dati in ritardo o anomalie), numero delle novita'
 function copia(){const st=window.ebAccount&&ebAccount.stato&&ebAccount.stato(),em=st&&st.utente&&st.utente.email;
  ini.textContent=em?(em.split("@")[0].replace(/[^a-z0-9]/gi,"").slice(0,2).toUpperCase()||"?"):"";
  av.classList.toggle("conav",!!em);nome.hidden=!!em;
  const pe=$("pfeti");eti.hidden=!pe||pe.hidden||!pe.textContent.trim();
  if(!eti.hidden){eti.textContent=pe.textContent;eti.className="hdeti "+[...pe.classList].filter(c=>c!="pfeti").join(" ");}
  av.classList.toggle("hdrit",pf.classList.contains("pfrit")||pf.classList.contains("pfanom"));
  av.setAttribute("aria-expanded",box.hidden?"false":"true");
  const n=fab()&&fab().querySelector(".nvnum");num.hidden=!n||n.hidden;if(n)num.textContent=n.textContent;}
 new MutationObserver(copia).observe(pf,{attributes:true,subtree:true,childList:true,characterData:true});
 new MutationObserver(copia).observe(box,{attributes:true,attributeFilter:["hidden"]});
 let n=0;const t=setInterval(()=>{copia();const f=fab();if(f&&!f._hd){f._hd=1;new MutationObserver(copia).observe(f,{subtree:true,childList:true,attributes:true,characterData:true});}
  if(++n>40)clearInterval(t);},1500);
 // la stellina resta nel codice ma, invisibile, si mette sotto la voce "Novita'": il pannello si apre da li'
 const nb=bar.querySelector('[data-k="nov"]');
 function ancora(){if(!pc.matches)return;const r=nb.getBoundingClientRect();h.style.setProperty("--hdx",Math.round(r.left+r.width/2-24)+"px");h.style.setProperty("--hdy",Math.round(r.top-4)+"px");}
 addEventListener("resize",ancora);setTimeout(ancora,0);setTimeout(ancora,1200);
 sposta();(pc.addEventListener?pc.addEventListener("change",sposta):pc.addListener(sposta));
 if(window.ebSidebar&&ebSidebar.fascia)ebSidebar.fascia();
})();}catch(e){console.warn("[EdgeValor] testata",e);}
