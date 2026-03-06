"""AI service: recipe generation with retry logic and image recognition."""
from __future__ import annotations

import asyncio
import json
import time
import httpx

from openai import APITimeoutError

from app.config import (
    AI_MAX_RETRIES,
    AI_RETRY_EXTRA_PROMPT,
    CUISINE_LABELS,
    DEBUG_MODE,
    LINE_CHANNEL_ACCESS_TOKEN,
    MAX_COMPLETION_TOKENS,
    MAX_HISTORY_TURNS,
    SYSTEM_PROMPT,
    logger,
)
from app.clients import ai_client, AI_MODEL_FOR_CALL
from app.db import (
    get_user_memory,
    get_user_cuisine_context,
    get_user_preferences,
    save_user_memory,
)
from app.helpers import (
    _build_system_prompt,
    _condense_assistant_message,
    _filter_history_after_context,
    _parse_ai_json,
)


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
    from app.helpers import _extract_json
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
    Raises APITimeoutError or other exceptions from the AI client.
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
        ai_content = response.choices[0].message.content.strip()
        usage = getattr(response, "usage", None)

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
            logger.warning("JSON parse failed (attempt %d) for user %s: %s", attempt, user_id, exc)
            continue

    # All attempts failed
    raise ValueError(f"JSON parse failed after {1 + max_retries} attempts: {last_error}") from last_error


# ─── Image Recognition ──────────────────────────────────────────────────────────

async def download_line_image(message_id: str) -> bytes:
    """Download image content from LINE Messaging API."""
    url = f"https://api-data.line.me/v2/bot/message/{message_id}/content"
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
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
    return response.choices[0].message.content.strip()
