from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "wrestler-sprite-template.png"
SPEC = ROOT / "outputs" / "wrestler-sprite-template-spec.md"

WIDTH = 1580
MARGIN_X = 210
TOP = 70
CELL_W = 128
CELL_H = 150
GAP_X = 18
GAP_Y = 38

ROWS = [
    ("Idle", 8, "loop"),
    ("Walk", 8, "loop"),
    ("Punch", 4, "one-shot"),
    ("Kick", 4, "one-shot"),
    ("Grapple Start / Hold", 6, "one-shot / hold"),
    ("Finisher", 5, "one-shot"),
    ("Pinning", 4, "one-shot / hold"),
    ("Knocked Down", 5, "one-shot / hold"),
    ("Victory", 3, "loop / hold"),
    ("Irish Whip Give", 6, "one-shot"),
    ("Irish Whip Take", 4, "one-shot"),
    ("Rope Rebound Run", 6, "loop / return"),
    ("Clothesline Give", 5, "one-shot"),
    ("Clothesline Take", 5, "one-shot / fall"),
    ("Big Boot Give", 5, "one-shot"),
    ("Big Boot Take", 5, "one-shot / fall"),
    ("DDT Give", 6, "one-shot"),
    ("DDT Take", 6, "one-shot / fall"),
    ("Bodyslam Give", 6, "one-shot"),
    ("Bodyslam Take", 6, "one-shot / fall"),
    ("Powerbomb Give", 7, "one-shot"),
    ("Powerbomb Take", 7, "one-shot / fall"),
    ("Suplex Give", 6, "one-shot"),
    ("Suplex Take", 6, "one-shot / fall"),
]


def font(size):
    for name in ("arial.ttf", "segoeui.ttf", "calibri.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    height = TOP * 2 + len(ROWS) * CELL_H + (len(ROWS) - 1) * GAP_Y + 95
    img = Image.new("RGBA", (WIDTH, height), (246, 246, 242, 255))
    draw = ImageDraw.Draw(img)

    title_font = font(34)
    label_font = font(24)
    small_font = font(15)
    tiny_font = font(12)

    draw.text((34, 24), "IndieMania Wrestler Sprite Sheet Template", fill=(20, 24, 28), font=title_font)
    draw.text(
        (34, 62),
        "Transparent PNG preferred. Keep each pose centered on the same floor line inside its box.",
        fill=(74, 78, 84),
        font=small_font,
    )

    max_frames = max(frames for _, frames, _ in ROWS)
    guide_x0 = MARGIN_X
    guide_x1 = MARGIN_X + max_frames * CELL_W + (max_frames - 1) * GAP_X

    y = TOP + 55
    for row_index, (name, frames, mode) in enumerate(ROWS):
        draw.text((34, y + CELL_H // 2 - 20), name, fill=(18, 22, 28), font=label_font)
        draw.text((36, y + CELL_H // 2 + 9), f"{frames} frames / {mode}", fill=(88, 92, 98), font=small_font)

        for col in range(frames):
            x = MARGIN_X + col * (CELL_W + GAP_X)
            fill = (255, 255, 255, 255)
            outline = (34, 44, 58, 255)
            draw.rounded_rectangle((x, y, x + CELL_W, y + CELL_H), radius=6, fill=fill, outline=outline, width=2)

            floor_y = y + CELL_H - 18
            center_x = x + CELL_W // 2
            draw.line((x + 10, floor_y, x + CELL_W - 10, floor_y), fill=(209, 70, 70), width=2)
            draw.line((center_x, y + 10, center_x, y + CELL_H - 8), fill=(205, 212, 220), width=1)
            draw.text((x + 8, y + 7), f"{col + 1}", fill=(86, 96, 108), font=tiny_font)

        row_mid_y = y + CELL_H - 18
        draw.line((guide_x0, row_mid_y, guide_x1, row_mid_y), fill=(209, 70, 70), width=1)
        y += CELL_H + GAP_Y

    legend_y = height - 78
    draw.rounded_rectangle((30, legend_y, WIDTH - 30, height - 28), radius=8, fill=(229, 234, 238), outline=(160, 168, 178))
    draw.text((50, legend_y + 13), "Frame box: 128 x 150 px", fill=(24, 28, 34), font=small_font)
    draw.text((290, legend_y + 13), "Red line: shared foot/floor line", fill=(24, 28, 34), font=small_font)
    draw.text((560, legend_y + 13), "Draw facing right; the game flips left automatically", fill=(24, 28, 34), font=small_font)
    draw.text((940, legend_y + 13), "Leave no labels/background in final art", fill=(24, 28, 34), font=small_font)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)

    SPEC.write_text(
        """# IndieMania Wrestler Sprite Sheet Template

Preferred final format:

- Transparent PNG.
- Each frame fits inside a 128 x 150 px box.
- Character faces right.
- Feet should sit on the red floor line in every standing frame.
- Keep character scale consistent across rows.
- Leave empty frame boxes transparent.
- Do not include row labels or background art in the final production sheet.
- For two-person moves, each wrestler still gets their own single-character frames. The game lines the wrestlers up during the move.
- "Giving" rows are the attacker animation. "Taking" rows are the receiver animation.
- Taking/falling rows should end in a pose that connects naturally into the Knocked Down row.

Rows:

- Idle: 8 looping frames.
- Walk: 8 looping frames.
- Punch: 4 one-shot frames.
- Kick: 4 one-shot frames.
- Grapple Start / Hold: 6 frames. Use the early frames for reaching/lock-up and the final frame as a hold pose.
- Finisher: 5 one-shot frames.
- Pinning: 4 frames, can hold on the final frame.
- Knocked Down: 5 frames, can hold on the final frame.
- Victory: 3 looping or held frames.
- Irish Whip - Giving: 6 frames. Attacker grabs, turns, and throws the opponent toward the ropes.
- Irish Whip - Taking: 4 frames. Receiver is pulled/turned into the run.
- Rope Rebound Run: 6 frames. Receiver runs back from the ropes after the whip.
- Clothesline - Giving: 5 frames. Running arm strike.
- Clothesline - Taking: 5 frames. Receiver sells the hit and starts falling.
- Big Boot - Giving: 5 frames. Running/high boot strike.
- Big Boot - Taking: 5 frames. Receiver sells the boot and starts falling.
- DDT - Giving: 6 frames. Attacker hooks the head and drops.
- DDT - Taking: 6 frames. Receiver bends, drops, and lands.
- Bodyslam - Giving: 6 frames. Attacker lifts, turns, and slams.
- Bodyslam - Taking: 6 frames. Receiver lifts, rotates, and lands.
- Powerbomb - Giving: 7 frames. Attacker hoists and drives down.
- Powerbomb - Taking: 7 frames. Receiver lifts, hangs, and lands.
- Suplex - Giving: 6 frames. Attacker hooks, lifts, bridges/throws.
- Suplex - Taking: 6 frames. Receiver lifts backward and lands.

The game falls back to older rows if the expanded rows are missing, so existing wrestlers remain playable while new art is built.
""",
        encoding="utf-8",
    )

    print(OUT)
    print(SPEC)


if __name__ == "__main__":
    main()
