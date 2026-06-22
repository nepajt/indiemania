from pathlib import Path

from collections import deque

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "joey-image-clean-sheet.png"
OUT = ROOT / "assets" / "joey-image-atlas.png"

CELL_W = 128
CELL_H = 150
GRID_X = 210
GRID_Y = 125
STEP_X = 146
STEP_Y = 188

ROWS = {
    "idle": (0, 8),
    "walk": (1, 8),
    "punch": (2, 4),
    "kick": (3, 4),
    "grapple": (4, 6),
    "finisher": (5, 5),
    "pin": (6, 4),
    "down": (7, 5),
    "celebrate": (8, 3),
}

ATLAS_ROWS = ["idle", "walk", "punch", "kick", "grapple", "finisher", "pin", "down", "celebrate"]


def near_black(pixel):
    r, g, b, a = pixel
    return a > 20 and r < 18 and g < 18 and b < 18


def remove_black_background(crop):
    crop = crop.convert("RGBA")
    pixels = crop.load()
    w, h = crop.size
    seeds = []
    for x in range(w):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(h):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    seen = set()
    q = deque(seeds)
    while q:
        x, y = q.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        seen.add((x, y))
        if not near_black(pixels[x, y]):
            continue
        r, g, b, a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return crop


def main():
    source = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * len(ATLAS_ROWS)), (0, 0, 0, 0))

    for atlas_row, name in enumerate(ATLAS_ROWS):
        source_row, frame_count = ROWS[name]
        for col in range(frame_count):
            x = GRID_X + col * STEP_X
            y = GRID_Y + source_row * STEP_Y
            frame = remove_black_background(source.crop((x, y, x + CELL_W, y + CELL_H)))
            atlas.alpha_composite(frame, (col * CELL_W, atlas_row * CELL_H))

    atlas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
