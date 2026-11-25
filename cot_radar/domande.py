# -*- coding: utf-8 -*-
"""
domande.py - v8.30 DOMANDE FREQUENTI: UNA SOLA FONTE per la home (sezione "Domande frequenti" + dati strutturati
FAQPage letti da Google e da Gemini) e per la pagina /faq/.

COME SONO SCRITTE (decisione di Ya, 20/11/2026):
  - ordine dal generale al particolare: cos'e' EdgeValor -> cosa analizza -> le singole aree -> esperienza e tempo
    -> Telegram e prezzi -> in fondo consulenza e rischi;
  - ogni risposta e' una frase COMPLETA e AUTONOMA che nomina EdgeValor: Google AI e Gemini possono citarla
    cosi' com'e', senza il resto della pagina;
  - solo funzioni che esistono davvero nel terminale (controllate nel codice delle schede, web/js/*.js);
  - niente elenco delle fonti dei dati (resta nella pagina legale) e niente date di "aggiornamento".
Nei testi i collegamenti sono assoluti ("/prezzi/"): per la home si tolgono gli slash iniziali (pagina alla radice).
"""
import json
import re

from .pagine_pubbliche import ANNO_TOT, ANNUALE, MENSILE, PROVA, eu

# (domanda, risposta in HTML semplice: solo <b> e <a>)
# v9.30 testi rivisti (brief di GPT + verifiche nel codice): azionario 1.200 titoli di 12 listini, Live con la catena
# di controllo, Bitcoin -> Crypto, risposte piu' corte senza togliere costi, rischi o limiti
DOMANDE = [
    ("Che cos'è EdgeValor?",
     "EdgeValor è un terminale italiano di analisi quantitativa dei mercati finanziari. Riunisce il posizionamento dei "
     "grandi speculatori (report COT), stagionalità, correlazioni, quadro macro, azionario globale, 60 paesi, crypto e "
     "portafogli modello. Ogni dato è provato sullo storico e spiegato in modo semplice."),
    ("Che cosa analizza il terminale?",
     "EdgeValor copre forex, materie prime, indici azionari, tassi e crypto. Per ogni mercato mostra la direzione dei "
     "grandi speculatori, tassi, dollaro, dati macro, stagionalità del mese e notizie in arrivo, riassunti in un "
     "punteggio di forza. In più ci sono le schede Azionario, Macro, Volatilità, Stagionalità, Correlazioni, Live e Crypto."),
    ("Che cos'è il report COT e come lo usa EdgeValor?",
     "Il report COT (Commitments of Traders) esce ogni venerdì dalla CFTC, l'autorità statunitense dei futures, e mostra "
     "come sono posizionati gli operatori. EdgeValor segue i grandi speculatori (<b>non commercial</b>: hedge fund e "
     "gestori) e mostra su ogni mercato se comprano o vendono, con quanta forza e se il movimento si conferma settimana "
     "dopo settimana."),
    ("Come funzionano stagionalità e correlazioni?",
     "La stagionalità di EdgeValor misura come si è comportato di solito un mercato per ora, giorno, settimana o mese, "
     "in ora italiana: un effetto compare solo se supera i filtri statistici sugli anni passati. Le correlazioni mostrano "
     "quali mercati si muovono insieme o in direzione opposta, sui prezzi e sui flussi COT delle ultime 52 settimane."),
    ("Come tratta l'azionario EdgeValor?",
     "La scheda Azionario analizza oltre 1.200 titoli di 12 listini, tra cui S&amp;P 500, Nasdaq-100, FTSE MIB, DAX 40, "
     "Euro Stoxx 50, FTSE 100 e Nikkei 225, divisi negli 11 settori GICS. Ogni titolo ha punteggio, grafico e "
     "stagionalità. Ogni sera il terminale seleziona le aziende più forti, al massimo una per settore, solo se sono in "
     "trend, vicine ai massimi e con il mese favorevole negli anni passati."),
    ("Cosa trovo su macro e paesi?",
     "La parte macro di EdgeValor misura il clima per gli asset di rischio, i driver principali (tassi, dollaro, "
     "inflazione attesa, volatilità) e quanto le mosse delle banche centrali sono già scontate dai mercati. La scheda "
     "Paesi copre 60 economie (sviluppate, emergenti e di frontiera) con crescita del PIL, previsione del Fondo "
     "Monetario, inflazione, direzione dell'economia e andamento della borsa."),
    ("Cosa mostra la scheda Live?",
     "La scheda Live di EdgeValor segue le analisi fuori campione: ogni segnale è registrato con data e ora nel momento "
     "in cui nasce e seguito fino alla chiusura. Il registro è protetto da modifiche con una catena di controllo. Non è "
     "un backtest: sono risultati misurati dopo, su dati che il modello non aveva visto."),
    ("Cosa sono i portafogli modello?",
     "Sono tre portafogli di ETF di EdgeValor (conservativo, moderato e aggressivo) con un filtro di trend, provati "
     "sullo storico con costi e tasse italiane inclusi e il drawdown sempre accanto al rendimento. Ruotano il primo "
     "giorno di borsa del mese. Sono un esempio didattico del metodo, non un consiglio personale."),
    ("Devo avere esperienza?",
     "No. EdgeValor traduce ogni dato in una lettura immediata (direzione, forza, mese favorevole o no) con colori e "
     "frecce, e ogni scheda ha una (i) che spiega come leggerla. Chi ha esperienza trova anche i numeri completi e le verifiche."),
    ("Quanto tempo richiede?",
     "Con EdgeValor bastano pochi minuti al giorno per mercati e notizie, uno sguardo il venerdì sera al nuovo report "
     "COT e, una volta al mese, la rotazione dei portafogli."),
    ("C'è un canale Telegram?",
     "Sì, il canale Telegram di EdgeValor è aperto a tutti: il venerdì sera il riepilogo del report COT, il lunedì il "
     "quadro della settimana, e durante la settimana gli avvisi sui dati macro e quando un mercato cambia direzione."),
    ("Quanto costa?",
     f"La registrazione a EdgeValor comprende {PROVA} giorni di Premium gratis, senza carta. Poi resti nel piano Basic. "
     f"Premium costa {eu(MENSILE)} € al mese, oppure {eu(ANNUALE)} € al mese con il piano annuale ({eu(ANNO_TOT)} € "
     "all'anno); si disdice quando vuoi. Vedi <a href=\"/prezzi/\">piani e prezzi</a>."),
    # v9.28 (domanda di un collega di Ya): il "ritorno" dell'abbonamento detto con onesta'. Nessuna promessa di
    # rendimento; il peso del piano annuale sul capitale si calcola dal listino in vigore (ANNO_TOT).
    ("Perché abbonarsi? Che ritorno posso aspettarmi?",
     "Nessuno può garantire un ritorno, e EdgeValor non lo promette. Il valore di Premium è nel tempo risparmiato, in "
     "un metodo provato sui dati e negli errori evitati, come comprare senza sapere quanto drawdown si sta accettando. "
     f"Conviene confrontare il costo con il capitale: il piano annuale pesa circa il "
     f"<b>{('%.1f' % (ANNO_TOT / 100)).replace('.', ',')}%</b> l'anno su 10.000 € investiti e lo "
     f"<b>{('%.1f' % (ANNO_TOT / 500)).replace('.', ',')}%</b> su 50.000 €. Con capitali piccoli EdgeValor è "
     f"soprattutto un percorso di formazione: la prova di {PROVA} giorni serve a capire se fa per te."),
    ("I risultati includono commissioni, spread e slippage?",
     "In parte, e EdgeValor lo dice in chiaro. I risultati dei portafogli includono lo 0,10% sul capitale scambiato, le "
     "tasse italiane del regime amministrato e l'acquisto alla chiusura del giorno di rotazione. Non includono i costi "
     "del tuo broker: <b>commissione per ordine</b> (spesso 1-2 €, pesante su capitali piccoli), <b>spread</b> e "
     "<b>slippage</b>. Per questo il terminale calcola le commissioni sul tuo capitale e il rendimento stimato sul tuo conto."),
    ("EdgeValor gestisce denaro o contatta gli utenti?",
     "No. EdgeValor non è un broker né un consulente: non apre conti, non esegue ordini, non custodisce denaro e non "
     "chiede mai soldi da investire, bonifici, criptovalute o password. L'unico pagamento è l'abbonamento Premium, "
     "tramite PayPal nel terminale. EdgeValor scrive via email solo a chi si è registrato e non contatta nessuno per "
     "telefono, WhatsApp o messaggi privati. Dettagli in <a href=\"/legale/#cosa-non-e\">cosa EdgeValor non è</a>."),
    ("È una consulenza finanziaria? Posso perdere denaro?",
     "No, EdgeValor non è una consulenza finanziaria: pubblica analisi statistiche con finalità educative e ogni "
     "decisione resta tua. Ogni investimento può perdere in parte o del tutto il capitale e i risultati passati non "
     "garantiscono quelli futuri: per questo il terminale mostra sempre il drawdown accanto al rendimento. Dettagli "
     "nelle <a href=\"/legale/#rischi\">avvertenze sui rischi</a>."),
]


def html(radice=False, aperta=False):
    """Elenco <details> delle domande. radice=True: collegamenti relativi (home alla radice del sito).
    aperta=True: la prima domanda e' gia' aperta (pagina /faq/)."""
    righe = []
    for i, (d, r) in enumerate(DOMANDE):
        if radice:
            r = r.replace('href="/', 'href="')
        righe.append(f"<details{' open' if aperta and i == 0 else ''}><summary>{d}</summary><p>{r}</p></details>")
    return "\n   ".join(righe)


def dati_strutturati():
    """Blocco JSON-LD FAQPage (testo senza HTML), da mettere nella <head>."""
    pulisci = lambda s: re.sub(r"<[^>]+>", "", s).replace("&amp;", "&")
    d = {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": pulisci(a)}} for q, a in DOMANDE]}
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False).replace("</", "<\\/") + "</script>"
