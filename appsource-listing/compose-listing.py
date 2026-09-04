"""Compose AppSource listing screenshots: 1366x768 PNG, max 1024 KB."""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"c:\GitHub\appsource-listing\screenshots")
RAW = ROOT / "raw"
OUT = ROOT / "appsource-1366x768"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1366, 768
CAP_H = 72
NAVY = (11, 18, 36)
NAVY2 = (15, 27, 48)
GREEN = (34, 197, 94)
WHITE = (248, 250, 252)
MUTED = (148, 163, 184)
GRID = (226, 232, 240)
LINE = (203, 213, 225)
EXCEL_GREEN = (33, 115, 70)
HEADER_BG = (243, 244, 246)
SELECT = (219, 234, 254)


def font(size: int, bold: bool = False):
    names = (
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def fit(img: Image.Image, tw: int, th: int) -> Image.Image:
    img = img.convert("RGB")
    scale = max(tw / img.width, th / img.height)
    nw, nh = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = max(0, (nh - th) // 2)
    return img.crop((left, top, left + tw, top + th))


def save_png(img: Image.Image, path: Path) -> None:
    img = img.convert("RGB")
    img.save(path, "PNG", optimize=True, compress_level=9)
    if path.stat().st_size > 1024 * 1024:
        q = img.quantize(colors=220, method=Image.Quantize.MEDIANCUT)
        q.save(path, "PNG", optimize=True, compress_level=9)
    print(f"{path.name}: {path.stat().st_size} bytes {img.size}")


def caption_bar(base: Image.Image, text: str) -> Image.Image:
    canvas = Image.new("RGB", (W, H), NAVY)
    body = fit(base, W, H - CAP_H)
    canvas.paste(body, (0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, H - CAP_H, W, H), fill=NAVY)
    draw.rectangle((0, H - CAP_H, 8, H), fill=GREEN)
    icon_path = RAW / "icon-64.png"
    x = 22
    if icon_path.exists():
        icon = Image.open(icon_path).convert("RGBA").resize((40, 40), Image.Resampling.LANCZOS)
        canvas.paste(icon, (18, H - CAP_H + 16), icon)
        x = 70
    draw.text((x, H - CAP_H + 22), text, fill=WHITE, font=font(22, True))
    return canvas


def excel_plus_taskpane() -> Image.Image:
    work_h = H - CAP_H
    canvas = Image.new("RGB", (W, work_h), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    # Title bar
    draw.rectangle((0, 0, W, 36), fill=(32, 32, 32))
    draw.text((14, 8), "Horsepower.xlsx  —  Excel", fill=WHITE, font=font(16, True))
    # Thin ribbon
    draw.rectangle((0, 36, W, 68), fill=HEADER_BG)
    draw.text((16, 44), "Home    Insert    Data    Review", fill=(55, 65, 81), font=font(14))
    draw.rounded_rectangle((980, 40, 1338, 64), radius=6, fill=EXCEL_GREEN)
    draw.text((1004, 43), "Statistico    Open Statistico", fill=WHITE, font=font(13, True))

    pane_w = 420
    grid_w = W - pane_w
    rng = random.Random(42)
    values = [round(201.17 + rng.gauss(0, 60.64), 1) for _ in range(22)]
    col_w = [48, 130, 130]
    headers = ["", "Observation", "Horsepower"]
    y0 = 68
    row_h = 28
    draw.rectangle((0, y0, grid_w, y0 + row_h), fill=HEADER_BG)
    x = 0
    for i, (cw, hd) in enumerate(zip(col_w, headers)):
        draw.rectangle((x, y0, x + cw, work_h), outline=LINE)
        if hd:
            draw.text((x + 10, y0 + 5), hd, fill=(31, 41, 55), font=font(13, True))
        x += cw
    for r, val in enumerate(values, start=1):
        yy = y0 + r * row_h
        fill = SELECT if r <= 18 else (255, 255, 255)
        draw.rectangle((0, yy, sum(col_w), yy + row_h), fill=fill, outline=LINE)
        draw.text((14, yy + 5), str(r), fill=(107, 114, 128), font=font(13))
        draw.text((col_w[0] + 12, yy + 5), f"Car {r:02d}", fill=(17, 24, 39), font=font(13))
        draw.text((col_w[0] + col_w[1] + 12, yy + 5), f"{val:.1f}", fill=(17, 24, 39), font=font(13, True))
        if yy + row_h >= work_h:
            break
    # Selected-range cue
    draw.rectangle((col_w[0], y0 + row_h, sum(col_w), y0 + 19 * row_h), outline=(37, 99, 235), width=2)

    welcome = Image.open(RAW / "01-hub-welcome.png").convert("RGB")
    pane = fit(welcome, pane_w, work_h - 68)
    canvas.paste(pane, (grid_w, 68))
    draw.line((grid_w, 68, grid_w, work_h), fill=(15, 23, 42), width=2)
    return caption_bar(canvas, "Opens beside your worksheet — no scripting or extra stats software.")


def main() -> None:
    shots = [
        (
            "01-excel-welcome.png",
            None,
            "Statistico welcome task pane beside an Excel Horsepower column.",
        ),
        (
            "02-univariate-workspace.png",
            RAW / "03-univariate-histogram.png",
            "Univariate analysis on the selected column — live stats and AI interpretation.",
        ),
        (
            "03-distribution-hub.png",
            RAW / "06-distribution-hub.png",
            "Distribution Hub: choose a family, set parameters, and see the shaded probability.",
        ),
        (
            "04-normal-calculator.png",
            RAW / "06-distribution-normal.png",
            "Normal calculator: P(X ≤ x), summary stats, and an interactive PDF.",
        ),
        (
            "05-welcome-value.png",
            RAW / "01-hub-welcome.png",
            "First-run value: interactive analyses, AI interpretation, and Excel-native workflow.",
        ),
    ]

    excel = excel_plus_taskpane()
    save_png(excel, OUT / "01-excel-welcome.png")

    for name, src, caption in shots[1:]:
        img = Image.open(src)
        if name == "02-univariate-workspace.png":
            # Drop the empty top chrome so the workspace fills the frame.
            img = img.crop((0, 118, img.width, img.height))
        if name == "05-welcome-value.png":
            # Center the narrow taskpane on a branded canvas.
            branded = Image.new("RGB", (W, H - CAP_H), NAVY2)
            pane = img.resize((int(img.width * ((H - CAP_H) / img.height)), H - CAP_H), Image.Resampling.LANCZOS)
            branded.paste(pane, ((W - pane.width) // 2, 0))
            img = branded
        save_png(caption_bar(img, caption), OUT / name)

    alt = OUT / "ALT-TEXT.txt"
    alt.write_text(
        "\n".join(
            [
                "01-excel-welcome.png",
                "Alt: Statistico add-in welcome pane in Excel next to a Horsepower data column, with Start exploring highlighted.",
                "",
                "02-univariate-workspace.png",
                "Alt: Statistico Univariate workspace showing Horsepower n=369, mean and median, and AI distribution insight.",
                "",
                "03-distribution-hub.png",
                "Alt: Statistico Distribution Hub with Normal selected, P(X<=0)=0.500, and a shaded standard-normal PDF.",
                "",
                "04-normal-calculator.png",
                "Alt: Statistico normal distribution calculator with mean 0, sigma 1, probability result 0.500, and shaded bell curve.",
                "",
                "05-welcome-value.png",
                "Alt: Statistico welcome card listing interactive analyses, AI interpretation, and Excel-native statistical tools.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print("wrote", alt)


if __name__ == "__main__":
    main()
