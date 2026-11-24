// ---------- paypal (v8.18): abbonamenti Premium automatici con PayPal (rinnovo automatico fino a disdetta) ----------
// TRE USI, stesso indirizzo (…/functions/v1/paypal):
//   1) ?azione=attiva   (dal terminale, utente loggato)  {id: "I-..."}  -> subito dopo il pagamento: attiva Premium
//   2) ?azione=disdici  (dal terminale, utente loggato)                 -> disdice su PayPal; Premium resta fino a fine periodo
//   v8.18 (Ya): disdetta = Premium fino a scadenza; rimborso, storno o CONTESTAZIONE (disputa) = piano Basic subito.
//   4) ?azione=crea_piani (v9.14, SOLO ADMIN) {mensile:"29.99", annuale:"299.88"} -> crea su PayPal i piani con i prezzi
//      nuovi copiando cicli, tasse e regole di pagamento da quelli attuali. Se esistono gia' (stesso nome) li restituisce.
//   3) senza azione     (webhook di PayPal)  -> rinnovi, disdette, sospensioni, rimborsi: aggiorna la scadenza da solo
// REGOLA DI SICUREZZA: non ci si fida MAI di quello che arriva (ne' dal browser ne' dal webhook). Si usa solo l'ID
// dell'abbonamento e si RILEGGE lo stato vero da PayPal con le nostre credenziali: nessuno puo' fingersi PayPal.
// A CHI SI ATTIVA: l'abbonamento porta con se' l'ID dell'utente (custom_id, messo dal pulsante nel terminale).
// SEGRETI (mai nel codice): PAYPAL_CLIENT_ID e PAYPAL_SECRET nei secret delle Edge Functions (li inserisce Ya).
// DEBUG: log della funzione nella dashboard di Supabase -> righe "paypal:".

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_DB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PP_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PP_SEGRETO = Deno.env.get("PAYPAL_SECRET") || "";
const PP = "https://api-m.paypal.com";
const ORIGINI = ["https://edgevalor.com", "https://www.edgevalor.com"];
// piani creati su PayPal il 18/11/2026 (prodotto "EdgeValor Premium")
const PIANI: Record<string, string> = { "P-5HA71857XX328563CNL7B7XI": "mensile", "P-89G164691L706501LNL7CALY": "annuale" };

// v9.14 piani con prezzi nuovi (dicembre 2026): un piano che non e' nell'elenco vale SOLO se appartiene al nostro
// prodotto PayPal (nessun altro puo' creare piani sul nostro prodotto); mensile o annuale dal ciclo di pagamento.
async function tipoPiano(t: string, id: string) {
  if (PIANI[id]) return PIANI[id];
  if (!/^P-[A-Z0-9]{10,30}$/.test(id)) return null;
  const r = await pp(t, "/v1/billing/plans/" + id);
  if (!r.ok) return null;
  const p = await r.json(), rif = await (await pp(t, "/v1/billing/plans/" + Object.keys(PIANI)[0])).json();
  if (!p.product_id || p.product_id != rif.product_id) return null;
  const u = (p.billing_cycles || []).find((c: { tenure_type?: string }) => c.tenure_type == "REGULAR")?.frequency?.interval_unit;
  return u == "MONTH" ? "mensile" : u == "YEAR" ? "annuale" : null;
}

// chiamata a una funzione del database con la chiave di servizio
async function rpc(nome: string, corpo: Record<string, unknown>) {
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, { method: "POST",
    headers: { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
  return r.status == 204 ? null : r.json();
}
// gettone di accesso a PayPal (credenziali dell'app)
async function gettone() {
  if (!PP_ID || !PP_SEGRETO) throw new Error("mancano PAYPAL_CLIENT_ID / PAYPAL_SECRET");
  const r = await fetch(PP + "/v1/oauth2/token", { method: "POST",
    headers: { Authorization: "Basic " + btoa(PP_ID + ":" + PP_SEGRETO), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!r.ok) throw new Error("PayPal token HTTP " + r.status);
  return (await r.json()).access_token as string;
}
const pp = async (t: string, percorso: string, metodo = "GET", corpo?: unknown) =>
  fetch(PP + percorso, { method: metodo, headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });

// v8.18 fa partire subito il giro delle email (conferma attivazione / annullamento) senza aspettare l'ora piena.
// Il giro e' protetto dal database (al massimo uno ogni 5 minuti, mai doppioni): se non parte ora, parte al giro orario.
const giroEmail = () => fetch(`${URL_DB}/functions/v1/email-abbonamento`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
  .then((r) => r.body?.cancel()).catch(() => {});

// utente loggato (dal gettone Supabase mandato dal terminale); null se non valido
async function utente(req: Request) {
  const a = req.headers.get("authorization") || "";
  if (!a) return null;
  const r = await fetch(`${URL_DB}/auth/v1/user`, { headers: { apikey: CHIAVE_DB, Authorization: a } });
  return r.ok ? ((await r.json()).id as string) : null;
}

// Rilegge l'abbonamento da PayPal e aggiorna il database. chi = utente atteso (attivazione dal terminale) oppure null (webhook).
async function allinea(t: string, id: string, chi: string | null) {
  if (!/^I-[A-Z0-9]{6,20}$/.test(id)) throw new Error("ID abbonamento non valido");
  const r = await pp(t, "/v1/billing/subscriptions/" + id);
  if (!r.ok) throw new Error("PayPal abbonamento HTTP " + r.status);
  const s = await r.json();
  const piano = await tipoPiano(t, String(s.plan_id || ""));
  if (!piano) throw new Error("piano sconosciuto");
  // proprietario: quello gia' registrato, altrimenti il custom_id (ID utente messo dal nostro pulsante)
  const noto = (await rpc("paypal_trova", { p_id: id }))?.[0];
  const proprietario = noto?.utente || s.custom_id;
  if (!/^[0-9a-f-]{36}$/.test(proprietario || "")) throw new Error("abbonamento senza utente");
  if (chi && chi != proprietario) throw new Error("abbonamento di un altro utente");
  if (noto?.stato == "RIMBORSATO") return { stato: "RIMBORSATO", fino: null };          // rimborsato/contestato: non si riattiva
  const stato = String(s.status || "");                                                  // ACTIVE, CANCELLED, SUSPENDED, EXPIRED, APPROVAL_PENDING
  const fino = await rpc("paypal_registra", { p_id: id, p_utente: proprietario, p_piano: piano, p_stato: stato,
    p_fino: s.billing_info?.next_billing_time || null });
  // v8.14 nome di battesimo dell'abbonato (per il "Ciao ..." delle email); se manca le email dicono solo "Ciao,"
  const nome = String(s.subscriber?.name?.given_name || "");
  if (nome) await rpc("paypal_nome", { p_id: id, p_nome: nome }).catch(() => {});
  console.log(`paypal: ${id} ${piano} ${stato}`);
  return { stato, piano, fino };
}

Deno.serve(async (req) => {
  const origine = req.headers.get("origin") || "", azione = new URL(req.url).searchParams.get("azione");
  const cors = { "Access-Control-Allow-Origin": ORIGINI.includes(origine) ? origine : ORIGINI[0], "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type, apikey" };
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method == "OPTIONS") return new Response(null, { headers: cors });
  if (req.method != "POST") return json({ ok: false }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    // ---- 1) e 2): dal terminale, utente loggato
    if (azione == "attiva" || azione == "disdici") {
      const chi = await utente(req);
      if (!chi) return json({ ok: false, errore: "accesso" }, 401);
      const t = await gettone();
      if (azione == "attiva") { const x = await allinea(t, String(b.id || ""), chi); await giroEmail(); return json({ ok: true, ...x }); }
      // disdetta: l'abbonamento attivo dell'utente (lo dice il database, non il browser)
      const mio = await fetch(`${URL_DB}/rest/v1/rpc/mio_abbonamento`, { method: "POST",
        headers: { apikey: CHIAVE_DB, Authorization: req.headers.get("authorization")!, "Content-Type": "application/json" }, body: "{}" });
      const a = mio.ok ? (await mio.json())?.[0] : null;
      if (!a || a.stato != "ACTIVE") return json({ ok: false, errore: "nessun abbonamento attivo" }, 400);
      const r = await pp(t, `/v1/billing/subscriptions/${a.id}/cancel`, "POST", { reason: "Disdetta richiesta dall'utente nel terminale" });
      if (!r.ok && r.status != 422) throw new Error("PayPal disdetta HTTP " + r.status);   // 422 = gia' disdetto
      const x = await allinea(t, a.id, chi);          // CANCELLED: Premium resta fino alla fine del periodo pagato
      await giroEmail();                               // email di conferma della disdetta subito
      return json({ ok: true, ...x, premium_fino: a.premium_fino });
    }
    // ---- 4) v9.14 nuovi piani (solo admin: lo dice il database, admin_utenti risponde solo all'admin)
    if (azione == "crea_piani") {
      // admin = account fondatore (admin_utenti risponde solo a lui) OPPURE codice monouso della tabella codici_admin
      // (scritto dal database dall'admin, valido 10 minuti, cancellato appena usato)
      const a = req.headers.get("authorization") || "", cod = String(b.codice || "");
      let ok = false;
      if (/^[a-f0-9]{32,64}$/.test(cod)) {
        const q = `${URL_DB}/rest/v1/codici_admin?codice=eq.${cod}&scade=gt.${new Date().toISOString()}`;
        const h = { apikey: CHIAVE_DB, Authorization: `Bearer ${CHIAVE_DB}` };
        ok = ((await (await fetch(q, { headers: h })).json()) || []).length == 1;
        if (ok) await fetch(`${URL_DB}/rest/v1/codici_admin?codice=eq.${cod}`, { method: "DELETE", headers: h });
      } else if (a) {
        const prova = await fetch(`${URL_DB}/rest/v1/rpc/admin_utenti`, { method: "POST",
          headers: { apikey: CHIAVE_DB, Authorization: a, "Content-Type": "application/json" }, body: "{}" });
        ok = prova.ok;
        await prova.body?.cancel();
      }
      if (!ok) return json({ ok: false, errore: "solo admin" }, 403);
      const t = await gettone(), out: Record<string, unknown> = {};
      for (const [vecchio, tipo] of Object.entries(PIANI)) {
        const prezzo = String(b[tipo] || "");
        if (!/^\d{1,4}\.\d{2}$/.test(prezzo)) continue;
        const v = await (await pp(t, "/v1/billing/plans/" + vecchio)).json();
        const nome = `EdgeValor Premium ${tipo == "annuale" ? "Annuale" : "Mensile"} ${prezzo.replace(".", ",")} EUR`;
        // gia' creato? (stesso prodotto e stesso nome): niente doppioni
        const lista = await (await pp(t, `/v1/billing/plans?product_id=${v.product_id}&page_size=20`)).json();
        const c = (lista.plans || []).find((x: { name?: string }) => x.name == nome);
        if (c) { out[tipo] = { id: c.id, nuovo: false }; continue; }
        const cicli = (v.billing_cycles || []).map((x: Record<string, unknown>) => ({ ...x,
          pricing_scheme: { fixed_price: { value: prezzo, currency_code: "EUR" } } }));
        const r = await pp(t, "/v1/billing/plans", "POST", { product_id: v.product_id, name: nome, status: "ACTIVE",
          description: v.description || nome, billing_cycles: cicli, payment_preferences: v.payment_preferences,
          ...(v.taxes ? { taxes: v.taxes } : {}) });
        const j = await r.json();
        if (!r.ok) throw new Error("PayPal nuovo piano HTTP " + r.status + " " + JSON.stringify(j).slice(0, 300));
        out[tipo] = { id: j.id, nuovo: true };
        console.log(`paypal: creato piano ${tipo} ${prezzo} ${j.id}`);
      }
      return json({ ok: true, ...out });
    }
    // ---- 3) webhook di PayPal: dal corpo si prende SOLO l'ID, poi si rilegge tutto da PayPal
    const tipo = String(b.event_type || ""), ris = b.resource || {};
    const t = await gettone();
    if (tipo.startsWith("BILLING.SUBSCRIPTION.")) { const x = await allinea(t, String(ris.id || ""), null); if (x.stato == "CANCELLED") await giroEmail(); }
    else if (tipo == "PAYMENT.SALE.COMPLETED") await allinea(t, String(ris.billing_agreement_id || ""), null);
    else if (tipo == "CUSTOMER.DISPUTE.CREATED") {
      // v8.18 CONTESTAZIONE aperta dal cliente: si rilegge la disputa vera da PayPal, si risale al pagamento e
      // all'abbonamento, poi Premium finisce subito e l'abbonamento si chiude (come per un rimborso).
      const idd = String(ris.dispute_id || "");
      const d = /^PP-[A-Z0-9-]{6,40}$/.test(idd) ? await pp(t, "/v1/customer/disputes/" + idd) : null;
      const dj = d && d.ok ? await d.json() : null;
      for (const tr of (dj?.disputed_transactions || []) as { seller_transaction_id?: string }[]) await chiudiVendita(t, String(tr.seller_transaction_id || ""));
    }
    else if (tipo == "PAYMENT.SALE.REFUNDED" || tipo == "PAYMENT.SALE.REVERSED") await chiudiVendita(t, String(ris.sale_id || ris.id || ""), true);
    return json({ ok: true });
  } catch (e) {
    console.error("paypal:", e instanceof Error ? e.message : e);
    // v9.14 all'admin (crea_piani) si mostra il motivo: serve per capire cosa ha risposto PayPal
    if (azione == "crea_piani") return json({ ok: false, errore: e instanceof Error ? e.message : String(e) }, 400);
    return json({ ok: false }, azione ? 400 : 500);      // al webhook un 500 fa riprovare PayPal piu' tardi
  }
});

// Rimborso, storno o contestazione di un pagamento: si controlla la vendita vera su PayPal (deve esistere ed essere
// collegata a un nostro abbonamento), poi stato RIMBORSATO (Premium finisce subito, piano Basic) e abbonamento annullato.
async function chiudiVendita(t: string, idv: string, rimborso = false) {
  const v = /^[A-Z0-9]{10,25}$/.test(idv) ? await pp(t, "/v1/payments/sale/" + idv) : null;
  const s = v && v.ok ? await v.json() : null;
  const sub = String(s?.billing_agreement_id || "");
  if (!s || !sub) return;
  if (rimborso && !/refunded|reversed/i.test(String(s.state || ""))) return;   // il webhook dice rimborso: deve esserlo davvero
  const noto = (await rpc("paypal_trova", { p_id: sub }))?.[0];
  if (!noto) return;
  await rpc("paypal_registra", { p_id: sub, p_utente: noto.utente, p_piano: noto.piano, p_stato: "RIMBORSATO", p_fino: null });
  await pp(t, `/v1/billing/subscriptions/${sub}/cancel`, "POST", { reason: "Pagamento rimborsato, stornato o contestato" });
  console.log("paypal: rimborsato/contestato " + sub);
}
