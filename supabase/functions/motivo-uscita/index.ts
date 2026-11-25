// ---------- motivo-uscita (v9.33): perche' un utente disdice Premium o spegne le email con le offerte ----------
// Richiesta di Ya: chi se ne va puo' dire il motivo (costa troppo, manca qualcosa, troppo complesso...), cosi' arriva
// il feedback. E' SEMPRE facoltativo e arriva DOPO la disdetta: non deve mai ostacolare chi vuole andarsene.
// MODALITA' (POST JSON):
//   {"tipo":"offerte", "motivo":"troppe_email", "nota":"...", "no":"<codice dell'email>"}  -> pagina /offerte/ (senza accesso)
//   {"tipo":"abbonamento"|"offerte", "motivo":"costo", "nota":"..."} + Authorization: Bearer <accesso utente> -> dal terminale
// Il motivo finisce in privato.motivi_uscita (lo legge solo l'admin) e, se e' nuovo, parte un'email SOLO all'admin
// (indirizzo dal database, mai nel codice). Nell'email c'e' solo il codice EV dell'utente, mai la sua email.
// SEGRETI (mai nel codice): RESEND_API_KEY e SUPABASE_SERVICE_ROLE_KEY nei secret delle Edge Functions.

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const CORS = { "Access-Control-Allow-Origin": "https://edgevalor.com", "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };

// motivi ammessi per tipo, con l'etichetta che legge Ya nell'email (le stesse del terminale)
const MOTIVI: Record<string, Record<string, string>> = {
  abbonamento: { costo: "Costa troppo", manca: "Manca qualcosa che mi serve", complesso: "È troppo complesso",
    poco_uso: "Lo uso poco", altro_servizio: "Ho scelto un altro servizio", altro: "Altro" },
  offerte: { troppe_email: "Troppe email", non_interessa: "Le offerte non mi interessano", costo: "Costa troppo", altro: "Altro" },
};

async function rpc(nome: string, corpo: Record<string, unknown> = {}) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, { method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
  return r.status == 204 ? null : r.json();
}

// utente dall'accesso del terminale (il token lo verifica Supabase Auth); null se manca o non e' valido
async function utenteDa(req: Request): Promise<string | null> {
  const a = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(a)) return null;
  const r = await fetch(`${URL_DB}/auth/v1/user`, { headers: { apikey: CHIAVE_DB, Authorization: a } });
  if (!r.ok) return null;
  return ((await r.json().catch(() => ({}))) as { id?: string }).id || null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// email breve all'admin: cosa, chi (solo codice EV), quando (ora di Roma)
async function avvisaAdmin(tipo: string, etichetta: string, nota: string, ev: string, id: number) {
  if (!RESEND) return;
  const a = await rpc("email_admin") as string;
  if (!a) return;
  const cosa = tipo == "abbonamento" ? "Disdetta Premium" : "Niente più offerte";
  const ora = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" });
  const righe = [`${cosa}: ${etichetta}`, `Utente: ${ev || "—"}`, `Quando: ${ora}`, nota ? `\nNota:\n${nota}` : "",
    "\nTutti i motivi: Profilo → Admin · Iscritti → Motivi di uscita."].filter(Boolean);
  await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `uscita-${id}` },
    body: JSON.stringify({ from: "EdgeValor <info@edgevalor.com>", to: [a], subject: `${cosa} · ${etichetta}`,
      text: righe.join("\n"),
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p style="margin:0 0 10px"><b>${esc(cosa)}</b>: ${esc(etichetta)}</p>
<p style="margin:0;color:#555">Utente: ${esc(ev || "—")} · ${esc(ora)}</p>
${nota ? `<p style="margin:14px 0 0;padding:12px 14px;background:#f4f4f5;border-radius:10px;white-space:pre-wrap">${esc(nota)}</p>` : ""}
<p style="margin:16px 0 0;font-size:13px;color:#777">Tutti i motivi: Profilo → Admin · Iscritti → Motivi di uscita.</p></div>` }) })
    .then((r) => { if (!r.ok) console.error("[motivo-uscita] email admin HTTP", r.status); })
    .catch((e) => console.error("[motivo-uscita] email admin", e));
}

Deno.serve(async (req) => {
  if (req.method == "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method != "POST") return Response.json({ ok: false }, { status: 405, headers: CORS });
  try {
    const c = await req.json().catch(() => ({})) as { tipo?: string; motivo?: string; nota?: string; no?: string };
    const tipo = String(c.tipo || ""), motivo = String(c.motivo || "");
    const etichetta = MOTIVI[tipo]?.[motivo];
    if (!etichetta) return Response.json({ ok: false, errore: "motivo non valido" }, { status: 400, headers: CORS });
    const nota = String(c.nota || "").replace(/\s+$/g, "").slice(0, 500);
    const no = String(c.no || "");
    // con il codice dell'email vale solo per le offerte; altrimenti serve l'accesso
    let utente: string | null = null, token: string | null = null;
    if (no) {
      if (tipo != "offerte" || !/^[0-9a-f-]{36}$/i.test(no)) return Response.json({ ok: false }, { status: 400, headers: CORS });
      token = no;
    } else {
      utente = await utenteDa(req);
      if (!utente) return Response.json({ ok: false, errore: "accesso" }, { status: 401, headers: CORS });
    }
    const r = await rpc("motivo_uscita_salva", { p_utente: utente, p_token: token, p_tipo: tipo, p_motivo: motivo, p_nota: nota }) as
      { id: number; nuovo: boolean; ev: string } | null;
    if (!r) return Response.json({ ok: false }, { status: 404, headers: CORS });
    if (r.nuovo) await avvisaAdmin(tipo, etichetta, nota, r.ev, r.id);
    return Response.json({ ok: true }, { headers: CORS });
  } catch (e) {
    console.error("[motivo-uscita] errore", e);
    return Response.json({ ok: false }, { status: 500, headers: CORS });
  }
});
