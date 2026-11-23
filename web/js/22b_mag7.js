/* ---------- 22b_mag7.js - v9.01 LE MAGNIFICHE 7 nella scheda Azionario (Ya, 23/11/2026) ----------
   COSA MOSTRA (dati: ../azioni/mag7.json, calcolato ogni sera da cot_radar/mag7.py):
     1) PESO: quanto pesano Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta e Tesla sull'indice scelto
        (S&P 500 o Nasdaq-100), con una barra divisa per azienda e la variazione del peso in un anno;
     2) CHI HA SPINTO: il movimento dell'indice (1 settimana, 1 mese, 3 mesi) diviso fra le 7 e tutte le altre,
        piu' lo stesso indice "a pesi uguali" (ogni azienda conta uguale);
     3) LE 7 CARD: davanti peso, trend, rendimento a 1 mese e 12 mesi; toccandole si girano e mostrano
        margine, ROE, P/E, flusso di cassa e crescita dei ricavi.
   FONDATORE PRIMA: si vede solo con la classe "eb-admin" (36_account.js). Per aprirlo a tutti: PER_TUTTI=true.
   AGGANCIO: 22_azioni.js mette <div data-m7> sotto le card degli indici e chiama ebMag7.monta(div) a ogni ridisegno;
     scelte (indice, periodo, card girate) restano in memoria, cosi' il ridisegno della tabella non le perde.
   DEBUG (F12 -> Console): ebMag7.dati() = ultimo file letto; gli errori iniziano con "[EdgeValor] mag7". */
(function(){try{
 const PER_TUTTI=false;
 const URL="../azioni/mag7.json";
 const COL=["#5b9bff","#2ec4b6","#9b8cff","#f5a524","#4fd6a3","#e879a6","#e9b44c"];   // un colore per azienda (stesso ordine del file)
 const S={idx:"sp500",per:"1m",gira:{},dati:null,prom:null};
 const ok=()=>PER_TUTTI||document.documentElement.classList.contains("eb-admin");
 const num=(v,d=1)=>v==null?"n/d":fx(v,d);
 const seg=v=>v==null?"":(v>0?"+":"");
 const cls=v=>v==null?"flat":v>0?"up":v<0?"down":"flat";
 const pct=(v,d=1)=>`<b class="${cls(v)}">${v==null?"n/d":seg(v)+fx(v,d)+"%"}</b>`;
 // freccia: verde su, rossa giu', grigia SEMPRE laterale (regola di Ya)
 const fr=t=>t==1?'<i class="m7fr up" title="Trend rialzista: prezzo sopra la media a 200 giorni, media in salita">&#9650;</i>'
  :t==-1?'<i class="m7fr down" title="Trend ribassista: prezzo sotto la media a 200 giorni, media in discesa">&#9660;</i>'
  :t==0?'<i class="m7fr flat" title="Trend incerto: prezzo e media a 200 giorni non vanno d\'accordo">&#9658;</i>':"";

 function carica(){if(S.prom)return S.prom;
  return S.prom=fetch(URL,{cache:"no-cache"}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(premJ)
   .then(d=>{if(!d||!d.indici||!d.titoli)throw new Error("file vuoto");S.dati=d;return d;})
   .catch(e=>{console.warn("[EdgeValor] mag7: dati non disponibili",e);S.prom=null;return null;});}

 // linea del peso nell'ultimo anno (piccola, senza assi: l'andamento conta piu' dei numeri)
 function linea(st){if(!st||st.length<3)return "";const W=120,H=34,v=st.map(x=>x[1]),mi=Math.min(...v),ma=Math.max(...v),r=(ma-mi)||1;
  const p=v.map((y,i)=>`${(i/(v.length-1)*W).toFixed(1)},${(H-3-(y-mi)/r*(H-6)).toFixed(1)}`).join(" ");
  return `<svg class="m7sl" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${p}"/></svg>`;}

 function spark(sp,su){if(!sp||sp.length<3)return "";const W=100,H=26,mi=Math.min(...sp),ma=Math.max(...sp),r=(ma-mi)||1;
  const p=sp.map((y,i)=>`${(i/(sp.length-1)*W).toFixed(1)},${(H-2-(y-mi)/r*(H-4)).toFixed(1)}`).join(" ");
  return `<svg class="m7sp ${su?"su":"giu"}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${p}"/></svg>`;}

 function peso(d,I){const T=d.titoli,altri=I.n-T.filter(t=>I.pesi[t.t]!=null).length,st=I.storia||[],
   prima=st.length?st[0][1]:null,dlt=prima!=null?I.peso7-prima:null;
  const fd=dlt==null?"":Math.abs(dlt)<0.5?`<span class="m7dl flat">&#9658; stabile in un anno</span>`
   :`<span class="m7dl ${dlt>0?"up":"down"}">${dlt>0?"&#9650;":"&#9660;"} <b>${seg(dlt)}${fx(dlt,1)}</b> punti in un anno</span>`;
  return `<div class="m7peso"><div class="m7big"><b>${fx(I.peso7,0)}%</b><span>${S.idx=="ndx"?"del Nasdaq-100":"dell'S&amp;P 500"}</span>${fd}</div>${linea(st)}</div>
   <div class="m7bar" role="img" aria-label="Peso delle 7: ${fx(I.peso7,1)}%">${T.map((t,i)=>{const w=I.pesi[t.t];if(w==null)return "";
     return `<i style="width:${w}%;background:${COL[i]}" title="${esc(t.n)} ${fx(w,1)}%">${w>=6.5?esc(t.t):""}</i>`;}).join("")}
    <i class="m7alt" style="width:${Math.max(0,100-I.peso7)}%" title="Altre ${altri} aziende ${fx(100-I.peso7,1)}%"><span>Le altre</span></i></div>
   <div class="m7leg">${T.map((t,i)=>I.pesi[t.t]==null?"":`<span><i style="background:${COL[i]}"></i>${esc(t.t)} <b>${fx(I.pesi[t.t],1)}%</b></span>`).join("")}</div>`;}

 function spinta(I){const c=I.contrib[S.per];if(!c)return "";
  const R=[["Le 7",c.m7,"r7"],["Le altre",c.altri,""],["Indice",c.indice,"tot"],["Pesi uguali",c.pesi_uguali,"eq"]],
   mx=Math.max(0.1,...R.map(r=>Math.abs(r[1]||0)));
  // frase sola: quanto del movimento viene dalle 7 (o se vanno in direzioni opposte)
  let f="";if(c.m7!=null&&c.altri!=null){
   if(Math.abs(c.indice)<0.05)f="Indice quasi fermo.";
   else if(Math.sign(c.m7)!=Math.sign(c.altri)&&Math.abs(c.m7)>0.05&&Math.abs(c.altri)>0.05)f=`Le 7 e il resto vanno in direzioni opposte.`;
   else f=`Le 7 spiegano il <b>${fx(Math.max(0,Math.min(100,c.m7/c.indice*100)),0)}%</b> del movimento.`;}
  return `<div class="m7rows">${R.map(r=>{const v=r[1],w=v==null?0:Math.abs(v)/mx*50;
    return `<div class="m7row ${r[2]}"><span>${r[0]}</span><div class="m7tr"><i class="m7z"></i><i class="m7f ${cls(v)}" style="${v<0?`right:50%`:`left:50%`};width:${w}%"></i></div>${pct(v,2)}</div>`;}).join("")}</div>
   <p class="m7frase">${f}</p>`;}

 function card(t,i){const w=S.idx=="sp500"?t.w_sp:t.w_ndx,f=t.f||{},g=!!S.gira[t.t];
  const v=(k,l,val,tit)=>`<div class="m7kv" title="${tit}"><span>${l}</span><b>${val}</b></div>`;
  return `<div class="m7c${g?" gira":""}" data-t="${esc(t.t)}" role="button" tabindex="0" aria-pressed="${g}" aria-label="${esc(t.n)}: tocca per girare">
   <div class="m7in"><div class="m7fa" style="--m7:${COL[i]}">
     <div class="m7h"><b>${esc(t.t)}</b>${fr(t.tr)}<span class="m7pw" title="Peso nell'indice">${w==null?"&ndash;":fx(w,1)+"%"}</span></div>
     <span class="m7n">${esc(t.n)}</span>${spark(t.sp,(t.r12m||0)>=0)}
     <div class="m7r"><span>1 mese ${pct(t.r1m)}</span><span>12 mesi ${pct(t.r12m,t.r12m!=null&&Math.abs(t.r12m)<10?1:0)}</span></div><i class="m7giro" aria-hidden="true">&#8635;</i></div>
    <div class="m7re" style="--m7:${COL[i]}"><div class="m7h"><b>${esc(t.t)}</b><span class="m7n">${f.anno||""}</span></div>
     ${v("marg","Margine",f.marg==null?"n/d":fx(f.marg,1)+"%","Utile netto su ricavi, ultimi 4 trimestri")}
     ${v("roe","ROE",f.roe==null?"n/d":fx(f.roe,0)+"%","Utile degli ultimi 4 trimestri sul patrimonio netto")}
     ${v("pe","P/E",f.pe==null?"n/d":fx(f.pe,0),"Prezzo su utile: quanti anni di utile costa l'azienda oggi")}
     ${f.fcfy==null?"":v("fcf","Cassa libera",fx(f.fcfy,1)+"%","Flusso di cassa libero annuo sul valore in borsa")}
     ${v("cr","Ricavi",f.cresc==null?"n/d":`<span class="${cls(f.cresc)}">${seg(f.cresc)}${fx(f.cresc,0)}%</span>`,"Crescita dei ricavi degli ultimi 4 trimestri sui 4 precedenti")}
     <i class="m7giro" aria-hidden="true">&#8635;</i></div></div></div>`;}

 function html(d){const I=d.indici[S.idx];if(!I)return "";
  return `<h3 class="vft m7tit">Magnifiche 7 <details class="info"><summary title="Come leggere" aria-label="Informazioni">i</summary><div>
    <b>Peso</b>: valore in borsa delle 7 (Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta, Tesla) sul totale delle aziende dell'indice. &Egrave; calcolato sulle azioni totali: i pesi ufficiali usano solo le azioni scambiate, la differenza &egrave; di 1-2 punti. La linea mostra il peso nell'ultimo anno.<br>
    <b>Chi ha spinto</b>: il movimento dell'indice diviso fra le 7 e tutte le altre aziende (in punti percentuali, con i pesi di inizio periodo). <b>Pesi uguali</b> = lo stesso indice se ogni azienda contasse uguale: se l'indice sale e i pesi uguali no, la salita la fanno pochi titoli.<br>
    <b>Card</b>: freccia = trend (prezzo e media a 200 giorni); tocca una card per vedere margine, ROE, P/E (prezzo su utile), flusso di cassa libero sul valore in borsa e crescita dei ricavi.</div></details></h3>
   <div class="card m7">
    <div class="m7top"><div class="m7seg" role="group" aria-label="Indice">${[["sp500","S&amp;P 500"],["ndx","Nasdaq-100"]].map(x=>`<button type="button" class="${S.idx==x[0]?"on":""}" data-i="${x[0]}">${x[1]}</button>`).join("")}</div></div>
    <div class="m7cols"><div class="m7s"><h4>Peso nell'indice</h4>${peso(d,I)}</div>
     <div class="m7s"><div class="m7h4"><h4>Chi ha spinto</h4><div class="m7per" role="group" aria-label="Periodo">${[["1s","1 sett."],["1m","1 mese"],["3m","3 mesi"]].map(p=>`<button type="button" class="${S.per==p[0]?"on":""}" data-p="${p[0]}">${p[1]}</button>`).join("")}</div></div>${spinta(I)}</div></div>
    <div class="m7grid">${d.titoli.map(card).join("")}</div>
   </div>`;}

 function disegna(box){if(!box||!box.isConnected||!S.dati)return;box.innerHTML=html(S.dati);
  box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{S.idx=b.dataset.i;disegna(box);});
  box.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{S.per=b.dataset.p;disegna(box);});
  box.querySelectorAll(".m7c").forEach(c=>{const g=()=>{const t=c.dataset.t;S.gira[t]=!S.gira[t];c.classList.toggle("gira",S.gira[t]);c.setAttribute("aria-pressed",S.gira[t]);};
   c.onclick=g;c.onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();g();}};});}

 let attesa=null;
 function monta(box){if(!box)return;
  if(!ok()){   // l'account si legge dopo la scheda: si riprova quando compare la classe eb-admin
   if(!attesa){attesa=new MutationObserver(()=>{if(ok()){attesa.disconnect();attesa=null;monta(document.querySelector("[data-m7]"));}});
    attesa.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});}
   return;}
  if(S.dati){disegna(box);return;}
  carica().then(d=>{if(d)disegna(box);});}

 window.ebMag7={monta,dati:()=>S.dati};
}catch(e){console.warn("[EdgeValor] mag7",e);}})();
