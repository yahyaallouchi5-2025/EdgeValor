// ---------- email-campagne (v9.25): email delle offerte stagionali EdgeValor (Black Friday, Cyber Monday, Pasqua, saldi) ----------
// Stile TradingView (idea di Ya): una grande immagine con il design delle card del sito (luci colorate, titolo, -33%)
// e sotto poche righe semplici, un pulsante e la scadenza. L'immagine e' servita dal sito (edgevalor.com/email/,
// creata da cot_radar/email_campagne_img.py) e allegata in linea (cid:testa), cosi' si vede subito senza "mostra immagini".
// MODALITA':
//   POST {"prova": true, "k": "black"}  -> SOLO all'email del fondatore (al massimo una volta ogni 10 minuti).
//   L'invio a tutti gli iscritti NON e' qui: si aggiunge solo dopo l'ok di Ya sui testi (regola: niente messaggi a nome
//   di Ya senza il suo si'), insieme alla disiscrizione con un clic.
// k: black (Black Friday), cyber (Cyber Monday, ultimo giorno), pasqua, estate, inverno.
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions.
import { LOGO } from "./logo.ts";   // stesso logo delle email di servizio

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const LINK = "https://edgevalor.com/terminale/?premium=1";
const PRIVACY = "https://edgevalor.com/legale/#privacy", CONDIZIONI = "https://edgevalor.com/legale/#termini";
const NO_OFFERTE = "mailto:info@edgevalor.com?subject=No%20offerte";

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
function html(t: Testi, nome: string) {
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
<p style="margin:0;font-size:11.5px;line-height:1.6;color:#7d7d7d">Ricevi questa email perché sei registrato a EdgeValor. Non vuoi ricevere offerte?
<a href="${NO_OFFERTE}" style="color:#9a9a9a">Scrivici «No offerte»</a> e non te ne mandiamo più.<br>
Contenuti a scopo educativo e informativo, non consulenza finanziaria.<br>
<a href="${PRIVACY}" style="color:#7d7d7d">Privacy</a> · <a href="${CONDIZIONI}" style="color:#7d7d7d">Condizioni d'uso</a></p></td></tr>
</table></td></tr></table></body></html>`;
}
const testo = (t: Testi, nome: string) => [nome ? `Ciao ${nome},` : "Ciao,", "", ...t.par.map((x) => x.replace(/<[^>]+>/g, "")), "",
  `${t.cta}: ${LINK}`, "", t.fine, "", "Yahya Allouchi", "Fondatore di EdgeValor", "",
  "Non vuoi ricevere offerte? Rispondi «No offerte».", `Privacy: ${PRIVACY}`].join("\n");

Deno.serve(async (req) => {
  try {
    if (!RESEND) return Response.json({ errore: "RESEND_API_KEY mancante nei secret" }, { status: 500 });
    const corpo = req.method == "POST" ? await req.json().catch(() => ({})) : {};
    const k = String((corpo as { k?: string }).k || "black"), t = CAMPAGNE[k];
    if (!t) return Response.json({ errore: "campagna sconosciuta" }, { status: 400 });
    if (!(corpo as { prova?: boolean }).prova) return Response.json({ errore: "solo prova al fondatore (invio a tutti dopo l'ok di Ya)" }, { status: 400 });
    // PROVA: solo all'email del fondatore, al massimo una volta ogni 10 minuti per campagna
    const admin = await rpc("email_admin") as string, ora = new Date(Math.floor(Date.now() / 6e5) * 6e5).toISOString();
    if (!admin || !(await rpc("email_prenota", { utente: "00000000-0000-0000-0000-000000000000", tipo: "campagna_" + k, scadenza: ora })))
      return Response.json({ nota: "prova gia' fatta in questi 10 minuti" });
    const r = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `campagna-${k}-${ora}` },
      body: JSON.stringify({ from: MITTENTE, to: [admin], reply_to: "info@edgevalor.com", subject: t.oggetto,
        html: html(t, "Yahya"), text: testo(t, "Yahya"),
        headers: { "List-Unsubscribe": `<${NO_OFFERTE}>` },
        attachments: [{ filename: "edgevalor.png", content: LOGO, content_id: "logo" },
                      { filename: `edgevalor-${k}.jpg`, content: await testa(k), content_id: "testa" }] }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${JSON.stringify(j)}`);
    return Response.json({ inviata: true, k });
  } catch (e) {
    console.error("[campagne] errore", e);
    return Response.json({ errore: String(e).slice(0, 200) }, { status: 500 });
  }
});
