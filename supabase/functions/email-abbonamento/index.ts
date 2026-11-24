// ---------- email-abbonamento (v8.29, v8.93): email di servizio sull'abbonamento EdgeValor ----------
// Parte da sola ogni ora (pg_cron + pg_net) e manda, tramite Resend:
//   attivo            -> pagamento ricevuto / Premium attivato o rinnovato (riepilogo: piano, importo, date)
//   promemoria        -> 3 giorni prima della scadenza (con abbonamento PayPal: avviso del rinnovo automatico)
//   promemoria_prova  -> 3 giorni prima della fine della prova gratuita (se non ha Premium)
//   basic             -> l'accesso e' finito: ora e' nel piano Basic
//   disdetta          -> conferma della disdetta: Premium resta fino a scadenza, poi "basic"
//   recensione        -> (v8.29) 7 giorni dopo il primo pagamento: invito sincero a recensire su Trustpilot, nessun premio
//   premio_invito     -> (v8.29) un amico invitato si e abbonato: 1 mese di Premium regalato
//   benvenuto         -> (v8.93) dopo la conferma dell'email: grazie, 14 giorni di prova e, in allegato, il PDF
//                        delle condizioni d'uso in vigore con i dati della registrazione (copia da conservare)
//   regalo            -> (v8.93) l'admin ha aggiunto +1 mese / +1 anno di Premium
//   revoca            -> (v8.93) l'admin ha revocato l'accesso, con il motivo (condizioni d'uso, sezione #revoca)
// TESTI di "attivo", "promemoria" (rinnovo) e "basic" scritti da Ya (19/11/2026). Il nome ("Ciao Mario,") arriva da PayPal.
// Il database (public.email_da_inviare4, v8.93) dice chi deve ricevere cosa, se ha il rinnovo automatico, piano e nome.
// MAI DOPPIONI: prima di spedire si "prenota" l'invio (utente + tipo + scadenza, chiave unica nel database).
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions di Supabase.
// Il giro parte anche subito dopo un'attivazione o una disdetta (funzione "paypal"), non solo ogni ora.
// PROVA DEI MODELLI: POST con {"prova":true} manda i modelli all'email dell'admin (al massimo una volta ogni 10 minuti).

import { LOGO } from "./logo.ts";   // logo come immagine (allegato in linea, cid:logo): Gmail non lo ricolora
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";   // v8.93 PDF delle condizioni accettate

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const TERMINALE = "https://edgevalor.com/terminale/";
const TRUSTPILOT = "https://www.trustpilot.com/evaluate/edgevalor.com";   // v8.29 pagina per scrivere la recensione
const PREMIUM = TERMINALE + "?premium=1";            // apre la finestra dell'abbonamento (46_abbonamento.js)
const PRIVACY = "https://edgevalor.com/legale/#privacy", CONDIZIONI = "https://edgevalor.com/legale/#termini";
// v9.14 importi: listino fino al 30/11/2026 e dal 1/12/2026 (chi si e' abbonato prima tiene il suo prezzo)
const IMPORTO: Record<string, string> = { mensile: "€27,00", annuale: "€239,88" };
const IMPORTO_NUOVO: Record<string, string> = { mensile: "€39,99", annuale: "€359,88" };
const CAMBIO = Date.parse("2026-12-01T00:00:00+01:00");
const nuovoListino = (d?: string | null) => (d ? Date.parse(d) : Date.now()) >= CAMBIO;
const NOME_PIANO: Record<string, string> = { mensile: "Premium Mensile", annuale: "Premium Annuale" };

type Riga = { utente: string; email: string; numero: number | null; tipo: string; scadenza: string;
              rinnovo: boolean; piano: string | null; nome: string | null;
              motivo?: string | null; creato?: string | null; prova_fino?: string | null;   // v8.93
              abbonato_il?: string | null; importo?: number | null };   // v9.14 data dell'abbonamento, v9.18 importo pagato
// contenuto di un'email: oggetto, riga in evidenza, paragrafi, riepilogo, sezioni con elenco, pulsante, chiusura, piede
type Mail = { oggetto: string; testa: string; par: string[]; riep?: [string, string][]; riepT?: string; sez?: [string, string[]][];
              dopo?: string[]; btn?: [string, string]; fine?: string; piede: string };
const idEV = (n: number | null) => n ? "EV-" + String(n).padStart(4, "0") : "—";
// v8.93 motivi della revoca (stessi valori di public.admin_revoca)
const MOTIVO: Record<string, string> = { abuso: "abuso del servizio", minacce: "minacce, ricatti o offese",
  condivisione: "condivisione o rivendita dell'accesso o dei contenuti" };

async function rpc(nome: string, corpo: Record<string, unknown> = {}) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status} ${await r.text()}`);
  return r.status == 204 ? null : r.json();
}

const TZ = { timeZone: "Europe/Rome" } as const;
const lunga = (d: string | number) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", ...TZ });
const breve = (d: string | number) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", ...TZ });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const PIEDE_INFO = "Contenuti a scopo educativo e informativo, non consulenza finanziaria.";

// v9.14 giorni di prova: 14 per chi si e' registrato fino al 30/11/2026, 7 dopo (dalla registrazione alla fine della prova)
const giorniProva = (x: Riga) => x.creato && x.prova_fino
  ? (Math.round((Date.parse(x.prova_fino) - Date.parse(x.creato)) / 864e5) > 10 ? 14 : 7) : (Date.now() >= Date.parse("2026-11-24T20:40:00+01:00") ? 7 : 14);   // v9.20 prova di 7 giorni da oggi

// x = riga del database. Con PayPal la scadenza salvata e' "prossimo addebito + 1 giorno": il rinnovo e' il giorno prima.
function testi(x: Riga): Mail {
  const d = lunga(x.scadenza), rinnovo = breve(Date.parse(x.scadenza) - 864e5), pagato = !!x.piano;
  const giorno = new Date(Date.parse(x.scadenza) - 864e5).toLocaleDateString("it-IT", { day: "numeric", month: "long", ...TZ });
  const P = '<b class="eg" style="color:#f3c75f">Premium</b>';
  switch (x.tipo) {
    case "attivo": {
      const riep: [string, string][] = [["Piano", x.piano ? NOME_PIANO[x.piano] || "Premium" : "Premium"]];
      // v9.18 importo VERO dell'ultimo pagamento PayPal (offerte stagionali: il primo anno costa meno); se manca, il listino
      const pagatoEur = x.importo && x.importo > 0 ? "€" + x.importo.toFixed(2).replace(".", ",") : null;
      if (pagato) riep.push(["Importo", pagatoEur || (nuovoListino(x.abbonato_il) ? IMPORTO_NUOVO : IMPORTO)[x.piano!] || "—"], ["Pagamento", "completato"]);
      riep.push(["Data di attivazione", breve(Date.now())]);
      riep.push(x.rinnovo ? ["Prossimo rinnovo", rinnovo] : ["Scadenza", breve(x.scadenza)]);
      return {
        oggetto: "Premium attivo – Benvenuto su EdgeValor",
        testa: "Il tuo accesso Premium è attivo.",
        par: [pagato ? "il tuo pagamento è stato elaborato correttamente. Il tuo account EdgeValor è ora attivo con il piano Premium."
                     : "il tuo account EdgeValor è ora attivo con il piano Premium."],
        riep,
        dopo: ["Potrai continuare a utilizzare le funzionalità Premium fino alla prossima scadenza prevista.",
               "Grazie per aver scelto EdgeValor e per sostenere il progetto.", "Buona analisi!"],
        piede: "Hai ricevuto questa email perché hai effettuato un pagamento o rinnovato un abbonamento EdgeValor.",
      };
    }
    case "promemoria":
      return x.rinnovo ? {
        oggetto: `Il tuo Premium si rinnova il ${giorno} · EdgeValor`,
        testa: `Il tuo Premium si rinnova il ${giorno}.`,
        par: [`ti ricordiamo che il tuo abbonamento ${P} si rinnoverà automaticamente il <b>${rinnovo}</b>.`,
              "Non devi fare nulla: il rinnovo avverrà automaticamente e potrai continuare a utilizzare tutte le funzionalità Premium senza interruzioni."],
        sez: [["Preferisci non rinnovare?", []]],
        dopo: ["Puoi disattivare il rinnovo automatico in qualsiasi momento prima della data prevista, dalla sezione <b>Gestisci abbonamento</b>.",
               "In questo caso, manterrai l'accesso Premium fino alla fine del periodo già pagato, senza ulteriori addebiti."],
        btn: ["Gestisci abbonamento", PREMIUM],
        fine: "Grazie per aver scelto EdgeValor.",
        piede: "Ricevi questa email perché hai un abbonamento Premium attivo su EdgeValor.",
      } : {
        oggetto: `Il tuo Premium scade il ${d} · EdgeValor`,
        testa: "Il tuo Premium sta per scadere.",
        par: [`il tuo abbonamento ${P} scade il <b>${d}</b>.`,
              "Per continuare scegli il piano e attivi in un minuto. Se non rinnovi, il tuo account passerà al piano <b>Basic</b>, senza addebiti."],
        btn: ["Rinnova Premium", PREMIUM],
        piede: "Ricevi questa email perché hai un account EdgeValor.",
      };
    case "promemoria_prova":
      return {
        oggetto: `La tua prova Premium finisce il ${d} · EdgeValor`,
        testa: "La tua prova Premium sta per finire.",
        par: [`la tua prova di ${P} finisce il <b>${d}</b>.`,
              "Poi il tuo account passerà al piano <b>Basic</b>, senza addebiti. Per continuare con Premium scegli il piano e attivi in un minuto."],
        btn: ["Scopri i piani Premium", PREMIUM],
        piede: "Ricevi questa email perché hai un account EdgeValor.",
      };
    case "disdetta": {  // v8.18 conferma della disdetta: Premium resta fino alla fine del periodo pagato (decisione di Ya)
      const riep: [string, string][] = [["Piano", x.piano ? NOME_PIANO[x.piano] || "Premium" : "Premium"], ["Stato", "Disdetto"],
        ["Data della disdetta", breve(Date.now())], ["Premium attivo fino al", breve(x.scadenza)]];
      return {
        oggetto: "Conferma disdetta abbonamento – EdgeValor",
        testa: "La disdetta del tuo abbonamento è confermata.",
        par: ["ti confermiamo che la richiesta di disdetta del tuo abbonamento Premium è stata registrata correttamente. Il rinnovo automatico è stato disattivato e non verranno effettuati ulteriori addebiti."],
        riep,
        sez: [["Cosa succede ora?", [`Potrai continuare a utilizzare tutte le funzionalità Premium fino al ${breve(x.scadenza)}.`,
                                     "Alla scadenza, il tuo account passerà automaticamente al piano Basic.",
                                     "Non sono previsti ulteriori addebiti."]],
              ["Hai cambiato idea?", []]],
        dopo: ["Puoi riattivare il tuo abbonamento in qualsiasi momento dalla sezione <b>Gestisci abbonamento</b>. Il nuovo addebito partirà solo alla fine del periodo già pagato."],
        btn: ["Gestisci abbonamento", PREMIUM],
        fine: "Grazie per aver scelto EdgeValor. Speriamo di rivederti presto tra i nostri utenti Premium.",
        piede: "Hai ricevuto questa email perché hai richiesto la disdetta del tuo abbonamento EdgeValor.",
      };
    }
    case "recensione":  // v8.29 7 giorni dopo il primo pagamento, a TUTTI i paganti, una volta sola, nessun premio in cambio
      return {
        oggetto: "Come ti trovi con EdgeValor?",
        testa: "La tua opinione conta.",
        par: ["è passata una settimana da quando hai attivato Premium: ci piacerebbe sapere come ti trovi.",
              "Se hai due minuti, lascia una recensione su Trustpilot: positiva o negativa, purché sincera. Aiuta altri trader a conoscerci e noi a migliorare."],
        btn: ["Lascia una recensione", TRUSTPILOT],
        dopo: ["Se qualcosa non va, puoi anche rispondere a questa email: ti leggiamo noi, direttamente."],
        fine: "Grazie per il tuo tempo.",
        piede: "Ricevi questa email una sola volta, perché hai attivato un abbonamento EdgeValor.",
      };
    case "benvenuto": {  // v8.93 una volta sola, dopo la conferma dell'email
      const prova = x.prova_fino && Date.parse(x.prova_fino) > Date.now();
      const riep: [string, string][] = [["Account", idEV(x.numero)], ["Registrazione", breve(x.creato || Date.now())]];
      riep.push(prova ? ["Prova Premium fino al", breve(x.prova_fino!)] : ["Piano", "Basic"]);
      return {
        oggetto: prova ? "Benvenuto su EdgeValor: la tua prova Premium è attiva" : "Benvenuto su EdgeValor",
        testa: "Benvenuto su EdgeValor.",
        par: ["grazie per esserti registrato e per aver confermato la tua email: il tuo account è attivo.",
              prova ? `Hai <b>${giorniProva(x)} giorni di ${P}</b> per provare tutto il terminale, fino al <b>${lunga(x.prova_fino!)}</b>. Alla fine della prova il tuo account passa al piano <b>Basic</b>, senza addebiti: non serve nessuna carta.`
                    : "Il tuo account è nel piano <b>Basic</b>: puoi passare a Premium quando vuoi dal terminale."],
        riep, riepT: "Il tuo account",
        sez: [["Da dove iniziare", ["<b>Dashboard</b>: il quadro dei mercati in una pagina.",
                                    "<b>Report COT</b>: dove scommettono i grandi investitori.",
                                    "<b>Notizie</b>: come reagiscono i mercati a NFP, CPI e Fed."]]],
        dopo: ["In allegato trovi la copia in PDF delle <b>condizioni d'uso</b> che hai accettato con la registrazione: ti consigliamo di conservarla."],
        btn: ["Apri il terminale", TERMINALE],
        fine: "Buona analisi!",
        piede: "Ricevi questa email una sola volta, dopo la conferma della tua registrazione a EdgeValor.",
      };
    }
    case "regalo": {  // v8.93 l'admin ha aggiunto Premium (piano = "mese" | "anno" | "data")
      const durata = x.piano == "anno" ? "1 anno" : x.piano == "mese" ? "1 mese" : "un periodo";
      return {
        oggetto: x.piano == "data" ? "Abbiamo esteso il tuo Premium · EdgeValor" : `Hai ricevuto ${durata} di Premium · EdgeValor`,
        testa: "Abbiamo aggiunto Premium al tuo account.",
        par: [`ti abbiamo aggiunto <b>${durata} di ${P}</b>. Non devi fare nulla: è già attivo sul tuo account.`],
        riep: [["Aggiunto", durata == "un periodo" ? "Premium" : durata], ["Premium attivo fino al", breve(x.scadenza)], ["Addebito", "nessuno"]],
        riepT: "Il tuo Premium",
        btn: ["Apri EdgeValor", TERMINALE],
        fine: "Grazie per far parte di EdgeValor.",
        piede: "Ricevi questa email perché EdgeValor ha aggiunto un periodo Premium al tuo account.",
      };
    }
    case "revoca": {  // v8.93 revoca decisa dall'admin, con il motivo (condizioni d'uso, sezione #revoca)
      const m = MOTIVO[x.motivo || ""] || "violazione delle condizioni d'uso";
      return {
        oggetto: "Il tuo accesso Premium è stato revocato · EdgeValor",
        testa: "Il tuo accesso Premium è stato revocato.",
        par: ["ti informiamo che il tuo accesso Premium è stato revocato e il tuo account è passato al piano <b>Basic</b>.",
              `Motivo: <b>${m}</b>, in violazione delle condizioni d'uso accettate con la registrazione (sezione «Comportamento verso EdgeValor e revoca dell'accesso»).`],
        riep: [["Account", idEV(x.numero)], ["Data della revoca", breve(x.scadenza)], ["Piano attuale", "Basic"]],
        riepT: "Dettagli",
        dopo: ["Come previsto dalle condizioni d'uso, il periodo residuo non viene rimborsato, salvo i diritti che la legge non consente di escludere.",
               "Per chiarimenti puoi rispondere a questa email."],
        btn: ["Leggi le condizioni d'uso", "https://edgevalor.com/legale/#revoca"],
        piede: "Ricevi questa email perché il tuo account EdgeValor è stato modificato.",
      };
    }
    case "premio_invito":  // v8.29 porta un amico: l'amico invitato si e' abbonato
      return {
        oggetto: "Hai ricevuto 1 mese di Premium in regalo · EdgeValor",
        testa: "Un amico che hai invitato si è abbonato.",
        par: [`grazie per aver fatto conoscere EdgeValor: come promesso, ti abbiamo regalato <b>1 mese di ${P}</b>.`],
        riep: [["Premio", "1 mese di Premium"], ["Premium attivo fino al", breve(x.scadenza)]],
        dopo: ["Non devi fare nulla: è già attivo sul tuo account. Puoi continuare a invitare amici dal pulsante <b>Invita amici</b>."],
        btn: ["Apri EdgeValor", TERMINALE],
        piede: "Ricevi questa email perché un amico si è abbonato con il tuo link di invito.",
      };
    default: // basic
      return {
        oggetto: "Il tuo account EdgeValor è ora nel piano Basic",
        testa: "Il tuo accesso Premium è terminato.",
        par: [pagato ? `il tuo abbonamento Premium è terminato il ${d}.` : `la tua prova Premium è terminata il ${d}.`,
              "Come previsto, il tuo account è passato automaticamente al piano Basic."],
        sez: [["Cosa cambia?", ["Il piano Basic resta attivo.", "Non verranno effettuati ulteriori addebiti.",
                                "Le funzionalità riservate a Premium non saranno più disponibili."]],
              ["Vuoi tornare a Premium?", []]],
        dopo: ["Puoi riattivare il tuo abbonamento quando vuoi, direttamente dal tuo account."],
        btn: ["Scopri i piani Premium", PREMIUM],
        fine: "Grazie per aver utilizzato EdgeValor. Saremo felici di averti nuovamente tra i nostri utenti Premium.",
        piede: "Ricevi questa email perché hai un account EdgeValor.",
      };
  }
}

// HTML: tabelle e stili in linea, COLORI DEL TERMINALE (blu notte, verde acqua, oro per Premium).
// MODALITA' SCURA DI GMAIL (app iPhone/Android): Gmail "inverte" i colori delle email e il blu notte diventava chiaro.
//   1) gli sfondi sono anche "background-image" (sfumatura a tinta unita): Gmail non inverte le immagini di sfondo;
//   2) i testi sono dentro due riquadri .gm-s/.gm-d con fusione "screen" + "difference": solo in Gmail (selettore
//      u + .body) annullano l'inversione e i testi tornano ai colori originali. Gli altri programmi li ignorano.
//   Il logo resta FUORI dai riquadri: e' un'immagine e Gmail non la tocca.
//   v8.95 COLORI (oro di Premium, verde acqua delle spunte): Gmail scuro inverte la luminosita' e il riquadro inverte i
//   canali, quindi l'oro usciva azzurro e il verde rosa. Solo in Gmail (u + .body) si usa il colore "complementare"
//   (.eg = #5d87f3 -> oro, .et = #c12f3c -> verde acqua, .eb = fondo del pulsante #d13b49 -> verde acqua)
//   che dopo le inversioni torna quello giusto.
const BG = "#040b1a", CARD = "#0b1a36", LINEA = "#1f3560";
const sf = (c: string) => `background-color:${c};background-image:linear-gradient(${c},${c})`;
function html(t: Mail, nome: string) {
  const P = (x: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d6e0ee">${x}</p>`;
  // v8.95 riepilogo SENZA sfondo proprio: nella modalita' scura di Gmail (iPhone) un fondo diverso dalla card veniva
  // invertito in crema con il testo chiaro sopra, quasi illeggibile (segnalato da Ya). Ora eredita il blu della card
  // come il resto del testo: solo bordo e righe divisorie, testi chiari ad alto contrasto.
  const riep = t.riep ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;border:1px solid #2c4776;border-radius:12px">
<tr><td colspan="2" style="padding:14px 18px 6px;font-size:12.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#f3c75f" class="eg">${t.riepT || "Riepilogo dell'abbonamento"}</td></tr>
${t.riep.map(([k, v]) => `<tr><td style="padding:8px 18px;font-size:14px;color:#c3cfe0;border-top:1px solid #2c4776">${k}</td><td align="right" style="padding:8px 18px;font-size:14.5px;font-weight:700;color:#ffffff;border-top:1px solid #2c4776;white-space:nowrap">${v}</td></tr>`).join("")}
<tr><td colspan="2" style="height:8px"></td></tr></table>` : "";
  const sez = (t.sez || []).map(([tit, voci]) => `<p style="margin:18px 0 8px;font-size:16px;font-weight:700;color:#f1f5fb">${tit}</p>` +
    voci.map((v) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="top" class="et" style="padding:3px 10px 3px 0;color:#2ec4b6;font-weight:700">&#10003;</td><td style="padding:3px 0;font-size:15px;line-height:1.5;color:#d6e0ee">${v}</td></tr></table>`).join("")).join("");
  const btn = t.btn ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td class="eb" style="border-radius:10px;${sf("#2ec4b6")}"><a href="${t.btn[1]}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#04211e;text-decoration:none">${t.btn[0]}</a></td></tr></table>` : "";
  const gm = (x: string) => `<div class="gm-s"><div class="gm-d">${x}</div></div>`;   // testi protetti dall'inversione di Gmail
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(t.oggetto)}</title>
<style>u + .body .gm-s{background:#000;mix-blend-mode:screen}u + .body .gm-d{background:#000;mix-blend-mode:difference}
u + .body .eg{color:#5d87f3!important}u + .body .et{color:#c12f3c!important}
u + .body .eb{background-color:#d13b49!important;background-image:linear-gradient(#d13b49,#d13b49)!important}</style></head>
<body class="body" style="margin:0;padding:0;${sf(BG)};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}" style="${sf(BG)};padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD}" style="max-width:560px;${sf(CARD)};border:1px solid ${LINEA};border-radius:16px">
<tr><td style="padding:26px 28px 6px"><img src="cid:logo" width="110" height="50" alt="EdgeValor" style="display:block;border:0;width:110px;height:auto"></td></tr>
<tr><td style="padding:14px 28px 4px">${gm(`<h1 style="margin:0 0 18px;font-size:21px;line-height:1.35;color:#f1f5fb">${t.testa}</h1>
${P(nome ? `Ciao ${esc(nome)},` : "Ciao,")}${t.par.map(P).join("")}${riep}${sez}${(t.dopo || []).map(P).join("")}${btn}${t.fine ? P(t.fine) : ""}`)}</td></tr>
<tr><td style="padding:0 28px 24px;border-top:1px solid ${LINEA}">${gm(`<p style="margin:16px 0 0;font-size:15px;color:#f1f5fb"><b>Yahya Allouchi</b></p>
<p style="margin:2px 0 0;font-size:13px;color:#a9b8d0">Fondatore di EdgeValor</p>`)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:14px 4px 0">${gm(`<p style="margin:0;font-size:11.5px;line-height:1.6;color:#7d8ba5">${t.piede}<br>${PIEDE_INFO}<br>
<a href="${PRIVACY}" style="color:#7d8ba5">Privacy</a> · <a href="${CONDIZIONI}" style="color:#7d8ba5">Condizioni d'uso</a></p>`)}</td></tr></table>
</td></tr></table></body></html>`;
}
// versione solo testo (aiuta a non finire nello spam)
function testo(t: Mail, nome: string) {
  const via = (s: string) => s.replace(/<[^>]+>/g, "");
  return [t.testa, "", nome ? `Ciao ${nome},` : "Ciao,", "", ...t.par.map(via),
    ...(t.riep ? ["", t.riepT || "Riepilogo dell'abbonamento", ...t.riep.map(([k, v]) => `- ${k}: ${v}`)] : []),
    ...(t.sez || []).flatMap(([tit, voci]) => ["", tit, ...voci.map((v) => "- " + v)]),
    ...(t.dopo || []).map(via), ...(t.btn ? ["", `${t.btn[0]}: ${t.btn[1]}`] : []), ...(t.fine ? ["", t.fine] : []),
    "", "Yahya Allouchi", "Fondatore di EdgeValor", "", t.piede, PIEDE_INFO, `Privacy: ${PRIVACY}`, `Condizioni d'uso: ${CONDIZIONI}`].join("\n");
}

// ---------- v8.93 PDF DELLE CONDIZIONI ACCETTATE (allegato del benvenuto) ----------
// Testo preso dalla pagina pubblica delle note legali nel momento dell'invio (pochi minuti dopo la conferma
// dell'email): e' la versione in vigore quando l'utente si e' registrato. In testa i dati della registrazione.
// I caratteri fuori dalla codifica dei font standard del PDF (es. "−", "≥", "→") si sostituiscono con equivalenti.
const SOST: Record<string, string> = { "\u2212": "-", "\u2265": ">=", "\u2264": "<=", "\u2192": "->", "\u00a0": " ", "\u202f": " ",
  "\u2011": "-", "\u2248": "~", "\u221a": "radq ", "\u2009": " " };
const WIN = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const pulito = (s: string) => [...s].map((c) => SOST[c] ?? ((c.charCodeAt(0) < 256 || WIN.has(c)) ? c : "")).join("");
const entita = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

async function condizioni(): Promise<{ versione: string; blocchi: [string, string][] }> {
  const h = await (await fetch("https://edgevalor.com/legale/", { headers: { "Cache-Control": "no-cache" } })).text();
  const versione = (h.match(/Ultimo aggiornamento:\s*([0-9/]+)/) || [])[1] || "";
  const corpo = h.slice(h.indexOf("<section"), h.lastIndexOf("</section>") + 10).replace(/<script[\s\S]*?<\/script>/g, "");
  const blocchi: [string, string][] = [];   // [tipo, testo]: "h" titolo di sezione, "p" paragrafo, "li" voce di elenco
  for (const m of corpo.matchAll(/<(h2|p|li)[^>]*>([\s\S]*?)<\/\1>/g)) {
    let t = m[2].replace(/<small>(\d+)<\/small>/, "$1. ").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "");
    t = entita(t).replace(/\s+/g, " ").trim();
    if (t) blocchi.push([m[1] == "h2" ? "h" : m[1], t]);
  }
  if (blocchi.length < 10) throw new Error("pagina delle condizioni non letta");
  return { versione, blocchi };
}

async function pdfCondizioni(x: Riga, a: string): Promise<string> {
  const { versione, blocchi } = await condizioni();
  const doc = await PDFDocument.create();
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle("EdgeValor - Condizioni d'uso accettate"); doc.setAuthor("EdgeValor"); doc.setCreator("edgevalor.com");
  const W = 595.28, H = 841.89, M = 54, LARGH = W - 2 * M;
  let pag = doc.addPage([W, H]), y = H - M;
  const nuova = () => { pag = doc.addPage([W, H]); y = H - M; };
  // scrive un testo andando a capo sulla larghezza della pagina
  const scrivi = (testo: string, f = F, dim = 9.5, col = rgb(0.13, 0.16, 0.22), rientro = 0, dopo = 5) => {
    const parole = pulito(testo).split(" "); let riga = "";
    const fuori = (r: string) => { if (y < M + dim) nuova(); pag.drawText(r, { x: M + rientro, y, size: dim, font: f, color: col }); y -= dim * 1.4; };
    for (const w of parole) { const prova = riga ? riga + " " + w : w;
      if (f.widthOfTextAtSize(prova, dim) > LARGH - rientro && riga) { fuori(riga); riga = w; } else riga = prova; }
    if (riga) fuori(riga); y -= dopo;
  };
  const ora = new Date().toLocaleString("it-IT", { ...TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const reg = x.creato ? new Date(x.creato).toLocaleString("it-IT", { ...TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  scrivi("EdgeValor", B, 18, rgb(0.05, 0.45, 0.42), 0, 2);
  scrivi("Copia delle condizioni d'uso accettate con la registrazione", B, 12.5, rgb(0.05, 0.08, 0.14), 0, 8);
  for (const [k, v] of [["Account", idEV(x.numero)], ["Email", a], ["Registrazione (ora italiana)", reg],
                        ["Versione delle condizioni", versione ? "pubblicata il " + versione : "in vigore alla registrazione"],
                        ["Documento generato il", ora], ["Testo pubblico", "https://edgevalor.com/legale/"]]) {
    scrivi(`${k}: ${v}`, F, 9.5, rgb(0.2, 0.24, 0.32), 0, 1);
  }
  y -= 6; pag.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.75, 0.8, 0.86) }); y -= 16;
  for (const [tipo, t] of blocchi) {
    if (tipo == "h") { if (y < M + 60) nuova(); y -= 4; scrivi(t, B, 11.5, rgb(0.05, 0.08, 0.14), 0, 3); }
    else if (tipo == "li") scrivi("•  " + t, F, 9.5, undefined, 10, 2);
    else scrivi(t, F, 9.5);
  }
  const pagine = doc.getPages();
  pagine.forEach((p, i) => p.drawText(pulito(`EdgeValor · Condizioni d'uso · ${idEV(x.numero)} · pagina ${i + 1} di ${pagine.length}`),
    { x: M, y: 28, size: 8, font: F, color: rgb(0.5, 0.55, 0.62) }));
  const byte = await doc.save(); let bin = "";
  for (let i = 0; i < byte.length; i += 0x8000) bin += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function spedisci(a: string, x: Riga, chiaveIdem: string) {
  const t = testi(x), nome = (x.nome || "").trim();
  const allegati: { filename: string; content: string; content_id?: string }[] = [{ filename: "edgevalor.png", content: LOGO, content_id: "logo" }];
  // v8.93 il benvenuto non parte senza il PDF delle condizioni (si riprova al giro successivo)
  if (x.tipo == "benvenuto") allegati.push({ filename: `EdgeValor-condizioni-${idEV(x.numero)}.pdf`, content: await pdfCondizioni(x, a) });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": chiaveIdem },
    body: JSON.stringify({ from: MITTENTE, to: [a], reply_to: "info@edgevalor.com", subject: t.oggetto,
      html: html(t, nome), text: testo(t, nome),
      attachments: allegati }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${JSON.stringify(j)}`);
  return (j as { id?: string }).id || "";
}

Deno.serve(async (req) => {
  const esito = { inviate: 0, errori: 0, prova: false };
  try {
    if (!RESEND) return Response.json({ errore: "RESEND_API_KEY mancante nei secret" }, { status: 500 });
    const corpo = req.method == "POST" ? await req.json().catch(() => ({})) : {};
    if ((corpo as { prova?: boolean }).prova) {
      esito.prova = true;
      const admin = await rpc("email_admin") as string, ora = new Date(Math.floor(Date.now() / 6e5) * 6e5).toISOString();
      if (!admin || !(await rpc("email_prenota", { utente: "00000000-0000-0000-0000-000000000000", tipo: "test", scadenza: ora })))
        return Response.json({ ...esito, nota: "prova gia' fatta in questi 10 minuti" });
      const base = { utente: "", email: admin, numero: 1, nome: "Yahya" };
      const tra = (g: number) => new Date(Date.now() + g * 864e5).toISOString();
      // v8.93 modelli nuovi: benvenuto (con il PDF), regalo e revoca
      const prove = [{ ...base, tipo: "benvenuto", rinnovo: false, piano: null, scadenza: tra(0), creato: tra(0), prova_fino: tra(14) },
                     { ...base, tipo: "regalo", rinnovo: false, piano: "mese", scadenza: tra(30) },
                     { ...base, tipo: "revoca", rinnovo: false, piano: null, scadenza: tra(0), motivo: "minacce" }] as Riga[];
      for (const x of prove) { await spedisci(admin, x, `test-${x.tipo}-${x.piano}-${x.rinnovo}-${ora}`); esito.inviate++; }
      return Response.json(esito);
    }
    const righe = (await rpc("email_da_inviare4")) as Riga[] || [];
    for (const x of righe) {
      const k = { utente: x.utente, tipo: x.tipo, scadenza: x.scadenza };
      if (!(await rpc("email_prenota", k))) continue;
      try {
        // v9.14 per l'email di pagamento serve la data dell'abbonamento: importo del listino di allora
        if (x.tipo == "attivo" && x.piano) {
          x.abbonato_il = await rpc("abbonamento_creato_di", { p_utente: x.utente }).catch(() => null) as string | null;
          x.importo = Number(await rpc("abbonamento_importo_di", { p_utente: x.utente }).catch(() => null)) || null;
        }
        const idr = await spedisci(x.email, x, `${x.utente}-${x.tipo}-${x.scadenza}`);
        await rpc("email_esito", { ...k, id_resend: idr }); esito.inviate++;
      } catch (e) {
        console.error("[email] invio non riuscito", x.tipo, e);         // mai l'indirizzo nei log
        await rpc("email_annulla", k).catch(() => {}); esito.errori++;
      }
    }
    return Response.json(esito);
  } catch (e) {
    console.error("[email] errore", e);
    return Response.json({ ...esito, errore: String(e).slice(0, 200) }, { status: 500 });
  }
});
