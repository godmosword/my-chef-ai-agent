"""Render recipe poster PNGs from existing recipe JSON."""
from __future__ import annotations

import io
import logging
import os
import urllib.error
import urllib.request
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from app.helpers import _flex_safe_https_url, _parse_to_list, _safe_str

logger = logging.getLogger(__name__)

W = 1200
H = 1800
BG = (249, 247, 244)          # 溫暖米白底色
CARD = (255, 255, 255)         # 白色卡片
CARD_BORDER = (234, 228, 220)  # 米色邊框
TITLE = (28, 25, 23)           # 深棕黑標題
SUBTITLE = (156, 143, 132)     # 暖灰輔助
BODY = (61, 53, 48)            # 溫暖深棕內文
MUTED = (156, 143, 132)        # 暖灰
ACCENT = (200, 146, 42)        # 琥珀金
ACCENT_LIGHT = (245, 239, 230) # 淡金底色
STEP_BADGE = (42, 96, 73)      # 深森綠徽章
STEP_BADGE_TEXT = (245, 240, 230)  # 米白文字

FONT_PROBE = "米其林職人大腦辣炒杏鮑菇高麗菜食材步驟小撇步調味比例"
LINUX_NOTO_PRIORITIES: list[str] = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
]
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
    # In Linux containers (Render/Docker), prefer known Noto CJK paths first.
    if os.name == "posix" and os.uname().sysname.lower() != "darwin":
        for path in LINUX_NOTO_PRIORITIES:
            if not os.path.isfile(path):
                continue
            for idx in range(16):
                try:
                    font = ImageFont.truetype(path, 72, index=idx)
                except OSError:
                    continue
                if _measure_width(font, FONT_PROBE) < 280:
                    continue
                return (path, idx)

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
        logger.warning("no CJK font found; fallback to PIL default font")
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
    logger.info("using font %s (index=%s)", path, idx)
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


def _fetch_recipe_photo(photo_url: str) -> Image.Image | None:
    safe_url = _flex_safe_https_url(photo_url)
    if not safe_url:
        return None
    req = urllib.request.Request(
        safe_url,
        headers={
            "User-Agent": "my-chef-ai-agent/recipe-poster",
            "Accept": "image/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = resp.read(8 * 1024 * 1024 + 1)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError, ValueError):
        return None
    if not payload or len(payload) > 8 * 1024 * 1024:
        return None
    try:
        image = Image.open(io.BytesIO(payload))
        image.load()
    except Exception:
        return None
    return image.convert("RGB")


def _cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    src_w, src_h = image.size
    if src_w <= 0 or src_h <= 0:
        return image.resize(size)
    scale = max(target_w / src_w, target_h / src_h)
    resized = image.resize((max(1, int(src_w * scale)), max(1, int(src_h * scale))), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, (resized.height - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def _paste_recipe_photo(base: Image.Image, photo_url: str, box: tuple[int, int, int, int], radius: int = 28) -> bool:
    photo = _fetch_recipe_photo(photo_url)
    if photo is None:
        return False
    target = _cover_crop(photo, (box[2] - box[0], box[3] - box[1]))
    mask = Image.new("L", target.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target.width, target.height), radius=radius, fill=255)
    base.paste(target, box[:2], mask)
    return True


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


def _derive_cook_time(steps: list[str]) -> str:
    n = len(steps)
    minutes = max(10, min(30, n * 4 + 2))
    return f"約 {minutes} 分鐘"


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
    title_box = (margin, margin, W - margin, 340)
    ing_box = (margin, 370, W - margin, 720)
    steps_box = (margin, 750, W - margin, 1380)
    tips_box = (margin, 1410, 760, H - margin)
    summary_box = (790, 1410, W - margin, H - margin)

    for box in (title_box, ing_box, steps_box, tips_box, summary_box):
        _draw_round_box(draw, box, fill=CARD, outline=CARD_BORDER)

    recipe_name = _safe_str(recipe_data.get("recipe_name"), "本日料理", max_len=48)
    theme = _safe_str(recipe_data.get("theme"), "家常上桌", max_len=32)
    subtitle = f"{theme}・附成品主圖、適合手機閱讀的食譜海報"
    photo_url = _safe_str(recipe_data.get("photo_url"), "", max_len=2000)
    has_photo = False
    photo_box = (748, 62, W - 72, 314)
    if photo_url:
        has_photo = _paste_recipe_photo(image, photo_url, photo_box)
        if has_photo:
            draw.rounded_rectangle(photo_box, radius=28, outline=CARD_BORDER, width=2)
    text_right = 700 if has_photo else W - 72
    title_y = _draw_wrapped_text(
        draw,
        text=recipe_name,
        xy=(72, 62),
        font=fonts.title,
        fill=TITLE,
        max_width=text_right - 72,
        line_gap=8,
        max_lines=2,
    )
    draw.text((72, title_y + 10), subtitle, font=fonts.subtitle, fill=SUBTITLE)
    if has_photo:
        draw.text((760, 74), "成品主圖", font=fonts.body_small, fill=TITLE)

    draw.text((72, 394), "食材清單", font=fonts.section, fill=STEP_BADGE)
    ingredients = _parse_to_list(recipe_data.get("ingredients", []))
    left_x = 78
    right_x = 620
    y_left = 452
    y_right = 452
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
        draw.text((72, 630), "採買提示", font=fonts.body_small, fill=MUTED)
        _draw_wrapped_text(
            draw,
            text=" / ".join(shopping[:3]),
            xy=(72, 664),
            font=fonts.body_small,
            fill=BODY,
            max_width=1020,
            line_gap=6,
            max_lines=2,
        )

    draw.text((72, 774), "料理步驟", font=fonts.section, fill=STEP_BADGE)
    steps = [str(s).strip() for s in _parse_to_list(recipe_data.get("steps", [])) if str(s).strip()]
    step_positions = [
        (72, 836), (620, 836),
        (72, 1036), (620, 1036),
        (72, 1236), (620, 1236),
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

    draw.text((72, 1434), "小撇步", font=fonts.section, fill=STEP_BADGE)
    tips = _derive_quick_tips(recipe_data)
    tip_y = 1492
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

    draw.text((818, 1434), "摘要", font=fonts.section, fill=STEP_BADGE)
    time_text, cost_text = _derive_summary(recipe_data)
    draw.text((826, 1512), "料理時間", font=fonts.body_small, fill=MUTED)
    draw.text((826, 1556), time_text, font=fonts.section, fill=TITLE)
    draw.text((826, 1632), "預估成本", font=fonts.body_small, fill=MUTED)
    draw.text((826, 1676), cost_text, font=fonts.section, fill=TITLE)
    footer = "米其林職人大腦・Recipe Poster"
    box = draw.textbbox((0, 0), footer, font=fonts.body_small)
    draw.text((W - margin - (box[2] - box[0]), H - margin - 36), footer, font=fonts.body_small, fill=MUTED)

    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
