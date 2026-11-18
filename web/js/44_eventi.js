
/* ---------- 44_eventi.js - v8.03 EVENTI (anteprima SOLO ADMIN): come si muovono i titoli intorno ai fatti noti ----------
   Card nella pagina Mercati (41_hub_mercati.js). Per ora la vede solo l'admin (classe eb-admin su <html>, 36_account.js):
   per gli altri utenti il pulsante resta nascosto e la sezione vuota. Quando Ya la approva si toglie il controllo ADMIN.
   NUMERI: dagli studi del 18/11/2026 (studi/studio_eventi.py e studio_eventi_sp500.py, risultati nei file risultati_*.txt):
     rendimento OLTRE l'S&P 500; giorno 0 = ultima chiusura prima dell'evento; "prima" = dai 60 giorni prima al giorno 0,
     "dopo" = dal giorno 0 a 5 e 60 giorni dopo. PERCORSO = mediana dei casi, giorno per giorno (media mobile di 3 giorni).
   Solo i risultati che reggono o che si spiegano: nello studio su 408 aziende dell'S&P 500 la maggior parte delle
   "aziende coerenti" era quanto ci si aspetta per caso, quindi si mostrano settori e gruppi con una ragione economica.
   DEBUG: ebEventi.disegna() */
(function(){try{
 const el=$("eventi"),bt=document.querySelector('#nav button[data-t="eventi"]');if(!el)return;
 const ADMIN=()=>document.documentElement.classList.contains("eb-admin");
 const PERC={"iphone":[-8.8,-8.4,-8.3,-7.8,-8.2,-7.9,-7.7,-7.4,-7.4,-7.2,-6.5,-6.1,-6.2,-6.3,-6.4,-6.2,-6.1,-5.7,-5.7,-5.8,-5.7,-5.3,-4.7,-4.5,-4.5,-4.1,-4.3,-4.0,-4.6,-4.5,-4.2,-3.7,-2.9,-2.6,-2.3,-2.8,-3.2,-3.3,-3.2,-2.6,-2.4,-1.7,-1.3,-0.7,-0.3,-0.1,0.1,-0.0,-0.4,-0.7,-0.5,-0.4,-0.1,-0.1,0.3,0.1,0.3,0.2,0.4,0.2,0.0,-0.4,-0.9,-1.2,-1.5,-1.5,-1.4,-1.0,-0.3,0.5,1.2,0.9,0.2,-0.0,0.3,0.7,0.5,-0.5,-1.3,-1.6,-1.5,-1.4,-1.8,-1.6,-1.7,-1.5,-1.6,-1.7,-1.9,-2.0,-1.7,-1.2,-0.5,-0.5,-0.4,-0.5,-0.1,0.2,0.3,-0.0,-0.7,-1.6,-2.2,-2.5,-2.2,-1.9,-1.2,-0.5,-0.3,-0.1,0.1,0.9,1.6,2.3,2.4,1.7,0.7,0.1,-0.1,-0.3,-0.5],"guerra":[-1.2,-1.5,-1.8,-2.1,-2.1,-1.8,-1.3,-0.8,-1.1,-1.6,-2.0,-1.8,-1.3,-1.0,-0.9,-1.0,-1.5,-1.7,-1.7,-1.5,-1.3,-1.3,-1.0,-1.0,-1.0,-0.9,-0.6,-0.3,-0.5,-0.6,-0.9,-0.9,-0.9,-1.0,-1.0,-1.2,-1.0,-1.0,-1.0,-1.1,-1.1,-1.1,-1.1,-1.0,-1.2,-1.0,-1.1,-0.7,-0.7,-0.5,-0.6,-0.5,-0.4,-0.4,-0.5,-0.5,-0.5,-0.5,-0.5,-0.5,0.0,0.6,1.4,1.9,2.4,2.5,2.4,2.2,2.0,2.0,2.2,2.3,2.5,2.8,2.9,2.4,2.0,2.2,2.5,3.1,3.2,3.4,3.0,2.7,2.5,2.5,2.5,2.4,2.5,2.9,3.2,3.7,4.0,4.7,5.1,5.3,5.2,5.0,4.5,4.2,3.5,3.2,3.0,3.2,3.4,3.4,3.6,3.8,3.9,3.7,3.5,3.4,3.5,3.5,3.5,3.3,3.4,3.3,3.5,3.5,3.7],"gta":[-10.4,-9.8,-9.2,-9.8,-10.5,-10.2,-8.2,-6.6,-5.9,-5.6,-6.0,-6.0,-6.0,-5.7,-6.0,-3.3,-0.4,2.8,2.1,2.7,3.1,4.0,3.5,2.3,1.7,1.4,1.0,1.1,1.4,3.1,3.7,3.4,3.0,2.2,1.5,1.1,1.9,3.3,4.3,4.9,5.6,6.1,5.3,4.7,3.4,2.8,0.7,-0.1,-0.5,0.7,2.4,3.7,4.9,5.1,4.6,2.7,0.9,-0.1,-0.4,-0.4,0.0,-0.5,-0.8,-1.9,-1.4,0.2,2.2,2.8,2.0,1.0,0.7,0.6,0.7,0.8,0.2,-0.5,-0.8,-1.0,-1.9,-2.4,-2.7,-2.7,-3.1,-3.5,-3.7,-3.9,-4.3,-4.7,-4.7,-3.7,-2.3,-2.8,-2.3,-2.0,0.2,0.7,0.3,-1.2,-2.8,-2.6,-2.1,-1.3,-1.6,-1.9,-3.2,-4.8,-6.3,-7.2,-6.9,-6.9,-6.2,-6.1,-6.8,-7.9,-9.0,-9.5,-9.8,-9.6,-9.4,-9.3,-9.5]};
 // ogni card: titolo, chi, giudizio [classe, testo], casi, percorso (o barre), tre numeri, frase, prossimo evento, titoli
 const CARD=[
  {t:"Nuovo iPhone",chi:"Apple",g:["ok","Regge"],n:19,p:"iphone",num:[["Prima · 60 g",11.9],["Dopo · 5 g",-1.2],["Dopo · 60 g",0.8]],
   f:"Sale nell'attesa, scende dopo l'annuncio.",info:"19 presentazioni dal 2007. Nei 60 giorni prima Apple ha battuto l'S&P 500 nell'89% dei casi (normalmente nel 62%); nei 5 giorni dopo solo nel 32%."},
  {t:"Inizio di una guerra",chi:"Difesa USA",g:["ok","Regge"],n:7,p:"guerra",num:[["Prima · 60 g",1.2],["Dopo · 5 g",4.3],["Dopo · 60 g",3.8]],
   f:"Sale dopo la notizia, se è una sorpresa.",tit:["NOC","LMT","LHX","GD"],
   info:"7 eventi dal 2008 (Georgia, Crimea, Siria, Soleimani, Ucraina, 7 ottobre, Israele-Iran). Northrop, Lockheed, L3Harris e General Dynamics sono salite oltre l'S&P 500 nei 5 giorni dopo in 7 casi su 7. Petroliferi e compagnie aeree: nessuna reazione stabile."},
  {t:"Elezioni USA",chi:"Settori",g:["ok","Regge per settore"],n:5,bar:[["Finanza",1.2,"4 su 5"],["Beni voluttuari",-1.6,"4 su 5"],["Servizi pubblici",-2.5,"4 su 5"],["Immobiliare",-3.0,"4 su 5"]],
   f:"Dopo il voto salgono le banche, scendono i settori legati ai tassi.",
   info:"5 elezioni dal 2008, mediana delle aziende dell'S&P 500 di ogni settore nei 5 giorni dopo il voto, oltre l'S&P 500. Il settore va nella stessa direzione in 4 elezioni su 5, chiunque vinca."},
  {t:"Grande gioco Rockstar",chi:"Take-Two",g:["poco","Pochi casi"],n:3,p:"gta",num:[["Prima · 60 g",25.7],["Dopo · 5 g",0.7],["Dopo · 60 g",-8.3]],
   f:"Sale nei mesi prima, debole dopo l'uscita.",prox:"GTA VI esce il 19/11/2026",
   info:"GTA IV (2008), GTA V (2013), Red Dead Redemption 2 (2018). Solo 3 casi: è un racconto, non una regola."}];
 const pc=v=>(v>0?"+":v<0?"&minus;":"")+fx(Math.abs(v),1)+"%",cl=v=>v>0?"up":v<0?"down":"";
 // grafico del percorso: verde acqua prima dell'evento, bianco dopo; pallino = giorno dell'evento
 function svg(v){const W=300,H=92,T=8,B=8,X=i=>i*W/120;let lo=Math.min(0,...v),hi=Math.max(0,...v);const pd=(hi-lo)*.12||1;lo-=pd;hi+=pd;
  const Y=y=>T+(hi-y)/(hi-lo)*(H-T-B),pt=a=>a.map(([i,y])=>X(i).toFixed(1)+","+Y(y).toFixed(1)).join(" "),I=v.map((y,i)=>[i,y]);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="${T}" width="${X(60)}" height="${H-T-B}" class="evpre"/>
   <line x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="ev0"/><line x1="${X(60)}" x2="${X(60)}" y1="2" y2="${H-B}" class="evday"/>
   <polyline points="${pt(I.slice(0,61))}" class="evln evlnp"/><polyline points="${pt(I.slice(60))}" class="evln"/></svg>
   <i class="evpt" style="left:50%;top:${(Y(0)/H*100).toFixed(1)}%"></i>`;}
 const barre=b=>{const m=Math.max(...b.map(x=>Math.abs(x[1])));return `<div class="evbar">${b.map(([n,v,k])=>`<div class="evbr"><span>${n}</span>
   <i class="evbt"><i class="${cl(v)}" style="${v<0?"right:50%":"left:50%"};width:${(Math.abs(v)/m*50).toFixed(1)}%"></i></i><b class="${cl(v)}">${pc(v)}</b><small>${k}</small></div>`).join("")}</div>`;};
 function disegna(){if(!ADMIN()){el.innerHTML="";return;}
  // la (i) del titolo la aggiunge 01_base.js: il paragrafo "sub" subito dopo l'<h2> diventa la spiegazione nascosta
  el.innerHTML=`<h2>Eventi <span class="tag evtag">anteprima admin</span></h2>
   <p class="sub">Come si muovono i titoli intorno ai fatti noti, OLTRE l'S&amp;P 500. <b>Prima</b> = nei 60 giorni prima dell'evento; <b>dopo</b> = nei 5 e 60 giorni dopo. Il grafico è il percorso tipico (mediana dei casi): verde acqua l'attesa, bianco il dopo. <b>Regge</b> = stessa direzione nella grande maggioranza dei casi; con meno di 5 casi è un racconto, non una regola. Studio su 408 aziende dell'S&amp;P 500 dal 2008: si mostrano solo i gruppi che reggono e hanno una ragione economica.</p>
   <div class="evgrid">${CARD.map((c,i)=>`<article class="evc">
    <header><div><small>${c.chi}</small><h3>${c.t}</h3></div><span class="evb ${c.g[0]}">${c.g[1]} · ${c.n} ${c.n==1?"caso":"eventi"}</span>
     <button type="button" class="info" data-apri="evi${i}" data-k="evi${i}" aria-expanded="false" aria-label="Dettagli">i</button></header>
    <p id="evi${i}" class="sub infotesto">${c.info}</p>
    ${c.p?`<div class="evg">${svg(PERC[c.p])}</div><div class="evax"><span>60 giorni prima</span><span>evento</span><span>60 giorni dopo</span></div>
     <div class="evn">${c.num.map(([l,v])=>`<div><small>${l}</small><b class="${cl(v)}">${pc(v)}</b></div>`).join("")}</div>`:barre(c.bar)}
    <p class="evf">${c.f}</p>
    ${c.tit||c.prox?`<div class="evpiede">${(c.tit||[]).map(t=>`<span class="evtk">${t}</span>`).join("")}${c.prox?`<span class="evnext">${c.prox}</span>`:""}</div>`:""}
   </article>`).join("")}</div>`;}
 // pulsante nascosto finche' il database non conferma l'admin; poi compare (anche nella pagina Mercati a card)
 const aggiorna=()=>{if(bt)bt.style.display=ADMIN()?"":"none";};aggiorna();
 new MutationObserver(()=>{aggiorna();if(el.innerHTML==""||!ADMIN())disegna();}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
 if(bt)bt.addEventListener("click",disegna);
 disegna();
 window.ebEventi={disegna};
}catch(e){console.error("[EdgeValor] eventi:",e);}})();
