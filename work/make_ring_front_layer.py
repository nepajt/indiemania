from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "indiemania-ring.png"
OUT = ROOT / "assets" / "indiemania-ring-front.png"

ROPE_ROWS = (492, 584, 674)


def is_rope_like(r, g, b, y):
    red = r > 150 and g < 95 and b < 95
    blue = b > 130 and r < 85
    white = r > 180 and g > 180 and b > 180 and abs(r - g) < 45
    return y >= 380 and (red or blue or white)


def main():
    source = Image.open(SOURCE).convert("RGBA")
    front = Image.new("RGBA", source.size, (0, 0, 0, 0))
    src = source.load()
    dst = front.load()
    w, h = source.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            keep_apron = y >= 742
            keep_posts = y >= 405 and (x < 330 or x > 1560)
            keep_rope_bands = any(abs(y - row) <= 5 for row in ROPE_ROWS)
            if keep_apron or keep_posts or keep_rope_bands or is_rope_like(r, g, b, y):
                dst[x, y] = (r, g, b, a)

    front.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
