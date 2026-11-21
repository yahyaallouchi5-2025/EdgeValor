# -*- coding: utf-8 -*-
"""v8.54 controllo di stile.css: parentesi graffe bilanciate. Una graffa in piu' (successo in v8.52) fa ignorare
al browser la regola che segue, senza nessun errore visibile: questo test lo blocca prima della pubblicazione."""
import os
import re
import unittest

CSS = os.path.join(os.path.dirname(__file__), "..", "web", "stile.css")


class TestStileCss(unittest.TestCase):
    def test_graffe_bilanciate(self):
        with open(CSS, encoding="utf-8") as f:
            s = re.sub(r"/\*.*?\*/", "", f.read(), flags=re.S)      # i commenti non contano
        livello = 0
        for n, riga in enumerate(s.split("\n"), 1):
            for c in riga:
                livello += (c == "{") - (c == "}")
                self.assertGreaterEqual(livello, 0, f"graffa chiusa in piu' (circa riga {n}, commenti esclusi)")
        self.assertEqual(livello, 0, "graffe aperte e non chiuse")


if __name__ == "__main__":
    unittest.main()
