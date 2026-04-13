#!/usr/bin/env python3
"""
產出 LINE Rich Menu 底圖 richmenu.jpg（2500×1686，小於 1 MB）。

第二版：亮色米其林風（紅＋金＋米白）、高對比深字；
字型自動挑選可完整顯示「米其林職人大腦」等繁中的 .ttc face，
避免宋體 index 錯誤造成缺字、畫面破碎。

    python3 scripts/render_richmenu_michelin.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "richmenu_config.json"
OUT_PATH = ROOT / "richmenu.jpg"

W, H = 2500, 1686
LINE_MAX = 1024 * 1024

# 亮色米其林感：米白底、指南紅條、香檳金線、深咖啡字
CREAM_TOP = (252, 249, 244)
CREAM_MID = (245, 238, 228)
CREAM_BOTTOM = (236, 228, 216)
MICHELIN_RED = (200, 16, 46)  # 指南系紅（非官方，僅風格）
MICHELIN_RED_DARK = (142, 10, 32)
GOLD = (176, 138, 72)
GOLD_LINE = (200, 165, 100)
TEXT_MAIN = (38, 22, 28)
TEXT_HINT = (110, 92, 78)
CARD = (255, 255, 255)
CARD_EDGE = (220, 200, 170)
SHADOW = (0, 0, 0, 28)

# 用於挑選字型：須完整顯示（寬度過小代表缺字或 fallback）
FONT_PROBE = "米其林職人大腦主選單隨機配菜愛清冰箱預算採購"

_FONT_SOURCES: list[tuple[str, int]] = []
for _p, _mx in (
    ("/System/Library/Fonts/PingFang.ttc", 60),
    ("/System/Library/Fonts/STHeiti Medium.ttc", 16),
    ("/System/Library/Fonts/STHeiti Light.ttc", 16),
    ("/System/Library/Fonts/Supplemental/Songti.ttc", 16),
    ("/System/Library/Fonts/Supplemental/Songti SC.ttc", 16),
    ("/Library/Fonts/Songti.ttc", 8),
):
    if os.path.isfile(_p):
        _FONT_SOURCES.append((_p, _mx))


def _measure_width(font: ImageFont.FreeTypeFont, text: str) -> int:
    im = Image.new("RGB", (4, 4))
    dr = ImageDraw.Draw(im)
    bb = dr.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0]


def pick_best_cjk_face() -> tuple[str, int]:
    """選出能完整渲染繁中標題、量測寬度最大的 (path, ttc_index)。"""
    best: tuple[str, int] | None = None
    best_score = -1
    for path, max_idx in _FONT_SOURCES:
        for idx in range(max_idx):
            try:
                f = ImageFont.truetype(path, 72, index=idx)
            except OSError:
                continue
            score = _measure_width(f, FONT_PROBE)
            # 過窄幾乎一定是錯 face 或 bitmap fallback
            if score < 280:
                continue
            if score > best_score:
                best_score = score
                best = (path, idx)
    if best is None:
        # 最後手段：PingFang index 22 在部分 macOS 為繁中 Regular
        fallback = "/System/Library/Fonts/PingFang.ttc"
        if os.path.isfile(fallback):
            return (fallback, 22)
        sys.exit("❌ 找不到可用的中文字型（PingFang / 黑體 / 宋體）。")
    return best


def truetype(path: str, idx: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=idx)


def paint_cream_gradient(img: Image.Image) -> None:
    px = img.load()
    for y in range(H):
        t = y / max(H - 1, 1)
        r = int(CREAM_TOP[0] + (CREAM_BOTTOM[0] - CREAM_TOP[0]) * t)
        g = int(CREAM_TOP[1] + (CREAM_BOTTOM[1] - CREAM_TOP[1]) * t)
        b = int(CREAM_TOP[2] + (CREAM_BOTTOM[2] - CREAM_TOP[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)


def draw_header_bar(
    draw: ImageDraw.ImageDraw,
    font_path: str,
    font_idx: int,
) -> None:
    """頂部紅條 + 白字標題（底緣在 y=128，與 JSON 上列 y=138 留縫）。"""
    bar_h = 126
    draw.rectangle([0, 0, W, bar_h], fill=MICHELIN_RED)
    draw.line([(0, bar_h), (W, bar_h)], fill=GOLD_LINE, width=3)

    title = "米其林職人大腦"
    sub = "MICHELIN CHEF · AI"
    f_title = truetype(font_path, font_idx, 68)
    f_sub = truetype(font_path, font_idx, 26)

    tb = draw.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    sb = draw.textbbox((0, 0), sub, font=f_sub)
    sh = sb[3] - sb[1]
    gap = 6
    block = th + gap + sh
    y0 = (bar_h - block) // 2
    ty_title = y0 - tb[1]
    draw.text(((W - tw) // 2 - tb[0], ty_title), title, font=f_title, fill=(255, 255, 255))
    sw = sb[2] - sb[0]
    ty_sub = y0 + th + gap - sb[1]
    draw.text(((W - sw) // 2 - sb[0], ty_sub), sub, font=f_sub, fill=(255, 220, 190))


def draw_card(
    layer: ImageDraw.ImageDraw,
    x: int,
    y: int,
    cw: int,
    ch: int,
    radius: int = 22,
) -> None:
    inset = 10
    box = [x + inset, y + inset, x + cw - inset, y + ch - inset]
    # 極淡投影
    for dx, dy in ((4, 5), (2, 3)):
        layer.rounded_rectangle(
            [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy],
            radius=radius,
            fill=(235, 228, 218),
        )
    layer.rounded_rectangle(box, radius=radius, fill=CARD, outline=GOLD_LINE, width=2)


def draw_cell_label(
    draw: ImageDraw.ImageDraw,
    b: dict,
    main: str,
    hint: str,
    font_path: str,
    font_idx: int,
) -> None:
    x, y, cw, ch = b["x"], b["y"], b["width"], b["height"]
    pad_x, pad_y = 28, 32
    hint_h = 40
    max_w = cw - pad_x * 2
    max_h = ch - pad_y * 2 - hint_h

    font_main = None
    for size in range(60, 30, -2):
        f = truetype(font_path, font_idx, size)
        bb = draw.textbbox((0, 0), main, font=f)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if w <= max_w and h <= max_h:
            font_main = f
            break
    if font_main is None:
        font_main = truetype(font_path, font_idx, 30)

    mb = draw.textbbox((0, 0), main, font=font_main)
    tw, th = mb[2] - mb[0], mb[3] - mb[1]
    tx = x + (cw - tw) // 2 - mb[0]
    ty = y + (ch - th - hint_h) // 2 - mb[1]
    # 淺底用淡陰影即可
    draw.text((tx + 1, ty + 1), main, font=font_main, fill=(230, 225, 218))
    draw.text((tx, ty), main, font=font_main, fill=TEXT_MAIN)

    f_hint = truetype(font_path, font_idx, 22)
    hb = draw.textbbox((0, 0), hint, font=f_hint)
    hw = hb[2] - hb[0]
    hx = x + (cw - hw) // 2 - hb[0]
    hy = y + ch - pad_y - (hb[3] - hb[1]) - hb[1]
    draw.text((hx, hy), hint, font=f_hint, fill=TEXT_HINT)


def main() -> None:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    areas = cfg["areas"]
    if len(areas) != 6:
        sys.exit("預期 6 個熱區")

    font_path, font_idx = pick_best_cjk_face()

    base = Image.new("RGB", (W, H), CREAM_TOP)
    paint_cream_gradient(base)
    draw = ImageDraw.Draw(base)

    draw_header_bar(draw, font_path, font_idx)

    # 六格白卡片（在熱區內）
    for a in areas:
        b = a["bounds"]
        draw_card(draw, b["x"], b["y"], b["width"], b["height"])

    # 與 JSON label 對齊的完整中文
    rows = [
        ("主選單", "MENU"),
        ("隨機配菜", "SURPRISE"),
        ("我的最愛", "FAVORITES"),
        ("清冰箱模式", "FRIDGE"),
        ("預算方案", "BUDGET"),
        ("採買清單", "GROCERY"),
    ]
    for a, (zh, en) in zip(areas, rows):
        draw_cell_label(draw, a["bounds"], zh, en, font_path, font_idx)

    rgb = base.convert("RGB")
    for q in (93, 88, 82, 76):
        buf = ROOT / f"_richmenu_tmp_q{q}.jpg"
        rgb.save(buf, format="JPEG", quality=q, optimize=True, subsampling=1)
        sz = buf.stat().st_size
        if sz <= LINE_MAX:
            OUT_PATH.unlink(missing_ok=True)
            buf.rename(OUT_PATH)
            print(
                f"✅ 已寫入 {OUT_PATH}（quality={q}，約 {sz // 1024} KB；字型 {font_path} index={font_idx}）"
            )
            return
        buf.unlink(missing_ok=True)
    sys.exit("❌ 無法壓到 1 MB 以下。")


if __name__ == "__main__":
    main()
