// ---------- richiesta-premium (v8.10): email automatica a chi chiede Premium dalla pagina /prezzi/ ----------
// Il modulo "Contattaci" di edgevalor.com/prezzi/ manda {email, piano, botcheck}. Questa funzione risponde SUBITO
// all'utente con l'email "Attiva Premium" (link di pagamento PayPal del piano scelto + come funziona + cosa sblocchi).
// La notifica a Ya resta quella di web3forms (non cambia nulla).
// CONTRO GLI ABUSI (l'indirizzo e' pubblico): campo trappola botcheck, solo richieste da edgevalor.com,
// al massimo 1 email per indirizzo ogni 24 ore e 30 email all'ora in totale (public.prenota_richiesta_premium).
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions; SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY li mette Supabase da solo.
// RISPOSTE: {ok:true} anche quando il limite e' raggiunto (non si rivela se un indirizzo ha gia' chiesto).
// DEBUG: log della funzione nella dashboard di Supabase -> righe "richiesta-premium".

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const ORIGINI = ["https://edgevalor.com", "https://www.edgevalor.com"];

// link di pagamento PayPal creati il 18/11/2026 (nessun rinnovo automatico)
const LINK: Record<string, string> = {
  annuale: "https://www.paypal.com/ncp/payment/YMJMNNGYKSYBG",
  mensile: "https://www.paypal.com/ncp/payment/HR67S7RFGBSD4",
};
const PIANI: Record<string, { nome: string; prezzo: string; nota: string; extra: string }> = {
  annuale: { nome: "Premium Annuale", prezzo: "239,88 €", nota: "Pagamento unico per 12 mesi",
             extra: "Equivale a 19,99 € al mese: risparmi 84,12 € (−26%)." },
  mensile: { nome: "Premium Mensile", prezzo: "27,00 €", nota: "Per 1 mese",
             extra: "Con l'annuale paghi 239,88 € una volta sola e risparmi il 26%." },
};
const SBLOCCA = ["Composizione e pesi di ogni portafoglio", "Acquisto guidato con il rischio del mese",
  "Selezione di oggi: le aziende con l'edge", "Scheda completa di ogni azienda", "COT completo, Forex e Crypto",
  "Macro e Live", "Stagionalità, volatilità e correlazioni", "Paesi emergenti, tabella completa"];

// colori del sito: fondo scuro, testo chiaro, verde acqua, oro per Premium
const BG = "#040b1a", CARD = "#0b1d42", LINEA = "#1c2c4d", INK = "#f1f5fb", MUTE = "#9fb0c9", ACC = "#2ec4b6", ORO = "#f3c75f";
const FONT = "font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

// HTML dell'email (stessa grafica della bozza approvata da Ya): tabelle e stili in linea, max 560 px
function html(piano: string) {
  const p = PIANI[piano], link = LINK[piano], altro = piano == "annuale" ? "mensile" : "annuale";
  // spunta e testo in due celle: se il testo va a capo resta allineato
  const voci = SBLOCCA.map((v) => `<tr><td valign="top" style="padding:5px 10px 5px 0;width:16px;${FONT}font-size:15px;color:${ACC};font-weight:700">&#10003;</td><td style="padding:5px 0;${FONT}font-size:15px;color:${INK};line-height:1.4">${v}</td></tr>`).join("");
  const passo = (n: number, t: string, s: string) => `<tr><td valign="top" style="padding:0 14px 16px 0;width:28px"><div style="width:28px;height:28px;border-radius:14px;background:${ACC};color:${BG};${FONT}font-weight:800;font-size:14px;line-height:28px;text-align:center">${n}</div></td><td style="padding:0 0 16px;${FONT}font-size:15px;color:${INK};line-height:1.45"><b>${t}</b><br><span style="color:${MUTE};font-size:14px">${s}</span></td></tr>`;
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>EdgeValor Premium</title></head>
<body style="margin:0;padding:0;background:${BG}">
<div style="display:none;max-height:0;overflow:hidden">Il link per attivare ${p.nome} e cosa succede dopo il pagamento.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
 <tr><td style="padding:0 4px 24px;${FONT}font-size:22px;font-weight:800;letter-spacing:-.4px;color:${INK}">Edge<span style="color:${ACC}">Valor</span></td></tr>
 <tr><td style="background:${CARD};border:1px solid ${LINEA};border-radius:20px;padding:32px 28px">
  <p style="margin:0 0 6px;${FONT}font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${ORO}">Richiesta ricevuta</p>
  <h1 style="margin:0 0 12px;${FONT}font-size:26px;line-height:1.2;font-weight:800;color:${INK}">Attiva ${p.nome}</h1>
  <p style="margin:0 0 24px;${FONT}font-size:15px;line-height:1.55;color:${MUTE}">Grazie per l'interesse. Ecco il link per il pagamento e cosa succede dopo.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${LINEA};border-radius:14px"><tr><td style="padding:20px 22px">
   <p style="margin:0;${FONT}font-size:14px;color:${MUTE}">${p.nome}</p>
   <p style="margin:4px 0 0;${FONT}font-size:30px;font-weight:800;color:${INK}">${p.prezzo}</p>
   <p style="margin:0 0 8px;${FONT}font-size:14px;color:${MUTE}">${p.nota}</p>
   <p style="margin:0;${FONT}font-size:14px;color:${ACC}">${p.extra}</p>
  </td></tr></table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:12px;background:${ORO}">
   <a href="${link}" style="display:inline-block;padding:15px 30px;${FONT}font-size:16px;font-weight:800;color:#2a1d00;text-decoration:none">Paga con PayPal</a></td></tr></table>
  <p style="margin:0 0 28px;${FONT}font-size:13px;color:${MUTE}">Puoi pagare anche con carta, senza conto PayPal. Nessun rinnovo automatico.</p>
  <p style="margin:0 0 14px;${FONT}font-size:17px;font-weight:800;color:${INK}">Come funziona</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
   ${passo(1, "Paga con il link qui sopra", "Nel campo «Email del tuo account EdgeValor» scrivi l'email con cui accedi al terminale.")}
   ${passo(2, "Attiviamo Premium sul tuo account", "Ti scriviamo appena è attivo.")}
   ${passo(3, "Entra nel terminale", "Su edgevalor.com/terminale trovi tutto sbloccato.")}
  </table>
  <p style="margin:12px 0 10px;${FONT}font-size:17px;font-weight:800;color:${INK}">Cosa sblocchi</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${voci}</table>
  <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${LINEA};${FONT}font-size:14px;line-height:1.55;color:${MUTE}">
   Preferisci il piano ${altro}? <a href="${LINK[altro]}" style="color:${ACC}">Paga qui</a>.<br>
   Non hai ancora un account? <a href="https://edgevalor.com/accedi/" style="color:${ACC}">Registrati</a>: è gratis e include 14 giorni di Premium.<br>
   Domande? Rispondi a questa email.</p>
 </td></tr>
 <tr><td style="padding:22px 8px 0;${FONT}font-size:12px;line-height:1.5;color:#6b7c96;text-align:center">
  Hai ricevuto questa email perché l'hai chiesta su edgevalor.com/prezzi.<br>
  EdgeValor ha finalità educative e informative: non è consulenza finanziaria.</td></tr>
</table></td></tr></table></body></html>`;
}

// versione solo testo (aiuta a non finire nello spam)
function testo(piano: string) {
  const p = PIANI[piano], altro = piano == "annuale" ? "mensile" : "annuale";
  return [`Attiva ${p.nome}`, "", `${p.prezzo} · ${p.nota}`, p.extra, "", `Paga con PayPal: ${LINK[piano]}`,
    "Puoi pagare anche con carta, senza conto PayPal. Nessun rinnovo automatico.", "", "Come funziona",
    "1. Paga con il link: nel campo «Email del tuo account EdgeValor» scrivi l'email con cui accedi al terminale.",
    "2. Attiviamo Premium sul tuo account e ti scriviamo appena è attivo.", "3. Entra in edgevalor.com/terminale.", "",
    "Cosa sblocchi", ...SBLOCCA.map((v) => "- " + v), "", `Piano ${altro}: ${LINK[altro]}`,
    "Non hai un account? https://edgevalor.com/accedi/ (gratis, 14 giorni di Premium)", "Domande? Rispondi a questa email.", "",
    "EdgeValor ha finalità educative e informative: non è consulenza finanziaria."].join("\n");
}

Deno.serve(async (req) => {
  const origine = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": ORIGINI.includes(origine) ? origine : ORIGINI[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Vary": "Origin" };
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method == "OPTIONS") return new Response(null, { headers: cors });
  if (req.method != "POST" || !ORIGINI.includes(origine)) return json({ ok: false }, 403);
  try {
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
    const piano = /mensile/i.test(String(b.piano || "")) ? "mensile" : "annuale";   // il modulo manda "Annuale · ..." o "Mensile · ..."
    if (b.botcheck) return json({ ok: true });                                     // bot: si finge riuscito
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, errore: "email" }, 400);
    // prenotazione (limiti contro gli abusi) con la chiave di servizio
    const r = await fetch(`${URL_DB}/rest/v1/rpc/prenota_richiesta_premium`, { method: "POST",
      headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_email: email, p_piano: piano }) });
    if (!r.ok) throw new Error("prenota HTTP " + r.status);
    if (!(await r.json())) { console.log("richiesta-premium: limite raggiunto"); return json({ ok: true }); }
    const s = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MITTENTE, to: [email], reply_to: "info@edgevalor.com",
        subject: `EdgeValor · Attiva ${PIANI[piano].nome}`, html: html(piano), text: testo(piano) }) });
    if (!s.ok) throw new Error("resend HTTP " + s.status + " " + (await s.text()).slice(0, 200));
    console.log("richiesta-premium: inviata (" + piano + ")");
    return json({ ok: true });
  } catch (e) {
    console.error("richiesta-premium:", e instanceof Error ? e.message : e);
    return json({ ok: false }, 500);
  }
});
