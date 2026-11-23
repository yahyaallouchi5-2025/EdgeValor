/* ---------- 00n_lingua.js - v8.87 INGLESE DELLA SCHEDA NOTIZIE (44b_notizie.js) ----------
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
"NFP, CPI, Fed, vendite, PIL e banche centrali: come reagiscono cambi, oro, indici e crypto quando il dollaro esce forte o debole. Grafico orario con la traccia di ogni notizia.":
 "NFP, CPI, Fed, retail sales, GDP and central banks: how FX, gold, indices and crypto react when the dollar comes out strong or weak. Hourly chart with the trace of every news."
});
(function(){
 // esiti per valuta: "dollaro forte" (registro), "Dollaro forte" (titoli e bottoni), "Dollaro debole", "dollaro in linea"
 const V={dollaro:"dollar",euro:"euro",sterlina:"pound",yen:"yen","franco svizzero":"Swiss franc","dollaro canadese":"Canadian dollar",
  "dollaro australiano":"Australian dollar","dollaro neozelandese":"New Zealand dollar",valuta:"currency"};
 const E={forte:"strong",debole:"weak","in linea":"in line"},M=s=>s.charAt(0).toUpperCase()+s.slice(1);
 for(const it in V)for(const e in E){EB_EN[it+" "+e]=V[it]+" "+E[e];EB_EN[M(it)+" "+e]=M(E[e])+" "+V[it];}
 EB_RX.unshift(
  [/^(.+) su tutti gli strumenti$/,(m,d)=>(EB_EN[d]||d)+" on all instruments"],
  [/^(.+) \(fino al (\d{4})\)$/,(m,s,a)=>s+" (until "+a+")"]);
})();
