// ---------- email-abbonamento (v7.97): email di servizio sull'abbonamento EdgeValor ----------
// Parte da sola ogni ora (pg_cron + pg_net, vedi supabase/email_abbonamento.sql) e manda, tramite Resend:
//   attivo            -> Premium attivato o rinnovato (nuova data di scadenza)
//   promemoria        -> 3 giorni prima della scadenza del Premium
//   promemoria_prova  -> 3 giorni prima della fine della prova gratuita (se non ha Premium)
//   basic             -> l'accesso e' finito: ora e' nel piano Basic
// Chi deve ricevere cosa lo decide il database (public.email_da_inviare): la funzione si limita a spedire.
// MAI DOPPIONI: prima di spedire si "prenota" l'invio (utente + tipo + scadenza, chiave unica nel database);
// se Resend risponde con un errore la prenotazione si annulla e l'email riparte al giro dopo.
// Il database fa al massimo un giro ogni 5 minuti: chiamare l'indirizzo piu' volte non manda email in piu'.
// SEGRETI (mai nel codice): RESEND_API_KEY nei secret delle Edge Functions di Supabase;
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY li mette Supabase da solo.
// PROVA DEI MODELLI: POST con {"prova":true} manda i 4 modelli all'email dell'admin (al massimo una volta all'ora).

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MITTENTE = "Yahya di EdgeValor <info@edgevalor.com>";
const TERMINALE = "https://edgevalor.com/terminale/";
const RINNOVA = TERMINALE + "?rinnova=1";            // apre il ticket Assistenza > Abbonamento gia' compilato

type Riga = { utente: string; email: string; numero: number | null; tipo: string; scadenza: string };

// chiamata a una funzione del database con la chiave di servizio
async function rpc(nome: string, corpo: Record<string, unknown> = {}) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status} ${await r.text()}`);
  return r.status == 204 ? null : r.json();
}

const data = (d: string) =>
  new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
const idUtente = (n: number | null) => (n ? "EV-" + String(n).padStart(4, "0") : "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// testi delle 4 email: oggetto, titolo, paragrafi, pulsante [testo, link]
function testi(tipo: string, scad: string) {
  const d = data(scad);
  const firma = "Buon investimento!";
  switch (tipo) {
    case "attivo":
      return {
        oggetto: "Il tuo Premium è attivo · EdgeValor",
        titolo: "Grazie di far parte di questo progetto",
        par: [
          `Il tuo abbonamento <b style="color:#f3c75f">Premium</b> è attivo fino al <b>${d}</b>.`,
          "3 giorni prima della scadenza riceverai un'email di promemoria per il rinnovo; se non rinnovi, il tuo account passerà automaticamente al piano <b>Basic</b> (gratis, nessun addebito).",
          firma,
        ],
        btn: ["Apri il terminale", TERMINALE],
      };
    case "promemoria":
      return {
        oggetto: `Il tuo Premium scade il ${d} · EdgeValor`,
        titolo: "Promemoria del rinnovo",
        par: [
          `Il tuo abbonamento <b style="color:#f3c75f">Premium</b> scade il <b>${d}</b>.`,
          "Per rinnovarlo tocca <b>Rinnova</b>: si apre la richiesta nel terminale e ti rispondo io personalmente con le istruzioni.",
          "Se non rinnovi, il tuo account passerà automaticamente al piano <b>Basic</b> (gratis, nessun addebito).",
          firma,
        ],
        btn: ["Rinnova", RINNOVA],
      };
    case "promemoria_prova":
      return {
        oggetto: `La tua prova Premium finisce il ${d} · EdgeValor`,
        titolo: "Grazie di far parte di questo progetto",
        par: [
          `La tua prova gratuita di <b style="color:#f3c75f">Premium</b> finisce il <b>${d}</b>.`,
          "Poi il tuo account passerà automaticamente al piano <b>Basic</b> (gratis, nessun addebito). Se vuoi continuare con Premium, tocca <b>Continua con Premium</b>: ti rispondo io personalmente.",
          firma,
        ],
        btn: ["Continua con Premium", RINNOVA],
      };
    default: // basic
      return {
        oggetto: "Ora sei nel piano Basic · EdgeValor",
        titolo: "Il tuo account è nel piano Basic",
        par: [
          `Il tuo accesso Premium è terminato il <b>${d}</b>: da oggi sei nel piano <b>Basic</b>, gratis e senza addebiti.`,
          "Quando vuoi tornare Premium, tocca <b>Torna Premium</b>: ti rispondo io personalmente.",
          firma,
        ],
        btn: ["Torna Premium", RINNOVA],
      };
  }
}

// HTML dell'email: tabelle e stili in linea (i programmi di posta ignorano i fogli di stile), fondo scuro, oro per Premium
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
