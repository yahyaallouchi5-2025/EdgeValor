/* ---------- grafico a candele (TradingView) ----------
   Clic su una scheda, una riga di tabella o uno strumento -> si apre un pannello con il grafico a candele.
   Il widget gratuito di TradingView si carica SOLO al primo clic (la dashboard resta veloce e funziona offline).
   Timeframe: D (giornaliero), H4, H1, W. Pulsante "Schermo intero" e link per aprire il grafico su tradingview.com.
   Simboli: config.py -> TV_SYMBOLS (strumenti) e TV_PAIRS (coppie speciali); le altre coppie usano "FX:NOME". */
try{
var TV={spec:null,iv:"D",caricato:null};
/* v9.55 SIMBOLI PER IL GRAFICO INCORPORATO (controllati uno per uno il 27/11/2026): il widget gratuito di TradingView
   NON mostra i future di CBOT, CME, NYMEX, COMEX e ICE ("simbolo non valido": serve l'abbonamento ai dati di borsa).
   Qui il CFD equivalente che il widget mostra (stesse unita' del future dove possibile: centesimi per caffe', cotone, zucchero).
   [simbolo, quotato al contrario]. null = nessun simbolo incorporabile: messaggio e link al grafico su TradingView.
   Il pulsante "TradingView" in alto apre sempre il future vero (config.py -> TV_SYMBOLS). */
const WIDGET={CORN:["CAPITALCOM:CORN"],SOY:["CAPITALCOM:SOYBEAN"],SOYOIL:["CAPITALCOM:SOYBEANOIL"],SOYMEAL:["CAPITALCOM:SOYBEANMEAL"],
 WHEAT:["CAPITALCOM:WHEAT"],KCWHEAT:["CAPITALCOM:WHEAT","grano di Chicago (simile)"],SUGAR:["PEPPERSTONE:SUGAR"],COFFEE:["PEPPERSTONE:COFFEE"],
 COCOA:["PEPPERSTONE:COCOA"],COTTON:["PEPPERSTONE:COTTON"],OJ:["CAPITALCOM:ORANGEJUICE"],CATTLE:["CAPITALCOM:LIVECATTLE"],
 FEEDER:["CAPITALCOM:FEEDERCATTLE"],HOGS:["CAPITALCOM:LEANHOGS"],HEATOIL:["CAPITALCOM:HEATINGOIL"],GASOLINE:["CAPITALCOM:GASOLINE"],
 NATGAS:["CAPITALCOM:NATURALGAS"],COPPER:["CAPITALCOM:COPPER"],
 // tassi: il future vale 100 meno il tasso; il grafico mostra il tasso (FRED) -> quotato al contrario
 FEDFUNDS:["FRED:DFF","tasso effettivo dei Fed Funds",true],SOFR:["FRED:SOFR","tasso SOFR",true],RICE:null,MILK:null};
/* strumento quotato al contrario nel grafico che si vede (flussi, fasce e avviso in testata seguono il grafico) */
function invDi(k){const w=WIDGET[k];return w?!!w[2]:!!(((D.tv||{})[k]||{}).inv);}
function tvInfo(spec){const t=spec.slice(0,1),k=spec.slice(2);
 if(t=="p"){const p=D.pairs.find(x=>x.pair==k)||{};return {sym:(D.tvp&&D.tvp[k])||("FX:"+k),nome:k,label:p.label,score:p.score,inv:false,sotto:p.base&&p.quote?`${nm(p.base)} / ${nm(p.quote)}`:""};}
 const a=D.assets[k]||{},tv=(D.tv&&D.tv[k])||{};return {sym:tv.s,nome:a.name||k,label:a.label,score:a.score,inv:invDi(k),sotto:`${a.it?a.it+" · ":""}${a.group||""} · ${k}`};}
function caricaTV(){if(TV.caricato)return TV.caricato;
 TV.caricato=new Promise((ok,ko)=>{const s=document.createElement("script");s.src="https://s3.tradingview.com/tv.js";s.async=true;
  s.onload=()=>window.TradingView?ok():ko(new Error("TradingView non disponibile"));s.onerror=()=>{TV.caricato=null;ko(new Error("impossibile caricare TradingView (sei offline?)"));};document.head.appendChild(s);});
 return TV.caricato;}
function disegnaTV(){const info=tvInfo(TV.spec),box=$("tvchart");box.innerHTML="";
 // v9.55 simbolo incorporabile (WIDGET) al posto del future che il widget non mostra
 const k=TV.spec.slice(2),w=TV.spec[0]=="a"&&k in WIDGET?WIDGET[k]:undefined,simbolo=w?w[0]:info.sym;
 if(w===null||!simbolo){box.innerHTML=`<div class="tvmsg">Il grafico di questo mercato si vede solo sul sito di TradingView.${info.sym?` <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(info.sym)}" target="_blank" rel="noopener">Apri il grafico &#x2197;</a>`:""}</div>`;return;}
 // SCHELETRO DI ATTESA (v6.49): lo script di TradingView arriva da internet e puo' metterci qualche secondo.
 // Al posto del riquadro vuoto si vede la sagoma del grafico (barra in alto, assi e candele) che "respira".
 box.innerHTML=`<div class="tvsk" aria-hidden="true"><div class="tvsk-top"><i class="sk" style="width:110px;height:13px"></i><i class="sk" style="width:150px;height:13px"></i><i class="sk" style="width:70px;height:13px"></i></div>
  <div class="tvsk-corpo"><div class="tvsk-barre">${Array(26).fill(0).map((_,i)=>`<i class="sk" style="height:${22+((i*37)%62)}%"></i>`).join("")}</div>
   <div class="tvsk-assi">${Array(5).fill('<i class="sk" style="width:38px;height:11px"></i>').join("")}</div></div></div>`;
 const scuro=true;   // tema unico blu notte: grafico sempre scuro
 caricaTV().then(()=>{new TradingView.widget({container_id:"tvchart",autosize:true,symbol:simbolo,interval:TV.iv,
   // "range" = periodo visibile. ATTENZIONE: TradingView adatta il timeframe al range (3M->1h, 12M->D, 60M->W),
   // quindi lo abbiniamo solo dove coincide; per H4 nessun range (mostra le ultime ~300 candele).
   ...({"60":{range:"3M"},"D":{range:"12M"},"W":{range:"60M"}}[TV.iv]||{}),
   timezone:"Europe/Rome",theme:scuro?"dark":"light",style:"1",locale:"it",allow_symbol_change:true,withdateranges:true,hide_side_toolbar:false,save_image:true,
   /* telefono: niente barra in alto di TradingView (timeframe doppi), grafico piu' alto */ hide_top_toolbar:matchMedia("(max-width:600px)").matches});})
 .catch(e=>{box.innerHTML=`<div class="tvmsg">${esc(e.message)}. <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(info.sym)}" target="_blank" rel="noopener">Apri il grafico su TradingView</a></div>`;console.error("[EdgeValor] grafico:",e);});}
/* Pannello COT sotto il grafico: per ogni settimana la variazione del netto Non Commercial (% open interest).
   Coppia = flusso della valuta base MENO quello della quotata: verde = flussi a favore della coppia in SALITA.
   Strumento quotato al contrario (es. JPY -> grafico USDJPY): il segno viene girato per seguire il grafico.
   La data e' il MARTEDI' di riferimento: il dato esce il venerdi' dopo (21:30 italiane). */
function flussiDi(spec){const t=spec.slice(0,1),k=spec.slice(2);
 if(t=="a"){const f=(D.assets[k]||{}).flussi||[],inv=invDi(k);return f.map(([d,v])=>[d,inv?-v:v]);}
 const p=D.pairs.find(x=>x.pair==k)||{},fb=new Map((D.assets[p.base]||{}).flussi||[]),fq=new Map((D.assets[p.quote]||{}).flussi||[]);
 return [...fb.keys()].filter(d=>fq.has(d)).sort().map(d=>[d,+(fb.get(d)-fq.get(d)).toFixed(2)]);}
/* Lettura delle ultime 3 settimane (swing): somma dei flussi e quante settimane vanno nella stessa direzione.
   3 su 3 nello stesso verso = flusso CONCENTRATO (posizionamento che si sta costruendo), 2 su 3 = prevalente. */
function tre(f){const u=f.slice(-3),tot=u.reduce((s,x)=>s+x[1],0),su=u.filter(x=>x[1]>0).length,giu=u.filter(x=>x[1]<0).length;
 const n=Math.max(su,giu),verso=tot>=0?"acquisti":"vendite";
 const forza=n==3?(tot>=0?"concentrati":"concentrate"):n==2?"prevalenti":"misti";   // accordo: acquisti concentrati / vendite concentrate
 return {u,tot,txt:n<2?"flussi misti, nessuna direzione chiara":`${verso} ${forza} (${n} su 3)`,col:n<2?"var(--ink2)":tot>=0?"var(--sb)":"var(--ss)"};}
/* posizione netta attuale in % dell'open interest: >0 net long, <0 net short */
function netto(k,inv){const a=D.assets[k]||{};if(a.pct_oi==null)return "";const v=inv?-a.pct_oi:a.pct_oi;
 return `${esc(k)} <b style="color:${v>=0?"var(--sb)":"var(--ss)"}">net ${v>=0?"long":"short"} ${fx(Math.abs(v),1)}%</b>`;}
/* v6.80 CHI TIENE LA VALUTA (report TFF, cot_radar/categorie.py): banche dealer e hedge fund. Informativo.
   Per il dollaro si usa l'indice del dollaro (DXY). Compare nel riepilogo sotto il grafico, solo per chi e' a un
   estremo di 3 anni (indice >= 80 o <= 20). */
const TFFN={dealer:"banche",lev:"hedge fund",asset:"asset manager"};
function tffValuta(g){const C=D.categorie;if(!C)return null;return C.valute[g]||(g=="USD"?C.valute.DXY:null)||null;}
/* riga "Conferme" del pannello: Commercials, open interest, affidabilita' storica */
function conferme(k,p){const parti=[],col=v=>v=="conferma"?"var(--sb)":v=="contrasto"?"var(--ss)":"var(--ink)";
 const gambe=p?[p.base,p.quote]:[k];
 const cm=gambe.map(g=>{const c=(D.assets[g]||{}).comm;return c?`${esc(g)} ${c.idx>=80?"molto long":c.idx<=20?"molto short":"neutri"} (${c.idx})`:null;}).filter(Boolean);
 const acc=p?p.comm_acc:(D.assets[k]||{}).comm_acc;
 if(cm.length)parti.push(`<b>Commercials:</b> ${cm.join(" &middot; ")}${acc?` &rarr; <b style="color:${col(acc)}">${acc}</b>`:""}`);
 const oi=gambe.map(g=>{const o=(D.assets[g]||{}).oi4;return o?`${esc(g)} ${o.d_oi>=0?"+":""}${fx(o.d_oi,1)}% <span class="lungo">(${esc(o.txt)})</span>`:null;}).filter(Boolean);
 if(oi.length)parti.push(`<b>Open interest 4 sett.:</b> ${oi.join(" &middot; ")}`);
 if(p&&p.news){const n=p.news,ev=(n.eventi||[]).filter(x=>x.z!=null).map(x=>`${esc(x.nome)} ${x.z>=0?"+":""}${fx(x.z,1)}&sigma; (${x.pb>=0?"+":""}${fx(x.pb,1)} pb)`);
  parti.push(`<b>Notizie:</b> ${n.oggi.length?"&#9889; "+n.oggi.map(esc).join(", ")+" ":""}${ev.join(" &middot; ")}${ev.length?` &rarr; <b style="color:${n.effetto=="rafforza"?"var(--sb)":n.effetto=="penalizza"?"var(--ss)":"var(--ink)"}">${n.effetto}</b> (${n.adj>=0?"+":""}${fx(n.adj,0)}, punteggio ${fmt(n.score)})`:""}`);}
 const st=p?p.stag:(D.assets[k]||{}).stag,sc=p?p.score:(D.assets[k]||{}).score;
 if(st)parti.push(`<b>Stagionalit&agrave;:</b> ${st.robusto?`${st.score>0?"salito":"sceso"} ${st.score>0?st.su:st.n-st.su}/${st.n} anni nelle 4 sett. dal COT (mediana ${st.med>=0?"+":""}${fx(st.med)}%) &rarr; <b style="color:${Math.sign(st.score)==Math.sign(sc)?"var(--sb)":"var(--ss)"}">${Math.sign(st.score)==Math.sign(sc)?"favorevole":"non favorevole"}</b>${st.adj?` (${st.adj>0?"+":""}${fx(st.adj,0)})`:""}`:`<b style="color:var(--warn)">neutra</b> (nessuna tendenza costante)`}`);
 const e=p?p.affid:(D.assets[k]||{}).affid;
 if(e)parti.push(`<b>Storico:</b> <b style="color:${e.pochi?"var(--ink)":e.hit>=60?"var(--sb)":e.hit<50?"var(--ss)":"var(--ink)"}">${e.hit}%</b> su ${e.n} segnali <span class="lungo">(resa media ${e.resa>=0?"+":""}${fx(e.resa)}% a 4 sett.)</span>`);
 return parti.length?`<div class="riga tre">${parti.map(x=>`<span>${x}</span>`).join("")}</div>`:"";}
/* RIEPILOGO SEMPLICE sotto il grafico (richiudibile): una riga riassuntiva sempre visibile e, aprendola,
   poche frasi in italiano semplice. Niente doppioni: i numeri tecnici restano nelle schede di approfondimento.
   Ordine: speculatori -> Commercials -> contratti aperti -> notizie -> storico -> prossima settimana (stagionalita'). */
/* v6.89 CONTESTO DELLA COPPIA nel riepilogo: ultima notizia (medio/alto impatto), forza delle valute e politica
   monetaria. Ogni pezzo ha un "verso" (+1 favorisce il BUY della coppia, -1 il SELL, 0 nessuno): verde se concorda
   con il segnale COT, rosso se va contro; senza segnale si dice solo quale valuta favorisce. Solo informativo. */
function contesto(p){if(!p||!p.base||!p.quote)return null;const b=p.base,q=p.quote,lati={[b]:1,[q]:-1};
 const vs=(p.label||"").includes("BUY")?1:(p.label||"").includes("SELL")?-1:0,out={};
 // --- ultima notizia uscita negli ultimi 7 giorni su una delle due valute
 const lim=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
 const ev=((D.agenda&&D.agenda.eventi)||[]).filter(e=>e.uscito&&lati[e.valuta]&&e.data>=lim).sort((x,y)=>(x.data+(x.utc||"")).localeCompare(y.data+(y.utc||""))).pop();
 if(ev){const forte=ev.z!=null&&Math.abs(ev.z)>=1,verso=forte?Math.sign(ev.z)*lati[ev.valuta]:0;
  out.news={ev,verso,imp:(ev.impatto||"high")=="high"?"alto":"medio",
   txt:ev.z==null?"reazione non misurabile":forte?`${NOMEV[ev.valuta]||ev.valuta} ${ev.z>0?"pi&ugrave; forte":"pi&ugrave; debole"}`:"reazione nella norma"};}
 // --- forza delle valute (ultime 4 settimane, classifica su 8)
 const F=(D.tat||{})._forza||{};
 if(F[b]&&F[q]){const d=F[b].r-F[q].r;out.forza={b:F[b],q:F[q],verso:Math.abs(d)>=0.5?Math.sign(d):0};}
 // --- politica monetaria (variazione dei tassi negli ultimi 3 mesi, base meno quotata)
 const P=(D.carry||{}).politica||{};
 if(P[b]&&P[q]){const d=P[b].d-P[q].d;out.pol={b:P[b],q:P[q],d,verso:Math.abs(d)>=0.15?Math.sign(d):0};}
 out.vs=vs;out.b=b;out.q=q;return out;}
const NOMEV={USD:"dollaro",EUR:"euro",GBP:"sterlina",JPY:"yen",CHF:"franco",CAD:"dollaro canadese",AUD:"dollaro australiano",NZD:"dollaro neozelandese",MXN:"peso",ZAR:"rand",BRL:"real"};
/* colore di un pezzo del contesto: verde se concorda con il segnale, rosso se contro, normale se neutro/senza segnale */
const ctxCol=(verso,vs)=>!verso||!vs?"var(--ink)":verso==vs?"var(--sb)":"var(--ss)";
function lettura(spec,f,p,k,inv){
 const pc1=x=>`${x>=0?"+":"&minus;"}${fx(Math.abs(x),1)}%`,verde="var(--sb)",rosso="var(--ss)";
 const t=tre(f),[ud,uv]=f[f.length-1],ven=new Date(ud);ven.setDate(ven.getDate()+3);
 const o=p||D.assets[k]||{},nome=p?p.pair:(o.name||k),gambe=p?[p.base,p.quote]:[k];
 const n3=Math.max(t.u.filter(x=>x[1]>0).length,t.u.filter(x=>x[1]<0).length),compra=t.tot>=0;
 // --- speculatori
 const dir=n3<2?"nessuna direzione chiara":`${compra?"comprano":"vendono"} (${n3==3?"3 settimane su 3":"2 su 3"}, ${pc1(t.tot)})`;
 const pos=p?[netto(p.base),netto(p.quote)].filter(Boolean).join(" &middot; "):netto(k,inv);
 // v9.55 SCHEDA VERTICALE: ogni pezzo e' {t: titolo, v: valore breve a destra, h: testo completo}. I pezzi principali
 //   diventano le 4 card "Lettura di oggi", gli altri righe richiudibili (chiuse all'apertura). Ogni dato compare una volta.
 const dett=[],metti=(t,v,h)=>{dett.push({t,v,h});};
 metti("Speculatori in dettaglio",`${pc1(uv)} ultima sett.`,`<b>Speculatori</b> (grandi fondi): nell'ultima settimana hanno <b style="color:${uv>=0?verde:rosso}">${uv>=0?"comprato":"venduto"}</b> (${pc1(uv)} dei contratti aperti).
  Nelle ultime 3 settimane ${n3<2?"la direzione &egrave; mista":`hanno ${compra?"comprato":"venduto"} ${n3==3?"tutte e 3 le settimane":"2 settimane su 3"} (<b style="color:${compra?verde:rosso}">${pc1(t.tot)}</b> in totale)`}.
  ${pos?`Oggi: ${pos}.`:""} <span class="small">Dato di marted&igrave; ${fd(ud)}, uscito venerd&igrave; ${fd(ven.toISOString().slice(0,10))}.</span>`);
 // --- Commercials (chi produce o usa davvero il sottostante e si copre)
 const acc=o.comm_acc,cm=gambe.map(g=>{const c=(D.assets[g]||{}).comm;return c&&(c.idx>=80||c.idx<=20)?`molto in ${c.idx>=80?"acquisto":"vendita"} su ${esc(g)}`:null;}).filter(Boolean);
 const cmTesto=cm.length?cm.join(" &middot; "):"nessuna indicazione";
 // v9.55 i Commercials sono una card (vedi "carte" in fondo): la frase lunga non si mostra piu'
 void(`<b>Commercials</b> (produttori e banche che si coprono): ${cm.length?cm.join(" &middot; ")+(acc?` &rarr; <b style="color:${acc=="conferma"?verde:rosso}">${acc=="conferma"?"sono dalla parte del segnale":"vanno contro il segnale"}</b>`:""):"nella norma, nessuna indicazione"}.`);
 // --- v6.80 banche dealer e hedge fund (TFF): si segnala solo chi e' a un estremo di 3 anni
 const est=gambe.map(g=>{const v=tffValuta(g);if(!v)return null;const p2=["dealer","lev"].filter(c=>v[c]&&v[c].stato!="norma")
  .map(c=>`${TFFN[c]} ${v[c].stato=="massimo"?"al massimo":"al minimo"} di 3 anni`);return p2.length?`${esc(g)}: ${p2.join(", ")}`:null;}).filter(Boolean);
 if(D.categorie)metti("Banche e hedge fund",est.length?"agli estremi":"nella norma",`<b>Banche e hedge fund</b> (report TFF, informativo): ${est.length?est.join(" &middot; "):"posizioni nella norma"}. <span class="small">Dal 2018 la posizione delle banche ha anticipato le valute meglio di quella degli speculatori; prima del 2018 no.</span>`);
 // --- contratti aperti
 const oi=gambe.map(g=>{const x=(D.assets[g]||{}).oi4;return x&&Math.abs(x.d_oi)>=2?`${esc(g)} ${pc1(x.d_oi)} (${esc(x.txt)})`:null;}).filter(Boolean);
 if(oi.length)metti("Contratti aperti 4 sett.",gambe.map(g=>{const x=(D.assets[g]||{}).oi4;return x&&Math.abs(x.d_oi)>=2?`${esc(g)} ${pc1(x.d_oi)}`:null;}).filter(Boolean).join(" · "),`<b>Contratti aperti</b> nelle ultime 4 settimane: ${oi.join(" &middot; ")}.`);
 // --- v6.89 CONTESTO (notizia, forza valute, politica monetaria): dettaglio della riga riassuntiva
 const cx=contesto(p);
 if(cx&&(cx.news||cx.forza||cx.pol)){const sg=x=>`${x>=0?"+":"&minus;"}${fx(Math.abs(x),2)}`,parti=[];
  if(cx.news){const e=cx.news.ev;parti.push(`ultima notizia <b>${esc(e.nome)}</b> (${cx.news.imp} impatto, ${fd(e.data)})${e.z!=null?` &rarr; tasso a 2 anni ${e.pb>=0?"+":""}${fx(e.pb,1)} pb (${e.z>=0?"+":""}${fx(e.z,1)}&sigma;), <b style="color:${ctxCol(cx.news.verso,cx.vs)}">${cx.news.txt}</b>`:` &rarr; ${cx.news.txt}`}`);}
  if(cx.forza)parti.push(`forza 4 settimane: <b>${cx.b} ${cx.forza.b.stato}</b> (${sg(cx.forza.b.r)}%, ${cx.forza.b.rank}&ordf; su 8) / <b>${cx.q} ${cx.forza.q.stato}</b> (${sg(cx.forza.q.r)}%, ${cx.forza.q.rank}&ordf;)`);
  if(cx.pol)parti.push(`tassi negli ultimi 3 mesi: ${cx.b} ${sg(cx.pol.b.d)} punti (${cx.pol.b.stato}), ${cx.q} ${sg(cx.pol.q.d)} (${cx.pol.q.stato}) &rarr; <b style="color:${ctxCol(cx.pol.verso,cx.vs)}">${cx.pol.verso?"favorisce "+(cx.pol.verso>0?cx.b:cx.q):"neutra"}</b>`);
  metti("Contesto",cx.pol&&cx.pol.verso?"favorisce "+(cx.pol.verso>0?cx.b:cx.q):cx.forza?`${cx.b} ${cx.forza.b.stato}`:"",`<div class="tatt"><p><b>Contesto</b>: ${parti.join(" &middot; ")}.</p><details class="info tatti"><summary title="Come leggerlo" aria-label="Informazioni">i</summary><div><b>Notizia</b>: ultima notizia di medio o alto impatto degli ultimi 7 giorni su una delle due valute. La sorpresa &egrave; misurata dal mercato (tasso a 2 anni oltre la norma, |&sigma;| &ge; 1): disponibile per dollaro ed euro. <b>Forza</b>: rendimento di ogni valuta contro la media delle 8 principali nelle ultime 4 settimane (prime 3 = forte, ultime 3 = debole). <b>Politica monetaria</b>: variazione dei tassi a breve negli ultimi 3 mesi disponibili (dati mensili, 1-2 mesi di ritardo): la valuta che alza di pi&ugrave; (o taglia di meno) attira capitali. Verde = a favore del segnale COT, rosso = contro. Informativo: non cambia il punteggio.</div></details></div>`);}
 // --- v6.88 LETTURA TATTICA (cot_radar/tattica.py): regressione e indicatori sulle chiusure, SOLO informativa
 const tt=(D.tat||{})[p?p.pair:k];
 if(tt){const est=x=>`<b style="color:var(--warn)">${x}</b>`,pc2=x=>`${x>=0?"+":"&minus;"}${fx(Math.abs(x),1)}%`;
  metti("Lettura tattica",`RSI ${tt.rsi}`,`<div class="tatt"><p><b>Lettura tattica</b> <span class="small">(informativa, chiusura del ${fd(tt.data)})</span>:
   ${/parte/.test(tt.txt_canale)?est(tt.txt_canale):"<b>"+tt.txt_canale+"</b>"} a 100 giorni &middot; <b>${tt.txt_trend}</b> (${pc2(tt.pend)} annuo, R&sup2; ${fx(tt.r2,2)})
   &middot; RSI ${tt.txt_rsi=="neutro"?"<b>"+tt.rsi+"</b>":est(tt.rsi+" "+tt.txt_rsi)} &middot; <b>${pc2(tt.d200)}</b> dalla media a 200 giorni &middot; movimento medio ${fx(tt.mov,2)}% al giorno</p>
   <details class="info tatti"><summary title="Come leggerla" aria-label="Informazioni">i</summary><div><b>Canale</b>: retta di regressione sugli ultimi 100 giorni; "parte alta/bassa" = prezzo oltre 1,5 deviazioni standard dalla retta (canale = &plusmn;2). <b>R&sup2;</b> = quanto il prezzo segue la retta: da 0,6 in su il trend &egrave; pulito. <b>RSI</b> 14 giorni: sopra 70 ipercomprato, sotto 30 ipervenduto. <b>Movimento medio</b> = variazione tipica di un giorno (ultime 4 settimane). Solo chiusure giornaliere. <b>Informativa</b>: nei test questi indicatori non hanno migliorato i segnali COT, quindi non entrano nel punteggio.</div></details></div>`);}
 // --- notizie (solo se cambiano qualcosa)
 const nw=p&&p.news;if(nw&&nw.effetto!="neutro"){const ev=[...(nw.oggi||[]),...(nw.eventi||[]).map(x=>x.nome)].filter(Boolean);
  metti("Notizie",nw.effetto=="rafforza"?"a favore":"contro",`<b>Notizie</b>: ${ev.length?esc(ev.join(", "))+" &rarr; ":""}<b style="color:${nw.effetto=="rafforza"?verde:rosso}">${nw.effetto=="rafforza"?"rafforzano il segnale":"vanno contro il segnale"}</b>.`);}
 // --- storico del segnale
 const e=o.affid;   // v9.55 lo Storico e' una card: frase lunga non piu' mostrata
 if(e)void(`<b>Storico</b>: su ${e.n} segnali simili in passato ha funzionato <b style="color:${e.pochi?"var(--ink)":e.hit>=60?verde:e.hit<50?rosso:"var(--ink)"}">${e.hit}% delle volte</b> (resa media ${pc1(e.resa)} dopo 4 settimane)${e.pochi?", pochi casi: da prendere con le pinze":""}.`);
 // --- stagionalita' (v6.18): la settimana parte dal VENERDI' DI USCITA DEL COT (s1.giorno), cosi' segue il ciclo
 //     settimanale del segnale. Giudizio rispetto al segnale: FAVOREVOLE (stessa direzione), NON FAVOREVOLE
 //     (direzione opposta), NEUTRA (nessuna tendenza costante negli anni passati). Colori: verde / rosso / ambra.
 const s1=o.stag1s,st4=o.stag,vs=(o.label||"").includes("BUY")?1:(o.label||"").includes("SELL")?-1:0;
 const giudizio=(robusto,m)=>!robusto?["neutra","var(--warn)"]:!vs?[m>0?"tende al rialzo":"tende al ribasso",m>0?verde:rosso]
  :Math.sign(m)==vs?["favorevole",verde]:["non favorevole",rosso];
 const g1=s1?giudizio(s1.robusto,s1.med):null;
 /* v7.95 STAGIONALITA' A METRICHE: due righe, una per orizzonte (settimana del COT e 4 settimane), ognuna con
    barra degli anni in rialzo, numero e giudizio in una parola. Prima era un paragrafo lungo che sembrava contraddirsi
    ("neutra" e "tende al rialzo" insieme): sono due orizzonti diversi, ora si vede subito. Spiegazione nella (i). */
 if(s1){const g0=s1.giorno?new Date(s1.giorno):null,g7=g0?new Date(g0.getTime()+7*864e5):null,gg=d=>fd(d).slice(0,5);
  const parola=g=>({"neutra":"Neutra","tende al rialzo":"Rialzo","tende al ribasso":"Ribasso","favorevole":"A favore","non favorevole":"Contro"})[g[0]]||g[0];
  const riga=(eti,su,n,g,med)=>`<div class="stgr"><span class="stgk">${eti}</span><span class="stgb" aria-hidden="true"><i style="width:${(su/n*100).toFixed(0)}%"></i></span>
   <span class="stgn"><b>${su}</b> su ${n} in rialzo${med!=null?` &middot; ${pc1(med)}`:""}</span><em style="--c:${g[1]}">${parola(g)}</em></div>`;
  let stg=`<div class="stgm"><div class="stgt"><b>Stagionalit&agrave;</b><span class="small">dal ${s1.dal}</span>
   <details class="info tatti"><summary title="Come leggerla" aria-label="Informazioni">i</summary><div><b>Settimana</b>: ${g0?`da venerd&igrave; ${fd(s1.giorno)} (uscita del COT) a venerd&igrave; ${fd(g7.toISOString().slice(0,10))}`:"la settimana del segnale"}.
    <b>4 settimane</b>: le prossime quattro. Barra e numero = anni in cui ${esc(nome)} &egrave; salito su quelli osservati${s1.robusto?"; accanto la variazione tipica":""}.
    <b>Neutra</b> = nessuna tendenza costante negli anni.${vs?" <b>A favore</b> / <b>Contro</b> = rispetto alla direzione del segnale.":""} I due orizzonti sono indipendenti: possono dare giudizi diversi.</div></details>
   <a href="#stag" data-vai="stag" class="stgl">Approfondisci &rarr;</a></div>
   ${riga(g0?`Settimana ${gg(s1.giorno)}&ndash;${gg(g7.toISOString().slice(0,10))}`:"Settimana",s1.su,s1.n,g1,s1.robusto?s1.med:null)}
   ${st4&&st4.n?riga("4 settimane",st4.su,st4.n,giudizio(st4.robusto,st4.score),null):""}</div>`;
  metti("Stagionalità in dettaglio",st4&&st4.n?"4 sett.: "+parola(giudizio(st4.robusto,st4.score)):"",stg);
  var parolaG=parola;}
 // v8.50 RINNOVO DEI FUTURE (cot_radar/rinnovo.py, per tutti dal 21/11/2026): quanto ha reso o costato in 12 mesi rinnovare i
 //   contratti, per chi tiene la materia prima con un ETF/ETC sui future. Solo informativo, non entra nel punteggio.
 const rn=D.rinnovo&&D.rinnovo[k];
 if(rn){const pos=rn.v>=0;metti("Rinnovo dei future","",`<div class="rnv"><b>Rinnovo dei future</b> <em style="color:${pos?verde:rosso}">${pos?"+":"&minus;"}${String(Math.abs(rn.v)).replace(".",",")}% in 12 mesi</em>
  <span>${pos?"I contratti lontani costano meno di quelli vicini: chi tiene un ETF sui future guadagna anche dal rinnovo.":"I contratti lontani costano di pi&ugrave;: un ETF sui future rende meno del prezzo che vedi."}</span>
  <details class="info"><summary title="Come si calcola" aria-label="Informazioni">i</summary><div>Rendimento a 12 mesi dell'ETF che compra i future e li rinnova, meno quello del prezzo senza rinnovo e meno l'interesse dei titoli a 3 mesi. Positivo = <b>backwardation</b>, negativo = <b>contango</b>. Nei portafogli il costo &egrave; gi&agrave; compreso nei risultati. Come segnale per comprare o vendere non ha dato un vantaggio stabile (studio sui dati dal 2007): &egrave; solo un'informazione.</div></details></div>`);}
 // v8.54 S&P 500 SOTTO LA MEDIA A 200 GIORNI (cot_radar/sconto_sp.py, studio studi/studio_sp500_sconto.py): distanza di oggi
 //   e, quando lo sconto supera una soglia, com'e' andata dopo gli episodi passati. Solo informativo, non un segnale.
 const sp=k=="SP500"&&D.sconto_sp;
 if(sp){const f1=pc1,s0=v=>"&minus;"+Math.abs(v)+"%";   // soglie senza decimali: oltre −15%
  const at=sp.soglia!=null?sp.soglie.find(x=>x.s==sp.soglia):null;
  const tab=`<table class="spsc-t"><tr><th>Sotto la media</th><th class="num">Volte</th><th class="num">24 mesi dopo</th><th class="num">Discesa dopo</th></tr>${sp.soglie.map(x=>`<tr${at&&x.s==at.s?' class="on"':""}><th>oltre ${s0(x.s)}</th><td class="num">${x.n}</td><td class="num">${x.r24==null?"n/d":`<b style="color:${x.r24>=0?verde:rosso}">${f1(x.r24)}</b> <span>(${x.p24} su ${x.n24})</span>`}</td><td class="num"><b style="color:${rosso}">${f1(x.dd)}</b></td></tr>`).join("")}</table>`;
  metti("Distanza dalla media a 200 giorni","",`<div class="rnv spsc"><b>Distanza dalla media a 200 giorni</b> <em style="color:${sp.dist>=0?verde:rosso}">${f1(sp.dist)}</em>
   <details class="info"><summary title="Come si legge" aria-label="Informazioni">i</summary><div>Quanto il prezzo &egrave; sotto (o sopra) la media delle ultime 200 sedute. Ogni episodio conta una volta sola: il primo giorno oltre la soglia, poi di nuovo solo dopo il ritorno sopra la media. Dati dell'indice dal ${sp.dal}, senza dividendi.${at?"":tab}
    <br><b>Come leggerlo</b>: pi&ugrave; lo sconto &egrave; profondo, pi&ugrave; in media l'indice ha reso nei 2 anni dopo. Ma non &egrave; il punto pi&ugrave; basso: dopo l'episodio il prezzo &egrave; spesso sceso ancora (nel 2008 oltre il 30%) e a 12 mesi la probabilit&agrave; di guadagno non &egrave; stata pi&ugrave; alta di un giorno qualsiasi (${sp.base12_pos}%). &Egrave; un'informazione ciclica, non un segnale di acquisto.</div></details>
   <span>${at?`Sconto oltre ${s0(at.s)}: in passato ${at.n} episodi, 24 mesi dopo ${at.r24==null?"n/d":f1(at.r24)} in media, ma prima il prezzo &egrave; sceso in media di un altro ${f1(at.dd).replace("&minus;","")}.`
    :`Nessuno sconto profondo. Sotto ${s0(-10)} &egrave; successo ${(sp.soglie[0]||{}).n||0} volte dal ${sp.dal}.`}</span>
   ${at?tab:""}
</div>`);}
 // --- v9.55 LE 4 CARD "Lettura di oggi" (al posto della riga "Riepilogo:" che si apriva da sola)
 const carte=[{t:"Speculatori",v:n3<2?"Direzione mista":`${compra?"Acquisti":"Vendite"} ${n3==3?(compra?"concentrati":"concentrate"):"prevalenti"}`,
   c:n3<2?"":compra?"su":"giu",s:n3<2?"ultime 3 settimane":`${n3==3?"3 settimane su 3":"2 su 3"} · ${pc1(t.tot)}`},
  {t:"Commercials",v:acc=="conferma"?"A favore":acc=="contrasto"?"Contro":cm.length?"Agli estremi":"Nella norma",c:acc=="conferma"?"su":acc=="contrasto"?"giu":"",s:cmTesto}];
 if(g1)carte.push({t:"Stagionalità",v:(parolaG||(x=>x[0]))(g1),c:g1[1]==verde?"su":g1[1]==rosso?"giu":"neutro",s:"settimana del COT"});
 if(e)carte.push({t:"Storico",v:`${e.hit}%`,c:e.pochi?"":e.hit>=60?"su":e.hit<50?"giu":"",s:`su ${e.n} segnali · resa ${pc1(e.resa)}`});
 return {carte,dett};}
/* SINTESI DEI FLUSSI COT in una riga (al posto delle barre, che si aprono con un clic):
   quante settimane in acquisto/vendita, da quante settimane di fila nello stesso verso,
   e se la spinta sta crescendo o calando (media delle ultime 3 settimane contro le 3 prima). */
function sintesiFlussi(f){const n=f.length,su=f.filter(x=>x[1]>0).length,giu=f.filter(x=>x[1]<0).length;
 const ult=Math.sign(f[n-1][1]);let fila=0;for(let i=n-1;i>=0&&Math.sign(f[i][1])==ult&&ult!=0;i--)fila++;
 const media=a=>a.reduce((x,y)=>x+Math.abs(y[1]),0)/(a.length||1),m1=media(f.slice(-3)),m0=media(f.slice(-6,-3));
 const spinta=m1>m0*1.25?"spinta in aumento":m1<m0*0.8?"spinta in calo":"spinta stabile";
 const col=ult>0?"var(--sb)":ult<0?"var(--ss)":"var(--ink)";
 return `<b>${n} settimane:</b> ${su} in acquisto &middot; ${giu} in vendita &middot; <b style="color:${col}">${ult>0?"acquisti":ult<0?"vendite":"fermi"} da ${fila} ${fila==1?"settimana":"settimane di fila"}</b> &middot; ${spinta}`;}
/* v9.55 PANNELLO DI LETTURA della scheda (colonna a destra su PC, sotto il grafico da telefono):
   1) "Lettura di oggi": 4 card (speculatori, Commercials, stagionalita', storico);
   2) "Flussi 26 settimane": riga di sintesi e barre SEMPRE visibili (le ultime 3 piene);
   3) i dettagli in righe richiudibili, TUTTE CHIUSE all'apertura (prima il riepilogo si ricordava aperto: Ya, 26/11);
   4) nota finale. Ogni dato compare una volta sola (le card non si ripetono nelle righe). */
function disegnaCOT(spec){const box=$("tvcot");try{
 const f=flussiDi(spec);if(!f.length){box.innerHTML=`<p class="sk-vuoto">Nessun dato COT per questo strumento.</p>`;return;}
 const k=spec.slice(2),p=spec[0]=="p"?D.pairs.find(x=>x.pair==k)||{}:null,inv=spec[0]=="a"&&invDi(k);
 const L=lettura(spec,f,p,k,inv),[ud]=f[f.length-1];
 // barre dei flussi: verde = comprano, rosso = vendono; le ultime 3 settimane piene, le altre attenuate
 const max=Math.max(...f.map(x=>Math.abs(x[1])),0.01),W=600,H=70,bw=W/f.length;
 const barre=f.map(([d,v],i)=>{const h=Math.abs(v)/max*(H/2-3),y=v>=0?H/2-h:H/2,recente=i>=f.length-3;
  return `<rect x="${(i*bw+bw*.17).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*.66).toFixed(1)}" height="${Math.max(h,.8).toFixed(1)}" rx="1.5"
   fill="${v>=0?"var(--sb)":"var(--ss)"}" opacity="${recente?1:.42}"><title>marted&igrave; ${fd(d)}: ${v>=0?"+":""}${fx(v)}% open interest</title></rect>`;}).join("");
 const fascia=`<rect x="${((f.length-3)*bw).toFixed(1)}" y="0" width="${(3*bw).toFixed(1)}" height="${H}" fill="var(--soft)" opacity=".7"/>`;
 // il titolo dentro il testo completo si toglie: e' gia' il titolo della riga (niente doppioni)
 const senzaTitolo=h=>h.replace(/^(<div class="(?:tatt|rnv[^"]*)"><p>|<div class="rnv[^"]*">)?\s*<b>[^<]{2,48}<\/b>\s*(<span class="small">[^<]*<\/span>)?\s*(\([^)]{0,60}\))?\s*:?\s*/,(m,a)=>a||"");
 const carta=c=>`<div class="sk-c ${c.c||""}"><small>${c.t}</small><b>${c.v}</b>${c.s?`<em>${c.s}</em>`:""}</div>`;
 box.innerHTML=`<div class="sk-sez"><h3>Lettura di oggi <details class="info"><summary title="Come leggerla" aria-label="Informazioni">i</summary><div>
   <b>Speculatori</b>: direzione dei grandi fondi nelle ultime 3 settimane (report COT). <b>Commercials</b>: chi produce o usa davvero il sottostante e si copre;
   conta quando &egrave; a un estremo. <b>Stagionalit&agrave;</b>: come si &egrave; mosso negli anni passati nella settimana del COT. <b>Storico</b>: quante volte i segnali simili hanno funzionato.
   Colori: verde = a favore del rialzo o del segnale, rosso = contro, ambra = neutra.</div></details></h3>
   <div class="sk-carte">${L.carte.map(carta).join("")}</div></div>
  <div class="sk-sez"><h3>Flussi 26 settimane <details class="info"><summary title="Come leggerli" aria-label="Informazioni">i</summary><div>Ogni barra = una settimana:
   variazione della posizione netta degli speculatori in % dei contratti aperti${p?" (valuta base meno valuta quotata)":""}. Verde = comprano, rosso = vendono.
   Le ultime 3 settimane sono piene. Dato del marted&igrave;, pubblicato il venerd&igrave; alle 21:30.</div></details></h3>
   <div class="sk-fl"><p>${sintesiFlussi(f)}</p><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Flussi COT settimanali">${fascia}<line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" stroke="var(--line)"/>${barre}</svg>
   <div class="sk-as"><span>${fd(f[0][0])}</span><span>${fd(ud)}</span></div></div></div>
  <div class="sk-acc">${L.dett.filter(x=>x.t).map(x=>`<details class="sk-r"><summary><span>${x.t}</span>${x.v?`<em>${x.v}</em>`:""}<b class="sk-fr" aria-hidden="true">&#9658;</b></summary>
   <div class="sk-rc">${senzaTitolo(x.h)}</div></details>`).join("")}</div>
  <p class="sk-piede">Dati di studio, non un consiglio di investimento.</p>`;
 /* i link [data-vai] (es. "Approfondisci" della stagionalita') sono gestiti da un unico ascoltatore globale (vedi navigazione) */
 }catch(e){box.innerHTML="";console.error("[EdgeValor] pannello COT:",e);try{window.ebErrore&&ebErrore("Scheda: lettura",e);}catch(_){}}}   // se si rompe sparisce il pannello, non il grafico
/* AVVISO NOTIZIA nel pannello del grafico: compare SOLO quando una notizia (es. CPI, Fed) va contro il
   segnale, perche' cambia il "quando" entrare. Nessun voto di affidabilita' (tolto in v6.16). */
function avvisoNotizia(spec){const[t,id]=spec.split(":");if(t!="p")return "";const p=D.pairs.find(x=>x.pair==id);
 if(!p||!p.news||p.news.effetto!="penalizza"||p.label=="NEUTRO")return "";
 const ev=[...(p.news.oggi||[]),...(p.news.eventi||[]).map(x=>x.nome)].filter(Boolean);
 return `<span class="badge" style="--bc:var(--ss)" title="${esc("Notizia contraria al segnale: "+(ev.join(", ")||"vedi riepilogo"))}">NOTIZIA CONTRARIA</span>`;}
/* v9.55 GRAFICO NOSTRO al posto di TradingView (Ya, 27/11/2026): dove abbiamo le candele (28 coppie, indici, oro,
   argento, petrolio, gas, rame, crypto, cambi emergenti) si usa il motore di 13c_candele.js in modalita' "scheda":
   fasce degli speculatori, uscite del COT, notizie, MA 50 / MA 200 / RSI. Dove non le abbiamo (obbligazioni, agricoli,
   carne, DXY, VIX...) resta TradingView, come prima. Se le candele non arrivano si torna da soli a TradingView.
   chiaveCandele -> {k: strumento (fasce e notizie), sym: simbolo delle candele se diverso, inv, valute} oppure null */
function chiaveCandele(spec){if(!window.ebCandele||!ebCandele.simbolo)return null;const k=spec.slice(2);
 if(ebCandele.simbolo(k))return {k};
 // valute del COT (EUR, JPY...): il grafico e' la coppia contro il dollaro gia' usata da TradingView (es. USDJPY, al contrario)
 const tv=(D.tv||{})[k]||{},c=String(tv.s||"").split(":").pop(),sc=c&&c.length==6?ebCandele.simbolo(c):null;
 return sc?{k,sym:sc[0],inv:!!tv.inv,valute:[c.slice(0,3),c.slice(3)]}:null;}
function usaTV(){const pan=$("tvpannello");pan.classList.add("contv");pan.classList.remove("nostro");
 // v9.55 se il grafico incorporato non e' il future, lo si dice in testata (una volta sola)
 const k=TV.spec.slice(2),w=TV.spec[0]=="a"?WIDGET[k]:null,so=$("tvsotto");
 if(w&&so&&!so.querySelector(".tvcfd"))so.insertAdjacentHTML("beforeend",` &middot; <span class="tvcfd">grafico: ${esc(w[1]||"prezzo CFD del future")}</span>`);
 disegnaTV();}
function disegnaNostro(spec,ck){const box=$("tvchart"),pan=$("tvpannello");pan.classList.add("nostro");pan.classList.remove("contv");
 // sagoma di attesa (come per TradingView) mentre arrivano candele e, per il Premium, fasce e notizie (verifica.json)
 box.innerHTML=`<div class="tvsk" aria-hidden="true"><div class="tvsk-top"><i class="sk" style="width:180px;height:26px"></i><i class="sk" style="width:150px;height:26px"></i></div>
  <div class="tvsk-corpo"><div class="tvsk-barre">${Array(26).fill(0).map((_,i)=>`<i class="sk" style="height:${22+((i*37)%62)}%"></i>`).join("")}</div>
   <div class="tvsk-assi">${Array(5).fill('<i class="sk" style="width:38px;height:11px"></i>').join("")}</div></div></div>`;
 let fatto=false;
 const parti=()=>{if(fatto)return;fatto=true;if(TV.spec!==spec||$("tvmodal").hidden)return;box.innerHTML="";
  ebCandele(box,{id:"sk",strumento:ck.k,generato:new Date().toISOString(),
   opz:{scheda:true,sym:ck.sym,inv:ck.inv,valute:ck.valute,manca:()=>{if(TV.spec===spec&&!$("tvmodal").hidden)usaTV();}}});};
 // fasce e notizie arrivano con verifica.json: si aspetta al massimo 2,5 secondi, poi il grafico parte comunque
 //   (un solo disegno: niente grafico che si ridisegna sotto il dito)
 if(D.cmp||!window.ebCaricaVerifica)parti();else{ebCaricaVerifica().then(parti,parti);setTimeout(parti,2500);}}
function apriGrafico(spec){TV.spec=spec;const info=tvInfo(spec),m=$("tvmodal");disegnaCOT(spec);
 $("tvtitolo").innerHTML=`<span class="pair">${esc(info.nome)}</span> ${info.label?badge(info.label):""} ${avvisoNotizia(spec)} <span class="small">punteggio ${fmt(info.score)}</span>`;
 $("tvsotto").innerHTML=`${esc(info.sotto)}`+   /* simbolo TradingView tolto: si vede gia' nel grafico */(info.inv?` &middot; <b style="color:var(--warn)">grafico quotato al contrario: posizionamento al RIALZO = grafico che SCENDE</b>`:"");
 $("tvlink").href="https://www.tradingview.com/chart/?symbol="+encodeURIComponent(info.sym||"");
 document.querySelectorAll("#tviv button").forEach(b=>b.classList.toggle("on",b.dataset.iv==TV.iv));
 m.hidden=false;bloccaPagina(true);
 $("tvcot").scrollTop=0;$("tvpannello").scrollTop=0;           // ogni scheda si apre dall'inizio
 const ck=chiaveCandele(spec);if(ck)disegnaNostro(spec,ck);else usaTV();}
function chiudiGrafico(){const m=$("tvmodal");if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 if($("tvpannello").classList.contains("pieno"))schermoPieno();m.hidden=true;bloccaPagina(false);$("tvchart").innerHTML="";}
/* BLOCCO DELLA PAGINA mentre il grafico e' aperto (soprattutto iPhone).
   Su iOS "overflow:hidden" non basta: trascinando sul grafico (es. per disegnare una zona) Safari muoveva
   anche la pagina sotto, o la ingrandiva. Qui: 1) la pagina viene "fissata" nella sua posizione (position:fixed)
   e poi rimessa dov'era alla chiusura; 2) lo zoom con le dita della pagina e' disattivato solo finche' il
   grafico e' aperto (il grafico TradingView continua a zoomare da solo). */
var BLOCCO={y:0,vp:null};
function bloccaPagina(on){const b=document.body,h=document.documentElement,vp=document.querySelector('meta[name="viewport"]');
 if(on){if(h.classList.contains("bloccato"))return;BLOCCO.y=window.scrollY;h.classList.add("bloccato");
  Object.assign(b.style,{position:"fixed",top:-BLOCCO.y+"px",left:"0",right:"0",width:"100%",overflow:"hidden"});
  if(vp){BLOCCO.vp=vp.content;vp.content=BLOCCO.vp+",maximum-scale=1,user-scalable=no";}}
 else{if(!h.classList.contains("bloccato"))return;h.classList.remove("bloccato");
  Object.assign(b.style,{position:"",top:"",left:"",right:"",width:"",overflow:""});window.scrollTo({top:BLOCCO.y,behavior:"instant"});
  if(vp&&BLOCCO.vp)vp.content=BLOCCO.vp;}}
document.addEventListener("click",ev=>{const el=ev.target.closest("[data-tv]");if(el&&!ev.target.closest("button,a,input")){try{apriGrafico(el.dataset.tv);}catch(e){fail("Grafico",null,e);}}});
$("tvchiudi").onclick=chiudiGrafico;
$("tvmodal").addEventListener("click",ev=>{if(ev.target.id=="tvmodal")chiudiGrafico();});
// Esc: se il grafico nostro e' a schermo intero esce prima da quello (lo gestisce 13c_candele.js), non chiude la scheda
document.addEventListener("keydown",ev=>{if(ev.key=="Escape"&&!$("tvmodal").hidden&&!document.documentElement.classList.contains("vfcaperto"))chiudiGrafico();});
/* SCHERMO INTERO. iPhone (Safari e Chrome su iOS) NON permette lo schermo intero vero sugli elementi della pagina
   (solo sui video): li' usiamo un "finto" schermo intero via CSS (classe .pieno = pannello su tutta la finestra).
   Sugli altri browser si prova quello vero; se il browser lo rifiuta si ripiega sullo stesso metodo CSS. */
function schermoPieno(){const p=$("tvpannello"),on=p.classList.toggle("pieno");$("tvfull").classList.toggle("on",on);}   // la pagina e' gia' bloccata dal grafico aperto
$("tvfull").onclick=()=>{const p=$("tvpannello"),fs=document.fullscreenElement||document.webkitFullscreenElement;
 if(p.classList.contains("pieno"))return schermoPieno();                 // esco dal finto schermo intero
 if(fs){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
 const vero=p.requestFullscreen||p.webkitRequestFullscreen;
 if(!vero)return schermoPieno();                                          // iPhone: niente API -> CSS
 try{const r=vero.call(p);if(r&&r.catch)r.catch(()=>schermoPieno());}catch(e){schermoPieno();}};
document.querySelectorAll("#tviv button").forEach(b=>b.onclick=()=>{TV.iv=b.dataset.iv;document.querySelectorAll("#tviv button").forEach(x=>x.classList.toggle("on",x==b));disegnaTV();});
}catch(e){fail('Grafico',null,e);}

