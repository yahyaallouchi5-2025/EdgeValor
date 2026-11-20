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
