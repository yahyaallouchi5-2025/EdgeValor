/* ---------- v9.14 BLACK FRIDAY / CYBER MONDAY: "blocca il prezzo di oggi" (fino al 30/11/2026) ----------
   PERCHE' (decisione di Ya, 24/11/2026): dal 1 dicembre Premium sale a 29,99 EUR al mese (24,99 con l'annuale).
   Chi si abbona prima tiene il prezzo di oggi (27,00 / 19,99) finche' resta abbonato: e' la leva della campagna.
   COSA SI VEDE (solo a chi non ha gia' un abbonamento pagato):
     1) STRISCIA in cima al terminale: fase della campagna, conto alla rovescia, "Blocca il prezzo". Si chiude con la X
        (torna il giorno dopo). Sul telefono resta solo l'essenziale.
     2) FINESTRA: si apre da sola UNA volta per fase (settimana, Black Friday, weekend, Cyber Monday) e dalla striscia.
        Conto alla rovescia, i due piani con il prezzo di oggi e quello dal 1/12, pulsante che apre il pagamento PayPal
        (46_abbonamento.js) con il piano gia' scelto.
   FASI (ora italiana): fino al 26/11 "Black Friday Week", 27/11 "Black Friday", 28-29/11 "Black Weekend",
   30/11 "Cyber Monday" (ultimo giorno). Dal 1/12 00:00 (EB_PREZZI.CAMBIO) tutto sparisce da solo.
   FONDATORE PRIMA: con PER_TUTTI=false la vede solo l'admin (classe eb-admin, anche se ha Premium a vita).
   DEBUG (F12): ebBlackFriday.apri() apre la finestra; localStorage "ebBF" tiene fasi gia' mostrate e chiusure. */
(function(){try{
 const PER_TUTTI=false;                               // true dopo l'ok di Ya
 const FINE=EB_PREZZI.CAMBIO;                          // 1/12/2026 00:00 ora italiana
 const V=EB_PREZZI.VECCHI,N=EB_PREZZI.NUOVI;
 const admin=()=>document.documentElement.classList.contains("eb-admin");
 // data di oggi a Roma "AAAA-MM-GG" (la fase cambia a mezzanotte italiana, non del PC)
 const oggi=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 function fase(){const d=oggi();
  // breve = etichetta sul telefono (la striscia deve stare su una riga)
  if(d>="2026-11-30")return {k:"cyber",nome:"Cyber Monday",breve:"Cyber Monday",ultimo:true};
  if(d>="2026-11-28")return {k:"weekend",nome:"Black Weekend",breve:"Black Weekend"};
  if(d=="2026-11-27")return {k:"friday",nome:"Black Friday",breve:"Black Friday"};
  return {k:"week",nome:"Black Friday Week",breve:"Black Friday"};}
 let mem={};try{mem=JSON.parse(localStorage.getItem("ebBF")||"{}");}catch(e){}
 const salva=()=>{try{localStorage.setItem("ebBF",JSON.stringify(mem));}catch(e){}};
 // conto alla rovescia: [giorni, ore, minuti, secondi] fino alla fine della campagna
 function resto(){const s=Math.max(0,Math.floor((FINE-Date.now())/1000));return [Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];}
 const due=n=>String(n).padStart(2,"0");
 // chi la vede: niente a chi ha gia' Premium pagato o a vita (tranne l'admin, che la controlla prima di tutti)
 function idoneo(){if(Date.now()>=FINE)return false;if(admin())return true;if(!PER_TUTTI)return false;
  const st=window.ebAccount&&ebAccount.stato();if(!st||!st.sessione)return false;const p=st.profilo;if(!p)return false;
  return !(p.sempre_premium||(p.premium_fino&&Date.parse(p.premium_fino)>Date.now()));}

 // ---------- striscia in cima ----------
 let striscia=null,giro=null;
 function mostraStriscia(){if(striscia||mem.chiusa==oggi())return;const f=fase();
  striscia=document.createElement("div");striscia.className="bfstrip bf-"+f.k;striscia.setAttribute("role","region");striscia.setAttribute("aria-label",f.nome);
  striscia.innerHTML=`<span class="bftag"><span class="bflungo">${f.nome}</span><span class="bfbreve">${f.breve}</span></span>
   <span class="bftesto">${f.ultimo?T("Ultimo giorno:"):""} ${T("blocca il prezzo di oggi, per sempre.")}</span>
   <span class="bfconto" aria-live="off"></span>
   <button type="button" class="bfcta"><span class="bflungo">${T("Blocca il prezzo")}</span><span class="bfbreve">${T("Blocca")}</span></button>
   <button type="button" class="bfx" aria-label="${T("Chiudi")}">&#x2715;</button>`;
  const al=document.getElementById("alerts");(al&&al.parentNode?al.parentNode.insertBefore(striscia,al):document.body.prepend(striscia));
  striscia.querySelector(".bfcta").onclick=()=>apri();
  striscia.querySelector(".bfx").onclick=()=>{mem.chiusa=oggi();salva();striscia.classList.add("via");setTimeout(()=>{striscia&&striscia.remove();striscia=null;},250);};
  tic();}
 function tic(){const r=resto();
  // sul telefono i secondi si nascondono (.bfsec): resta "5g 13:59"
  if(striscia)striscia.querySelector(".bfconto").innerHTML=`${r[0]}${T("g")} ${due(r[1])}:${due(r[2])}<span class="bfsec">:${due(r[3])}</span>`;
  const m=document.querySelector(".bfmodal");
  if(m)m.querySelectorAll(".bfnum b").forEach((b,i)=>{b.textContent=due(r[i]);});
  if(Date.now()>=FINE){striscia&&striscia.remove();striscia=null;m&&m.remove();clearInterval(giro);}}

 // ---------- finestra ----------
 function apri(){if(document.querySelector(".bfmodal"))return;const f=fase();let scelto="annuale";
  const box=document.createElement("div");box.className="cmodal bfmodal bf-"+f.k;
  const piano=(k,nome,oggiP,poiP,sotto)=>`<button type="button" role="radio" class="bfpiano${k==scelto?" on":""}" data-k="${k}" aria-checked="${k==scelto}">
    ${k=="annuale"?`<span class="bfpiu">${T("Più conveniente")}</span>`:""}<small>${nome}</small>
    <span class="bfprezzo"><b>${oggiP}</b><i>${T("/mese")}</i></span>
    <span class="bfpoi">${T("dal 1/12")} <s>${poiP}</s></span><em>${sotto}</em></button>`;
  box.innerHTML=`<div class="cmodal-box bfbox" role="dialog" aria-modal="true" aria-labelledby="bft">
   <button type="button" class="fbx" aria-label="${T("Chiudi")}">&#x2715;</button>
   <div class="bfalto"><span class="bftag">${f.nome}</span>${f.ultimo?`<span class="bfultimo">${T("Ultimo giorno")}</span>`:""}</div>
   <h2 id="bft">${T("Il prezzo sale il 1° dicembre.").replace("il 1° ","il\u00a01°\u00a0").replace("on 1 ","on\u00a01\u00a0")}</h2>
   <p class="bfsott">${T("Abbonati entro lunedì 30 novembre: paghi il prezzo di oggi finché resti abbonato.")}
    <button type="button" class="info" data-apri="bfinfo" aria-expanded="false" aria-label="${T("Come funziona")}">i</button></p>
   <p id="bfinfo" class="sub infotesto">${T("Il prezzo resta bloccato finché l'abbonamento è attivo, anche negli anni successivi. Se disdici e ti riabboni dal 1° dicembre vale il nuovo listino: 29,99 € al mese oppure 24,99 € al mese con l'annuale. Paghi con PayPal o carta, disdici quando vuoi dal Profilo.")}</p>
   <div class="bfconto2" role="timer" aria-label="${T("Tempo rimasto")}">${["giorni","ore","min","sec"].map(u=>`<span class="bfnum"><b>00</b><small>${T(u)}</small></span>`).join("")}</div>
   <div class="bfpiani" role="radiogroup" aria-label="${T("Piano")}">
    ${piano("annuale",T("Annuale"),V.annuale.mese,N.annuale.mese,`${V.annuale.prezzo} ${T("all'anno")}`)}
    ${piano("mensile",T("Mensile"),V.mensile.mese,N.mensile.mese,T("Mese per mese"))}</div>
   <button type="button" class="bfvai">${T("Blocca il prezzo")}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
   <button type="button" class="bfdopo">${T("Più tardi")}</button></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));tic();
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});
  box.querySelector(".fbx").onclick=chiudi;box.querySelector(".bfdopo").onclick=chiudi;
  box.querySelectorAll(".bfpiano").forEach(b=>b.onclick=()=>{scelto=b.dataset.k;
   box.querySelectorAll(".bfpiano").forEach(x=>{x.classList.toggle("on",x==b);x.setAttribute("aria-checked",x==b);});});
  // pagamento: la finestra PayPal di sempre, con il piano scelto qui (senza accesso chiede prima di entrare)
  box.querySelector(".bfvai").onclick=()=>{chiudi();setTimeout(()=>window.ebAbbonamento&&ebAbbonamento.apri(scelto),230);};
  mem["vista_"+f.k]=1;salva();}

 // ---------- avvio: quando l'account e' letto (classe eb-admin o profilo) ----------
 let fatto=false;
 function prova(){if(fatto||!idoneo())return;fatto=true;
  mostraStriscia();giro=setInterval(tic,1000);
  // apertura automatica una volta per fase, se non c'e' gia' un'altra finestra aperta
  const f=fase();if(!mem["vista_"+f.k])setTimeout(()=>{if(!document.querySelector(".cmodal"))apri();},2500);}
 if(Date.now()<FINE){new MutationObserver(prova).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  let n=0;const t=setInterval(()=>{prova();if(fatto||++n>30)clearInterval(t);},1000);}
 window.ebBlackFriday={apri,idoneo};
}catch(e){console.warn("[EdgeValor] black friday",e);}})();
