// ---------- email-abbonamento (v8.29): email di servizio sull'abbonamento EdgeValor ----------
// Parte da sola ogni ora (pg_cron + pg_net) e manda, tramite Resend:
//   attivo            -> pagamento ricevuto / Premium attivato o rinnovato (riepilogo: piano, importo, date)
//   promemoria        -> 3 giorni prima della scadenza (con abbonamento PayPal: avviso del rinnovo automatico)
//   promemoria_prova  -> 3 giorni prima della fine della prova gratuita (se non ha Premium)
//   basic             -> l'accesso e' finito: ora e' nel piano Basic
//   disdetta          -> conferma della disdetta: Premium resta fino a scadenza, poi "basic"
//   recensione        -> (v8.29) 7 giorni dopo il primo pagamento: invito sincero a recensire su Trustpilot, nessun premio
//   premio_invito     -> (v8.29) un amico invitato si e abbonato: 1 mese di Premium regalato
// TESTI di "attivo", "promemoria" (rinnovo) e "basic" scritti da Ya (19/11/2026). Il nome ("Ciao Mario,") arriva da PayPal.
// Il database (public.email_da_inviare3) dice chi deve ricevere cosa, se ha il rinnovo automatico, piano e nome.
// MAI DOPPIONI: prima di spedire si "prenota" l'invio (utente + tipo + scadenza, chiave unica nel database).
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions di Supabase.
// Il giro parte anche subito dopo un'attivazione o una disdetta (funzione "paypal"), non solo ogni ora.
// PROVA DEI MODELLI: POST con {"prova":true} manda i modelli all'email dell'admin (al massimo una volta ogni 10 minuti).

import { LOGO } from "./logo.ts";   // logo come immagine (allegato in linea, cid:logo): Gmail non lo ricolora

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const TERMINALE = "https://edgevalor.com/terminale/";
const TRUSTPILOT = "https://www.trustpilot.com/evaluate/edgevalor.com";   // v8.29 pagina per scrivere la recensione
const PREMIUM = TERMINALE + "?premium=1";            // apre la finestra dell'abbonamento (46_abbonamento.js)
const PRIVACY = "https://edgevalor.com/legale/#privacy", CONDIZIONI = "https://edgevalor.com/legale/#termini";
const IMPORTO: Record<string, string> = { mensile: "€27,00", annuale: "€239,88" };
const NOME_PIANO: Record<string, string> = { mensile: "Premium Mensile", annuale: "Premium Annuale" };

type Riga = { utente: string; email: string; numero: number | null; tipo: string; scadenza: string;
              rinnovo: boolean; piano: string | null; nome: string | null };
// contenuto di un'email: oggetto, riga in evidenza, paragrafi, riepilogo, sezioni con elenco, pulsante, chiusura, piede
type Mail = { oggetto: string; testa: string; par: string[]; riep?: [string, string][]; sez?: [string, string[]][];
              dopo?: string[]; btn?: [string, string]; fine?: string; piede: string };

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

// x = riga del database. Con PayPal la scadenza salvata e' "prossimo addebito + 1 giorno": il rinnovo e' il giorno prima.
function testi(x: Riga): Mail {
  const d = lunga(x.scadenza), rinnovo = breve(Date.parse(x.scadenza) - 864e5), pagato = !!x.piano;
  const giorno = new Date(Date.parse(x.scadenza) - 864e5).toLocaleDateString("it-IT", { day: "numeric", month: "long", ...TZ });
  const P = '<b style="color:#f3c75f">Premium</b>';
  switch (x.tipo) {
    case "attivo": {
      const riep: [string, string][] = [["Piano", x.piano ? NOME_PIANO[x.piano] || "Premium" : "Premium"]];
      if (pagato) riep.push(["Importo", IMPORTO[x.piano!] || "—"], ["Pagamento", "completato"]);
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
const BG = "#040b1a", CARD = "#0b1a36", LINEA = "#1f3560";
const sf = (c: string) => `background-color:${c};background-image:linear-gradient(${c},${c})`;
function html(t: Mail, nome: string) {
  const P = (x: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d6e0ee">${x}</p>`;
  const riep = t.riep ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;${sf("#071226")};border:1px solid ${LINEA};border-radius:12px">
<tr><td colspan="2" style="padding:14px 18px 6px;font-size:13px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#f3c75f">Riepilogo dell'abbonamento</td></tr>
${t.riep.map(([k, v]) => `<tr><td style="padding:7px 18px;font-size:14px;color:#a9b8d0;border-top:1px solid #16294a;white-space:nowrap">${k}</td><td align="right" style="padding:7px 18px;font-size:14px;font-weight:700;color:#f1f5fb;border-top:1px solid #16294a;white-space:nowrap">${v}</td></tr>`).join("")}
<tr><td colspan="2" style="height:8px"></td></tr></table>` : "";
  const sez = (t.sez || []).map(([tit, voci]) => `<p style="margin:18px 0 8px;font-size:16px;font-weight:700;color:#f1f5fb">${tit}</p>` +
    voci.map((v) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="top" style="padding:3px 10px 3px 0;color:#2ec4b6;font-weight:700">&#10003;</td><td style="padding:3px 0;font-size:15px;line-height:1.5;color:#d6e0ee">${v}</td></tr></table>`).join("")).join("");
  const btn = t.btn ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="border-radius:10px;${sf("#2ec4b6")}"><a href="${t.btn[1]}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#04211e;text-decoration:none">${t.btn[0]}</a></td></tr></table>` : "";
  const gm = (x: string) => `<div class="gm-s"><div class="gm-d">${x}</div></div>`;   // testi protetti dall'inversione di Gmail
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(t.oggetto)}</title>
<style>u + .body .gm-s{background:#000;mix-blend-mode:screen}u + .body .gm-d{background:#000;mix-blend-mode:difference}</style></head>
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
    ...(t.riep ? ["", "Riepilogo dell'abbonamento", ...t.riep.map(([k, v]) => `- ${k}: ${v}`)] : []),
    ...(t.sez || []).flatMap(([tit, voci]) => ["", tit, ...voci.map((v) => "- " + v)]),
    ...(t.dopo || []).map(via), ...(t.btn ? ["", `${t.btn[0]}: ${t.btn[1]}`] : []), ...(t.fine ? ["", t.fine] : []),
    "", "Yahya Allouchi", "Fondatore di EdgeValor", "", t.piede, PIEDE_INFO, `Privacy: ${PRIVACY}`, `Condizioni d'uso: ${CONDIZIONI}`].join("\n");
}

async function spedisci(a: string, x: Riga, chiaveIdem: string) {
  const t = testi(x), nome = (x.nome || "").trim();
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": chiaveIdem },
    body: JSON.stringify({ from: MITTENTE, to: [a], reply_to: "info@edgevalor.com", subject: t.oggetto,
      html: html(t, nome), text: testo(t, nome),
      attachments: [{ filename: "edgevalor.png", content: LOGO, content_id: "logo" }] }),
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
      const prove = [{ ...base, tipo: "recensione", rinnovo: true, piano: "mensile", scadenza: tra(-7) },
                     { ...base, tipo: "premio_invito", rinnovo: false, piano: null, scadenza: tra(30) }] as Riga[];
      for (const x of prove) { await spedisci(admin, x, `test-${x.tipo}-${x.piano}-${x.rinnovo}-${ora}`); esito.inviate++; }
      return Response.json(esito);
    }
    const righe = (await rpc("email_da_inviare3")) as Riga[] || [];
    for (const x of righe) {
      const k = { utente: x.utente, tipo: x.tipo, scadenza: x.scadenza };
      if (!(await rpc("email_prenota", k))) continue;
      try {
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
