/* ---------- mercato e macro ----------
   Schede dei driver (valore, variazioni, forza del movimento) e tabella "quanto e' gia' scontato". */
try{
(function(){const X=D.market,el=$("mtop");
 if(!EB_PREMIUM&&X&&!X.drivers)return;                  // v8.08 Macro chiusa al Basic: disegna il lucchetto 45_chiuse.js
 if(!X){el.innerHTML=`<h2>Mercato e macro</h2><div class="card">Dati di mercato non disponibili: i segnali usano solo il COT.</div>`;return;}
 const r=X.risk,env=r>=30?["FAVOREVOLE agli asset di rischio","var(--sb)"]:r<=-30?["SFAVOREVOLE agli asset di rischio","var(--ss)"]:["NEUTRO per gli asset di rischio","var(--n)"];
 const dcard=d=>{const u=d.unit=="pb"?" pb":"";const val=d.unit=="pb"?fx(d.value)+"%":fx(d.value,1);const bad=["vix","hy","real"].includes(d.key);
  const cls=d.d4==null?'flat':(d.d4>0)==bad?'down':'up';
  // v8.61 SPREAD HIGH YIELD: direzione delle ultime 4 settimane in chiaro (si allarga / stabile / si restringe).
  //   "Stabile" se la mossa e' debole (|z| < 0,75, stessa soglia di "Forza del movimento"), altrimenti il segno.
  const dir=d.key=="hy"&&d.d4!=null?(Math.abs(d.z4)<.75?["Stabile",""]:d.d4>0?["Si allarga","ko"]:["Si restringe","ok"]):null;
  const inf=dir?`<details class="info"><summary title="Come si legge" aria-label="Come si legge">i</summary><div><b>Spread high yield</b>: quanto rendono in pi&ugrave; dei titoli di Stato le obbligazioni delle aziende pi&ugrave; indebitate. <b>Si allarga</b>: il mercato chiede di pi&ugrave; per prestare soldi alle aziende, il credito diventa pi&ugrave; caro e il rischio sale. <b>Si restringe</b>: il credito torna pi&ugrave; facile. <b>Stabile</b>: la mossa delle ultime 4 settimane &egrave; piccola rispetto agli ultimi 2 anni.<br><br>Per questo si guarda insieme alla Borsa: dice se un ribasso resta nei prezzi delle azioni o arriva al costo con cui le aziende si finanziano.</div></details>`:"";
  return `<div class="card"><h3>${d.name}${inf}</h3><div class="kpi"><div class="big">${val}${dir?` <span class="tag ${dir[1]} hydir">${dir[0]}</span>`:""}</div></div>
  <div class="kv"><span>1 settimana</span><b>${sg(d.d1,1)}${u}</b><span>4 settimane</span><b class="${cls}">${sg(d.d4,1)}${u}</b><span>Forza del movimento</span><b>${Math.abs(d.z4)>=1.5?'forte':Math.abs(d.z4)>=.75?'media':'debole'} (z ${sg(d.z4,1)})</b></div>${spark(d.spark,"var(--c1)")}</div>`;};
 let h=`<h2>Il mercato in questo momento</h2><p class="sub">Solo indicatori prezzati ogni giorno dal mercato: anticipano le notizie invece di inseguirle. Ultimo dato: ${fd(X.anchor)}.</p>
 <div class="env" style="--bc:${env[1]}"><b>Clima ${env[0]}</b>Combina VIX, spread delle obbligazioni high yield e rendimenti reali delle ultime 4 settimane (punteggio ${fmt(r)}).</div>
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
 const isAdm=()=>document.documentElement.classList.contains("eb-admin");
 const screener=()=>{
  let sel="";try{sel=localStorage.getItem("ebMacroSel")||"";}catch(e){}
  if(sel&&!rows.some(a=>a.key==sel))sel="";
  const FAMM=a=>["BTC","ETH"].includes(a.key)?"Crypto":["WTI","BRENT","NATGAS","GOLD","SILVER","PLATINUM","COPPER"].includes(a.key)?"Materie prime"
   :["SP500","NASDAQ","DOW","RUSSELL","EM","EAFE"].includes(a.key)?"Indici":"Valute";
  const fam=["Valute","Indici","Materie prime","Crypto"].map(f=>[f,rows.filter(a=>FAMM(a)==f).sort((x,y)=>x.key.localeCompare(y.key))]).filter(x=>x[1].length);
  const tab=$("mtable").closest(".tablewrap"),scr=document.createElement("div");tab.before(scr);
  const det=document.createElement("details");det.className="vfx";det.innerHTML=`<summary><b>Tutti gli strumenti</b><span>${rows.length} strumenti</span></summary><div class="vfx-c"></div>`;
  tab.before(det);det.querySelector(".vfx-c").appendChild(tab);
  const lett=m=>m.r2<.05?["poco legato al macro",""]:Math.abs(m.gz)<.5?["gi&agrave; scontato",""]:m.gz>0?["spazio al rialzo","ok"]:["spazio al ribasso","ko"];
  const disegnaSel=()=>{const a=rows.find(x=>x.key==sel);
   const chip=`<div class="card vfsc"><div class="vfsc-r"><div class="vfsc-s"><span class="vfetich">Strumento</span><select class="vfsel mksel"><option value="">Scegli uno strumento&hellip;</option>${fam.map(([f,l])=>`<optgroup label="${f}">${l.map(x=>`<option value="${x.key}"${x.key==sel?" selected":""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
    <div class="vfsc-g">${fam.map(([f,l])=>`<div><small>${f}</small><div class="vfchip vfchip-s">${l.map(x=>`<button data-mk="${x.key}" class="${x.key==sel?"on":""}">${x.key}</button>`).join("")}</div></div>`).join("")}</div></div>`;
   let corpo;
   if(!a)corpo=`<div class="card vfvuoto2"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><b>Scegli uno strumento</b><p>Vedrai quanto i driver macro hanno gi&agrave; spinto il suo prezzo.</p></div>`;
   else{const m=a.mkt,t=m.top||[],l=lett(m);
    corpo=`<div class="vfsl-t"><span class="vfsl-n">${esc(a.name)}</span><span class="tag ${l[1]}">${l[0]}</span></div>
    <div class="grid k4 vfkpi">
     <div class="card kpi"><h3>Punteggio</h3><div class="big ${m.score>=25?"up":m.score<=-25?"down":""}">${fmt(m.score)}</div><div class="note">da &minus;100 a +100</div></div>
     <div class="card kpi"><h3>Mossa implicita 4s</h3><div class="big">${sg(m.impl)}%</div><div class="note">quanto spingevano i driver</div></div>
     <div class="card kpi"><h3>Mossa reale 4s</h3><div class="big ${m.act>=0?"up":"down"}">${sg(m.act)}%</div><div class="note">quanto si &egrave; mosso il prezzo</div></div>
     <div class="card kpi"><h3>Differenza</h3><div class="big">${sg(m.gap)}%</div><div class="note">R&sup2; ${fx(m.r2)} &middot; legame con il macro</div></div></div>
    <div class="card"><h3>Driver che pesano di pi&ugrave;</h3><div class="kv">${t.map(x=>`<span>${esc(x.name)}</span><b class="${x.c>0?"up":"down"}">${sg(x.c)}%</b>`).join("")||"<span>n/d</span>"}</div></div>`;}
   scr.innerHTML=chip+corpo;
   const scegli=k=>{sel=k;try{localStorage.setItem("ebMacroSel",sel);}catch(e){}disegnaSel();};
   scr.querySelector(".mksel").onchange=e=>scegli(e.target.value);
   scr.querySelectorAll("[data-mk]").forEach(b=>b.onclick=()=>scegli(b.dataset.mk==sel?"":b.dataset.mk));
   scr.querySelector(".vfsc").classList.toggle("scelto",!!sel);};
  disegnaSel();};
 // il riconoscimento del fondatore arriva dal database dopo il disegno: si aspetta la classe "eb-admin"
 if(isAdm())setTimeout(screener,0);
 else{const mo=new MutationObserver(()=>{if(isAdm()){mo.disconnect();screener();}});mo.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});}
 $("mtable").innerHTML=`<tr><th>Strumento</th><th class="num">R²</th><th>Driver principale</th><th class="num">Mossa implicita 4s</th><th class="num">Mossa reale 4s</th><th class="num">Differenza</th><th>Lettura</th><th class="num">Punteggio</th></tr>`+
 rows.map(a=>{const m=a.mkt,t=m.top[0];const st=m.r2<.05?'<span class="small">poco legato al macro</span>':Math.abs(m.gz)<.5?'<span class="tag">gia\' scontato</span>':m.gz>0?'<span class="tag ok">spazio al rialzo</span>':'<span class="tag ko">spazio al ribasso</span>';
 return `<tr class="clic" data-tv="a:${a.key}"><td><b>${a.name}</b> <span class="small">${a.key}</span></td><td class="num">${fx(m.r2)}</td><td class="wrap-ok">${t?`${t.name} <span class="${t.c>0?'up':'down'}">${sg(t.c)}%</span>`:''}</td>
 <td class="num">${sg(m.impl)}%</td><td class="num">${sg(m.act)}%</td><td class="num"><b>${sg(m.gap)}%</b></td><td>${st}</td><td class="num"><b class="${m.score>=25?'up':m.score<=-25?'down':'flat'}">${fmt(m.score)}</b></td></tr>`}).join("");
})();
}catch(e){fail('Mercato e macro','mkt',e);}

