
/* ---------- 43_crypto_profilo.js - v8.01 PROFILO DI UNA MONETA (scheda Crypto) ----------
   Usato da 42_crypto.js quando si tocca una riga della tabella: ebCryptoProfilo.html(m, aiuti) disegna il profilo
   (descrizione, numeri chiave, supply) e ebCryptoProfilo.grafico(box, m, aiuti) il grafico settimanale di 3 anni
   con la linea del massimo storico. "aiuti" = formati in comune (prezzo, %, colori, grandi numeri, data, icona).
   Separato da 42_crypto.js solo per tenere piccoli i file. DEBUG: ebCryptoProfilo */
try{(function(){
 function html(m,A){const {pr,pc,cl,gr,gg,ico}=A;
  // v9.03 (prima solo per il fondatore): via "Drawdown dal massimo" e "Volatilita' 30 giorni", gia' nella riga della
  //   tabella (colonne "Dal max" e "Volatilita'"); al loro posto, per Bitcoin, il ciclo dell'halving sotto il grafico
  const adm=document.documentElement.classList.contains("eb-admin");
  const fatti=[["Massimo storico",`${pr(m.ath)}`,gg(m.ath_d)],...(adm?[]:[["Drawdown dal massimo",`<span class="${cl(m.dd)}">${pc(m.dd)}</span>`,""]]),
   ["1 anno",`<span class="${cl(m.v1a)}">${pc(m.v1a)}</span>`,""],["Da inizio anno",`<span class="${cl(m.vytd)}">${pc(m.vytd)}</span>`,""],
   ...(adm?[]:[["Volatilit&agrave; 30 giorni",m.vol30==null?"&ndash;":fx(m.vol30,0)+"%","annua"]]),["Volume medio 30 giorni",gr(m.volm,"&nbsp;$"),"al giorno"],
   ...(m.mcap?[["Capitalizzazione",gr(m.mcap,"&nbsp;$"),m.quota!=null?fx(m.quota,1)+"% della tabella":""]]:[])];
  const sup=m.circ||m.max?`<div class="cysup"><div><small>In circolazione</small><b>${m.circ?(m.circ_stima?"&asymp;&nbsp;":"")+gr(m.circ):"&ndash;"}</b></div>
    <div><small>Massima</small><b>${m.max?gr(m.max):"Senza tetto"}</b></div>
    ${m.circ_pct!=null?`<i class="cybar"><i style="width:${Math.min(100,m.circ_pct)}%"></i></i><span>${fx(m.circ_pct,1)}% gi&agrave; in circolazione</span>`:""}</div>`:"";
  return `<div class="cyprof" data-p="${esc(m.s)}">
   <p class="cydesc"><span class="cytag">${esc(m.cat)} &middot; nata nel ${m.anno}</span>${esc(EB_LANG=="en"&&m.desc_en||m.desc)}</p>
   <div class="cypcorpo"><div class="cysx"><div class="cygraf" data-g="${esc(m.s)}"><div class="cygtip"></div><svg role="img" aria-label="Prezzo di ${esc(m.n)}, ultimi 3 anni"></svg></div>${adm&&m.ciclo?halving(m.ciclo,A):""}</div>
    <div class="cyfatti">${fatti.map((f,i)=>`<div${i==fatti.length-1&&fatti.length%2?' class="largo"':""}><small>${f[0]}</small><b>${f[1]}</b>${f[2]?`<span>${f[2]}</span>`:""}</div>`).join("")}${sup}</div></div></div>`;}
 /* v9.03 CICLO DELL'HALVING (solo Bitcoin, dati da cot_radar/crypto.py -> ciclo_halving):
      barra = punto del ciclo di oggi (giorno N su ~1.458, prossimo halving stimato a 10 minuti per blocco);
      tabella = gli stessi N giorni nei cicli 2012, 2016, 2020 e in quello attuale: rendimento dal giorno
      dell'halving, distanza dal massimo del ciclo fino a quel giorno, giorni fino al picco dell'intero ciclo.
      Solo confronto descrittivo: i cicli sono pochi, la (i) lo dice. */
 function halving(c,A){const {pc,cl}=A,q=Math.min(100,c.giorno/c.durata*100),mese=new Date(c.prossimo+"T12:00:00").toLocaleDateString(EB_LOC,{month:"short",year:"numeric"});
  const pct=v=>v==null?"&ndash;":`<span class="${cl(v)}">${pc(v,0)}</span>`;
  return `<div class="cyhv"><div class="cyhvt"><b>Ciclo dell'halving</b><details class="info"><summary title="Cos'&egrave;" aria-label="Informazioni">i</summary><div>
    Ogni 210.000 blocchi (circa 4 anni) il premio dei miner per ogni blocco si dimezza: nascono meno bitcoin nuovi. Il prossimo halving &egrave; stimato con un blocco ogni 10 minuti.<br>
    La tabella confronta lo <b>stesso giorno</b> dopo l'halving nei cicli passati: rendimento dal giorno dell'halving, distanza dal massimo raggiunto fino a quel giorno e quanti giorni dopo l'halving &egrave; arrivato il picco del ciclo.
    Sono solo 3 cicli completi: &egrave; un confronto, non una previsione.</div></details><span title="Bitcoin nuovi per ogni blocco">${fx(c.premio,3)} BTC/blocco</span></div>
   <div class="cyhvb" role="img" aria-label="Giorno ${c.giorno} di circa ${c.durata}"><i style="width:${q.toFixed(1)}%"></i><em style="left:${q.toFixed(1)}%"></em></div>
   <div class="cyhvl"><span>giorno <b>${c.giorno.toLocaleString(EB_LOC)}</b> di ~${c.durata.toLocaleString(EB_LOC)}</span><span>prossimo &asymp; ${mese}</span></div>
   <table class="cyhvtab"><tr><th>Ciclo</th><th title="Rendimento dal giorno dell'halving a oggi (stesso giorno del ciclo)">Dall'halving</th><th title="Distanza dal massimo del ciclo raggiunto fino a quel giorno">Dal max</th><th title="Giorni dall'halving al massimo dell'intero ciclo">Picco</th></tr>
    ${c.cicli.map((x,i)=>`<tr${i==c.cicli.length-1?' class="ora"':""}><td>${x.anno}${i==c.cicli.length-1?" <small>oggi</small>":""}</td><td>${pct(x.rend)}</td><td>${pct(x.dd)}</td><td>${x.picco_g==null?'<span class="flat">&ndash;</span>':x.picco_g+"&nbsp;g"}</td></tr>`).join("")}</table></div>`;}
 // grafico settimanale 3 anni con la linea del massimo storico; mouse/dito = data e prezzo di quella settimana
 function grafico(box,m,A){const {pr,gg}=A;const g=box.querySelector(`.cygraf[data-g="${m.s}"]`);if(!g||!m.sett||m.sett.length<2)return;
  const svg=g.querySelector("svg"),tip=g.querySelector(".cygtip"),W=Math.max(260,Math.round(g.clientWidth)),H=W<520?170:210,L=4,R=56,T=12,B=22;
  const v=m.sett.map(x=>x[1]),hi0=Math.max(...v,m.ath),lo0=Math.min(...v),pad=(hi0-lo0)*0.06,hi=hi0+pad,lo=Math.max(0,lo0-pad);
  const X=i=>L+i*(W-L-R)/(v.length-1),Y=x=>T+(hi-x)/(hi-lo)*(H-T-B);
  const linea=v.map((x,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(x).toFixed(1)).join("");
  const anni=[];m.sett.forEach((x,i)=>{if(i&&x[0].slice(0,4)!=m.sett[i-1][0].slice(0,4))anni.push([i,x[0].slice(0,4)]);});
  const su=v[v.length-1]>=v[0];
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.style.height=H+"px";
  svg.innerHTML=`<defs><linearGradient id="cyg-${m.s}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--${su?"b":"s"})" stop-opacity=".32"/><stop offset="1" stop-color="var(--${su?"b":"s"})" stop-opacity="0"/></linearGradient></defs>
   ${anni.map(([i,a])=>`<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${T}" y2="${H-B}" class="cygan"/><text x="${(X(i)+4).toFixed(1)}" y="${H-7}" class="cyax">${a}</text>`).join("")}
   <path d="${linea}L${X(v.length-1).toFixed(1)},${H-B}L${X(0).toFixed(1)},${H-B}Z" fill="url(#cyg-${m.s})"/>
   <line x1="${L}" x2="${W-R}" y1="${Y(m.ath).toFixed(1)}" y2="${Y(m.ath).toFixed(1)}" class="cyath"/>
   <text x="${W-R+6}" y="${(Y(m.ath)+4).toFixed(1)}" class="cyax cyaxath">max</text>
   <path d="${linea}" class="cyln ${su?"up":"down"}"/>
   <line class="cycur" x1="-9" x2="-9" y1="${T}" y2="${H-B}"/><circle class="cypt" r="4.5" cx="${X(v.length-1).toFixed(1)}" cy="${Y(v[v.length-1]).toFixed(1)}"/>
   <rect x="${L}" y="0" width="${W-L-R}" height="${H-B}" fill="transparent" class="cyhit"/>`;
  const cur=svg.querySelector(".cycur"),pt=svg.querySelector(".cypt"),hit=svg.querySelector(".cyhit");
  const mostra=ev=>{const r=svg.getBoundingClientRect(),x=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)*W/r.width;
   const i=Math.max(0,Math.min(v.length-1,Math.round((x-L)/(W-L-R)*(v.length-1))));
   cur.setAttribute("x1",X(i));cur.setAttribute("x2",X(i));pt.setAttribute("cx",X(i));pt.setAttribute("cy",Y(v[i]));
   tip.innerHTML=`<small>${gg(m.sett[i][0])}</small><b>${pr(v[i])}</b>`;tip.classList.add("on");};
  const via=()=>{cur.setAttribute("x1",-9);cur.setAttribute("x2",-9);pt.setAttribute("cx",X(v.length-1));pt.setAttribute("cy",Y(v[v.length-1]));tip.classList.remove("on");};
  hit.onmousemove=mostra;hit.onmouseleave=via;hit.ontouchstart=hit.ontouchmove=mostra;hit.ontouchend=()=>setTimeout(via,1500);}
 window.ebCryptoProfilo={html,grafico};
})();}catch(e){console.error("[EdgeValor] profilo crypto:",e);}
