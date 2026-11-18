
/* ---------- 43_crypto_profilo.js - v8.01 PROFILO DI UNA MONETA (scheda Crypto) ----------
   Usato da 42_crypto.js quando si tocca una riga della tabella: ebCryptoProfilo.html(m, aiuti) disegna il profilo
   (descrizione, numeri chiave, supply) e ebCryptoProfilo.grafico(box, m, aiuti) il grafico settimanale di 3 anni
   con la linea del massimo storico. "aiuti" = formati in comune (prezzo, %, colori, grandi numeri, data, icona).
   Separato da 42_crypto.js solo per tenere piccoli i file. DEBUG: ebCryptoProfilo */
try{(function(){
 function html(m,A){const {pr,pc,cl,gr,gg,ico}=A;
  const fatti=[["Massimo storico",`${pr(m.ath)}`,gg(m.ath_d)],["Drawdown dal massimo",`<span class="${cl(m.dd)}">${pc(m.dd)}</span>`,""],
   ["1 anno",`<span class="${cl(m.v1a)}">${pc(m.v1a)}</span>`,""],["Da inizio anno",`<span class="${cl(m.vytd)}">${pc(m.vytd)}</span>`,""],
   ["Volatilit&agrave; 30 giorni",m.vol30==null?"&ndash;":fx(m.vol30,0)+"%","annua"],["Volume medio 30 giorni",gr(m.volm,"&nbsp;$"),"al giorno"],
   ...(m.mcap?[["Capitalizzazione",gr(m.mcap,"&nbsp;$"),m.quota!=null?fx(m.quota,1)+"% della tabella":""]]:[])];
  const sup=m.circ||m.max?`<div class="cysup"><div><small>In circolazione</small><b>${m.circ?gr(m.circ):"&ndash;"}</b></div>
    <div><small>Massima</small><b>${m.max?gr(m.max):"Senza tetto"}</b></div>
    ${m.circ_pct!=null?`<i class="cybar"><i style="width:${Math.min(100,m.circ_pct)}%"></i></i><span>${fx(m.circ_pct,1)}% gi&agrave; in circolazione</span>`:""}</div>`:"";
  return `<div class="cyprof" data-p="${esc(m.s)}">
   <p class="cydesc"><span class="cytag">${esc(m.cat)} &middot; nata nel ${m.anno}</span>${esc(EB_LANG=="en"&&m.desc_en||m.desc)}</p>
   <div class="cypcorpo"><div class="cygraf" data-g="${esc(m.s)}"><div class="cygtip"></div><svg role="img" aria-label="Prezzo di ${esc(m.n)}, ultimi 3 anni"></svg></div>
    <div class="cyfatti">${fatti.map((f,i)=>`<div${i==fatti.length-1&&fatti.length%2?' class="largo"':""}><small>${f[0]}</small><b>${f[1]}</b>${f[2]?`<span>${f[2]}</span>`:""}</div>`).join("")}${sup}</div></div></div>`;}
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
