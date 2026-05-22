"""Short-lived in-memory store for Vertex-generated recipe hero PNGs.

Served at ``GET /media/recipe-hero/{token}`` so LINE Flex can use a public https URL
when ``VERTEX_IMAGEN_OUTPUT_GCS_URI`` is unset (``data:`` URIs are rejected by
``_flex_safe_https_url``).
"""
from __future__ import annotations

import asyncio
import secrets
import time

from app.config import IMAGE_CACHE_TTL_SEC, PUBLIC_APP_BASE_URL, logger

_lock = asyncio.Lock()
_store: dict[str, tuple[bytes, float]] = {}


def _hero_ttl_sec() -> int:
    if IMAGE_CACHE_TTL_SEC > 0:
        return max(60, IMAGE_CACHE_TTL_SEC)
    return 3600


def _purge_expired_unlocked() -> None:
    now = time.time()
    dead = [k for k, (_, ex) in _store.items() if ex <= now]
    for k in dead:
        del _store[k]


async def register_recipe_hero_png(png: bytes) -> str | None:
    """Store PNG bytes and return ``https://.../media/recipe-hero/{token}`` or None."""
    base = (PUBLIC_APP_BASE_URL or "").strip().rstrip("/")
    if not base.startswith("https://"):
        logger.warning(
            "vertex_imagen: 無法註冊本機主圖 URL（PUBLIC_APP_BASE_URL 未設或非 https）；"
            "請設定公開網址或改用 VERTEX_IMAGEN_OUTPUT_GCS_URI"
        )
        return None
    ttl = _hero_ttl_sec()
    token = secrets.token_urlsafe(32)
    exp = time.time() + ttl
    async with _lock:
        _purge_expired_unlocked()
        _store[token] = (png, exp)
    return f"{base}/media/recipe-hero/{token}"


async def get_recipe_hero_png(token: str) -> tuple[bytes | None, int]:
    """Return ``(png_bytes, 200)`` or ``(None, 404)``."""
    async with _lock:
        _purge_expired_unlocked()
        item = _store.get(token)
        if not item:
            return None, 404
        data, ex = item
        if time.time() >= ex:
            del _store[token]
            return None, 404
        return data, 200


def clear_recipe_hero_media_for_tests() -> None:
    """Reset in-memory store (tests only)."""
    _store.clear()
