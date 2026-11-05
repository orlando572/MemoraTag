"""Generates MemoraTag's identity assets (app icon, Android adaptive/monochrome icon, splash, logo).

The mark is a luggage-style tag (the physical object) whose eyelet is a "memory" ring, with a small
timeline drawn on it (the object's history). Colours follow the «Bitácora» palette (see src/ui/tokens.ts).

Run from apps/mobile:  python scripts/generate-icons.py   (python3 on macOS/Linux; needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

BLUE = (47, 75, 184, 255)         # #2F4BB8  primary (light)
BLUE_DARK = (35, 58, 148, 255)    # #233A94
BLUE_LIGHT = (143, 168, 255, 255) # #8FA8FF  primary (dark)
PAPER = (247, 243, 236, 255)      # #F7F3EC
INK = (27, 25, 22, 255)           # #1B1916
SIZE = 1024
SS = 4  # supersampling factor for smooth edges
OUT = Path(__file__).resolve().parent.parent / 'assets'


def mark(body=PAPER, ring=BLUE_DARK, line=BLUE, scale=1.0, mono=False):
    """Draws the tag on a transparent canvas. `scale` shrinks it to fit Android's safe zone."""
    n = SIZE * SS
    layer = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = lambda v: int(v * SS)
    # Tag body: rounded rectangle plus a pointed end on the left.
    d.rounded_rectangle([s(400), s(318), s(842), s(706)], radius=s(70), fill=body)
    d.polygon([(s(470), s(318)), (s(470), s(706)), (s(236), s(560)), (s(236), s(464))], fill=body)
    d.ellipse([s(206), s(452), s(266), s(572)], fill=body)  # rounds the tip
    # Eyelet: a ring (a different blue from the body and the background) with a see-through hole.
    d.ellipse([s(282), s(456), s(394), s(568)], fill=ring)
    d.ellipse([s(310), s(484), s(366), s(540)], fill=(0, 0, 0, 0))
    # Timeline: a vertical line with three moments and their entries.
    d.rounded_rectangle([s(478), s(410), s(498), s(614)], radius=s(10), fill=line)
    for y, length in ((412, 238), (512, 178), (612, 262)):
        d.ellipse([s(456), s(y - 32), s(520), s(y + 32)], fill=line)
        d.rounded_rectangle([s(552), s(y - 15), s(552 + length), s(y + 15)], radius=s(15), fill=line)
    if mono:
        # Monochrome icons are tinted by the system: every visible pixel becomes white,
        # and the timeline is cut out so it stays legible.
        alpha = layer.split()[3]
        white = Image.new('RGBA', layer.size, (255, 255, 255, 255))
        cut = Image.new('L', layer.size, 0)
        cd = ImageDraw.Draw(cut)
        cd.rounded_rectangle([s(478), s(410), s(498), s(614)], radius=s(10), fill=255)
        for y, length in ((412, 238), (512, 178), (612, 262)):
            cd.ellipse([s(456), s(y - 32), s(520), s(y + 32)], fill=255)
            cd.rounded_rectangle([s(552), s(y - 15), s(552 + length), s(y + 15)], radius=s(15), fill=255)
        alpha = Image.composite(Image.new('L', layer.size, 0), alpha, cut)
        white.putalpha(alpha)
        layer = white
    layer = layer.rotate(18, resample=Image.BICUBIC, center=(n / 2, n / 2))
    if scale != 1.0:
        small = layer.resize((int(n * scale), int(n * scale)), Image.LANCZOS)
        layer = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        offset = (n - small.size[0]) // 2
        layer.paste(small, (offset, offset), small)
    return layer.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    # iOS / legacy icon: full-bleed blue background.
    icon = Image.new('RGBA', (SIZE, SIZE), BLUE)
    icon.alpha_composite(mark(scale=0.86))
    icon.convert('RGB').save(OUT / 'icon.png')
    # Android adaptive icon: foreground inside the 66% safe zone; background colour set in app.json.
    mark(scale=0.62).save(OUT / 'adaptive-icon.png')
    mark(scale=0.62, mono=True).save(OUT / 'monochrome-icon.png')
    # Splash and in-app logo on transparent: blue tag for light mode, light-blue tag for dark mode.
    mark(body=BLUE, ring=BLUE_LIGHT, line=PAPER).save(OUT / 'splash-icon.png')
    mark(body=BLUE, ring=BLUE_LIGHT, line=PAPER).resize((512, 512), Image.LANCZOS).save(OUT / 'logo.png')
    mark(body=BLUE_LIGHT, ring=BLUE, line=INK).resize((512, 512), Image.LANCZOS).save(OUT / 'logo-dark.png')
    print('Generated:', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))


if __name__ == '__main__':
    main()
