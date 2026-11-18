
/* ---------- 00b_lingua.js - v8.02 LINGUA (parte 2): resto del dizionario EN, regole per i testi con numeri e date,
   selettore IT/EN del Profilo e traduttore della pagina. Vedi l'intestazione di 00a_lingua.js. ---------- */
Object.assign(EB_EN,{
 // ----- fondo pagina (testo legale: la versione valida resta quella italiana delle condizioni d'uso)
 "EdgeValor ha finalità":"EdgeValor has","esclusivamente educative":"exclusively educational purposes",
 "(informazione, didattica e studio) e non è un intermediario. I contenuti (segnali, punteggi, statistiche, stagionalità, analisi e qualsiasi altra informazione) non costituiscono consulenza finanziaria, consulenza in materia di investimenti, raccomandazione personalizzata, sollecitazione o offerta all'acquisto o alla vendita di strumenti finanziari, ai sensi della normativa vigente (tra cui D.Lgs. 58/1998 - TUF e direttiva MiFID II). I modelli sono stime statistiche e i risultati passati non sono indicativi di quelli futuri. Ogni investimento può perdere in parte o del tutto il capitale,":
  "(information, teaching and study) and is not an intermediary. The content (signals, scores, statistics, seasonality, analysis and any other information) does not constitute financial advice, investment advice, a personal recommendation, solicitation or offer to buy or sell financial instruments under applicable law (including Italian Legislative Decree 58/1998 - TUF and the MiFID II directive). Models are statistical estimates and past results are not indicative of future ones. Any investment can lose part or all of the capital,",
 "anche comprando a contanti senza leva":"even when buying with cash and no leverage",
 "; con leva, futures, forex e CFD la perdita può superare il capitale investito. Ogni decisione di investimento è presa in autonomia e sotto la propria esclusiva responsabilità.":
  "; with leverage, futures, forex and CFDs losses can exceed the capital invested. Every investment decision is made independently and under one's own sole responsibility.",
 "Termini di utilizzo, diritto d'autore e privacy":"Terms of use, copyright and privacy",
 // ----- scheda Crypto (bussola, termometro, tabella)
 "Bussola macro di Bitcoin":"Bitcoin macro compass","I dati della bussola macro arrivano con il prossimo aggiornamento.":"The macro compass data arrives with the next update.",
 "Termometro del sentiment":"Sentiment thermometer","Fear & Greed":"Fear & Greed",
 ": umore del mercato crypto da 0 (paura estrema) a 100 (avidità estrema).":": crypto market mood from 0 (extreme fear) to 100 (extreme greed).",
 "Futures Bitcoin del CME":"CME Bitcoin futures",
 ": posizioni settimanali (COT). Il numero dice dove sono oggi rispetto all'ultimo anno: 0 = il punto più pessimista, 100 = il più ottimista.":
  ": weekly positions (COT). The number shows where they stand today versus the last year: 0 = the most pessimistic point, 100 = the most optimistic.",
 "È contesto, non un segnale":"It's context, not a signal",
 ": nel nostro studio dal 2018 il sentiment non ha anticipato Bitcoin in modo stabile (la regola «compra con la paura estrema» ha funzionato nel 2018-21 e non nel 2022-26). Unico indizio coerente, ma piccolo: grandi speculatori molto ottimisti, mese dopo leggermente più debole.":
  ": in our study since 2018 sentiment did not anticipate Bitcoin consistently (the “buy on extreme fear” rule worked in 2018-21 and not in 2022-26). The only consistent hint, but a small one: very optimistic large speculators, slightly weaker following month.",
 "Fonte:":"Source:","Paura estrema":"Extreme fear","Paura":"Fear","Neutro":"Neutral","Avidità":"Greed","Avidità estrema":"Extreme greed",
 "Futures Bitcoin (CME)":"Bitcoin futures (CME)","Piccoli trader":"Small traders","Grandi speculatori":"Large speculators",
 "Mercato crypto":"Crypto market","I dati delle criptovalute arrivano con il prossimo aggiornamento.":"Crypto data arrives with the next update.",
 "Le principali criptovalute, ordinate per capitalizzazione.":"The main cryptocurrencies, sorted by market cap.",
 "Le principali criptovalute, ordinate per volume scambiato.":"The main cryptocurrencies, sorted by traded volume.",
 "24 ore, 7 e 30 giorni":"24 hours, 7 and 30 days","= variazione del prezzo.":"= price change.","Dal massimo":"From the high",
 "= drawdown dal massimo storico.":"= drawdown from the all-time high.",
 "= oscillazione annua stimata sugli ultimi 30 giorni. Tocca un titolo di colonna per ordinare e una moneta per aprire il suo profilo. Stablecoin escluse: valgono sempre circa 1 dollaro.":
  "= annual swing estimated over the last 30 days. Tap a column title to sort and a coin to open its profile. Stablecoins excluded: they are always worth about 1 dollar.",
 "In rialzo a 7 giorni":"Up over 7 days","Peso di Bitcoin":"Bitcoin weight","sul totale in tabella":"of the table total",
 "Volume 24 ore":"24-hour volume","monete in tabella":"coins in the table","Migliore a 7 giorni":"Best over 7 days",
 "Tutte":"All","Piattaforma":"Platform","Infrastruttura":"Infrastructure","Moneta digitale":"Digital currency","Pagamenti":"Payments",
 "Meme":"Meme","Finanza decentralizzata":"Decentralized finance","Moneta":"Coin","Prezzo":"Price","24 ore":"24 hours",
 "7 giorni":"7 days","30 giorni":"30 days","90 giorni":"90 days","Capitalizz.":"Market cap","Volume 24h":"24h volume","Dal max":"From high",
 "Mostra meno":"Show less","Massimo storico":"All-time high","Drawdown dal massimo":"Drawdown from the high","1 anno":"1 year",
 "Da inizio anno":"Year to date","Volatilità 30 giorni":"30-day volatility","annua":"annual","Volume medio 30 giorni":"30-day average volume",
 "al giorno":"per day","Capitalizzazione":"Market cap","In circolazione":"Circulating","Massima":"Maximum","Senza tetto":"No cap",
 "ultimo aggiornamento disponibile":"latest available update","Altre criptovalute":"More cryptocurrencies",
 "Tabella completa con volumi, volatilità e profilo di ogni moneta.":"Full table with volumes, volatility and the profile of every coin.",
});
// testi con numeri o date: [regola, sostituzione] (la sostituzione puo' essere una funzione)
const EB_GG={lun:"Mon",mar:"Tue",mer:"Wed",gio:"Thu",ven:"Fri",sab:"Sat",dom:"Sun"};
const EB_RX=[
 [/^su (\d+)$/,"of $1"],[/^· (.+)$/,(m,a)=>"· "+(EB_EN[a]||a)],[/^(\d+) su (\d+)$/,"$1 of $2"],
 [/^Mostra tutte \((\d+)\)$/,"Show all ($1)"],[/^Prezzi al (.+)$/,"Prices as of $1"],
 [/^([\d.,]+) mld( \$)?$/,"$1 bn$2"],[/^([\d.,]+) mln( \$)?$/,"$1 M$2"],
 [/^(.+) · nata nel (\d{4})$/,(m,a,b)=>(EB_EN[a]||a)+" · launched in "+b],
 [/^(.+)% della tabella$/,"$1% of the table"],[/^(.+)% già in circolazione$/,"$1% already circulating"],
 [/^Altre (\d+) criptovalute$/,"$1 more cryptocurrencies"],[/^Prezzo di (.+), ultimi 3 anni$/,"$1 price, last 3 years"],
 [/^Prova · (\d+) g$/,"Trial · $1 d"],[/^Giorno (\d+) di (\d+)$/,"Day $1 of $2"],[/^fino al (.+)$/,"until $1"],
 [/^(lun|mar|mer|gio|ven|sab|dom) (\d\d\/\d\d\/\d{4}) · aggiornato$/,(m,g,d)=>EB_GG[g]+" "+d+" · updated"],
 [/^Prossimo: (lun|mar|mer|gio|ven|sab|dom) (\S+) ore (\S+)$/,(m,g,d,o)=>"Next: "+EB_GG[g]+" "+d+" at "+o],
 [/^Prossimo: giornaliero$/,"Next: daily"],[/^Il tuo profilo: (.+)$/,"Your profile: $1"],
 [/^(\d+)\/100 · molto pessimisti$/,"$1/100 · very pessimistic"],[/^(\d+)\/100 · pessimisti$/,"$1/100 · pessimistic"],
 [/^(\d+)\/100 · nel mezzo$/,"$1/100 · in the middle"],[/^(\d+)\/100 · ottimisti$/,"$1/100 · optimistic"],
 [/^(\d+)\/100 · molto ottimisti$/,"$1/100 · very optimistic"],
 [/^Ultimo anno · dato del (.+)$/,"Last year · data of $1"],
 [/^Posizione rispetto all'ultimo anno · report del (.+)$/,"Position versus the last year · report of $1"],
 [/^· © (\d{4}) EdgeValor, tutti i diritti riservati\.$/,"· © $1 EdgeValor, all rights reserved."],
 [/^Fonti: (.+) Generato il (.+)\.$/,(m,f,g)=>"Sources: "+f.replace("Banca Centrale Europea","European Central Bank")+" Generated on "+g+"."],
];
/* il traduttore che usa questo dizionario e' in 00t_lingua.js (v8.05): parte dopo che tutti i file 00c..00s hanno
   aggiunto le loro voci. */
