// ---------- elimina-account (v9.35): l'utente cancella da solo account e dati (Profilo -> "Elimina account") ----------
// Richiesta di Ya (26/11/2026). Ordine delle operazioni, pensato perche' non resti mai un addebito senza account:
//   1) chi e'? (accesso del terminale verificato da Supabase Auth)
//   2) fondatore e team NON si eliminano (privato.account_protetto): risposta 403
//   3) abbonamento PayPal attivo -> prima si DISDICE (funzione paypal, azione=disdici). Se la disdetta non riesce
//      ci si ferma: nessuna cancellazione con un abbonamento che continuerebbe ad addebitare.
//   4) account_prepara_eliminazione: copia i PAGAMENTI in privato.archivio_pagamenti (obbligo fiscale, 10 anni,
//      lo legge solo l'admin) e rende anonime le richieste Premium con la sua email
//   5) cancellazione dell'utente in Supabase Auth: profilo, lista, inviti e abbonamenti si cancellano a catena
//   6) email breve SOLO all'admin (codice EV, mai l'email dell'utente)
// SEGRETI (mai nel codice): SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY nei secret delle Edge Functions.

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const CORS = { "Access-Control-Allow-Origin": "https://edgevalor.com", "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
const json = (o: unknown, s = 200) => Response.json(o, { status: s, headers: CORS });

async function rpc(nome: string, corpo: Record<string, unknown> = {}) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, { method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.status == 204 ? null : r.json();
}

// email breve all'admin (indirizzo dal database)
async function avvisaAdmin(ev: string, disdetto: boolean) {
  if (!RESEND) return;
  const a = await rpc("email_admin").catch(() => "") as string;
  if (!a) return;
  const ora = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" });
  const testo = `Account eliminato dall'utente: ${ev || "—"} (${ora}).` +
    (disdetto ? "\nAveva un abbonamento attivo: disdetto su PayPal prima dell'eliminazione." : "") +
    "\nI pagamenti, se c'erano, sono nell'archivio (Admin · Iscritti → Archivio pagamenti).";
  await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `elimina-${ev}-${Date.now()}` },
    body: JSON.stringify({ from: "EdgeValor <info@edgevalor.com>", to: [a], subject: `Account eliminato · ${ev || "utente"}`, text: testo }) })
    .catch((e) => console.error("[elimina-account] email admin", e));
}

Deno.serve(async (req) => {
  if (req.method == "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method != "POST") return json({ ok: false }, 405);
  try {
    // 1) utente dall'accesso
    const auth = req.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+/.test(auth)) return json({ ok: false, errore: "accesso" }, 401);
    const u = await fetch(`${URL_DB}/auth/v1/user`, { headers: { apikey: CHIAVE_DB, Authorization: auth } });
    const id = u.ok ? ((await u.json()) as { id?: string }).id : "";
    if (!id) return json({ ok: false, errore: "accesso" }, 401);
    // 2) fondatore e team protetti
    const protetto = await fetch(`${URL_DB}/rest/v1/rpc/posso_eliminare_account`, { method: "POST",
      headers: { apikey: CHIAVE_DB, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
    if (!protetto.ok || (await protetto.json()) !== true) return json({ ok: false, errore: "protetto" }, 403);
    // 3) abbonamento attivo: prima la disdetta su PayPal
    let disdetto = false;
    if (await rpc("account_abbonamento_attivo", { p_utente: id })) {
      const d = await fetch(`${URL_DB}/functions/v1/paypal?azione=disdici`, { method: "POST",
        headers: { Authorization: auth, apikey: CHIAVE_DB, "Content-Type": "application/json" }, body: "{}" });
      const j = await d.json().catch(() => ({})) as { ok?: boolean };
      if (!d.ok || !j.ok) {
        console.error("[elimina-account] disdetta PayPal non riuscita", d.status);
        return json({ ok: false, errore: "disdetta" }, 502);
      }
      disdetto = true;
    }
    // 4) archivio dei pagamenti
    const prep = await rpc("account_prepara_eliminazione", { p_utente: id }) as { ev?: string };
    // 5) cancellazione (a catena: profilo, lista, inviti, abbonamenti)
    const del = await fetch(`${URL_DB}/auth/v1/admin/users/${id}`, { method: "DELETE",
      headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}` } });
    if (!del.ok) throw new Error("cancellazione utente HTTP " + del.status);
    // 6) avviso all'admin
    await avvisaAdmin(prep?.ev || "", disdetto);
    return json({ ok: true });
  } catch (e) {
    console.error("[elimina-account] errore", e);
    return json({ ok: false, errore: "interno" }, 500);
  }
});
