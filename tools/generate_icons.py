"""
Generates the PWA / home-screen icons in public/icons/.

Draws a speech bubble on a teal background so the icon needs no font or
external artwork. Re-run after changing colours: python3 tools/generate_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

BACKGROUND = (15, 118, 110)
FOREGROUND = (247, 244, 238)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SUPERSAMPLE = 4


def draw_icon(size: int, padding_ratio: float) -> Image.Image:
    """Renders one square icon; a larger padding_ratio keeps the bubble inside maskable safe zones."""
    canvas = size * SUPERSAMPLE
    image = Image.new("RGB", (canvas, canvas), BACKGROUND)
    draw = ImageDraw.Draw(image)

    pad = canvas * padding_ratio
    left, top, right = pad, pad * 1.05, canvas - pad
    bottom = canvas - pad * 1.45
    radius = (bottom - top) * 0.32
    draw.rounded_rectangle((left, top, right, bottom), radius=radius, fill=FOREGROUND)

    tail_x = left + (right - left) * 0.28
    draw.polygon(
        [(tail_x, bottom - 2), (tail_x + (right - left) * 0.2, bottom - 2), (tail_x - (right - left) * 0.04, canvas - pad * 0.95)],
        fill=FOREGROUND,
    )

    dot_radius = (right - left) * 0.065
    center_y = (top + bottom) / 2
    for fraction in (0.28, 0.5, 0.72):
        center_x = left + (right - left) * fraction
        draw.ellipse(
            (center_x - dot_radius, center_y - dot_radius, center_x + dot_radius, center_y + dot_radius),
            fill=BACKGROUND,
        )

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    """Writes every icon size the manifest and iOS need."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    draw_icon(size=192, padding_ratio=0.2).save(OUTPUT_DIR / "icon-192.png")
    draw_icon(size=512, padding_ratio=0.2).save(OUTPUT_DIR / "icon-512.png")
    draw_icon(size=512, padding_ratio=0.28).save(OUTPUT_DIR / "icon-512-maskable.png")
    draw_icon(size=180, padding_ratio=0.2).save(OUTPUT_DIR / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
