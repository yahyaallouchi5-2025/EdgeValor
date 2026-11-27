/* ---------- v9.13 REGISTRO ANOMALIE (SOLO FONDATORE) ----------
   Riga nel Profilo, sotto "Dati aggiornati": pallino verde "Nessuna anomalia" oppure rosso con il numero di anomalie aperte.
   Un tocco apre la finestra del registro: anomalie aperte (da quando), controlli del terminale aperto adesso,
   le ultime 72 ore (un quadratino per ogni controllo orario) e le anomalie risolte con la loro durata.
   DATI (v9.54, privati): tabella privato.registro_anomalie in Supabase, scritta ogni ora da cot_radar/sorveglianza.py
   (funzione registro-anomalie) e letta qui con ebAccount.rpc("registro_anomalie"): il database la da' SOLO all'admin.
   IN TEMPO REALE: oltre al file, la pagina controlla da sola le fonti in ritardo (D.sources) e se la sorveglianza
   stessa si e' fermata (ultimo controllo piu' vecchio di ORE_FERMA). Si ricarica ogni 10 minuti.
   Visibile solo con la classe "eb-admin" (account fondatore, 36_account.js): la riga e' nascosta anche dal CSS. */
(function(){try{
 const ORE_FERMA=2.5,OGNI=10*60*1000;
 const admin=()=>document.documentElement.classList.contains("eb-admin");
 const btn=$("sanom"),tit=$("santit"),sot=$("ansub");if(!btn)return;
 let R=null,errore=false;
 // "2026-11-24 18:33" (ora italiana) -> "24/11 18:33"
 const gm=t=>t?t.slice(8,10)+"/"+t.slice(5,7)+" "+t.slice(11,16):"";
 // ora italiana attuale nello stesso formato del registro (per calcolare le ore passate senza sbagliare fuso)
 function oraRoma(){const p={};new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"})
  .formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;}
 const ms=t=>Date.UTC(+t.slice(0,4),+t.slice(5,7)-1,+t.slice(8,10),+t.slice(11,13),+t.slice(14,16));
 const ore=(da,a)=>(ms(a||oraRoma())-ms(da))/36e5;
 function durata(h){if(h<1)return Math.max(1,Math.round(h*60))+" min";if(h<48)return Math.round(h)+" h";return Math.round(h/24)+" g";}
 // controlli fatti dalla pagina aperta adesso (non aspettano il giro orario)
 function locali(){const out=[];
  (D.sources||[]).forEach(s=>{if(s.st=="late"||s.st=="err")out.push({area:"Terminale",testo:`${s.name}: ${s.st=="late"?T("in ritardo"):T("errore")}${s.msg?" · "+s.msg:""}`});});
  if(errore)out.push({area:"Registro",testo:T("Registro anomalie non raggiungibile.")});
  else if(R&&R.agg&&ore(R.agg)>ORE_FERMA)out.push({area:"Sorveglianza",testo:T("Sorveglianza ferma: ultimo controllo")+" "+gm(R.agg)+"."});
  return out;}
 function riga(){const n=((R&&R.aperte)||[]).length+locali().length;
  btn.classList.toggle("rit",n>0);btn.classList.toggle("avv",!R&&!errore);
  tit.textContent=!R&&!errore?T("Registro anomalie"):n?(n==1?T("1 anomalia"):n+" "+T("anomalie")):T("Nessuna anomalia");
  sot.textContent=R?T("Controllo")+" "+gm(R.agg):errore?T("non raggiungibile"):T("carico…");
  const pf=$("pfapri");if(pf)pf.classList.toggle("pfanom",n>0);
  const box=document.querySelector(".anmodal");if(box)corpo(box);}
 function carica(){if(!admin())return;
  if(!window.ebAccount||!ebAccount.rpc){errore=true;riga();return;}
  ebAccount.rpc("registro_anomalie").then(j=>{if(!j||typeof j!="object")throw new Error("vuoto");R=j;errore=false;riga();})
   .catch(()=>{errore=true;riga();});}
 // contenuto della finestra (ridisegnato a ogni ricarica, anche se e' aperta)
 function corpo(box){const ap=(R&&R.aperte)||[],lo=locali(),tutte=lo.concat(ap),ch=(R&&R.chiuse)||[],gi=((R&&R.giri)||[]).slice().reverse();
  const voce=(a,dove)=>`<li class="anv"><span class="antag">${esc(T(a.area||"Altro"))}</span><div><p>${esc(a.testo).replace(/https:\/\/\S+?(?=\.?$|\s)/g,u=>`<a href="${u}" target="_blank" rel="noopener">${T("apri il giro")} ↗</a>`)}</p>${dove?`<small>${dove}</small>`:""}</div></li>`;
  const stato=tutte.length?`<div class="anstato ko"><b>${tutte.length}</b><span>${tutte.length==1?T("anomalia aperta"):T("anomalie aperte")}</span></div>`
   :`<div class="anstato ok"><b>OK</b><span>${R&&R.ok_dal?T("Tutto regolare dal")+" "+gm(R.ok_dal):T("Tutto regolare")}</span></div>`;
  box.querySelector(".ancorpo").innerHTML=stato+
   (tutte.length?`<h4>${T("Aperte")}</h4><ul class="anl">${lo.map(a=>voce(a,T("adesso, da questa pagina"))).join("")}${ap.map(a=>voce(a,`${T("dal")} ${gm(a.dal)} · ${durata(ore(a.dal))}`)).join("")}</ul>`:"")+
   (gi.length?`<h4>${T("Ultime 72 ore")}</h4><div class="anore" role="img" aria-label="${T("Esito dei controlli orari")}">${gi.map(g=>`<i class="${g.n?"ko":"ok"}" title="${gm(g.t)} · ${g.n?g.n+" "+T("anomalie"):"OK"}"></i>`).join("")}</div>
    <div class="anleg"><span>${gm(gi[0].t)}</span><span>${gm(gi[gi.length-1].t)}</span></div>`:"")+
   // v9.31 riparazioni automatiche (riavvio dei prezzi live, giro fallito rilanciato): il problema si e' sistemato da solo
   (((R&&R.azioni)||[]).length?`<h4>${T("Riparate da sole")}</h4><ul class="anl chiuse">${R.azioni.slice(0,8).map(x=>voce({area:/^Prezzi live/.test(x.testo)?"Prezzi live":/tolto dalla borsa/.test(x.testo)?"Azionario":"Workflow",testo:x.testo},gm(x.t))).join("")}</ul>`:"")+
   (ch.length?`<h4>${T("Risolte")}</h4><ul class="anl chiuse">${ch.slice(0,12).map(a=>voce(a,`${gm(a.dal)} → ${gm(a.al)} · ${durata(ore(a.dal,a.al))}`)).join("")}</ul>`:"")+
   (!R&&!errore?`<p class="anvuoto">${T("carico…")}</p>`:"");
  box.querySelector(".ansott").textContent=R?T("Ultimo controllo")+" "+gm(R.agg)+" · "+T("ogni ora"):T("Controllo ogni ora");}
 function apri(){if(document.querySelector(".anmodal"))return;
  const box=document.createElement("div");box.className="cmodal anmodal";
  box.innerHTML=`<div class="cmodal-box anbox" role="dialog" aria-modal="true" aria-labelledby="ant">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg></span>
    <div><h3 id="ant">${T("Registro anomalie")} <button type="button" class="info" data-apri="aninfo" aria-expanded="false" aria-label="${T("Come funziona")}">i</button></h3><p class="ansott"></p></div>
    <button type="button" class="fbx" aria-label="${T("Chiudi")}">&#x2715;</button></div>
   <p id="aninfo" class="sub infotesto">${T("Ogni ora la sorveglianza controlla: sito pubblicato e senza errori, fonti COT, FRED e BCE, report COT arrivato dopo l'uscita CFTC, riepilogo COT su Telegram, Azionario, prezzi live a borsa aperta, giri automatici, archivio storico e stagionalità oraria. Due volte al giorno controlla anche l'aspetto del sito su PC e telefono: testi sovrapposti, pagine troppo larghe, animazioni che possono sfarfallare. I guasti passeggeri (prezzi live fermi, giro fallito) si riparano da soli: l'email privata arriva solo se il problema resta anche al controllo dopo. Gli iscritti non ricevono nulla. Visibile solo all'account fondatore.")}</p>
   <div class="ancorpo" aria-live="polite"></div></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});box.querySelector(".fbx").onclick=chiudi;
  corpo(box);carica();}
 btn.onclick=apri;
 // l'account si legge dopo: si parte quando compare la classe eb-admin, poi ogni 10 minuti
 let via=false;const parti=()=>{if(via||!admin())return;via=true;carica();setInterval(carica,OGNI);};
 parti();new MutationObserver(parti).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
}catch(e){console.warn("[EdgeValor] anomalie",e);}})();
