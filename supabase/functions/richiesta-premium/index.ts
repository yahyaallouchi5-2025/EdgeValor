// ---------- richiesta-premium (v8.19): DISMESSA ----------
// Serviva al vecchio modulo "Richiesta Premium" della pagina Prezzi (email con link PayPal a pagamento singolo).
// Dal v8.12 Premium si attiva da solo con l'abbonamento PayPal nel terminale (funzione "paypal"): il modulo e' stato tolto.
// Resta solo questa risposta "410 Gone" cosi' nessuno puo' usarla per mandare email o vecchi link di pagamento.
Deno.serve(() => new Response(JSON.stringify({ ok: false, errore: "servizio dismesso: Premium si attiva dal terminale" }),
  { status: 410, headers: { "Content-Type": "application/json" } }));
