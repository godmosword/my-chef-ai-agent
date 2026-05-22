#!/usr/bin/env python3
"""
產出 LINE Rich Menu 底圖 richmenu.jpg（2500×1686，小於 1 MB）。

第二版：亮色職人料理風（紅＋金＋米白）、高對比深字；
字型自動挑選可完整顯示「職人料理大腦」等繁中的 .ttc face，
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
STYLE_VERSION = "muji_v1_locked"

W, H = 2500, 1686
LINE_MAX = 1024 * 1024

# 無印混搭：米白底 + 木質棕灰 + 墨綠低飽和
CREAM_TOP = (248, 244, 238)
CREAM_MID = (244, 239, 232)
CREAM_BOTTOM = (238, 232, 224)
MICHELIN_RED = (78, 99, 86)       # header 墨綠
MICHELIN_RED_DARK = (64, 82, 71)
GOLD = (164, 132, 96)             # 木質棕
GOLD_LINE = (184, 156, 122)
TEXT_MAIN = (52, 46, 40)          # 深棕灰字
TEXT_HINT = (120, 110, 98)
CARD = (255, 253, 250)
CARD_EDGE = (214, 202, 186)
SHADOW = (0, 0, 0, 36)
CARD_FILL_SET = [
    (255, 253, 250),  # 主選單
    (249, 242, 230),  # 隨機配菜
    (238, 245, 238),  # 我的最愛
    (240, 244, 246),  # 清冰箱模式
    (246, 239, 236),  # 預算方案
    (243, 241, 236),  # 採買清單
]
CARD_EDGE_SET = [
    (214, 202, 186),
    (196, 166, 126),
    (147, 170, 145),
    (160, 170, 176),
    (186, 162, 146),
    (173, 170, 156),
]

# 用於挑選字型：須完整顯示（寬度過小代表缺字或 fallback）
FONT_PROBE = "職人料理大腦主選單隨機配菜愛清冰箱預算採購"

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


def _emoji_font(size: int) -> ImageFont.ImageFont:
    """Prefer color emoji font on macOS; fallback safely elsewhere."""
    candidates = [
        "/System/Library/Fonts/Apple Color Emoji.ttc",
        "/System/Library/Fonts/AppleColorEmoji.ttf",
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
        "/usr/share/fonts/noto/NotoColorEmoji.ttf",
    ]
    for p in candidates:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    # Return a tiny default font as sentinel; caller will fallback to vector badge.
    return ImageFont.load_default()


def _draw_icon_badge(draw: ImageDraw.ImageDraw, *, cx: int, cy: int, icon: str) -> int:
    """Draw large vector icon badge (no emoji font dependency)."""
    badge_bg = {
        "🏠": (89, 133, 196),
        "🍳": (198, 146, 42),
        "❤️": (189, 80, 87),
        "🧊": (98, 154, 201),
        "💰": (132, 110, 82),
        "🛒": (77, 144, 120),
    }.get(icon, (120, 128, 140))
    r = 44
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=badge_bg)
    ink = (86, 80, 72)
    lw = 10
    if icon == "🏠":
        draw.polygon([(cx - 24, cy - 4), (cx, cy - 30), (cx + 24, cy - 4)], outline=ink, fill=None, width=lw)
        draw.rectangle((cx - 18, cy - 4, cx + 18, cy + 24), outline=ink, width=lw)
        draw.rectangle((cx - 6, cy + 6, cx + 6, cy + 24), outline=ink, width=lw)
    elif icon == "🍳":
        draw.ellipse((cx - 24, cy - 8, cx + 24, cy + 24), outline=ink, width=lw)
        draw.ellipse((cx - 8, cy + 2, cx + 8, cy + 18), fill=ink)
        draw.line((cx + 24, cy + 8, cx + 34, cy + 8), fill=ink, width=lw)
    elif icon == "❤️":
        draw.ellipse((cx - 22, cy - 18, cx - 2, cy + 2), fill=ink)
        draw.ellipse((cx + 2, cy - 18, cx + 22, cy + 2), fill=ink)
        draw.polygon([(cx - 24, cy - 2), (cx, cy + 28), (cx + 24, cy - 2)], fill=ink)
    elif icon == "🧊":
        draw.polygon([(cx, cy - 26), (cx + 24, cy - 12), (cx + 24, cy + 14), (cx, cy + 28), (cx - 24, cy + 14), (cx - 24, cy - 12)], outline=ink, fill=None, width=lw)
        draw.line((cx - 24, cy - 12, cx, cy + 2), fill=ink, width=6)
        draw.line((cx, cy + 2, cx + 24, cy - 12), fill=ink, width=6)
    elif icon == "💰":
        draw.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), outline=ink, width=lw)
        draw.line((cx, cy - 12, cx, cy + 12), fill=ink, width=lw)
        draw.line((cx - 10, cy - 8, cx + 8, cy - 8), fill=ink, width=lw)
        draw.line((cx - 8, cy + 8, cx + 10, cy + 8), fill=ink, width=lw)
    elif icon == "🛒":
        draw.line((cx - 24, cy - 14, cx - 10, cy - 14), fill=ink, width=lw)
        draw.polygon([(cx - 10, cy - 14), (cx + 24, cy - 14), (cx + 18, cy + 10), (cx - 4, cy + 10)], outline=ink, fill=None, width=lw)
        draw.ellipse((cx - 2, cy + 14, cx + 8, cy + 24), fill=ink)
        draw.ellipse((cx + 14, cy + 14, cx + 24, cy + 24), fill=ink)
    else:
        draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=ink)
    return r * 2


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

    title = "職人料理大腦"
    sub = "MICHELIN CHEF · AI"
    f_title = truetype(font_path, font_idx, 82)
    f_sub = truetype(font_path, font_idx, 26)

    tb = draw.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    sb = draw.textbbox((0, 0), sub, font=f_sub)
    sh = sb[3] - sb[1]
    gap = 4
    block = th + gap + sh
    y0 = (bar_h - block) // 2
    ty_title = y0 - tb[1]
    draw.text(((W - tw) // 2 - tb[0], ty_title), title, font=f_title, fill=(255, 255, 255))
    sw = sb[2] - sb[0]
    ty_sub = y0 + th + gap - sb[1]
    draw.text(((W - sw) // 2 - sb[0], ty_sub), sub, font=f_sub, fill=(233, 223, 202))


def draw_card(
    layer: ImageDraw.ImageDraw,
    x: int,
    y: int,
    cw: int,
    ch: int,
    fill: tuple[int, int, int],
    edge: tuple[int, int, int],
    radius: int = 16,
) -> None:
    inset = 10
    box = [x + inset, y + inset, x + cw - inset, y + ch - inset]
    # 扁平風：極輕微投影
    layer.rounded_rectangle(
        [box[0] + 1, box[1] + 1, box[2] + 1, box[3] + 1],
        radius=radius,
        fill=(236, 232, 226),
    )
    layer.rounded_rectangle(box, radius=radius, fill=fill, outline=edge, width=3)


def draw_cell_label(
    draw: ImageDraw.ImageDraw,
    b: dict,
    icon: str,
    main: str,
    font_path: str,
    font_idx: int,
) -> None:
    x, y, cw, ch = b["x"], b["y"], b["width"], b["height"]
    pad_x, pad_y = 10, 10
    max_w = cw - pad_x * 2
    max_h = ch - pad_y * 2

    font_main: ImageFont.ImageFont | None = None
    icon_w = 104
    for size in range(106, 56, -2):
        f_text = truetype(font_path, font_idx, size)
        bb_text = draw.textbbox((0, 0), main, font=f_text)
        w = icon_w + 18 + (bb_text[2] - bb_text[0])
        h = max(icon_w, bb_text[3] - bb_text[1])
        if w <= max_w and h <= max_h:
            font_main = f_text
            break
    if font_main is None:
        font_main = truetype(font_path, font_idx, 56)

    bb_text = draw.textbbox((0, 0), main, font=font_main)
    w_text = bb_text[2] - bb_text[0]
    h_text = bb_text[3] - bb_text[1]
    badge_w = icon_w
    total_w = badge_w + 18 + w_text
    total_h = max(badge_w, h_text)
    start_x = x + (cw - total_w) // 2
    cy = y + (ch - total_h) // 2

    _draw_icon_badge(
        draw,
        cx=start_x + badge_w // 2,
        cy=cy + max(h_text, badge_w) // 2 - 2,
        icon=icon,
    )
    tx = start_x + badge_w + 18
    draw.text((tx + 1, cy - bb_text[1] + 1), main, font=font_main, fill=(224, 230, 238))
    draw.text((tx, cy - bb_text[1]), main, font=font_main, fill=TEXT_MAIN)


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

    # 六格卡片（在熱區內）- 每格不同色，提升鑑別度
    for idx, a in enumerate(areas):
        b = a["bounds"]
        draw_card(
            draw,
            b["x"],
            b["y"],
            b["width"],
            b["height"],
            fill=CARD_FILL_SET[idx % len(CARD_FILL_SET)],
            edge=CARD_EDGE_SET[idx % len(CARD_EDGE_SET)],
        )

    # 與 JSON label 對齊的完整中文
    rows = [
        ("🏠", "主選單"),
        ("🍳", "隨機配菜"),
        ("❤️", "我的最愛"),
        ("🧊", "清冰箱模式"),
        ("💰", "預算方案"),
        ("🛒", "採買清單"),
    ]
    for a, (icon, zh) in zip(areas, rows):
        draw_cell_label(draw, a["bounds"], icon, zh, font_path, font_idx)

    rgb = base.convert("RGB")
    for q in (93, 88, 82, 76):
        buf = ROOT / f"_richmenu_tmp_q{q}.jpg"
        rgb.save(buf, format="JPEG", quality=q, optimize=True, subsampling=1)
        sz = buf.stat().st_size
        if sz <= LINE_MAX:
            OUT_PATH.unlink(missing_ok=True)
            buf.rename(OUT_PATH)
            print(
                f"✅ 已寫入 {OUT_PATH}（style={STYLE_VERSION}, quality={q}，約 {sz // 1024} KB；字型 {font_path} index={font_idx}）"
            )
            return
        buf.unlink(missing_ok=True)
    sys.exit("❌ 無法壓到 1 MB 以下。")


if __name__ == "__main__":
    main()
