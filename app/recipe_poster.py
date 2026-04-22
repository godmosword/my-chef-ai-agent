"""Render recipe poster PNGs from existing recipe JSON."""
from __future__ import annotations

import io
import os
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from app.helpers import _parse_to_list, _safe_str

W = 1200
H = 1800
BG = (247, 243, 235)
CARD = (255, 252, 246)
CARD_BORDER = (203, 191, 170)
TITLE = (68, 44, 24)
SUBTITLE = (66, 102, 62)
BODY = (53, 51, 47)
MUTED = (112, 106, 95)
ACCENT = (46, 102, 58)
ACCENT_LIGHT = (236, 245, 234)
STEP_BADGE = (242, 132, 31)
STEP_BADGE_TEXT = (255, 255, 255)

FONT_PROBE = "米其林職人大腦辣炒杏鮑菇高麗菜食材步驟小撇步調味比例"
FONT_CANDIDATES: list[tuple[str, int]] = []
for _path, _max in (
    ("/System/Library/Fonts/PingFang.ttc", 60),
    ("/System/Library/Fonts/STHeiti Medium.ttc", 16),
    ("/System/Library/Fonts/STHeiti Light.ttc", 16),
    ("/System/Library/Fonts/Supplemental/Songti.ttc", 16),
    ("/System/Library/Fonts/Supplemental/Songti SC.ttc", 16),
    ("/Library/Fonts/Songti.ttc", 8),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 16),
    ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc", 16),
    ("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", 16),
    ("/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc", 16),
    ("/usr/share/fonts/truetype/arphic/uming.ttc", 8),
    ("/usr/share/fonts/truetype/arphic/ukai.ttc", 8),
):
    if os.path.isfile(_path):
        FONT_CANDIDATES.append((_path, _max))


@dataclass(frozen=True)
class Fonts:
    title: ImageFont.ImageFont
    subtitle: ImageFont.ImageFont
    section: ImageFont.ImageFont
    body: ImageFont.ImageFont
    body_small: ImageFont.ImageFont
    badge: ImageFont.ImageFont


def _measure_width(font: ImageFont.ImageFont, text: str) -> int:
    img = Image.new("RGB", (4, 4))
    draw = ImageDraw.Draw(img)
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def _pick_font_face() -> tuple[str, int] | None:
    best: tuple[str, int] | None = None
    best_score = -1
    for path, max_idx in FONT_CANDIDATES:
        for idx in range(max_idx):
            try:
                font = ImageFont.truetype(path, 72, index=idx)
            except OSError:
                continue
            score = _measure_width(font, FONT_PROBE)
            if score < 280:
                continue
            if score > best_score:
                best_score = score
                best = (path, idx)
    return best


def _truetype(path: str, idx: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=idx)


def _load_fonts() -> Fonts:
    best = _pick_font_face()
    if best is None:
        fallback = ImageFont.load_default()
        return Fonts(
            title=fallback,
            subtitle=fallback,
            section=fallback,
            body=fallback,
            body_small=fallback,
            badge=fallback,
        )
    path, idx = best
    return Fonts(
        title=_truetype(path, idx, 66),
        subtitle=_truetype(path, idx, 30),
        section=_truetype(path, idx, 34),
        body=_truetype(path, idx, 28),
        body_small=_truetype(path, idx, 24),
        badge=_truetype(path, idx, 30),
    )


def _draw_round_box(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], *, fill, outline, radius: int = 24) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.splitlines() or [text]
    lines: list[str] = []
    for raw in words:
        raw = raw.strip()
        if not raw:
            continue
        current = ""
        for ch in raw:
            candidate = current + ch
            box = draw.textbbox((0, 0), candidate, font=font)
            width = box[2] - box[0]
            if width <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = ch
        if current:
            lines.append(current)
    return lines or [""]


def _draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    *,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.ImageFont,
    fill,
    max_width: int,
    line_gap: int = 10,
    max_lines: int | None = None,
) -> int:
    lines = _wrap_text(draw, text, font, max_width)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        if len(lines[-1]) > 1:
            lines[-1] = lines[-1][:-1] + "…"
    _, y = xy
    x = xy[0]
    box = draw.textbbox((0, 0), "測試", font=font)
    line_h = box[3] - box[1]
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_h + line_gap
    return y


def _derive_quick_tips(recipe_data: dict) -> list[str]:
    steps = [str(s).strip() for s in _parse_to_list(recipe_data.get("steps", [])) if str(s).strip()]
    ingredients = _parse_to_list(recipe_data.get("ingredients", []))
    ingredient_names = [
        _safe_str(item.get("name", item.get("食材", "")) if isinstance(item, dict) else item, "")
        for item in ingredients
    ]
    ingredient_names = [name for name in ingredient_names if name]
    tips: list[str] = []
    if ingredient_names:
        tips.append(f"食材先備妥：{ '、'.join(ingredient_names[:4]) }。")
    if steps:
        tips.append(f"起手關鍵：{_safe_str(steps[0], '先熱鍋再下料', max_len=26)}")
    if len(steps) > 1:
        tips.append(f"收尾提醒：{_safe_str(steps[-1], '起鍋前試味道', max_len=26)}")
    shopping = [str(s).strip() for s in _parse_to_list(recipe_data.get("shopping_list", [])) if str(s).strip()]
    if shopping:
        tips.append(f"採買提示：{_safe_str(shopping[0], '先補齊主食材', max_len=26)}")
    return tips[:4] or ["照步驟快速拌炒，依口味再微調鹹度與火候。"]


def _derive_summary(recipe_data: dict) -> tuple[str, str]:
    steps = [str(s).strip() for s in _parse_to_list(recipe_data.get("steps", [])) if str(s).strip()]
    cost = _safe_str(recipe_data.get("estimated_total_cost"), "估算中")
    minutes = max(10, min(30, len(steps) * 4 + 2))
    return (f"約 {minutes} 分鐘", f"NT$ {cost}")


def render_recipe_poster_png(recipe_data: dict) -> bytes:
    """Render a single-page recipe poster PNG from the existing recipe JSON."""
    fonts = _load_fonts()
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)

    margin = 36
    title_box = (margin, margin, W - margin, 220)
    ing_box = (margin, 250, W - margin, 620)
    steps_box = (margin, 650, W - margin, 1360)
    tips_box = (margin, 1390, 760, H - margin)
    summary_box = (790, 1390, W - margin, H - margin)

    for box in (title_box, ing_box, steps_box, tips_box, summary_box):
        _draw_round_box(draw, box, fill=CARD, outline=CARD_BORDER)

    recipe_name = _safe_str(recipe_data.get("recipe_name"), "本日料理", max_len=48)
    theme = _safe_str(recipe_data.get("theme"), "家常上桌", max_len=32)
    subtitle = f"{theme}・結構清楚、適合手機閱讀的食譜海報"
    draw.text((72, 62), recipe_name, font=fonts.title, fill=TITLE)
    draw.text((72, 142), subtitle, font=fonts.subtitle, fill=SUBTITLE)

    draw.text((72, 274), "食材清單", font=fonts.section, fill=ACCENT)
    ingredients = _parse_to_list(recipe_data.get("ingredients", []))
    left_x = 78
    right_x = 620
    y_left = 332
    y_right = 332
    for idx, item in enumerate(ingredients[:8]):
        if isinstance(item, dict):
            name = _safe_str(item.get("name", item.get("食材", "食材")), "食材")
            price = _safe_str(item.get("price", item.get("價格", "")), "")
            line = f"• {name}" + (f"　{price}" if price else "")
        else:
            line = f"• {_safe_str(item, '食材')}"
        x = left_x if idx % 2 == 0 else right_x
        y = y_left if idx % 2 == 0 else y_right
        y_next = _draw_wrapped_text(
            draw,
            text=line,
            xy=(x, y),
            font=fonts.body,
            fill=BODY,
            max_width=440,
            line_gap=6,
            max_lines=2,
        )
        if idx % 2 == 0:
            y_left = y_next + 12
        else:
            y_right = y_next + 12
    shopping = [str(s).strip() for s in _parse_to_list(recipe_data.get("shopping_list", [])) if str(s).strip()]
    if shopping:
        draw.text((72, 530), "採買提示", font=fonts.body_small, fill=MUTED)
        _draw_wrapped_text(
            draw,
            text=" / ".join(shopping[:3]),
            xy=(72, 564),
            font=fonts.body_small,
            fill=BODY,
            max_width=1020,
            line_gap=6,
            max_lines=2,
        )

    draw.text((72, 674), "料理步驟", font=fonts.section, fill=ACCENT)
    steps = [str(s).strip() for s in _parse_to_list(recipe_data.get("steps", [])) if str(s).strip()]
    step_positions = [
        (72, 736), (620, 736),
        (72, 956), (620, 956),
        (72, 1176), (620, 1176),
    ]
    for idx, step in enumerate(steps[:6]):
        x, y = step_positions[idx]
        badge_box = (x, y, x + 62, y + 62)
        _draw_round_box(draw, badge_box, fill=STEP_BADGE, outline=STEP_BADGE, radius=31)
        draw.text((x + 20, y + 11), str(idx + 1), font=fonts.badge, fill=STEP_BADGE_TEXT)
        _draw_round_box(draw, (x + 82, y, x + 470, y + 168), fill=ACCENT_LIGHT, outline=CARD_BORDER, radius=20)
        _draw_wrapped_text(
            draw,
            text=step,
            xy=(x + 108, y + 24),
            font=fonts.body,
            fill=BODY,
            max_width=332,
            line_gap=10,
            max_lines=4,
        )

    draw.text((72, 1414), "小撇步", font=fonts.section, fill=ACCENT)
    tips = _derive_quick_tips(recipe_data)
    tip_y = 1472
    for tip in tips:
        draw.text((74, tip_y), "★", font=fonts.body, fill=STEP_BADGE)
        tip_y = _draw_wrapped_text(
            draw,
            text=tip,
            xy=(114, tip_y - 2),
            font=fonts.body_small,
            fill=BODY,
            max_width=580,
            line_gap=6,
            max_lines=2,
        ) + 10

    draw.text((818, 1414), "摘要", font=fonts.section, fill=ACCENT)
    time_text, cost_text = _derive_summary(recipe_data)
    draw.text((826, 1492), "料理時間", font=fonts.body_small, fill=MUTED)
    draw.text((826, 1536), time_text, font=fonts.section, fill=TITLE)
    draw.text((826, 1612), "預估成本", font=fonts.body_small, fill=MUTED)
    draw.text((826, 1656), cost_text, font=fonts.section, fill=TITLE)
    footer = "米其林職人大腦・Recipe Poster"
    box = draw.textbbox((0, 0), footer, font=fonts.body_small)
    draw.text((W - margin - (box[2] - box[0]), H - margin - 36), footer, font=fonts.body_small, fill=MUTED)

    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
