/* ---------- 35z_google.js - v8.92 ACCESSO CON IL PULSANTE UFFICIALE DI GOOGLE (Ya, 23/11/2026) ----------
   PERCHE': con il vecchio flusso ("Continua con Google" -> Supabase -> Google) la finestra di Google scriveva
     "Continua su cwwmqujccwzmqougtedh.supabase.co": l'indirizzo tecnico del database, che a un cliente sembra sospetto.
   COME FUNZIONA ORA (Google Identity Services, nessun costo):
     1) si carica lo script di Google (accounts.google.com/gsi/client) e si disegna il SUO pulsante;
     2) la finestra di Google si apre da edgevalor.com, quindi l'utente vede il nostro sito e non Supabase;
     3) Google restituisce un "biglietto" firmato (id_token) e lo si passa a Supabase:
        POST /auth/v1/token?grant_type=id_token {provider:"google", id_token, nonce}
     4) Supabase risponde con la sessione (access_token, refresh_token): si salva in "ebSess" come per l'email
        e la pagina si ricarica (da li' in poi pensa a tutto 36_account.js, codice invito compreso).
   NONCE: numero a caso usato una sola volta contro il riuso del biglietto. A Google va l'impronta SHA-256,
     a Supabase il numero in chiaro: Supabase rifa' l'impronta e la confronta con quella scritta nel biglietto.
   SE LO SCRIPT DI GOOGLE NON SI CARICA (rete, blocchi, browser dentro le app): resta il vecchio pulsante, che dal
     v9.00 NON passa piu' da Supabase ma va direttamente a Google (reindirizza()): Google torna su
     edgevalor.com/terminale/#id_token=... e il biglietto si passa a Supabase come sopra (ritorno()).
     Motivo: la verifica del marchio Google (nome e logo EdgeValor nella finestra) chiede che TUTTI i domini
     autorizzati siano nostri; il dominio supabase.co non si puo' verificare, quindi e' stato tolto dalla console.
   CONSOLE GOOGLE (account info@edgevalor.com, progetto "edgevalor", client "EdgeValor sito"):
     origine JavaScript autorizzata https://edgevalor.com (gia' presente dal 19/11/2026).
   USO: ebGoogle.monta(contenitore, {tema, errore}) sostituisce il pulsante "fatto in casa" dentro il contenitore.
   DEBUG (F12 -> Console): ebGoogle.stato(); gli errori iniziano con "[EdgeValor] google". */
(function(){try{
 const CID="923088470132-ebb91uk0j1bf7h8pag89ss7bv6insaai.apps.googleusercontent.com";      // ID client pubblico (non e' un segreto)
 const API="https://cwwmqujccwzmqougtedh.supabase.co",CHIAVE="sb_publishable_dACPf8QgDBCygllXsPKOHw_phFdDH-X";
 // PER_TUTTI=false: solo in anteprima (indirizzo con ?gis=1, ricordato nel browser) finche' non e' collaudato dal vivo
 const PER_TUTTI=true;                                               // acceso per tutti il 23/11/2026 dopo la prova di Ya
 try{if(/[?&]gis=1/.test(location.search))localStorage.setItem("ebGis","1");if(/[?&]gis=0/.test(location.search))localStorage.removeItem("ebGis");}catch(e){}
 const attivo=()=>{if(!/edgevalor\.com$/.test(location.hostname))return false;          // fuori dal sito Google rifiuta l'origine
  if(PER_TUTTI)return true;try{return localStorage.getItem("ebGis")=="1";}catch(e){return false;}};
 const st={caricato:false,errore:"",tentativi:0};
 let carica_p=null,crudo="",pronto=null,errCb=null;

 // 1) script di Google, una sola volta (8 secondi al massimo, poi resta il vecchio pulsante)
 function carica(){if(carica_p)return carica_p;
  carica_p=new Promise((ok,ko)=>{if(window.google&&google.accounts&&google.accounts.id)return ok();
   const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.defer=true;
   s.onload=()=>ok();s.onerror=()=>ko(new Error("script non caricato"));document.head.appendChild(s);
   setTimeout(()=>ko(new Error("tempo scaduto")),8000);});
  carica_p.catch(e=>{st.errore=e.message;carica_p=null;});return carica_p;}

 // impronta SHA-256 in esadecimale (quella che Google scrive nel biglietto)
 async function impronta(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}

 // 2) inizializzazione unica per pagina, con il nonce
 function prepara(){if(pronto)return pronto;
  pronto=(async()=>{await carica();
   const a=new Uint8Array(24);crypto.getRandomValues(a);crudo=[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
   google.accounts.id.initialize({client_id:CID,callback:entra,nonce:await impronta(crudo),ux_mode:"popup",
    auto_select:false,cancel_on_tap_outside:true,itp_support:true,context:"signin"});
   st.caricato=true;})();
  pronto.catch(()=>{pronto=null;});return pronto;}

 // 3) biglietto di Google -> sessione Supabase
 async function entra(r,dove){st.tentativi++;
  try{window.ebStat&&ebStat.ev("accesso",{passo:"google_gis"});}catch(_){}
  try{const x=await fetch(API+"/auth/v1/token?grant_type=id_token",{method:"POST",headers:{apikey:CHIAVE,"Content-Type":"application/json"},
    body:JSON.stringify({provider:"google",id_token:r.credential,nonce:crudo})});
   const j=await x.json().catch(()=>({}));
   if(!x.ok||!j.access_token)throw new Error(j.msg||j.error_description||j.message||("HTTP "+x.status));
   localStorage.setItem("ebSess",JSON.stringify({a:j.access_token,r:j.refresh_token,s:Date.now()+(j.expires_in||3600)*1000}));
   // 4) la pagina si ricarica senza codici nell'indirizzo: da qui in poi 36_account.js
   location.replace(dove||location.href.split("#")[0].split("?")[0]);}
  catch(e){st.errore=e.message;console.warn("[EdgeValor] google: accesso non riuscito",e);
   if(errCb)errCb("Accesso con Google non riuscito. Riprova o entra con l'email.");
   else if(dove)setTimeout(()=>{try{window.ebPorta&&ebPorta.apri&&ebPorta.apri("acc");}catch(_){}},300);}}

 // v9.00 RISERVA SENZA SCRIPT: pagina di Google a tutto schermo, ritorno su /terminale/ con il biglietto nell'indirizzo
 const RIT="/terminale/";
 async function reindirizza(){try{window.ebStat&&ebStat.ev("accesso",{passo:"google_redirect"});}catch(_){}
  const a=new Uint8Array(24);crypto.getRandomValues(a);const n=[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
  const s2=n.slice(0,16);
  try{sessionStorage.setItem("ebGRit",JSON.stringify({n,s:s2,t:location.href.split("#")[0].split("?")[0]}));}catch(e){}
  const q=new URLSearchParams({client_id:CID,response_type:"id_token",scope:"openid email profile",redirect_uri:location.origin+RIT,
   nonce:await impronta(n),state:s2,prompt:"select_account"});
  location.href="https://accounts.google.com/o/oauth2/v2/auth?"+q.toString();}
 // ritorno da Google: "#id_token=...&state=..." (si controlla che lo state sia quello partito da qui)
 (function ritorno(){const h=location.hash.slice(1);if(!/(^|&)id_token=/.test(h))return;
  const q=new URLSearchParams(h);let r=null;try{r=JSON.parse(sessionStorage.getItem("ebGRit")||"null");sessionStorage.removeItem("ebGRit");}catch(e){}
  try{history.replaceState(null,"",location.href.split("#")[0]);}catch(e){}
  if(!r||r.s!==q.get("state")){console.warn("[EdgeValor] google: ritorno non riconosciuto");return;}
  crudo=r.n;entra({credential:q.get("id_token")},r.t);})();

 // pulsante ufficiale al posto di quello "fatto in casa" (che resta se qualcosa non va)
 function monta(box,o){if(!box||!attivo())return;o=o||{};errCb=o.errore||null;
  const vecchio=box.querySelector(o.sel||"button");
  prepara().then(()=>{if(!box.isConnected)return;
   // larghezza = quella del riquadro (il massimo che Google accetta e' 400 px)
   const w=Math.max(240,Math.min(400,box.clientWidth||320));
   const d=document.createElement("div");d.className="gis";
   google.accounts.id.renderButton(d,{type:"standard",theme:o.tema||"outline",size:"large",text:"continue_with",
    shape:o.forma||"rectangular",logo_alignment:"center",width:w,locale:(typeof EB_LANG!="undefined"&&EB_LANG=="en")?"en":"it"});
   if(vecchio)vecchio.replaceWith(d);else box.prepend(d);})
  .catch(e=>console.warn("[EdgeValor] google: resta il pulsante classico",e));}

 window.ebGoogle={monta,attivo,reindirizza,stato:()=>Object.assign({attivo:attivo()},st)};
}catch(e){console.warn("[EdgeValor] google",e);}})();
