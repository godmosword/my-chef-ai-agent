"""AI service: recipe generation with retry logic and image recognition."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import random
import time
import urllib.parse
from datetime import timedelta

import httpx
from openai import APIConnectionError, APITimeoutError, RateLimitError
from openai import AsyncOpenAI

from app.config import (
    AI_IMAGE_BASE_DELAY_SEC,
    AI_IMAGE_MAX_RETRIES,
    AI_IMAGE_TIMEOUT_SEC,
    AI_MAX_RETRIES,
    AI_CHAT_TIMEOUT_SEC,
    AI_IMAGE_TIMEOUT_SEC,
    AI_RETRY_EXTRA_PROMPT,
    AI_TRUNCATION_RECOVERY_PROMPT,
    AI_TRANSPORT_BASE_DELAY_SEC,
    AI_TRANSPORT_MAX_RETRIES,
    AI_VISION_TIMEOUT_SEC,
    DEBUG_MODE,
    GCP_PROJECT_ID,
    GCS_SIGNED_URL_TTL_SEC,
    IMAGE_CACHE_TTL_SEC,
    IMAGE_OPENAI_API_KEY,
    IMAGE_PUBLIC_BASE_URL,
    IMAGE_PROVIDER,
    LINE_CHANNEL_ACCESS_TOKEN,
    MAX_COMPLETION_TOKENS,
    VERTEX_IMAGEN_MODEL,
    VERTEX_IMAGEN_OUTPUT_GCS_URI,
    VERTEX_LOCATION,
    YOUTUBE_CACHE_TTL_SEC,
    YOUTUBE_API_KEY,
    YOUTUBE_SEARCH_TIMEOUT_SEC,
    logger,
)
from app.clients import ai_client, AI_MODEL_FOR_CALL
from app.db import (
    get_user_memory,
    get_user_cuisine_context,
    get_user_preferences,
)
from app.image_cache import _memory_cache, get_cached_image_url, set_cached_image_url
from app.helpers import (
    _extract_json,
    _filter_history_after_context,
    _parse_ai_json,
)
from app.observability import incr
from app.media_storage import store_recipe_png


async def _chat_completions_create_resilient(*, user_id: str, **kwargs: object):
    """
    chat.completions.create with exponential backoff on 429, timeouts, and connection errors.
    JSON / business errors are not retried here (handled by call_ai_with_retry).
    """
    max_tries = 1 + max(0, AI_TRANSPORT_MAX_RETRIES)
    delay = AI_TRANSPORT_BASE_DELAY_SEC
    last_exc: BaseException | None = None

    for attempt in range(max_tries):
        try:
            return await ai_client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
        except RateLimitError as exc:
            last_exc = exc
            incr("ai.completion.errors.rate_limit_total")
            logger.warning(
                "AI rate limited user=%s attempt=%d/%d: %s",
                user_id, attempt + 1, max_tries, exc,
            )
        except APITimeoutError as exc:
            last_exc = exc
            incr("ai.completion.errors.timeout_total")
            logger.warning(
                "AI timeout user=%s attempt=%d/%d: %s",
                user_id, attempt + 1, max_tries, exc,
            )
        except APIConnectionError as exc:
            last_exc = exc
            incr("ai.completion.errors.connection_total")
            logger.warning(
                "AI connection error user=%s attempt=%d/%d: %s",
                user_id, attempt + 1, max_tries, exc,
            )

        if attempt + 1 >= max_tries:
            break
        jitter = random.uniform(0.0, 0.25)
        await asyncio.sleep(min(8.0, delay) + jitter)
        delay = min(8.0, delay * 2)

    assert last_exc is not None
    raise last_exc

# Backward-compatible alias for tests that clear in-memory cache directly.
_recipe_image_url_cache = _memory_cache
_recipe_image_client: AsyncOpenAI | None = None
_youtube_cache: dict[str, tuple[float, str | None]] = {}


def _youtube_cache_key(recipe_name: str) -> str:
    return recipe_name.strip().casefold()


def _youtube_cache_get(recipe_name: str) -> str | None | object:
    if YOUTUBE_CACHE_TTL_SEC <= 0:
        return ...
    entry = _youtube_cache.get(_youtube_cache_key(recipe_name))
    if entry is None:
        return ...
    expires_at, value = entry
    if expires_at < time.monotonic():
        _youtube_cache.pop(_youtube_cache_key(recipe_name), None)
        return ...
    return value


def _youtube_cache_set(recipe_name: str, url: str | None) -> None:
    if YOUTUBE_CACHE_TTL_SEC <= 0:
        return
    _youtube_cache[_youtube_cache_key(recipe_name)] = (
        time.monotonic() + YOUTUBE_CACHE_TTL_SEC,
        url,
    )


def _recipe_placeholder_image_url(_recipe_name: str) -> str:
    """無 AI 成品圖時回傳公開 https 備援 URL（見 config.RECIPE_FALLBACK_HERO_IMAGE_URL）。"""
    from app import config

    return config.RECIPE_FALLBACK_HERO_IMAGE_URL or ""


def _get_recipe_image_client() -> AsyncOpenAI | None:
    global _recipe_image_client
    api_key = IMAGE_OPENAI_API_KEY or (os.getenv("OPENAI_API_KEY") or "").strip() or None
    if not api_key:
        return None
    if _recipe_image_client is None:
        _recipe_image_client = AsyncOpenAI(api_key=api_key, max_retries=1)
    return _recipe_image_client


def _gs_to_https_url(gs_uri: str) -> str | None:
    if not gs_uri.startswith("gs://"):
        return None
    path = gs_uri.removeprefix("gs://")
    if "/" not in path:
        return None
    bucket, obj = path.split("/", 1)
    if not bucket or not obj:
        return None
    safe_obj = urllib.parse.quote(obj, safe="/")
    return f"https://storage.googleapis.com/{bucket}/{safe_obj}"


async def _gs_to_signed_url(gs_uri: str) -> str | None:
    """Create a signed URL for GCS object when google-cloud-storage is available."""
    if not gs_uri.startswith("gs://") or GCS_SIGNED_URL_TTL_SEC <= 0:
        return None
    path = gs_uri.removeprefix("gs://")
    if "/" not in path:
        return None
    bucket_name, obj = path.split("/", 1)
    if not bucket_name or not obj:
        return None
    try:
        from google.cloud import storage
    except Exception as exc:
        logger.warning("google-cloud-storage unavailable for signed URLs: %s", exc)
        return None

    def _sign() -> str | None:
        client = storage.Client(project=GCP_PROJECT_ID or None)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(obj)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=GCS_SIGNED_URL_TTL_SEC),
            method="GET",
        )

    try:
        signed = await asyncio.to_thread(_sign)
        if isinstance(signed, str) and signed.startswith("https://"):
            return signed
    except Exception as exc:
        logger.warning("Failed generating signed URL for %s: %s", gs_uri, exc)
    return None


async def _resolve_public_image_url(raw_url: str) -> str | None:
    if raw_url.startswith("https://"):
        return raw_url
    if not raw_url.startswith("gs://"):
        return None
    path = raw_url.removeprefix("gs://")
    if "/" not in path:
        return None
    bucket, obj = path.split("/", 1)
    if not bucket or not obj:
        return None

    if IMAGE_PUBLIC_BASE_URL:
        if not IMAGE_PUBLIC_BASE_URL.startswith("https://"):
            return None
        safe_obj = urllib.parse.quote(obj, safe="/")
        return f"{IMAGE_PUBLIC_BASE_URL}/{bucket}/{safe_obj}"

    signed = await _gs_to_signed_url(raw_url)
    if signed:
        return signed
    return _gs_to_https_url(raw_url)


def vertex_imagen_generate_sync(recipe_name: str) -> str | bytes | None:
    """Call Vertex Imagen via SDK (blocking). Returns ``https://`` URL, ``gs://`` URI, PNG bytes, or None."""
    if not GCP_PROJECT_ID:
        return None
    try:
        import vertexai
        from vertexai.preview.vision_models import ImageGenerationModel
    except Exception as exc:
        logger.warning("vertex_imagen: SDK import failed: %s", exc)
        return None

    prompt = (
        "Professional food photography, Michelin star plating, dark slate background, "
        "dramatic top lighting, cinematic depth of field, dish: "
        f"{recipe_name}"
    )
    try:
        vertexai.init(project=GCP_PROJECT_ID, location=VERTEX_LOCATION)
        model = ImageGenerationModel.from_pretrained(VERTEX_IMAGEN_MODEL)
    except Exception as exc:
        logger.warning("vertex_imagen: init/from_pretrained failed: %s", exc)
        return None

    kwargs: dict = {
        "prompt": prompt,
        "number_of_images": 1,
        "aspect_ratio": "4:3",
        "add_watermark": True,
        "safety_filter_level": "block_some",
        "person_generation": "allow_adult",
    }
    if (VERTEX_IMAGEN_OUTPUT_GCS_URI or "").strip():
        kwargs["output_gcs_uri"] = VERTEX_IMAGEN_OUTPUT_GCS_URI.strip()

    t0 = time.perf_counter()
    try:
        response = model.generate_images(**kwargs)
    except Exception as exc:
        elapsed = time.perf_counter() - t0
        incr("ai.images.vertex.latency_seconds_total", elapsed)
        logger.warning("vertex_imagen: generate_images failed for %s: %s", recipe_name, exc)
        return None
    elapsed = time.perf_counter() - t0
    incr("ai.images.vertex.latency_seconds_total", elapsed)

    if not getattr(response, "images", None):
        return None
    first = response.images[0]
    gcs = getattr(first, "_gcs_uri", None)
    if isinstance(gcs, str) and gcs.startswith("gs://"):
        return gcs
    loaded = getattr(first, "_loaded_bytes", None)
    if isinstance(loaded, (bytes, bytearray)) and len(loaded) > 0:
        return bytes(loaded)
    return None


async def _generate_recipe_image_with_vertex(recipe_name: str) -> str | None:
    """Generate recipe image using Vertex Imagen SDK; return public https URL when possible."""
    if not GCP_PROJECT_ID:
        return None

    try:
        raw = await asyncio.to_thread(vertex_imagen_generate_sync, recipe_name)
    except Exception as exc:
        logger.warning("vertex_imagen: worker thread failed for %s: %s", recipe_name, exc)
        return None

    if raw is None:
        return None
    if isinstance(raw, (bytes, bytearray)):
        b = bytes(raw)
        if not b:
            return None
        stored = await store_recipe_png(payload=b, purpose="hero")
        if stored:
            incr(f"media.storage.backend.{stored.backend}_total")
            return stored.url
        return None
    if isinstance(raw, str):
        if raw.startswith("https://"):
            return raw
        if raw.startswith("gs://"):
            return await _resolve_public_image_url(raw)
    return None


def _recipe_image_cache_key(recipe_name: str) -> str:
    return f"{IMAGE_PROVIDER}:{recipe_name.strip().casefold()}"


async def _recipe_image_cache_get(key: str) -> str | None:
    if IMAGE_CACHE_TTL_SEC <= 0:
        return None
    return await get_cached_image_url(key)


async def _recipe_image_cache_set(key: str, url: str) -> None:
    if IMAGE_CACHE_TTL_SEC <= 0:
        return
    await set_cached_image_url(key, url)


async def get_cached_recipe_image(recipe_name: str) -> str | None:
    """Return a cached recipe image URL for the active provider if available."""
    return await _recipe_image_cache_get(_recipe_image_cache_key(recipe_name))


def _decode_generated_image_bytes(image_data: object) -> bytes | None:
    """Decode a GPT Image base64 payload into bytes."""
    encoded = str(image_data or "").strip()
    if not encoded:
        return None
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception:
        return None


def _is_cacheable_generated_url(recipe_name: str, url: str | None) -> bool:
    if not isinstance(url, str) or not url.startswith("https://"):
        return False
    fallback = _recipe_placeholder_image_url(recipe_name)
    if fallback and url == fallback:
        return False
    return True


def _build_openai_recipe_hero_prompt(recipe_name: str) -> str:
    return (
        "Professional food photography of a finished Taiwanese dish. "
        "Tight composition, realistic texture, warm natural lighting, premium cookbook style, "
        "minimal background clutter, no people. "
        f"Dish: {recipe_name}. "
        "No readable text, no logo, no watermark, no caption, no typography overlays."
    )


async def _generate_openai_image_resilient(*, image_client: AsyncOpenAI, prompt: str):
    max_tries = 1 + max(0, AI_IMAGE_MAX_RETRIES)
    delay = AI_IMAGE_BASE_DELAY_SEC
    last_exc: BaseException | None = None
    for attempt in range(max_tries):
        try:
            return await image_client.images.generate(
                model="gpt-image-2-2026-04-21",
                prompt=prompt,
                size="1024x1024",
                quality="low",
                timeout=AI_IMAGE_TIMEOUT_SEC,
            )
        except RateLimitError as exc:
            last_exc = exc
            incr("ai.images.errors.rate_limit_total")
        except APITimeoutError as exc:
            last_exc = exc
            incr("ai.images.errors.timeout_total")
        except APIConnectionError as exc:
            last_exc = exc
            incr("ai.images.errors.connection_total")
        if attempt + 1 >= max_tries:
            break
        incr("ai.images.retry_total")
        jitter = random.uniform(0.0, 0.25)
        await asyncio.sleep(min(8.0, delay) + jitter)
        delay = min(8.0, delay * 2)
    assert last_exc is not None
    raise last_exc


async def generate_recipe_image(recipe_name: str) -> str:
    """Generate a recipe image URL via provider selector, with safe fallback."""
    if IMAGE_PROVIDER == "placeholder":
        incr("ai.images.provider.placeholder_total")
        return _recipe_placeholder_image_url(recipe_name)

    cache_key = _recipe_image_cache_key(recipe_name)
    cached = await _recipe_image_cache_get(cache_key)
    if _is_cacheable_generated_url(recipe_name, cached):
        return cached

    if IMAGE_PROVIDER == "vertex_imagen":
        try:
            url = await _generate_recipe_image_with_vertex(recipe_name)
            if isinstance(url, str) and url.startswith("https://"):
                incr("ai.images.vertex.success_total")
                await _recipe_image_cache_set(cache_key, url)
                return url
            incr("ai.images.vertex.errors_total")
        except Exception as exc:
            logger.warning("Vertex image generation failed for recipe %s: %s", recipe_name, exc)
            incr("ai.images.vertex.errors_total")
        incr("ai.images.fallback_total")
        return _recipe_placeholder_image_url(recipe_name)

    if IMAGE_PROVIDER != "openai_compatible":
        logger.warning("Unknown IMAGE_PROVIDER=%s; fallback to placeholder", IMAGE_PROVIDER)
        incr("ai.images.provider.unknown_total")
        return _recipe_placeholder_image_url(recipe_name)

    image_client = _get_recipe_image_client()
    if image_client is None:
        logger.warning("OpenAI image generation unavailable: OPENAI_API_KEY / IMAGE_OPENAI_API_KEY not configured")
        incr("ai.images.misconfigured_total")
        incr("ai.images.fallback_total")
        return _recipe_placeholder_image_url(recipe_name)

    prompt = _build_openai_recipe_hero_prompt(recipe_name)
    try:
        response = await _generate_openai_image_resilient(image_client=image_client, prompt=prompt)
        image_bytes = None
        if getattr(response, "data", None):
            image_bytes = _decode_generated_image_bytes(getattr(response.data[0], "b64_json", None))
        if image_bytes:
            stored = await store_recipe_png(payload=image_bytes, purpose="hero")
            image_url = stored.url if stored else None
            if _is_cacheable_generated_url(recipe_name, image_url):
                incr("ai.images.generated_total")
                if stored:
                    incr(f"media.storage.backend.{stored.backend}_total")
                await _recipe_image_cache_set(cache_key, image_url)
                return image_url
            logger.warning(
                "Image generation succeeded for recipe %s but URL publish failed",
                recipe_name,
            )
            incr("ai.images.media_url_unavailable_total")
        else:
            incr("ai.images.invalid_payload_total")
    except Exception as exc:
        logger.warning("Image generation failed for recipe %s: %s", recipe_name, exc)
        incr("ai.images.errors_total")
    incr("ai.images.fallback_total")
    return _recipe_placeholder_image_url(recipe_name)


async def search_youtube_video(recipe_name: str) -> str | None:
    """Search first YouTube tutorial video; return None if unavailable or failed."""
    if not YOUTUBE_API_KEY:
        return None
    cached = _youtube_cache_get(recipe_name)
    if cached is not ...:
        return cached

    try:
        query = f"{recipe_name} 食譜 教學"
        async with httpx.AsyncClient(timeout=YOUTUBE_SEARCH_TIMEOUT_SEC) as client:
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
            _youtube_cache_set(recipe_name, None)
            return None
        video_id = ((items[0].get("id") or {}).get("videoId") or "").strip()
        if not video_id:
            _youtube_cache_set(recipe_name, None)
            return None
        incr("youtube.search.success_total")
        url = f"https://www.youtube.com/watch?v={video_id}"
        _youtube_cache_set(recipe_name, url)
        return url
    except Exception as exc:
        logger.warning("YouTube search failed for recipe %s: %s", recipe_name, exc)
        incr("youtube.search.errors_total")
        _youtube_cache_set(recipe_name, None)
        return None


async def _fetch_ai_context(user_id: str, tenant_id: str = "default") -> tuple[list, list, str | None, str | None]:
    """Parallel DB queries for history, cuisine context, and preferences."""
    full_history, (active_cuisine, context_updated_at), prefs = await asyncio.gather(
        get_user_memory(user_id, tenant_id=tenant_id),
        get_user_cuisine_context(user_id, tenant_id=tenant_id),
        get_user_preferences(user_id, tenant_id=tenant_id),
    )
    filtered = _filter_history_after_context(full_history, context_updated_at)
    return full_history, filtered, active_cuisine, prefs


async def _get_last_recipe_json(user_id: str, tenant_id: str = "default") -> dict | None:
    """Extract the last recipe JSON from conversation history."""
    history = await get_user_memory(user_id, tenant_id=tenant_id)
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
    # 跨輪保留：截斷修復提示（messages 每輪重建，不可只在迴圈內 append）
    extra_user_messages: list[dict] = []

    for attempt in range(1 + max_retries):
        messages = list(api_messages) + list(extra_user_messages)

        # On retry, add an extra system message demanding pure JSON
        if attempt > 0:
            messages.append({"role": "user", "content": AI_RETRY_EXTRA_PROMPT})
            logger.info("AI retry %d/%d for user %s", attempt, max_retries, user_id)

        t0 = time.perf_counter()
        response = await _chat_completions_create_resilient(
            user_id=user_id,
            model=AI_MODEL_FOR_CALL,
            messages=messages,
            temperature=0.3,
            max_tokens=MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            timeout=AI_CHAT_TIMEOUT_SEC,
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
        choice0 = response.choices[0] if getattr(response, "choices", None) else None
        finish = (getattr(choice0, "finish_reason", None) or "").lower()

        try:
            parsed = _parse_ai_json(ai_content)
            return ai_content, parsed
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            incr("ai.errors.json_parse_total")
            logger.warning("JSON parse failed (attempt %d) for user %s: %s", attempt, user_id, exc)
            if finish == "length" and attempt < max_retries:
                extra_user_messages.append({"role": "user", "content": AI_TRUNCATION_RECOVERY_PROMPT})
                incr("ai.errors.truncation_recovery_retry_total")
                logger.info("Output truncated (finish_reason=length); recovery prompt queued for user %s", user_id)
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

    response = await _chat_completions_create_resilient(
        user_id="vision",
        model=AI_MODEL_FOR_CALL,
        messages=messages,
        temperature=0.2,
        max_tokens=256,
        timeout=AI_VISION_TIMEOUT_SEC,
    )
    incr("ai.vision.calls_total")
    return response.choices[0].message.content.strip()
