# -*- coding: utf-8 -*-
"""
email_campagne_img.py - v9.25 IMMAGINE DI TESTA delle email delle campagne (Black Friday, Cyber Monday, Pasqua,
saldi d'estate e d'inverno), con lo stesso design delle card del sito: fondo nero, luci colorate sfocate (i colori della
campagna, come .bfluci in stile.css), grana leggera e il titolo grande.
Le email non sanno animare le luci (e Gmail scuro rovescia i colori): per questo la parte "di design" e' un'immagine
PNG allegata in linea (cid:testa), come fa TradingView nelle sue email. Il resto dell'email e' testo vero.
USO: python -m cot_radar.email_campagne_img black   -> out_email/testa_black.jpg (e cyber, pasqua, estate, inverno)
"""
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "/usr/share/fonts/opentype/inter/"    # pacchetto Debian/Ubuntu fonts-inter (nel workflow sito.yml)
COLORI = {"black": ("#ff8a00", "#ff2e7e", "#8b5cf6"), "cyber": ("#00e5ff", "#3d7bff", "#b14bff"),
          "inverno": ("#7dd3fc", "#818cf8", "#e0f2fe"), "pasqua": ("#34d399", "#f472b6", "#fde047"),
          "estate": ("#fde047", "#fb923c", "#f43f5e")}            # stessi colori di campagne.py / stile.css
TESTI = {   # titolo, riga sotto il titolo, numero grande, riga finale
    "black": ("Black Friday", "BLOCCA LA TARIFFA ADESSO", "−20%", "Premium annuale a 19,99 € al mese"),
    "cyber": ("Cyber Monday", "ULTIMO GIORNO", "−20%", "Premium annuale a 19,99 € al mese"),
    "pasqua": ("Offerta di Pasqua", "SOLO PER POCHI GIORNI", "−20%", "Premium annuale il primo anno"),
    "estate": ("Saldi d'estate", "SOLO PER POCHI GIORNI", "−20%", "Premium annuale il primo anno"),
    "inverno": ("Saldi d'inverno", "SOLO PER POCHI GIORNI", "−20%", "Premium annuale il primo anno"),
}
W, H = 1200, 960                       # 2x per gli schermi nitidi (in email si mostra a 600 x 480)


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luci(img, colori):
    """Tre sfere di luce molto sfocate (come .bfluci del sito), su fondo nero."""
    strato = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(strato)
    pos = [(0.12, 0.10, 0.55), (0.88, 0.42, 0.60), (0.35, 0.95, 0.50)]   # centro x, centro y, raggio (in % della larghezza)
    for (cx, cy, r), c in zip(pos, colori):
        R = int(W * r * 0.5)
        x, y = int(W * cx), int(H * cy)
        d.ellipse((x - R, y - R, x + R, y + R), fill=rgb(c))
    strato = strato.filter(ImageFilter.GaussianBlur(150))
    return Image.blend(img, strato, 0.55)


def grana(img, forza=10):
    """Grana leggera (come .bfgrana): rende la luce piu' "materica" e meno piatta."""
    random.seed(7)
    px = img.load()
    for _ in range(W * H // 6):
        x, y = random.randrange(W), random.randrange(H)
        r, g, b = px[x, y]
        n = random.randint(-forza, forza)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def testo_sfumato(img, xy, testo, font, c1, c2):
    """Testo con sfumatura orizzontale c1 -> c2 (titolo della campagna)."""
    d = ImageDraw.Draw(img)
    box = d.textbbox(xy, testo, font=font, anchor="mm")
    w, h = box[2] - box[0], box[3] - box[1]
    sf = Image.new("RGB", (w, h))
    a, b = rgb(c1), rgb(c2)
    for i in range(w):
        t = i / max(1, w - 1)
        ImageDraw.Draw(sf).line([(i, 0), (i, h)], fill=tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3)))
    maschera = Image.new("L", img.size, 0)
    ImageDraw.Draw(maschera).text(xy, testo, font=font, fill=255, anchor="mm")
    pieno = Image.new("RGB", img.size)
    pieno.paste(sf, (box[0], box[1]))
    img.paste(pieno, (0, 0), maschera)


def crea(k, cartella="out_email"):
    c1, c2, c3 = COLORI[k]
    tit, sopra, num, sotto = TESTI[k]
    img = grana(luci(Image.new("RGB", (W, H), (0, 0, 0)), (c1, c2, c3)))
    d = ImageDraw.Draw(img)
    def F(nome, s):   # Inter Display se c'e', altrimenti Inter (versioni vecchie del pacchetto)
        for n in (nome, nome.replace("InterDisplay", "Inter")):
            if os.path.exists(FONT + n):
                return ImageFont.truetype(FONT + n, s)
        raise FileNotFoundError("font Inter mancante")
    testo_sfumato(img, (W // 2, 250), tit, F("InterDisplay-Black.otf", 132), c1, c2)
    d.text((W // 2, 370), sopra, font=F("Inter-SemiBold.otf", 40), fill=(240, 240, 240), anchor="mm")
    d.text((W // 2, 580), num, font=F("InterDisplay-Black.otf", 250), fill=(245, 245, 245), anchor="mm")
    d.text((W // 2, 790), sotto, font=F("Inter-SemiBold.otf", 46), fill=rgb(c1), anchor="mm")
    os.makedirs(cartella, exist_ok=True)
    p = os.path.join(cartella, "testa_%s.jpg" % k)          # JPEG ~110 KB (il PNG pesava 780 KB: troppo per un'email)
    img.save(p, quality=84, optimize=True, progressive=True)
    return p


def crea_tutte(cartella):
    """Per il sito (vetrina.crea): cartella/email/testa_<campagna>.jpg, servite da edgevalor.com/email/."""
    return [crea(k, os.path.join(cartella, "email")) for k in TESTI]


if __name__ == "__main__":
    for k in (sys.argv[1:] or list(TESTI)):
        print(crea(k))
