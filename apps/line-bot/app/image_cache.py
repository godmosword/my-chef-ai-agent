"""Shared image cache backend (memory with optional Redis)."""
from __future__ import annotations

import asyncio
import time

from app.config import (
    IMAGE_CACHE_BACKEND,
    IMAGE_CACHE_NAMESPACE,
    IMAGE_CACHE_TTL_SEC,
    REDIS_URL,
    logger,
)
from app.observability import incr

_memory_cache: dict[str, tuple[str, float]] = {}
_memory_lock = asyncio.Lock()
_redis_client = None
_redis_init_lock = asyncio.Lock()
_redis_backend_warned = False


def _cache_key(key: str) -> str:
    return f"{IMAGE_CACHE_NAMESPACE}:{key}"


async def _get_redis_client():
    global _redis_client, _redis_backend_warned
    if _redis_client is not None:
        return _redis_client
    if not REDIS_URL:
        if IMAGE_CACHE_BACKEND == "redis" and not _redis_backend_warned:
            logger.warning("IMAGE_CACHE_BACKEND=redis but REDIS_URL is empty; fallback to memory cache")
            _redis_backend_warned = True
        return None

    async with _redis_init_lock:
        if _redis_client is not None:
            return _redis_client
        try:
            from redis.asyncio import from_url

            _redis_client = from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
            await _redis_client.ping()
            logger.info("Image cache backend: redis")
        except Exception as exc:
            logger.warning("Image cache redis unavailable, fallback to memory: %s", exc)
            _redis_client = None
    return _redis_client


def _prefer_redis() -> bool:
    if IMAGE_CACHE_BACKEND == "redis":
        return True
    if IMAGE_CACHE_BACKEND == "memory":
        return False
    return bool(REDIS_URL)


async def get_cached_image_url(key: str) -> str | None:
    if IMAGE_CACHE_TTL_SEC <= 0:
        return None

    if _prefer_redis():
        client = await _get_redis_client()
        if client is not None:
            try:
                value = await client.get(_cache_key(key))
                if isinstance(value, str):
                    incr("ai.images.cache.hit_total")
                    return value
            except Exception as exc:
                logger.warning("Image cache redis get failed: %s", exc)

    now = time.monotonic()
    async with _memory_lock:
        row = _memory_cache.get(key)
        if not row:
            return None
        value, exp = row
        if exp <= now:
            del _memory_cache[key]
            return None
        incr("ai.images.cache.hit_total")
        return value


async def set_cached_image_url(key: str, value: str) -> None:
    if IMAGE_CACHE_TTL_SEC <= 0:
        return

    if _prefer_redis():
        client = await _get_redis_client()
        if client is not None:
            try:
                await client.setex(_cache_key(key), int(IMAGE_CACHE_TTL_SEC), value)
            except Exception as exc:
                logger.warning("Image cache redis set failed: %s", exc)

    exp = time.monotonic() + float(IMAGE_CACHE_TTL_SEC)
    async with _memory_lock:
        _memory_cache[key] = (value, exp)
