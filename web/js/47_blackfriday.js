/* ---------- v9.16 CAMPAGNE STAGIONALI (Black Friday, Pasqua, saldi d'estate e d'inverno) ----------
   Un solo motore per tutte le offerte dell'anno: striscia in cima al terminale + finestra con conto alla rovescia.
   AGENDA (calcolata da sola ogni anno, ORA ITALIANA con ora legale/solare: vedi romaMs):
     inverno   Saldi d'inverno   dal 2 al 10 gennaio (come i saldi dei negozi)
     pasqua    Offerta di Pasqua dal lunedi' della Settimana Santa a Pasquetta (2027: 22-29 marzo, a cavallo del cambio d'ora del 28)
     estate    Saldi d'estate    dal primo sabato di luglio, 9 giorni (2027: 3-11 luglio)
     black     Black Friday      dal lunedi' prima del Black Friday al Cyber Monday (2026: 23-30 novembre)
               fasi: Black Friday Week, Black Friday, Black Weekend, Cyber Monday (ultimo giorno)
   OFFERTA: nel 2026 il Black Friday "blocca la tariffa attuale" (il listino sale il 1/12, EB_PREZZI.CAMBIO): annuale a
   19,99 al mese invece di 29,99 (-33%). Dalle campagne successive: Premium annuale -33% il primo anno (19,99 EUR al
   mese, poi 29,99) con il piano PayPal promozionale EB_PREZZI.PROMO. Anteprima per l'admin: ?campagna=estate.
   CHI LA VEDE: chi non ha un abbonamento pagato (e l'admin sempre, per controllarla).
   QUANDO SI APRE LA FINESTRA (come TradingView, idea di Ya), al massimo una volta al giorno in automatico:
     - all'inizio di ogni fase; - quando l'utente guarda un contenuto Premium bloccato per 6 secondi;
     - sul PC quando porta il mouse verso la barra del browser (sta per chiudere), dopo 30 secondi;
     - quando tocca "Passa a Premium": prima l'offerta, poi il pagamento (01_base.js -> ebBlackFriday.intercetta()).
   TEMI: ogni campagna ha i suoi colori (classe .cmp-<tema>, stile.css "CAMPAGNE"). v9.17 (Ya): luci colorate che si
   muovono dentro tutta la card (.bfluci, tre sfere sfocate) e bordo con luce che gira, come TradingView.
   v9.20 (Ya) ULTIME 8 ORE di ogni campagna: la striscia dice "Ultime ore." e la finestra si apre una volta in piu'
   (anche se e' gia' uscita quel giorno). La landing ha la stessa finestra (cot_radar/campagne.py finestra()) e
   condivide la memoria ebBF: chi l'ha vista li' non la rivede subito nel terminale.
   DEBUG (F12): ebCampagne.agenda(2027) elenca date e orari; ebCampagne.anteprima("pasqua") apre la finestra (admin). */
(function(){try{
 const V=EB_PREZZI.VECCHI,N=EB_PREZZI.NUOVI;
 const admin=()=>document.documentElement.classList.contains("eb-admin");

 // ---------- date in ora italiana (ora legale e solare comprese) ----------
 // offset di Roma in ms all'istante t: si legge l'ora locale di Roma con Intl e si confronta con UTC
 function offRoma(t){const p={};new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"})
  .formatToParts(new Date(t)).forEach(x=>p[x.type]=x.value);
  return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(t/1000)*1000;}
 // istante (ms) di un'ora italiana: due passaggi bastano anche nel giorno del cambio d'ora
 function romaMs(y,m,d,h=0,mi=0,s=0){const L=Date.UTC(y,m-1,d,h,mi,s);let t=L-offRoma(L);return L-offRoma(t);}
 const gg=(y,m,d)=>new Date(Date.UTC(y,m-1,d));
 const piu=(dt,n)=>new Date(dt.getTime()+n*864e5);
 const ymd=dt=>[dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()];
 // Pasqua (algoritmo gregoriano di Meeus/Jones/Butcher)
 function pasqua(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mese=Math.floor((h+l-7*m+114)/31),gio=(h+l-7*m+114)%31+1;
  return gg(y,mese,gio);}
 // primo giorno della settimana `wd` (0=domenica) a partire da una data
 const primo=(dt,wd)=>piu(dt,(wd-dt.getUTCDay()+7)%7);
 // Black Friday: venerdi' dopo il quarto giovedi' di novembre (Thanksgiving USA)
 const blackFriday=y=>piu(primo(gg(y,11,1),4),22);

 // ---------- agenda di un anno ----------
 function agenda(y){const L=[];
  const metti=(k,tema,nome,da,a,extra)=>L.push(Object.assign({k,tema,nome,anno:y,da:romaMs(...ymd(da)),a:romaMs(...ymd(piu(a,1))),giornoFine:a},extra||{}));
  const inv=gg(y,1,2);metti("inverno","inverno","Saldi d'inverno",inv,piu(inv,8));
  const p=pasqua(y);metti("pasqua","pasqua","Offerta di Pasqua",piu(p,-6),piu(p,1));
  const est=primo(gg(y,7,1),6);metti("estate","estate","Saldi d'estate",est,piu(est,8));
  const bf=blackFriday(y);metti("black","black","Black Friday",piu(bf,-4),piu(bf,3),{bf});
  // offerta: 2026 = tariffa bloccata (sale il listino); dopo = -33% sull'annuale il primo anno (piano PayPal da creare)
  // v9.18 tutte pronte: il piano PayPal promozionale esiste (EB_PREZZI.PROMO)
  L.forEach(c=>{c.offerta=(c.k=="black"&&y==2026)?"blocco":"sconto";c.pronta=true;});
  return L;}
 // campagna in corso adesso (o quella richiesta in anteprima dall'admin)
 let forzata=null;
 function attuale(){const t=Date.now();if(forzata)return forzata;
  const y=new Date(t).getUTCFullYear();return [...agenda(y-1),...agenda(y)].find(c=>t>=c.da&&t<c.a)||null;}

 // fase del giorno (solo Black Friday) ed etichette: breve = sul telefono
 const oggi=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const iso=dt=>dt.toISOString().slice(0,10);
 function fase(c){const d=forzata?forzata.giorno||iso(forzata.giornoFine):oggi(),ultimo=d==iso(c.giornoFine);
  if(c.k=="black"){const bf=iso(c.bf);
   if(ultimo)return {k:"cyber",nome:"Cyber Monday",breve:"Cyber Monday",ultimo,tema:"cyber"};
   if(d>bf)return {k:"weekend",nome:"Black Weekend",breve:"Black Weekend",ultimo,tema:"black"};
   if(d==bf)return {k:"friday",nome:"Black Friday",breve:"Black Friday",ultimo,tema:"black"};
   return {k:"week",nome:"Black Friday Week",breve:"Black Friday",ultimo,tema:"black"};}
  return {k:c.k,nome:c.nome,breve:c.nome,ultimo,tema:c.tema};}

 // ---------- testi (brevi; il dettaglio nella (i)) ----------
 const dataLunga=dt=>dt.toLocaleDateString(typeof EB_LOC!="undefined"?EB_LOC:"it-IT",{day:"numeric",month:"long",timeZone:"UTC"});
 function testi(c,f){const fino=dataLunga(c.giornoFine);
  if(c.offerta=="blocco")return {
   // v9.18 (Ya): la leva e' l'annuale a 19,99 al mese, con lo sconto rispetto al prezzo pieno (29,99) sempre in vista
   striscia:T("Premium annuale a 19,99 € al mese invece di 29,99 € (−33%), blocca subito."),
   titolo:T("Blocca la tariffa attuale."),
   sott:T("Fino al 30 novembre: Premium annuale a 19,99 € al mese invece di 29,99 € (−33%), finché resti abbonato."),
   info:T("La tariffa resta bloccata finché l'abbonamento è attivo, anche negli anni successivi. Se disdici e ti riabboni dal 1° dicembre vale il nuovo listino: 39,99 € al mese oppure 29,99 € al mese con l'annuale. Paghi con PayPal o carta, disdici quando vuoi dal Profilo."),
   cta:T("Blocca la tariffa"),ctaBreve:T("Blocca"),
   piani:[["annuale",T("Annuale"),V.annuale.mese,N.annuale.mese,`${V.annuale.prezzo} ${T("all'anno")}`,"−33%"],
          ["mensile",T("Mensile"),V.mensile.mese,N.mensile.mese,T("Mese per mese"),""]]};
  return {
   striscia:T("Premium annuale −33% il primo anno."),
   titolo:T("Premium annuale −33%."),
   sott:T("Fino al")+" "+fino+": "+T("il primo anno a 19,99 € al mese invece di 29,99 €."),
   info:T("Lo sconto vale per il primo anno del piano annuale: 239,88 € invece di 359,88 €. Dal secondo anno si rinnova a 359,88 €. Il piano mensile resta a 39,99 €. Paghi con PayPal o carta, disdici quando vuoi dal Profilo."),
   cta:T("Attiva l'offerta"),ctaBreve:T("Attiva"),
   piani:[["annuale",T("Annuale"),"19,99 €",N.annuale.mese,`239,88 € ${T("il primo anno")}`,"−33%"],
          ["mensile",T("Mensile"),N.mensile.mese,"",T("Mese per mese"),""]]};}

 let mem={};try{mem=JSON.parse(localStorage.getItem("ebBF")||"{}");}catch(e){}
 const salva=()=>{try{localStorage.setItem("ebBF",JSON.stringify(mem));}catch(e){}};
 const due=n=>String(n).padStart(2,"0");
 const ORE8=8*36e5,ultimeOre=c=>c&&(c.a-(forzata?forzata.ora:Date.now()))<ORE8;
 function resto(c){const s=Math.max(0,Math.floor((c.a-(forzata?forzata.ora:Date.now()))/1000));
  return [Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];}
 // chi la vede: niente a chi ha gia' Premium pagato o a vita; l'admin sempre; campagne non pronte solo all'admin
 function idoneo(c){c=c||attuale();if(!c)return false;if(admin())return true;if(!c.pronta)return false;
  const st=window.ebAccount&&ebAccount.stato();if(!st||!st.sessione)return false;const p=st.profilo;if(!p)return false;
  return !(p.sempre_premium||(p.premium_fino&&Date.parse(p.premium_fino)>Date.now()));}

 // ---------- striscia in cima ----------
 let striscia=null,giro=null,C=null;
 function mostraStriscia(){if(striscia||mem.chiusa==oggi()&&!forzata)return;const f=fase(C),x=testi(C,f);
  striscia=document.createElement("div");striscia.className="bfstrip cmp-"+f.tema;striscia.setAttribute("role","region");striscia.setAttribute("aria-label",f.nome);
  striscia.innerHTML=`<span class="bftag"><span class="bflungo">${f.nome}</span><span class="bfbreve">${f.breve}</span></span>
   <span class="bftesto"><b class="bfora">${ultimeOre(C)?T("Ultime ore."):f.ultimo?T("Ultimo giorno."):""}</b> ${x.striscia}</span>
   <span class="bfconto" aria-live="off"></span>
   <button type="button" class="bfcta"><span class="bflungo">${x.cta}</span><span class="bfbreve">${x.ctaBreve}</span></button>
   <button type="button" class="bfx" aria-label="${T("Chiudi")}">&#x2715;</button>`;
  const al=document.getElementById("alerts");(al&&al.parentNode?al.parentNode.insertBefore(striscia,al):document.body.prepend(striscia));
  striscia.querySelector(".bfcta").onclick=()=>apri();
  striscia.querySelector(".bfx").onclick=()=>{mem.chiusa=oggi();salva();striscia.classList.add("via");setTimeout(()=>{striscia&&striscia.remove();striscia=null;},250);};
  tic();}
 function tic(){if(!C)return;const r=resto(C);
  // sul telefono i secondi si nascondono (.bfsec): resta "5g 13:59"
  if(striscia)striscia.querySelector(".bfconto").innerHTML=`${r[0]}${T("g")} ${due(r[1])}:${due(r[2])}<span class="bfsec">:${due(r[3])}</span>`;
  // v9.20 ultime 8 ore: etichetta aggiornata e una finestra in piu' (una sola volta per campagna)
  if(ultimeOre(C)){const o=striscia&&striscia.querySelector(".bfora");if(o&&o.textContent!=T("Ultime ore."))o.textContent=T("Ultime ore.");
   if(!forzata&&fatto&&Date.now()-INIZIO>4000&&!mem["ore8_"+C.anno+"_"+C.k]&&!document.querySelector(".cmodal")){mem["ore8_"+C.anno+"_"+C.k]=1;mem.auto=oggi();salva();apri();}}
  const m=document.querySelector(".bfmodal");if(m)m.querySelectorAll(".bfnum b").forEach((b,i)=>{b.textContent=due(r[i]);});
  if(!forzata&&Date.now()>=C.a){striscia&&striscia.remove();striscia=null;m&&m.remove();clearInterval(giro);C=null;}}

 // ---------- finestra ----------
 function apri(){if(document.querySelector(".bfmodal")||!C)return;const f=fase(C),x=testi(C,f);let scelto="annuale";
  const box=document.createElement("div");box.className="cmodal bfmodal cmp-"+f.tema;
  const piano=([k,nome,oggiP,poiP,sotto,eti])=>`<button type="button" role="radio" class="bfpiano${k==scelto?" on":""}" data-k="${k}" aria-checked="${k==scelto}">
    ${eti?`<span class="bfpiu">${eti}</span>`:""}<small>${nome}</small>
    <span class="bfprezzo"><b>${oggiP}</b><i>${T("/mese")}</i></span>
    ${poiP?`<span class="bfpoi">${C.offerta=="blocco"?T("dal 1/12"):T("poi")} <s>${poiP}</s></span>`:`<span class="bfpoi">&nbsp;</span>`}<em>${sotto}</em></button>`;
  box.innerHTML=`<div class="cmodal-box bfbox" role="dialog" aria-modal="true" aria-labelledby="bft">
   <i class="bfaura" aria-hidden="true"></i><i class="bfluci" aria-hidden="true"><b></b><b></b><b></b></i><i class="bfgrana" aria-hidden="true"></i>
   <button type="button" class="fbx" aria-label="${T("Chiudi")}">&#x2715;</button>
   <div class="bfalto"><span class="bftag">${f.nome}</span>${ultimeOre(C)?`<span class="bfultimo">${T("Ultime ore")}</span>`:f.ultimo?`<span class="bfultimo">${T("Ultimo giorno")}</span>`:""}
    <button type="button" class="info" data-apri="bfinfo" aria-expanded="false" aria-label="${T("Come funziona")}">i</button></div>
   <h2 id="bft">${x.titolo}</h2>
   <p class="bfsott">${x.sott}</p>
   <p id="bfinfo" class="sub infotesto">${x.info}</p>
   <div class="bfconto2" role="timer" aria-label="${T("Tempo rimasto")}">${["giorni","ore","min","sec"].map(u=>`<span class="bfnum"><b>00</b><small>${T(u)}</small></span>`).join("")}</div>
   <div class="bfpiani" role="radiogroup" aria-label="${T("Piano")}">${x.piani.map(piano).join("")}</div>
   <button type="button" class="bfvai">${x.cta}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
   <button type="button" class="bfdopo">${T("Più tardi")}</button></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));tic();
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});
  box.querySelector(".fbx").onclick=chiudi;box.querySelector(".bfdopo").onclick=chiudi;
  box.querySelectorAll(".bfpiano").forEach(b=>b.onclick=()=>{scelto=b.dataset.k;
   box.querySelectorAll(".bfpiano").forEach(y=>{y.classList.toggle("on",y==b);y.setAttribute("aria-checked",y==b);});});
  // pagamento: la finestra PayPal di sempre con il piano scelto (senza accesso chiede prima di entrare)
  box.querySelector(".bfvai").onclick=()=>{chiudi();setTimeout(()=>window.ebAbbonamento&&ebAbbonamento.apri(scelto),230);};
  if(!forzata){mem["vista_"+C.anno+"_"+f.k]=1;if(ultimeOre(C))mem["ore8_"+C.anno+"_"+C.k]=1;salva();}}

 // ---------- avvio: quando l'account e' letto (classe eb-admin o profilo) ----------
 let fatto=false;
 function prova(){if(fatto)return;const c=attuale();if(!c||!idoneo(c))return;fatto=true;C=c;
  mostraStriscia();giro=setInterval(tic,1000);
  // (v9.15 la chiave era "vista_<fase>" senza anno: vale ancora per il 2026, cosi' nessuno la rivede due volte)
  const f=fase(C);if(!mem["vista_"+C.anno+"_"+f.k]&&!(C.anno==2026&&mem["vista_"+f.k]))setTimeout(()=>automatica("fase"),2500);}
 // apertura automatica: una sola al giorno, mai sopra un'altra finestra
 function automatica(motivo){if(!fatto||!C||document.querySelector(".cmodal"))return;
  if(motivo!="fase"&&mem.auto==oggi())return;mem.auto=oggi();mem.motivo=motivo;salva();apri();}
 // 1) contenuto Premium bloccato guardato a lungo (6 secondi visibile per almeno il 60%)
 const visti=new Map();
 const occhio=("IntersectionObserver" in window)?new IntersectionObserver(ee=>ee.forEach(e=>{
  if(e.isIntersecting&&e.intersectionRatio>=.6){if(!visti.has(e.target))visti.set(e.target,setTimeout(()=>automatica("lucchetto"),6000));}
  else{clearTimeout(visti.get(e.target));visti.delete(e.target);}}),{threshold:[0,.6]}):null;
 const osserva=()=>{if(occhio)document.querySelectorAll(".plk:not([data-bfv])").forEach(x=>{x.dataset.bfv=1;occhio.observe(x);});};
 // 2) uscita dalla pagina (solo PC, mouse verso la barra del browser) dopo 30 secondi
 const INIZIO=Date.now();
 document.addEventListener("mouseout",e=>{if(!e.relatedTarget&&e.clientY<=0&&Date.now()-INIZIO>30000)automatica("uscita");});
 // 3) "Passa a Premium": prima l'offerta (una volta ogni 10 minuti), poi il pagamento
 function intercetta(){if(!fatto||!C||document.querySelector(".bfmodal"))return false;
  if(Date.now()-(mem.inter||0)<600000)return false;mem.inter=Date.now();salva();apri();return true;}
 new MutationObserver(prova).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
 let n=0;const t=setInterval(()=>{prova();if(fatto||++n>30)clearInterval(t);},1000);
 setInterval(()=>{if(fatto)osserva();},2000);
 // ---------- anteprima per l'admin: ?campagna=estate (o inverno, pasqua, black, cyber) ----------
 function anteprima(k,anno){if(!admin())return "solo admin";const y=anno||new Date().getUTCFullYear()+(k=="black"||k=="cyber"?0:1);
  const c=agenda(y).find(x=>x.k==(k=="cyber"?"black":k));if(!c)return "campagna sconosciuta";
  forzata=Object.assign({},c,{ora:c.da+2*864e5+5*36e5,giorno:k=="cyber"?iso(c.giornoFine):k=="black"?iso(c.bf):iso(piu(new Date(c.da+864e5),1))});
  C=forzata;fatto=true;document.querySelector(".bfmodal")&&document.querySelector(".bfmodal").remove();striscia&&striscia.remove();striscia=null;
  mostraStriscia();clearInterval(giro);giro=setInterval(tic,1000);apri();return c;}
 const q=new URLSearchParams(location.search).get("campagna");
 if(q){const v=new MutationObserver(()=>{if(admin()){v.disconnect();anteprima(q);}});v.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});if(admin())anteprima(q);}
 // elenco leggibile delle date (ora italiana) per il controllo
 const fmt=ms=>new Date(ms).toLocaleString("it-IT",{timeZone:"Europe/Rome",weekday:"short",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
 window.ebCampagne={agenda:y=>agenda(y||new Date().getUTCFullYear()).map(c=>({campagna:c.nome,dal:fmt(c.da),al:fmt(c.a-1000),offerta:c.offerta,pronta:c.pronta})),anteprima,attuale};
 window.ebBlackFriday={apri,idoneo,intercetta};
}catch(e){console.warn("[EdgeValor] campagne",e);}})();
