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
  del VIX (studio_vix.py). Il segnale "carry" delle materie prime (backwardation) richiede la curva dei future, che
  non abbiamo: non provato.
- Saltato: valutazione di forward, swap e opzioni (binomiale, parita' put-call): teoria dei prezzi senza uso nel terminale.
