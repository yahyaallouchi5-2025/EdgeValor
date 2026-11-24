# -*- coding: utf-8 -*-
"""
notifiche.py - AVVISI DEI SEGNALI: canale Telegram per tutti gli iscritti + copia via e-mail all'admin.

Fonte unica: il registro live dei segnali (storico/segnali/registro.jsonl, vedi registro.py). Si avvisa solo di
cio' che e' gia' scritto nel registro ufficiale e gia' pubblicato sul sito: il workflow "Notifiche" parte
SOLO dopo una pubblicazione riuscita.

CURSORE (storico/segnali/notificati.json): numero dell'ultimo evento gia' avvisato. Serve a:
  - non mandare mai due volte lo stesso avviso (i giri della sera sono tre, quelli del mattino uno);
  - recuperare da solo: se Telegram non risponde il cursore NON avanza e gli eventi partono al giro dopo;
  - primo avvio: il cursore parte dall'ultimo evento esistente, nessun "arretrato" inviato agli iscritti.
Eventi piu' vecchi di MAX_ETA_ORE (es. dopo giorni di sito fermo) non si mandano: un avviso in ritardo e'
peggio di nessun avviso. Il cursore li supera comunque.

RIEPILOGO SETTIMANALE (riepilogo.py): quando la dashboard online mostra un report COT NUOVO (il venerdi' sera,
dopo l'uscita del COT) parte il riepilogo di tutti i segnali attivi divisi per categoria di asset, al posto del
messaggio sugli eventi. Il cursore ricorda la data COT dell'ultimo riepilogo ("riepilogo_cot"): uno a settimana.

BRIEFING DEL LUNEDI' (briefing.py, v6.38): ogni lunedi' dalle 05:30 UTC (martedi' se il giro e' saltato) un messaggio
lungo con portafoglio, forex, banche centrali e altri mercati, tutto ricavato dai dati del sito. Il cursore ricorda
il lunedi' dell'ultimo briefing ("briefing"): uno a settimana, mai doppioni. Al primo avvio parte dal lunedi' dopo.

Negli altri giri (un solo messaggio per giro, diviso solo se supera il limite di Telegram) si avvisa di:
  - NUOVO SEGNALE (apertura): direzione e punteggio (l'affidabilita' NON si mostra su Telegram);
  - RAFFORZAMENTO a STRONG (apertura "figlio") e INDEBOLIMENTO da STRONG;
  - CHIUSURA (torna neutro / si inverte) con la durata del segnale;
  - CONFERME del nuovo COT: raccolte in una riga sola (sono settimanali e numerose).
Gli eventi "iniziali" del primo avvio del registro non si avvisano mai (non sono nati in quel momento).

Credenziali: SOLO nei GitHub Secrets, mai nel codice o nei log (vedi README, sezione "Notifiche").
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID         -> canale Telegram (obbligatori per gli avvisi)
  SMTP_USER, SMTP_PASSWORD, ADMIN_EMAIL        -> copia e-mail all'admin (facoltativa; SMTP_HOST, default Gmail)
Senza Telegram configurato il cursore avanza comunque (nessun arretrato quando lo si attiva).

USO:  python -m cot_radar.notifiche storico https://utente.github.io/cot-radar/   (giro normale)
      python -m cot_radar.notifiche prova   https://utente.github.io/cot-radar/   (TEST: esempi delle notizie)
      python -m cot_radar.notifiche prova-cot https://utente.github.io/cot-radar/  (TEST: riepilogo COT subito)
      python -m cot_radar.notifiche anteprima storico                              (stampa senza inviare)
"""
import json
import os
import smtplib
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from html import escape as _escape

from .config import ASSETS, SITO_PUBBLICO
from .log import log
from . import avvisi
from .registro import leggi, verifica

CURSORE = "notificati.json"
MAX_ETA_ORE = 36                      # oltre: l'avviso e' troppo vecchio per essere utile
# v8.25 NOTTE SILENZIOSA (richiesta di Ya): fra le 23:00 e le 06:00 ora italiana non si manda nulla sul canale,
# TRANNE il riepilogo COT settimanale del venerdi' sera (v8.27, scelta di Ya).
# Il cursore NON avanza: gli avvisi restano in coda e partono al primo giro del mattino (giro delle 05:30 UTC,
# cioe' 06:30/07:30 in Italia). Gli eventi della sera hanno meno di 36 ore, quindi non vengono scartati.
NOTTE_DA, NOTTE_A = 23, 6
SOLO_SETTIMANALE = True               # v9.06 sul canale solo il riepilogo COT del giorno di uscita (vedi esegui)
LIMITE_TG = 3800                      # Telegram accetta 4096 caratteri: margine per i tag HTML
NOMI = {k: nome for k, _, nome, _ in ASSETS}
def escape(t):
    """Escape HTML per Telegram (gli apostrofi restano leggibili)."""
    return _escape(str(t), quote=False)


AVVERTENZA = "Informazione statistica dal registro pubblico, non consulenza finanziaria."


# ---------- testo dei messaggi ----------

def nome(e):
    """Nome leggibile: EUR/USD per le coppie, nome esteso per gli altri strumenti."""
    if e.get("base") and e.get("quote"):
        return f"{e['base']}/{e['quote']}"
    s = e.get("strumento", "?")
    return NOMI.get(s, s)


def _ora(iso):
    """'2026-10-23T22:59Z' -> datetime UTC (None se illeggibile)."""
    try:
        return datetime.strptime(iso, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _durata(da, a):
    """Durata leggibile tra due istanti ISO: '12 giorni (1 settimana e 5 giorni)'."""
    t0, t1 = _ora(da), _ora(a)
    if not t0 or not t1:
        return ""
    g = max(0, (t1 - t0).days)
    if g < 1:
        return "meno di 1 giorno"
    testo = f"{g} {'giorno' if g == 1 else 'giorni'}"
    s, r = divmod(g, 7)
    if s:
        sett = f"{s} {'settimana' if s == 1 else 'settimane'}"
        testo += f" ({sett}" + (f" e {r} {'giorno' if r == 1 else 'giorni'})" if r else ")")
    return testo


def _punti(p):
    return f"{p:+.1f}" if isinstance(p, (int, float)) else "n.d."


def _freccia(etichetta):
    return "▲" if "BUY" in etichetta else "▼" if "SELL" in etichetta else "■"


def righe_eventi(nuovi, aperture):
    """Testo HTML (Telegram) per gli eventi nuovi. aperture = {id: evento di apertura} di tutto il registro."""
    blocchi, conferme = [], []
    ordine = {"apertura": 0, "chiusura": 1, "conferma": 2}
    for e in sorted(nuovi, key=lambda e: ordine.get(e["tipo"], 3)):
        a = aperture.get(e.get("id"), {})
        if e["tipo"] == "apertura":
            if e.get("iniziale"):
                continue
            lab = e["etichetta"]
            titolo = (f"rafforzato a <b>{lab}</b>" if e.get("padre") else f"nuovo segnale <b>{lab}</b>")
            # AFFIDABILITA' volutamente NON mostrata su Telegram (decisione del 25/10/2026): resta nel registro
            blocchi.append(f"{_freccia(lab)} <b>{escape(nome(e))}</b>: {titolo}\n"
                           f"    Punteggio {_punti(e.get('punteggio'))}")
        elif e["tipo"] == "chiusura":
            if a.get("padre") and e.get("motivo") != "indebolito":
                continue                              # il figlio si chiude col padre: basta la riga del padre
            if a.get("padre"):
                blocchi.append(f"{_freccia(e.get('nuova', ''))} <b>{escape(nome(a))}</b>: da {escape(a['etichetta'])} "
                               f"torna <b>{escape(e.get('nuova', ''))}</b> (punteggio {_punti(e.get('punteggio'))})")
                continue
            motivo = "si inverte" if e.get("motivo") == "inversione" else "torna neutro"
            durata = _durata(a.get("generato"), e.get("quando"))
            blocchi.append(f"■ <b>{escape(nome(a) if a else e.get('id', '?'))}</b>: chiuso il segnale "
                           f"{escape(a.get('etichetta', ''))}, {motivo} (punteggio {_punti(e.get('punteggio'))})"
                           + (f"\n    Durata del segnale: {durata}" if durata else ""))
        elif e["tipo"] == "conferma" and a:
            conferme.append(f"{escape(nome(a))} {escape(e.get('etichetta', ''))}")
    if conferme:
        blocchi.append("✓ Confermati dal nuovo COT: " + ", ".join(conferme))
    return blocchi


RINVIO = "2026-11-16-edgevalor"                       # v7.88: codice del rinvio una tantum (vedi esegui)
RINVIO_DA, RINVIO_FINO = datetime(2026, 11, 16, 21), datetime(2026, 11, 18)   # finestra (UTC) del rinvio


def _link(sito):
    """v7.84: i dati si scaricano da 'sito' (github.io, passato dai workflow), ma i link nei messaggi Telegram
    portano sempre al dominio pubblico (SITO_PUBBLICO = edgevalor.com). Altri indirizzi (prove) restano uguali."""
    return SITO_PUBBLICO if "github.io" in (sito or "") else sito

GIORNI_BREVI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]


def etichetta_cot(cot):
    """v9.05 (Ya, 24/11/2026: "per me il COT e' uscito venerdi'") -> "report COT di ven 20/11 · posizioni al 17/11".
    La data del COT e' il martedi' delle posizioni; il report esce il venerdi' (il lunedi' dopo nelle settimane di festa
    USA, calendario.uscita_cot)."""
    try:
        from .calendario import uscita_cot
        mar = datetime.strptime(cot, "%Y-%m-%d").date()
        u = uscita_cot(mar + timedelta(days=3))
        return f"report COT di {GIORNI_BREVI[u.weekday()]} {u.day:02d}/{u.month:02d} · posizioni al {mar.day:02d}/{mar.month:02d}"
    except Exception:
        return f"COT del {cot[8:10]}/{cot[5:7]}/{cot[:4]}"


def ora_roma(t):
    """datetime UTC -> "23/11 23:03" in ora di Roma (regola di Ya: tutto in ora italiana)."""
    try:
        from zoneinfo import ZoneInfo
        r = (t if t.tzinfo else t.replace(tzinfo=timezone.utc)).astimezone(ZoneInfo("Europe/Rome"))
        return r.strftime("%d/%m/%Y %H:%M") + " ora di Roma"
    except Exception:
        return t.strftime("%d/%m/%Y %H:%M UTC")


def componi(blocchi, nuovi, sito):
    """Messaggi completi (lista: si divide solo se supera il limite di Telegram)."""
    if not blocchi:
        return []
    cot = next((e.get("cot_data") for e in reversed(nuovi) if e.get("cot_data")), None)
    quando = next((e.get("quando") or e.get("generato") for e in reversed(nuovi)), "")
    t = _ora(quando)
    testa = "<b>EdgeValor · aggiornamento segnali</b>\n<i>" + \
            (ora_roma(t) if t else "") + \
            (f" · {etichetta_cot(cot)}" if cot else "") + "</i>\n\n"
    piede = "\n\n" + (f'<a href="{_escape(sito.rstrip("/"))}/terminale/#verifica">Registro completo e statistiche</a>\n'
                      if sito else "") + f"<i>{AVVERTENZA}</i>"
    return impagina(testa, blocchi, piede)


def impagina(testa, blocchi, piede):
    """Unisce intestazione, blocchi e piede; se si supera il limite di Telegram divide tra un blocco e l'altro
    (mai a meta' di un blocco) e ripete intestazione e piede in ogni messaggio."""
    out, corpo = [], ""
    for b in blocchi:
        if corpo and len(testa) + len(corpo) + len(b) + len(piede) > LIMITE_TG:
            out.append(testa + corpo.rstrip() + piede)
            corpo = ""
        corpo += b + "\n\n"
    out.append(testa + corpo.rstrip() + piede)
    return out


# ---------- cursore ----------

def leggi_cursore(cartella):
    f = os.path.join(cartella, CURSORE)
    if not os.path.exists(f):
        return None
    with open(f, encoding="utf-8") as fh:
        return json.load(fh)


def scrivi_cursore(cartella, ultimo_n, ultimo_hash, adesso, riepilogo_cot=None, agenda=None, briefing=None):
    """ultimo_n = ultimo evento avvisato; riepilogo_cot = data COT dell'ultimo riepilogo settimanale inviato;
    agenda = stato degli avvisi sulle notizie (avvisi.py): {"arrivo": {id: data}, "esito": {valuta-data: data}};
    briefing = data (lunedi') dell'ultimo briefing settimanale inviato (briefing.py)."""
    f = os.path.join(cartella, CURSORE)
    tmp = f + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"ultimo_n": ultimo_n, "hash": ultimo_hash, "riepilogo_cot": riepilogo_cot, "agenda": agenda, "briefing": briefing,
                   "aggiornato": adesso.strftime("%Y-%m-%dT%H:%MZ")}, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    os.replace(tmp, f)


def notte(adesso):
    """True fra le 23:00 e le 06:00 ora italiana (ora legale/solare gestita da zoneinfo)."""
    from zoneinfo import ZoneInfo
    a = adesso if adesso.tzinfo else adesso.replace(tzinfo=timezone.utc)
    h = a.astimezone(ZoneInfo("Europe/Rome")).hour
    return h >= NOTTE_DA or h < NOTTE_A


def da_avvisare(eventi, cursore, adesso):
    """(eventi nuovi da avvisare, eventi saltati perche' troppo vecchi). cursore None = primo avvio: niente."""
    if cursore is None:
        return [], []
    nuovi = [e for e in eventi if e.get("n", -1) > cursore.get("ultimo_n", -1)]
    limite = adesso - timedelta(hours=MAX_ETA_ORE)
    freschi = [e for e in nuovi if (_ora(e.get("quando") or e.get("generato")) or adesso) >= limite]
    vecchi = [e for e in nuovi if e not in freschi]
    return freschi, vecchi


# ---------- invio ----------
# v7.42 ETICHETTE DI POSIZIONAMENTO: nei dati e nel registro restano BUY/SELL; nei messaggi (come in pagina) si legge
# il posizionamento degli speculatori. Motivo: nel backtest dal 1987 i segnali COT non hanno mostrato un vantaggio
# misurabile, quindi sono contesto e non indicazioni operative. La traduzione avviene all'ultimo passo, prima dell'invio.
_PAROLE = (("STRONG BUY", "FORTE RIALZO"), ("STRONG SELL", "FORTE RIBASSO"), ("BUY", "RIALZO"), ("SELL", "RIBASSO"),
           ("nuovo segnale", "nuovo posizionamento"), ("chiuso il segnale", "chiuso il posizionamento"),
           ("Durata del segnale", "Durata del posizionamento"))


def in_parole(testo):
    """Testo di un messaggio con le etichette di posizionamento al posto di BUY/SELL (solo parole intere)."""
    import re
    for vecchia, nuova in _PAROLE:
        testo = re.sub(r"(?<![A-Za-z])" + re.escape(vecchia) + r"(?![A-Za-z])", nuova, testo)
    return testo


def invia_telegram(token, chat, testo):
    """True se Telegram ha accettato il messaggio. Il token non compare mai nei log."""
    testo = in_parole(testo)
    dati = urllib.parse.urlencode({"chat_id": chat, "text": testo, "parse_mode": "HTML",
                                   "disable_web_page_preview": "true"}).encode()
    # v8.60 RIPROVA: il 21/11 un errore di rete momentaneo ha fatto saltare l'invio del mattino e il messaggio e'
    # partito solo 7 ore dopo (al giro successivo del sito). Ora 3 tentativi (subito, dopo 20 e dopo 60 secondi),
    # SOLO se Telegram non era raggiungibile: un rifiuto (HTTP) non si ripete, per non mandare doppioni.
    for attesa in (0, 20, 60):
        if attesa and "unittest" not in sys.modules:       # nei test niente attese
            time.sleep(attesa)
        try:
            with urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", dati, timeout=30) as r:
                return json.load(r).get("ok") is True
        except urllib.error.HTTPError as e:
            try:
                motivo = json.load(e).get("description", "")
            except Exception:
                motivo = ""
            log.error("Telegram ha rifiutato il messaggio (HTTP %s: %s)", e.code, motivo)
            return False
        except (urllib.error.URLError, OSError, ValueError) as e:
            log.error("Telegram non raggiungibile (%s), tentativo dopo %s s", type(e).__name__, attesa)
    return False


def invia_email(testi, env):
    """Copia all'admin (facoltativa). Testo semplice ricavato dall'HTML. Errori: solo un avviso nel log."""
    utente, password, dest = env.get("SMTP_USER"), env.get("SMTP_PASSWORD"), env.get("ADMIN_EMAIL")
    if not (utente and password and dest):
        return None
    import re
    corpo = "\n\n".join(re.sub(r"<[^>]+>", "", in_parole(t)) for t in testi).replace("&amp;", "&").replace("&lt;", "<") \
        .replace("&gt;", ">").replace("&quot;", '"').replace("&#x27;", "'")
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = "EdgeValor: aggiornamento segnali", utente, dest
    msg.set_content(corpo)
    try:
        with smtplib.SMTP_SSL(env.get("SMTP_HOST", "smtp.gmail.com"), int(env.get("SMTP_PORT", "465")),
                              context=ssl.create_default_context(), timeout=30) as s:
            s.login(utente, password)
            s.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as e:
        log.warning("e-mail all'admin non inviata (%s)", type(e).__name__)
        return False


# ---------- giro completo ----------

def esegui(cartella, sito, env=None, adesso=None, invia=True, dati_sito=None):
    """Un giro: legge registro e cursore, invia gli avvisi nuovi, avanza il cursore.
    SETTIMANALE: se la dashboard online mostra un report COT nuovo, parte il riepilogo per categoria
    (riepilogo.py) AL POSTO del messaggio sugli eventi: le novita' della settimana sono gia' dentro
    (segnali "nuovi" e chiusi), cosi' gli iscritti ricevono un solo messaggio.
    dati_sito = dati della pagina gia' letti (per i test); None = si scaricano dal sito.
    Restituisce un dizionario con l'esito (per il log del workflow e per i test)."""
    from . import riepilogo
    env = os.environ if env is None else env
    reale = adesso is None                                 # giro vero (i test passano un orario fisso)
    adesso = adesso or datetime.now(timezone.utc)
    silenzio = invia and reale and notte(adesso)          # v8.25 notte in Italia (eccezione: riepilogo COT, v8.27)
    eventi = leggi(cartella)
    integra, ultimo_hash, rotto = verifica(eventi)
    if not integra:
        log.error("registro NON integro dall'evento %s: nessun avviso finche' l'admin non controlla", rotto)
        return {"esito": "registro_non_integro", "inviati": 0}
    ultimo_n = eventi[-1]["n"] if eventi else -1
    dati = dati_sito if dati_sito is not None else riepilogo.completa(riepilogo.scarica(sito), cartella)   # v9.05 copia
    cot_sito = riepilogo.data_cot(dati)
    cursore = leggi_cursore(cartella)
    agenda_sito = (dati or {}).get("agenda")
    adesso_utc = adesso.astimezone(timezone.utc).replace(tzinfo=None) if adesso.tzinfo else adesso
    if cursore is None:
        if invia:
            lun0 = (adesso_utc.date() - timedelta(days=adesso_utc.weekday())).isoformat()
            scrivi_cursore(cartella, ultimo_n, ultimo_hash, adesso, cot_sito,
                           avvisi.stato_iniziale(agenda_sito, adesso_utc) if agenda_sito else None, lun0)
        log.info("notifiche: primo avvio, cursore all'evento %d e al COT %s (nessun arretrato inviato)",
                 ultimo_n, cot_sito)
        return {"esito": "primo_avvio", "inviati": 0, "ultimo_n": ultimo_n}
    gia_cot = cursore.get("riepilogo_cot")
    settimanale = bool(cot_sito and gia_cot and cot_sito > gia_cot)
    # v9.05 RIEPILOGO SOLO SE FRESCO: il report COT e' "del martedi'" ed esce il venerdi' (il lunedi' dopo nelle
    # settimane di festa USA, cioe' martedi' + 6 giorni). Oltre, un riepilogo farebbe pensare a un report nuovo che
    # non c'e': si segna come gia' fatto e si passa agli avvisi normali (successo il 24/11/2026 dopo la correzione).
    tardivo = False
    if settimanale:
        try:
            tardivo = (adesso.date() if hasattr(adesso, "date") else adesso) > \
                datetime.strptime(cot_sito, "%Y-%m-%d").date() + timedelta(days=6)
        except ValueError:
            tardivo = False
        if tardivo:
            log.info("notifiche: COT %s gia' vecchio, riepilogo saltato (cursore aggiornato)", cot_sito)
            settimanale = False
    if cot_sito and not gia_cot:
        gia_cot = cot_sito             # cursore di una versione precedente: il primo riepilogo sara' il prossimo
    # v8.27 ECCEZIONE DI YA: il riepilogo COT del venerdi' sera parte anche di notte; tutto il resto aspetta il mattino
    if silenzio and not settimanale:
        log.info("notifiche: notte in Italia, avvisi rimandati al mattino (cursore fermo)")
        return {"esito": "notte", "inviati": 0}
    if settimanale:
        testi = riepilogo.testi(dati, _link(sito), verifica=riepilogo.scarica_verifica(sito, dati))
        log.info("notifiche: nuovo report COT online (%s): riepilogo settimanale", cot_sito)
    else:
        nuovi, vecchi = da_avvisare(eventi, cursore, adesso)
        if vecchi:
            log.warning("notifiche: %d eventi troppo vecchi (> %d ore) non inviati", len(vecchi), MAX_ETA_ORE)
        aperture = {e["id"]: e for e in eventi if e["tipo"] == "apertura"}
        testi = componi(righe_eventi(nuovi, aperture), nuovi, _link(sito))
        # v9.06 UN SOLO MESSAGGIO COT A SETTIMANA (Ya, 24/11/2026: "perche' vedo il COT di martedi' se e' uscito
        # venerdi'?"). I cambi di posizionamento fra un report e l'altro (dovuti ai dati macro giornalieri) restano
        # nel registro del terminale ma NON vanno piu' sul canale: sul canale il COT esce solo con il riepilogo del
        # giorno di uscita del report. All'admin arriva comunque la copia via e-mail.
        if SOLO_SETTIMANALE and testi:
            try:
                invia_email(testi, env)
            except Exception:
                pass
            testi = []
    # NOTIZIE MACRO (avvisi.py): "in arrivo" e "esito", ognuno una sola volta; stato nel cursore
    stato_ag = cursore.get("agenda")
    if stato_ag is None and agenda_sito:                  # cursore di una versione precedente: niente arretrati
        stato_ag = avvisi.stato_iniziale(agenda_sito, adesso_utc)
    arrivo, gruppi, nuovo_ag = avvisi.da_inviare(agenda_sito, stato_ag, adesso_utc) if agenda_sito else \
        ([], [], stato_ag)
    credito = (agenda_sito or {}).get("credito") or ""
    # AGENDA DELLA SETTIMANA: venerdi' sera (dopo il riepilogo COT), una volta per settimana; prima degli altri
    settimana = []
    lunedi = avvisi.settimana_da_inviare(nuovo_ag, adesso_utc) if agenda_sito else None
    if lunedi:
        t = avvisi.testo_settimana(agenda_sito, lunedi)
        settimana = [t] if t else []
        nuovo_ag = dict(nuovo_ag or {}, settimana=lunedi.isoformat())    # segnata anche se vuota: niente ripetizioni
    # BRIEFING DEL LUNEDI' (briefing.py): una volta a settimana, il lunedi' (o il martedi' se il giro e' saltato)
    # dalle 05:30 UTC; segnato nel cursore con la data del lunedi' della settimana. Dopo l'agenda, prima delle notizie.
    briefing, lun_brief = [], cursore.get("briefing")
    if dati and dati.get("assets"):
        lun = adesso_utc.date() - timedelta(days=adesso_utc.weekday())
        # v9.05 recupero solo il martedi' MATTINA (entro le 12 UTC): un "briefing del lunedi'" la sera di martedi' confonde
        if cursore.get("briefing") != lun.isoformat() and (adesso_utc.weekday() == 0 or
                                                            (adesso_utc.weekday() == 1 and adesso_utc.hour < 12)) and \
                (adesso_utc.hour, adesso_utc.minute) >= (5, 30):
            from . import briefing as _br
            briefing = _br.testi(dati, _link(sito), adesso_utc)
            lun_brief = lun.isoformat()
    # v7.88 RINVIO UNA TANTUM (cambio nome in EdgeValor): si rimandano il briefing della settimana e l'avviso della
    # prossima notizia, cosi' l'admin puo' cancellare i messaggi vecchi. Segnato nel cursore: parte una volta sola.
    rinvio = []
    if dati and dati.get("assets") and "github.io" in (sito or "") and (stato_ag or {}).get("rinvio") != RINVIO \
            and RINVIO_DA <= adesso_utc < RINVIO_FINO:
        from . import briefing as _br
        rinvio = _br.testi(dati, _link(sito), adesso_utc)
        prossimi = []
        for e in (agenda_sito or {}).get("eventi") or []:
            if e.get("utc") and not e.get("uscito"):
                ore = (datetime.strptime(e["utc"], "%Y-%m-%dT%H:%MZ") - adesso_utc).total_seconds() / 3600
                if 0 < ore <= avvisi.ORE_PRIMA:
                    prossimi.append(e)
        if prossimi:
            rinvio.append(avvisi.testo_arrivo(prossimi[:5], credito))
        briefing = []                                    # il briefing e' gia' dentro il rinvio: niente doppione
    testi_notizie = settimana + [avvisi.testo_arrivo(arrivo[i:i + 5], credito) for i in range(0, len(arrivo), 5)] + \
                    [avvisi.testo_esito(gruppi[i:i + 4], credito) for i in range(0, len(gruppi), 4)]
    esito = {"esito": "niente_di_nuovo", "inviati": 0, "ultimo_n": ultimo_n, "testi": testi, "briefing": briefing,
             "tipo": "settimanale" if settimanale else "eventi", "testi_notizie": testi_notizie}
    if not invia:
        return dict(esito, esito="anteprima")
    token, chat = env.get("TELEGRAM_BOT_TOKEN"), env.get("TELEGRAM_CHAT_ID")
    configurato = bool(token and chat)
    if testi and configurato:
        for i, t in enumerate(testi):
            if not invia_telegram(token, chat, t):
                # il cursore resta fermo: al prossimo giro si riprova (i messaggi gia' partiti si ripetono:
                # meglio un doppione raro che un segnale perso)
                return dict(esito, esito="telegram_errore", inviati=i)
        esito.update(esito="inviato", inviati=len(testi))
        esito["email"] = invia_email(testi, env)
    elif testi:
        log.info("notifiche: Telegram non configurato (Secrets TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)")
        esito["esito"] = "non_configurato"
    nuovo_cot = cot_sito if (settimanale or tardivo) else gia_cot      # v9.05 il riepilogo tardivo si segna come fatto
    if silenzio:                                          # notte: solo il riepilogo COT, agenda/notizie/briefing al mattino
        if esito["esito"] in ("inviato", "non_configurato"):
            scrivi_cursore(cartella, ultimo_n, ultimo_hash, adesso, nuovo_cot, cursore.get("agenda"), cursore.get("briefing"))
        return dict(esito, notte=True)
    # briefing del lunedi': se Telegram lo rifiuta il cursore NON avanza e si riprova al giro dopo
    nuovo_brief = cursore.get("briefing")
    if briefing and configurato:
        if all(invia_telegram(token, chat, t) for t in briefing):
            nuovo_brief = lun_brief
            esito["inviati"] += len(briefing)
            esito["esito"] = "inviato"
        else:
            esito["esito"] = "telegram_errore"
    elif briefing:
        nuovo_brief = lun_brief                          # Telegram non configurato: nessun arretrato quando lo si attiva
    notizie_ok = True
    if testi_notizie and configurato:
        for t in testi_notizie:
            if not invia_telegram(token, chat, t):
                notizie_ok = False                       # stato delle notizie fermo: si riprova al prossimo giro
                esito["esito"] = "telegram_errore"
                break
        if notizie_ok:
            esito["inviati"] += len(testi_notizie)
            esito["esito"] = "inviato"
    if rinvio and configurato:
        if all(invia_telegram(token, chat, t) for t in rinvio):
            nuovo_ag = dict(nuovo_ag or {}, rinvio=RINVIO)
            esito["inviati"] += len(rinvio)
            esito["esito"] = "inviato"
    elif rinvio:
        nuovo_ag = dict(nuovo_ag or {}, rinvio=RINVIO)
    stato_finale = nuovo_ag if notizie_ok else dict(stato_ag or {}, **({"rinvio": nuovo_ag.get("rinvio")} if (nuovo_ag or {}).get("rinvio") else {}))
    if (ultimo_n != cursore.get("ultimo_n") or nuovo_cot != cursore.get("riepilogo_cot")
            or stato_finale != cursore.get("agenda") or nuovo_brief != cursore.get("briefing")):
        scrivi_cursore(cartella, ultimo_n, ultimo_hash, adesso, nuovo_cot, stato_finale, nuovo_brief)
    return esito


def prova_notizie(sito, env=None, dati_sito=None, adesso=None):
    """TEST dal workflow 'Prova notifiche': manda SUBITO, marcati [TEST · esempio], i tre messaggi delle notizie
    con i dati veri del sito: 1) agenda della settimana prossima, 2) pre-avviso della prossima notizia,
    3) esito dell'ultima notizia uscita. Non tocca il cursore: gli avvisi veri partono comunque da soli."""
    from . import riepilogo
    env = os.environ if env is None else env
    token, chat = env.get("TELEGRAM_BOT_TOKEN"), env.get("TELEGRAM_CHAT_ID")
    dati = dati_sito if dati_sito is not None else riepilogo.completa(riepilogo.scarica(sito), cartella)   # v9.05 copia
    adesso = adesso or datetime.now(timezone.utc).replace(tzinfo=None)
    testi = []
    if dati and dati.get("assets"):                       # esempi del riepilogo del venerdi' e del briefing del lunedi'
        from . import briefing as _br
        testi += riepilogo.testi(dati, _link(sito), test=True, verifica=riepilogo.scarica_verifica(sito, dati))
        testi += _br.testi(dati, _link(sito), adesso, test=True)
    agenda = (dati or {}).get("agenda")
    if not agenda or not agenda.get("eventi"):
        if not testi:
            log.error("prova notizie: il sito non ha dati ne' agenda delle notizie")
            return {"telegram": None, "messaggi": 0}
        agenda = {"eventi": [], "credito": ""}
        log.warning("prova notizie: agenda delle notizie non disponibile, partono solo riepilogo e briefing")
    g = adesso.weekday()
    lunedi = adesso.date() + timedelta(days=(7 - g) if g else 7)        # lunedi' della settimana PROSSIMA
    t = avvisi.testo_settimana(agenda, lunedi, prova=True)
    if t:
        testi.append(t)
    futuri = [e for e in agenda["eventi"] if not e.get("uscito")]
    if futuri:                                          # stesso giorno della prima notizia in arrivo
        testi.append(avvisi.testo_arrivo([e for e in futuri if e["data"] == futuri[0]["data"]][:5],
                                         agenda.get("credito") or "", prova=True))
    _, gruppi, _ = avvisi.da_inviare(agenda, {"arrivo": {}, "esito": {}}, adesso)
    if gruppi:                                          # l'esito piu' recente gia' pronto
        testi.append(avvisi.testo_esito(gruppi[-1:], agenda.get("credito") or "", prova=True))
    if not (token and chat):
        log.error("mancano i Secrets TELEGRAM_BOT_TOKEN e/o TELEGRAM_CHAT_ID")
        return {"telegram": None, "messaggi": len(testi), "testi": testi}
    ok = all(invia_telegram(token, chat, t) for t in testi)
    return {"telegram": ok, "messaggi": len(testi), "testi": testi}


def prova(sito, env=None, dati_sito=None):
    """TEST dal workflow 'Prova notifiche': manda SUBITO il riepilogo settimanale della dashboard attuale,
    marcato [TEST] (non tocca il cursore: il riepilogo vero partira' comunque col prossimo COT).
    Se i dati del sito non si leggono, manda un semplice messaggio di prova del collegamento."""
    from . import riepilogo
    env = os.environ if env is None else env
    token, chat = env.get("TELEGRAM_BOT_TOKEN"), env.get("TELEGRAM_CHAT_ID")
    dati = dati_sito if dati_sito is not None else riepilogo.completa(riepilogo.scarica(sito), cartella)   # v9.05 copia
    if dati and dati.get("assets"):
        testi = riepilogo.testi(dati, _link(sito), test=True)
    else:
        testi = ["<b>EdgeValor · messaggio di prova</b>\n\nIl canale è collegato: qui arriveranno il riepilogo "
                 "settimanale dei segnali e gli aggiornamenti." +
                 (f'\n\n<a href="{_escape(_link(sito).rstrip("/"))}/">Apri il terminale</a>' if sito else "")]
    if not (token and chat):
        log.error("mancano i Secrets TELEGRAM_BOT_TOKEN e/o TELEGRAM_CHAT_ID")
        return {"telegram": None, "email": invia_email(testi, env), "messaggi": len(testi)}
    ok = all(invia_telegram(token, chat, t) for t in testi)
    return {"telegram": ok, "email": invia_email(testi, env), "messaggi": len(testi)}


def main(argv):
    if len(argv) >= 2 and argv[0] == "anteprima":
        r = esegui(os.path.join(argv[1], "segnali"), argv[2] if len(argv) > 2 else "", invia=False)
        print(json.dumps({k: v for k, v in r.items() if k not in ("testi", "briefing")}, ensure_ascii=False))
        for t in (r.get("testi") or []) + (r.get("briefing") or []):
            print("-" * 40 + "\n" + t)
        return 0
    if len(argv) >= 1 and argv[0] == "prova":
        # il workflow "Prova notifiche" manda gli esempi delle NOTIZIE (agenda, pre-avviso, esito);
        # il riepilogo COT di prova resta disponibile con: python -m cot_radar.notifiche prova-cot URL
        r = prova_notizie(argv[1] if len(argv) > 1 else "")
        print("esito prova notizie:", {k: v for k, v in r.items() if k != "testi"})
        return 0 if r.get("telegram") else 1
    if len(argv) >= 1 and argv[0] == "prova-cot":
        r = prova(argv[1] if len(argv) > 1 else "")
        print("esito prova:", r)
        return 0 if r["telegram"] else 1
    if len(argv) < 1:
        print(__doc__)
        return 2
    r = esegui(os.path.join(argv[0], "segnali"), argv[1] if len(argv) > 1 else "")
    print("esito notifiche:", {k: v for k, v in r.items() if k not in ("testi", "briefing")})
    return 1 if r["esito"] in ("telegram_errore", "registro_non_integro") else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
