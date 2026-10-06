# Genera los iconos (calendario con marca). Uso: python3 scripts/icons.py
from PIL import Image, ImageDraw
import os
out = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out, exist_ok=True)
for size in (16, 48, 128):
    S = 512
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((32, 64, 480, 480), radius=72, fill=(21, 112, 239, 255))
    d.rounded_rectangle((32, 64, 480, 176), radius=72, fill=(17, 76, 172, 255))
    d.rectangle((32, 130, 480, 176), fill=(17, 76, 172, 255))
    for x in (144, 368):
        d.rounded_rectangle((x - 22, 24, x + 22, 120), radius=20, fill=(255, 255, 255, 255))
    d.line([(150, 330), (228, 404), (372, 252)], fill=(255, 255, 255, 255), width=56, joint="curve")
    im.resize((size, size), Image.LANCZOS).save(os.path.join(out, f"icon{size}.png"))
print("ok")
