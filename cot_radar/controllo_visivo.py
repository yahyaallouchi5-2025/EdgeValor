# -*- coding: utf-8 -*-
"""
controllo_visivo.py - v9.24 CONTROLLI VISIVI AUTOMATICI (idea di Ya: "il registro anomalie dovrebbe vedere anche lo
sfarfallio"). Il registro anomalie (sorveglianza.py) controlla dati e giri; questo controlla COME SI VEDE il sito.

COSA FA (workflow controllo-visivo.yml, ogni giorno e a mano)
  Apre con un browser vero (Playwright, Chromium) la home, la pagina Prezzi e il terminale, su PC (1366x900) e su
  telefono (390x844), e in ogni scheda del terminale cerca:
    1) ERRORI JavaScript della pagina;
    2) PAGINA PIU' LARGA DELLO SCHERMO (scorrimento orizzontale, tipico difetto da telefono);
    3) TESTI SOVRAPPOSTI: due testi visibili nella stessa card che si coprono (colonne disallineate, etichette
       una sopra l'altra);
    4) RISCHIO SFARFALLIO: animazioni infinite che non usano solo transform/opacity (filtri, ombre, bordi, colori
       animati costringono il browser a ridisegnare: e' la causa dello sfarfallio della card Black Friday, v9.19);
    5) v9.78 DATI MANCANTI: ogni "n/d" visibile (un dato che non e' arrivato), con il titolo della card.
  Se trova qualcosa il giro FALLISCE: la sorveglianza (ogni ora) lo vede tra i giri falliti e manda l'email privata
  al fondatore; l'elenco dei problemi e' nel riepilogo del giro su GitHub (Actions -> Controllo visivo).
  Nessun utente vede nulla.

USO: python -m cot_radar.controllo_visivo                 (sito pubblico)
     python -m cot_radar.controllo_visivo URL_TERMINALE    (es. una pagina locale di prova)
"""
import json
import os
import sys

SITO = "https://edgevalor.com/"
PAGINE = [("Home", SITO), ("Prezzi", SITO + "prezzi/"), ("Terminale", SITO + "terminale/")]
SCHERMI = [("PC", {"viewport": {"width": 1366, "height": 900}}),
           ("Telefono", {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True,
                         "device_scale_factor": 2})]
# proprieta' che si possono animare senza ridisegnare la pagina (il resto, in un'animazione infinita, fa sfarfallare)
ANIM_OK = {"transform", "opacity", "offset", "easing", "composite", "computedOffset", "translate", "scale", "rotate"}

# localStorage di partenza: niente finestre di benvenuto/consenso/campagna che coprono la pagina durante il controllo
PREPARA = """(()=>{try{const d=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome"}).format(new Date());
 localStorage.setItem("eb_consenso",JSON.stringify({versione:"9999",data:"controllo"}));localStorage.setItem("ebGuidaHub","1");
 localStorage.setItem("ebBF",JSON.stringify({auto:d,chiusa:d,inter:Date.now()}));}catch(e){}})();"""

# il controllo vero e proprio, eseguito dentro la pagina: restituisce un elenco di problemi (stringhe brevi)
CONTROLLO = r"""(dove)=>{const out=[],W=innerWidth;
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return null;const s=getComputedStyle(e);
  if(s.visibility=="hidden"||+s.opacity<.05)return null;return r;};
 // 2) pagina piu' larga dello schermo
 const larga=Math.max(document.documentElement.scrollWidth,innerWidth),SW=Math.min(W,screen.width||W);if(larga>SW+2)out.push(`pagina larga ${larga}px su uno schermo di ${SW}px`);
 // 3) testi sovrapposti: si misura il TESTO vero (Range sul nodo di testo), non il riquadro dell'elemento, e si scarta
 //    il testo nascosto da un contenitore con overflow (es. risposte delle FAQ chiuse)
 // faccia nascosta di una card che si gira (backface-visibility hidden e girata di piu' di 90 gradi): non si vede
 const girata=e=>{let giri=0,faccia=null;for(let a=e;a&&a!=document.body;a=a.parentElement){const s=getComputedStyle(a);
   if(s.transform&&s.transform!="none"&&new DOMMatrix(s.transform).m11<0)giri++;if(!faccia&&s.backfaceVisibility=="hidden")faccia={giri};}
  return faccia&&(giri%2==1);};
 const taglio=(e,r)=>{if(girata(e))return null;for(let a=e.parentElement;a&&a!=document.body;a=a.parentElement){const s=getComputedStyle(a);
   if(s.display=="none"||+s.opacity<.05)return null;if(s.overflow!="visible"||s.overflowY!="visible"||s.overflowX!="visible"){const q=a.getBoundingClientRect();
    const l=Math.max(r.left,q.left),t=Math.max(r.top,q.top),rr=Math.min(r.right,q.right),b=Math.min(r.bottom,q.bottom);
    if(rr-l<2||b-t<2)return null;r={left:l,top:t,right:rr,bottom:b,width:rr-l,height:b-t};}}return r;};
 const testi=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let tn;
 while(tn=tw.nextNode()){if(tn.nodeValue.trim().length<2)continue;const e=tn.parentElement;
  if(!e||e.closest("svg,script,style,[aria-hidden=true],.spiega")||!vis(e))continue;
  const det=e.closest("details:not([open])");if(det&&!e.closest("summary"))continue;   // risposta chiusa: non si vede
  // un rettangolo per ogni RIGA del testo (un testo che va a capo non "copre" il testo accanto)
  const rg=document.createRange();rg.selectNodeContents(tn);
  for(let r of rg.getClientRects()){if(r.width<2||r.height<2)continue;r=taglio(e,r);if(!r||r.right<=0||r.left>=W)continue;
   testi.push([tn,r,tn.nodeValue.trim()]);}}
 const gruppi=new Map();for(const x of testi){const c=x[0].parentElement.closest(".card,.fc,table,section,header,footer")||document.body;
  if(!gruppi.has(c))gruppi.set(c,[]);gruppi.get(c).push(x);}
 let n=0;for(const g of gruppi.values()){for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const [a,A]=g[i],[b,B]=g[j];
  if(a==b)continue;   // due righe dello stesso testo
  const x=Math.min(A.right,B.right)-Math.max(A.left,B.left),y=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
  if(x>3&&y>3&&x*y>.3*Math.min(A.width*A.height,B.width*B.height)&&n++<6)
   out.push(`testi sovrapposti: "${g[i][2].slice(0,30)}" e "${g[j][2].slice(0,30)}"`);}}
 // 4) rischio sfarfallio: animazioni infinite che non usano solo transform/opacity
 const visti=new Set();for(const an of document.getAnimations()){const t=an.effect&&an.effect.getTiming?an.effect.getTiming():{};
  if(t.iterations!==Infinity||an.playState!="running")continue;const el=an.effect.target;if(!el||!vis(el))continue;
  const kf=an.effect.getKeyframes?an.effect.getKeyframes():[];const pr=new Set();kf.forEach(k=>Object.keys(k).forEach(p=>{if(!/^(offset|easing|composite|computedOffset)$/.test(p))pr.add(p);}));
  const male=[...pr].filter(p=>!/^(transform|opacity|translate|scale|rotate)$/.test(p));
  // pallini che pulsano (ombra o colore su elementi piccoli): ridisegno minimo, non fanno sfarfallare la pagina
  const ps=an.effect.pseudoElement,cs=ps?getComputedStyle(el,ps):null,rr=el.getBoundingClientRect();
  const area=ps?(parseFloat(cs.width)||0)*(parseFloat(cs.height)||0):rr.width*rr.height;
  if(area<2500&&male.every(p=>/^(boxShadow|backgroundColor|color)$/.test(p)))continue;
  const nome=(an.animationName||an.id||"animazione")+":"+male.join(",");
  if(male.length&&!visti.has(nome)){visti.add(nome);out.push(`animazione infinita che ridisegna (${male.join(", ")}): ${an.animationName||"senza nome"} su ${el.className&&el.className.baseVal===undefined?String(el.className).split(" ")[0]:el.tagName}`);}}
 // 5) v9.78 (Ya, 28/11/2026: "non voglio piu' vedere n/d in nessun dato, nessuna scheda: al massimo mi arriva
 //    l'anomalia") ogni "n/d" visibile e' un dato che non e' arrivato: si segnala con il titolo della card
 const nd=new Map();for(const [tn,r,t] of testi){if(!/(^|[^a-z])n\/d([^a-z]|$)/i.test(t))continue;const c=tn.parentElement.closest(".card,section,table,.fc,[class*=card]")||document.body;
  const ti=(c.querySelector("h2,h3,h4,.titolo,summary")||{}).textContent||"";const k=(ti.trim().replace(/\s+/g," ").slice(0,40)||c.id||c.className||"pagina");
  nd.set(k,(nd.get(k)||0)+1);}
 for(const [k,v] of nd)out.push(`dato mancante "n/d" (${v}) in: ${k}`);
 return out.map(p=>dove+": "+p);}"""


def controlla(pagine=PAGINE, schermi=SCHERMI):
    """Apre ogni pagina su ogni schermo e restituisce l'elenco dei problemi trovati."""
    from playwright.sync_api import sync_playwright
    problemi = []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for nome_s, opz in schermi:
            for nome_p, url in pagine:
                ctx = br.new_context(timezone_id="Europe/Rome", locale="it-IT", **opz)
                ctx.add_init_script(PREPARA)
                pg = ctx.new_page()
                errori = []
                pg.on("pageerror", lambda e, errori=errori: errori.append(str(e)[:160]))
                try:
                    pg.goto(url, wait_until="networkidle", timeout=60000)
                except Exception as e:                              # la pagina non si apre: lo dice gia' la sorveglianza
                    problemi.append("%s %s: pagina non aperta (%s)" % (nome_p, nome_s, type(e).__name__))
                    ctx.close()
                    continue
                pg.wait_for_timeout(2500)
                dove = "%s %s" % (nome_p, nome_s)
                problemi += pg.evaluate(CONTROLLO, dove)
                # nel terminale si controlla ogni scheda (si mostrano una alla volta, come fa il menu)
                if nome_p == "Terminale":
                    for sid in pg.evaluate("[...document.querySelectorAll('main section[id], section[id]')].map(s=>s.id)"):
                        pg.evaluate("id=>document.querySelectorAll('section[id]').forEach(s=>s.style.display=s.id==id?'block':'none')", sid)
                        pg.wait_for_timeout(400)
                        problemi += pg.evaluate(CONTROLLO, "%s %s, scheda %s" % (nome_p, nome_s, sid))
                problemi += ["%s: errore JavaScript: %s" % (dove, e) for e in errori[:3]]
                ctx.close()
        br.close()
    # niente doppioni (lo stesso difetto si ripete spesso in piu' schede)
    visti, out = set(), []
    for p in problemi:
        if p not in visti:
            visti.add(p)
            out.append(p)
    return out


def main(argv):
    pagine = PAGINE if len(argv) < 2 else [("Terminale", argv[1])]
    prob = controlla(pagine)
    testo = "\n".join("- " + p for p in prob) if prob else "Nessun difetto visivo trovato."
    print(testo)
    riep = os.environ.get("GITHUB_STEP_SUMMARY")
    if riep:
        with open(riep, "a", encoding="utf-8") as f:
            f.write("## Controllo visivo\n\n" + testo + "\n")
    out = os.environ.get("VISIVO_OUT")
    if out:
        with open(out, "w", encoding="utf-8") as f:
            json.dump(prob, f, ensure_ascii=False, indent=1)
    return 1 if prob else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
