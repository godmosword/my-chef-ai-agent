"""Two-stage recipe card generator (base image + Traditional Chinese text overlay)."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

import httpx
from openai import AsyncOpenAI
from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.config import OPENAI_GPT_IMAGE_MODEL_ID, resolve_openai_image_api_key
from app.helpers import _parse_to_list

CANVAS_W = 1200
CANVAS_H = 1500

# Tier-A editorial accent (section headers, step badges); hero embed uses rounded rect.
_SECTION_RGB = (32, 85, 68)
_STEP_BADGE_RGB = (200, 95, 40)
_HERO_BOX = (708, 42, 1148, 292)  # top-right, below full-width title band


@dataclass(frozen=True)
class PrepItem:
    name: str
    note: str


@dataclass(frozen=True)
class StepItem:
    title: str
    description: str


@dataclass(frozen=True)
class RecipeCardData:
    title: str
    subtitle: str
    serving: str
    ingredients: list[str]
    prep: list[PrepItem]
    steps: list[StepItem]
    tips: list[str]
    seasoning: list[str]
    cook_time: str

    @staticmethod
    def from_dict(payload: dict) -> "RecipeCardData":
        prep = [PrepItem(name=str(i.get("name", "")).strip(), note=str(i.get("note", "")).strip()) for i in (payload.get("prep") or []) if isinstance(i, dict)]
        steps = [
            StepItem(title=str(i.get("title", "")).strip(), description=str(i.get("description", "")).strip())
            for i in (payload.get("steps") or [])
            if isinstance(i, dict)
        ]
        return RecipeCardData(
            title=str(payload.get("title", "本日料理")).strip() or "本日料理",
            subtitle=str(payload.get("subtitle", "美味上桌")).strip() or "美味上桌",
            serving=str(payload.get("serving", "1人份")).strip() or "1人份",
            ingredients=[str(i).strip() for i in (payload.get("ingredients") or []) if str(i).strip()],
            prep=prep[:2],
            steps=steps[:6],
            tips=[str(i).strip() for i in (payload.get("tips") or []) if str(i).strip()][:4],
            seasoning=[str(i).strip() for i in (payload.get("seasoning") or []) if str(i).strip()][:4],
            cook_time=str(payload.get("cookTime") or payload.get("cook_time") or "約15分鐘").strip() or "約15分鐘",
        )


def _paste_rounded_hero(canvas: Image.Image, hero_image_path: str, box: tuple[int, int, int, int]) -> None:
    """Paste a cover-cropped hero photo with rounded corners (RGB canvas)."""
    try:
        im = Image.open(hero_image_path).convert("RGBA")
    except OSError:
        return
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if w < 32 or h < 32:
        return
    fitted = ImageOps.fit(im, (w, h), Image.Resampling.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=22, fill=255)
    canvas.paste(fitted.convert("RGB"), (x0, y0), mask)


def _normalize_tip_bullets(data: object) -> list[str]:
    """Turn tips or shopping_list entries into short lines (avoid str(dict) in card)."""
    lines: list[str] = []
    for raw in _parse_to_list(data):
        if isinstance(raw, dict):
            name = str(raw.get("name") or raw.get("item") or "").strip()
            extra = str(
                raw.get("amount") or raw.get("qty") or raw.get("quantity") or raw.get("note") or ""
            ).strip()
            if name and extra:
                lines.append(f"{name} {extra}")
            elif name:
                lines.append(name)
            elif extra:
                lines.append(extra)
        else:
            s = str(raw).strip()
            if s:
                lines.append(s)
    return lines


def build_base_image_prompt(recipe: RecipeCardData) -> str:
    """Build Stage A prompt for GPT Image visual base generation."""
    step_hints = "\n".join(f"{idx + 1}. {s.title} ({s.description[:24]})" for idx, s in enumerate(recipe.steps[:6]))
    if not step_hints:
        step_hints = "1. prep\n2. stir-fry\n3. plate"
    ingredients_hint = "、".join(recipe.ingredients[:6])
    return (
        "Create a Taiwanese recipe infographic base (LINE card). "
        "Visual structure only; text will be overlaid later by code.\n"
        "Rules: sparse readable text; no long Chinese paragraphs; no watermark/logo/brand.\n"
        "Layout: vertical 4:5; warm off-white; editorial grid; mobile spacing; "
        "placeholders for title, hero, ingredients, prep, steps, tips, seasoning, cook time.\n"
        f"Dish: {recipe.title}; realistic home stir-fry; ingredients: {ingredients_hint}.\n"
        f"Step cues:\n{step_hints}\n"
        "Tone: premium cookbook, rounded cards, subtle shadows, clear hierarchy, low clutter."
    ).strip()


def _load_font(size: int, *, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "fonts/NotoSansTC-Bold.ttf" if bold else "fonts/NotoSansTC-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in (text or "").splitlines() or [""]:
        cur = ""
        for ch in paragraph:
            nxt = cur + ch
            w = draw.textbbox((0, 0), nxt, font=font)[2]
            if w <= max_width or not cur:
                cur = nxt
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    return lines or [""]


def _draw_text_block(
    draw: ImageDraw.ImageDraw,
    *,
    text: str,
    x: int,
    y: int,
    width: int,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int],
    line_gap: int = 6,
    max_lines: int | None = None,
) -> int:
    lines = _wrap_text(draw, text, font, width)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = (lines[-1][:-1] + "…") if len(lines[-1]) > 1 else lines[-1]
    line_h = draw.textbbox((0, 0), "測試", font=font)[3]
    cy = y
    for line in lines:
        draw.text((x, cy), line, font=font, fill=fill)
        cy += line_h + line_gap
    return cy


async def generate_base_image(
    recipe: RecipeCardData,
    *,
    output_path: str,
    size: str = "1024x1024",
    model: str | None = None,
) -> str:
    """Stage A: generate visual base image via OpenAI image API."""
    api_key = resolve_openai_image_api_key()
    if not api_key:
        raise RuntimeError("Missing IMAGE_OPENAI_API_KEY/OPENAI_API_KEY for base image generation")
    resolved_model = (model or OPENAI_GPT_IMAGE_MODEL_ID).strip() or OPENAI_GPT_IMAGE_MODEL_ID
    client = AsyncOpenAI(api_key=api_key)
    prompt = build_base_image_prompt(recipe)
    result = await client.images.generate(model=resolved_model, prompt=prompt, size=size)
    data = getattr(result, "data", None) or []
    if not data:
        raise RuntimeError("Image API returned empty data")
    first = data[0]
    b64 = getattr(first, "b64_json", None)
    if b64:
        payload = base64.b64decode(b64)
    else:
        url = getattr(first, "url", None) or (first.get("url") if isinstance(first, dict) else None)
        if not isinstance(url, str) or not (url.startswith("https://") or url.startswith("http://")):
            raise RuntimeError("Image API response missing b64_json and retrievable url")
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as http_client:
            resp = await http_client.get(url)
            resp.raise_for_status()
            payload = resp.content
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return str(path)


def compose_recipe_card(
    *,
    recipe: RecipeCardData,
    base_image_path: str,
    output_path: str,
    hero_image_path: str | None = None,
) -> str:
    """Stage B: overlay Traditional Chinese text on top of generated base image.

    When ``hero_image_path`` is set (Tier A), a rounded hero thumbnail is composited
    top-right after all vector/text layers so the finished dish appears on-card.
    """
    base = Image.open(base_image_path).convert("RGB")
    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (248, 244, 236))

    bg = base.resize((CANVAS_W, CANVAS_H), Image.Resampling.LANCZOS)
    bg = Image.blend(bg, Image.new("RGB", (CANVAS_W, CANVAS_H), (248, 244, 236)), alpha=0.45)
    canvas.paste(bg, (0, 0))

    draw = ImageDraw.Draw(canvas)
    title_font = _load_font(52, bold=True)
    subtitle_font = _load_font(28)
    section_font = _load_font(26, bold=True)
    body_font = _load_font(24)
    small_font = _load_font(22)

    def card(box: tuple[int, int, int, int], fill=(255, 255, 255, 220)) -> None:
        layer = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), fill)
        mask = Image.new("L", layer.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, layer.size[0], layer.size[1]), radius=24, fill=255)
        canvas.paste(layer, box[:2], mask)
        draw.rounded_rectangle(box, radius=24, outline=(226, 216, 203), width=2)

    # main blocks
    title_box = (40, 30, 660, 200)
    ing_box = (40, 220, 620, 460)
    prep_box = (40, 470, 620, 730)
    steps_box = (40, 760, 1160, 1260)
    tips_box = (40, 1270, 620, 1460)
    seasoning_box = (640, 1270, 930, 1460)
    time_box = (950, 1270, 1160, 1460)

    for b in (title_box, ing_box, prep_box, steps_box, tips_box, seasoning_box, time_box):
        card(b)

    title_w = 580 if hero_image_path else 560
    _draw_text_block(draw, text=recipe.title, x=60, y=54, width=title_w, font=title_font, fill=(42, 36, 28), max_lines=2)
    _draw_text_block(draw, text=f"{recipe.subtitle}｜{recipe.serving}", x=60, y=138, width=title_w, font=subtitle_font, fill=(112, 99, 85), max_lines=1)

    draw.text((60, 238), "食材", font=section_font, fill=_SECTION_RGB)
    y = 278
    for item in recipe.ingredients[:10]:
        y = _draw_text_block(draw, text=f"• {item}", x=66, y=y, width=530, font=body_font, fill=(53, 45, 35), max_lines=1)

    draw.text((60, 488), "前置處理", font=section_font, fill=_SECTION_RGB)
    y = 528
    for p in recipe.prep[:2]:
        y = _draw_text_block(draw, text=f"• {p.name}：{p.note}", x=66, y=y, width=530, font=small_font, fill=(53, 45, 35), max_lines=2)

    draw.text((60, 778), "料理步驟", font=section_font, fill=_SECTION_RGB)
    step_w = 350
    step_h = 210
    start_x, start_y = 58, 820
    for idx, step in enumerate(recipe.steps[:6]):
        col = idx % 3
        row = idx // 3
        x1 = start_x + col * (step_w + 18)
        y1 = start_y + row * (step_h + 14)
        x2, y2 = x1 + step_w, y1 + step_h
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=(255, 252, 247), outline=(230, 220, 207), width=2)
        draw.ellipse((x1 + 12, y1 + 10, x1 + 52, y1 + 50), fill=_STEP_BADGE_RGB)
        draw.text((x1 + 24, y1 + 17), str(idx + 1), font=_load_font(22, bold=True), fill=(255, 255, 255))
        _draw_text_block(draw, text=step.title, x=x1 + 60, y=y1 + 14, width=step_w - 76, font=small_font, fill=(59, 45, 30), max_lines=1)
        _draw_text_block(draw, text=step.description, x=x1 + 16, y=y1 + 56, width=step_w - 28, font=_load_font(20), fill=(74, 58, 39), max_lines=4)

    draw.text((60, 1288), "小撇步", font=section_font, fill=_SECTION_RGB)
    y = 1328
    for tip in recipe.tips[:4]:
        y = _draw_text_block(draw, text=f"• {tip}", x=66, y=y, width=540, font=_load_font(20), fill=(53, 45, 35), max_lines=2)

    draw.text((660, 1288), "調味比例", font=section_font, fill=_SECTION_RGB)
    y = 1328
    for s in recipe.seasoning[:4]:
        y = _draw_text_block(draw, text=f"• {s}", x=662, y=y, width=250, font=_load_font(20), fill=(53, 45, 35), max_lines=1)

    draw.text((970, 1288), "時間", font=section_font, fill=_SECTION_RGB)
    _draw_text_block(draw, text=recipe.cook_time, x=972, y=1338, width=170, font=_load_font(24, bold=True), fill=(53, 45, 35), max_lines=2)

    if hero_image_path:
        _paste_rounded_hero(canvas, hero_image_path, _HERO_BOX)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, format="PNG")
    return str(out)


def load_recipe_json(path: str) -> RecipeCardData:
    with open(path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    return RecipeCardData.from_dict(payload)


def recipe_card_data_from_recipe_json(recipe_data: dict) -> RecipeCardData:
    """Map existing recipe JSON schema to recipe-card schema."""
    steps_raw = recipe_data.get("steps") or []
    normalized_steps: list[dict] = []
    for idx, step in enumerate(steps_raw):
        text = str(step).strip() if not isinstance(step, dict) else str(step.get("description") or step.get("content") or "").strip()
        title = (
            str(step.get("title") or step.get("name") or "").strip()
            if isinstance(step, dict)
            else f"步驟 {idx + 1}"
        )
        normalized_steps.append({"title": title or f"步驟 {idx + 1}", "description": text or "依序完成料理。"})

    tips_src = recipe_data.get("tips")
    if tips_src:
        tip_lines = _normalize_tip_bullets(tips_src)
    else:
        tip_lines = _normalize_tip_bullets(recipe_data.get("shopping_list") or [])

    return RecipeCardData.from_dict(
        {
            "title": recipe_data.get("recipe_name") or "本日料理",
            "subtitle": f"{recipe_data.get('theme') or '家常上桌'}・LINE 食譜卡",
            "serving": recipe_data.get("serving") or "2人份",
            "ingredients": [
                item.get("name", str(item)).strip() if isinstance(item, dict) else str(item).strip()
                for item in (recipe_data.get("ingredients") or [])
            ],
            "prep": recipe_data.get("prep") or [],
            "steps": normalized_steps,
            "tips": tip_lines,
            "seasoning": recipe_data.get("seasoning") or [],
            "cookTime": recipe_data.get("cookTime") or recipe_data.get("cook_time") or "約15分鐘",
        }
    )


async def _download_hero_photo_to_tmp(url: str, tmpdir: str) -> str | None:
    if not (isinstance(url, str) and url.startswith("https://")):
        return None
    try:
        import httpx

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            ctype = (resp.headers.get("content-type") or "").lower()
            ext = ".jpg" if "jpeg" in ctype or "jpg" in ctype else ".png"
            hero_file = Path(tmpdir) / f"hero{ext}"
            hero_file.write_bytes(resp.content)
            return str(hero_file)
    except Exception:
        return None


async def generate_recipe_card_png(recipe_data: dict) -> bytes:
    """Run Stage A + Stage B and return final recipe card PNG bytes."""
    mapped = recipe_card_data_from_recipe_json(recipe_data)
    with tempfile.TemporaryDirectory(prefix="recipe-card-") as tmpdir:
        url = recipe_data.get("photo_url")
        base_path = str(Path(tmpdir) / "base.png")
        final_path = str(Path(tmpdir) / "final.png")
        hero_path, _ = await asyncio.gather(
            _download_hero_photo_to_tmp(url, tmpdir),
            generate_base_image(mapped, output_path=base_path),
        )
        compose_recipe_card(
            recipe=mapped,
            base_image_path=base_path,
            output_path=final_path,
            hero_image_path=hero_path,
        )
        return Path(final_path).read_bytes()
