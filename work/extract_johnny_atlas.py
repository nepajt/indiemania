from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "johnny-toxic-sheet.png"
OUT = ROOT / "assets" / "johnny-toxic-atlas.png"

CELL_W = 128
CELL_H = 150

FRAMES = {
    "idle": [(392 + i * 77, 38, 64, 124) for i in range(8)],
    "walk": [(386 + i * 77, 206, 66, 116) for i in range(8)],
    "strike": [(384 + i * 78, 546, 76, 120) for i in range(4)],
    "grapple": [(18 + i * 72, 812, 76, 86) for i in range(3)],
    "finisher": [
        (506, 1160, 88, 132),
        (596, 1160, 112, 132),
        (704, 1160, 126, 132),
        (812, 1160, 112, 132),
        (896, 1160, 86, 132),
    ],
    "down": [(360, 1012, 122, 78)],
}

ROWS = ["idle", "walk", "strike", "grapple", "finisher", "down"]


def color_dist(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5


def transparent_flood(crop):
    crop = crop.convert("RGBA")
    pixels = crop.load()
    w, h = crop.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    refs = [pixels[x, y] for x, y in seeds]
    seen = set()
    q = deque(seeds)

    while q:
        x, y = q.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        seen.add((x, y))
        px = pixels[x, y]
        if min(color_dist(px, ref) for ref in refs) > 24:
            continue
        pixels[x, y] = (px[0], px[1], px[2], 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return crop


def trim_alpha(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main():
    source = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * len(ROWS)), (0, 0, 0, 0))

    for row, name in enumerate(ROWS):
        for col, rect in enumerate(FRAMES[name]):
            crop = source.crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]))
            crop = trim_alpha(transparent_flood(crop))
            x = col * CELL_W + (CELL_W - crop.width) // 2
            y = row * CELL_H + CELL_H - crop.height - 7
            atlas.alpha_composite(crop, (x, y))

    atlas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
