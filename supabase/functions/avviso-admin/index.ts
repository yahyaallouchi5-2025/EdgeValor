// ---------- avviso-admin (v9.37): le email della sorveglianza al fondatore e al team, senza password su GitHub ----------
// PERCHE': la sorveglianza (GitHub Actions) mandava le email via SMTP, ma i Secrets SMTP non sono mai stati impostati:
// le anomalie finivano solo nel registro. Ora il workflow chiama questa funzione, che spedisce con Resend (chiave gia'
// nei secret di Supabase) all'admin (privato.admin) e in copia al team (privato.riservati, la casella letta da Claude).
// AUTENTICAZIONE SENZA SEGRETI CONDIVISI: il workflow presenta il suo token OIDC di GitHub (permessi id-token: write).
// Qui si verifica la firma con le chiavi pubbliche di GitHub e che venga proprio dal repository EdgeValor.
// POST {"oggetto": "...", "testo": "..."}  con  Authorization: Bearer <token OIDC, audience "edgevalor-avvisi">
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const REPO = "yahyaallouchi5-2025/EdgeValor";
const EMITTENTE = "https://token.actions.githubusercontent.com";
const PUBBLICO = "edgevalor-avvisi";
const CHIAVI = createRemoteJWKSet(new URL(EMITTENTE + "/.well-known/jwks"));

async function rpc(nome: string) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, { method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method != "POST") return Response.json({ ok: false }, { status: 405 });
  try {
    // 1) il chiamante e' davvero un workflow del repository EdgeValor?
    const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!t) return Response.json({ ok: false, errore: "token" }, { status: 401 });
    try {
      const { payload } = await jwtVerify(t, CHIAVI, { issuer: EMITTENTE, audience: PUBBLICO });
      if (payload.repository !== REPO) return Response.json({ ok: false, errore: "repository" }, { status: 403 });
    } catch (_) {
      return Response.json({ ok: false, errore: "token non valido" }, { status: 401 });
    }
    // 2) testo (solo testo semplice, lunghezza limitata)
    const c = await req.json().catch(() => ({})) as { oggetto?: string; testo?: string };
    const oggetto = String(c.oggetto || "EdgeValor: avviso").slice(0, 160);
    const testo = String(c.testo || "").slice(0, 8000);
    if (!RESEND) return Response.json({ ok: false, errore: "RESEND_API_KEY mancante" }, { status: 500 });
    // 3) destinatari dal database: admin + team in copia
    const admin = await rpc("email_admin") as string;
    const team = (await rpc("email_team") as string[]).filter((e) => e && e.toLowerCase() != (admin || "").toLowerCase());
    if (!admin) return Response.json({ ok: false, errore: "admin mancante" }, { status: 500 });
    const r = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "EdgeValor sorveglianza <info@edgevalor.com>", to: [admin], cc: team.length ? team : undefined,
        subject: oggetto, text: testo + "\n\nRegistro completo: terminale, account fondatore, riga \"Registro anomalie\"." }) });
    if (!r.ok) { console.error("[avviso-admin] Resend HTTP", r.status); return Response.json({ ok: false }, { status: 502 }); }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[avviso-admin] errore", e);
    return Response.json({ ok: false }, { status: 500 });
  }
});
