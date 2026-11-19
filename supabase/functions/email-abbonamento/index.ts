// ---------- email-abbonamento (v8.18): email di servizio sull'abbonamento EdgeValor ----------
// Parte da sola ogni ora (pg_cron + pg_net) e manda, tramite Resend:
//   attivo            -> pagamento ricevuto / Premium attivato o rinnovato (riepilogo: piano, importo, date)
//   promemoria        -> 3 giorni prima della scadenza (con abbonamento PayPal: avviso del rinnovo automatico)
//   promemoria_prova  -> 3 giorni prima della fine della prova gratuita (se non ha Premium)
//   basic             -> l'accesso e' finito: ora e' nel piano Basic
//   disdetta          -> conferma della disdetta: Premium resta fino a scadenza, poi "basic"
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
              "Per continuare scegli il piano e attivi in un minuto. Se non rinnovi, il tuo account passerà al piano <b>Basic</b> (gratis, nessun addebito)."],
        btn: ["Rinnova Premium", PREMIUM],
        piede: "Ricevi questa email perché hai un account EdgeValor.",
      };
    case "promemoria_prova":
      return {
        oggetto: `La tua prova Premium finisce il ${d} · EdgeValor`,
        testa: "La tua prova Premium sta per finire.",
        par: [`la tua prova gratuita di ${P} finisce il <b>${d}</b>.`,
              "Poi il tuo account passerà al piano <b>Basic</b>, gratis e senza addebiti. Per continuare con Premium scegli il piano e attivi in un minuto."],
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
                                     "Alla scadenza, il tuo account passerà automaticamente al piano Basic, gratuito.",
                                     "Non sono previsti ulteriori addebiti."]],
              ["Hai cambiato idea?", []]],
        dopo: ["Puoi riattivare il tuo abbonamento in qualsiasi momento dalla sezione <b>Gestisci abbonamento</b>. Il nuovo addebito partirà solo alla fine del periodo già pagato."],
        btn: ["Gestisci abbonamento", PREMIUM],
        fine: "Grazie per aver scelto EdgeValor. Speriamo di rivederti presto tra i nostri utenti Premium.",
        piede: "Hai ricevuto questa email perché hai richiesto la disdetta del tuo abbonamento EdgeValor.",
      };
    }
    default: // basic
      return {
        oggetto: "Il tuo account EdgeValor è ora nel piano Basic",
        testa: "Il tuo accesso Premium è terminato.",
        par: [pagato ? `il tuo abbonamento Premium è terminato il ${d}.` : `la tua prova Premium è terminata il ${d}.`,
              "Come previsto, il tuo account è passato automaticamente al piano Basic."],
        sez: [["Cosa cambia?", ["Il piano Basic rimane gratuito.", "Non verranno effettuati ulteriori addebiti.",
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
function html(t: ReturnType<typeof testi>, id: string) {
  const p = t.par.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d6e0ee">${x}</p>`).join("");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.oggetto)}</title></head>
<body style="margin:0;padding:0;background:#050c1d;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050c1d;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a1628;border:1px solid #26426b;border-radius:16px">
<tr><td style="padding:26px 28px 6px"><span style="font-size:22px;font-weight:800;color:#f1f5fb;letter-spacing:-.3px">Edge<span style="color:#2ec4b6">Valor</span></span></td></tr>
<tr><td style="padding:14px 28px 4px"><h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#f1f5fb">${t.titolo}</h1>${p}</td></tr>
<tr><td style="padding:4px 28px 22px"><a href="${t.btn[1]}" style="display:inline-block;background:#2ec4b6;color:#04211e;font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">${t.btn[0]}</a></td></tr>
<tr><td style="padding:0 28px 24px;border-top:1px solid #26426b"><p style="margin:16px 0 0;font-size:15px;color:#f1f5fb"><b>Yahya Allouchi</b></p>
<p style="margin:2px 0 0;font-size:13px;color:#a9b8d0">Fondatore di EdgeValor</p></td></tr>
</table>
<p style="max-width:560px;margin:14px auto 0;font-size:11.5px;line-height:1.5;color:#7d8ba5">Ricevi questa email perché hai un account EdgeValor${id ? ` (ID ${id})` : ""}. Contenuti a scopo educativo, non consulenza finanziaria. <a href="https://edgevalor.com/legale/" style="color:#7d8ba5">Privacy</a></p>
</td></tr></table></body></html>`;
}
// versione solo testo (aiuta a non finire nello spam)
const testo = (t: ReturnType<typeof testi>, id: string) =>
  [t.titolo, "", ...t.par.map((x) => x.replace(/<[^>]+>/g, "")), "", `${t.btn[0]}: ${t.btn[1]}`, "", "Yahya Allouchi", "Fondatore di EdgeValor", "",
   `Ricevi questa email perché hai un account EdgeValor${id ? ` (ID ${id})` : ""}.`].join("\n");

async function spedisci(a: string, tipo: string, scad: string, numero: number | null, chiaveIdem: string) {
  const t = testi(tipo, scad), id = idUtente(numero);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": chiaveIdem },
    body: JSON.stringify({ from: MITTENTE, to: [a], subject: t.oggetto, html: html(t, id), text: testo(t, id) }),
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
    // PROVA: i 4 modelli all'admin, al massimo una volta all'ora (prenotazione con l'ora corrente)
    if ((corpo as { prova?: boolean }).prova) {
      esito.prova = true;
      const admin = await rpc("email_admin") as string, ora = new Date(Math.floor(Date.now() / 36e5) * 36e5).toISOString();
      if (!admin || !(await rpc("email_prenota", { utente: "00000000-0000-0000-0000-000000000000", tipo: "test", scadenza: ora })))
        return Response.json({ ...esito, nota: "prova gia' fatta in quest'ora" });
      const scad = new Date(Date.now() + 3 * 864e5).toISOString();
      for (const tipo of ["attivo", "promemoria", "promemoria_prova", "basic"]) {
        await spedisci(admin, tipo, scad, 1, `test-${tipo}-${ora}`); esito.inviate++;
      }
      return Response.json(esito);
    }
    // GIRO NORMALE
    const righe = (await rpc("email_da_inviare")) as Riga[] || [];
    for (const x of righe) {
      const k = { utente: x.utente, tipo: x.tipo, scadenza: x.scadenza };
      if (!(await rpc("email_prenota", k))) continue;                 // gia' presa da un altro giro
      try {
        const idr = await spedisci(x.email, x.tipo, x.scadenza, x.numero, `${x.utente}-${x.tipo}-${x.scadenza}`);
        await rpc("email_esito", { ...k, id_resend: idr }); esito.inviate++;
      } catch (e) {
        console.error("[email] invio non riuscito", x.tipo, e);       // mai l'indirizzo nei log
        await rpc("email_annulla", k).catch(() => {}); esito.errori++;
      }
    }
    return Response.json(esito);
  } catch (e) {
    console.error("[email] errore", e);
    return Response.json({ ...esito, errore: String(e).slice(0, 200) }, { status: 500 });
  }
});
