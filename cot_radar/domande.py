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
DOMANDE = [
    ("Che cos'è EdgeValor?",
     "EdgeValor è un terminale italiano di analisi quantitativa dei mercati finanziari. Riunisce in un solo posto "
     "il posizionamento dei grandi speculatori (report COT), la stagionalità, le correlazioni, il quadro macro, "
     "l'azionario globale, 60 paesi del mondo, le crypto e i portafogli modello. Ogni dato è provato sullo storico "
     "e mostrato con una lettura semplice."),
    ("Che cosa analizza il terminale?",
     "EdgeValor copre forex, materie prime, indici azionari, tassi e crypto. Per ogni mercato mostra la direzione dei "
     "grandi speculatori, cosa dicono tassi, dollaro e dati macro, la stagionalità del mese e le notizie in arrivo, "
     "riassunti in un punteggio di forza. A questo si aggiungono le schede Azionario, Macro, Volatilità, "
     "Stagionalità, Correlazioni, Live e Bitcoin."),
    ("Che cos'è il report COT e come lo usa EdgeValor?",
     "Il report COT (Commitments of Traders) è pubblicato ogni venerdì dalla CFTC, l'autorità statunitense dei "
     "mercati futures, e mostra come sono posizionati gli operatori. EdgeValor segue i <b>non commercial</b>, cioè i "
     "grandi speculatori come hedge fund e gestori, e ne ricava la <b>direzione</b> su ogni mercato: se stanno "
     "comprando o vendendo, con quanta forza e se il movimento si conferma settimana dopo settimana."),
    ("Come funzionano stagionalità e correlazioni?",
     "La stagionalità di EdgeValor misura come si è comportato di solito un mercato per giorno, settimana o mese, "
     "in ora di Roma (ora legale compresa): un effetto compare solo se supera i filtri statistici sugli anni passati. "
     "Le correlazioni mostrano quali mercati si muovono insieme o in direzione opposta, sia sui prezzi giornalieri "
     "sia sui flussi COT delle ultime 52 settimane."),
    ("Come tratta l'azionario EdgeValor?",
     "La scheda Azionario analizza circa 630 titoli di S&amp;P 500, Nasdaq-100, FTSE MIB, DAX 40 ed Euro Stoxx 50, "
     "divisi negli 11 settori GICS. Ogni titolo ha un punteggio, il grafico e la propria stagionalità; ogni sera "
     "il terminale seleziona le aziende più forti, al massimo una per settore, solo se sono in trend, vicine ai "
     "massimi e con il mese favorevole negli anni passati."),
    ("Cosa trovo su macro e paesi?",
     "Nella parte macro EdgeValor misura il clima per gli asset di rischio, i driver principali (tassi, dollaro, "
     "inflazione attesa, volatilità) e quanto le mosse delle banche centrali sono già scontate dai mercati, con il "
     "quadro economico di Stati Uniti, Eurozona e Giappone. La scheda Paesi copre 60 economie in tre gruppi: "
     "sviluppati (tra cui Stati Uniti, Italia, Germania, Giappone), emergenti (i 24 dell'indice MSCI Emerging Markets, "
     "tra cui Cina, India e Brasile) e di frontiera (tra cui Marocco, Vietnam e Kenya): per ognuno "
     "crescita del PIL, previsione del Fondo Monetario, inflazione, se l'economia accelera o rallenta e "
     "l'andamento della sua borsa."),
    ("Cosa mostra la scheda Live?",
     "La scheda Live di EdgeValor monitora l'andamento delle analisi swing fuori campione: ogni segnale viene "
     "registrato con data e ora nel momento in cui nasce, in un registro che non si può modificare, e poi seguito "
     "fino alla chiusura. Non è un backtest: sono risultati misurati dopo, su dati che il modello non aveva visto."),
    ("Cosa sono i portafogli modello?",
     "Sono tre portafogli di ETF (conservativo, moderato e aggressivo) costruiti con un filtro di trend e provati "
     "sullo storico, con costi e tasse italiane inclusi e il drawdown sempre accanto al rendimento. Ruotano una volta "
     "al mese, il primo giorno di borsa. Sono un esempio didattico del metodo, non un consiglio personale."),
    ("Devo avere esperienza?",
     "No. EdgeValor traduce ogni dato in una lettura immediata (direzione, forza, mese favorevole o no) con colori "
     "e frecce, e ogni scheda ha una (i) che spiega come leggerla e come usarla. Chi ha esperienza trova anche i "
     "numeri completi, lo storico e le verifiche."),
    ("Quanto tempo richiede?",
     "Pochi minuti al giorno per il quadro dei mercati e delle notizie; il venerdì sera, all'uscita del nuovo report "
     "COT, uno sguardo a come si sono mossi i grandi speculatori; una volta al mese la rotazione dei portafogli. "
     "Il resto è lì quando vuoi approfondire."),
    ("C'è un canale Telegram?",
     "Sì. Il canale Telegram di EdgeValor è aperto a tutti: ogni venerdì sera il riepilogo del report "
     "COT diviso per mercato, il lunedì il quadro della settimana con portafoglio, forex e banche centrali, e "
     "durante la settimana gli avvisi quando un mercato cambia direzione."),
    ("Quanto costa?",
     f"La registrazione a EdgeValor comprende {PROVA} giorni di Premium gratis, senza carta. Finita la prova resti "
     f"nel piano Basic. Premium costa {eu(MENSILE)} € al mese, oppure {eu(ANNUALE)} € al mese "
     f"con il piano annuale ({eu(ANNO_TOT)} € all'anno); si disdice quando vuoi. Vedi <a href=\"/prezzi/\">piani e prezzi</a>."),
    ("I risultati includono commissioni, spread e slippage?",
     "In parte, e EdgeValor lo dice in chiaro. I risultati dei portafogli includono un costo dello 0,10% sul capitale "
     "scambiato, le tasse italiane del regime amministrato e l'acquisto prudente alla chiusura del giorno di rotazione. "
     "Nella realtà ogni broker aggiunge i propri costi: la <b>commissione fissa per ordine</b> (spesso 1-2 €, che su "
     "capitali piccoli pesa molto), lo <b>spread</b> tra prezzo di acquisto e di vendita e lo <b>slippage</b>, cioè lo "
     "scarto tra il prezzo visto e quello eseguito. Per questo il terminale calcola le commissioni sul tuo capitale "
     "e mostra il rendimento stimato sul tuo conto: con capitali piccoli conviene un broker a commissioni basse o zero."),
    ("EdgeValor gestisce denaro o contatta gli utenti?",
     "No. EdgeValor non è un broker né un consulente: non apre conti, non esegue ordini, non custodisce denaro e non "
     "chiede mai soldi da investire, bonifici, criptovalute o password. L'unico pagamento è l'abbonamento Premium, "
     "fatto dall'utente nel terminale tramite PayPal. EdgeValor scrive via email solo a chi si è registrato, per "
     "accesso e abbonamento, e non contatta nessuno per telefono, WhatsApp o messaggi privati: chi lo fa a nome di "
     "EdgeValor non è EdgeValor. Dettagli in <a href=\"/legale/#cosa-non-e\">cosa EdgeValor non è</a>."),
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
