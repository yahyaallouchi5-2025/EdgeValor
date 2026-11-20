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
  {d:"2026-11-18",t:"Scheda Crypto",x:"Bitcoin e le principali altcoin: prezzi, volumi, drawdown dal massimo e profilo di ogni moneta.",s:"btc",q:"#btc .cysez",h:"mercati"},
  {d:"2026-11-17",t:"Nuova scheda Bitcoin",x:"Bussola macro (Premium) e termometro del sentiment: cosa muove Bitcoin, con grafici.",s:"btc",h:"mercati"},
  {d:"2026-11-17",t:"Assistenza",x:"Abbonamento, segnalazioni e call live con il team, con il numero della richiesta.",s:""},
];
 // v8.40 CAMBI DI STATO DEI MERCATI nelle novita' (idea di Ya, 20/11/2026): solo cambi CONFERMATI (vedi modalita.py),
 //   per 30 giorni dalla conferma. "Mostrami" apre la Dashboard, il dettaglio USA e illumina la modalita' di mercato.
 try{const m=D.economie&&D.economie.modalita,NM={PESSIMISMO:"Pessimismo",NORMALE:"Normale",ECCESSO:"Eccesso"};
  if(m&&m.conf&&m.prima&&(Date.now()-new Date(m.conf+"T12:00:00"))/864e5<=30)
   NOVITA.push({d:m.conf,t:`Modalità di mercato: ${NM[m.prima]} → ${NM[m.modo]}`,
    x:`Confermata dopo ${m.n||7} giorni di borsa di fila (dal ${m.da.slice(8,10)}/${m.da.slice(5,7)}). Solo contesto, non un segnale.`,
    s:"sig",q:".mm-fasi",lab:"Modalità di mercato",apri:'#quadro .qe-card[data-id="usa"]:not(.on)',cambio:1});
  // v8.44 fase del ciclo economico (per economia, confermata dopo 2 mesi: economie.py) e ciclo del debito USA
  //   (confermato dopo 2 trimestri di fila). Solo l'avviso aspetta la conferma: la scheda mostra sempre la fase di oggi.
  const E=D.economie||{},vic=d=>(Date.now()-new Date(d+"T12:00:00"))/864e5<=75,mm1=m=>{let[a,b]=m.split("-").map(Number);b++;if(b>12){a++;b=1;}return a+"-"+String(b).padStart(2,"0")+"-01";};
  (E.economie||[]).forEach(x=>{const c=x.cambio;if(!c)return;const d=mm1(c.mese);if(!vic(d))return;
   NOVITA.push({d,t:`Ciclo economico ${x.nome}: ${c.prima} → ${c.dopo}`,x:`Fase confermata per 2 mesi di fila. Solo contesto, non un segnale.`,
    s:"sig",q:".qe-mappa",lab:"Ciclo economico "+x.nome,apri:`#quadro .qe-card[data-id="${x.id}"]:not(.on)`,cambio:1});});
  const db=E.debito,CDN=["Espansione","Bolla","Picco","Crisi","Riduzione del debito"];
  if(db&&db.storia&&db.storia.length>2){const S=db.storia;let cur=null,serie=0,ult=null;
   S.forEach(([q,k],i)=>{serie=i&&S[i-1][1]==k?serie+1:1;if(k!==cur&&serie>=2){if(cur!==null)ult={prima:cur,dopo:k,i,q};cur=k;}});
   if(ult&&ult.i>=S.length-2){const [a,t]=ult.q.split("-T"),d=a+"-"+String((+t-1)*3+1).padStart(2,"0")+"-01";
    NOVITA.push({d,t:`Ciclo del debito: ${CDN[ult.prima]} → ${CDN[ult.dopo]}`,x:`Fase confermata per 2 trimestri di fila. Solo contesto, non un segnale.`,
     s:"sig",q:".cd-fasi:not(.mm-fasi)",lab:"Ciclo del debito",apri:'#quadro .qe-card[data-id="usa"]:not(.on)',cambio:1});}}
  NOVITA.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(b.cambio||0)-(a.cambio||0));}catch(e){}   // a parita' di data prima i mercati
 window.EB_NOVITA=NOVITA;                 // v8.06: la usa anche la chat delle novita' (39b_novita_chat.js)
 const btn=document.getElementById("novapri");if(!btn)return;
 const punto=btn.querySelector(".novpunto"),pf=document.getElementById("pfapri");
 const ultima=NOVITA[0].d;let vista="";try{vista=localStorage.getItem("ebNovita")||"";}catch(e){}
 const gg=d=>d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4);
 function segna(){const nuove=vista<ultima;punto.hidden=!nuove;if(pf)pf.classList.toggle("connov",nuove);}
 function apri(){const box=document.createElement("div");box.className="cmodal novmodal";
  box.innerHTML=`<div class="cmodal-box novbox" role="dialog" aria-modal="true" aria-labelledby="novt">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/></svg></span>
    <div><h3 id="novt">Novità</h3><p>Novità e aggiornamenti in EdgeValor.</p></div><button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
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
