"""AI service: recipe generation with retry logic and image recognition."""
from __future__ import annotations

import asyncio
import json
import time
import urllib.parse
import httpx

from app.config import (
    AI_MAX_RETRIES,
    AI_RETRY_EXTRA_PROMPT,
    DEBUG_MODE,
    LINE_CHANNEL_ACCESS_TOKEN,
    MAX_COMPLETION_TOKENS,
    YOUTUBE_API_KEY,
    logger,
)
from app.clients import ai_client, AI_MODEL_FOR_CALL
from app.db import (
    get_user_memory,
    get_user_cuisine_context,
    get_user_preferences,
)
from app.helpers import (
    _extract_json,
    _filter_history_after_context,
    _parse_ai_json,
)
from app.observability import incr


def _recipe_placeholder_image_url(recipe_name: str) -> str:
    quoted = urllib.parse.quote(recipe_name or "Michelin Dish")
    return f"https://placehold.co/600x400/EA580C/FFFFFF?text={quoted}"


async def generate_recipe_image(recipe_name: str) -> str:
    """Generate a recipe image URL, with placeholder fallback on any failure."""
    prompt = (
        "Professional food photography, Michelin star plating, dark slate background, "
        "dramatic top lighting, cinematic depth of field, dish: "
        f"{recipe_name}"
    )
    try:
        response = await ai_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="hd",
            timeout=45.0,
        )
        image_url = (response.data[0].url if getattr(response, "data", None) else None) or ""
        if isinstance(image_url, str) and image_url.startswith("https://"):
            incr("ai.images.generated_total")
            return image_url
    except Exception as exc:
        logger.warning("Image generation failed for recipe %s: %s", recipe_name, exc)
        incr("ai.images.errors_total")
    return _recipe_placeholder_image_url(recipe_name)


async def search_youtube_video(recipe_name: str) -> str | None:
    """Search first YouTube tutorial video; return None if unavailable or failed."""
    if not YOUTUBE_API_KEY:
        return None

    try:
        query = f"{recipe_name} 食譜 教學"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "maxResults": 1,
                    "type": "video",
                    "q": query,
                    "key": YOUTUBE_API_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        items = data.get("items") or []
        if not items:
            return None
        video_id = ((items[0].get("id") or {}).get("videoId") or "").strip()
        if not video_id:
            return None
        incr("youtube.search.success_total")
        return f"https://www.youtube.com/watch?v={video_id}"
    except Exception as exc:
        logger.warning("YouTube search failed for recipe %s: %s", recipe_name, exc)
        incr("youtube.search.errors_total")
        return None


async def _fetch_ai_context(user_id: str) -> tuple[list, list, str | None, str | None]:
    """Parallel DB queries for history, cuisine context, and preferences."""
    full_history, (active_cuisine, context_updated_at), prefs = await asyncio.gather(
        get_user_memory(user_id),
        get_user_cuisine_context(user_id),
        get_user_preferences(user_id),
    )
    filtered = _filter_history_after_context(full_history, context_updated_at)
    return full_history, filtered, active_cuisine, prefs


async def _get_last_recipe_json(user_id: str) -> dict | None:
    """Extract the last recipe JSON from conversation history."""
    history = await get_user_memory(user_id)
    for msg in reversed(history):
        if msg.get("role") != "assistant":
            continue
        try:
            return _extract_json(msg.get("content") or "")
        except (ValueError, json.JSONDecodeError):
            continue
    return None


async def call_ai_with_retry(
    api_messages: list[dict],
    *,
    max_retries: int = AI_MAX_RETRIES,
    user_id: str = "",
) -> tuple[str, dict]:
    """
    Call AI and parse JSON response. On JSON parse failure, retry with a stricter prompt.
    Returns (raw_ai_content, parsed_dict).
    Raises ValueError if all retries fail JSON parsing.
    Raises exceptions from the OpenAI-compatible client (例如逾時、認證錯誤)。
    """
    last_raw = ""
    last_error: Exception | None = None

    for attempt in range(1 + max_retries):
        messages = list(api_messages)

        # On retry, add an extra system message demanding pure JSON
        if attempt > 0:
            messages.append({"role": "user", "content": AI_RETRY_EXTRA_PROMPT})
            logger.info("AI retry %d/%d for user %s", attempt, max_retries, user_id)

        t0 = time.perf_counter()
        response = await ai_client.chat.completions.create(
            model=AI_MODEL_FOR_CALL,
            messages=messages,
            temperature=0.3,
            max_tokens=MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            timeout=45.0,
        )
        elapsed = time.perf_counter() - t0
        incr("ai.calls_total")
        incr("ai.latency_seconds_total", elapsed)
        ai_content = response.choices[0].message.content.strip()
        usage = getattr(response, "usage", None)
        if usage:
            incr("ai.tokens.input_total", getattr(usage, "prompt_tokens", 0) or 0)
            incr("ai.tokens.output_total", getattr(usage, "completion_tokens", 0) or 0)

        if DEBUG_MODE:
            logger.debug(
                "AI user=%s attempt=%d elapsed=%.2fs input_tokens=%s output_tokens=%s",
                user_id, attempt, elapsed,
                getattr(usage, "prompt_tokens", "-") if usage else "-",
                getattr(usage, "completion_tokens", "-") if usage else "-",
            )
            logger.debug("AI raw output for user %s: %s", user_id, ai_content[:200])
        elif usage and (usage.prompt_tokens or usage.completion_tokens):
            logger.info(
                "AI user=%s elapsed=%.2fs tokens=%s+%s",
                user_id, elapsed, usage.prompt_tokens or 0, usage.completion_tokens or 0,
            )

        last_raw = ai_content
        try:
            parsed = _parse_ai_json(ai_content)
            return ai_content, parsed
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            incr("ai.errors.json_parse_total")
            logger.warning("JSON parse failed (attempt %d) for user %s: %s", attempt, user_id, exc)
            continue

    # All attempts failed — attach raw AI response to the exception for fallback use
    err = ValueError(f"JSON parse failed after {1 + max_retries} attempts: {last_error}")
    err.raw_content = last_raw  # type: ignore[attr-defined]
    raise err from last_error


# ─── Image Recognition ──────────────────────────────────────────────────────────

async def download_line_image(message_id: str) -> bytes:
    """Download image content from LINE Messaging API."""
    url = f"https://api-data.line.me/v2/bot/message/{message_id}/content"
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        incr("line.images.download_total")
        return resp.content


async def identify_ingredients_from_image(image_bytes: bytes) -> str:
    """
    Use Gemini's vision capability to identify food ingredients in an image.
    Returns a comma-separated string of identified ingredients.
    """
    import base64

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    vision_prompt = (
        "請仔細觀察這張照片，辨識出所有可見的食材、食物或食品。"
        "只列出食材名稱，用頓號（、）分隔。"
        "如果看不出是食物相關的照片，回覆「無法辨識食材」。"
        "範例格式：番茄、雞蛋、洋蔥、牛肉"
    )

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                },
                {"type": "text", "text": vision_prompt},
            ],
        }
    ]

    response = await ai_client.chat.completions.create(
        model=AI_MODEL_FOR_CALL,
        messages=messages,
        temperature=0.2,
        max_tokens=256,
        timeout=30.0,
    )
    incr("ai.vision.calls_total")
    return response.choices[0].message.content.strip()
