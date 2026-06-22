from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "joey-image-sheet.png"
OUT = ROOT / "assets" / "joey-image-atlas.png"

CELL_W = 128
CELL_H = 150

FRAMES = {
    "idle": [(358 + i * 77, 42, 76, 122) for i in range(8)],
    "walk": [(358 + i * 77, 214, 78, 112) for i in range(8)],
    "punch": [(20 + i * 78, 548, 82, 120) for i in range(4)],
    "kick": [(740, 548, 92, 120), (820, 548, 112, 120), (900, 548, 110, 120)],
    "grapple": [(18 + i * 74, 772, 82, 120) for i in range(3)],
    "finisher": [
        (498, 1128, 92, 118),
        (590, 1128, 118, 118),
        (706, 1128, 118, 118),
        (818, 1128, 116, 118),
        (920, 1120, 78, 118),
    ],
    "down": [(372, 1004, 128, 82)],
}

ROWS = ["idle", "walk", "punch", "kick", "grapple", "finisher", "down"]


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
