/* ---------- 39_novita.js - v7.94 NOVITA' DELLA PIATTAFORMA (voce "Novita'" nel Profilo) ----------
   Elenco delle novita' scritto a mano qui sotto (NOVITA): la piu' recente PRIMA. Ogni voce = {d: data, t: titolo,
   x: una riga di spiegazione, s: scheda da aprire (facoltativa), p: true se e' Premium}.
   - un PALLINO sulla voce "Novita'" e sul pulsante "Profilo" quando c'e' qualcosa che l'utente non ha ancora visto
     (si ricorda nel browser la data dell'ultima novita' vista: localStorage "ebNovita");
   - toccando la voce si apre una finestra con le ultime 5 novita'; "Vai" apre la scheda giusta.
   Niente dati da server: le novita' escono con la versione del sito che le contiene.
   DEBUG: F12 -> Console -> localStorage.removeItem("ebNovita") fa ricomparire il pallino. */
(function(){try{
 const NOVITA=[
  // v8.64 regola di Ya (21/11/2026): ogni scheda lavorata va nelle novita' con un messaggio semplice "Aggiornamento scheda X"
  // v8.73 d con l'ora ("AAAA-MM-GGTHH"): una seconda novita' nello stesso giorno risulta nuova anche per chi ha visto la prima
  {d:"2026-11-28T21",t:"Aggiornamento scheda Portafogli",x:"Rischio del mese più pulito: tolti i numeri che comparivano già in Andamento e in alto.",s:"port",p:true},
  {d:"2026-11-28T18",t:"Aggiornamento Novità e grafici",x:"Nell'elenco Mercati arriva anche la rotazione mensile dei portafogli. Nel grafico delle coppie: da quando i tassi favoriscono una valuta e cosa dicevano prima.",s:"port"},
  {d:"2026-11-28T16",t:"Aggiornamento Quadro economico",x:"Eurozona con la disoccupazione e l'allarme. Accanto a ogni dato c'è il mese a cui si riferisce: è l'ultimo pubblicato dalla fonte.",s:"sig",q:"#quadro"},
  {d:"2026-11-28T14",t:"Aggiornamento Quadro economico",x:"Inflazione USA di nuovo in scheda (3,9%) e fase corretta: Espansione. Mancava il mese di confronto, ottobre 2025, mai pubblicato.",s:"sig",q:"#quadro"},
  {d:"2026-11-28T12",t:"Aggiornamento Quadro economico",x:"La fase «Recessione» ora si chiama «Rallentamento»: crescita e inflazione in calo, non una recessione del PIL. La crescita cambia direzione solo oltre una soglia minima.",s:"sig",q:"#quadro"},
  {d:"2026-11-28T10",t:"Novità in due elenchi",x:"Mercati: i cambi di stato confermati (ciclo economico, clima, allarme recessione), con lo stato di prima. Piattaforma: gli aggiornamenti del terminale.",s:""},
  {d:"2026-11-27T23",t:"Nuova testata",x:"Su PC logo, ricerca, Novità, Guida, Assistenza, lingua e account sono in una barra in alto. La barra laterale resta per le schede e la tua watchlist.",s:""},
  {d:"2026-11-27T22",t:"Aggiornamento scheda grafico",x:"La posizione degli speculatori sotto il grafico copre ora 3 anni, con il dato reale di ogni settimana. Le candele giornaliere arrivano a 3 anni: la media a 200 giorni copre tutto il grafico.",s:""},
  {d:"2026-11-27T20",t:"Nuovo pannello Invita amici",x:"Il tuo link personale, quanti amici si sono iscritti e quanti si sono abbonati, e i mesi di Premium che hai guadagnato. Chi si iscrive con il tuo link prova Premium per 14 giorni.",s:""},
  {d:"2026-11-27T18",t:"Aggiornamento scheda grafico",x:"Nuovi indicatori sul grafico: profilo del prezzo, posizione degli speculatori nel tempo, volatilità (ATR) con calma o agitazione, correlazione con dollaro e S&P 500. Si accendono dai pulsanti sopra il grafico. In alto sul grafico ora è scritto il timeframe (giornaliero o orario).",s:""},
  {d:"2026-11-27T16",t:"Aggiornamento scheda grafico",x:"Il grafico di ogni strumento ora è nostro: fasce degli speculatori, uscite del COT, notizie, medie mobili e RSI. Da telefono si legge tutto in verticale.",s:""},
  {d:"2026-11-27T00",t:"Nuova barra laterale",x:"Schede, ricerca e watchlist ora sono tutte nella barra a sinistra. Su telefono si apre dal menu in alto.",s:""},
  {d:"2026-11-26T23",t:"Aggiornamento scheda Dashboard",x:"Gli avvisi in giallo (festività, dati rinviati) ora si chiudono con la X e compaiono solo nella Dashboard. Al prossimo accesso te li ricordiamo.",s:"sig"},
  {d:"2026-11-26T22",t:"Aggiornamento scheda Dashboard",x:"Settori e Forex ridisegnati: una barra per settore che sale o scende, e tutte le coppie Forex in un solo riquadro.",s:"sig"},
  {d:"2026-11-26T18",t:"Aggiornamento scheda COT",x:"Nuovo mercato: Nikkei 225, l'indice della Borsa di Tokyo. Posizioni degli speculatori, grafico e segnali anche nella scheda Live.",s:"assets"},
  {d:"2026-11-26T08",t:"Novità spostabili",x:"Tieni premuta la stellina delle Novità e spostala dove ti è più comoda, da PC o da telefono. Resta dove la lasci.",s:""},
  {d:"2026-11-25T10",t:"Aggiornamento scheda Profilo",x:"Nuova voce «Email con le offerte»: scegli tu se ricevere le email con le offerte stagionali. Le email sul tuo account arrivano sempre.",s:""},
  {d:"2026-11-24T26",t:"Aggiornamento scheda Macro",x:"Quanto è già scontato, a colpo d'occhio: anello del punteggio, dove doveva arrivare il prezzo e dove è arrivato, affidabilità a tacche.",s:"mkt",p:true},
  {d:"2026-11-24T25",t:"Aggiornamento scheda Macro",x:"Clima di mercato più chiaro: una barra da sfavorevole a favorevole, il cerchio tratteggiato della settimana prima e quanto pesa ogni indicatore.",s:"mkt",p:true},
  {d:"2026-11-24T24",t:"Aggiornamento scheda Macro",x:"Quanto è già scontato: passa il mouse o tocca una card per sapere cosa significa il numero. I nomi degli strumenti tornano visibili nei pulsanti.",s:"mkt"},
  {d:"2026-11-24T23",t:"Aggiornamento scheda COT",x:"Il pallino della barra ha il colore del segnale: verde chiaro forte, verde, nero neutro, rosso, rosso acceso forte. Si posiziona nella fascia del segnale.",s:"assets"},
  {d:"2026-11-24T22",t:"Aggiornamento scheda Azionario",x:"Magnifiche 7: nella barra del peso ogni azienda ha il suo nome, anche le più piccole. Classifica: i numeri del mese allineati in colonna.",s:"azioni"},
  {d:"2026-11-24T21",t:"Aggiornamento scheda Abbonamento",x:"Black Friday: abbonati entro lunedì 30 novembre e mantieni la tariffa attuale finché resti abbonato. Dal 1° dicembre Premium passa a 39,99 € al mese.",s:""},
  {d:"2026-11-24T20",t:"Aggiornamento scheda Dashboard",x:"Il nastro dei prossimi eventi è di nuovo visibile e ora include gli ordini di beni durevoli e i sussidi di disoccupazione USA. Il comunicato PCE si chiama ora «Redditi, spese e PCE USA».",s:"sig"},
  {d:"2026-11-24T19",t:"Inglese in tutto il terminale",x:"Ora è in inglese anche la schermata di accesso (dove scegli la lingua prima di entrare), l'assistenza, l'abbonamento e i PDF scaricati.",s:""},
  {d:"2026-11-24T18",t:"Aggiornamento scheda Azionario",x:"Nuovo riquadro Magnifiche 7: quanto pesano Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta e Tesla nell'S&P 500 e nel Nasdaq-100, chi ha spinto l'indice e una card per azienda da girare.",s:"azioni"},
  {d:"2026-11-24T17",t:"Aggiornamento scheda Crypto",x:"Nel profilo di Bitcoin il ciclo dell'halving: a che punto siamo del ciclo e il confronto con i cicli passati allo stesso giorno.",s:"btc"},
  {d:"2026-11-24T16",t:"Aggiornamento scheda Paesi",x:"Su telefono il nome del paese si legge per intero e Tendenza e Regime hanno la loro etichetta, senza sovrapposizioni.",s:"sig"},
  {d:"2026-11-24T15",t:"Inglese per tutti",x:"Nel Profilo puoi scegliere la lingua del terminale: italiano o inglese.",s:"",q:".pflingua"},
  {d:"2026-11-24T12",t:"Aggiornamento scheda COT",x:"I posizionamenti cambiano solo quando esce il report COT (il venerdì alle 21:30, il lunedì nelle settimane di festa USA): fra un report e l'altro restano fermi.",s:"assets",h:"mercati"},
  {d:"2026-11-24T10",t:"Aggiornamento scheda Portafogli",x:"Grafico del capitale rifatto: in alto le tre fasi (backtest, verifica e live) con rendimento e drawdown di ognuna; nel grafico il drawdown peggiore di ogni fase è segnato dal picco al minimo. Il live ora è in ambra.",s:"port"},
  {d:"2026-11-24T09",t:"Aggiornamento scheda Bitcoin",x:"Il prezzo di oggi ora si legge a destra del grafico, sulla colonna dei prezzi.",s:"btc"},
  {d:"2026-11-24T08",t:"Aggiornamento scheda Paesi",x:"Nuova colonna Inflazione: l'ultimo dato mensile di ogni paese, con la freccia se sale o scende. Anche con la stessa banca centrale, come la BCE, ogni paese ha la sua.",s:"sig"},
  {d:"2026-11-23T23",t:"Aggiornamento scheda Mercati",x:"Metti le schede nell'ordine che preferisci: tieni premuta una card finché non traballa, trascinala dove vuoi e tocca Fine. L'ordine resta nel tuo profilo, anche su telefono e tablet.",s:"mercati"},
  {d:"2026-11-23T22",t:"Aggiornamento scheda COT",x:"Più semplice: in alto dove comprano e vendono i grandi investitori, poi una card per strumento con una parola e una freccia. Tocca la card per girarla e vedere i numeri e il grafico.",s:"assets",h:"mercati",p:true},
  {d:"2026-11-23T21",t:"Aggiornamento scheda Notizie",x:"Più semplice: per ogni mercato le notizie che lo muovono, con una frase e una freccia («scende 90 volte su 100»). Tocca la card per i numeri; sotto, la mappa di 20 mercati per notizia.",s:"notizie",h:"mercati",p:true},
  {d:"2026-11-23T20",t:"Aggiornamento scheda Notizie",x:"Cos'è ogni notizia: passa il mouse su NFP, CPI, Fed e le altre (da telefono sceglila) e leggi in due righe cosa misura e cosa muove.",s:"notizie",h:"mercati",p:true},
  {d:"2026-11-23T19",t:"Aggiornamento scheda Notizie",x:"Grafico più preciso da telefono e da PC: scala dei prezzi come TradingView, mirino tenendo fermo il dito, zoom anche trascinando la scala del tempo. Vale anche per il grafico della Live.",s:"notizie",h:"mercati",p:true},
  {d:"2026-11-23T17",t:"Nuova scheda Notizie",x:"NFP, CPI, Fed, vendite, PIL e banche centrali: come reagiscono cambi, oro, indici e crypto quando il dollaro esce forte o debole. Grafico orario con la traccia di ogni notizia.",s:"notizie",h:"mercati",p:true},
  {d:"2026-11-23T15",t:"Aggiornamento scheda Live",x:"Nuovo grafico del segnale: Giornaliero con 2 anni di storia e Orario, con COT e notizie. Si sposta, si ingrandisce e va a schermo intero.",s:"verifica",h:"mercati",p:true,fn:"ebLiveMostra",lab:"Grafico"},
  {d:"2026-11-23T12",t:"Aggiornamento scheda Azionario",x:"Nelle aziende USA: spia di bolla (Euforia) e sconto con o senza cassa, con il rischio storico in una barra.",s:"azioni"},
  {d:"2026-11-23T10",t:"Aggiornamento scheda Live",x:"Candele orarie più facili da trovare: sotto ogni segnale, anche quelli in corso.",s:"verifica",h:"mercati",p:true,fn:"ebLiveMostra",lab:"Candele orarie"},
  {d:"2026-11-22T23",t:"Aggiornamento scheda Live",x:"Tocca un segnale: ora vedi anche le sue candele orarie, con la spinta degli speculatori e gli annunci all'ora esatta.",s:"verifica",h:"mercati",p:true,fn:"ebLiveMostra",lab:"Candele orarie"},
  {d:"2026-11-22T22",t:"Aggiornamento scheda Live",x:"Tocca un segnale: vedi gli annunci usciti durante il trade (Fed, BCE e le altre banche centrali) e il giorno peggiore.",s:"verifica",h:"mercati",p:true,fn:"ebLiveMostra",lab:"Annunci del segnale"},
  {d:"2026-11-22T21",t:"Aggiornamento scheda Live",x:"Nuova vista Comportamento COT: strumento per strumento, cosa fa il prezzo quando gli speculatori iniziano a spingere.",s:"verifica",h:"mercati",p:true},
  {d:"2026-11-22",t:"Aggiornamento scheda Paesi",x:"60 paesi in tre gruppi: sviluppati, emergenti e di frontiera. Stessa tabella, dati del Fondo Monetario aggiornati.",s:"sig"},
  {d:"2026-11-22",t:"Aggiornamento scheda Live",x:"Scegli lo strumento e vedi solo i suoi dati: numeri, grafico giorno per giorno e sezioni da aprire.",s:"verifica",h:"mercati",p:true},
  {d:"2026-11-22",t:"Aggiornamento scheda Macro",x:"Scegli lo strumento e leggi quanto i driver macro hanno già spinto il suo prezzo.",s:"mkt",h:"mercati",p:true},
  {d:"2026-11-22",t:"Aggiornamento scheda Dashboard",x:"In fondo a ogni famiglia i posizionamenti tornati neutri negli ultimi 7 giorni, con il perché.",s:"sig",p:true},
  {d:"2026-11-22",t:"Aggiornamento scheda Dashboard",x:"Nuovi dati COT e le prime 2 aziende della Selezione di oggi visibili in tutti i piani.",s:"sig"},
  {d:"2026-11-21",t:"Aggiornamento scheda Mercati",x:"Schede in un nuovo ordine: Macro, COT, Stagionalità, Volatilità, Correlazioni, Forex, Crypto, Live.",s:"mercati"},
  {d:"2026-11-21",t:"Aggiornamento scheda Macro",x:"Lo spread high yield ora dice se si allarga, è stabile o si restringe.",s:"mkt",h:"mercati",p:true},
  {d:"2026-11-21",t:"Aggiornamento scheda Dashboard",x:"Avviso più chiaro quando una festività USA sposta il report COT.",s:"sig"},
  {d:"2026-11-21",t:"Aggiornamento scheda Portafogli",x:"Confronto con un riferimento per ogni profilo e sezioni da aprire solo quando servono.",s:"port",p:true},
  {d:"2026-11-21",t:"Aggiornamento Guida",x:"Nuova sezione Registro del metodo: ogni modifica alle regole, con la data.",s:""},
  {d:"2026-11-18",t:"Scheda Crypto",x:"Bitcoin e le principali altcoin: prezzi, volumi, drawdown dal massimo e profilo di ogni moneta.",s:"btc",q:"#btc .cysez",h:"mercati"},
  {d:"2026-11-17",t:"Nuova scheda Bitcoin",x:"Bussola macro (Premium) e termometro del sentiment: cosa muove Bitcoin, con grafici.",s:"btc",h:"mercati"},
  {d:"2026-11-17",t:"Assistenza",x:"Abbonamento, segnalazioni e call live con il team, con il numero della richiesta.",s:""},
];
 // v9.67 CAMBI DI STATO DEI MERCATI (Ya, 28/11/2026): arrivano dal REGISTRO UNICO del backend (cot_radar/stati.py -> D.stati.cambi),
 //   gia' confermati e con la data del giorno della conferma. Qui si scrive solo il testo. Le regole stanno nel registro:
 //   prima erano ricalcolate qui nel browser (blocco v8.40/v8.44, tolto) e la data era quella del mese del dato.
 //   "Mostrami" apre la Dashboard e illumina l'elemento. cambio:1 = voce dell'elenco "Mercati" (39b_novita_chat.js).
 try{const QE=id=>`#quadro .qe-card[data-id="${id}"]:not(.on)`;
  const COME={ciclo:c=>({x:"Fase confermata per 2 mesi di fila. Solo contesto, non un segnale.",q:".qe-mappa",apri:QE(c.k.split(":")[1])}),
   allarme:c=>({x:"Regola sulla disoccupazione (Sahm). Solo contesto, non un segnale.",q:".qe-det",apri:QE(c.k.split(":")[1])}),
   modalita:()=>({x:"Confermata dopo 7 giorni di borsa di fila. Solo contesto, non un segnale.",q:".mm-fasi",apri:QE("usa")}),
   debito:()=>({x:"Fase confermata per 2 trimestri di fila. Solo contesto, non un segnale.",q:".cd-fasi:not(.mm-fasi)",apri:QE("usa")}),
   clima:()=>({x:"Confermato dopo 3 giorni di fila. Solo contesto, non un segnale.",q:".kz2"}),
   // v9.73 rotazione mensile dei portafogli: quanti mercati entrano ed escono per profilo (i nomi sono nella scheda)
   rotazione:c=>({t:`Rotazione di ${c.dopo.toLowerCase()}`,x:c.nota||"Composizione del mese aggiornata.",s:"port"})};
  ((D.stati&&D.stati.cambi)||[]).forEach(c=>{const f=COME[c.gruppo];if(!f)return;const m=f(c);
   NOVITA.push({d:c.d,t:m.t||`${c.nome}: ${c.prima} → ${c.dopo}`,x:m.x,s:m.s||"sig",q:m.q,h:m.h,lab:c.nome,apri:m.apri,cambio:1});});
  NOVITA.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(b.cambio||0)-(a.cambio||0));}catch(e){}   // a parita' di data prima i mercati
 // v9.67 DUE ELENCHI, ognuno con il suo limite: 10 voci "Mercati" e 10 "Piattaforma". Prima il limite era unico (10)
 //   e i nostri aggiornamenti spingevano fuori i cambi dei mercati (v8.67).
 const MAX_NOVITA=10;{const m=NOVITA.filter(n=>n.cambio).slice(0,MAX_NOVITA),p=NOVITA.filter(n=>!n.cambio).slice(0,MAX_NOVITA);
  NOVITA.length=0;NOVITA.push(...m,...p);NOVITA.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(b.cambio||0)-(a.cambio||0));}
 window.EB_NOVITA=NOVITA;                 // v8.06: la usa anche la chat delle novita' (39b_novita_chat.js)
 const btn=document.getElementById("novapri");if(!btn)return;
 const punto=btn.querySelector(".novpunto"),pf=document.getElementById("pfapri");
 const ultima=NOVITA[0].d;let vista="";try{vista=localStorage.getItem("ebNovita")||"";}catch(e){}
 const gg=d=>d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4);
 function segna(){const nuove=vista<ultima;punto.hidden=!nuove;if(pf)pf.classList.toggle("connov",nuove);}
 function apri(){const box=document.createElement("div");box.className="cmodal novmodal";
  box.innerHTML=`<div class="cmodal-box novbox" role="dialog" aria-modal="true" aria-labelledby="novt">
   <div class="cmodal-testa"><span class="cmodal-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z"/></svg></span>
    <div><h3 id="novt">Novità</h3><p>Novità e aggiornamenti in EdgeValor.</p></div><button type="button" class="fbx" aria-label="Chiudi">&#x2715;</button></div>
   <ol class="novlista">${NOVITA.slice(0,MAX_NOVITA).map(n=>`<li class="${n.d>vista?"nuova":""}"><div class="novtesta"><b>${esc(n.t)}</b>${n.p?'<em class="novp">Premium</em>':""}${n.d>vista?'<em class="novn">Nuovo</em>':""}<time>${gg(n.d)}</time></div>
    <p>${esc(n.x)}</p>${n.s?`<button type="button" class="novvai" data-s="${n.s}">Vai</button>`:""}</li>`).join("")}</ol></div>`;
  document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add("on"));
  const chiudi=()=>{box.classList.remove("on");setTimeout(()=>box.remove(),220);document.removeEventListener("keydown",tasto);};
  const tasto=e=>{if(e.key=="Escape")chiudi();};document.addEventListener("keydown",tasto);
  box.addEventListener("mousedown",e=>{if(e.target==box)chiudi();});box.querySelector(".fbx").onclick=chiudi;
  box.querySelectorAll(".novvai").forEach(b=>b.onclick=()=>{chiudi();if(typeof go=="function")go(b.dataset.s);});
  vista=ultima;try{localStorage.setItem("ebNovita",ultima);}catch(e){}segna();}
 btn.onclick=apri;segna();
}catch(e){console.error("[EdgeValor] novita:",e);}})();
