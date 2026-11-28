/* ---------- SCHEDA LIVE: registro live + comportamento COT ----------
   Due finestre separate e mai mescolate:
     LIVE         = segnali veri, con data e ora di generazione, salvati per sempre con una catena di hash (D.reg)
     COMPORTAMENTO = v8.71 cosa fa il prezzo quando gli speculatori spingono, su tutto lo storico (D.cmp, 12c_comportamento.js);
                    sostituisce il Backtest SIMULATO (tolto). v8.73 aperto a tutti (prima solo per il fondatore, eb-admin).
   Calcoli in cot_radar/motore.py; qui solo la presentazione. Ingresso = prima chiusura dopo il segnale. */
// v7.48 dove = "vol": disegna solo la Volatilita' nella scheda #volat (menu Mercati, dati gia' nella pagina: D.vol);
//       senza argomento: scheda Live con le viste Registro live e Comportamento COT.
function ebVerifica(dove){try{(function(){const solaVol=dove=="vol",el=$(solaVol?"volat":"verifica"),R=D.reg;if(!el)return;
 // finestra, durata del trade (giorni di mercato 1..20 o "fine"), storico usato, strumento (volatilita' e drawdown),
 // unita' del grafico del drawdown ("pct" = in %, "vol" = in settimane tipiche di quel mercato)
 const V={fin:"live",d:5,per:"tutti",asset:"EURUSD",strum:"tutti",unita:"pct"};
 try{const s=JSON.parse(localStorage.getItem("ebVerifica")||"{}");if(s.fin)V.fin=s.fin;if(s.d=="fine"||(s.d>=1&&s.d<=20))V.d=s.d;if(s.per)V.per=s.per;if(s.asset)V.asset=s.asset;
  if(s.strum)V.strum=s.strum;if(s.unita=="vol")V.unita="vol";if(s.sl)V.sl=s.sl;}catch(e){}
 // v8.62 LIVE "A SCREENER" (prima solo per il fondatore): si sceglie lo strumento e si vedono solo i suoi dati.
 //   V.sl = strumento scelto nella Live ("" = nessuno: nessun numero finche' non si sceglie).
 const NUOVA=()=>true;                     // v8.68 aperta a tutti (prima solo il fondatore)
 V.sl=V.sl||"";
 // v8.71 Comportamento COT: prima solo il fondatore. Il Backtest simulato ("bt") non c'e' piu': si torna alla Live
 const CMP=()=>!!(D.cmp&&D.cmp.str&&window.ebComportamento);    // v8.73 per tutti (la scheda Live resta Premium)
 if(solaVol)V.fin="vol";else if(!["live","cmp"].includes(V.fin))V.fin="live";
 const salva=()=>{try{const s=Object.assign({},V);if(solaVol)delete s.fin;            // la scheda Volatilita' non cambia la vista della Verifica
  localStorage.setItem("ebVerifica",JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("ebVerifica")||"{}"),s)));}catch(e){}};
 const pc=(x,d=2)=>x==null||isNaN(x)?"n/d":(x>0?"+":x<0?"−":"")+Math.abs(x).toLocaleString(EB_LOC,{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
 const col=x=>x==null?"":x>0?"up":x<0?"down":"flat";
 const prezzo=p=>{if(p==null)return"n/d";const d=p>=1000?2:p>=100?3:p>=10?3:4;return p.toLocaleString(EB_LOC,{minimumFractionDigits:d,maximumFractionDigits:d});};
 const oraIt=u=>{if(!u)return"";const t=new Date(u.replace("Z",":00Z"));
  return t.toLocaleDateString(EB_LOC,{timeZone:"Europe/Rome",day:"2-digit",month:"2-digit",year:"numeric"})+" ore "+t.toLocaleTimeString(EB_LOC,{timeZone:"Europe/Rome",hour:"2-digit",minute:"2-digit"});};
 const sett=(a,b)=>Math.max(1,Math.round((new Date(b)-new Date(a))/864e5/7));
 const MOT={neutro:"tornato NEUTRO",inversione:"segnale invertito",indebolito:"tornato da forte a normale","12 settimane":"limite di 12 settimane"};

 /* tabellina dei risultati: periodo, risultato, guadagno massimo e drawdown massimo lungo il percorso */
 function cella(t){return t?`<td class="num"><b class="${col(t.res)}">${pc(t.res)}</b></td><td class="num up">${pc(t.mfe)}</td><td class="num down">${pc(t.mae)}</td><td>${t.provvisorio?'<span class="vfic" title="ancora in corso">&#9719;</span>':t.vinto?'<span class="vfok">&#10003;</span>':'<span class="vfko">&#10007;</span>'}</td>`
  :`<td class="num small" colspan="4">in attesa</td>`;}

 /* v6.73 ATTESA DEL PREZZO: i cambi FRED (tassi di mezzogiorno di New York) escono UNA volta a settimana, il lunedi'
    sera, per tutta la settimana prima. Un segnale su una coppia nato dopo il fixing del venerdi' aspetta quindi fino a
    10 giorni il primo prezzo: non e' un errore, lo diciamo chiaramente. Gli altri strumenti hanno prezzi giornalieri. */
 // v6.75: con il ponte Yahoo i cambi non aspettano piu' FRED; resta solo l'attesa della prima chiusura dopo il segnale
 // (segnale nato nel weekend o a mercato aperto: il prezzo d'ingresso e' la chiusura successiva).
 const attesa=(s,m)=>{if(!m.stato||m.stato=="ok")return "prezzo non disponibile";
  const g=new Date(s.generato.replace("Z",":00Z")).getUTCDay();
  return g==0||g==6?"in attesa della chiusura di luned\u00ec (weekend)":"in attesa della prima chiusura dopo il segnale";};
 /* scheda di un segnale nel formato approvato */
 function scheda(s,sim){const m=s.m||{},A=m.A||{},ing=m.ingresso;
  const testa=`<div class="vfh"><span class="pair">${esc(s.strumento)}</span> ${badge(s.etichetta)}${s.iniziale?' <span class="tag" title="Era gia\' attivo quando il registro e\' partito: escluso dalle statistiche">gi&agrave; attivo all\'avvio</span>':''}${s.padre?' <span class="tag" title="Fase forte di un posizionamento gia\' aperto">fase forte</span>':''}${volTag(s.vol)}</div>`;
  let h=`<div class="vfr"><span>Segnale generato</span><b>${esc(s.generato_it)}</b></div>`+
   (ing?`<div class="vfr"><span>Ingresso</span><b>${prezzo(ing.prezzo)} <span class="small">&middot; ${oraIt(ing.utc)}${m.prov_dal&&ing.data>=m.prov_dal?" &middot; provvisorio":""}</span></b></div>`
       :`<div class="vfr"><span>Ingresso</span><span class="small">${esc(attesa(s,m))}</span></div>`);
  if(ing){const f=A.fine,fm=m.fine||{},chiuso=!!(s.chiuso||fm.motivo);
   const nf=f?`${chiuso?"Al cambio":"Finora"}<small class="vfsett">${sett(ing.data,f.data)} sett.</small>`:"Al cambio";
   h+=`<table class="vftab"><tr><th></th><th class="num">Risultato</th><th class="num">Max</th><th class="num">Min</th><th></th></tr>
    <tr><td>1 settimana</td>${cella(A["1s"])}</tr><tr><td>2 settimane</td>${cella(A["2s"])}</tr><tr><td>4 settimane</td>${cella(A["4s"])}</tr>
    <tr class="vffine"><td>${nf}</td>${f?cella(f):'<td class="num small" colspan="4">in attesa del prezzo</td>'}</tr></table>`;
   if(chiuso){const quando=s.chiuso&&fm.motivo!="12 settimane"?s.chiuso.quando_it:(f?fd(f.data):"");
    h+=`<div class="small vfnota">${s.chiuso?"Chiuso il "+esc(quando):"Misura conclusa"} &middot; ${esc(MOT[fm.motivo]||MOT[(s.chiuso||{}).motivo]||"")}</div>`;}
   const b=m.B||{};const bt=b.esito=="eseguito"?`eseguito a ${prezzo(b.limite)} il ${fd(b.data)}`:b.esito=="non eseguito"?`non eseguito (limite ${prezzo(b.limite)})`:b.esito=="in attesa"?`limite a ${prezzo(b.limite)} in attesa`:"n/d";
   h+=`<div class="small vfnota">Ingresso B (ritracciamento): ${bt}</div>`;
   // v6.75: prezzi dei cambi dal ponte Yahoo, sostituiti dai valori ufficiali FRED quando escono (il lunedì)
   if(m.prov_dal)h+=`<div class="small vfnota vfprov">Cambi dal ${fd(m.prov_dal)}: prezzi provvisori, confermati il luned&igrave;.</div>`;}
  else{// v6.51: senza prezzo d'ingresso la scheda ha comunque la STESSA struttura (tabella "in attesa"),
   // cosi' tutte le schede di una riga hanno la stessa altezza e la griglia resta ordinata
   const att='<td class="num small" colspan="4">in attesa</td>';
   h+=`<table class="vftab vfattesa"><tr><th></th><th class="num">Risultato</th><th class="num">Max</th><th class="num">Min</th><th></th></tr>
    <tr><td>1 settimana</td>${att}</tr><tr><td>2 settimane</td>${att}</tr><tr><td>4 settimane</td>${att}</tr>
    <tr class="vffine"><td>${s.chiuso?"Al cambio":"Finora"}</td>${att}</tr></table>${s.chiuso?`<div class="small vfnota">Chiuso il ${esc(s.chiuso.quando_it)} &middot; ${esc(MOT[s.chiuso.motivo]||"")}</div>`:""}<div class="small vfnota">Ingresso B (ritracciamento): ${esc(attesa(s,m))}</div>`;}
  return `<div class="card vfcard${sim?" vfsim":""}">${testa}<div class="vfrighe">${h}</div></div>`;}

 /* ---- VOLATILITA' PER ASSET (D.vol, calcolata da cot_radar/volatilita.py) ----
    La "natura" di ogni mercato: quanto si muove per giorno della settimana, per settimana, per mese del
    calendario e anno per anno, e in che regime e' adesso. Volatilita' da chiusura a chiusura (FRED). */
 const VCOL={calma:"var(--c1)",normale:"var(--warn)",agitata:"var(--ss)"};
 const fp=(x,d=2)=>x==null?"n/d":x.toLocaleString(EB_LOC,{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
 const volTag=v=>v?` <span class="tag vfvtag" style="--vc:${VCOL[v.nome]}" title="Volatilita' delle 4 settimane prima del segnale (${fp(v.vol,1)} annua) rispetto agli ultimi 5 anni">vol. ${v.nome} &middot; ${v.pct}&deg;</span>`:"";
 /* barre verticali semplici: items = [{et, v, v2?, evid?, tit?}]; v2 = seconda serie (ultimo anno) */
 function barre(items,dec,cls){const mx=Math.max(1e-9,...items.flatMap(x=>[x.v||0,x.v2||0]));
  return `<div class="vfbarre ${cls||""}">${items.map(x=>`<div class="vfb${x.evid?" evid":""}" title="${esc(x.tit||x.et+": "+fp(x.v,dec)+(x.v2!=null?" (ultimo anno "+fp(x.v2,dec)+")":""))}">
   <div class="vfbcol"><i style="height:${Math.round((x.v||0)/mx*100)}%"></i>${x.v2!=null?`<i class="b2" style="height:${Math.round(x.v2/mx*100)}%"></i>`:""}</div>
   ${cls=="fitte"?"":`<em>${fp(x.v,dec)}</em>`}<span>${esc(x.et)}</span></div>`).join("")}</div>`;}
 function datiVol(){const P=(D.vol||{})[V.asset];if(!P)return `<div class="card vfvuoto">Volatilit&agrave; non disponibile per questo strumento.</div>`;
  const R=P.regime,S=P.settimane,o=P.oggi,mOra=oggiRoma().m,aOra=String(oggiRoma().a);
  const MESI=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
  const reg=R?`<div class="card vfregime" style="--vc:${VCOL[R.nome]}"><div><h3>Regime di adesso</h3><div class="big" style="color:var(--vc)">${R.nome.toUpperCase()}</div>
   <div class="note">ultime 4 settimane: <b>${fp(R.vol,1)}</b> di volatilit&agrave; annua, pi&ugrave; alta del <b>${R.pct}%</b> dei periodi degli ultimi 5 anni${R.prev!=null?` &middot; stima prossimo mese <span class="vfprev"><b>${fp(R.prev,1)}</b> <details class="info"><summary title="Come si stima" aria-label="Come si stima">i</summary><div>Stima EWMA: i giorni recenti pesano di pi&ugrave; (ieri 6%, poi a scalare). Nelle nostre prove prevede la volatilit&agrave; del mese dopo meglio della media semplice. &Egrave; una stima, non una certezza.</div></details></span>`:""}</div></div>
   <div class="vfpct"><div class="vfpbar"><i style="left:${R.pct}%"></i></div><div class="scale"><span>calma</span><span>normale</span><span>agitata</span></div></div></div>`:"";
  // movimento in PUNTI sull'ultimo prezzo: pip per i cambi (0,01 se la quotata e' lo yen), punti indice, dollari
  const u=/^[A-Z]{6}$/.test(V.asset)?["pip",V.asset.endsWith("JPY")?0.01:0.0001]:["SP500","NASDAQ","DOW"].includes(V.asset)?["punti",1]:["$",1];
  const inPt=x=>x!=null&&P.prezzo?" &middot; &asymp; "+fmtPt(x/100*P.prezzo/u[1],u[0]):"";
  const rng=S.media_anno!=null?S.media_anno*2:null;   // range tipico STIMATO: circa il doppio della mossa chiusura-chiusura
  return reg+`<h3 class="vft">Quanto si muove <span class="small">(Settimana media e P90 sono misurate DA CHIUSURA A CHIUSURA: quanto il prezzo si &egrave; spostato da un venerd&igrave; all'altro, in valore assoluto. Non sono il RANGE della candela (massimo &minus; minimo, stoppini compresi), che &egrave; sempre pi&ugrave; ampio: in media circa il doppio, per questo la scheda mostra anche un range tipico STIMATO. Il range vero richiede massimi e minimi (dati OHLC), che i soli prezzi di chiusura non hanno. Prezzi: per i cambi &egrave; il fixing delle 12 di New York (18 in Italia), mentre il broker chiude alle 17 di New York (23 in Italia), e i cambi FRED possono arrivare con circa una settimana di ritardo: l'ultimo dato usato qui &egrave; del <b>${fd(P.al)}</b>, controlla che sia la stessa settimana che guardi sul grafico. Per verificare su TradingView: grafico settimanale, misura da chiusura a chiusura (corpo contro corpo) delle ultime 52 settimane e fai la media senza segno; per il range usa l'ATR(14) settimanale, da confrontare con il range stimato. I pip sono calcolati sull'ultimo prezzo disponibile)</span></h3>
   <div class="grid k4 vfkpi">
   ${kcard("vki1","Volatilit&agrave; annua",fp(P.ann_anno,1),"storia "+fp(P.ann_storia,1),`Quanto oscilla il prezzo in un anno, nell'ultimo anno: deviazione standard dei rendimenti giornalieri &times; &radic;252, da chiusura a chiusura. "Storia" = la stessa misura su tutto l'archivio, dal ${fd(P.dal)}.`)}
   ${kcard("vki2","Settimana media",fp(S.media_anno),[inPt(S.media_anno).replace(" &middot; ",""),"range &asymp; "+fp(rng)].filter(Boolean).join(" &middot; "),`Media dell'ultimo anno della variazione da una chiusura settimanale alla successiva, in valore assoluto${inPt(S.media_anno)} (storia: ${fp(S.media)}). Il <b>range</b> della candela (massimo &minus; minimo) &egrave; stimato a circa il doppio: ${fp(rng)}${inPt(rng)}. Il range vero richiede massimi e minimi, non disponibili con i soli prezzi di chiusura.`)}
   ${kcard("vki3","Settimana P90",fp(S.brutta),[inPt(S.brutta).replace(" &middot; ",""),"ultima "+fp(S.ultima)].filter(Boolean).join(" &middot; "),`1 settimana su 10 si muove pi&ugrave; di cos&igrave; (90&deg; percentile, da chiusura a chiusura)${inPt(S.brutta)}. L'ultima settimana disponibile, al ${fd(P.al)}, si &egrave; mossa dello ${fp(S.ultima)}.`)}
   ${kcard("vki4","Ultima seduta",fp(o.mossa,2),fd(o.data)+" &middot; media "+fp(o.media_giorno),`Movimento dell'ultima seduta disponibile (${fd(o.data)}), da chiusura a chiusura${inPt(o.mossa)}, contro la media storica dello stesso giorno della settimana (${fp(o.media_giorno)}).`)}</div>
   <h3 class="vft">Giorno per giorno <span class="small">(movimento medio per giorno della settimana: colonna piena = storia, chiara = ultimo anno)</span></h3>
   <div class="card">${barre(P.giorni.map(g=>({et:g.g,v:g.storia,v2:g.anno})),2)}</div>
   <h3 class="vft">Mese per mese <span class="small">(volatilit&agrave; annua media in quel mese del calendario, dal ${fd(P.dal)})</span></h3>
   <div class="card">${barre(P.mesi.map((v,i)=>({et:MESI[i],v:v,evid:i==mOra})),1)}</div>
   <h3 class="vft">Anno per anno <span class="small">(volatilit&agrave; annua di ogni anno; l'anno in corso &egrave; parziale)</span></h3>
   <div class="card">${barre(Object.entries(P.anni).map(([a,v])=>({et:a.slice(2),v:v,evid:a==aOra,tit:a+": "+fp(v,1)+(a==aOra?" (in corso)":"")})),1,"fitte")}</div>
   <p class="small">Volatilit&agrave; misurata da chiusura a chiusura (un prezzo al giorno): il range vero della giornata (massimo &minus; minimo) pu&ograve; essere pi&ugrave; ampio. Movimenti giornalieri e settimanali = media del valore assoluto della variazione; volatilit&agrave; annua = deviazione standard dei rendimenti giornalieri &times; &radic;252.</p>`;}
 function volatilitaVista(){const ks=Object.keys(D.vol||{});if(!ks.length)return `<div class="card vfvuoto">Volatilit&agrave; non disponibile in questo aggiornamento.</div>`;
  if(!ks.includes(V.asset))V.asset=ks.includes("EURUSD")?"EURUSD":ks[0];
  const coppie=ks.filter(k=>/^[A-Z]{6}$/.test(k)).sort(),altri=ks.filter(k=>!/^[A-Z]{6}$/.test(k)).sort();
  const opt=l=>l.map(k=>`<option value="${k}"${k==V.asset?" selected":""}>${k}${D.vol[k].regime?" · "+D.vol[k].regime.nome:""}</option>`).join("");
  return `<div class="card vfcomandi"><div class="vfriga"><span class="vfetich">Strumento</span><select id="vfasset" class="vfsel"><optgroup label="Cambi">${opt(coppie)}</optgroup><optgroup label="Indici, energia, crypto">${opt(altri)}</optgroup></select></div></div><div id="vfdati">${datiVol()}</div>`;}
 /* ---- ORIZZONTE DI USCITA scelto da chi guarda ----
    Uno speculatore chiude in settimana (5 sedute), un investitore tiene 4 settimane (20 sedute):
    V.d = giorni di mercato dopo l'ingresso (1..20) oppure "fine" (= fino al cambio di segnale).
    I dati arrivano compatti da Python (motore.giorni_stat): per ogni seduta [segnali, vinti, somme di
    risultato, guadagno massimo e drawdown massimo]. Qui si calcolano medie, % vinti e intervallo di Wilson. */
 function wilson(k,n){if(!n)return null;const z=1.96,p=k/n,den=1+z*z/n,c=(p+z*z/(2*n))/den,m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
  return [Math.round(100*Math.max(0,c-m)),Math.round(100*Math.min(1,c+m))];}
 function st(R){if(!R)return null;
  if(V.d=="fine")return R.fine||null;
  const a=(R.g||[])[V.d-1];if(!a||!a[0])return null;
  const n=a[0],v=a[1],mfe=a[3]/n,mae=a[4]/n;
  return {n:n,vinti:v,hit:Math.round(100*v/n),ic:wilson(v,n),resa:a[2]/n,mfe:mfe,mae:mae,rapporto:mae<0?Math.round(100*mfe/Math.abs(mae))/100:null};}
 /* ---- DURATA DEL TRADE in parole: 13 -> "2 settimane e 3 giorni" (giorni di mercato: 5 a settimana) ---- */
 const durata=d=>{if(d=="fine")return "al cambio segnale";const w=Math.floor(d/5),g=d%5,
  S=w?w+(w==1?" settimana":" settimane"):"",G=g?g+(g==1?" giorno":" giorni"):"";return S&&G?S+" e "+G:S||G;};
 const nomeD=()=>V.d=="fine"?"fino al cambio di segnale":"dopo "+durata(V.d);

 /* ---- STUDIO DEL DRAWDOWN (calcolato in cot_radar/motore.py, funzione drawdown) ----
    Obiettivo: quanto il trade va contro prima di andare (o non andare) dove deve, rispetto alla volatilita'
    di quel mercato e al guadagno. Per ogni durata (1..20 giorni + "al cambio segnale") Python manda una riga
    compatta; i nomi dei campi sono nella lista dd_campi (spiegati in motore.DD_CAMPI). */
 function ddGruppo(F){const g=F&&F.dd;if(!g)return null;return V.strum=="tutti"?g.tutti:(g.strumento||{})[V.strum]||null;}
 function ddRiga(lista,campi,d){d=d??V.d;const r=lista&&lista[d=="fine"?20:d-1];if(!r||!campi)return null;
  const o={};campi.forEach((k,i)=>o[k]=r[i]);return o.n?o:null;}
 // punti: pip senza decimali, punti indice e dollari con i decimali che servono
 const fmtPt=(x,u)=>{const dec=u=="pip"?0:x<10?2:x<100?1:0;return x.toLocaleString(EB_LOC,{minimumFractionDigits:dec,maximumFractionDigits:dec})+(u=="$"?" $":" "+u);};
 const vx=x=>x==null?"n/d":x.toLocaleString(EB_LOC,{minimumFractionDigits:1,maximumFractionDigits:1})+"&times;";

 /* quattro riquadri: drawdown assoluto mediano e P90, in volatilita', guadagno contro drawdown (+ esito in piccolo) */
 function kpiDD(o,u){
  if(!o)return `<div class="card vfvuoto small">Nessun trade ${V.strum=="tutti"?"":"su "+esc(V.strum)+" "}con questa durata gi&agrave; concluso in questo storico.</div>`;
  const ptb=x=>u&&x!=null?"&asymp; "+fmtPt(x,u):"";
  return `<div class="grid k4 vfkpi">
   ${kcard("dki1","Drawdown assoluto mediano",pc(o.mae50),ptb(o.p50)||"mediana",`Quanto il trade va contro dall'ingresso fino alla durata scelta: la <b>met&agrave;</b> dei trade va contro meno di cos&igrave; (mediana del drawdown massimo)${u&&o.p50!=null?", cio&egrave; circa "+fmtPt(o.p50,u)+" sul prezzo d'ingresso":""}.`,"down")}
   ${kcard("dki2","Drawdown assoluto P90",pc(o.mae90),ptb(o.p90)||"1 trade su 10",`<b>1 trade su 10</b> va contro di pi&ugrave;${u&&o.p90!=null?" (circa "+fmtPt(o.p90,u)+")":""}. &Egrave; il numero da guardare per lo stop: uno stop pi&ugrave; stretto viene preso da almeno un trade su 10 anche quando l'idea era giusta.`,"down")}
   ${kcard("dki3","In volatilit&agrave;",vx(o.v50),"P90 "+vx(o.v90),`Il drawdown diviso il movimento di una settimana normale di quel mercato, misurato prima dell'ingresso. 1&times; = una settimana normale. Cos&igrave; EURUSD, petrolio e Bitcoin si confrontano sulla stessa scala. Mediano ${vx(o.v50)}, P90 (1 trade su 10) ${vx(o.v90)}.`)}
   ${kcard("dki4","Guadagno / drawdown",`<span class="up">${pc(o.mfe50)}</span> / <span class="down">${pc(o.mae50)}</span>`,o.prima!=null?"guadagno prima nel "+o.prima+"%":"mediane",`Guadagno massimo tipico e drawdown mediano (mediane). ${o.prima!=null?"Il guadagno massimo arriva prima del drawdown massimo nel <b>"+o.prima+"%</b> dei trade. ":""}${o.gmin?"Il punto peggiore arriva di solito al <b>"+Math.round(o.gmin)+"&deg; giorno</b> di mercato.":""}`,"vfgd")}</div>
   <p class="small vfesito">Esito, per completezza: <b>${o.hit}%</b> dei trade chiusi in guadagno &middot; resa media <b class="${col(o.resa)}">${pc(o.resa)}</b> al netto dei costi &middot; ${o.n.toLocaleString(EB_LOC)} trade misurati.</p>`;}

 /* GRAFICO GIORNO PER GIORNO (v7.97, rifatto da zero, stile "app di trading"):
    - curve morbide senza griglia: VERDE sopra lo zero = guadagno massimo tipico, ROSSO sotto = drawdown tipico,
      BIANCO spesso = risultato tipico (tutte mediane dei trade arrivati a quel giorno);
    - i NUMERI GRANDI in alto seguono il mouse o il dito: giorno, risultato, guadagno max, drawdown e "1 su 10"
      (P90, solo se quel giorno ha almeno P90_MIN trade: con pochi trade sarebbe solo il trade peggiore);
    - senza mouse i numeri mostrano l'ultimo giorno; scala automatica, niente pulsanti di zoom;
    - durata visibile: 1 / 2 / 4 settimane (mai oltre l'ultimo giorno con dati).
    Le curve usano una spline "monotona": passano per i punti senza inventare picchi tra un giorno e l'altro. */
 const P90_MIN=20,GG={};          // GG = stato del grafico: punti, unita', giorni visibili, giorno evidenziato
 function graficoDD(lista,campi){const rows=[];for(let d=1;d<=20;d++){const o=ddRiga(lista,campi,d);if(o)rows.push(Object.assign({d:d},o));}
  if(rows.length<2)return "";
  const vol=V.unita=="vol";
  GG.pts=rows.map(o=>vol?{d:o.d,n:o.n,mx:o.fv50??0,r:o.rv50??0,mn:-(o.v50??0),mb:o.n>=P90_MIN?-(o.v90??0):null}
                        :{d:o.d,n:o.n,mx:o.mfe50,r:o.res50,mn:o.mae50,mb:o.n>=P90_MIN?o.mae90:null});
  GG.vol=vol;GG.giorni=GG.giorni||20;
  const maxD=GG.pts[GG.pts.length-1].d;
  setTimeout(disegnaGraf,0);
  return `<div class="card vfgraf" id="vfgraf"><div class="vfgtesta"><b>Giorno per giorno <button type="button" class="info" data-apri="vfgrinfo" data-k="vfgraf" aria-label="Mostra o nascondi la spiegazione">i</button></b>
    <div class="vfgcomandi"><div class="vfseg vfgx">${[[5,"1 sett."],[10,"2 sett."],[20,"4 sett."]].map(([g,t])=>`<button data-gx="${g}" class="${GG.giorni==g?"on":""}"${g>5&&maxD<=g/2?" disabled":""}>${t}</button>`).join("")}</div>
    <div class="vfseg vfunita"><button data-u="pct" class="${vol?"":"on"}">in %</button><button data-u="vol" class="${vol?"on":""}">in volatilit&agrave;</button></div></div></div>
   <p id="vfgrinfo" class="sub infotesto${infoAperte.has("vfgraf")?" aperta":""}">Per ogni giorno dopo l'ingresso: <b>verde</b> = quanto sale al massimo un trade tipico, <b>rosso</b> = quanto va contro, <b>bianco</b> = come sta andando (mediane). <b>1 su 10</b> = il drawdown superato solo da un trade su dieci: compare con almeno ${P90_MIN} trade per giorno. Scorri sul grafico con il mouse o il dito per leggere ogni giorno.</p>
   <div class="vfgkpi" aria-live="polite"></div>
   <div class="vfgarea"><svg class="vfgsvg" role="img" aria-label="Guadagno, drawdown e risultato giorno per giorno"></svg></div></div>`;}

 // curva morbida che passa per i punti senza superarli (spline monotona di Fritsch-Carlson)
 function curva(P){const n=P.length;if(n<2)return "";if(n==2)return `M${P[0][0]},${P[0][1]}L${P[1][0]},${P[1][1]}`;
  const dx=[],m=[],s=[];for(let i=0;i<n-1;i++){dx[i]=P[i+1][0]-P[i][0];s[i]=(P[i+1][1]-P[i][1])/dx[i];}
  m[0]=s[0];m[n-1]=s[n-2];for(let i=1;i<n-1;i++)m[i]=s[i-1]*s[i]<=0?0:(s[i-1]+s[i])/2;
  for(let i=0;i<n-1;i++){if(s[i]==0){m[i]=m[i+1]=0;continue;}const a=m[i]/s[i],b=m[i+1]/s[i],h=a*a+b*b;if(h>9){const k=3/Math.sqrt(h);m[i]=k*a*s[i];m[i+1]=k*b*s[i];}}
  let d=`M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for(let i=0;i<n-1;i++){const c=dx[i]/3;d+=`C${(P[i][0]+c).toFixed(1)},${(P[i][1]+m[i]*c).toFixed(1)} ${(P[i+1][0]-c).toFixed(1)},${(P[i+1][1]-m[i+1]*c).toFixed(1)} ${P[i+1][0].toFixed(1)},${P[i+1][1].toFixed(1)}`;}
  return d;}

 function disegnaGraf(){const box=document.getElementById("vfgraf");if(!box||!GG.pts)return;
  const svg=box.querySelector(".vfgsvg"),kpi=box.querySelector(".vfgkpi"),W=Math.max(280,Math.round(svg.getBoundingClientRect().width||box.clientWidth-32));
  const mob=W<600,H=mob?210:260,L=6,R=mob?44:52,T=14,B=26,vol=GG.vol;
  const ultimo=GG.pts[GG.pts.length-1].d,fine=Math.max(2,Math.min(GG.giorni,ultimo)),pts=[{d:0,n:0,mx:0,r:0,mn:0,mb:null}].concat(GG.pts.filter(p=>p.d<=fine));
  const vals=pts.flatMap(p=>[p.mx,p.r,p.mn]).filter(v=>v!=null);
  let lo=Math.min(0,...vals),hi=Math.max(0,...vals);const pad=(hi-lo||1)*0.1;lo-=pad;hi+=pad;
  const X=d=>L+d/fine*(W-L-R),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B),z=Y(0);
  const P=k=>pts.map(p=>[X(p.d),Y(p[k])]);
  const area=k=>`${curva(P(k))}L${X(fine).toFixed(1)},${z.toFixed(1)}L${X(0).toFixed(1)},${z.toFixed(1)}Z`;
  const f=(v,dec=2)=>v==null?"n/d":(v>0?"+":v<0?"&minus;":"")+Math.abs(v).toLocaleString(EB_LOC,{minimumFractionDigits:dec,maximumFractionDigits:dec})+(vol?"&times;":"%");
  const xt=[0].concat([5,10,15,20].filter(d=>d<fine)).concat(fine>2?[fine]:[]);
  const xe=d=>d==0?"ingresso":d%5==0?d/5+(d==5?" sett.":" sett."):d+" g";
  // etichette di scala a destra: massimo, zero, minimo (bastano per orientarsi)
  const scala=[hi-pad,0,lo+pad].filter((v,i,a)=>i==1||Math.abs(v)>(hi-lo)*0.12);
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.style.height=H+"px";
  svg.innerHTML=`<defs><linearGradient id="vfgv" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--b)" stop-opacity=".42"/><stop offset="1" stop-color="var(--b)" stop-opacity="0"/></linearGradient>
    <linearGradient id="vfgr" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="var(--s)" stop-opacity=".42"/><stop offset="1" stop-color="var(--s)" stop-opacity="0"/></linearGradient>
    <filter id="vfgalo" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="4"/></filter></defs>
   <path d="${area("mx")}" fill="url(#vfgv)"/><path d="${area("mn")}" fill="url(#vfgr)"/>
   <line x1="${L}" x2="${W-R}" y1="${z.toFixed(1)}" y2="${z.toFixed(1)}" class="vfg0"/>
   <path d="${curva(P("mx"))}" class="vfgln" stroke="var(--b)"/><path d="${curva(P("mn"))}" class="vfgln" stroke="var(--s)"/>
   <path d="${curva(P("r"))}" class="vfgalo" filter="url(#vfgalo)"/><path d="${curva(P("r"))}" class="vfgln vfgris"/>
   ${scala.map(v=>`<text x="${W-R+8}" y="${(Y(v)+4).toFixed(1)}" class="vfax">${f(v,v==0?0:1)}</text>`).join("")}
   ${xt.map(d=>`<text x="${X(d).toFixed(1)}" y="${H-7}" text-anchor="${d==0?"start":d==fine?"end":"middle"}" class="vfax">${xe(d)}</text>`).join("")}
   <line class="vfgcur" y1="${T-6}" y2="${H-B}" x1="-10" x2="-10"/><circle class="vfgpunto" r="6.5" cx="-20" cy="-20"/>
   <rect x="${L}" y="0" width="${W-L-R}" height="${H-B}" fill="transparent" class="vfghit"/>`;
  // numeri grandi in alto: il giorno sotto il mouse/dito, altrimenti l'ultimo
  const cur=svg.querySelector(".vfgcur"),pu=svg.querySelector(".vfgpunto"),hit=svg.querySelector(".vfghit");
  const leggi=p=>{kpi.innerHTML=`<div class="vfgk1"><small>${p.d%5==0?p.d/5+(p.d==5?" settimana":" settimane"):"Giorno "+p.d} &middot; risultato</small><b class="${p.r>=0?"su":"giu"}">${f(p.r)}</b></div>
    <div><small>Guadagno max</small><em class="su">${f(p.mx)}</em></div><div><small>Drawdown</small><em class="giu">${f(p.mn)}</em></div>
    <div><small>1 su 10</small>${p.mb!=null?`<em class="giu tenue">fino a ${f(p.mb)}</em>`:`<em class="muto">pochi trade</em>`}</div><div class="vfgn"><small>Trade</small><em>${p.n.toLocaleString(EB_LOC)}</em></div>`;};
  const vero=pts.slice(1),ris=svg.querySelector(".vfgris"),lung=ris.getTotalLength();
  // y della linea bianca in un punto x qualsiasi (ricerca sulla curva): il pallino scorre liscio, non a scatti
  const ySu=x=>{let a=0,b=lung;for(let i=0;i<14;i++){const m=(a+b)/2;if(ris.getPointAtLength(m).x<x)a=m;else b=m;}return ris.getPointAtLength((a+b)/2).y;};
  let giorno=null,attesa=0;
  // la linea verticale segue il mouse/dito in modo continuo; i numeri in alto sono quelli del giorno piu' vicino
  const mostra=ev=>{const cx=ev.touches?ev.touches[0].clientX:ev.clientX;if(attesa)cancelAnimationFrame(attesa);
   attesa=requestAnimationFrame(()=>{attesa=0;const r=svg.getBoundingClientRect(),x=Math.max(X(0),Math.min(X(fine),(cx-r.left)*W/r.width));
    const p=vero.reduce((a,q)=>Math.abs(X(q.d)-x)<Math.abs(X(a.d)-x)?q:a,vero[0]);
    cur.setAttribute("x1",x);cur.setAttribute("x2",x);pu.setAttribute("cx",x);pu.setAttribute("cy",ySu(x));
    if(p!=giorno){giorno=p;leggi(p);}});};
  const riposo=()=>{if(attesa){cancelAnimationFrame(attesa);attesa=0;}const p=vero[vero.length-1];giorno=p;cur.setAttribute("x1",-10);cur.setAttribute("x2",-10);pu.setAttribute("cx",X(p.d));pu.setAttribute("cy",Y(p.r));leggi(p);};
  riposo();
  hit.onmousemove=mostra;hit.onmouseleave=riposo;hit.ontouchstart=hit.ontouchmove=e=>{mostra(e);};hit.ontouchend=()=>setTimeout(riposo,1800);
  // v7.99 si ridisegna SOLO se cambia la larghezza del riquadro. Prima l'osservatore veniva riagganciato a ogni
  // disegno e ripartiva da solo ogni 80 ms: il grafico si rifaceva di continuo e la linea sotto il mouse sfarfallava.
  GG.w=box.clientWidth;
  if(!GG.ro)GG.ro=new ResizeObserver(()=>{const b=document.getElementById("vfgraf");if(!b||b.clientWidth==GG.w)return;clearTimeout(GG.rt);GG.rt=setTimeout(disegnaGraf,80);});
  if(GG.box!=box){GG.ro.disconnect();GG.ro.observe(box);GG.box=box;}}
 // Copia dell'impronta del registro (nella (i) dello stato)
 document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".vfcopia");if(!b)return;
  try{navigator.clipboard.writeText(b.dataset.hash).then(()=>{b.textContent="Copiata";setTimeout(()=>b.textContent="Copia",1600);});}catch(_){}});
 // durata visibile: ridisegna solo il grafico (la pagina resta ferma)
 document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#vfgraf [data-gx]");if(!b||b.disabled)return;
  GG.giorni=+b.dataset.gx;document.querySelectorAll("#vfgraf [data-gx]").forEach(x=>x.classList.toggle("on",x==b));disegnaGraf();});

 /* FASCE: quanti trade sono andati contro meno di mezza settimana tipica, tra mezza e una, tra una e due, oltre */
 function fasce(o){if(!o||o.h1==null)return "";
  const f=[["sotto 0,5&times; (rumore di mercato)",o.h1,"var(--b)"],["da 0,5&times; a 1&times;",o.h2,"var(--warn)"],["da 1&times; a 2&times;",o.h3,"var(--s)"],["oltre 2&times; (movimento direzionale contro)",o.h4,"var(--ss)"]];
  return `<h3 class="vft">Distribuzione del drawdown in volatilit&agrave; <span class="small">(drawdown massimo ${nomeD()}, in multipli del movimento settimanale mediano di quel mercato, misurato prima dell'ingresso: 1&times; = una settimana normale. Sotto 0,5&times; &egrave; rumore di mercato, oltre 2&times; &egrave; un movimento direzionale contro il trade)</span></h3>
  <div class="card vffasce">${f.map(([t,v,c])=>`<div class="vffascia"><span>${t}</span><div class="vfbar"><i style="width:${v}%;background:${c}"></i></div><b>${v}%</b></div>`).join("")}</div>`;}

 /* ANNUNCI MACRO USA: il drawdown e' piu' grande quando c'e' un annuncio? Il giorno peggiore cade sugli annunci? */
 function annunci(o){const tit=`<h3 class="vft">Annunci macro USA <span class="small">(occupazione NFP e inflazione CPI dal 1985, decisioni della Fed dal 1994, date ufficiali. Un giorno "con annuncio" &egrave; una seduta la cui chiusura arriva dopo l'annuncio: per i cambi, chiusi alle 12 di New York, la Fed delle 14 conta il giorno dopo. Con i soli prezzi di chiusura il picco dentro la giornata non si vede. BCE non inclusa)</span></h3>`;
  if(V.d=="fine")return tit+`<p class="small">Disponibile per le durate da 1 giorno a 4 settimane: serve il percorso giorno per giorno.</p>`;
  if(!o||o.pg==null)return tit+`<p class="small">Dati non disponibili per questa scelta.</p>`;
  const conf=o.ev_n>=30&&o.no_n>=30,pochi=o.n<60,dd=o.pg-o.pa;
  const giud=pochi?["troppo pochi trade per un giudizio",""]:dd>=5?["pi&ugrave; del caso: gli annunci pesano sul drawdown","down"]:dd<=-5?["meno del caso",""]:["in linea con il caso: il drawdown non viene soprattutto dagli annunci",""];
  return tit+`<div class="grid k2 vfann">
   <div class="card kpi"><h3>Drawdown con e senza annunci</h3>${conf?`<div class="vfrighe"><div class="vfr"><span>con almeno un annuncio nel trade</span><b class="down">${pc(o.ev50)}</b></div><div class="vfr"><span>senza annunci</span><b class="down">${pc(o.no50)}</b></div></div><div class="note">drawdown mediano &middot; ${o.ev_n.toLocaleString(EB_LOC)} trade con annunci, ${o.no_n.toLocaleString(EB_LOC)} senza</div>`
    :`<div class="note">Con questa durata quasi ogni trade contiene un annuncio (solo ${o.no_n} senza): il confronto non &egrave; affidabile. Prova una durata pi&ugrave; breve.</div>`}</div>
   <div class="card kpi"><h3>Il giorno peggiore del trade</h3><div class="big">${o.pg}%</div><div class="note">cade su un giorno con annuncio; per puro caso sarebbe il <b>${o.pa}%</b> &rarr; <span class="${giud[1]}">${giud[0]}</span></div></div></div>`;}

 /* blocco completo del drawdown per la finestra scelta (live o backtest): F = statistiche, campi = nomi dei campi */
 function bloccoDD(F,campi,unitaPunti){const lista=ddGruppo(F),o=ddRiga(lista,campi),u=V.strum=="tutti"?null:(unitaPunti||{})[V.strum];
  return `<h3 class="vft">Drawdown assoluto del trade <span class="small">(quanto il trade va contro dall'ingresso. Assoluto = misurato dal prezzo d'ingresso, non dal massimo raggiunto. Mediano = la met&agrave; dei trade va contro meno di cos&igrave;; P90 (90&deg; percentile) = 1 trade su 10 va contro di pi&ugrave;. In volatilit&agrave; = drawdown diviso il movimento di una settimana normale di quel mercato, misurato prima dell'ingresso: cos&igrave; mercati diversi si confrontano. ${u?"Punti = drawdown in "+(u=="$"?"dollari":u)+" sul prezzo d'ingresso di ogni trade.":"Scegli uno strumento per vedere anche i punti (pip, punti indice, dollari)."})</span></h3>
  <p class="small vfcontesto">Durata <b>${durata(V.d)}</b> &middot; ${V.strum=="tutti"?"tutti gli strumenti":"<b>"+esc(V.strum)+"</b>"}${V.fin=="bt"?" &middot; storico: "+{tutti:"tutto",sviluppo:"sviluppo",holdout:"holdout (ultimi 2 anni)"}[V.per]:""}</p>`+
  kpiDD(o,u)+graficoDD(lista,campi)+fasce(o)+annunci(o);}

 /* tabella per gruppo (etichetta, volatilita', periodo, strumento): gr = {nome: riassunto} */
 /* v7.75 ALLINEAMENTO: tutte le tabelle di questa scheda usano le STESSE larghezze di colonna (colgroup + table-layout
    fixed in stile.css, classe .vfcol): "Segnali", "Vinti", "Resa media"... cadono sulla stessa verticale da una tabella
    all'altra. Prima ogni tabella si allargava in base al proprio testo e le colonne erano sfalsate.
    La tabella "Per strumento" ha 3 colonne in piu' (prof) e quindi le sue larghezze (.vfcolp). */
 function tabella(titolo,gr,ordine,min,prof){const ks=(ordine||Object.keys(gr||{})).filter(k=>gr&&gr[k]&&st(gr[k])&&st(gr[k]).n>=(min||1));
  if(!ks.length)return "";
  return `<h3 class="vft">${titolo}</h3><div class="tablewrap"><table class="compatta vfcol${prof?" vfcolp":""}"><colgroup>${(prof?[19,8,6,9,8,9,9,7,8,9,8]:[22,9,8,12,11,15,15,8]).map(w=>`<col style="width:${w}%">`).join("")}</colgroup><tr><th></th><th class="num">Segnali</th><th class="num">Vinti</th><th class="num">Probabile tra</th><th class="num">Resa media</th><th class="num" title="Media dei guadagni massimi (le schede in alto usano invece la mediana)">Guadagno max medio</th><th class="num" title="Media dei drawdown massimi (le schede in alto usano invece la mediana: i casi estremi pesano meno)">Drawdown max medio</th><th class="num">Rapporto</th>${prof?`<th class="num" title="Volatilita' annua dell'ultimo anno">Volatilit&agrave; annua</th><th class="num" title="Movimento tipico in una settimana (mediana), ultimo anno">Mossa tipica sett.</th><th class="num" title="Drawdown medio diviso la mossa settimanale tipica: sotto 1 = drawdown nella norma per quel mercato, sopra 1 = il segnale soffre piu' del normale rumore">Drawdown / mossa</th>`:""}</tr>
   ${ks.map(k=>{const x=st(gr[k]),p=prof&&prof[k];return `<tr><td><b>${esc(eti(k))}</b></td><td class="num">${x.n.toLocaleString(EB_LOC)}</td><td class="num"><b>${x.hit}%</b></td><td class="num small">${x.ic[0]}&ndash;${x.ic[1]}%</td><td class="num ${col(x.resa)}">${pc(x.resa)}</td><td class="num up">${pc(x.mfe)}</td><td class="num down">${pc(x.mae)}</td><td class="num">${x.rapporto==null?"n/d":x.rapporto.toLocaleString(EB_LOC)}</td>${prof?(p?`<td class="num">${fx(p.ann,1)}%</td><td class="num">${fx(p.sett,2)}%</td><td class="num ${Math.abs(x.mae)/p.sett>1.5?"down":""}">${fx(Math.abs(x.mae)/p.sett,2)}&times;</td>`:'<td class="num small" colspan="3">n/d</td>'):""}</tr>`;}).join("")}</table></div>${prof?`<p class="small">Drawdown e volatilit&agrave; raccontano la <b>natura del mercato</b>: lo stesso drawdown del 2% &egrave; tanto su un cambio che si muove dell'1% a settimana e poco su un mercato che si muove dell'8%. "Drawdown / mossa" sopra 1,5 = il segnale soffre pi&ugrave; del normale rumore di quello strumento.</p>`:""}`;}

 /* confronto dei tre modi di entrare: calcolato a 1, 2 e 4 settimane (5, 10, 20 sedute) */
 function varianti(R){const h={5:"1s",10:"2s",20:"4s"}[V.d],x=h&&R&&R.var&&R.var[h];
  if(!x)return `<h3 class="vft">Tre modi di entrare</h3><p class="small">Il confronto tra ingresso subito, ritracciamento e met&agrave; e met&agrave; &egrave; calcolato a 1, 2 e 4 settimane: scegli 5, 10 o 20 sedute per vederlo.</p>`;
  return `<h3 class="vft">Tre modi di entrare <span class="small">(valore medio per segnale, ${nomeD()})</span></h3><div class="grid k3 vfvar">
   <div class="card"><b>A &middot; subito</b><div class="big ${col(x.resa)}">${pc(x.resa)}</div><div class="small">alla prima chiusura dopo il segnale</div></div>
   <div class="card"><b>B &middot; ritracciamento</b><div class="big ${col(x.B.valore)}">${pc(x.B.valore)}</div><div class="small">ordine limite a 0,5&times; il movimento settimanale tipico, valido 5 giorni: eseguito ${x.B.fill==null?"n/d":x.B.fill+"%"} delle volte${x.B.resa_eseguiti!=null?`, resa quando eseguito ${pc(x.B.resa_eseguiti)}`:""}</div></div>
   <div class="card"><b>C &middot; met&agrave; e met&agrave;</b><div class="big ${col(x.C.valore)}">${pc(x.C.valore)}</div><div class="small">met&agrave; subito, met&agrave; con l'ordine limite</div></div></div>
   <p class="small">Valore per segnale = percentuale di esecuzione &times; resa media: un ingresso "migliore" che scatta di rado pu&ograve; valere meno.</p>`;}

 /* comandi: storico usato (solo backtest), strumento, durata del trade. Le spiegazioni stanno dietro le (i). */
 const infoBtn=(id,tit)=>`<button type="button" class="info" data-apri="${id}" data-k="${id}" aria-expanded="${infoAperte.has(id)}" aria-label="${tit}" title="${tit}">i</button>`;
 const infoP=(id,testo)=>`<p id="${id}" class="sub infotesto${infoAperte.has(id)?" aperta":""}">${testo}</p>`;
 /* SCHEDA NUMERICA uniforme: titolo (con la "i" se c'e' una spiegazione), numero grande, UNA riga breve.
    La spiegazione lunga sta dentro la "i". Le schede di una riga sono allineate (CSS: .vfkpi con subgrid):
    i numeri restano sulla stessa linea anche se un titolo va a capo. */
 const kcard=(id,titolo,valore,breve,spiega,cls)=>`<div class="card kpi"><h3>${titolo}${spiega?infoBtn(id,"Cosa misura"):""}</h3>
  <div class="big ${cls||""}">${valore}</div><div class="note">${breve||"&nbsp;"}</div>${spiega?infoP(id,spiega):""}</div>`;
 function comandi(F){
  const per=V.fin=="bt"?`<div class="vfriga"><span class="vfetich">Storico usato ${infoBtn("vfinfostorico","Cosa sono tutto, sviluppo e holdout")}</span><div class="filters vfper">${[["tutti","Tutto"],["sviluppo","Sviluppo"],["holdout","Holdout (ultimi 2 anni)"]].map(([k,t])=>`<button data-p="${k}" class="${V.per==k?"on":""}">${t}</button>`).join("")}</div></div>
   ${infoP("vfinfostorico",`<b>Tutto</b>: tutti i segnali simulati dal 1987 a oggi. <b>Sviluppo</b>: dal 1987 a due anni fa, gli anni su cui il metodo &egrave; stato costruito e controllato. <b>Holdout</b>: gli ultimi 2 anni, tenuti da parte e mai usati per tarare nulla: &egrave; l'esame vero. Se sviluppo e holdout dicono cose molto diverse, il passato non &egrave; affidabile.`)}`:"";
  const ks=Object.keys((F&&F.dd&&F.dd.strumento)||{});if(V.strum!="tutti"&&!ks.includes(V.strum))V.strum="tutti";
  const cop=ks.filter(k=>/^[A-Z]{6}$/.test(k)).sort(),alt=ks.filter(k=>!/^[A-Z]{6}$/.test(k)).sort();
  const opt=l=>l.map(k=>`<option value="${k}"${k==V.strum?" selected":""}>${k}</option>`).join("");
  const str=`<div class="vfriga"><span class="vfetich">Strumento</span><select id="vfstrum" class="vfsel"><option value="tutti">Tutti gli strumenti</option>${cop.length?`<optgroup label="Cambi">${opt(cop)}</optgroup>`:""}${alt.length?`<optgroup label="Indici, energia, crypto">${opt(alt)}</optgroup>`:""}</select></div>`;
  return `<div class="card vfcomandi">${per}${str}<div class="vfriga"><span class="vfetich">Durata del trade ${infoBtn("vfinfodurata","Come si misura la durata")}</span><div class="filters vforz">${[[5,"1 settimana"],[10,"2 settimane"],[15,"3 settimane"],[20,"4 settimane"],["fine","al cambio segnale"]].map(([k,t])=>`<button data-h="${k}" class="${V.d==k?"on":""}">${t}</button>`).join("")}</div></div>
   <div class="vfriga vfslider"><span class="vfetich">oppure</span><input type="range" id="vfgiorni" min="1" max="20" step="1" value="${V.d=="fine"?20:V.d}" aria-label="Giorni di mercato dopo l'ingresso"><b id="vfgtesto">${durata(V.d)}</b></div>
   ${infoP("vfinfodurata",`I giorni sono <b>giorni di mercato</b> (5 per settimana: sabato e domenica non contano). L'ingresso &egrave; la prima chiusura dopo l'uscita del segnale; drawdown, guadagno e risultato sono misurati <b id="vfdurtesto">${nomeD()}</b> dall'ingresso. "Al cambio segnale" = il trade si chiude quando il segnale cambia (al massimo dopo 12 settimane).`)}</div>`;}

 /* SEZIONI NUMERATE (v6.49): la scheda e' lunga, quindi il contenuto e' diviso in tre blocchi con un numero,
    un titolo e una riga che dice a cosa serve. Cosi' si capisce dove si e' e cosa si sta guardando. */
 const blocco=(n,titolo,sotto,dentro)=>`<div class="vfsez"><div class="vfsez-t"><span class="vfsez-n">${n}</span>
  <div><h2>${titolo}</h2><p class="small">${sotto}</p></div></div>${dentro}</div>`;

 function datiLive(){const P=R.stat,ap=R.aperti||[],ch=R.chiusi||[];
  return blocco(1,"Quanto va contro","Prima dei guadagni: quanto il trade scende sotto l'ingresso, giorno per giorno.",
    bloccoDD(P,R.dd_campi,R.unita)+`<p class="small">I segnali gi&agrave; attivi all'avvio del registro sono esclusi.</p>`)
   +blocco(2,"Com'&egrave; andata","Gli stessi segnali divisi per etichetta, per volatilit&agrave; e per strumento.",
    tabella("Per etichetta",P.etichetta,["STRONG BUY","BUY","SELL","STRONG SELL"])+tabella("Per volatilit&agrave; al momento del segnale",P.vol,["calma","normale","agitata"])+varianti(P.riass)+tabella("Per strumento",P.strumento,null,1,R.profilo))
   +blocco(3,"I segnali uno per uno","Ogni segnale con data, ingresso e risultato alle varie durate.",
    `<h3 class="vft">Aperti <span class="small">(${ap.length})</span></h3><div class="grid vfgrid">${ap.map(s=>scheda(s)).join("")||'<div class="small">Nessun segnale aperto.</div>'}</div>
     <h3 class="vft">Chiusi <span class="small">(${R.n_chiusi})</span></h3><div class="grid vfgrid" id="vfchiusi">${ch.slice(0,12).map(s=>scheda(s)).join("")||'<div class="small">Ancora nessuno.</div>'}</div>
     ${ch.length>12?`<button class="vfaltro" id="vfaltro">Mostra tutti (${ch.length})</button>`:""}`);}

 /* ---- v8.62 LIVE A SCREENER ----
    1) barra unica: strumento (menu + chip per famiglia, con il numero di segnali) e durata del trade (chip, niente cursore);
    2) senza strumento: nessun numero ("—"), solo l'invito a scegliere; il confronto di tutti gli strumenti sta chiuso in fondo;
    3) con lo strumento: 4 numeri, grafico giorno per giorno del solo strumento, sezioni chiudibili, i suoi segnali.
    Dati identici a prima (R.stat): cambia solo l'ordine. Sotto i 10 trade le statistiche di coda (P90, fasce) non si mostrano. */
 const MIN_STAT=10;
 const FAM=k=>["BTC","ETH"].includes(k)?"Crypto":["WTI","BRENT","NATGAS","GOLD","SILVER","PLATINUM","COPPER","PALLADIUM"].includes(k)?"Materie prime"
   :["SP500","NASDAQ","DOW","RUSSELL","EM","EAFE","DAX","NIKKEI","VIX"].includes(k)?"Indici":/^[A-Z]{6}$/.test(k)?"Cambi":"Indici";
 const segnaliDi=k=>(R.aperti||[]).concat(R.chiusi||[]).filter(x=>x.strumento==k);
 function comandiLive(){const P=R.stat,ks=Object.keys(P.strumento||{});if(V.sl&&!ks.includes(V.sl))V.sl="";
  const fam=["Cambi","Indici","Materie prime","Crypto"].map(f=>[f,ks.filter(k=>FAM(k)==f).sort()]).filter(x=>x[1].length);
  const opt=fam.map(([f,l])=>`<optgroup label="${f}">${l.map(k=>`<option value="${k}"${k==V.sl?" selected":""}>${k}</option>`).join("")}</optgroup>`).join("");
  return `<div class="card vfsc"><div class="vfsc-r"><div class="vfsc-s"><span class="vfetich">Strumento</span><select id="vfsl" class="vfsel"><option value=""${V.sl?"":" selected"}>Scegli uno strumento&hellip;</option>${opt}</select></div>
   <div><span class="vfetich">Durata del trade ${infoBtn("vfinfodurata","Come si misura la durata")}</span><div class="vfchip vforz">${[[5,"1 sett."],[10,"2 sett."],[15,"3 sett."],[20,"4 sett."],["fine","Al cambio segnale"]].map(([k,t])=>`<button data-h="${k}" class="${String(V.d)==String(k)?"on":""}">${t}</button>`).join("")}</div></div></div>
   ${infoP("vfinfodurata",`I giorni sono <b>giorni di mercato</b> (5 per settimana). L'ingresso &egrave; la prima chiusura dopo il segnale; risultato, guadagno e drawdown sono misurati <b id="vfdurtesto">${nomeD()}</b> dall'ingresso. "Al cambio segnale" = il trade si chiude quando il segnale cambia (al massimo 12 settimane).`)}
   <div class="vfsc-g">${fam.map(([f,l])=>`<div><small>${f}</small><div class="vfchip vfchip-s">${l.map(k=>`<button data-sl="${k}" class="${k==V.sl?"on":""}">${k}<i>${segnaliDi(k).length}</i></button>`).join("")}</div></div>`).join("")}</div></div>`;}
 // sezione chiudibile: titolo, riepilogo a destra, contenuto (si ricorda se l'utente l'ha aperta)
 const SEZ=new Set();
 const sezione=(id,titolo,destra,dentro)=>`<details class="vfx" data-x="${id}"${SEZ.has(id)?" open":""}><summary><b>${titolo}</b><span>${destra||""}</span></summary><div class="vfx-c">${dentro}</div></details>`;
 function confronto(){const P=R.stat;
  return sezione("tutti","Tutti gli strumenti a confronto",`${Object.keys(P.strumento||{}).length} strumenti &middot; ${R.n_chiusi} trade chiusi`,
   tabella("Per strumento",P.strumento,null,1,R.profilo)+tabella("Per etichetta",P.etichetta,["STRONG BUY","BUY","SELL","STRONG SELL"])
   +tabella("Per volatilit&agrave; al momento del segnale",P.vol,["calma","normale","agitata"])+varianti(P.riass));}
 /* v8.74 IL PERCHE' DI UN SEGNALE (cot_radar/perche.py): un tocco sulla riga apre gli annunci usciti durante il trade
    (con la mossa del prezzo in quella seduta, nel verso del segnale) e il giorno peggiore. Solo date e prezzi veri. */
 const APERTI=new Set();
 const gm=d=>d?d.slice(8,10)+"/"+d.slice(5,7):"";
 function perche(z){const N=z.nt;
  // v8.79 le candele orarie non dipendono dagli annunci: il riquadro .vfc c'e' sempre (prima spariva insieme agli annunci)
  const vfc=`<div class="vfc" data-c="${esc(z.id)}"></div>`;
  if(!N)return `<div class="vfpq vfpq-v small">${(z.m||{}).ingresso?"Annunci in arrivo con il prossimo aggiornamento.":"Annunci non disponibili: il trade non ha ancora un prezzo d'ingresso."}</div>${vfc}`;
  const pg=N.pg,ev=N.ev||[];
  const peg=pg?`<div class="vfpq-pg"><small>Giorno peggiore</small><b>${gm(pg.d)}</b><b class="down">${pc(pg.m)}</b><span>${pg.ev.length?"con "+pg.ev.map(esc).join(", "):"nessun annuncio"}</span></div>`
   :`<div class="vfpq-pg"><small>Giorno peggiore</small><span>nessuna seduta contro</span></div>`;
  const lista=ev.length?`<div class="vfpq-ev">${ev.map(e=>`<span class="vfpq-c"><b>${esc(e.n)}</b><span>${gm(e.d)}</span><b class="${col(e.m)}">${pc(e.m)}</b></span>`).join("")}</div>`
   :`<div class="vfpq-ev"><span class="small">Nessun annuncio durante il trade</span></div>`;
  return `<div class="vfpq">${peg}<div class="vfpq-a"><small>Annunci durante il trade ${infoBtn("vfpqi-"+z.id,"Come si legge")}</small>${lista}</div>
   ${infoP("vfpqi-"+z.id,"Per ogni annuncio: il giorno e quanto si è mosso il prezzo nella seduta in cui è uscito, nel verso del segnale (in % del prezzo d'ingresso). Contano NFP, CPI e Fed per tutti gli strumenti; BCE, Bank of England, Bank of Japan, Bank of Canada, RBA, RBNZ e SNB per le coppie con la loro valuta. Giorno peggiore = la seduta che è andata più contro.")}</div>${vfc}`;}
 function datiLiveNuova(){const P=R.stat;
  if(!V.sl)return `<div class="card vfvuoto2"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><b>Scegli uno strumento</b><p>Vedrai come sono andati i suoi segnali, giorno per giorno.</p></div>
   <div class="grid k4 vfkpi vfghost">${["Risultato","In guadagno","Guadagno max","Drawdown"].map(t=>`<div class="card kpi"><h3>${t}</h3><div class="big">&mdash;</div><div class="note">&nbsp;</div></div>`).join("")}</div>`+confronto();
  const k=V.sl,x=st(P.strumento[k]),lista=((P.dd||{}).strumento||{})[k],o=ddRiga(lista,R.dd_campi),u=(R.unita||{})[k];
  const sg=segnaliDi(k),misurati=x?x.n:0;
  const testa=`<div class="vfsl-t"><span class="vfsl-n">${esc(k)}</span><span class="tag">${sg.length} segnal${sg.length==1?"e":"i"} &middot; ${misurati} trade misurat${misurati==1?"o":"i"}</span>${misurati<MIN_STAT?`<span class="tag ko">Pochi trade: leggili come esempi, non come statistica</span>`:""}</div>`;
  const kp=x?`<div class="grid k4 vfkpi">
   ${kcard("vlk1","Risultato",pc(x.resa),"medio, al netto dei costi",`Risultato medio dei trade ${nomeD()}, tolti i costi stimati di ingresso e uscita.`,col(x.resa))}
   ${kcard("vlk2","In guadagno",`${x.vinti} su ${x.n}`,"trade chiusi in positivo","")}
   ${kcard("vlk3","Guadagno max",pc(x.mfe),"medio, lungo il trade",`Il punto pi&ugrave; alto raggiunto in media durante il trade, prima dell'uscita.`,"up")}
   ${kcard("vlk4","Drawdown",pc(x.mae),"medio, sotto l'ingresso",`Quanto il trade &egrave; sceso in media sotto il prezzo d'ingresso prima dell'uscita.`,x.mae<0?"down":"")}</div>`
   :`<div class="card vfvuoto small">Nessun trade su ${esc(k)} gi&agrave; concluso con questa durata. Prova &laquo;Al cambio segnale&raquo; o una durata pi&ugrave; breve.</div>`;
  // grafico del solo strumento: si dice fino a quando e quando restano meno trade
  let gr=graficoDD(lista,R.dd_campi);
  if(gr){const righe=[];for(let d=1;d<=20;d++){const r=ddRiga(lista,R.dd_campi,d);if(r)righe.push([d,r.n]);}
   const cala=righe.find(([d,n])=>n<righe[0][1]);
   gr=gr.replace('<p id="vfgrinfo"',`<p class="small vfgnota">Se il trade fosse tenuto fino a 4 settimane${cala?`. Dal giorno ${cala[0]} restano ${cala[1]} trade`:""}.</p><p id="vfgrinfo"`);}
  else gr=`<div class="card vfvuoto small">Percorso giorno per giorno non ancora disponibile per ${esc(k)}.</div>`;
  const coda=o&&o.n>=MIN_STAT?kpiDD(o,u)+fasce(o):`<p class="small">Servono almeno ${MIN_STAT} trade per misurare la coda del drawdown (P90) e le fasce in volatilit&agrave;: per ora ${o?o.n:0}.</p>`;
  const ann=o?annunci(o):`<p class="small">Dati non disponibili per questa scelta.</p>`;
  const f2=v=>v==null?"&mdash;":pc(v);
  const righeS=sg.sort((a,b)=>(b.generato||"").localeCompare(a.generato||"")).map(z=>{const m=z.m||{},f=(m.A||{}).fine,ing=m.ingresso,aperto=!z.chiuso&&!(m.fine||{}).motivo;
   const dur=f&&ing?Math.max(1,Math.round((new Date(f.data)-new Date(ing.data))/864e5*5/7))+" g":"&mdash;";
   const ap=APERTI.has(z.id);
   return `<tr class="vfrow${ap?" on":""}" data-id="${esc(z.id)}" tabindex="0" aria-expanded="${ap}"><td><i class="vfchev" aria-hidden="true"></i>${badge(z.etichetta)}${z.iniziale?' <span class="tag" title="Era gi&agrave; attivo quando il registro &egrave; partito">escluso</span>':""}</td><td>${esc((z.generato_it||"").slice(0,5))}</td>
    <td class="num"><b class="${f&&!z.iniziale?col(f.res):""}">${z.iniziale||!f?(aperto&&ing?"in corso":"&mdash;"):(aperto?'<small class="vfic">in corso</small> ':"")+f2(f.res)}</b></td><td class="num up vfnt">${z.iniziale||!f?"&mdash;":f2(f.mfe)}</td><td class="num down vfnt">${z.iniziale||!f?"&mdash;":f2(f.mae)}</td><td class="num vfdur">${z.iniziale?"&mdash;":dur}</td></tr>
    <tr class="vfdett"${ap?"":" hidden"}><td colspan="6">${perche(z)}</td></tr>`;}).join("");
  const tabS=`<p class="small vfhint">Tocca un segnale: annunci e candele orarie</p><div class="tablewrap"><table class="compatta vfslt"><tr><th>Segnale</th><th>Data</th><th class="num">Al cambio</th><th class="num vfnt">Guadagno max</th><th class="num vfnt">Drawdown</th><th class="num vfdur">Durata</th></tr>${righeS}</table></div>`;
  return testa+kp+gr
   +sezione("coda","Quanto va contro",o&&o.n>=MIN_STAT?`${o.n} trade`:`servono almeno ${MIN_STAT} trade`,coda)
   +sezione("ann","Annunci macro USA",V.d=="fine"?"solo durate da 1 a 4 settimane":"",ann)
   +sezione("seg",`I segnali di ${esc(k)}`,String(sg.length),tabS)
   +confronto();}

 function live(){if(!R)return `<div class="card vfvuoto">Registro non disponibile in questo aggiornamento.</div>`;
  /* v7.97 STATO DEL REGISTRO: un badge chiaro al posto della riga tecnica con il codice lungo (sembrava un errore).
     Verde "Registro verificato" se la catena di impronte e' integra, rosso se no. L'impronta (hash SHA-256) resta
     solo nella (i), accorciata, con il pulsante Copia per chi vuole controllarla. */
  const hs=R.ultimo_hash||"",corto=hs?hs.slice(0,8)+"&hellip;"+hs.slice(-6):"";
  const testa=`<div class="vfstato">${R.integra?`<span class="vfbadge ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>Registro verificato</span>`
     :`<span class="vfbadge ko">&#10007; Registro non integro</span>`}
    <span class="small">${R.eventi.toLocaleString(EB_LOC)} eventi${R.dal?` dal ${esc(R.dal.replace(/ ore .*/,""))}`:""}</span>
    ${hs?`<button type="button" class="info" data-apri="vfcatena" data-k="vfcatena" aria-expanded="${infoAperte.has("vfcatena")}" aria-label="Cosa vuol dire" title="Cosa vuol dire?">i</button>`:""}
    ${R.completi?"":`<span class="small" style="color:var(--warn)">Ultimo aggiornamento con dati incompleti: registro fermo</span>`}</div>
  ${hs?`<p id="vfcatena" class="sub infotesto${infoAperte.has("vfcatena")?" aperta":""}">Ogni segnale &egrave; legato al precedente con un'impronta digitale: se qualcuno cambiasse il passato, il registro risulterebbe non integro. Impronta attuale <code class="vfhash" title="${esc(hs)}">${corto}</code> <button type="button" class="vfcopia" data-hash="${esc(hs)}">Copia</button></p>`:""}`;
  if(!R.eventi)return testa+`<div class="card vfvuoto"><b>Il registro parte con il prossimo aggiornamento completo.</b><p class="small">Da quel momento ogni segnale viene salvato con data e ora, prezzo d'ingresso e risultati. Gli eventi non si possono modificare: ognuno contiene l'impronta del precedente.</p></div>`;
  if(NUOVA())return testa+comandiLive()+`<div id="vfdati">${datiLiveNuova()}</div>`;   // v8.62 prima solo il fondatore
  return testa+comandi(R.stat)+`<div id="vfdati">${datiLive()}</div>`;}

 /* aggiorna SOLO i numeri (non i comandi): cosi' il cursore delle sedute si puo' trascinare senza scatti */
 function aggiorna(){const box=$("vfdati");if(!box||V.fin=="carry")return;box.innerHTML=V.fin=="vol"?datiVol():NUOVA()?datiLiveNuova():datiLive();
  box.querySelectorAll("details.vfx").forEach(d=>d.addEventListener("toggle",()=>{d.open?SEZ.add(d.dataset.x):SEZ.delete(d.dataset.x);}));
  // v8.75 candele orarie del segnale (13c_candele.js): si disegnano solo quando la riga e' aperta, una volta sola
  const candele=d=>{const c=d&&!d.hidden&&d.querySelector(".vfc");if(!c||c.dataset.ok||!window.ebCandele)return;
   const z=segnaliDi(V.sl).find(x=>x.id==c.dataset.c);if(z){c.dataset.ok=1;ebCandele(c,z);}};
  box.querySelectorAll("tr.vfdett:not([hidden])").forEach(candele);
  // v8.74 riga di un segnale: apre e chiude il suo "perche'" (si ricorda finche' la pagina resta aperta)
  box.querySelectorAll("tr.vfrow").forEach(tr=>{const apri=()=>{const on=!APERTI.has(tr.dataset.id);on?APERTI.add(tr.dataset.id):APERTI.delete(tr.dataset.id);
    tr.classList.toggle("on",on);tr.setAttribute("aria-expanded",on);const d=tr.nextElementSibling;if(d&&d.classList.contains("vfdett"))d.hidden=!on;
    candele(d);};
   tr.addEventListener("click",e=>{if(!e.target.closest("button,a"))apri();});
   tr.addEventListener("keydown",e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();apri();}});});
  el.querySelectorAll("[data-sl]").forEach(b=>b.classList.toggle("on",b.dataset.sl==V.sl));
  const sl=$("vfsl");if(sl)sl.value=V.sl;
  const sc=el.querySelector(".vfsc");if(sc)sc.classList.toggle("scelto",!!V.sl);   // telefono: chip nascosti dopo la scelta (resta il menu)
  el.querySelectorAll(".vforz button").forEach(b=>b.classList.toggle("on",b.dataset.h==String(V.d)));
  const t=$("vfgtesto");if(t)t.textContent=durata(V.d);
  const dt=$("vfdurtesto");if(dt)dt.textContent=nomeD();
  box.querySelectorAll(".vfunita button").forEach(b=>b.onclick=()=>{V.unita=b.dataset.u;salva();aggiorna();});
  const alt=$("vfaltro");if(alt)alt.onclick=()=>{$("vfchiusi").innerHTML=R.chiusi.map(s=>scheda(s)).join("");alt.remove();};}

 function disegna(){
  if(solaVol){el.innerHTML=`<div class="vltesta"><h2>Volatilit&agrave;</h2>${infoBtn("vlinfo","Cosa mostra")}</div>${infoP("vlinfo","Quanto si muove ogni strumento: regime di adesso, settimana tipica, giorno della settimana, mese del calendario e anno per anno. Serve a dimensionare le posizioni e a capire il rischio, non a prevedere la direzione.")}
   <div class="vfcorpo">${volatilitaVista()}</div>`;
   const sa=$("vfasset");if(sa)sa.onchange=()=>{V.asset=sa.value;salva();aggiorna();};
   aggiorna();return;}
  // vista mostrata: "cmp" solo se i dati ci sono (la scelta salvata resta)
  const vista=V.fin=="cmp"&&CMP()?"cmp":"live";
  el.innerHTML=`<h2>Live</h2><p class="sub">${vista=="cmp"?"Cosa fa il prezzo quando gli speculatori iniziano a spingere, su tutto lo storico.":"Ogni segnale del terminale viene registrato nel momento in cui nasce e poi misurato sui prezzi reali: quanto va contro (drawdown), quanto guadagna, come finisce."}</p>
  ${CMP()?`<div class="vfswitch"><button data-f="live" class="${vista=="live"?"on":""}">Registro live</button><button data-f="cmp" class="${vista=="cmp"?"on":""}">Comportamento COT</button></div>`:""}
  <div class="vfcorpo">${vista=="cmp"?'<div id="cmpbox"></div>':live()}</div>`;
  if(vista=="cmp"){ebComportamento($("cmpbox"));el.querySelectorAll(".vfswitch button").forEach(b=>b.onclick=()=>{V.fin=b.dataset.f;salva();disegna();});return;}
  el.querySelectorAll(".vfswitch button").forEach(b=>b.onclick=()=>{V.fin=b.dataset.f;salva();disegna();});
  el.querySelectorAll(".vforz button").forEach(b=>b.onclick=()=>{V.d=b.dataset.h=="fine"?"fine":+b.dataset.h;const r=$("vfgiorni");if(r&&V.d!="fine")r.value=V.d;salva();aggiorna();});
  el.querySelectorAll(".vfper button").forEach(b=>b.onclick=()=>{V.per=b.dataset.p;el.querySelectorAll(".vfper button").forEach(x=>x.classList.toggle("on",x==b));salva();aggiorna();});
  const r=$("vfgiorni");if(r){r.oninput=()=>{V.d=+r.value;aggiorna();};r.onchange=salva;}
  const sa=$("vfasset");if(sa)sa.onchange=()=>{V.asset=sa.value;salva();aggiorna();};
  const ss=$("vfstrum");if(ss)ss.onchange=()=>{V.strum=ss.value;salva();aggiorna();};
  // v8.62 scelta dello strumento nella Live (menu o chip): stessa variabile, un solo ridisegno dei dati
  const scegli=k=>{V.sl=k;salva();aggiorna();};
  const sl=$("vfsl");if(sl)sl.onchange=()=>scegli(sl.value);
  el.querySelectorAll("[data-sl]").forEach(b=>b.onclick=()=>scegli(b.dataset.sl==V.sl?"":b.dataset.sl));
  aggiorna();
  }
 /* v8.79 "MOSTRAMI" DELLE NOVITA' (39b_novita_chat.js): porta subito alle candele orarie di un segnale vero.
    Se non e' scelto nessuno strumento sceglie quello con il segnale piu' recente; apre "I segnali di X" e la prima
    riga (il segnale piu' recente) e restituisce il riquadro da illuminare. Non cambia le scelte salvate dell'utente
    oltre allo strumento (come un tocco sul chip). */
 window.ebLiveMostra=()=>{try{if(solaVol)return null;
  if(V.fin!="live"){V.fin="live";salva();disegna();}            // dalla vista Comportamento si torna alla Live
  const ok=z=>z.m&&z.m.ingresso&&z.nt&&!z.iniziale,tutti=(R.aperti||[]).concat(R.chiusi||[]).filter(ok);
  if(!tutti.length)return null;
  const recente=a=>a.slice().sort((x,y)=>(y.generato||"").localeCompare(x.generato||""))[0];
  if(!V.sl||!segnaliDi(V.sl).some(ok)){V.sl=recente(tutti).strumento;salva();}
  const z=recente(segnaliDi(V.sl).filter(ok));
  SEZ.add("seg");APERTI.clear();APERTI.add(z.id);aggiorna();
  const d=el.querySelector(`tr.vfrow[data-id="${CSS.escape(z.id)}"]`);
  return d&&d.nextElementSibling||d||el.querySelector('details.vfx[data-x="seg"]');}catch(e){console.warn("[EdgeValor] mostra live",e);return null;}};
 disegna();
 })();}catch(e){fail(dove=="vol"?"Volatilit\u00e0":"Verifica dei segnali",dove=="vol"?"volat":"verifica",e);}}
ebVerifica("vol");                                       // v7.48 scheda Volatilita' (dati gia' nella pagina)

/* CARICAMENTO A RICHIESTA (v6.35): sul sito registro live + backtest (~600 KB, piu' di meta' della pagina) stanno in
   un file a parte, terminale/verifica.json (D.verifica = indirizzo), e si scaricano solo la prima volta che si apre
   questa scheda. Cosi' la dashboard si apre molto piu' in fretta, soprattutto da telefono. Sul PC (pagina locale
   aperta da file) i dati restano dentro la pagina: il browser non permette di leggere file vicini. */
/* v9.55 SCARICAMENTO CONDIVISO di verifica.json: Promise(true = dati pronti in D.reg/D.cmp, false = non disponibili).
   Lo usano la scheda Live (qui sotto) e la scheda dello strumento (12_grafico.js). Una sola richiesta alla volta. */
window.ebCaricaVerifica=(function(){let P=null;return function(){
 if(D.reg||D.cmp)return Promise.resolve(true);
 if(!D.verifica||typeof EB_PREMIUM=="undefined"||!EB_PREMIUM)return Promise.resolve(false);
 if(!P)P=fetch(D.verifica,{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(v=>window.ebPrem?ebPrem.apri(v):v)   // v8.08 file cifrato: si apre con la chiave Premium
  .then(v=>{if(!v||(!v.reg&&!v.cmp))throw new Error("file non aperto");D.reg=v.reg;D.cmp=v.cmp;D.carry_st=v.carry_st;if(v.pos)D.pos=v.pos;return true;})
  .catch(e=>{P=null;throw e;});
 return P;};})();
// v9.81 il file si scarica in anticipo (5 secondi dopo l'apertura, solo Premium): quando si apre un grafico fasce
//   degli speculatori e posizione COT degli ultimi 3 anni ci sono gia', senza attese ne' grafici incompleti
setTimeout(()=>{try{window.ebCaricaVerifica().catch(()=>{});}catch(e){}},5000);
(function(){const el=$("verifica");if(!el)return;
 if(D.reg||D.cmp||!D.verifica){ebVerifica();return;}
 if(!EB_PREMIUM)return;                                  // v8.08 Live chiusa al Basic: lucchetto di 45_chiuse.js, niente download
 let stato="";                                           // "" = da caricare, "in corso", "ok"
 // v9.55 lo scaricamento e' condiviso con la scheda dello strumento (12_grafico.js: fasce degli speculatori,
 //   uscite COT e notizie sul grafico): una sola richiesta anche se la chiedono tutte e due
 const sk=(w,h)=>`<i class="sk" style="width:${w};height:${h}px;display:block;margin-bottom:14px;border-radius:12px"></i>`;
 function carica(){if(stato)return;stato="in corso";
  el.innerHTML=`<h2>Live</h2>${sk("40%",16)}${sk("100%",120)}${sk("100%",320)}`;
  window.ebCaricaVerifica().then(ok=>{if(!ok)throw new Error("file non aperto");stato="ok";el.innerHTML="";ebVerifica();})
   .catch(e=>{stato="";console.warn("[EdgeValor] verifica.json:",e);
    el.innerHTML=`<h2>Live</h2><div class="card" style="padding:18px 20px"><p class="small">I dati della verifica non si sono caricati (connessione). </p><button class="tvbtn vfriprova">Riprova</button></div>`;
    const b=el.querySelector(".vfriprova");if(b)b.onclick=carica;});}
 if(el.classList.contains("on"))carica();
 new MutationObserver(()=>{if(el.classList.contains("on"))carica();}).observe(el,{attributes:true,attributeFilter:["class"]});
})();

