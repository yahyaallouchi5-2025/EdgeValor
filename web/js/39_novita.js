/* ---------- 39_novita.js - v7.94 NOVITA' DELLA PIATTAFORMA (voce "Novita'" nel Profilo) ----------
   Elenco delle novita' scritto a mano qui sotto (NOVITA): la piu' recente PRIMA. Ogni voce = {d: data, t: titolo,
   x: una riga di spiegazione, s: scheda da aprire (facoltativa), p: true se e' Premium}.
   - un PALLINO sulla voce "Novita'" e sul pulsante "Profilo" quando c'e' qualcosa che l'utente non ha ancora visto
     (si ricorda nel browser la data dell'ultima novita' vista: localStorage "ebNovita");
   - toccando la voce si apre una finestra con le ultime 5 novita'; "Vai" apre la scheda giusta.
   Niente dati da server: le novita' escono con la versione del sito che le contiene.
   DEBUG: F12 -> Console -> localStorage.removeItem("ebNovita") fa ricomparire il pallino. */
(function(){try{
 const NOVITA=[
  {d:"2026-11-17",t:"Nuova scheda Bitcoin",x:"Bussola macro (Premium) e termometro del sentiment: cosa muove Bitcoin, con grafici.",s:"btc"},
  {d:"2026-11-17",t:"Assistenza",x:"Abbonamento, segnalazioni e call live con il team, con il numero della richiesta.",s:""},
  {d:"2026-11-17",t:"Premium e Basic",x:"Basic per capire i mercati, Premium per sapere cosa fare. 14 giorni di prova.",s:"port"},
  {d:"2026-11-16",t:"Accesso con email e password",x:"Account personale: la tua lista ti segue su ogni dispositivo.",s:""}];
 const btn=document.getElementById("novapri");if(!btn)return;
 const punto=btn.querySelector(".novpunto"),pf=document.getElementById("pfapri");
 const ultima=NOVITA[0].d;let vista="";try{vista=localStorage.getItem("ebNovita")||"";}catch(e){}
 const gg=d=>d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4);
 function segna(){const nuove=vista<ultima;punto.hidden=!nuove;if(pf)pf.classList.toggle("connov",nuove);}
 function apri(){const box=document.createElement("div");box.className="cmodal novmodal";
  box.innerHTML=`<div class="cmodal-box novbox" role="dialog" aria-modal="true" aria-labelledby="novt">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/></svg></span>
    <div><h3 id="novt">Novità</h3><p>Cosa è cambiato in EdgeValor.</p></div><button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
   <ol class="novlista">${NOVITA.slice(0,5).map(n=>`<li class="${n.d>vista?"nuova":""}"><div class="novtesta"><b>${esc(n.t)}</b>${n.p?'<em class="novp">Premium</em>':""}${n.d>vista?'<em class="novn">Nuovo</em>':""}<time>${gg(n.d)}</time></div>
    <p>${esc(n.x)}</p>${n.s?`<button type="button" class="novvai" data-s="${n.s}">Vai</button>`:""}</li>`).join("")}</ol></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});box.querySelector(".fbx").onclick=chiudi;
  box.querySelectorAll(".novvai").forEach(b=>b.onclick=()=>{chiudi();if(typeof go=="function")go(b.dataset.s);});
  vista=ultima;try{localStorage.setItem("ebNovita",ultima);}catch(e){}segna();}
 btn.onclick=apri;segna();
}catch(e){console.error("[EdgeValor] novita:",e);}})();
