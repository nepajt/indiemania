from pathlib import Path

from PIL import Image
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    r"C:\Users\offic\.codex\generated_images\019ed1b7-dbe6-71d3-8bbf-d1eaec542020"
    r"\ig_0306b7573cd05e26016a3ae1d5d0cc8196a240828acd5a47ab.png"
)
SHEET_OUT = ROOT / "assets" / "phil-stamper-redesign-sheet.png"
ATLAS_OUT = ROOT / "assets" / "phil-stamper-redesign-atlas.png"

CELL_W = 128
CELL_H = 150
COLS = 8
ROWS = [
    8, 8, 4, 4, 6, 5, 4, 5, 3,
    6, 6, 6, 5, 5, 5, 5, 6, 6,
    6, 6, 7, 7, 6, 6,
]


def key_black_to_alpha(image):
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if max(r, g, b) < 30:
                pixels[x, y] = (0, 0, 0, 0)
            elif max(r, g, b) < 52 and r + g + b < 110:
                pixels[x, y] = (r, g, b, int(a * 0.35))
    return image


def trim_alpha(image):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    return image.crop(bbox) if bbox else image


def fit_to_cell(sprite):
    sprite = trim_alpha(sprite)
    if sprite.width == 0 or sprite.height == 0:
        return Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))

    max_w = CELL_W - 12
    max_h = CELL_H - 8
    scale = min(max_w / sprite.width, max_h / sprite.height, 1.45)
    new_size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    sprite = sprite.resize(new_size, Image.Resampling.LANCZOS)

    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    x = (CELL_W - sprite.width) // 2
    y = CELL_H - sprite.height - 4
    cell.alpha_composite(sprite, (x, y))
    return cell


def detect_row_bands(image):
    rgb = np.array(image.convert("RGB"))
    mask = (rgb.max(axis=2) > 30) & (rgb.sum(axis=2) > 85)
    counts = mask.sum(axis=1)
    bands = []
    in_band = False
    start = 0
    for y, count in enumerate(counts):
        if count > 16 and not in_band:
            start = y
            in_band = True
        elif in_band and count <= 16:
            if y - start > 5:
                bands.append((start, y - 1))
            in_band = False
    if in_band:
        bands.append((start, image.height - 1))

    merged = []
    for top, bottom in bands:
        if merged and top - merged[-1][1] < 6:
            merged[-1] = (merged[-1][0], bottom)
        else:
            merged.append((top, bottom))
    return merged


def main():
    source = Image.open(SOURCE).convert("RGBA")
    clean = key_black_to_alpha(source)
    SHEET_OUT.parent.mkdir(parents=True, exist_ok=True)
    clean.save(SHEET_OUT)

    atlas = Image.new("RGBA", (COLS * CELL_W, len(ROWS) * CELL_H), (0, 0, 0, 0))
    bands = detect_row_bands(source)

    for row, frame_count in enumerate(ROWS):
        band_top, band_bottom = bands[min(row, len(bands) - 1)]
        y1 = max(0, band_top - 4)
        y2 = min(source.height, band_bottom + 5)
        row_crop = clean.crop((0, y1, source.width, y2))
        bbox = row_crop.getchannel("A").getbbox()
        if not bbox:
            continue
        content_left = max(0, bbox[0] - 8)
        content_right = min(source.width, bbox[2] + 8)
        step_x = (content_right - content_left) / frame_count
        for col in range(frame_count):
            x1 = max(0, round(content_left + col * step_x - 4))
            x2 = min(source.width, round(content_left + (col + 1) * step_x + 4))
            sprite = clean.crop((x1, y1, x2, y2))
            atlas.alpha_composite(fit_to_cell(sprite), (col * CELL_W, row * CELL_H))

    atlas.save(ATLAS_OUT)
    print(SHEET_OUT)
    print(ATLAS_OUT)
    print(atlas.size)


if __name__ == "__main__":
    main()
