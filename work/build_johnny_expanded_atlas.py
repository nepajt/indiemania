from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\offic\Downloads\Johnny Toxic (1).png")
OUT = ROOT / "assets" / "johnny-toxic-expanded-atlas.png"

CELL_W = 128
CELL_H = 150
GAP_X = 18
GAP_Y = 38
MARGIN_X = 210
TOP = 70
ROW_Y = TOP + 55

ROWS = [
    8, 8, 4, 4, 6, 5, 4, 5, 3,
    6, 6, 6, 5, 5, 5, 5, 6, 6,
    6, 6, 7, 7, 6, 6,
]


def main():
    sheet = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (8 * CELL_W, len(ROWS) * CELL_H), (0, 0, 0, 0))

    for row, frame_count in enumerate(ROWS):
        source_y = ROW_Y + row * (CELL_H + GAP_Y)
        dest_y = row * CELL_H
        for frame in range(frame_count):
            source_x = MARGIN_X + frame * (CELL_W + GAP_X)
            cell = sheet.crop((source_x, source_y, source_x + CELL_W, source_y + CELL_H))
            atlas.alpha_composite(cell, (frame * CELL_W, dest_y))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT)
    print(OUT)
    print(atlas.size)


if __name__ == "__main__":
    main()
