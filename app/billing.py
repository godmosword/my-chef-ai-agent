"""Simple usage quota and plan checks."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

from app.config import PLAN_DAILY_LIMITS, logger
from app.db import (
    append_usage_ledger,
    get_daily_usage,
    get_user_subscription,
    increment_daily_usage,
)


@dataclass
class QuotaDecision:
    allowed: bool
    plan_key: str
    limit: int
    used: int
    remaining: int


def _resolve_plan_limit(plan_key: str) -> int:
    return PLAN_DAILY_LIMITS.get(plan_key, PLAN_DAILY_LIMITS["free"])


_quota_locks: dict[str, asyncio.Lock] = {}


def _get_quota_lock(user_id: str, tenant_id: str) -> asyncio.Lock:
    key = f"{tenant_id}:{user_id}"
    lock = _quota_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _quota_locks[key] = lock
    return lock


async def check_quota(user_id: str, tenant_id: str = "default") -> QuotaDecision:
    plan_key, status = await get_user_subscription(user_id, tenant_id)
    if status != "active":
        plan_key = "free"
    used = await get_daily_usage(user_id, tenant_id=tenant_id)
    limit = _resolve_plan_limit(plan_key)
    remaining = max(limit - used, 0)
    allowed = used < limit
    return QuotaDecision(
        allowed=allowed,
        plan_key=plan_key,
        limit=limit,
        used=used,
        remaining=remaining,
    )


async def consume_quota(
    user_id: str,
    tenant_id: str = "default",
    units: int = 1,
    event_type: str = "recipe_generation",
) -> QuotaDecision:
    lock = _get_quota_lock(user_id, tenant_id)
    async with lock:
        decision = await check_quota(user_id, tenant_id)
        if not decision.allowed:
            return decision
        used_after = await increment_daily_usage(user_id, units=units, tenant_id=tenant_id)
        minimum_expected = decision.used + units
        if used_after is None or used_after < minimum_expected:
            logger.error(
                "Quota increment failed user=%s tenant=%s expected_at_least=%s actual=%s",
                user_id,
                tenant_id,
                minimum_expected,
                used_after,
            )
            return QuotaDecision(
                allowed=False,
                plan_key=decision.plan_key,
                limit=decision.limit,
                used=decision.used,
                remaining=max(decision.limit - decision.used, 0),
            )
        await append_usage_ledger(
            user_id=user_id,
            tenant_id=tenant_id,
            units=units,
            event_type=event_type,
            detail={"used_after": used_after},
        )
        logger.info(
            "Quota consumed user=%s tenant=%s plan=%s used=%s/%s",
            user_id,
            tenant_id,
            decision.plan_key,
            used_after,
            decision.limit,
        )
        return QuotaDecision(
            allowed=True,
            plan_key=decision.plan_key,
            limit=decision.limit,
            used=used_after,
            remaining=max(decision.limit - used_after, 0),
        )
