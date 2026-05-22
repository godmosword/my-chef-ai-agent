"""Command-level helpers extracted from handlers."""
from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from linebot.v3.messaging import TextMessage

from app.billing import consume_quota
from app.helpers import _build_scenario_instructions
from app.subscriptions import build_checkout_url

ReplyFn = Callable[[TextMessage], Awaitable[None]]
BackgroundFn = Callable[..., Awaitable[None]]


async def dispatch_recipe_generation(
    *,
    user_id: str,
    tenant_id: str,
    user_message: str,
    reply_fn: ReplyFn,
    background_fn: BackgroundFn,
    skip_quota_check: bool = False,
) -> None:
    quota_decision = None
    if not skip_quota_check:
        quota = await consume_quota(
            user_id=user_id,
            tenant_id=tenant_id,
            units=1,
            event_type="text_recipe_generation",
        )
        quota_decision = quota
        if not quota.allowed:
            upgrade_url = build_checkout_url(user_id=user_id, tenant_id=tenant_id, plan_key="pro")
            await reply_fn(
                TextMessage(
                    text=(
                        "👨‍🍳 今日免費額度已用完。\n"
                        f"目前方案：{quota.plan_key}，每日上限 {quota.limit} 次。\n"
                        f"你可以明天再來，或升級方案解鎖更多配方次數：{upgrade_url}"
                    )
                )
            )
            return

    scenario_prefix = _build_scenario_instructions(user_message)
    if scenario_prefix:
        user_message = scenario_prefix + user_message

    await reply_fn(TextMessage(text="👨‍🍳 主廚正在為您研發菜單與擺盤，請稍候片刻..."))
    asyncio.create_task(
        background_fn(
            user_id=user_id,
            tenant_id=tenant_id,
            user_message=user_message,
            quota_remaining=quota_decision.remaining if quota_decision else None,
            quota_limit=quota_decision.limit if quota_decision else None,
            quota_plan_key=quota_decision.plan_key if quota_decision else None,
        )
    )
