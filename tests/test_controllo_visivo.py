"""v9.24 controllo visivo: su una pagina con difetti voluti deve trovarli tutti, su una pagina pulita nessuno.
Si salta se nell'ambiente non c'e' un browser (Playwright/Chromium)."""
import os
import tempfile
import unittest

from cot_radar import controllo_visivo as cv

BRUTTA = """<!doctype html><html><head><meta name=viewport content="width=device-width"><style>
.card{position:relative;width:300px;height:80px;border:1px solid #333}
.a{position:absolute;top:10px;left:10px}.b{position:absolute;top:12px;left:14px}
.largo{width:900px;height:10px}
.gira{width:200px;height:200px;animation:ombra 2s infinite}@keyframes ombra{50%{filter:blur(3px)}}
.ok{width:200px;height:200px;animation:muovi 2s infinite}@keyframes muovi{50%{transform:translateX(10px)}}
</style></head><body><div class=card><span class=a>Ha fatto</span><span class=b>Doveva</span></div>
<div class=largo></div><div class=gira>x</div><div class=ok>y</div><details><summary>Domanda</summary><p>Risposta chiusa</p></details>
<script>null.x</script></body></html>"""

PULITA = """<!doctype html><html><head><meta name=viewport content="width=device-width"></head><body>
<div class=card><b>Titolo</b> <span>testo accanto che va a capo piu' volte su uno schermo stretto, senza coprire nulla</span></div>
</body></html>"""


def browser_ok():
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            pw.chromium.launch().close()
        return True
    except Exception:
        return False


@unittest.skipUnless(browser_ok(), "browser non disponibile")
class ControlloVisivo(unittest.TestCase):
    def pagina(self, html):
        f = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
        f.write(html)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return [("Prova", "file://" + f.name)]

    def test_trova_i_difetti(self):
        prob = "\n".join(cv.controlla(self.pagina(BRUTTA), cv.SCHERMI[1:]))
        self.assertIn("testi sovrapposti", prob)
        self.assertIn("pagina larga", prob)
        self.assertIn("filter", prob)
        self.assertIn("errore JavaScript", prob)
        self.assertNotIn("muovi", prob)                  # solo transform: va bene
        self.assertNotIn("Risposta chiusa", prob)        # testo dentro una domanda chiusa: non si vede

    def test_pagina_pulita(self):
        self.assertEqual(cv.controlla(self.pagina(PULITA)), [])


if __name__ == "__main__":
    unittest.main()
