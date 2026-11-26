/* ---------- mercato e macro ----------
   Schede dei driver (valore, variazioni, forza del movimento) e tabella "quanto e' gia' scontato". */
try{
(function(){const X=D.market,el=$("mtop");
 if(!EB_PREMIUM&&X&&!X.drivers)return;                  // v8.08 Macro chiusa al Basic: disegna il lucchetto 45_chiuse.js
 if(!X){el.innerHTML=`<h2>Mercato e macro</h2><div class="card">Dati di mercato non disponibili: i segnali usano solo il COT.</div>`;return;}
 const r=X.risk,env=r>=30?["FAVOREVOLE agli asset di rischio","var(--sb)"]:r<=-30?["SFAVOREVOLE agli asset di rischio","var(--ss)"]:["NEUTRO per gli asset di rischio","var(--n)"];
 // v9.22 (Ya) CLIMA DI MERCATO, proposta A: barra orizzontale con 5 fasce, sfavorevole fisso a sinistra (rosso),
 //   favorevole a destra (verde). Il pallino ha il colore della fascia (come la barra COT, 06_strumenti.js) e sta
 //   nella sua fascia; il cerchio tratteggiato e' il clima di una settimana fa (X.risk_prev, mercato.py).
 //   Sotto: quanto ogni driver spinge il clima (stessa formula di mercato.py: -z4/4*100 per VIX, spread HY e
 //   rendimenti reali), con barre che partono dal centro. Statico: niente animazioni, niente sfarfallio.
 const CL_F=[[-100,-60,4,20],[-60,-30,22,38],[-30,30,42,58],[30,60,62,78],[60,100,80,96]];
 const CL_N=["MOLTO SFAVOREVOLE","SFAVOREVOLE","NEUTRO","FAVOREVOLE","MOLTO FAVOREVOLE"];
 const clFascia=v=>v<=-60?0:v<=-30?1:v<30?2:v<60?3:4;
 const clPos=v=>{const f=CL_F[clFascia(v)],t=Math.max(0,Math.min(1,(v-f[0])/(f[1]-f[0])));return (f[2]+t*(f[3]-f[2])).toFixed(1);};
 function climaHTML(v,X){const f=clFascia(v),cls=["m1","m2","m3","m4","m5"][f],segno=n=>(n>0?"+":n<0?"&minus;":"")+Math.abs(n);
  const P=X.risk_prev,dz=Object.fromEntries((X.drivers||[]).map(d=>[d.key,d.z4]));
  const PARTI=[["vix","VIX",["sale: più paura","scende: meno paura"]],["hy","Spread high yield",["si allarga","si restringe"]],["real","Rendimenti reali",["salgono","scendono"]]]
   .filter(p=>dz[p[0]]!=null).map(([k,n,t])=>{const c=Math.round(-dz[k]/4*100);return {n,c,t:Math.abs(c)<5?"stabile":c<0?t[0]:t[1]};});
  return `<div class="card clima">
   <div class="cl-testa"><b class="cl-${cls}">${T(CL_N[f])}</b><span>${T("per gli asset di rischio")}</span><span class="cl-pt cl-${cls}">${segno(v)}</span>
    <details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div><b>Clima di mercato</b>: combina VIX, spread delle obbligazioni high yield e rendimenti reali delle ultime 4 settimane, da &minus;100 a +100. Quando salgono, il denaro costa di pi&ugrave; e c'&egrave; pi&ugrave; paura: male per azioni e crypto. Il <b>cerchio tratteggiato</b> &egrave; il clima di una settimana fa. Sotto, quanti punti porta ogni indicatore: a sinistra peggiora il clima, a destra lo migliora.</div></details></div>
   <div class="cl-metro">${P!=null&&Math.abs(P-v)>=3?`<span class="cl-prima" style="left:${clPos(P)}%" data-spiega="${T("Una settimana fa")}: ${P>0?"+":""}${P}"></span>`:""}<i class="${cls}" style="left:${clPos(v)}%"></i></div>
   <div class="cl-lab"><span>${T("Sfavorevole")}</span><span>${T("Neutro")}</span><span>${T("Favorevole")}</span></div>
   ${PARTI.length?`<div class="cl-parti"><small>${T("Chi spinge il clima")}</small>${PARTI.map(p=>`<div class="cl-riga"><span><b>${p.n}</b><em>${T(p.t)}</em></span>
    <div class="cl-div"><i class="${p.c<0?"neg":"pos"}" style="width:${(Math.min(100,Math.abs(p.c))/2).toFixed(1)}%"></i></div><span class="cl-v ${p.c<0?"down":p.c>0?"up":""}">${segno(p.c)}</span></div>`).join("")}</div>`:""}
  </div>`;}
 const dcard=d=>{const u=d.unit=="pb"?" pb":"";const val=d.unit=="pb"?fx(d.value)+"%":fx(d.value,1);const bad=["vix","hy","real"].includes(d.key);
  const cls=d.d4==null?'flat':(d.d4>0)==bad?'down':'up';
  // v8.61 SPREAD HIGH YIELD: direzione delle ultime 4 settimane in chiaro (si allarga / stabile / si restringe).
  //   "Stabile" se la mossa e' debole (|z| < 0,75, stessa soglia di "Forza del movimento"), altrimenti il segno.
  const dir=d.key=="hy"&&d.d4!=null?(Math.abs(d.z4)<.75?["Stabile",""]:d.d4>0?["Si allarga","ko"]:["Si restringe","ok"]):null;
  const inf=dir?`<details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div><b>Spread high yield</b>: quanto rendono in pi&ugrave; dei titoli di Stato le obbligazioni delle aziende pi&ugrave; indebitate. <b>Si allarga</b>: il mercato chiede di pi&ugrave; per prestare soldi alle aziende, il credito diventa pi&ugrave; caro e il rischio sale. <b>Si restringe</b>: il credito torna pi&ugrave; facile. <b>Stabile</b>: la mossa delle ultime 4 settimane &egrave; piccola rispetto agli ultimi 2 anni.<br><br>Per questo si guarda insieme alla Borsa: dice se un ribasso resta nei prezzi delle azioni o arriva al costo con cui le aziende si finanziano.</div></details>`:"";
  return `<div class="card"><h3>${d.name}${inf}</h3><div class="kpi"><div class="big">${val}${dir?` <span class="tag ${dir[1]} hydir">${dir[0]}</span>`:""}</div></div>
  <div class="kv"><span>1 settimana</span><b>${sg(d.d1,1)}${u}</b><span>4 settimane</span><b class="${cls}">${sg(d.d4,1)}${u}</b><span>Forza del movimento</span><b>${Math.abs(d.z4)>=1.5?'forte':Math.abs(d.z4)>=.75?'media':'debole'} (z ${sg(d.z4,1)})</b></div>${spark(d.spark,"var(--c1)")}</div>`;};
 let h=`<h2>Il mercato in questo momento</h2><p class="sub">Solo indicatori prezzati ogni giorno dal mercato: anticipano le notizie invece di inseguirle. Ultimo dato: ${fd(X.anchor)}.</p>
 ${climaHTML(r,X)}
 <div class="grid k3">${X.drivers.map(dcard).join("")}</div>
 <h2>Quanto e' gia' scontato nei prezzi</h2><p class="sub">Per ogni strumento con un prezzo pubblico: una regressione su ${M.regw} settimane stima quanto i driver qui sopra muovono il prezzo.
 Poi confronta la mossa che i driver <b>implicavano</b> nelle ultime 4 settimane con quella che il prezzo ha <b>fatto davvero</b>. Se coincidono la notizia e' gia' nel prezzo; se il prezzo e' rimasto indietro resta uno spazio, che diventa il punteggio "Mercato".</p>
 <div class="tablewrap"><table id="mtable"></table></div>`;
 const F=D.fed;
 if(F)h+=`<h2>Liquidita' della Fed (contesto, lento)</h2><p class="sub">QE e QT cambiano il quadro in mesi, non in giorni: per questo sono mostrati come contesto e non entrano nel punteggio.</p>
 <div class="grid k2"><div class="card"><h3>Bilancio Fed</h3><div class="kpi"><div class="big">${fx(F.bs/1e6)} mila mld $</div><div class="note">${F.regime} &middot; 3 mesi ${sg(F.bs13)}% &middot; dato del ${fd(F.date)}</div></div>${spark(F.spark_bs,"var(--ink)")}</div>
 <div class="card"><h3>Liquidita' netta</h3><div class="kpi"><div class="big">${fx(F.nl/1e6)} mila mld $</div><div class="note">Bilancio - conto del Tesoro - reverse repo &middot; 4 settimane ${sg(F.nl4)}%</div></div>${spark(F.spark_nl,F.nl4>0?"var(--b)":"var(--s)")}</div></div>`;
 el.innerHTML=h;
 const rows=Object.values(D.assets).filter(a=>a.mkt&&a.key!="USD").sort((a,b)=>Math.abs(b.mkt.score)-Math.abs(a.mkt.score));
 // v8.62 SCREENER (prima solo il fondatore, come la Live): si sceglie lo strumento e si legge solo il suo dato;
 //   la tabella completa resta, chiusa, sotto "Tutti gli strumenti". Stessi numeri, solo in ordine.
 // v9.23 (Ya) "QUANTO E' GIA' SCONTATO" IN FORMA VISIVA (al posto delle 4 card Punteggio/Mossa implicita/Mossa reale/Differenza):
 //   - anello del punteggio: si riempie col colore del segnale, verdetto in parole sotto;
 //   - una frase: "il macro giustificava X, il prezzo e' sceso/salito Y: e' rimasto sotto / e' andato oltre di Z";
 //   - righello: pallino pieno = dove e' arrivato il prezzo (mossa reale 4s), pallino vuoto = dove doveva arrivare
 //     (mossa implicita), barra colorata tra i due = lo spazio (verde: puo' recuperare, rossa: e' andato oltre);
 //   - affidabilita' a tacche al posto dell'R2 (<0,10 bassa, <0,30 media, altrimenti alta).
 //   Stessi numeri di prima (mercato.py: impl, act, gap = impl - act, score, r2). Statico: niente animazioni.
 const pcS=v=>{v=Math.round(v*10)/10;return (v>0?"+":v<0?"&minus;":"")+fx(Math.abs(v),1)+"%";};
 const scFascia=s=>s>=40?["SPAZIO AL RIALZO","m5"]:s>=15?["UN PO' DI SPAZIO AL RIALZO","m4"]:s>-15?["GIÀ NEL PREZZO","m3"]:s>-40?["UN PO' DI SPAZIO AL RIBASSO","m2"]:["SPAZIO AL RIBASSO","m1"];
 function scontoHTML(nome,m){const s=Math.round(m.score),[ver,cl]=scFascia(s),R=52,L=2*Math.PI*R,f=Math.min(1,Math.abs(s)/100);
  const impl=m.impl,act=m.act,gap=impl-act,su=gap>0;
  let lo=Math.min(0,impl,act),hi=Math.max(0,impl,act);const pad=(hi-lo||1)*.14;lo-=pad;hi+=pad;
  const x=v=>+((v-lo)/(hi-lo)*100).toFixed(2),xa=x(act),xd=x(impl),cA=act<0?"giu":"su";
  const frase=Math.abs(gap)<1?`${T("Il prezzo ha fatto")} <b>${T("quello che chiedeva il macro")}</b>: ${T("la notizia è già nel prezzo.")}`
   :`${T("Il macro giustificava")} <b>${pcS(impl)}</b>, ${Math.abs(act)<.05?`${T("il prezzo è rimasto fermo")}`:`${T(act<0?"il prezzo è sceso":"il prezzo è salito")} <b class="${act<0?"down":"up"}">${pcS(act)}</b>`}: ${su?`<b class="up">${T("è sotto di")} ${pcS(gap).replace(/^\+/,"")}</b>`:`<b class="down">${T("è sopra di")} ${pcS(-gap).replace(/^\+/,"")}</b>`} ${T("rispetto al macro")}.`;
  const liv=m.r2<.1?[1,"il prezzo segue poco il macro: dato da prendere con cautela."]:m.r2<.3?[2,"il prezzo segue in parte il macro."]:[3,"il prezzo segue bene il macro."];
  const inf=t=>`<details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div>${t}</div></details>`;
  return `<div class="sct">
   <div class="card sct-anello"><h3>${T("Punteggio")}${inf("<b>Punteggio</b>: da &minus;100 a +100. Pi&ugrave; l'anello &egrave; pieno, pi&ugrave; spazio resta al prezzo rispetto a quello che chiedono i driver macro. Verde: spazio al rialzo. Rosso: spazio al ribasso. Vicino a 0: gi&agrave; nel prezzo.")}</h3>
    <div class="sct-ac"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${R}" class="sct-fondo"/>
     <circle cx="64" cy="64" r="${R}" class="sct-arco ${cl}" stroke-dasharray="${(L*f).toFixed(1)} ${L.toFixed(1)}" transform="${s<0?"translate(128 0) scale(-1 1) ":""}rotate(-90 64 64)"/>
     <text x="64" y="64" class="sct-num ${cl}" text-anchor="middle" dominant-baseline="central">${s>0?"+":s<0?"−":""}${Math.abs(s)}</text></svg>
     <div><b class="sct-ver ${cl}">${T(ver)}</b><small>${T("da −100 a +100")}</small></div></div></div>
   <div class="card sct-rig"><h3>${T("Ultime 4 settimane")}${inf("<b>Pallino pieno</b>: quanto si &egrave; mosso davvero il prezzo nelle ultime 4 settimane. <b>Pallino vuoto</b>: quanto si sarebbe dovuto muovere seguendo i driver macro (VIX, tassi, dollaro, inflazione attesa). <b>Barra colorata</b>: la differenza, cio&egrave; lo spazio. <b>Affidabilit&agrave;</b>: quanto il prezzo segue davvero il macro (R&sup2; "+fx(m.r2,2)+").")}</h3>
    <p class="sct-frase">${frase}</p>
    <div class="sct-riga"><span class="sct-linea"></span><span class="sct-zero" style="left:${x(0)}%">${Math.abs(xd-x(0))<14?"":"<b>0%</b>"}</span>
     ${Math.abs(gap)>=1?`<span class="sct-spazio ${su?"su":"giu"} ${xd>xa?"dx":"sx"}" style="left:${Math.min(xa,xd)}%;width:${Math.abs(xd-xa)}%"></span>`:""}
     <span class="sct-pin vuoto" style="left:${xd}%"></span><span class="sct-pin pieno ${cA}" style="left:${xa}%"></span>
     <span class="sct-et alto" style="left:${Math.min(90,Math.max(10,xa))}%">${T("Ha fatto")}<b class="${act<0?"down":"up"}">${pcS(act)}</b></span>
     <span class="sct-et basso" style="left:${Math.min(90,Math.max(10,xd))}%">${T("Doveva")}<b>${pcS(impl)}</b></span></div>
    <div class="sct-aff"><span class="sct-tacche l${liv[0]}"><i></i><i></i><i></i></span><span><b>${T("Affidabilità")}</b> · ${T(liv[1])}</span></div></div>
  </div>`;}
 const screener=()=>{
  let sel="";try{sel=localStorage.getItem("ebMacroSel")||"";}catch(e){}
  if(sel&&!rows.some(a=>a.key==sel))sel="";
  const FAMM=a=>["BTC","ETH"].includes(a.key)?"Crypto":["WTI","BRENT","NATGAS","GOLD","SILVER","PLATINUM","COPPER"].includes(a.key)?"Materie prime"
   :["SP500","NASDAQ","DOW","RUSSELL","EM","EAFE","NIKKEI"].includes(a.key)?"Indici":"Valute";
  const fam=["Valute","Indici","Materie prime","Crypto"].map(f=>[f,rows.filter(a=>FAMM(a)==f).sort((x,y)=>x.key.localeCompare(y.key))]).filter(x=>x[1].length);
  const tab=$("mtable").closest(".tablewrap"),scr=document.createElement("div");tab.before(scr);
  const det=document.createElement("details");det.className="vfx";det.innerHTML=`<summary><b>Tutti gli strumenti</b><span>${rows.length} strumenti</span></summary><div class="vfx-c"></div>`;
  tab.before(det);det.querySelector(".vfx-c").appendChild(tab);
  const lett=m=>m.r2<.05?["poco legato al macro",""]:Math.abs(m.gz)<.5?["gi&agrave; scontato",""]:m.gz>0?["spazio al rialzo","ok"]:["spazio al ribasso","ko"];
  const disegnaSel=()=>{const a=rows.find(x=>x.key==sel);
   const chip=`<div class="card vfsc"><div class="vfsc-r"><div class="vfsc-s"><span class="vfetich">Strumento</span><select class="vfsel mksel"><option value="">Scegli uno strumento&hellip;</option>${fam.map(([f,l])=>`<optgroup label="${f}">${l.map(x=>`<option value="${x.key}"${x.key==sel?" selected":""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
    <div class="vfsc-g">${fam.map(([f,l])=>`<div><small>${f}</small><div class="vfchip vfchip-s">${l.map(x=>`<button data-mks="${x.key}" class="${x.key==sel?"on":""}">${x.key}</button>`).join("")}</div></div>`).join("")}</div></div>`;
   let corpo;
   if(!a)corpo=`<div class="card vfvuoto2"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><b>Scegli uno strumento</b><p>Vedrai quanto i driver macro hanno gi&agrave; spinto il suo prezzo.</p></div>`;
   else{const m=a.mkt,t=m.top||[],l=lett(m);
    corpo=`<div class="vfsl-t"><span class="vfsl-n">${esc(a.name)}</span></div>
    ${scontoHTML(a.name,m)}
    <div class="card"><h3>Driver che pesano di pi&ugrave;</h3><div class="kv">${t.map(x=>`<span>${esc(x.name)}</span><b class="${x.c>0?"up":"down"}">${sg(x.c)}%</b>`).join("")||"<span>n/d</span>"}</div></div>`;}
   scr.innerHTML=chip+corpo;
   const scegli=k=>{sel=k;try{localStorage.setItem("ebMacroSel",sel);}catch(e){}disegnaSel();};
   scr.querySelector(".mksel").onchange=e=>scegli(e.target.value);
   scr.querySelectorAll("[data-mks]").forEach(b=>b.onclick=()=>scegli(b.dataset.mks==sel?"":b.dataset.mks));   // v9.21 data-mks: [data-mk] e' del badge delle borse (22_azioni.js) che ne riscriveva il testo
   scr.querySelector(".vfsc").classList.toggle("scelto",!!sel);};
  disegnaSel();};
 setTimeout(screener,0);                                // v8.68 aperto a tutti (prima solo il fondatore)
 $("mtable").innerHTML=`<tr><th>Strumento</th><th class="num">R²</th><th>Driver principale</th><th class="num">Mossa implicita 4s</th><th class="num">Mossa reale 4s</th><th class="num">Differenza</th><th>Lettura</th><th class="num">Punteggio</th></tr>`+
 rows.map(a=>{const m=a.mkt,t=m.top[0];const st=m.r2<.05?'<span class="small">poco legato al macro</span>':Math.abs(m.gz)<.5?'<span class="tag">gia\' scontato</span>':m.gz>0?'<span class="tag ok">spazio al rialzo</span>':'<span class="tag ko">spazio al ribasso</span>';
 return `<tr class="clic" data-tv="a:${a.key}"><td><b>${a.name}</b> <span class="small">${a.key}</span></td><td class="num">${fx(m.r2)}</td><td class="wrap-ok">${t?`${t.name} <span class="${t.c>0?'up':'down'}">${sg(t.c)}%</span>`:''}</td>
 <td class="num">${sg(m.impl)}%</td><td class="num">${sg(m.act)}%</td><td class="num"><b>${sg(m.gap)}%</b></td><td>${st}</td><td class="num"><b class="${m.score>=25?'up':m.score<=-25?'down':'flat'}">${fmt(m.score)}</b></td></tr>`}).join("");
})();
}catch(e){fail('Mercato e macro','mkt',e);}

