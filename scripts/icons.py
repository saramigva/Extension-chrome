# Genera los iconos (radar). Uso: python3 scripts/icons.py
from PIL import Image, ImageDraw
import os
out = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out, exist_ok=True)
S = 512
im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.ellipse((24, 24, 488, 488), fill=(105, 65, 198, 255))
for r, w in ((170, 22), (100, 22)):
    d.ellipse((256 - r, 256 - r, 256 + r, 256 + r), outline=(255, 255, 255, 170), width=w)
d.pieslice((60, 60, 452, 452), -90, -30, fill=(255, 255, 255, 110))
d.line([(256, 256), (256 + 150, 256 - 150)], fill=(255, 255, 255, 255), width=26)
d.ellipse((330, 150, 380, 200), fill=(253, 176, 34, 255))
d.ellipse((236, 236, 276, 276), fill=(255, 255, 255, 255))
for size in (16, 48, 128):
    im.resize((size, size), Image.LANCZOS).save(os.path.join(out, f"icon{size}.png"))
print("ok")
