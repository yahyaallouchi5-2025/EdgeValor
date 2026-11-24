/* ---------- v9.14 PREZZI PREMIUM E DURATA DELLA PROVA (una sola fonte per tutto il terminale) ----------
   Decisione di Ya (24/11/2026): dal 1 dicembre 2026, mezzanotte ora italiana, Premium costa 29,99 EUR al mese oppure
   24,99 EUR al mese con l'annuale (299,88 EUR all'anno) e la prova per chi si registra scende da 14 a 7 giorni.
   Chi si abbona ENTRO il 30/11 tiene il prezzo di allora (27,00 / 19,99) finche' l'abbonamento resta attivo:
   su PayPal resta sul piano vecchio. I piani nuovi sono stati creati il 24/11/2026 (funzione paypal, crea_piani).
   Il cambio avviene da solo all'ora giusta (Date.now()): non serve ripubblicare il sito.
   USO: EB_PREZZI.listino() -> {mensile:{...}, annuale:{...}} attuale; EB_PREZZI.prova() -> 14 o 7 giorni;
        EB_PREZZI.di(dataAbbonamento) -> listino valido per chi si e' abbonato in quella data. */
const EB_PREZZI=(()=>{
 const CAMBIO=Date.parse("2026-12-01T00:00:00+01:00");          // mezzanotte ora italiana (ora solare: +01:00)
 const VECCHI={mensile:{id:"P-5HA71857XX328563CNL7B7XI",mese:"27,00 €",prezzo:"27,00 €",per:"al mese"},
               annuale:{id:"P-89G164691L706501LNL7CALY",mese:"19,99 €",prezzo:"239,88 €",per:"all'anno",risp:26}};
 const NUOVI={mensile:{id:"P-55193695G5998012WNMC5ARQ",mese:"29,99 €",prezzo:"29,99 €",per:"al mese"},
              annuale:{id:"P-7FU70441YK886462BNMC5ARY",mese:"24,99 €",prezzo:"299,88 €",per:"all'anno",risp:17}};
 // v9.18 piano PROMOZIONALE delle campagne stagionali (47_blackfriday.js): primo anno 239,88 (19,99 al mese), poi 299,88
 const PROMO={id:"P-9WC59158HM233862FNMC6AXQ",mese:"19,99 €",prezzo:"239,88 €",per:"il primo anno",poi:"299,88 €"};
 const nuovi=t=>(t==null?Date.now():t)>=CAMBIO;
 return {CAMBIO,VECCHI,NUOVI,PROMO,nuovi:()=>nuovi(),listino:()=>nuovi()?NUOVI:VECCHI,
  di:d=>{const t=Date.parse(d||"");return isNaN(t)?(nuovi()?NUOVI:VECCHI):(nuovi(t)?NUOVI:VECCHI);},
  // durata della prova per chi si registra adesso (la crea il database: privato.nuovo_utente, stessa data)
  prova:()=>nuovi()?7:14};
})();
