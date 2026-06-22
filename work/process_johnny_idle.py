from pathlib import Path
from collections import deque

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    r"C:\Users\offic\.codex\generated_images\019ed1b7-dbe6-71d3-8bbf-d1eaec542020"
    r"\ig_03ccb0109cdd8655016a35489305f081949bdb8f1eafafd573.png"
)
OUT_TRANSPARENT = ROOT / "outputs" / "johnny-toxic-ps2-idle-transparent.png"
OUT_ROW = ROOT / "outputs" / "johnny-toxic-ps2-idle-row-128x150.png"

CELL_W = 128
CELL_H = 150
FRAME_COUNT = 8


def is_magenta_bg(r, g, b):
    return r > 150 and b > 140 and g < 115 and abs(r - b) < 90


def subject_mask(im):
    w, h = im.size
    px = im.load()
    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and not is_magenta_bg(r, g, b):
                mask[y * w + x] = 1
    return mask


def connected_components(mask, w, h):
    seen = bytearray(w * h)
    comps = []
    for i, value in enumerate(mask):
        if not value or seen[i]:
            continue
        q = deque([i])
        seen[i] = 1
        min_x = max_x = i % w
        min_y = max_y = i // w
        count = 0
        while q:
            j = q.popleft()
            count += 1
            x = j % w
            y = j // w
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                ni = ny * w + nx
                if mask[ni] and not seen[ni]:
                    seen[ni] = 1
                    q.append(ni)
        if count > 400:
            comps.append((min_x, min_y, max_x + 1, max_y + 1, count))
    return comps


def remove_bg(im, mask):
    out = Image.new("RGBA", im.size)
    src = im.load()
    dst = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if mask[y * w + x]:
                dst[x, y] = (r, g, b, a)
            else:
                dst[x, y] = (0, 0, 0, 0)
    return out


def make_row(transparent, comps):
    row = Image.new("RGBA", (CELL_W * FRAME_COUNT, CELL_H), (0, 0, 0, 0))
    usable = sorted(comps, key=lambda c: c[0])[:FRAME_COUNT]
    for frame, (x0, y0, x1, y1, _count) in enumerate(usable):
        crop = transparent.crop((x0, y0, x1, y1))
        cw, ch = crop.size
        scale = min((CELL_W - 8) / cw, (CELL_H - 6) / ch)
        nw = max(1, round(cw * scale))
        nh = max(1, round(ch * scale))
        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        dx = frame * CELL_W + (CELL_W - nw) // 2
        dy = CELL_H - nh - 2
        row.alpha_composite(resized, (dx, dy))
    return row


def main():
    im = Image.open(SOURCE).convert("RGBA")
    mask = subject_mask(im)
    comps = connected_components(mask, *im.size)
    comps = sorted(comps, key=lambda c: c[4], reverse=True)
    comps = [c for c in comps if c[2] - c[0] > 60 and c[3] - c[1] > 150]
    comps = sorted(comps, key=lambda c: c[0])
    transparent = remove_bg(im, mask)
    OUT_TRANSPARENT.parent.mkdir(parents=True, exist_ok=True)
    transparent.save(OUT_TRANSPARENT)
    make_row(transparent, comps).save(OUT_ROW)
    print(f"frames={len(comps)}")
    print(OUT_TRANSPARENT)
    print(OUT_ROW)


if __name__ == "__main__":
    main()
