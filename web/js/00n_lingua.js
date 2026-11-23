/* ---------- 00n_lingua.js - v8.87 INGLESE DELLA SCHEDA NOTIZIE (44b_notizie.js); v8.91 anche la scheda COT semplice ----------
   Stesso formato degli altri dizionari: chiave = testo italiano esatto, numeri = "#". I pezzi separati da " · " si
   traducono da soli (00t_lingua.js), quindi bastano le chiavi dei singoli pezzi ("# casi", "sale #%", ...).
   Esiti per valuta ("dollaro forte", "Euro debole", ...) generati qui sotto: chiavi esatte, prima delle regole EB_RX.
   DEBUG: ebLingua.mancanti() con la pagina in EN. */
Object.assign(EB_EN,{
"Come reagiscono i mercati alle notizie macro ad alto impatto, ora per ora.":"How markets react to high-impact macro news, hour by hour.",
"Prima ora":"First hour",
"= dalla chiusura dell'ora prima alla chiusura della candela della notizia.":"= from the close of the previous hour to the close of the news candle.",
"Esito":"Outcome",
"= come ha reagito la valuta della notizia nella prima ora (per i dati USA il dollaro, misurato su tutte le coppie di valute):":"= how the currency of the news reacted in the first hour (for US data the dollar, measured across all currency pairs):",
"se si è mossa almeno # volte un'ora normale, altrimenti":"if it moved at least # times a normal hour, otherwise",
"in linea":"in line",
". È l'esito letto dal prezzo, non il confronto con il dato atteso.":". It is the outcome read from the price, not the comparison with the expected figure.",
"× normale":"× normal",
"= quante volte la mossa è più grande della stessa ora negli altri giorni (ultimi #). Se il mercato era chiuso all'ora della notizia (azioni USA alle #) la notizia non si conta. Le banche centrali fuori dagli USA si registrano da settembre # Registro di quello che è successo, non una previsione né un consiglio.":
 "= how many times the move is larger than the same hour on other days (last #). If the market was closed at the time of the news (US stocks at #) the news is not counted. Central banks outside the US are recorded from September # A record of what happened, not a forecast or advice.",
"Mossa della prima ora":"First-hour move",
"Dopo l'esito":"After the outcome",
"Mossa mediana dello strumento nella prima ora quando la notizia rende la sua valuta forte o debole, quante volte è salito e la mossa mediana a # ore. Servono almeno # casi.":
 "Median move of the instrument in the first hour when the news makes its currency strong or weak, how often it rose and the median move at # hours. At least # cases are needed.",
"La stessa misura su tutti i mercati, per il driver scelto. «Grandezza» = mediana della prima ora in volte un'ora normale. Tocca uno strumento per aprirlo.":
 "The same measure on all markets, for the chosen driver. «Size» = median first hour in times a normal hour. Tap an instrument to open it.",
"Grandezza":"Size","Famiglia":"Family","Strumento":"Instrument",
"Come reagisce":"How it reacts",
"= notizie con una prima ora almeno # volte un'ora normale.":"= news with a first hour at least # times a normal hour.",
"Prosegue":"Continues",
"= quante volte, nelle # ore dopo, il prezzo continua nel verso della prima ora. Accanto, lo stesso conto su ore qualsiasi: il caso.":
 "= how often, in the # hours after, the price keeps going in the direction of the first hour. Beside it, the same count on any hour: chance.",
"Forte (≥#×)":"Strong (≥#×)","Prosegue se grande (≥#×)":"Continues if large (≥#×)",
"Quando":"When","# ore":"# hours","# ore #%":"# hours #%",
"# casi":"# cases","sale #%":"up #%","caso #%":"chance #%","#× normale":"#× normal","dal #":"since #",
"Mostra altre (#)":"Show more (#)","Mostra tutti (#)":"Show all (#)","pochi casi":"few cases",
"Non ancora abbastanza casi con un esito netto.":"Not enough cases with a clear outcome yet.",
"Non ancora abbastanza casi per questo driver.":"Not enough cases for this driver yet.",
"Meno di # notizie misurate: statistiche quando il registro sarà più lungo.":"Fewer than # news measured: statistics when the log is longer.",
"Il registro delle notizie arriva con il prossimo aggiornamento notturno.":"The news log arrives with the next overnight update.",
"Dati non disponibili per questo strumento.":"Data not available for this instrument.",
"Grafico non disponibile: candele orarie di questo strumento fino al # Per l'oro e l'argento di oggi: GLD e SLV.":
 "Chart not available: hourly candles for this instrument until # For today's gold and silver: GLD and SLV.",
"Vendite USA":"US retail sales","PIL USA":"US GDP",
"Come reagiscono cambi, oro, indici e crypto alle notizie macro, esito per esito.":"How FX, gold, indices and crypto react to macro news, outcome by outcome.",
"Nuova scheda Notizie":"New News tab",
"Cos'è ogni notizia: passa il mouse su NFP, CPI, Fed e le altre (da telefono sceglila) e leggi in due righe cosa misura e cosa muove.":"What each news is: hover over NFP, CPI, Fed and the others (on phone, select it) and read in two lines what it measures and what it moves.",
"Non Farm Payrolls: i nuovi posti di lavoro creati negli USA in un mese (agricoltura esclusa), insieme a disoccupazione e salari. È il dato più seguito sul lavoro americano.":"Non Farm Payrolls: the new jobs created in the US in a month (farming excluded), together with unemployment and wages. The most watched US labour figure.",
"Inflazione al consumo negli USA: di quanto salgono i prezzi che pagano le famiglie. È il dato che pesa di più sulle scelte della Fed.":"US consumer inflation: how much the prices paid by households rise. The figure that weighs most on the Fed's decisions.",
"Decisione sui tassi della banca centrale americana (FOMC), con il comunicato e la conferenza stampa. Muove dollaro, Treasury, oro e borse.":"Interest rate decision of the US central bank (FOMC), with the statement and the press conference. Moves the dollar, Treasuries, gold and stocks.",
"Vendite al dettaglio negli USA: quanto spendono i consumatori nei negozi e online. Misura la forza dei consumi, la parte più grande dell'economia americana.":"US retail sales: how much consumers spend in shops and online. Measures the strength of consumption, the largest part of the US economy.",
"Prezzi alla produzione negli USA: quanto costano beni e servizi per le aziende. Spesso anticipa l'inflazione al consumo.":"US producer prices: how much goods and services cost for companies. Often leads consumer inflation.",
"Inflazione PCE: la misura dei prezzi preferita dalla Fed, insieme a redditi e spese delle famiglie americane.":"PCE inflation: the Fed's preferred price measure, together with US household income and spending.",
"Prodotto interno lordo, prima stima del trimestre: quanto è cresciuta l'economia americana.":"Gross domestic product, first estimate of the quarter: how much the US economy grew.",
"Posti di lavoro vacanti negli USA: quante offerte di lavoro aspettano un candidato. Dice quanto è teso il mercato del lavoro.":"US job openings: how many job offers are waiting for a candidate. Shows how tight the labour market is.",
"Decisione sui tassi della Banca centrale europea, con la conferenza stampa. Muove soprattutto l'euro.":"Interest rate decision of the European Central Bank, with the press conference. Moves mainly the euro.",
"Decisione sui tassi della Bank of England, la banca centrale del Regno Unito. Muove soprattutto la sterlina.":"Interest rate decision of the Bank of England, the UK central bank. Moves mainly the pound.",
"Decisione sui tassi della Bank of Japan. Non ha un orario fisso: sul grafico l'ora è indicativa. Muove soprattutto lo yen.":"Interest rate decision of the Bank of Japan. It has no fixed time: on the chart the time is approximate. Moves mainly the yen.",
"Decisione sui tassi della Bank of Canada. Muove soprattutto il dollaro canadese.":"Interest rate decision of the Bank of Canada. Moves mainly the Canadian dollar.",
"Decisione sui tassi della Reserve Bank of Australia. Muove soprattutto il dollaro australiano.":"Interest rate decision of the Reserve Bank of Australia. Moves mainly the Australian dollar.",
"Decisione sui tassi della Reserve Bank of New Zealand. Muove soprattutto il dollaro neozelandese.":"Interest rate decision of the Reserve Bank of New Zealand. Moves mainly the New Zealand dollar.",
"Decisione sui tassi della Banca nazionale svizzera. Muove soprattutto il franco svizzero.":"Interest rate decision of the Swiss National Bank. Moves mainly the Swiss franc.",
"Trascina per spostarti, due dita per lo zoom, dito fermo per il mirino":"Drag to move, two fingers to zoom, hold your finger still for the crosshair","Aggiornamento scheda Notizie":"News tab update",
"Grafico più preciso da telefono e da PC: scala dei prezzi come TradingView, mirino tenendo fermo il dito, zoom anche trascinando la scala del tempo. Vale anche per il grafico della Live.":
 "More precise chart on phone and PC: TradingView-style price scale, crosshair by holding your finger still, zoom also by dragging the time scale. Also applies to the Live chart.",
"NFP, CPI, Fed, vendite, PIL e banche centrali: come reagiscono cambi, oro, indici e crypto quando il dollaro esce forte o debole. Grafico orario con la traccia di ogni notizia.":
 "NFP, CPI, Fed, retail sales, GDP and central banks: how FX, gold, indices and crypto react when the dollar comes out strong or weak. Hourly chart with the trace of every news."
});
// v8.91 schede COT e Notizie in versione semplice (06_strumenti.js, 44b_notizie.js, index.html)
Object.assign(EB_EN,{
"Report COT":"COT report",
"Ogni settimana la CFTC (l'autorità americana dei futures) pubblica le posizioni dei grandi investitori: fondi e speculatori. Qui vedi dove scommettono.":"Every week the CFTC (the US futures regulator) publishes the positions of the big investors: funds and speculators. Here you see where they are betting.",
"= scommettono sul rialzo,":"= betting on a rise,",
"= sul ribasso; sui Treasury comprare vuol dire scommettere su tassi in calo, sul VIX aspettarsi più volatilità.":"= on a fall; on Treasuries buying means betting on falling rates, on the VIX expecting more volatility.",
"= quasi tutti già dalla stessa parte: spesso è lì che il prezzo gira. Tocca una card per vedere i numeri e il grafico.":"= almost everyone already on the same side: that is often where the price turns. Tap a card to see the numbers and the chart.",
"Dove scommettono i grandi investitori":"Where the big investors are betting",
"Questa settimana comprano soprattutto":"This week they are mainly buying",
". Vendono soprattutto":". They are mainly selling","Vendono soprattutto":"They are mainly selling",
"Comprano di più":"Buying the most","Vendono di più":"Selling the most",
"Comprano forte":"Buying strongly","Vendono forte":"Selling strongly","Comprano":"Buying","Vendono":"Selling","Neutri":"Neutral",
"comprano":"buying","vendono":"selling",
"scommettono sul rialzo":"betting on a rise","scommettono sul ribasso":"betting on a fall",
"scommettono su tassi in calo":"betting on falling rates","scommettono su tassi in rialzo":"betting on rising rates",
"si aspettano più volatilità":"expecting more volatility","si aspettano mercati calmi":"expecting calm markets","nessuna direzione netta":"no clear direction",
"più acquisti nel mese":"more buying this month","più vendite nel mese":"more selling this month",
"Tocca per i numeri":"Tap for the numbers","I numeri":"The numbers","Grafico a candele":"Candlestick chart",
"Livello sui 3 anni":"3-year level","Netto":"Net","In 4 settimane":"In 4 weeks","Produttori e banche":"Producers and banks","Segnali giusti":"Right signals",
"#% su #":"#% of #",
"Quasi tutti già dalla stessa parte: spesso è lì che il prezzo gira":"Almost everyone already on the same side: that is often where the price turns",
"Come reagiscono i mercati alle notizie macro più importanti.":"How markets react to the most important macro news.",
"o":"or","debole":"weak","Quanto muove":"How much it moves",
"= come ha reagito il dollaro nella prima ora dopo la notizia, misurato su tutte le coppie di valute (per le banche centrali fuori dagli USA, la loro valuta): è l'esito letto dal prezzo.":
 "= how the dollar reacted in the first hour after the news, measured across all currency pairs (for central banks outside the US, their currency): it is the outcome read from the price.",
"# volte su #":"# times out of #",
"= in # notizie su # con quell'esito il mercato è andato in quella direzione nella prima ora.":"= in # news out of # with that outcome the market went in that direction in the first hour.",
"= quanto è grande la prima ora rispetto alla stessa ora negli altri giorni. Tocca una card per vedere i numeri. Se il mercato era chiuso all'ora della notizia (azioni USA alle #) la notizia non si conta. Registro di quello che è successo, non una previsione.":
 "= how large the first hour is compared with the same hour on other days. Tap a card to see the numbers. If the market was closed at the time of the news (US stocks at #) the news is not counted. A record of what happened, not a forecast.",
"Altri mercati":"Other markets","Euro/Dollaro":"Euro/Dollar","Dollaro/Yen":"Dollar/Yen","Treasury 20 anni":"Treasury 20Y","Petrolio":"Oil",
"Azioni":"Stocks","Tassi e materie prime":"Rates and commodities","Emergenti":"Emerging",
"Le notizie che lo muovono di più:":"The news that moves it most:","Non ancora abbastanza notizie misurate.":"Not enough news measured yet.",
"sale # volte su #":"rises # times out of #","scende # volte su #":"falls # times out of #","nessuna direzione chiara":"no clear direction",
"sale # volte su # (# notizie)":"rises # times out of # (# news)","scende # volte su # (# notizie)":"falls # times out of # (# news)","nessuna direzione chiara (# notizie)":"no clear direction (# news)",
"muove moltissimo":"moves a lot","muove molto":"moves much","muove abbastanza":"moves fairly","muove poco":"moves little",
"Quanto è grande la prima ora rispetto a un'ora normale":"How large the first hour is compared with a normal hour",
"# notizie dal #":"# news since #","Mossa tipica":"Typical move","#× il normale":"#× normal","Prosegue dopo":"Continues after","a # ore #%":"after # hours #%",
"cosa fanno tutti i mercati":"what all markets do","Cosa fanno tutti i mercati":"What all markets do",
"Una notizia su 20 mercati che tutti conoscono: verde sale, rosso scende, grigio nessuna direzione chiara. Più è intenso il colore, più spesso va in quella direzione. Tocca un mercato per aprirlo.":
 "One news on 20 markets everyone knows: green rises, red falls, grey no clear direction. The stronger the colour, the more often it goes that way. Tap a market to open it.",
"Notizia della mappa":"Map news","Registro di tutte le notizie":"Log of all news","incerto":"unclear","# su #":"# of #",
"Non ancora abbastanza casi per questa notizia.":"Not enough cases for this news yet.",
"Meno di # notizie misurate: le card arrivano quando il registro sarà più lungo.":"Fewer than # news measured: the cards arrive when the log is longer.",
"Nuovi posti di lavoro negli USA, con disoccupazione e salari.":"New US jobs, with unemployment and wages.",
"Inflazione: di quanto salgono i prezzi per le famiglie USA.":"Inflation: how much prices rise for US households.",
"Decisione sui tassi della banca centrale americana.":"Interest rate decision of the US central bank.",
"Quanto spendono i consumatori americani.":"How much US consumers spend.",
"Prezzi pagati dalle aziende USA: anticipa l'inflazione.":"Prices paid by US companies: leads inflation.",
"L'inflazione preferita dalla Fed.":"The Fed's preferred inflation.",
"Quanto cresce l'economia americana nel trimestre.":"How much the US economy grows in the quarter.",
"Offerte di lavoro aperte negli USA.":"Open job offers in the US.",
"Decisione sui tassi della Banca centrale europea.":"Interest rate decision of the European Central Bank.",
"Decisione sui tassi della banca centrale inglese.":"Interest rate decision of the UK central bank.",
"Decisione sui tassi della banca centrale giapponese.":"Interest rate decision of the Japanese central bank.",
"Decisione sui tassi della banca centrale canadese.":"Interest rate decision of the Canadian central bank.",
"Decisione sui tassi della banca centrale australiana.":"Interest rate decision of the Australian central bank.",
"Decisione sui tassi della banca centrale neozelandese.":"Interest rate decision of the New Zealand central bank.",
"Decisione sui tassi della banca centrale svizzera.":"Interest rate decision of the Swiss central bank.",
"Aggiornamento scheda COT":"COT tab update",
"Usiamo l'email solo per farti accedere. Entrando accetti":"We use your email only to sign you in. By signing in you accept the",
"condizioni e privacy":"terms and privacy",
"Tieni premuta una card per riordinarle come le app del telefono: trascinala dove vuoi e tocca":"Press and hold a card to rearrange them like phone apps: drag it where you want and tap",
"Fine":"Done",". L'ordine resta salvato nel tuo profilo.":". The order is saved in your profile.",
"Aggiornamento scheda Mercati":"Markets tab update",
"Metti le schede nell'ordine che preferisci: tieni premuta una card finché non traballa, trascinala dove vuoi e tocca Fine. L'ordine resta nel tuo profilo, anche su telefono e tablet.":"Put the tabs in the order you prefer: press and hold a card until it wiggles, drag it where you want and tap Done. The order stays in your profile, also on phone and tablet.",
"Metti prima le schede che usi di più":"Put the tabs you use most first",
"Tieni premuta una card finché non traballa, poi trascinala dove vuoi.":"Press and hold a card until it wiggles, then drag it where you want.",
"Ho capito":"Got it","Come riordinare le schede":"How to rearrange the tabs",
"Trascina le card per riordinarle":"Drag the cards to rearrange them","Ripristina":"Reset","Riordino delle schede":"Rearrange tabs",
"Con Google, se non hai un account, ne crei uno e accetti":"With Google, if you don't have an account, you create one and accept the",
"Più semplice: in alto dove comprano e vendono i grandi investitori, poi una card per strumento con una parola e una freccia. Tocca la card per girarla e vedere i numeri e il grafico.":
 "Simpler: at the top where the big investors buy and sell, then one card per instrument with one word and an arrow. Tap the card to flip it and see the numbers and the chart.",
"Più semplice: per ogni mercato le notizie che lo muovono, con una frase e una freccia («scende 90 volte su 100»). Tocca la card per i numeri; sotto, la mappa di 20 mercati per notizia.":
 "Simpler: for each market the news that moves it, with one sentence and an arrow («falls 90 times out of 100»). Tap the card for the numbers; below, the map of 20 markets per news."
});
(function(){
 // esiti per valuta: "dollaro forte" (registro), "Dollaro forte" (titoli e bottoni), "Dollaro debole", "dollaro in linea"
 const V={dollaro:"dollar",euro:"euro",sterlina:"pound",yen:"yen","franco svizzero":"Swiss franc","dollaro canadese":"Canadian dollar",
  "dollaro australiano":"Australian dollar","dollaro neozelandese":"New Zealand dollar",valuta:"currency"};
 const E={forte:"strong",debole:"weak","in linea":"in line"},M=s=>s.charAt(0).toUpperCase()+s.slice(1);
 for(const it in V)for(const e in E){EB_EN[it+" "+e]=V[it]+" "+E[e];EB_EN[M(it)+" "+e]=M(E[e])+" "+V[it];}
 EB_RX.unshift(
  [/^(.+) su tutti gli strumenti$/,(m,d)=>(EB_EN[d]||d)+" on all instruments"],
  [/^(.+) \(fino al (\d{4})\)$/,(m,s,a)=>s+" (until "+a+")"],
  // v8.91 testi con nomi variabili delle card e delle frasi
  [/^(.+): (Comprano forte|Comprano|Neutri|Vendono forte|Vendono)\. Tocca per i numeri$/,(m,a,b)=>a+": "+EB_EN[b]+". Tap for the numbers"],
  [/^(.+): tocca per i numeri$/,(m,a)=>(EB_EN[a]||a)+": tap for the numbers"],
  [/^Cosa muove (.+)$/,(m,a)=>"What moves "+(a=="l'oro"?"gold":(EB_EN[a]||a))],
  [/^\. Esempio: dopo (.+), se il (.+) esce forte$/,(m,a,b)=>". Example: after "+(a=="la Fed"?"the Fed":(EB_EN[a]||a))+", if the "+(V[b]||b)+" comes out strong"],
  [/^Se esce (.+) (forte|debole)$/,(m,a,b)=>"If the "+(V[a]||a)+" comes out "+E[b]]);
})();
