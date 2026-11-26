# -*- coding: utf-8 -*-
"""
social_img.py - v9.40 IMMAGINE DI ANTEPRIMA DEL SITO (og:image, 1200 x 630) per Google, WhatsApp, Telegram, LinkedIn...
Quando qualcuno condivide edgevalor.com, al posto di un riquadro vuoto compare questa card con il marchio EdgeValor,
nello stile delle card del sito (fondo scuro, luci colorate sfocate, grana leggera). Parte del lavoro "brand su Google":
un marchio riconoscibile ovunque appaia il link.
USO: python -m cot_radar.social_img   -> out_social/anteprima.jpg   (sul sito: edgevalor.com/anteprima.jpg, da vetrina.crea)
"""
import os

from PIL import Image, ImageDraw

from . import email_campagne_img as E

W, H = 1200, 630
COLORI = ("#2ec4b6", "#3d7bff", "#8b5cf6")     # turchese del marchio, blu, viola (come le luci della home)


def _font(nome, s):
    """Inter Display se c'e', altrimenti Inter (stessa regola di email_campagne_img)."""
    from PIL import ImageFont
    for n in (nome, nome.replace("InterDisplay", "Inter")):
        if os.path.exists(E.FONT + n):
            return ImageFont.truetype(E.FONT + n, s)
    raise FileNotFoundError("font Inter mancante")


def crea(cartella="out_social"):
    """Disegna la card e la salva come cartella/anteprima.jpg (JPEG leggero: ~80 KB)."""
    vecchie = (E.W, E.H)
    E.W, E.H = W, H                      # le luci e la grana di email_campagne_img lavorano su E.W x E.H
    try:
        img = E.grana(E.luci(Image.new("RGB", (W, H), (4, 8, 18)), COLORI), forza=8)
    finally:
        E.W, E.H = vecchie
    d = ImageDraw.Draw(img)
    # barra luminosa del logo (come nella favicon) a sinistra del marchio
    d.rounded_rectangle((132, 214, 146, 330), radius=7, fill=E.rgb(COLORI[0]))
    # marchio: "Edge" bianco + "Valor" turchese, come nel terminale
    f = _font("InterDisplay-Black.otf", 128)
    x, y = 178, 272
    d.text((x, y), "Edge", font=f, fill=(244, 247, 252), anchor="lm")
    w = d.textlength("Edge", font=f)
    d.text((x + w, y), "Valor", font=f, fill=E.rgb(COLORI[0]), anchor="lm")
    # sottotitolo e argomenti
    d.text((134, 392), "Terminale di analisi dei mercati", font=_font("Inter-SemiBold.otf", 44), fill=(226, 232, 242), anchor="lm")
    d.text((134, 462), "COT  ·  Stagionalità  ·  Macro  ·  Azionario  ·  Portafogli modello",
           font=_font("Inter-Medium.otf", 28), fill=(160, 176, 200), anchor="lm")
    d.text((134, 540), "edgevalor.com", font=_font("Inter-SemiBold.otf", 28), fill=E.rgb(COLORI[0]), anchor="lm")
    os.makedirs(cartella, exist_ok=True)
    p = os.path.join(cartella, "anteprima.jpg")
    img.save(p, quality=86, optimize=True, progressive=True)
    return p


if __name__ == "__main__":
    print(crea())
