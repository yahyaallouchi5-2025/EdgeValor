# -*- coding: utf-8 -*-
"""
sorveglianza.py - v7.24 ALLARME QUANDO QUALCOSA SI FERMA (per l'admin, non per gli iscritti).

PERCHE'
  Nel novembre 2026 il sito e' rimasto fermo per ore (pubblicazione di GitHub Pages bloccata) e i giri automatici
  delle azioni sono partiti con 9 ore di ritardo: ce ne siamo accorti solo guardando a mano. Ora un controllo
  automatico ogni ora lo segnala.

COSA CONTROLLA (workflow sorveglianza.yml, ogni ora)
  1) sito pubblicato: stato.json del sito, campo "creato" (ora italiana), non piu' vecchio di ORE_SITO;
  2) Azionario: azioni/indice.json, campo "generato" (ora italiana), non piu' vecchio di ORE_AZIONI;
  3) prezzi live: live.json nel ramo "live", campo "quando" (secondi), fresco durante le ore di borsa;
  4) ultimo giro CONCLUSO dei workflow principali (Sito, Azioni, Prezzi live, Test): nessuno fallito;
  6) v7.66 archivio storico (archivio.json del sito): nessuna serie FERMA (ultimo dato troppo vecchio per il suo passo);
  7) v7.66 stagionalita' oraria: ricalcolata ogni notte; workflow Orari e Pattern tra quelli sorvegliati;
  5) v7.27 titoli tolti dalla borsa o con i prezzi fermi (azioni/eventi_titoli.json): da togliere dall'elenco CSV.
  8) v9.13 fonti dell'ultimo aggiornamento (COT, FRED, BCE) non raggiunte: il sito usa i dati salvati;
  9) v9.13 report COT uscito ma non ancora nel sito (calendario CFTC con le festivita' USA);
 10) v9.13 riepilogo COT settimanale su Telegram non inviato (cursore notificati.json del ramo "storico").

REGISTRO ANOMALIE (v9.13, solo per il fondatore)
  Ogni giro scrive anomalie.json nel ramo "anomalie": anomalie aperte (da quando), chiuse (con durata), ultimi giri
  con esito OK/anomalie. Il terminale lo legge nel Profilo, sotto "Dati aggiornati", solo con l'account fondatore
  (web/js/14b_anomalie.js). Nessun dato personale: solo testi dei controlli.
  Nel fine settimana (e il lunedi' mattina) le soglie si allungano: le borse sono chiuse e i giri non partono.

COME AVVISA (v9.20 Ya: avvisi RISERVATI al fondatore, niente Telegram, nessun iscritto vede nulla)
  - EMAIL privata all'admin (Secrets SMTP_USER, SMTP_PASSWORD, ADMIN_EMAIL, gli stessi di notifiche.yml) solo quando
    compare un problema NUOVO rispetto al giro prima (registro anomalie precedente) e una quando tutto torna regolare;
  - se l'email non e' configurata o non parte, ripiego: issue GitHub come prima.
  (prima della v9.20) apre una "issue" su GitHub con l'etichetta "sorveglianza" (GitHub manda una mail e una notifica sull'app):
    una sola issue aperta alla volta; se cambiano i problemi aggiunge un commento, mai doppioni;
  - quando tutto torna a posto commenta "risolto" e la CHIUDE da sola;
  Nessuna chiave nel codice: il token di GitHub e' quello del workflow.

USO: python -m cot_radar.sorveglianza            (giro normale, nel workflow)
     python -m cot_radar.sorveglianza --prova    (stampa i problemi senza aprire issue)
"""
import json
import os
import smtplib
import ssl
from email.message import EmailMessage
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

# v7.59 nome del repository automatico (resta valido se viene rinominato)
REPO = os.environ.get("GITHUB_REPOSITORY") or "yahyaallouchi5-2025/cot-radar"
SITO = "https://" + REPO.split("/")[0] + ".github.io/" + REPO.split("/")[1] + "/"
LIVE = "https://raw.githubusercontent.com/" + REPO + "/live/live.json"
ORE_SITO = 30            # il sito si ricostruisce almeno 2 volte al giorno nei feriali
ORE_AZIONI = 30          # tre giri al giorno (Asia, Europa, USA)
ORE_FINE_SETTIMANA = 64  # venerdi' sera -> lunedi' mattina
MIN_LIVE = 75            # prezzi live: ogni 15 minuti a borsa aperta (GitHub puo' ritardare)
WORKFLOW = {"sito.yml": "Sito", "azioni.yml": "Azioni", "prezzi-live-continuo.yml": "Prezzi live", "test.yml": "Test",
            "orari.yml": "Orari", "pattern.yml": "Pattern",     # v7.66
            "controllo-visivo.yml": "Controllo visivo"}         # v9.24 difetti grafici (cot_radar/controllo_visivo.py)
ORARI = "https://raw.githubusercontent.com/" + REPO + "/orari/pubblico/indice.json"
ORE_ORARI = 54           # la stagionalita' oraria si ricalcola ogni notte (anche nel fine settimana)
MARGINE_ARCHIVIO = 11    # giorni: i cambi della Fed escono una volta a settimana (fino a 11 giorni di distanza)
ETICHETTA = "sorveglianza"
CURSORE_TG = "https://raw.githubusercontent.com/" + REPO + "/storico/segnali/notificati.json"   # v9.13 riepilogo COT
ORE_COT = 5              # v9.13 ore dopo l'uscita ufficiale del COT prima di dire "non ancora nel sito"
ORE_RIEPILOGO = 12       # v9.13 ore dopo l'uscita del COT entro cui deve partire il riepilogo Telegram (di notte attende)
GIRI_REG = 72            # v9.13 giri tenuti nel registro anomalie (3 giorni, uno all'ora)
CHIUSE_REG = 40          # v9.13 anomalie chiuse tenute nel registro
UA = {"User-Agent": "cot-radar/sorveglianza"}


# --------------------------------------------------------------------------- regole (pure, testate)
def soglia_ore(adesso, base):
    """Ore massime di "vecchiaia" accettate: base nei feriali, ORE_FINE_SETTIMANA da sabato a lunedi' alle 12 UTC."""
    wd = adesso.weekday()                      # 0 = lunedi'
    if wd >= 5 or (wd == 0 and adesso.hour < 12):
        return max(base, ORE_FINE_SETTIMANA)
    return base


def borsa_aperta(adesso, cal=None):
    """True se Xetra o Wall Street sono aperte da almeno 45 minuti (v7.25: con le festivita' del calendario, cosi'
    Natale o Thanksgiving non danno falsi allarmi sui prezzi live)."""
    from . import orari_borse as O
    prima = adesso - timedelta(minutes=45)
    return any(O.aperta(b, adesso, cal) and O.aperta(b, prima, cal) for b in ("XETRA", "US"))


def _ore(adesso, quando):
    return (adesso - quando).total_seconds() / 3600


def _roma(testo, formato):
    """v7.66 data e ora scritte in ORA ITALIANA (dalla v7.63 lo e' anche "creato" di stato.json; prima si leggeva
    come UTC e il sito sembrava 1-2 ore piu' fresco del vero) -> istante esatto, ora legale compresa."""
    from zoneinfo import ZoneInfo
    return datetime.strptime(testo, formato).replace(tzinfo=ZoneInfo("Europe/Rome"))


def archivio_fermo(adesso, archivio):
    """v7.66 serie dell'archivio FERME: [(file, ultima data)]. Una serie e' ferma se l'ultimo dato e' piu' vecchio di
    3 volte il suo passo tipico + MARGINE_ARCHIVIO giorni (giornaliera 14 giorni, settimanale 32, mensile ~100)."""
    out = []
    for nome, v in sorted((archivio or {}).items()):
        try:
            ultimo, passo = datetime.strptime(v[0], "%Y-%m-%d").date(), max(1, int(v[1]))
        except (TypeError, ValueError, IndexError):
            continue
        if (adesso.date() - ultimo).days > 3 * min(passo, 31) + MARGINE_ARCHIVIO:
            out.append((nome, v[0]))
    return out


def orari_cot(adesso, ultimo, tolleranza_ore=ORE_COT):
    """v9.13 calendario COT (calendario.weekly_schedule) calcolato all'istante `adesso` invece che all'ora del PC:
    data attesa, ritardo, ultima uscita reale (ora italiana)."""
    from . import calendario as C
    vero = C.utcnow
    C.utcnow = lambda: adesso.astimezone(timezone.utc).replace(tzinfo=None)
    try:
        return C.weekly_schedule(ultimo, 4, 15, 30, 3, tolleranza_ore=tolleranza_ore, sposta=C.uscita_cot)
    finally:
        C.utcnow = vero


def _gm(iso):
    """2026-11-17 -> 17/11"""
    return iso[8:10] + "/" + iso[5:7]


def problemi(adesso, stato=None, indice=None, live=None, giri=None, cal=None, eventi=None, archivio=None, orari=None,
             cursore=None):
    """Lista di frasi (in italiano) con cio' che non va. Vuota = tutto regolare.
    stato = stato.json del sito; indice = azioni/indice.json; live = live.json; giri = {nome: (conclusione, url)};
    cursore = notificati.json (v9.13, riepilogo COT su Telegram)."""
    out = []
    # 1) sito
    try:
        creato = _roma(stato["creato"], "%Y-%m-%d %H:%M:%S")
        h = _ore(adesso, creato)
        if h > soglia_ore(adesso, ORE_SITO):
            out.append("Sito non aggiornato da %d ore (ultima pubblicazione %s ora italiana)." % (h, stato["creato"][:16]))
        if stato.get("esito") in ("errori", "critico", "parziale"):   # v7.66 in pubblico gli errori sono "parziale"
            out.append("Ultimo aggiornamento del sito con esito \"%s\"." % stato["esito"])
    except (TypeError, KeyError, ValueError):
        out.append("stato.json del sito non leggibile: il sito potrebbe essere giu'.")
    # 8) v9.13 fonti non raggiunte nell'ultimo aggiornamento ("fred_riserva" = serie prese da fonti di riserva: va bene)
    for k, v in sorted(((stato or {}).get("fonti") or {}).items()):
        if k != "fred_riserva" and v != "online":
            out.append("Fonte %s non raggiunta nell'ultimo aggiornamento: in uso i dati salvati (%s)." % (k.upper(), v))
    # 9-10) v9.13 COT: report uscito ma non nel sito; riepilogo settimanale su Telegram non partito
    ultimo = (stato or {}).get("cot_ultimo")
    if ultimo:
        try:
            c = orari_cot(adesso, ultimo)
            if c["late"]:
                out.append("Report COT del %s (uscito %s) non ancora nel sito: ultimo dato del %s."
                           % (_gm(c["expected"]), c["last_pub"].strftime("%d/%m %H:%M"), _gm(ultimo)))
            elif cursore is not None:
                from zoneinfo import ZoneInfo
                ora_it = adesso.astimezone(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
                inviato = (cursore or {}).get("riepilogo_cot") or ""
                if inviato < ultimo and _ore(ora_it, c["last_pub"]) > ORE_RIEPILOGO:
                    out.append("Riepilogo COT del %s non inviato su Telegram (ultimo inviato: %s)."
                               % (_gm(ultimo), _gm(inviato) if inviato else "nessuno"))
        except (TypeError, ValueError, KeyError):
            out.append("Data dell'ultimo COT nel sito non leggibile (%s)." % ultimo)
    # 2) Azionario (ora italiana: si confronta con un margine di 2 ore, il fuso non conta a queste soglie)
    try:
        gen = _roma(indice["generato"], "%Y-%m-%d %H:%M")
        h = _ore(adesso, gen)
        if h > soglia_ore(adesso, ORE_AZIONI) + 2:
            out.append("Azionario non aggiornato da %d ore (ultimo giro %s ora italiana)." % (h, indice["generato"]))
        if indice.get("anomalia"):
            out.append("Azionario in anomalia (codice %s)." % (indice["anomalia"] or {}).get("codice", "?"))
    except (TypeError, KeyError, ValueError):
        out.append("azioni/indice.json non leggibile.")
    # 3) prezzi live (solo a borsa aperta)
    if borsa_aperta(adesso, cal):
        try:
            m = (adesso.timestamp() - float(live["quando"])) / 60
            if m > MIN_LIVE:
                out.append("Prezzi live fermi da %d minuti a borsa aperta." % m)
        except (TypeError, KeyError, ValueError):
            out.append("live.json non leggibile a borsa aperta.")
    # 4) workflow
    for nome, g in sorted((giri or {}).items()):
        concl, url, passo = (tuple(g) + (None, None, None))[:3]          # v9.31 terzo valore: passo fallito
        if concl in ("failure", "timed_out", "startup_failure"):
            out.append("Ultimo giro \"%s\" fallito%s: %s" % (nome, " al passo \"%s\"" % passo if passo else "", url))
    # 6) v7.66 archivio storico: serie che nessun giro aggiorna piu'
    fermi = archivio_fermo(adesso, archivio)
    if fermi:
        out.append("Archivio: %d serie ferme: %s." % (len(fermi), ", ".join("%s (ultimo dato %s)" % f for f in fermi[:12])
                                                      + (" e altre" if len(fermi) > 12 else "")))
    # 7) v7.66 stagionalita' oraria (ramo "orari"): ricalcolo notturno
    if orari is not None:
        try:
            h = _ore(adesso, _roma(orari["agg"], "%Y-%m-%d %H:%M"))
            if h > ORE_ORARI:
                out.append("Stagionalita' oraria non ricalcolata da %d ore (ultimo calcolo %s ora italiana)." % (h, orari["agg"]))
        except (TypeError, KeyError, ValueError):
            out.append("Indice della stagionalita' oraria non leggibile.")
    # 5) titoli da togliere dall'elenco (azioni_elenco.csv)
    ev = eventi or {}
    dl = sorted(ev.get("delistati") or {})
    if dl:
        out.append("Titoli tolti dalla borsa, da togliere da azioni_elenco.csv: %s."
                   % ", ".join("%s (%s)" % (t, (ev["delistati"][t] or {}).get("nome") or "?") for t in dl))
    fe = sorted(set(ev.get("fermi") or {}) - set(dl))
    if fe:
        out.append("Prezzi fermi da oltre una settimana (sospesi o delistati?): %s."
                   % ", ".join("%s dal %s" % (t, ev["fermi"][t]) for t in fe))
    return out


# --------------------------------------------------------------------------- registro anomalie (v9.13)
AREE = (("Sito", ("Sito ", "stato.json", "Ultimo aggiornamento del sito")), ("Fonti", ("Fonte ",)),
        ("COT", ("Report COT", "Data dell'ultimo COT")), ("Telegram", ("Riepilogo COT",)),
        ("Azionario", ("Azionario", "azioni/indice", "Titoli tolti", "Prezzi fermi da")),
        ("Prezzi live", ("Prezzi live", "live.json")), ("Workflow", ("Ultimo giro",)), ("Archivio", ("Archivio",)),
        ("Stagionalità", ("Stagionalita'", "Indice della stagionalita'")))


def area(testo):
    """Area del terminale a cui appartiene un problema (per il registro)."""
    for nome, inizi in AREE:
        if any(testo.startswith(i) for i in inizi):
            return nome
    return "Altro"


def chiave(testo):
    """Stessa anomalia anche se cambiano i numeri ("da 31 ore" -> "da 32 ore"): i numeri non contano."""
    import re
    return re.sub(r"\d+", "#", testo)


def aggiorna_registro(reg, prob, adesso):
    """Registro anomalie aggiornato con i problemi di questo giro (orari in ora italiana, "AAAA-MM-GG HH:MM").
    aperte = problemi ancora presenti (dal = prima volta visto); chiuse = risolti (al = primo giro regolare);
    giri = esito degli ultimi giri; ok_dal = da quando e' tutto regolare."""
    from zoneinfo import ZoneInfo
    ora = adesso.astimezone(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d %H:%M")
    reg = reg if isinstance(reg, dict) else {}
    prima = {a.get("k"): a for a in reg.get("aperte") or [] if isinstance(a, dict)}
    aperte = []
    for p in prob:
        k = chiave(p)
        a = prima.pop(k, None) or {"k": k, "area": area(p), "dal": ora}
        a.update(testo=p, visto=ora)
        aperte.append(a)
    chiuse = [dict(a, al=ora) for a in prima.values()] + [c for c in reg.get("chiuse") or [] if isinstance(c, dict)]
    giri = [{"t": ora, "n": len(prob)}] + [g for g in reg.get("giri") or [] if isinstance(g, dict)]
    ok_dal = None if prob else (reg.get("ok_dal") if reg.get("esito") == "ok" and reg.get("ok_dal") else ora)
    return {"v": 1, "agg": ora, "esito": "anomalie" if prob else "ok", "ok_dal": ok_dal,
            "aperte": aperte, "chiuse": chiuse[:CHIUSE_REG], "giri": giri[:GIRI_REG]}


def scrivi_registro(reg, cartella):
    os.makedirs(cartella, exist_ok=True)
    with open(os.path.join(cartella, "anomalie.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(reg, f, ensure_ascii=False, indent=1)
        f.write("\n")


def leggi_json(percorso):
    try:
        with open(percorso, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def testo_issue(prob, adesso):
    righe = "\n".join("- " + p for p in prob)
    return ("Controllo automatico del %s UTC.\n\n%s\n\nLa issue si chiude da sola quando tutto torna regolare."
            % (adesso.strftime("%Y-%m-%d %H:%M"), righe))


# --------------------------------------------------------------------------- rete
def _json(url, token=None, metodo="GET", corpo=None):
    h = dict(UA)
    if token:
        h.update({"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"})
    dati = json.dumps(corpo).encode() if corpo is not None else None
    if dati:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=dati, headers=h, method=metodo)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def _prova(fn):
    try:
        return fn()
    except Exception:
        return None


def giri_workflow(token):
    """{nome: (conclusione, url, passo)} dell'ultimo giro CONCLUSO di ogni workflow sorvegliato.
    v9.31 passo = nome del primo passo fallito (None se il giro e' andato bene): la diagnosi arriva gia' nell'email."""
    out = {}
    for f, nome in WORKFLOW.items():
        js = _prova(lambda: _json("https://api.github.com/repos/%s/actions/workflows/%s/runs?status=completed&per_page=1"
                                  % (REPO, f), token))
        runs = (js or {}).get("workflow_runs") or []
        if runs:
            r, passo = runs[0], None
            if r.get("conclusion") in ("failure", "timed_out") and r.get("jobs_url"):
                jobs = (_prova(lambda: _json(r["jobs_url"], token)) or {}).get("jobs") or []
                passo = next((st.get("name") for j in jobs for st in j.get("steps") or []
                              if st.get("conclusion") in ("failure", "timed_out")), None)
            out[nome] = (r.get("conclusion"), r.get("html_url"), passo)
    return out


# --------------------------------------------------------------------------- v9.31 RIPARAZIONE AUTOMATICA
# Idea di Ya (25/11/2026): "anomalie praticamente ogni giorno". Le due piu' frequenti sono guasti passeggeri di GitHub:
#   - il ciclo dei prezzi live si ferma (GitHub non avvia la partenza programmata) -> si riavvia da solo;
#   - un giro fallisce per un errore di rete o di un fornitore -> si avvia UNA volta un giro nuovo sul codice attuale.
# L'email parte solo se il problema e' ancora li' al controllo dopo (un'ora): niente email per i guasti che si
# riparano da soli. Le riparazioni restano scritte nel registro (campo "azioni"), visibile solo al fondatore.
ORE_TRA_RIAVVII = 2      # il ciclo live si riavvia al massimo una volta ogni 2 ore (mai a raffica)
GIORNI_MEMORIA = 3       # dopo 3 giorni si dimenticano le riparazioni fatte


def riparabile(testo):
    """True se la sorveglianza prova a riparare da sola questo problema."""
    return testo.startswith("Prezzi live fermi") or testo.startswith("Ultimo giro \"")


def _api(url, token, corpo):
    """POST all'API di GitHub che risponde senza contenuto (204/201). True se accettata."""
    h = dict(UA, Authorization="Bearer " + token, Accept="application/vnd.github+json")
    h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=json.dumps(corpo or {}).encode(), headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return 200 <= r.status < 300
    except Exception as e:
        print("riparazione non accettata (%s)" % type(e).__name__)
        return False


def ripara(prob, prec, adesso, token, chiama=None):
    """Prova a riparare i problemi riparabili. -> (memoria aggiornata, elenco delle azioni fatte in questo giro).
    memoria = {"live": iso dell'ultimo riavvio, "run_<id>": iso del rilancio}; chiama = funzione per i test."""
    import re
    chiama = chiama or _api
    mem = {k: v for k, v in ((prec or {}).get("riparazioni") or {}).items()
           if isinstance(v, str) and _eta_ore(adesso, v) < GIORNI_MEMORIA * 24}
    azioni, ora = [], adesso.strftime("%Y-%m-%dT%H:%M:%SZ")
    base = "https://api.github.com/repos/%s/actions/" % REPO
    for p in prob:
        if p.startswith("Prezzi live fermi"):
            if "live" in mem and _eta_ore(adesso, mem["live"]) < ORE_TRA_RIAVVII:
                continue
            if token and chiama(base + "workflows/prezzi-live-continuo.yml/dispatches", token, {"ref": "main"}):
                mem["live"] = ora
                azioni.append("Prezzi live: ciclo riavviato in automatico.")
        # v9.31b si avvia un giro NUOVO sul codice piu' recente (non si rifa' il giro vecchio: il 25/11 il rilancio
        # del "Test" fallito ripeteva il codice di prima della correzione e falliva di nuovo)
        m = re.match(r'Ultimo giro "(.+?)" fallito.*?/runs/(\d+)', p)
        file = next((f for f, n in WORKFLOW.items() if m and n == m.group(1)), None)
        if m and file and "run_" + m.group(2) not in mem:
            if token and chiama(base + "workflows/%s/dispatches" % file, token, {"ref": "main"}):
                mem["run_" + m.group(2)] = ora
                azioni.append("%s: nuovo giro avviato in automatico." % m.group(1))
    return mem, azioni


def _eta_ore(adesso, iso):
    try:
        return (adesso - datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).total_seconds() / 3600
    except ValueError:
        return 1e9


def telegram(testo, env):
    """v9.20 (Ya) disattivato: gli avvisi della sorveglianza non vanno su Telegram (vedi email_admin)."""
    return None


def email_admin(oggetto, testo, env):
    """v9.20 email privata al fondatore. True = inviata, None = non configurata, False = errore (si ripiega sulla issue)."""
    utente, password, dest = env.get("SMTP_USER"), env.get("SMTP_PASSWORD"), env.get("ADMIN_EMAIL")
    if not (utente and password and dest):
        return None
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = oggetto, utente, dest
    msg.set_content(testo + "\n\nRegistro completo: terminale, account fondatore, riga \"Registro anomalie\".")
    try:
        with smtplib.SMTP_SSL(env.get("SMTP_HOST", "smtp.gmail.com"), int(env.get("SMTP_PORT", "465")),
                              context=ssl.create_default_context(), timeout=30) as srv:
            srv.login(utente, password)
            srv.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as e:
        print("email all'admin non inviata (%s)" % type(e).__name__)
        return False


def avvisa_email(prec, prob, adesso, env, invia=None, azioni=()):
    """Decide l'email al fondatore. -> (esito, avvisate): esito True/False/None come email_admin (None = nessuna
    email); avvisate = chiavi dei problemi gia' segnalati (si salvano nel registro: mai due email per lo stesso).
    v9.31: un problema riparabile (prezzi live, giro fallito) si segnala solo se c'era gia' al controllo prima,
    cioe' se la riparazione automatica non e' bastata. L'email "tutto regolare" parte solo dopo un avviso.
    invia = funzione per i test; azioni = riparazioni fatte in questo giro (scritte nell'email)."""
    invia = invia or email_admin
    prec = prec or {}
    prima = {a.get("k") for a in prec.get("aperte") or [] if isinstance(a, dict)}
    gia = {k for k in prec.get("avvisate") or [] if isinstance(k, str)}
    ora_k = {chiave(p) for p in prob}
    from zoneinfo import ZoneInfo
    ora = adesso.astimezone(ZoneInfo("Europe/Rome")).strftime("%d/%m %H:%M")
    nuovi = [p for p in prob if chiave(p) not in gia and (not riparabile(p) or chiave(p) in prima)]
    if nuovi:
        corpo = "Controllo automatico delle %s (ora italiana).\n\n- " % ora + "\n- ".join(prob)
        if azioni:
            corpo += "\n\nRiparazioni automatiche tentate:\n- " + "\n- ".join(azioni)
        esito = invia("EdgeValor: anomalia (%s)" % ora, corpo, env)
        return esito, sorted((gia | {chiave(p) for p in nuovi}) & ora_k)
    if not prob and gia:
        return invia("EdgeValor: tutto di nuovo regolare (%s)" % ora, "Tutto di nuovo regolare dalle %s." % ora, env), []
    return None, sorted(gia & ora_k)


def avvisa(prob, adesso, token, env):
    """Apre/aggiorna/chiude l'unica issue "sorveglianza"."""
    api = "https://api.github.com/repos/%s/issues" % REPO
    aperte = _json(api + "?state=open&labels=" + ETICHETTA, token) or []
    issue = aperte[0] if aperte else None
    if prob:
        corpo = testo_issue(prob, adesso)
        if issue is None:
            _json(api, token, "POST", {"title": "Sorveglianza: qualcosa si e' fermato", "body": corpo,
                                       "labels": [ETICHETTA]})
            telegram("\n".join(prob), env)
        else:
            ultimo = _json(issue["comments_url"], token) or []
            precedente = (ultimo[-1]["body"] if ultimo else issue.get("body") or "")
            if any(p not in precedente for p in prob):        # problemi nuovi: commento + Telegram
                _json(issue["comments_url"], token, "POST", {"body": corpo})
                telegram("\n".join(prob), env)
    elif issue is not None:
        _json(issue["comments_url"], token, "POST", {"body": "Tutto di nuovo regolare (%s UTC). Chiudo."
                                                              % adesso.strftime("%Y-%m-%d %H:%M")})
        _json(issue["url"], token, "PATCH", {"state": "closed"})
        telegram("Tutto di nuovo regolare.", env)


def main(argv):
    adesso = datetime.now(timezone.utc)
    env = os.environ
    token = env.get("GITHUB_TOKEN")
    stato = _prova(lambda: _json(SITO + "stato.json?t=%d" % adesso.timestamp()))
    indice = _prova(lambda: _json(SITO + "azioni/indice.json?t=%d" % adesso.timestamp()))
    live = _prova(lambda: _json(LIVE))
    eventi = _prova(lambda: _json(SITO + "azioni/eventi_titoli.json?t=%d" % adesso.timestamp()))
    giri = giri_workflow(token) if token else {}
    from . import orari_borse
    archivio = _prova(lambda: _json(SITO + "archivio.json?t=%d" % adesso.timestamp()))
    orari = _prova(lambda: _json(ORARI)) or {}
    cursore = _prova(lambda: _json(CURSORE_TG))
    prob = problemi(adesso, stato, indice, live, giri, orari_borse.leggi_remoto(), eventi, archivio, orari, cursore)
    print("\n".join(prob) if prob else "Tutto regolare.")
    prec = leggi_json(env.get("ANOMALIE_PREC") or "") or {}
    reg = aggiorna_registro(prec, prob, adesso)
    mem, azioni, avvisate = prec.get("riparazioni") or {}, [], prec.get("avvisate") or []
    if "--prova" not in argv:
        # v9.31 prima si prova a riparare da soli, poi si decide se scrivere al fondatore
        mem, azioni = ripara(prob, prec, adesso, token)
        # v9.20 email privata; la issue GitHub solo se l'email non e' configurata o non parte
        esito, avvisate = avvisa_email(prec, prob, adesso, env, azioni=azioni)
        configurata = env.get("SMTP_USER") and env.get("SMTP_PASSWORD") and env.get("ADMIN_EMAIL")
        if token and (not configurata or esito is False):
            avvisa(prob, adesso, token, env)
    # v9.13 registro anomalie: il workflow mette il file precedente in ANOMALIE_PREC e pubblica ANOMALIE_OUT
    from zoneinfo import ZoneInfo
    quando = adesso.astimezone(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d %H:%M")
    reg.update(riparazioni=mem, avvisate=avvisate,
               azioni=([{"t": quando, "testo": a} for a in azioni] + [x for x in prec.get("azioni") or [] if isinstance(x, dict)])[:30])
    uscita = env.get("ANOMALIE_OUT")
    if uscita:
        scrivi_registro(reg, uscita)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
