from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "phil-stamper-sheet.png"
OUT = ROOT / "assets" / "phil-stamper-atlas.png"

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


def main():
    source = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * len(ATLAS_ROWS)), (0, 0, 0, 0))

    for atlas_row, name in enumerate(ATLAS_ROWS):
        source_row, frame_count = ROWS[name]
        for col in range(frame_count):
            x = GRID_X + col * STEP_X
            y = GRID_Y + source_row * STEP_Y
            frame = source.crop((x, y, x + CELL_W, y + CELL_H))
            atlas.alpha_composite(frame, (col * CELL_W, atlas_row * CELL_H))

    atlas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
