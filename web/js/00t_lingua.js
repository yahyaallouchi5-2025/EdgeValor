/* ---------- 00t_lingua.js - v8.05 TRADUTTORE DEL TERMINALE (italiano -> inglese) ----------
   Ultimo dei file 00_: parte dopo che 00a, 00b e i dizionari 00c..00s hanno riempito EB_EN ed EB_RX.
   Per ogni testo della pagina (e title, aria-label, placeholder) prova in quest'ordine:
     1) EB_EN["testo esatto"]
     2) SCHEMA CON I NUMERI: ogni numero diventa "#" ("Mediana delle prossime 4 settimane: +3.96%" ->
        "Mediana delle prossime # settimane: #%"); se lo schema e' nel dizionario i numeri si rimettono in ordine
     3) regole EB_RX (testi con nomi variabili, es. "in totale). Oggi: EUR")
     4) testi composti: si divide su " · ", " / ", ": ", " → " e si traduce ogni pezzo (es. "Rame · Metalli")
   Se nulla funziona il testo resta in italiano e finisce in ebLingua.mancanti() per il debug.
   NUMERI: stessa regola nel dizionario e qui (NUM): segno + o − facoltativo, cifre, punti, virgole, barre, due punti. */
EB_RX.unshift(
 [/^in totale\)\. Oggi: (.+)$/,"in total). Today: $1"],
 [/^le prossime quattro\. Barra e numero = anni in cui (.+) è salito su quelli osservati(.*)$/,(m,a,b)=>": the next four. Bar and number = years in which "+a+" rose out of those observed"+(b?"; next to it the typical change.":".")],
 [/^: le prossime quattro\. Barra e numero = anni in cui (.+) è salito su quelli osservati(.*)$/,(m,a,b)=>": the next four. Bar and number = years in which "+a+" rose out of those observed"+(b?"; next to it the typical change.":".")],
 [/^nelle ultime (\d+) settimane: (.+)$/,(m,n,r)=>"in the last "+n+" weeks: "+ebFrasi(r)],
 [/^\(produttori e banche che si coprono\): (.+)$/,(m,r)=>"(producers and banks hedging): "+ebFrasi(r)],
 [/^\(report TFF, informativo\): (.+)$/,(m,r)=>"(TFF report, informative): "+ebFrasi(r)],
 [/^\(([^)]*)\) · tassi negli ultimi (\d+) mesi: (.+)$/,(m,a,n,r)=>"("+a.replace("ª","th")+") · rates over the last "+n+" months: "+ebFrasi(r)],
 [/^(.+) forte \/ (.+) (forte|debole)$/,(m,a,b,c)=>a+" strong / "+b+" "+(c=="forte"?"strong":"weak")],
 [/^(.+) debole \/ (.+) (forte|debole)$/,(m,a,b,c)=>a+" weak / "+b+" "+(c=="forte"?"strong":"weak")],
 [/^(\S+) debole$/,"$1 weak"],[/^(\S+) forte$/,"$1 strong"],
 [/^· Notizia: (.+) →$/,(m,a)=>"· News: "+(EB_EN[a]||a)+" →"],
 [/^comprano (\S+)$/,"buying $1"],[/^vendono (\S+)$/,"selling $1"],[/^neutri su (\S+)$/,"neutral on $1"],
 [/^(.+): (NEUTRO|RIALZO|RIBASSO|FORTE RIALZO|FORTE RIBASSO)$/,(m,a,b)=>(EB_EN[a]||a)+": "+EB_EN[b]]
);
// frasi ricorrenti dentro testi con nomi variabili (si sostituiscono dentro il testo, dalla piu' lunga)
const EB_FR=[
 ["molto in acquisto su ","heavily buying "],["molto in vendita su ","heavily selling "],
 ["nella norma, nessuna indicazione.","normal, no indication."],["posizioni nella norma.","normal positions."],
 ["banche al minimo di ","banks at a low of "],["banche al massimo di ","banks at a high of "],
 ["hedge fund al minimo di ","hedge funds at a low of "],["hedge fund al massimo di ","hedge funds at a high of "],
 [" anni"," years"],
 ["(chiusura di short: spinta piu' debole)","(short covering: weaker push)"],
 ["(liquidazione di long: spinta piu' debole)","(long liquidation: weaker push)"],
 ["(nuovi short: trend ribassista sano)","(new shorts: healthy downtrend)"],
 ["(nuovi long: trend sano)","(new longs: healthy trend)"],
 ["(open interest stabile: nessuna conferma)","(stable open interest: no confirmation)"],
 [" punti (ferma)"," points (on hold)"],[" punti (rialzo)"," points (hiking)"],[" punti (taglio)"," points (cutting)"],
 [" (ferma)"," (on hold)"],[" (rialzo)"," (hiking)"],[" (taglio)"," (cutting)"],[" punti"," points"]
];
function ebFrasi(s){for(const [a,b] of EB_FR)s=s.split(a).join(b);return s;}
(function(){try{
 // selettore nel Profilo: IT / EN (si ricarica la pagina: ogni scheda si ridisegna nella lingua scelta)
 document.querySelectorAll("[data-lang]").forEach(b=>{b.classList.toggle("on",b.dataset.lang==EB_LANG);b.setAttribute("aria-pressed",b.dataset.lang==EB_LANG);
  b.onclick=()=>{if(b.dataset.lang==EB_LANG)return;try{localStorage.setItem("ebLang",b.dataset.lang);}catch(e){}location.reload();};});
 window.ebTr=s=>s;                                     // v9.10 testi fuori dalla pagina (PDF, avvisi): in italiano restano come sono
 if(EB_LANG!="en"){window.ebLingua={lang:EB_LANG};return;}
 const SALTA=/^(SCRIPT|STYLE|TEXTAREA|CODE)$/,ATTR=["title","aria-label","placeholder"],manca=new Set();
 const NUM=/[+\-−]?\d[\d.,/:]*/g,SEP=[" · "," / ",": "," → "];
 // traduce un testo gia' normalizzato; null = nessuna traduzione
 function cerca(k,prof){
  if(!k)return null;
  let o=EB_EN[k];if(o!=null)return o;
  const nn=k.match(NUM);
  if(nn){const sc=k.replace(NUM,"#"),v=EB_EN[sc];if(v!=null){let i=0;return v.replace(/#/g,()=>nn[i++]??"");}}
  for(const [r,s] of EB_RX){if(r.test(k))return k.replace(r,s);}
  if(prof<3)for(const sp of SEP){if(k.includes(sp)){const p=k.split(sp);let cambia=false;
    const t=p.map(x=>{const y=cerca(x.trim(),prof+1);if(y!=null&&y!=x.trim()){cambia=true;return x.replace(x.trim(),y);}return x;});
    if(cambia)return t.join(sp);}}
  return null;}
 function tr(v){const k=v.replace(/\s+/g," ").trim();if(!k||!/[A-Za-zÀ-ù]/.test(k))return null;
  const o=cerca(k,0);
  if(o==null){if(/[àèéìòù]|\b(il|la|di|che|per|non|con|dal|della|del)\b/i.test(k))manca.add(k);return null;}
  if(o==k)return null;
  return v.match(/^\s*/)[0]+o+v.match(/\s*$/)[0];}
 function elem(e){for(const a of ATTR){const v=e.getAttribute&&e.getAttribute(a);if(v){const o=tr(v);if(o!=null)e.setAttribute(a,o.trim());}}}
 function giro(r){
  if(r.nodeType==3){const p=r.parentElement;if(p&&!SALTA.test(p.tagName)&&!p.closest("[data-noi18n]")){const o=tr(r.nodeValue);if(o!=null)r.nodeValue=o;}return;}
  if(r.nodeType!=1||(r.closest&&r.closest("[data-noi18n]")))return;
  if(SALTA.test(r.tagName)){elem(r);return;}               // v9.10 caselle di testo: si traduce il placeholder, non quello che scrive l'utente
  elem(r);
  const w=document.createTreeWalker(r,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType==1&&(n.hasAttribute("data-noi18n")||(SALTA.test(n.tagName)&&(elem(n),true)))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n;while(n=w.nextNode()){if(n.nodeType==3){const o=tr(n.nodeValue);if(o!=null)n.nodeValue=o;}else elem(n);}}
 // v9.10 stesso traduttore per i testi che non passano dalla pagina: PDF (01b_pdf.js) e finestre di avviso
 window.ebTr=s=>{if(s==null||typeof s!="string")return s;const o=tr(s);return o==null?s:o;};
 giro(document.body);document.title=document.title.replace("Terminale di analisi dei mercati","Market analysis terminal");
 // ogni cosa disegnata dopo (schede, popup, tabelle) passa dal traduttore prima di essere mostrata
 new MutationObserver(ms=>{for(const m of ms){if(m.type=="childList")m.addedNodes.forEach(giro);
  else if(m.type=="characterData")giro(m.target);else if(m.type=="attributes")elem(m.target);}})
  .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
 window.ebLingua={lang:EB_LANG,mancanti:()=>[...manca]};
}catch(e){console.error("[EdgeValor] lingua:",e);}})();
