"""Deep Research grounding for recipe generation."""
from __future__ import annotations

import asyncio
import os
import time
from typing import Any

from app.config import ENABLE_DEEP_RESEARCH, logger

DEEP_RESEARCH_AGENT = "deep-research-preview-04-2026"
DEFAULT_TIMEOUT_SEC = 10.0
POLL_INTERVAL_SEC = 3.0


def _deep_research_api_key() -> str:
    return (os.getenv("DEEP_RESEARCH_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip()


def _is_placeholder_api_key(api_key: str) -> bool:
    normalized = (api_key or "").strip().lower()
    return normalized in {"", "test_key", "dummy", "placeholder", "your_key_here"}


def _deep_research_timeout_sec() -> float:
    raw = (os.getenv("DEEP_RESEARCH_TIMEOUT_SEC") or "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SEC
    try:
        return min(20.0, max(5.0, float(raw)))
    except ValueError:
        logger.warning("Invalid DEEP_RESEARCH_TIMEOUT_SEC=%r; using default %.1fs", raw, DEFAULT_TIMEOUT_SEC)
        return DEFAULT_TIMEOUT_SEC


def _build_research_prompt(recipe_intent: str) -> str:
    return (
        "你是米其林研發主廚，為 LINE 食譜助理做深度研究。"
        f"主題：{recipe_intent}\n\n"
        "請優先覆蓋：\n"
        "1. 黃金比例：香料、醬汁的具體公克數與比例。\n"
        "2. 烹飪化學與食安：梅納溫度、熟成時間、關鍵物理條件。\n"
        "3. 台灣當地市場近期食材時價與季節性：當季食材與偏高品項。\n\n"
        "輸出（繁體中文）：3-5 點結論 + 建議配方比例；來源有差異時標折衷做法；提供可執行數值。"
    )


def _extract_interaction_text(interaction: Any) -> str:
    outputs = getattr(interaction, "outputs", None) or []
    for output in reversed(outputs):
        text = getattr(output, "text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
    output_text = getattr(interaction, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    return ""


def _perform_recipe_deep_research_sync(recipe_intent: str, *, api_key: str, timeout_sec: float) -> str:
    from google import genai

    client = genai.Client(api_key=api_key)
    deadline = time.monotonic() + timeout_sec
    interaction = client.interactions.create(
        input=_build_research_prompt(recipe_intent),
        agent=DEEP_RESEARCH_AGENT,
        agent_config={
            "type": "deep-research",
            "thinking_summaries": "auto",
            "collaborative_planning": False,
        },
        tools=[
            {"type": "google_search"},
            {"type": "url_context"},
        ],
        background=True,
    )

    interaction_id = getattr(interaction, "id", None)
    if not interaction_id:
        logger.warning("Deep research started without interaction id for intent=%r", recipe_intent[:80])
        return ""

    while time.monotonic() < deadline:
        latest = client.interactions.get(interaction_id)
        status = (getattr(latest, "status", "") or "").lower()
        if status == "completed":
            return _extract_interaction_text(latest)
        if status == "failed":
            logger.warning("Deep research failed for intent=%r error=%r", recipe_intent[:80], getattr(latest, "error", None))
            return ""
        time.sleep(POLL_INTERVAL_SEC)

    raise TimeoutError(f"Deep research timed out after {timeout_sec:.1f}s")


async def perform_recipe_deep_research(recipe_intent: str) -> str:
    """Return a condensed grounding report or an empty string on failure."""
    recipe_intent = (recipe_intent or "").strip()
    if not recipe_intent:
        return ""
    if not ENABLE_DEEP_RESEARCH:
        logger.info("Skip deep research: ENABLE_DEEP_RESEARCH is disabled")
        return ""

    api_key = _deep_research_api_key()
    if not api_key:
        logger.info("Skip deep research: no DEEP_RESEARCH_API_KEY or GEMINI_API_KEY configured")
        return ""
    if _is_placeholder_api_key(api_key):
        logger.info("Skip deep research: placeholder API key detected")
        return ""

    timeout_sec = _deep_research_timeout_sec()
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(
                _perform_recipe_deep_research_sync,
                recipe_intent,
                api_key=api_key,
                timeout_sec=timeout_sec,
            ),
            timeout=timeout_sec + 2.0,
        )
    except (asyncio.TimeoutError, TimeoutError):
        logger.warning("Deep research timeout for intent=%r after %.1fs", recipe_intent[:80], timeout_sec)
        return ""
    except Exception as exc:
        logger.warning("Deep research failed for intent=%r: %s", recipe_intent[:80], exc)
        return ""
