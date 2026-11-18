# -*- coding: utf-8 -*-
"""
crypto.py - v8.01 SCHEDA CRYPTO: Bitcoin e le principali altcoin in una tabella (scheda "Crypto", menu Mercati).

COSA FA (a ogni costruzione del sito, in automatico):
  1) per ogni moneta dell'elenco MONETE scarica da EODHD tutto lo storico giornaliero (chiusura e volume);
  2) prova a leggere da EODHD anche i "fondamentali" (capitalizzazione e supply). Se il nostro piano non li
     comprende (risposta 401/402/403) quelle colonne restano vuote: MAI numeri inventati;
  3) calcola per ogni moneta: prezzo, variazioni 1 giorno / 7 giorni / 30 giorni / 1 anno / da inizio anno,
     massimo storico e drawdown dal massimo, volatilita' a 30 giorni (annua, 365 giorni), volume in dollari
     (ultimo giorno e media 30 giorni), mini-grafico 90 giorni, grafico settimanale 3 anni per il profilo;
  4) salva il risultato in storico/crypto.json: se un giorno EODHD non risponde, la pagina mostra l'ultimo
     calcolo valido con la sua data.
STABLECOIN (USDT, USDC...) escluse di proposito: valgono sempre circa 1 dollaro, i numeri di prezzo non dicono nulla.
DESCRIZIONI: scritte da noi (brevi, in italiano), non copiate da altri siti.
SUPPLY MASSIMA: se i fondamentali non arrivano si usa il tetto fissato dal protocollo (MAX), solo per le monete che
  ne hanno uno noto; le altre restano "senza tetto".
VOLUME: EODHD per le crypto puo' dare il volume in monete o in dollari. Si decide su Bitcoin: un volume giornaliero
  sopra 1 miliardo non puo' essere in BTC (ne esistono circa 20 milioni), quindi e' gia' in dollari.
SOLO LIBRERIA STANDARD. Chiave EODHD solo nei Secrets di GitHub (variabile EODHD_API_KEY), mai nel codice.
DEBUG: python -c "from cot_radar import crypto as c; import json; print(json.dumps(c.per_pagina()['monete'][:2], indent=1))"
"""
import json
import math
import os
from datetime import date, datetime, timedelta, timezone

from .log import log

CARTELLA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storico")
FILE = "crypto.json"
DAL = "2010-07-01"            # tutto lo storico disponibile (serve per il massimo storico)
MIN_MONETE = 5                # sotto questo numero di monete scaricate il calcolo non si considera valido
SPARK = 90                    # giorni del mini-grafico
SETT = 156                    # settimane del grafico nel profilo (3 anni)

# (sigla, nome, simboli EODHD da provare in ordine, anno di nascita, categoria, descrizione, descrizione in inglese)
MONETE = [
    ("BTC", "Bitcoin", ["BTC-USD.CC"], 2009, "Moneta digitale",
     "La prima criptovaluta: una moneta digitale senza banca centrale, con un massimo fisso di 21 milioni di pezzi. "
     "Le transazioni sono validate dai miner (proof of work).",
     "The first cryptocurrency: a digital currency with no central bank and a fixed maximum of 21 million coins. Transactions are validated by miners (proof of work)."),
    ("ETH", "Ethereum", ["ETH-USD.CC"], 2015, "Piattaforma",
     "Rete su cui girano programmi automatici (smart contract): finanza decentralizzata, stablecoin, NFT. "
     "Ether paga le commissioni della rete; validazione proof of stake dal 2022.",
     "Network that runs automatic programs (smart contracts): decentralized finance, stablecoins, NFTs. Ether pays the network fees; proof-of-stake validation since 2022."),
    ("BNB", "BNB", ["BNB-USD.CC"], 2017, "Piattaforma",
     "Moneta dell'ecosistema Binance: paga le commissioni della BNB Chain e sconti sull'exchange. "
     "Una parte viene distrutta ogni trimestre (burn) per ridurre l'offerta.",
     "Coin of the Binance ecosystem: it pays BNB Chain fees and gives exchange discounts. Part of it is destroyed every quarter (burn) to reduce supply."),
    ("SOL", "Solana", ["SOL-USD.CC"], 2020, "Piattaforma",
     "Rete veloce e a basso costo per applicazioni e pagamenti, concorrente di Ethereum. "
     "Combina proof of stake e un orologio interno (proof of history).",
     "Fast, low-cost network for apps and payments, a rival of Ethereum. It combines proof of stake with an internal clock (proof of history)."),
    ("XRP", "XRP", ["XRP-USD.CC"], 2012, "Pagamenti",
     "Moneta del registro XRP Ledger, pensata per pagamenti internazionali veloci tra istituzioni. "
     "Tutti i 100 miliardi di pezzi sono stati creati all'inizio.",
     "Coin of the XRP Ledger, designed for fast international payments between institutions. All 100 billion coins were created at launch."),
    ("DOGE", "Dogecoin", ["DOGE-USD.CC"], 2013, "Meme",
     "Nata come scherzo ispirato a un meme, è diventata una delle monete più scambiate. "
     "Nessun tetto: ogni anno se ne creano circa 5 miliardi di nuove.",
     "Born as a joke inspired by a meme, it became one of the most traded coins. No cap: about 5 billion new coins are created every year."),
    ("ADA", "Cardano", ["ADA-USD.CC"], 2017, "Piattaforma",
     "Piattaforma per smart contract sviluppata con un approccio accademico e verifiche formali. "
     "Proof of stake, massimo di 45 miliardi di pezzi.",
     "Smart-contract platform built with an academic approach and formal verification. Proof of stake, maximum of 45 billion coins."),
    ("TRX", "Tron", ["TRX-USD.CC"], 2017, "Piattaforma",
     "Rete molto usata per trasferire stablecoin (soprattutto USDT) con commissioni basse. "
     "Validazione affidata a 27 rappresentanti eletti (delegated proof of stake).",
     "Network widely used to move stablecoins (mostly USDT) with low fees. Validation is entrusted to 27 elected representatives (delegated proof of stake)."),
    ("AVAX", "Avalanche", ["AVAX-USD.CC"], 2020, "Piattaforma",
     "Piattaforma per smart contract organizzata in sotto-reti personalizzabili (subnet). "
     "Massimo di 720 milioni di pezzi; le commissioni pagate vengono distrutte.",
     "Smart-contract platform organized in customizable sub-networks (subnets). Maximum of 720 million coins; fees paid are burned."),
    ("LINK", "Chainlink", ["LINK-USD.CC"], 2017, "Infrastruttura",
     "Rete di oracoli: porta dati del mondo reale (prezzi, risultati, eventi) dentro gli smart contract. "
     "LINK paga i nodi che forniscono i dati.",
     "Oracle network: it brings real-world data (prices, results, events) into smart contracts. LINK pays the nodes that supply the data."),
    ("DOT", "Polkadot", ["DOT-USD.CC"], 2020, "Infrastruttura",
     "Rete che collega più blockchain specializzate (parachain) facendole comunicare e condividere la sicurezza. "
     "DOT serve per staking e decisioni di governo della rete.",
     "Network connecting several specialized blockchains (parachains) so they can communicate and share security. DOT is used for staking and network governance."),
    ("TON", "Toncoin", ["TON-USD.CC", "TON11419-USD.CC"], 2021, "Piattaforma",
     "Blockchain nata dal progetto di Telegram e integrata nell'app (portafoglio e pagamenti). "
     "Pensata per gestire moltissime transazioni dividendo il lavoro in più catene.",
     "Blockchain born from the Telegram project and integrated into the app (wallet and payments). Built to handle huge volumes by splitting work across chains."),
    ("SHIB", "Shiba Inu", ["SHIB-USD.CC"], 2020, "Meme",
     "Moneta meme nata come rivale di Dogecoin, con un'offerta di centinaia di migliaia di miliardi di pezzi. "
     "Intorno sono nati un exchange decentralizzato e una rete propria (Shibarium).",
     "Meme coin born as a Dogecoin rival, with a supply of hundreds of trillions of coins. A decentralized exchange and its own network (Shibarium) grew around it."),
    ("LTC", "Litecoin", ["LTC-USD.CC"], 2011, "Moneta digitale",
     "Una delle prime alternative a Bitcoin: stesso modello con blocchi più veloci (2,5 minuti). "
     "Massimo di 84 milioni di pezzi.",
     "One of the first alternatives to Bitcoin: the same model with faster blocks (2.5 minutes). Maximum of 84 million coins."),
    ("BCH", "Bitcoin Cash", ["BCH-USD.CC"], 2017, "Moneta digitale",
     "Nata nel 2017 da una divisione di Bitcoin per avere blocchi più grandi e pagamenti più economici. "
     "Massimo di 21 milioni di pezzi, come Bitcoin.",
     "Born in 2017 from a split of Bitcoin to have bigger blocks and cheaper payments. Maximum of 21 million coins, like Bitcoin."),
    ("XLM", "Stellar", ["XLM-USD.CC"], 2014, "Pagamenti",
     "Rete per trasferire denaro tra paesi e valute in pochi secondi, con costi minimi. "
     "Usata anche per emettere versioni digitali di valute e titoli.",
     "Network to move money across countries and currencies in seconds at minimal cost. Also used to issue digital versions of currencies and securities."),
    ("UNI", "Uniswap", ["UNI-USD.CC", "UNI7083-USD.CC"], 2020, "Finanza decentralizzata",
     "Il più noto exchange decentralizzato: si scambiano token direttamente dal portafoglio, senza intermediario. "
     "UNI da' diritto di voto sulle regole del protocollo.",
     "The best-known decentralized exchange: tokens are swapped straight from the wallet, with no intermediary. UNI gives voting rights on the protocol rules."),
    ("NEAR", "NEAR Protocol", ["NEAR-USD.CC"], 2020, "Piattaforma",
     "Piattaforma per applicazioni che divide il lavoro in parti (sharding) per restare veloce ed economica. "
     "Negli ultimi anni punta su applicazioni di intelligenza artificiale.",
     "App platform that splits work into parts (sharding) to stay fast and cheap. In recent years it has focused on artificial intelligence apps."),
    ("ICP", "Internet Computer", ["ICP-USD.CC"], 2021, "Infrastruttura",
     "Rete che vuole ospitare interi siti e servizi web direttamente sulla blockchain, senza server tradizionali. "
     "ICP paga la potenza di calcolo usata.",
     "Network that aims to host whole websites and web services directly on the blockchain, without traditional servers. ICP pays for the computing used."),
    ("APT", "Aptos", ["APT-USD.CC", "APT21794-USD.CC"], 2022, "Piattaforma",
     "Blockchain fondata da ex sviluppatori del progetto Diem di Meta, con il linguaggio Move. "
     "Esegue molte transazioni in parallelo.",
     "Blockchain founded by former developers of Meta's Diem project, using the Move language. It runs many transactions in parallel."),
    ("SUI", "Sui", ["SUI-USD.CC", "SUI20947-USD.CC"], 2023, "Piattaforma",
     "Blockchain che usa il linguaggio Move e tratta ogni bene digitale come un oggetto separato. "
     "Massimo di 10 miliardi di pezzi.",
     "Blockchain using the Move language that treats every digital asset as a separate object. Maximum of 10 billion coins."),
    ("HBAR", "Hedera", ["HBAR-USD.CC"], 2019, "Infrastruttura",
     "Registro pubblico governato da un consiglio di grandi aziende, pensato per pagamenti e usi aziendali. "
     "Massimo di 50 miliardi di pezzi.",
     "Public ledger governed by a council of large companies, designed for payments and business use. Maximum of 50 billion coins."),
    ("ATOM", "Cosmos", ["ATOM-USD.CC"], 2019, "Infrastruttura",
     "Ecosistema di blockchain indipendenti che si parlano tra loro con un protocollo comune (IBC). "
     "ATOM serve per staking e voto.",
     "Ecosystem of independent blockchains that talk to each other through a common protocol (IBC). ATOM is used for staking and voting."),
    ("XMR", "Monero", ["XMR-USD.CC"], 2014, "Moneta digitale",
     "Moneta digitale centrata sulla riservatezza: mittente, destinatario e importo non sono visibili. "
     "Diversi exchange non la quotano per motivi normativi.",
     "Digital currency focused on privacy: sender, receiver and amount are not visible. Several exchanges don't list it for regulatory reasons."),
    ("ETC", "Ethereum Classic", ["ETC-USD.CC"], 2015, "Piattaforma",
     "La catena originale di Ethereum, rimasta quando nel 2016 la rete si è divisa dopo un attacco. "
     "Resta proof of work, con un massimo di circa 210 milioni di pezzi.",
     "The original Ethereum chain, which remained when the network split in 2016 after an attack. Still proof of work, with a maximum of about 210 million coins."),
    ("FIL", "Filecoin", ["FIL-USD.CC"], 2020, "Infrastruttura",
     "Mercato decentralizzato di spazio di archiviazione: chi offre spazio sui propri dischi viene pagato in FIL. "
     "Massimo di 2 miliardi di pezzi.",
     "Decentralized storage market: those who offer space on their disks are paid in FIL. Maximum of 2 billion coins."),
]
# tetto fissato dal protocollo (solo dove e' noto e stabile): usato se i fondamentali di EODHD non arrivano
MAX = {"BTC": 21e6, "LTC": 84e6, "BCH": 21e6, "ADA": 45e9, "XRP": 100e9, "AVAX": 720e6, "SUI": 10e9,
       "HBAR": 50e9, "FIL": 2e9, "ETC": 210.7e6}


# --------------------------------------------------------------------------- dati
def _eod(sym, dal, get):
    """[(data, chiusura, volume)] di un simbolo EODHD, oppure None."""
    js = get("eod/" + sym, {"from": dal})
    if not isinstance(js, list):
        return None
    out = {}
    for x in js:
        c = x.get("close")
        if x.get("date") and c and c > 0:
            out[x["date"][:10]] = (float(c), float(x.get("volume") or 0))
    return [(d, c, v) for d, (c, v) in sorted(out.items())] or None


def _fond(sym, get):
    """Capitalizzazione e supply dai fondamentali EODHD, oppure {} (piano senza fondamentali o simbolo mancante)."""
    js = get("fundamentals/" + sym, {}, tentativi=1)
    st = (js or {}).get("Statistics") if isinstance(js, dict) else None
    if not isinstance(st, dict):
        return {}

    def num(k):
        try:
            v = float(st.get(k))
            return v if v > 0 else None
        except (TypeError, ValueError):
            return None
    return {"mcap": num("MarketCapitalization"), "circ": num("CirculatingSupply"),
            "tot": num("TotalSupply"), "max": num("MaxSupply")}


def scarica(get=None):
    """{sigla: {"sym", "serie": [(data, chiusura, volume)], "fond": {...}}} per le monete che rispondono."""
    if get is None:
        from .eodhd import get
    out, fond_ok = {}, True
    for sig, _, simboli, *_ in MONETE:
        for sym in simboli:
            try:
                s = _eod(sym, DAL, get)
            except Exception as e:
                log.warning("crypto: %s non scaricato (%s)", sym, type(e).__name__)
                s = None
            if s and len(s) > 40:
                f = {}
                if fond_ok:                            # al primo rifiuto (piano senza fondamentali) non si riprova
                    try:
                        f = _fond(sym, get)
                    except Exception:
                        f = {}
                    if not f and not out:
                        fond_ok = False
                out[sig] = {"sym": sym, "serie": s, "fond": f}
                break
    log.info("crypto: %d monete scaricate su %d, fondamentali %s", len(out), len(MONETE),
             "si" if any(v["fond"] for v in out.values()) else "no")
    return out


# --------------------------------------------------------------------------- calcoli
def _var(s, giorni):
    """Variazione % dell'ultima chiusura rispetto a `giorni` giorni di calendario prima (None se manca la storia)."""
    ultimo = date.fromisoformat(s[-1][0])
    lim = (ultimo - timedelta(days=giorni)).isoformat()
    prima = [x for x in s if x[0] <= lim]
    if not prima:
        return None
    return round((s[-1][1] / prima[-1][1] - 1) * 100, 2)


def _vol30(s):
    """Volatilita' annua % dei rendimenti giornalieri degli ultimi 30 giorni (le crypto si scambiano 365 giorni l'anno)."""
    c = [x[1] for x in s[-31:]]
    r = [math.log(c[i] / c[i - 1]) for i in range(1, len(c)) if c[i - 1] > 0]
    if len(r) < 20:
        return None
    m = sum(r) / len(r)
    return round(math.sqrt(sum((x - m) ** 2 for x in r) / (len(r) - 1)) * math.sqrt(365) * 100, 1)


def _arrot(v):
    """Prezzo con cifre significative sensate (1,23 · 0,0000123 · 97.123)."""
    if v is None:
        return None
    if v >= 1000:
        return round(v, 0)
    if v >= 1:
        return round(v, 2)
    return float(f"{v:.4g}")


def calcola(dati, oggi=None):
    """Blocco della pagina: {agg, fond, monete:[...]} ordinate per capitalizzazione (o per volume), oppure None."""
    if not dati or len(dati) < MIN_MONETE:
        return None
    oggi = oggi or datetime.now(timezone.utc).date()
    # volume: in dollari o in monete? si decide su Bitcoin (vedi intestazione)
    b = (dati.get("BTC") or {}).get("serie") or []
    in_dollari = bool(b) and sum(x[2] for x in b[-30:]) / max(1, len(b[-30:])) > 1e9
    righe = []
    for sig, nome, _, anno, cat, desc, desc_en in MONETE:
        x = dati.get(sig)
        if not x:
            continue
        s = x["serie"]
        if (oggi - date.fromisoformat(s[-1][0])).days > 7:      # prezzi fermi da piu' di una settimana: fuori
            log.warning("crypto: %s fermo al %s, non mostrato", sig, s[-1][0])
            continue
        p = s[-1][1]
        usd = (lambda r: r[2]) if in_dollari else (lambda r: r[2] * r[1])
        vol_m = [usd(r) for r in s[-30:] if r[2] > 0]
        ath = max(s, key=lambda r: r[1])
        anno_c = [r for r in s if r[0] < f"{oggi.year}-01-01"]
        f = x.get("fond") or {}
        circ = f.get("circ")
        mx = f.get("max") or MAX.get(sig)
        mcap = f.get("mcap") or (circ * p if circ else None)
        # mini-grafico 90 giorni e grafico settimanale 3 anni (venerdi' o ultimo giorno disponibile della settimana)
        sett = {}
        for d, c, _ in s:
            k = date.fromisoformat(d).isocalendar()[:2]
            sett[k] = (d, c)
        w = list(sett.values())[-SETT:]
        righe.append({
            "s": sig, "n": nome, "cat": cat, "anno": anno, "desc": desc, "desc_en": desc_en,
            "p": _arrot(p), "data": s[-1][0],
            "v1g": _var(s, 1), "v7g": _var(s, 7), "v30g": _var(s, 30), "v1a": _var(s, 365),
            "vytd": round((p / anno_c[-1][1] - 1) * 100, 2) if anno_c else None,
            "ath": _arrot(ath[1]), "ath_d": ath[0], "dd": round((p / ath[1] - 1) * 100, 1),
            "vol30": _vol30(s),
            "volu": round(usd(s[-1])) if s[-1][2] > 0 else None,
            "volm": round(sum(vol_m) / len(vol_m)) if vol_m else None,
            "mcap": round(mcap) if mcap else None, "circ": round(circ) if circ else None,
            "max": round(mx) if mx else None,
            "circ_pct": round(circ / mx * 100, 1) if circ and mx else None,
            "spark": [_arrot(r[1]) for r in s[-SPARK:]],
            "sett": [[d, _arrot(c)] for d, c in w],
            "dal": s[0][0][:4],
        })
    if len(righe) < MIN_MONETE:
        return None
    con_cap = any(r["mcap"] for r in righe)
    righe.sort(key=lambda r: -((r["mcap"] if con_cap else r["volm"]) or 0))
    # quota di capitalizzazione di ogni moneta sul totale delle monete in tabella (solo se c'e' la capitalizzazione)
    tot = sum(r["mcap"] or 0 for r in righe)
    for r in righe:
        r["quota"] = round(r["mcap"] / tot * 100, 1) if tot and r["mcap"] else None
    return {"agg": max(r["data"] for r in righe), "fond": con_cap, "ordine": "mcap" if con_cap else "volume",
            "monete": righe}


# --------------------------------------------------------------------------- salvataggio e pagina
def salva(blocco, cartella=CARTELLA):
    try:
        os.makedirs(cartella, exist_ok=True)
        with open(os.path.join(cartella, FILE), "w", encoding="utf-8") as f:
            json.dump(blocco, f, ensure_ascii=False, separators=(",", ":"))
    except OSError as e:
        log.warning("crypto: copia non salvata (%s)", type(e).__name__)


def leggi(cartella=CARTELLA):
    try:
        with open(os.path.join(cartella, FILE), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def per_pagina(scarica_dati=scarica, cartella=CARTELLA):
    """Blocco D.crypto: calcolo nuovo se EODHD risponde, altrimenti l'ultimo valido salvato (vecchio=True)."""
    try:
        nuovo = calcola(scarica_dati())
    except Exception as e:
        log.warning("crypto: calcolo non riuscito (%s)", type(e).__name__)
        nuovo = None
    if nuovo:
        salva(nuovo, cartella)
        return nuovo
    vecchio = leggi(cartella)
    if vecchio:
        log.warning("crypto: EODHD non disponibile, uso il calcolo del %s", vecchio.get("agg"))
        return dict(vecchio, vecchio=True)
    return None
