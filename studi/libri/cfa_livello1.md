# Libreria di Ya: CFA Program, Livello I (10 volumi) — appunti di lavoro per EdgeValor

I PDF originali NON stanno nel repository (materiale CFA Institute, "not for distribution"): li conserva Ya.
Qui solo appunti in parole nostre: cosa serve a EdgeValor, cosa e' stato provato, cosa si e' deciso.
Regola di sempre: un'idea dal libro entra nel terminale solo se passa la verifica (cot_radar/verifica_stat.py)
fuori campione, con le regole decise prima di guardare i risultati.

## Vol. 1 — Quantitative Methods (letto il 20/11/2026)
- Usato: test sulle coppie + test dei segni + bootstrap (cap. 7-8) -> cot_radar/verifica_stat.py; tabella di
  contingenza con chi-quadro (cap. 9); rendimento ponderato per il denaro / per il tempo (cap. 1) -> "Il mio conto";
  correlazione per ranghi di Spearman (cap. 9) -> scheda Correlazioni.
- Verifiche fatte: soglia di ribilanciamento 2 punti (risultati_banda.txt + test sulle coppie: mai peggio,
  Aggressivo meglio in modo significativo); stagionalita' mensile "affidabile" (risultati_stagionalita_chi2.txt:
  confermata, 57% contro 52%).
- Da riprendere se servira': formula di Bayes per aggiornare la probabilita' di un segnale; media armonica per un
  futuro piano di accumulo (PAC).
- Saltato: valore del denaro nel tempo per obbligazioni/opzioni, campionamento per sondaggi, intro big data.
- Manca nel volume: overfitting e test multipli (data snooping).

## Vol. 2 — Economics (letto il 20/11/2026)
- Provato: indicatore anticipatore USA stile Conference Board LEI da FRED e ciclo del credito (SLOOS): forti fino al
  2009, NON reggono fuori campione e non migliorano il filtro di trend -> scartati (risultati_anticipatore_usa.txt).
- Usato: GDPNow (nowcasting) nel Quadro economico USA, con il suo errore tipico (~1,7 punti).
- Conferme: fasi del ciclo e comportamento degli asset, trasmissione della politica monetaria (gia' nel terminale).
- Saltato: strutture di mercato, politica fiscale, commercio internazionale, calcolo dei cambi a termine (carry gia'
  provato e tolto), geopolitica (solo come idea di "indicatori di avvertimento" per lo studio degli eventi).

## Vol. 3 — Corporate Issuers (letto il 20/11/2026)
- Utile per la scheda Azionario (abbiamo gia' i bilanci SEC: cot_radar/fondamentali.py, studi/studio_qualita.py):
  ROIC contro costo del capitale (crea o distrugge valore), copertura degli interessi, liquidita' (indice corrente,
  ciclo di conversione della cassa), errori tipici di allocazione del capitale, governance (azionista di controllo,
  azioni a voto multiplo), modelli di business con effetti di rete.
- Provato (studi/studio_roic.py, risultati_roic.txt): ROIC >= 10% per 2 anni e copertura interessi < 3 NON anticipano
  rendimenti migliori (crea valore meno tutti -0,3% sviluppo, -2,1% verifica) -> non entrano come segnale.
- Saltato: forme societarie, stakeholder/ESG descrittivo, teoria di Modigliani-Miller (nessun dato operativo).

## Vol. 4 — Financial Statement Analysis (letto il 20/11/2026)
- Utile per la scheda Azionario (bilanci SEC gia' in cot_radar/fondamentali.py):
  cap. 10 "segnali d'allarme" sulla qualita' dei conti: crediti che crescono piu' dei ricavi (giorni di incasso in
  salita), magazzino che cresce piu' dei ricavi, flusso di cassa operativo sotto l'utile per piu' anni (accrual),
  rotazione dell'attivo in calo; cap. 11 rapporti (liquidita', solvibilita', redditivita') e scomposizione DuPont
  del ROE (margine x rotazione dell'attivo x leva).
- Provato sui titoli di oggi (studio_allarmi.py) e sull'universo completo con le delistate (studio_bilanci_onesto.py,
  risultati_bilanci_onesto.txt): sulle 500 azioni piu' scambiate i segnali indicano soprattutto aziende in crescita e
  hanno reso PIU' della media (p = 0,016). Nessun avviso sui conti, giudizio SOLIDA invariato. Stessa prova onesta
  per il ROIC del Vol. 3: nessun vantaggio significativo.
- Saltato: principi contabili IFRS/US GAAP (leasing, pensioni, imposte differite, metodi di magazzino), modelli di
  previsione dei bilanci (servono stime a mano per azienda).

## Vol. 5 — Equity Investments (letto il 21/11/2026)
- Provato: anomalie di calendario del cap. 3 (turn-of-the-month, giorno prima dei festivi, lunedi', gennaio) su
  S&P 500 dal 1970 e 6 ETF (studio_calendario.py): nessuna regge fuori campione 2010-oggi, come dice il libro.
- Provato: sorpresa degli utili / drift dopo i conti (studio_sorpresa_utili.py, universo con le delistate): la
  sorpresa positiva non anticipa rendimenti migliori; quella negativa solo dal 2018, non stabile. Non usato.
- Gia' nel terminale: momentum (filtri delle azioni scelte), valore (studio_valore / GARP, scartato), indici e
  pesi (portafogli), efficienza dei mercati (il metodo stesso: solo cio' che regge fuori campione).
- Saltato: organizzazione dei mercati e tipi di ordini, azioni privilegiate e ricevute di deposito, analisi
  qualitativa del settore (Porter) e modelli di previsione e valutazione (DDM, multipli) che richiedono stime per azienda.

## Vol. 6 — Fixed Income (letto il 21/11/2026)
- Provato (studio_obbligazioni.py): duration empirica degli ETF di Treasury dai dati (SHY -1,8%, IEF -7,4%,
  TLT -14,3% per +1 punto di rendimento, ultimi 3 anni, R2 >= 0,91): dato descrittivo affidabile.
- Provato: rendimento di partenza del 10 anni come previsione dei 7 anni dopo di IEF: correlazione 0,87 ma errore
  tipico 1,7 punti: non mostrato. Curva dei tassi (10a-3m) come filtro per TLT/IEF: nessun vantaggio stabile.
- Gia' provati prima: spread di credito e curva come anticipatori (Vol. 2, scartati).
- Saltato: emissione e negoziazione, cartolarizzazioni (ABS/MBS), analisi del credito di singoli emittenti.

## Vol. 7 — Derivatives (letto il 21/11/2026)
- Controllo fatto (costo di mantenimento / rinnovo dei future, cap. 4-6): i portafogli misurano rame e petrolio con
  i prezzi degli ETF sui future (CPER, USO), quindi il costo del rinnovo e' GIA' dentro i risultati. Quanto pesa:
  USO contro petrolio spot -10,5 punti l'anno nel 2010-2017 (contango), -0,2 nel 2018-oggi; CPER contro future
  continuo -1,2 punti l'anno dal 2011. Il terminale lo dice gia' nella nota degli strumenti.
- Gia' provati prima: carry delle valute (parita' dei tassi, tolto), vendita di opzioni (studio_opzioni.py) e premio
  del VIX (studio_vix.py). Il segnale "carry" delle materie prime (backwardation) e' stato provato misurando il rinnovo
  realizzato (ETF sui future contro prezzo senza rinnovo, studio_carry_materie.py): aiuta il drawdown soprattutto
  perche' tiene fuori piu' spesso; sul petrolio dei portafogli rende meno. Portafogli invariati.
- Saltato: valutazione di forward, swap e opzioni (binomiale, parita' put-call): teoria dei prezzi senza uso nel terminale.

## Vol. 8 — Alternative Investments (letto il 21/11/2026)
- Provato (studio_inflazione.py): la frase dei portafogli "rame e petrolio contro l'inflazione" e' vera sui dati
  (beta d'inflazione positivo fino al 2009 e dal 2010; con inflazione in salita forte rendono piu' di azioni e
  Treasury). L'oro ha protetto dall'inflazione fino al 2009, non dal 2010: nel terminale e' "cuscinetto", corretto.
- Gia' nel terminale: Bitcoin e crypto (schede BTC e Crypto), materie prime e costo del rinnovo (Vol. 7).
- Saltato: private equity e debito privato, immobili e infrastrutture dirette, terreni e foreste, hedge fund e
  strutture delle commissioni (non investibili dal pubblico del terminale con dati gratuiti affidabili).

## Vol. 9 — Portfolio Management (letto il 21/11/2026)
- Calcolato (risultati_alfa_beta.txt): beta e alfa di Jensen dei 3 profili contro il 60/40: beta 0,3-0,6 e alfa
  positivo in sviluppo e verifica (t >= 2 in 5 casi su 6). Candidato a dato descrittivo in "Rischio e costi".
- Gia' nel terminale: rendimento/rischio, drawdown, Sortino, Calmar, CVaR (cap. 1-2 e 6), costi e tasse.
- NON fatto per scelta: questionario "quale profilo fa per te" (cap. 4, IPS): consigliare un profilo in base alla
  situazione della persona e' consulenza personalizzata (MiFID II), che EdgeValor non fa.
- Possibile contenuto educativo: errori comportamentali (cap. 5: avversione alle perdite, eccesso di fiducia, effetto
  gregge) nella Guida, legati ai momenti in cui il terminale li vede (es. vendere nel drawdown).

## Vol. 10 — Ethical and Professional Standards (letto il 21/11/2026)
Contenuto: Codice etico e Standard I-VII del CFA Institute, introduzione ai GIPS (presentazione dei risultati),
applicazione pratica. Niente da calcolare: serve come regola di comportamento del terminale. Cosa ne viene a EdgeValor:
- III(D) Presentazione dei risultati: i risultati SIMULATI vanno detti chiaramente come tali (esempio 4 del libro).
  FATTO v8.55: (i) della tabella e del grafico dello Storico e nota nel PDF dei portafogli ("Storico e Verifica sono
  risultati simulati ... Live = rotazioni registrate in tempo reale"). Le Rotazioni avevano gia' "Simulato"/"Live".
- I(C) Rappresentazione: un riferimento non confrontabile con la strategia e' fuorviante; scegliere il piu' adatto.
  FATTO v8.55: riferimento per profilo (30/70, 50/50, 80/20) nello Storico. Le Rotazioni confrontano con l'S&P 500
  dichiarato come "il mercato", non come riferimento del profilo.
- I(C) Omissioni / scelta dei periodi (cherry picking): mostrare sempre tutti i profili e tutto lo storico.
  Gia' cosi': 3 profili sempre visibili, storico dal 2006, simulatore su tutte le partenze, studi con le delistate.
- V(B) Comunicazione: dire il metodo, i limiti e i rischi; separare fatti e stime; COMUNICARE SUBITO I CAMBI DEL METODO
  (esempi 9-13). Proposta: "Registro del metodo" datato (cambi di regole che toccano i risultati).
- V(A) Diligenza: modelli testati prima dell'uso, scenari negativi (crisi), criteri per valutare i fornitori di dati.
  Gia' cosi': regole fissate prima dei risultati, verifica fuori campione, crisi storiche, sorveglianza dei dati.
- VI(A)/VI(B) Conflitti e priorita' delle operazioni: chi pubblica segnali e investe negli stessi strumenti deve
  dichiararlo e non operare prima della pubblicazione. Proposta (per il legale): nota nelle condizioni d'uso sul fondatore
  che segue i portafogli modello alle stesse date pubblicate, mai prima.
- GIPS: solo chi GESTISCE patrimoni puo' dichiararsi conforme; un software no. EdgeValor non deve mai citare i GIPS
  (verificato: nessuna menzione nel sito). Ne prendiamo i principi: tutti i periodi, costi inclusi, nessuna selezione.
- II(B) Manipolazione del mercato (pump and dump): mai segnali su titoli poco scambiati; l'Azionario usa solo le 500
  azioni piu' scambiate e gli indici principali: rischio basso, da tenere cosi'.
- I(C) Plagio: citare la fonte dei metodi presi da studi e libri (gia' nei file degli studi).
