// ---------- email-campagne (v9.25): email delle offerte stagionali EdgeValor (Black Friday, Cyber Monday, Pasqua, saldi) ----------
// Stile TradingView (idea di Ya): una grande immagine con il design delle card del sito (luci colorate, titolo, -33%)
// e sotto poche righe semplici, un pulsante e la scadenza. L'immagine e' servita dal sito (edgevalor.com/email/,
// creata da cot_radar/email_campagne_img.py) e allegata in linea (cid:testa), cosi' si vede subito senza "mostra immagini".
// MODALITA':
//   POST {"prova": true, "k": "black"}  -> SOLO all'email del fondatore (al massimo una volta ogni 10 minuti).
//   POST {"tutti": true, "k": "black"}  -> (v9.28) a tutti i registrati che ricevono le offerte e non hanno Premium.
//        Serve la chiave dell'invio (privato.chiave_campagne, la manda solo il job pg_cron creato da campagna_programma)
//        e la campagna deve essere
//        in privato.campagne_approvate: la si aggiunge SOLO dopo il si' di Ya sui testi (niente messaggi a suo nome
//        senza il suo ok). Ogni persona riceve ogni campagna una volta sola (email_prenota).
//   POST {"no": "<codice>"} oppure ?no=<codice> -> (v9.28) disiscrizione dalle offerte con un clic (pagina
//        edgevalor.com/offerte/ e pulsante "Annulla iscrizione" di Gmail, intestazioni List-Unsubscribe).
// k: black (Black Friday), cyber (Cyber Monday, ultimo giorno), pasqua, estate, inverno.
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions.
import { LOGO } from "./logo.ts";   // stesso logo delle email di servizio

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const LINK = "https://edgevalor.com/terminale/?premium=1";
const PRIVACY = "https://edgevalor.com/legale/#privacy", CONDIZIONI = "https://edgevalor.com/legale/#termini";
const NO_OFFERTE = "mailto:info@edgevalor.com?subject=No%20offerte";   // solo per la prova al fondatore
// v9.28 link personali per non ricevere piu' offerte: pagina del sito (nel testo) e funzione (pulsante di Gmail)
const NO_PAGINA = (t: string) => `https://edgevalor.com/offerte/?no=${t}`;
const NO_DIRETTO = (t: string) => `${URL_DB}/functions/v1/email-campagne?no=${t}`;
const CORS = { "Access-Control-Allow-Origin": "https://edgevalor.com", "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type" };

type Testi = { oggetto: string; antep: string; par: string[]; cta: string; fine: string; colore: string };
// testi brevi, come nelle email di TradingView: cosa, quanto, fino a quando
const CAMPAGNE: Record<string, Testi> = {
  black: { oggetto: "Black Friday: blocca la tariffa attuale (−33%)", antep: "Premium annuale a 19,99 € al mese invece di 29,99 €.",
    par: ["fino a lunedì 30 novembre Premium annuale costa <b>19,99 € al mese</b> invece di 29,99 €: il <b>33% in meno</b>, la metà del piano mensile.",
          "La tariffa resta bloccata finché resti abbonato. Dal 1° dicembre il listino passa a 39,99 € al mese (29,99 € con l'annuale)."],
    cta: "Blocca la tariffa", fine: "L'offerta termina lunedì 30 novembre alle 23:59 (ora italiana).", colore: "#ff5a3c" },
  cyber: { oggetto: "Cyber Monday: ultimo giorno per bloccare la tariffa", antep: "Oggi è l'ultimo giorno: 19,99 € al mese invece di 29,99 €.",
    par: ["oggi è l'ultimo giorno per avere Premium annuale a <b>19,99 € al mese</b> invece di 29,99 €: il <b>33% in meno</b>, bloccato finché resti abbonato.",
          "Da domani il listino passa a 39,99 € al mese (29,99 € con l'annuale)."],
    cta: "Blocca la tariffa", fine: "L'offerta termina stasera alle 23:59 (ora italiana).", colore: "#3d7bff" },
  pasqua: { oggetto: "Offerta di Pasqua: Premium annuale −33%", antep: "Il primo anno a 19,99 € al mese invece di 29,99 €.",
    par: ["per qualche giorno Premium annuale costa <b>19,99 € al mese</b> il primo anno invece di 29,99 €: il <b>33% in meno</b>, la metà del piano mensile.",
          "Dal secondo anno si rinnova a 359,88 €. Disdici quando vuoi dal Profilo."],
    cta: "Attiva l'offerta", fine: "L'offerta termina il lunedì di Pasquetta alle 23:59 (ora italiana).", colore: "#34d399" },
  estate: { oggetto: "Saldi d'estate: Premium annuale −33%", antep: "Il primo anno a 19,99 € al mese invece di 29,99 €.",
    par: ["per i saldi d'estate Premium annuale costa <b>19,99 € al mese</b> il primo anno invece di 29,99 €: il <b>33% in meno</b>, la metà del piano mensile.",
          "Dal secondo anno si rinnova a 359,88 €. Disdici quando vuoi dal Profilo."],
    cta: "Attiva l'offerta", fine: "L'offerta dura 9 giorni, fino alle 23:59 dell'ultimo giorno (ora italiana).", colore: "#fb923c" },
  inverno: { oggetto: "Saldi d'inverno: Premium annuale −33%", antep: "Il primo anno a 19,99 € al mese invece di 29,99 €.",
    par: ["per i saldi d'inverno Premium annuale costa <b>19,99 € al mese</b> il primo anno invece di 29,99 €: il <b>33% in meno</b>, la metà del piano mensile.",
          "Dal secondo anno si rinnova a 359,88 €. Disdici quando vuoi dal Profilo."],
    cta: "Attiva l'offerta", fine: "L'offerta termina il 10 gennaio alle 23:59 (ora italiana).", colore: "#818cf8" },
};

async function rpc(nome: string, corpo: Record<string, unknown> = {}) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, { method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status} ${await r.text()}`);
  return r.status == 204 ? null : r.json();
}

// immagine di testa dal sito, in base64 per l'allegato in linea
async function testa(k: string) {
  const r = await fetch(`https://edgevalor.com/email/testa_${k}.jpg?v=${Date.now()}`);
  if (!r.ok) throw new Error(`immagine testa_${k}.jpg non trovata (HTTP ${r.status})`);
  const b = new Uint8Array(await r.arrayBuffer()); let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

// HTML: tutto nero come le card del sito (in Gmail scuro il nero resta nero), immagine larga 600, testi chiari
const sf = (c: string) => `background-color:${c};background-image:linear-gradient(${c},${c})`;
function html(t: Testi, nome: string, no = NO_OFFERTE) {
  const P = (x: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#e6e6e6">${x}</p>`;
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${t.oggetto}</title></head>
<body style="margin:0;padding:0;${sf("#000000")};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${t.antep}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="${sf("#000000")};padding:20px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="max-width:600px;${sf("#000000")}">
<tr><td align="center" style="padding:10px 0 18px"><img src="cid:logo" width="110" height="50" alt="EdgeValor" style="display:block;border:0;width:110px;height:auto"></td></tr>
<tr><td><a href="${LINK}"><img src="cid:testa" width="600" alt="${t.oggetto}" style="display:block;border:0;width:100%;max-width:600px;height:auto;border-radius:14px"></a></td></tr>
<tr><td style="padding:26px 24px 6px">${P(nome ? `Ciao ${nome},` : "Ciao,")}${t.par.map(P).join("")}</td></tr>
<tr><td align="center" style="padding:6px 24px 10px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:99px;${sf(t.colore)}">
<a href="${LINK}" style="display:inline-block;padding:15px 34px;font-size:16px;font-weight:800;color:#0a0a0a;text-decoration:none">${t.cta} &rarr;</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:6px 24px 26px;font-size:13.5px;color:#a9a9a9">${t.fine}</td></tr>
<tr><td style="padding:18px 24px 0;border-top:1px solid #222">
<p style="margin:0;font-size:15px;color:#f1f1f1"><b>Yahya Allouchi</b></p><p style="margin:2px 0 16px;font-size:13px;color:#a9a9a9">Fondatore di EdgeValor</p>
<p style="margin:0;font-size:11.5px;line-height:1.6;color:#7d7d7d">Ricevi questa email perché sei registrato a EdgeValor.
<a href="${no}" style="color:#9a9a9a">Non ricevere più offerte</a> con un clic, oppure spegnile dal Profilo.<br>
Contenuti a scopo educativo e informativo, non consulenza finanziaria.<br>
<a href="${PRIVACY}" style="color:#7d7d7d">Privacy</a> · <a href="${CONDIZIONI}" style="color:#7d7d7d">Condizioni d'uso</a></p></td></tr>
</table></td></tr></table></body></html>`;
}
const testo = (t: Testi, nome: string, no = NO_OFFERTE) => [nome ? `Ciao ${nome},` : "Ciao,", "", ...t.par.map((x) => x.replace(/<[^>]+>/g, "")), "",
  `${t.cta}: ${LINK}`, "", t.fine, "", "Yahya Allouchi", "Fondatore di EdgeValor", "",
  `Non vuoi ricevere offerte? ${no}`, `Privacy: ${PRIVACY}`].join("\n");

// manda una email della campagna k a un indirizzo (allegati: logo e immagine di testa gia' in base64)
async function manda(t: Testi, k: string, a: string, nome: string, no: string, diretto: string, img: string, chiave: string) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": chiave },
    body: JSON.stringify({ from: MITTENTE, to: [a], reply_to: "info@edgevalor.com", subject: t.oggetto,
      html: html(t, nome, no), text: testo(t, nome, no),
      // Gmail e Outlook mostrano "Annulla iscrizione" in alto: con One-Click la richiesta arriva qui (POST ?no=)
      headers: diretto ? { "List-Unsubscribe": `<${diretto}>, <${NO_OFFERTE}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
                       : { "List-Unsubscribe": `<${NO_OFFERTE}>` },
      attachments: [{ filename: "edgevalor.png", content: LOGO, content_id: "logo" },
                    { filename: `edgevalor-${k}.jpg`, content: img, content_id: "testa" }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${JSON.stringify(j)}`);
  return (j as { id?: string }).id || "";
}

Deno.serve(async (req) => {
  if (req.method == "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const corpo = req.method == "POST" ? await req.json().catch(() => ({})) : {};
    // v9.28 DISISCRIZIONE: dal link dell'email (pagina del sito) o dal pulsante di Gmail (POST con ?no= nell'indirizzo)
    const no = String((corpo as { no?: string }).no || new URL(req.url).searchParams.get("no") || "");
    if (no) {
      if (!/^[0-9a-f-]{36}$/i.test(no)) return Response.json({ ok: false }, { status: 400, headers: CORS });
      const ok = await rpc("offerte_disiscrivi", { p_token: no });
      return Response.json({ ok: !!ok }, { headers: CORS });
    }
    if (!RESEND) return Response.json({ errore: "RESEND_API_KEY mancante nei secret" }, { status: 500 });
    const k = String((corpo as { k?: string }).k || "black"), t = CAMPAGNE[k];
    if (!t) return Response.json({ errore: "campagna sconosciuta" }, { status: 400 });

    // v9.28 INVIO A TUTTI: solo con la chiave dell'invio (job pg_cron) e solo per una campagna approvata da Ya
    if ((corpo as { tutti?: boolean }).tutti) {
      const chiave = String((corpo as { chiave?: string }).chiave || "");
      if (!chiave || !(await rpc("campagna_chiave_ok", { p: chiave }))) return Response.json({ errore: "non autorizzato" }, { status: 401 });
      const lista = (await rpc("offerte_destinatari", { p_k: k }) || []) as { utente: string; email: string; token: string }[];
      const img = lista.length ? await testa(k) : "", giro = new Date().toISOString().slice(0, 10);
      const esito = { k, inviate: 0, errori: 0 };
      for (const x of lista) {
        // prenotazione prima dell'invio: mai due volte la stessa campagna alla stessa persona
        if (!(await rpc("email_prenota", { utente: x.utente, tipo: "campagna_" + k, scadenza: giro + "T00:00:00Z" }))) continue;
        try {
          const idr = await manda(t, k, x.email, "", NO_PAGINA(x.token), NO_DIRETTO(x.token), img, `campagna-${k}-${x.utente}`);
          await rpc("email_esito", { utente: x.utente, tipo: "campagna_" + k, scadenza: giro + "T00:00:00Z", id_resend: idr });
          esito.inviate++;
        } catch (e) {
          console.error("[campagne] invio non riuscito", k, e);          // mai l'indirizzo nei log
          await rpc("email_annulla", { utente: x.utente, tipo: "campagna_" + k, scadenza: giro + "T00:00:00Z" }).catch(() => {});
          esito.errori++;
        }
        await new Promise((r) => setTimeout(r, 600));                     // sotto il limite di Resend (2 al secondo)
      }
      return Response.json(esito);
    }

    if (!(corpo as { prova?: boolean }).prova) return Response.json({ errore: "indica prova oppure tutti" }, { status: 400 });
    // PROVA: solo all'email del fondatore, al massimo una volta ogni 10 minuti per campagna
    const admin = await rpc("email_admin") as string, ora = new Date(Math.floor(Date.now() / 6e5) * 6e5).toISOString();
    if (!admin || !(await rpc("email_prenota", { utente: "00000000-0000-0000-0000-000000000000", tipo: "campagna_" + k, scadenza: ora })))
      return Response.json({ nota: "prova gia' fatta in questi 10 minuti" });
    await manda(t, k, admin, "Yahya", NO_PAGINA("00000000-0000-0000-0000-000000000000"), "", await testa(k), `campagna-${k}-${ora}`);
    return Response.json({ inviata: true, k });
  } catch (e) {
    console.error("[campagne] errore", e);
    return Response.json({ errore: String(e).slice(0, 200) }, { status: 500, headers: CORS });
  }
});
