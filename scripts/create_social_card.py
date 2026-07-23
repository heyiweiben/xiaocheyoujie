from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
logo_path = root / 'public/brand/logo-color.png'
out = root / 'public/brand/social-card.png'

canvas = Image.new('RGBA', (1200, 630), '#fff8ee')
draw = ImageDraw.Draw(canvas)
draw.ellipse((900, -160, 1300, 240), fill='#f15b3e')
draw.ellipse((-110, 430, 190, 730), fill='#f4c55f')
draw.rounded_rectangle((92, 72, 1108, 558), radius=54, outline='#2f6b63', width=4)

logo = Image.open(logo_path).convert('RGBA')
logo.thumbnail((620, 330), Image.Resampling.LANCZOS)
x = (1200 - logo.width) // 2
y = (630 - logo.height) // 2
canvas.alpha_composite(logo, (x, y))
canvas.convert('RGB').save(out, optimize=True)
print(out)
