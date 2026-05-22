"""Async per-IP sliding-window rate limits for public HTTP endpoints."""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict

from fastapi import HTTPException, Request

from app.config import (
    RATE_LIMIT_CALLBACK_PER_MINUTE,
    RATE_LIMIT_PUBLIC_PER_MINUTE,
    RATE_LIMIT_USER_BURST,
    RATE_LIMIT_USER_PER_MINUTE,
    logger,
)
from app.observability import incr

_rl_lock = asyncio.Lock()
_timestamps: dict[str, list[float]] = defaultdict(list)
_WINDOW_SEC = 60.0


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip() or "unknown"
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


async def _allow(key: str, max_events: int, window_sec: float = _WINDOW_SEC) -> bool:
    if max_events <= 0:
        return True
    now = time.monotonic()
    cutoff = now - window_sec
    async with _rl_lock:
        bucket = _timestamps[key]
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)
        if len(bucket) >= max_events:
            return False
        bucket.append(now)
    return True


async def enforce_callback_rate_limit(request: Request) -> None:
    ip = client_ip(request)
    key = f"callback:{ip}"
    if not await _allow(key, RATE_LIMIT_CALLBACK_PER_MINUTE):
        incr("http.rate_limit.blocked_total")
        logger.warning("Rate limit exceeded for callback ip=%s", ip)
        raise HTTPException(status_code=429, detail="Too many requests")


async def enforce_public_rate_limit(request: Request) -> None:
    ip = client_ip(request)
    key = f"public:{ip}"
    if not await _allow(key, RATE_LIMIT_PUBLIC_PER_MINUTE):
        incr("http.rate_limit.blocked_total")
        logger.warning("Rate limit exceeded for public route ip=%s path=%s", ip, request.url.path)
        raise HTTPException(status_code=429, detail="Too many requests")


async def enforce_user_rate_limit(user_id: str, tenant_id: str = "default") -> None:
    """Per-user(+tenant) webhook throttling to complement per-IP limits."""
    if not user_id:
        return
    effective_limit = RATE_LIMIT_USER_PER_MINUTE + RATE_LIMIT_USER_BURST
    key = f"callback-user:{tenant_id}:{user_id}"
    if not await _allow(key, effective_limit):
        incr("http.rate_limit.user_blocked_total")
        logger.warning("Rate limit exceeded for callback tenant=%s user=%s", tenant_id, user_id)
        raise HTTPException(status_code=429, detail="Too many requests")
