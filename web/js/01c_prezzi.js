/* ---------- v9.14 PREZZI PREMIUM E DURATA DELLA PROVA (una sola fonte per tutto il terminale) ----------
   v9.27 OFFERTA B (Ya, 24/11/2026 sera): 39,99 al mese, 29,99 al mese con l'annuale (359,88); campagne a 19,99 (-33%).
   Piani PayPal a 29,99/299,88 creati il 24/11 e mai usati: restano su PayPal, non piu' proposti.
   Decisione di Ya (24/11/2026): dal 1 dicembre 2026, mezzanotte ora italiana, Premium costa 39,99 EUR al mese oppure
   29,99 EUR al mese con l'annuale (359,88 EUR all'anno) e la prova per chi si registra scende da 14 a 7 giorni.
   Chi si abbona ENTRO il 30/11 tiene il prezzo di allora (27,00 / 19,99) finche' l'abbonamento resta attivo:
   su PayPal resta sul piano vecchio. I piani nuovi sono stati creati il 24/11/2026 (funzione paypal, crea_piani).
   Il cambio avviene da solo all'ora giusta (Date.now()): non serve ripubblicare il sito.
   USO: EB_PREZZI.listino() -> {mensile:{...}, annuale:{...}} attuale; EB_PREZZI.prova() -> 14 o 7 giorni;
        EB_PREZZI.di(dataAbbonamento) -> listino valido per chi si e' abbonato in quella data. */
const EB_PREZZI=(()=>{
 const CAMBIO=Date.parse("2026-12-01T00:00:00+01:00");          // mezzanotte ora italiana (ora solare: +01:00)
 const VECCHI={mensile:{id:"P-5HA71857XX328563CNL7B7XI",mese:"27,00 €",prezzo:"27,00 €",per:"al mese"},
               annuale:{id:"P-89G164691L706501LNL7CALY",mese:"19,99 €",prezzo:"239,88 €",per:"all'anno",risp:26}};
 const NUOVI={mensile:{id:"P-39C31823BE5812743NMDAPZY",mese:"39,99 €",prezzo:"39,99 €",per:"al mese"},
              annuale:{id:"P-74X167397B826891JNMDAP2A",mese:"29,99 €",prezzo:"359,88 €",per:"all'anno",risp:25}};
 // v9.18 piano PROMOZIONALE delle campagne stagionali (47_blackfriday.js): primo anno 239,88 (19,99 al mese), poi 359,88
 const PROMO={id:"P-160435523W6069530NMDAQBI",mese:"19,99 €",prezzo:"239,88 €",per:"il primo anno",poi:"359,88 €"};
 // v9.20 (Ya) prova di 7 giorni per chi si registra dal 24/11/2026 ore 20:40 (prima 14): stessa data del database
 const PROVA7=Date.parse("2026-11-24T20:40:00+01:00");
 const nuovi=t=>(t==null?Date.now():t)>=CAMBIO;
 return {CAMBIO,VECCHI,NUOVI,PROMO,nuovi:()=>nuovi(),listino:()=>nuovi()?NUOVI:VECCHI,
  di:d=>{const t=Date.parse(d||"");return isNaN(t)?(nuovi()?NUOVI:VECCHI):(nuovi(t)?NUOVI:VECCHI);},
  // durata della prova per chi si registra adesso (la crea il database: privato.nuovo_utente, stessa data)
  prova:()=>Date.now()>=PROVA7?7:14};
})();
