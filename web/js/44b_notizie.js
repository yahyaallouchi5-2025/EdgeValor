/* ---------- 44b_notizie.js - v8.86 NOTIZIE MACRO (anteprima SOLO ADMIN, nella scheda Eventi) ----------
   Richiesta di Ya (23/11/2026): studiare come reagiscono i diversi strumenti alle notizie macro (NFP, CPI, Fed, banche
   centrali): un registro del passato che si allunga ogni giorno. Ogni notizia lascia una traccia sul grafico orario.
   QUATTRO PEZZI (uno strumento alla volta, scelto dal menu; i bottoni filtrano il driver):
     1. grafico orario e giornaliero (motore di 13c_candele.js in modalita' "notizie": linea gialla all'ora esatta,
        barretta verde/rossa = mossa della prima ora, etichetta con la mossa);
     2. "Come reagisce": per driver, mossa tipica della prima ora, quante volte e' forte, se prosegue, contro un'ora qualsiasi;
     3. "Registro": tutte le notizie misurate, dalla piu' recente (tocco = il grafico va a quella notizia);
     4. "Su tutti gli strumenti": per il driver scelto, quali strumenti si muovono di piu' (volte un'ora normale).
   DATI (ramo "orari", scritti ogni notte da cot_radar/impatto.py): pubblico/impatto/indice.json e <SIMBOLO>.json
     ev = [[ora UTC, driver, r1, r4, r24, x, dopo]], st = [{n, casi, r1, x, forte, seg, segG, nG, dal}], ctrl = {forte, seg, segG}
   Niente previsioni e niente consigli: e' il registro di quello che e' successo.
   DEBUG: ebNotizieMacro.stato (strumento, driver, dati letti) */
(function(){try{
 const BASE=EB_RAW+"orari/pubblico/impatto/",H1_DAL="2026-08-01";
 const cache={},leggi=u=>cache[u]||(cache[u]=fetch(u).then(r=>r.ok?r.json():null).catch(()=>null));
 const S={s:"EURUSD.FOREX",d:"",n:10,tutti:false,I:null,X:null};
 const pc=v=>v==null?"n/d":(v>0?"+":v<0?"−":"")+fx(Math.abs(v),2)+"%";
 const GG=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",day:"2-digit",month:"2-digit",year:"2-digit"});
 const HH=new Intl.DateTimeFormat(EB_LOC,{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit"});
 const GRUPPI=[["Cambi",s=>s.endsWith(".FOREX")&&!/^X(AU|AG)/.test(s)],["Metalli",s=>/^X(AU|AG)/.test(s)],["Indici",s=>s.endsWith(".INDX")],
  ["ETF USA",s=>s.endsWith(".US")],["Crypto",s=>s.endsWith(".CC")]];
 const etichetta=s=>{const b=s.split(".")[0];return s.endsWith(".FOREX")&&b.length==6?b.slice(0,3)+"/"+b.slice(3):b.replace("-USD","");};

 function struttura(box){
  box.innerHTML=`<h2>Notizie macro <span class="tag evtag">anteprima admin</span></h2>
   <p class="sub">Come reagisce ogni strumento alle notizie del calendario (NFP, CPI, Fed e banche centrali), ora per ora. <b>Prima ora</b> = dalla chiusura dell'ora prima alla chiusura della candela della notizia. <b>× normale</b> = quante volte è più grande della stessa ora negli altri giorni (ultimi 30). <b>Prosegue</b> = quante volte, nelle 23 ore dopo, il prezzo continua nel verso della prima ora: accanto, lo stesso conto su ore qualsiasi, cioè il caso. Se il mercato era chiuso all'ora della notizia (azioni USA alle 14:30) la notizia non si conta. Le banche centrali fuori dagli USA si registrano da settembre 2026. Registro di quello che è successo, non una previsione.</p>
   <div class="nm-ctl"><select class="nm-sel" aria-label="Strumento"></select><div class="nm-chips" role="group" aria-label="Driver"></div></div>
   <div class="nm-graf"></div>
   <h3 class="vft">Come reagisce</h3>
   <div class="nm-tab"></div>
   <h3 class="vft">Registro</h3>
   <div class="nm-reg"></div>
   <h3 class="vft nm-tutti-t">Su tutti gli strumenti</h3>
   <p class="sub">Mediana della prima ora, in volte un'ora normale alla stessa ora. Tocca uno strumento per aprirlo.</p>
   <div class="nm-tutti"></div>`;
  box.querySelector(".nm-sel").onchange=e=>{S.s=e.target.value;S.n=10;strumento(box);};
  box.querySelector(".nm-chips").onclick=e=>{const b=e.target.closest("button");if(!b)return;S.d=b.dataset.d;S.n=10;resto(box);};
  box.querySelector(".nm-reg").onclick=e=>{const r=e.target.closest("[data-t]");
   if(r){grafico(box,r.dataset.t);box.querySelector(".nm-graf").scrollIntoView({behavior:"smooth",block:"center"});return;}
   if(e.target.closest(".nm-piu")){S.n+=20;registro(box);}};
  box.querySelector(".nm-tab").onclick=e=>{const r=e.target.closest("tr[data-d]");if(r){S.d=r.dataset.d;resto(box);}};
  box.querySelector(".nm-tutti").onclick=e=>{if(e.target.closest(".nm-ogni")){S.tutti=true;tutti(box);return;}
   const r=e.target.closest("[data-s]");if(!r)return;S.s=r.dataset.s;S.n=10;
   box.querySelector(".nm-sel").value=S.s;strumento(box);box.scrollIntoView({behavior:"smooth"});};}

 function menu(box){const L=S.I.sim;if(!L.some(x=>x.s==S.s))S.s=L[0].s;
  box.querySelector(".nm-sel").innerHTML=GRUPPI.map(([g,f])=>{const q=L.filter(x=>f(x.s));
   return q.length?`<optgroup label="${g}">${q.map(x=>`<option value="${esc(x.s)}"${x.s==S.s?" selected":""}>${esc(etichetta(x.s))}</option>`).join("")}</optgroup>`:"";}).join("");}

 function strumento(box){const g=box.querySelector(".nm-graf");g.innerHTML=`<p class="small">Caricamento&hellip;</p>`;
  leggi(BASE+S.s+".json").then(X=>{if(!X){g.innerHTML=`<p class="small">Dati non disponibili per questo strumento.</p>`;return;}
   S.X=X;const dd=[...new Set(X.ev.map(e=>e[1]))];if(S.d&&!dd.includes(S.d))S.d="";
   resto(box);});}

 // grafico: la notizia piu' recente (del driver scelto) oppure quella toccata nel registro
 function grafico(box,t){const X=S.X,E=X.ev.filter(e=>!S.d||e[1]==S.d),g=box.querySelector(".nm-graf");
  const foco=t||(E.length?E[E.length-1][0]:X.ev[X.ev.length-1][0]);
  if(!window.ebCandele){g.innerHTML="";return;}
  window.ebCandele(g,{id:"nm",generato:foco,opz:{sym:X.s,ann:E,dal:H1_DAL}});}

 function resto(box){const X=S.X;
  const dd=[...new Set(X.ev.map(e=>e[1]))].sort((a,b)=>X.ev.filter(e=>e[1]==b).length-X.ev.filter(e=>e[1]==a).length);
  box.querySelector(".nm-chips").innerHTML=[["","Tutte"]].concat(dd.map(d=>[d,d])).map(([d,n])=>`<button type="button" data-d="${esc(d)}" class="${d==S.d?"on":""}">${esc(n)}</button>`).join("");
  tabella(box);registro(box);tutti(box);grafico(box);}

 function tabella(box){const X=S.X,c=X.ctrl||{},T=X.st.filter(x=>!S.d||x.n==S.d),el=box.querySelector(".nm-tab");
  if(!T.length){el.innerHTML=`<p class="small">Meno di 12 notizie misurate: statistiche quando il registro sarà più lungo.</p>`;return;}
  el.innerHTML=`<div class="nm-tw"><table class="nm-t"><thead><tr><th>Driver</th><th>Prima ora</th><th>Forte (≥2×)</th><th>Prosegue</th><th class="nm-x">Prosegue se grande (≥3×)</th></tr></thead><tbody>`+
   T.map(x=>`<tr data-d="${esc(x.n)}"><td><b>${esc(x.n)}</b><small>${x.casi} casi · dal ${x.dal}</small></td>
    <td>${fx(x.r1,2)}%<small>${fx(x.x,1)}× normale</small></td>
    <td>${x.forte}%<small>caso ${c.forte}%</small></td>
    <td>${x.seg}%<small>caso ${c.seg}%</small></td>
    <td class="nm-x">${x.segG==null?"n/d":x.segG+"%"}<small>${x.nG} casi · caso ${c.segG}%</small></td></tr>`).join("")+`</tbody></table></div>`;}

 function registro(box){const X=S.X,E=X.ev.filter(e=>!S.d||e[1]==S.d).slice().reverse(),el=box.querySelector(".nm-reg");
  const conGraf=t=>t>=H1_DAL;
  el.innerHTML=`<div class="nm-tw"><table class="nm-t nm-r"><thead><tr><th>Quando</th><th>Driver</th><th>Prima ora</th><th class="nm-x">4 ore</th><th>24 ore</th></tr></thead><tbody>`+
   E.slice(0,S.n).map(e=>`<tr${conGraf(e[0])?` data-t="${e[0]}" class="nm-cl"`:""}><td>${GG.format(Date.parse(e[0]))}<small>${HH.format(Date.parse(e[0]))}</small></td><td>${esc(e[1])}</td>
    <td><b class="${e[2]>=0?"up":"down"}">${pc(e[2])}</b><small>${fx(e[5],1)}×</small></td><td class="nm-x">${pc(e[3])}</td><td>${pc(e[4])}</td></tr>`).join("")+`</tbody></table></div>`+
   (E.length>S.n?`<button type="button" class="nm-piu">Mostra altre (${E.length-S.n})</button>`:"");}

 function tutti(box){const d=S.d||"NFP USA",L=S.I.sim.filter(x=>x.m[d]).sort((a,b)=>b.m[d][1]-a.m[d][1]);
  box.querySelector(".nm-tutti-t").firstChild.textContent=`${d} su tutti gli strumenti`;
  const el=box.querySelector(".nm-tutti");if(!L.length){el.innerHTML=`<p class="small">Non ancora abbastanza casi per questo driver.</p>`;return;}
  const mx=Math.max(...L.map(x=>x.m[d][1])),M=S.tutti?L:L.slice(0,12);
  el.innerHTML=`<div class="nm-bars">${M.map(x=>`<button type="button" data-s="${esc(x.s)}" class="${x.s==S.s?"on":""}"><span>${esc(etichetta(x.s))}</span>
   <i><i style="width:${(x.m[d][1]/mx*100).toFixed(1)}%"></i></i><b>${fx(x.m[d][1],1)}×</b><small>${fx(x.m[d][2],2)}% · ${x.m[d][0]}</small></button>`).join("")}</div>`+
   (L.length>M.length?`<button type="button" class="nm-piu nm-ogni">Mostra tutti (${L.length})</button>`:"");}

 window.ebNotizieMacro=function(box){if(!box)return;struttura(box);
  leggi(BASE+"indice.json").then(I=>{if(!I||!I.sim||!I.sim.length){box.querySelector(".nm-graf").innerHTML=`<p class="small">Il registro delle notizie arriva con il prossimo aggiornamento notturno.</p>`;return;}
   S.I=I;menu(box);strumento(box);});};
 window.ebNotizieMacro.stato=S;
 const b0=document.getElementById("nmacro");if(b0&&!b0.innerHTML)window.ebNotizieMacro(b0);
}catch(e){console.warn("[EdgeValor] notizie macro",e);}})();
