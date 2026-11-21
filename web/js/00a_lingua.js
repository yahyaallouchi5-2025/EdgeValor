
/* ---------- 00a_lingua.js - v8.02 LINGUA DEL TERMINALE: italiano (base) e inglese (parte 1: lingua, formati, dizionario) ----------
   Il dizionario continua e il traduttore parte in 00b_lingua.js (file separati solo per tenerli piccoli).
   PRIMO FILE della pagina (00_ = prima di tutti gli altri): decide la lingua prima che le schede si disegnino.
   COME FUNZIONA:
     - EB_LANG = "it" o "en": scelta dall'utente nel Profilo (riquadro "Lingua"), salvata nel browser (ebLang).
       Per ora chi non ha scelto resta in italiano: il rilevamento automatico dalla lingua del browser si accende
       quando tutte le schede saranno tradotte (AUTO = true), per non mostrare pagine mezze e mezze.
     - EB_LOC = "it-IT" o "en-US": formato di numeri e date (1.234,5 contro 1,234.5) usato da fx() e da tutte le schede.
     - In inglese un TRADUTTORE guarda la pagina (MutationObserver) e sostituisce ogni testo italiano che trova nel
       dizionario EN (testo identico) o nelle regole RX (testi con numeri e date). Vale anche per title, aria-label e
       placeholder. Cosi' le schede restano scritte in italiano e la traduzione si aggiunge un pezzo alla volta.
     - T("testo") per i pochi punti in cui il codice deve scegliere la parola (es. unita' di misura).
   AGGIUNGERE UNA TRADUZIONE: una riga in EN ("italiano esatto": "inglese"). Il testo deve essere quello del nodo
   (spazi iniziali/finali ignorati, spazi multipli contati come uno).
   DEBUG: ebLingua.mancanti() -> testi italiani visibili ancora senza traduzione (solo con la pagina in inglese). */
const EB_LANG=(()=>{const AUTO=false;try{const v=localStorage.getItem("ebLang");if(v=="it"||v=="en")return v;}catch(e){}
 return AUTO&&!/^it\b/i.test(navigator.language||"it")?"en":"it";})();
const EB_LOC=EB_LANG=="en"?"en-US":"it-IT";
document.documentElement.lang=EB_LANG;
const EB_EN={
 // ----- barra delle schede e pagina Mercati
 "Dashboard":"Dashboard","Portafogli":"Portfolios","Azionario":"Stocks","Mercati":"Markets","Forex":"Forex","COT":"COT",
 "Macro":"Macro","Crypto":"Crypto","Bitcoin":"Bitcoin","Volatilità":"Volatility","Stagionalità":"Seasonality",
 "Correlazioni":"Correlations","Live":"Live","Registro":"Log",
 // ----- barra laterale e profilo
 "Analisi su Telegram":"Analysis on Telegram","ISCRIVITI →":"JOIN →","La mia lista":"My list","(watchlist)":"(watchlist)",
 "Invita amici":"Invite friends","Novità":"What's new","Assistenza":"Support","Guida":"Guide","Dati aggiornati":"Data updated",
 "Profilo":"Profile","Lingua":"Language","Torna alla Dashboard":"Back to the Dashboard","EdgeValor: torna alla Dashboard":"EdgeValor: back to the Dashboard",
 "Riduci / espandi la barra laterale":"Collapse / expand the sidebar","Riduci o espandi":"Collapse or expand",
 "Analisi su Telegram: riepilogo del venerdì e briefing del lunedì":"Analysis on Telegram: Friday recap and Monday briefing",
 "Cerca e salva aziende, paesi, valute e crypto":"Search and save companies, countries, currencies and crypto",
 "Cerca azienda, paese, valuta o crypto e aggiungila alla lista":"Search a company, country, currency or crypto and add it to your list",
 "Cerca e aggiungi…":"Search and add…","Condividi EdgeValor con un amico":"Share EdgeValor with a friend",
 "Le ultime novità della piattaforma":"The latest platform updates","Abbonamento, segnalazioni e call live con il team":"Subscription, reports and live calls with the team",
 "Come funziona":"How it works","Stato dei dati: tocca per vedere le fonti":"Data status","Ultimo aggiornamento dei dati":"Last data update",
 "Terminale di analisi dei mercati":"Market analysis terminal","Menu":"Menu","Apri il menu":"Open the menu",
 "Canale Telegram di EdgeValor":"EdgeValor Telegram channel","Il tuo profilo":"Your profile",
 "Accedi o registrati con la tua email":"Sign in or sign up with your email","Accesso completo, senza scadenza.":"Full access, no expiry.",
 "Accesso non riuscito: chiedi un nuovo link.":"Sign-in failed: ask for a new link.","Accesso riuscito. Benvenuto!":"Signed in. Welcome!",
 "Admin · Iscritti":"Admin · Members","Controlla la posta":"Check your inbox","Cosa succede dopo la prova":"What happens after the trial",
 "Entra con la tua email":"Sign in with your email","Esci":"Sign out","Gestisci abbonamento":"Manage subscription",
 "I pagamenti arrivano con l'apertura degli abbonamenti":"Payments arrive when subscriptions open",
 "Il link è scaduto o è già stato usato: chiedine uno nuovo.":"The link has expired or was already used: ask for a new one.",
 "Il tuo codice: citalo quando ci scrivi":"Your code: mention it when you write to us",
 "Invio non riuscito (connessione o servizio). Riprova tra poco.":"Sending failed (connection or service). Try again shortly.",
 "L'email non sembra valida.":"The email doesn't look valid.","La sessione è scaduta: accedi di nuovo.":"Your session has expired: sign in again.",
 "La tua email":"Your email","Mandami il link":"Send me the link",
 "Niente password: ti mando un link. La prima volta parte la prova Premium gratuita di 14 giorni.":"No password: I'll send you a link. The first time, your free 14-day Premium trial starts.",
 "Prova Premium":"Premium trial","Sei in Basic: le funzioni Basic restano attive.":"You're on Basic: Basic features stay active.",
 "Sei uscito dal profilo":"You've signed out","Sto leggendo il tuo profilo…":"Loading your profile…",
 "Ti ho appena mandato un link: aspetta un minuto.":"I just sent you a link: wait a minute.",
 "Troppe richieste in poco tempo: riprova tra qualche minuto.":"Too many requests: try again in a few minutes.",
 "Usa un'altra email":"Use another email","Usiamo l'email solo per farti accedere.":"We use your email only to sign you in.",
 "nome@esempio.it":"name@example.com","presto":"soon","Premium":"Premium","Basic":"Basic","In prova":"Trial",
 "Passa a Premium":"Go Premium","Chiudi":"Close","Come si legge":"How to read it","Ordina":"Sort","Ordina:":"Sort:",
};
function T(it){return EB_LANG=="en"&&EB_EN[it]||it;}
