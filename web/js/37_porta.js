/* ---------- PORTA D'INGRESSO (v7.86, v8.20): il terminale si apre solo a chi ha un account ----------
   COSA FA: chi arriva senza sessione (localStorage "ebSess", scritta da 36_account.js) vede solo questa schermata:
     - Accedi       -> email + password                     (POST /auth/v1/token?grant_type=password)
     - Registrati   -> email + password, poi email di conferma (POST /auth/v1/signup)
     - Password dimenticata? -> email con il link            (POST /auth/v1/recover)
     - ritorno dal link "nuova password" -> si sceglie la password (PUT /auth/v1/user)
     - Google: provider attivo su Supabase dal 19/11/2026 (client "EdgeValor sito" sull'account info@edgevalor.com).
       v8.20 GOOGLE=false: si vede solo in anteprima (indirizzo con ?google=1, ricordato nel browser); true = per tutti.
     - v8.20 CLASSIFICATORE EMAIL (funzione public.email_stato nel database): 'temporanea' -> registrazione rifiutata;
       'registrata' -> in Registrati si propone Accedi / Password dimenticata; 'nuova' -> in Accedi si propone Registrati.
   Dopo l'accesso la sessione si salva e la pagina si ricarica: da li' in poi pensa a tutto 36_account.js.
   La prova di 14 giorni la crea il database alla registrazione (funzione privato.nuovo_utente).
   NOTA: e' una porta "di comodo" per l'utente; i dati riservati veri andranno protetti anche sul server (passo successivo).
   DEBUG (F12 -> Console): gli errori iniziano con "[EdgeValor] porta"; ebPorta.apri("reg") mostra la schermata. */
(function(){try{
 if(!/\/terminale\//.test(location.pathname))return;              // in locale (file aperto dal PC) il terminale resta libero
 const API="https://cwwmqujccwzmqougtedh.supabase.co",CHIAVE="sb_publishable_dACPf8QgDBCygllXsPKOHw_phFdDH-X";
 const PER_TUTTI=true;                                             // true = pulsante Google per tutti (acceso il 19/11/2026 dopo la prova di Ya)
 try{if(/[?&]google=1/.test(location.search))localStorage.setItem("ebGoogle","1");}catch(e){}
 const GOOGLE=PER_TUTTI||(()=>{try{return localStorage.getItem("ebGoogle")=="1";}catch(e){return false;}})();
 const H={apikey:CHIAVE,"Content-Type":"application/json"},MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 const torna=()=>location.href.split("#")[0].split("?")[0];       // dove riportano i link delle email (senza codici)
 const sess=()=>{try{return JSON.parse(localStorage.getItem("ebSess")||"null");}catch(e){return null;}};
 const stat=(p)=>{try{window.ebStat&&ebStat.ev("porta",{passo:p});}catch(_){}};
 const rit=(window.ebAccount&&ebAccount.ritorno)||{};               // esito del ritorno da un link email (vedi 36_account.js)
 let modo="acc",el=null,inviatoA="";

 const G='<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-16.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
 const OCCHIO='<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';

 /* --- disegno della scheda secondo il modo: acc | reg | posta | dim | nuova --- */
 function html(msg){
  const testa={acc:["Bentornato","Accedi per aprire il terminale."],reg:["Crea il tuo account",""],dim:["Password dimenticata","Ti mandiamo un link per sceglierne una nuova."],
   nuova:["Scegli la nuova password","Almeno 8 caratteri."],posta:["Controlla la posta",`Abbiamo scritto a <b>${esc(inviatoA)}</b>. Apri il link dall'email per continuare. Se non la vedi, guarda nello spam.`]}[modo];
  const err=msg?`<p class="ptko" role="alert">${msg}</p>`:"";
  if(modo=="posta")return `<h1>${testa[0]}</h1><p class="ptsub">${testa[1]}</p>${err}<button type="button" class="ptvai" data-va="acc">Torna all'accesso</button>`;
  const tab=(modo=="acc"||modo=="reg")?`<div class="pttab"><button type="button" class="${modo=="acc"?"on":""}" data-va="acc">Accedi</button><button type="button" class="${modo=="reg"?"on":""}" data-va="reg">Registrati</button></div>`:"";
  const goo=GOOGLE&&(modo=="acc"||modo=="reg")?`<button type="button" class="ptgoo">${G}Continua con Google</button>${modo=="acc"?`<p class="ptgnota">Con Google, se non hai un account, ne crei uno e accetti <a href="../legale/" target="_blank" rel="noopener">condizioni e privacy</a>.</p>`:""}<div class="pto">oppure con email</div>`:"";
  const mail=modo!="nuova"?`<label class="ptc"><span>Email</span><input type="email" name="email" autocomplete="email" inputmode="email" placeholder="nome@email.it" required></label>`:"";
  const pw=modo!="dim"?`<label class="ptc"><span>${modo=="nuova"?"Nuova password":"Password"}</span><input type="password" name="pw" minlength="8" placeholder="Almeno 8 caratteri" autocomplete="${modo=="acc"?"current-password":"new-password"}" required><button type="button" class="ptocchio" title="Mostra password">${OCCHIO}</button></label>`:"";
  const sotto={acc:`<div class="ptriga"><button type="button" class="ptlink" data-va="dim">Password dimenticata?</button></div>`,dim:"",reg:"",nuova:""}[modo];
  const vai={acc:"Accedi",reg:"Crea account",dim:"Mandami il link",nuova:"Salva e entra"}[modo];
  const nota={reg:`<p class="ptnota">Ti mandiamo un'email per confermare l'indirizzo.<br>Registrandoti accetti <a href="../legale/" target="_blank" rel="noopener">condizioni e privacy</a>.</p>`,
   dim:`<div class="ptriga ptc2"><button type="button" class="ptlink" data-va="acc">Torna all'accesso</button></div>`,acc:"",nuova:""}[modo];
  return `<h1>${testa[0]}</h1>${testa[1]?`<p class="ptsub">${testa[1]}</p>`:""}${modo=="reg"?`<p class="ptprova">Premium gratis per 14 giorni <b>·</b> senza carta</p>`:""}
   ${tab}${goo}<form novalidate>${mail}${pw}${sotto}${err}<button type="submit" class="ptvai">${vai}</button></form>${nota}`;}

 function disegna(msg){if(!el)return;const c=el.querySelector(".ptcard");c.innerHTML=html(msg);
  c.querySelectorAll("[data-va]").forEach(b=>b.onclick=()=>{const m=c.querySelector("input[name=email]");const v=m?m.value:"";modo=b.dataset.va;disegna();
   const n=c.querySelector("input[name=email]");if(n&&v)n.value=v;});                 // v8.20 l'email scritta resta quando si cambia scheda
  const o=c.querySelector(".ptocchio");if(o)o.onclick=()=>{const i=c.querySelector("input[name=pw]");i.type=i.type=="password"?"text":"password";};
  const g=c.querySelector(".ptgoo");if(g)g.onclick=()=>{stat("google");if(window.ebGoogle&&ebGoogle.attivo())return ebGoogle.reindirizza();location.href=API+"/auth/v1/authorize?provider=google&redirect_to="+encodeURIComponent(torna());};
  // v8.92 pulsante ufficiale di Google (35z_google.js): la finestra di Google mostra edgevalor.com e non Supabase
  if(g&&window.ebGoogle)ebGoogle.monta(c,{sel:".ptgoo",tema:"outline",errore:m=>disegna(m)});
  const f=c.querySelector("form");if(f)f.onsubmit=e=>{e.preventDefault();invia(f);};
  const p=c.querySelector("input");if(p&&!matchMedia("(max-width:900px)").matches)setTimeout(()=>p.focus(),50);}

 /* --- chiamate a Supabase; ogni risposta d'errore diventa una frase semplice --- */
 async function chiama(perc,corpo,metodo,token){const r=await fetch(API+perc,{method:metodo||"POST",headers:token?Object.assign({Authorization:"Bearer "+token},H):H,body:JSON.stringify(corpo)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.msg||j.error_description||j.message||("HTTP "+r.status)),{st:r.status,cod:j.error_code||j.code||j.error});return j;}
 const frase=e=>{const m=(e.message||"")+" "+(e.cod||"");
  if(e.st==429||/rate/i.test(m))return "Troppe richieste in poco tempo: riprova tra qualche minuto.";
  if(/not.?confirmed/i.test(m))return "Devi ancora confermare l'email: apri il link che ti abbiamo mandato.";
  if(/invalid.*(credentials|grant)|invalid_credentials/i.test(m))return "Email o password non corretti.";
  if(/weak|short|least/i.test(m))return "Password troppo corta: almeno 8 caratteri.";
  if(/same.*password|different/i.test(m))return "Scegli una password diversa da quella di prima.";
  return "Operazione non riuscita (connessione o servizio). Riprova tra poco.";};
 // v8.20 stato dell'email: 'nuova' | 'registrata' | 'temporanea' ('' se il controllo non risponde: si prosegue normalmente)
 async function statoEmail(m){try{const r=await fetch(API+"/rest/v1/rpc/email_stato",{method:"POST",headers:H,body:JSON.stringify({p_email:m})});
  return r.ok?await r.json():"";}catch(e){return "";}}
 // messaggio con collegamenti (data-va cambia scheda tenendo l'email scritta)
 const vaiA=(testo,dove,etichetta)=>`${testo} <button type="button" class="ptlink ptin" data-va="${dove}">${etichetta}</button>`;
 function entra(j){localStorage.setItem("ebSess",JSON.stringify({a:j.access_token,r:j.refresh_token,s:Date.now()+(j.expires_in||3600)*1000}));location.reload();}

 async function invia(f){const b=f.querySelector(".ptvai"),t=b.textContent,mail=f.email?f.email.value.trim().toLowerCase():"",pw=f.pw?f.pw.value:"";
  if(f.email&&!MAIL.test(mail))return disegnaKo("L'email non sembra valida.");
  if(f.pw&&pw.length<8)return disegnaKo("Password troppo corta: almeno 8 caratteri.");
  b.disabled=true;b.textContent="Un momento…";
  try{
   if(modo=="acc"){try{const j=await chiama("/auth/v1/token?grant_type=password",{email:mail,password:pw});stat("entrato");return entra(j);}
    catch(e){if(!/invalid/i.test((e.message||"")+" "+(e.cod||"")))throw e;              // credenziali errate: email sconosciuta o password sbagliata?
     const st=await statoEmail(mail);b.disabled=false;b.textContent=t;
     if(st=="nuova")return disegnaKo(vaiA("Questa email non è registrata.","reg","Crea un account"));
     if(st=="registrata")return disegnaKo(vaiA("Password non corretta.","dim","Password dimenticata?")+(GOOGLE?" Se ti sei registrato con Google, usa il pulsante Google.":""));
     throw e;}}
   if(modo=="reg"){const st=await statoEmail(mail);
    if(st=="temporanea"){b.disabled=false;b.textContent=t;return disegnaKo("Le email temporanee non sono accettate: usa la tua email personale.");}
    if(st=="registrata"){b.disabled=false;b.textContent=t;return disegnaKo(vaiA("Questa email è già registrata.","acc","Accedi")+" "+vaiA("oppure","dim","recupera la password"));}
    let inv="";try{inv=localStorage.getItem("ebInvito")||"";}catch(_){}
    const j=await chiama("/auth/v1/signup?redirect_to="+encodeURIComponent(torna()),{email:mail,password:pw,data:inv?{codice_invito:inv}:{}});
    stat("registrato");if(j.access_token)return entra(j);            // (se la conferma email fosse spenta si entra subito)
    inviatoA=mail;modo="posta";return disegna();}
   if(modo=="dim"){await chiama("/auth/v1/recover?redirect_to="+encodeURIComponent(torna()),{email:mail});stat("recupero");inviatoA=mail;modo="posta";return disegna();}
   if(modo=="nuova"){const s=sess();await chiama("/auth/v1/user",{password:pw},"PUT",s&&s.a);stat("nuova_password");chiudi();return;}
  }catch(e){console.warn("[EdgeValor] porta:",modo,e);b.disabled=false;b.textContent=t;disegnaKo(frase(e),f);}}
 function disegnaKo(m,f){const c=el.querySelector(".ptcard"),v={};c.querySelectorAll("input").forEach(i=>v[i.name]=i.value);disegna(m);
  c.querySelectorAll("input").forEach(i=>{if(v[i.name]!=null)i.value=v[i.name];});}

 function apri(m,msg){if(m)modo=m;document.documentElement.classList.add("senzaccesso");
  if(!el){el=document.createElement("div");el.id="porta";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Accedi a EdgeValor");
   el.innerHTML=`<div class="ptcielo"></div><main class="ptbox"><div class="ptlogo"><i></i><b>EDGE<br><em>VALOR</em></b></div><div class="ptcard"></div>
    <a class="ptsito" href="../">Cos'è EdgeValor?</a>
    <div class="ptlang vfseg" role="group" aria-label="Lingua"><button type="button" data-l="it">IT</button><button type="button" data-l="en">EN</button></div></main>`;document.body.appendChild(el);
   // v9.10 lingua scelta anche prima dell'accesso: chi non legge l'italiano passa all'inglese da qui
   el.querySelectorAll(".ptlang button").forEach(x=>{const on=x.dataset.l==(typeof EB_LANG!="undefined"?EB_LANG:"it");x.classList.toggle("on",on);x.setAttribute("aria-pressed",on);
    x.onclick=()=>{if(on)return;try{localStorage.setItem("ebLang",x.dataset.l);}catch(e){}location.reload();};});}
  disegna(msg);}
 function chiudi(){document.documentElement.classList.remove("senzaccesso");if(el){el.remove();el=null;}}

 window.ebPorta={apri,chiudi};
 // QUANDO SI APRE: nuova password dopo il link di recupero, oppure nessuna sessione valida
 if(rit.tipo=="recovery"&&sess())apri("nuova");
 else if(!sess()){const h=/(^|[?&])reg\b/.test(location.search)||/^#reg$/.test(location.hash);
  apri(h?"reg":"acc",rit.esito=="scaduto"?"Il link è scaduto o è già stato usato: accedi o chiedine uno nuovo.":rit.esito=="errore"?"Accesso non riuscito: riprova.":"");}
 else chiudi();
}catch(e){console.error("[EdgeValor] porta:",e);document.documentElement.classList.remove("senzaccesso");}})();
