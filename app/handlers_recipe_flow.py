"""Recipe generation orchestration extracted from handlers."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Awaitable, Callable

from linebot.v3.messaging import FlexContainer, FlexMessage, TextMessage
from openai import APITimeoutError, AuthenticationError, BadRequestError

from app.ai_errors import format_ai_error_for_user
from app.ai_service import _fetch_ai_context, call_ai_with_retry, generate_recipe_image, search_youtube_video
from app.config import MAX_HISTORY_TURNS, QUOTA_WARN_THRESHOLD, RECIPE_STEPS_PREVIEW_COUNT, logger
from app.db import save_user_memory
from app.flex_messages import _flex_safe_https_url, build_fallback_recipe_flex, generate_flex_message
from app.helpers import _build_system_prompt, _condense_assistant_message, _safe_str
from app.observability import incr

PushFn = Callable[[str, TextMessage | FlexMessage], Awaitable[None]]


async def background_generate_recipe(
    *,
    user_id: str,
    tenant_id: str,
    user_message: str,
    push_fn: PushFn,
    quota_remaining: int | None = None,
    quota_limit: int | None = None,
    quota_plan_key: str | None = None,
) -> None:
    if not user_id:
        logger.warning("Skip background generation: missing user_id")
        return
    logger.info("Start background recipe generation for user=%s tenant=%s", user_id, tenant_id)

    tracer = None
    try:
        from opentelemetry import trace

        tracer = trace.get_tracer("chef-agent.handlers")
    except Exception:
        tracer = None

    async def _run_flow() -> TextMessage | FlexMessage:
        full_history, filtered_history, active_cuisine, prefs = await _fetch_ai_context(
            user_id,
            tenant_id=tenant_id,
        )
        effective_system = _build_system_prompt(prefs, active_cuisine or "不拘")

        history = filtered_history
        if not history:
            history = [{"role": "system", "content": effective_system}]
        elif history[0].get("role") == "system":
            history[0] = {"role": "system", "content": effective_system}
        else:
            history = [{"role": "system", "content": effective_system}] + history

        now_iso = datetime.now(timezone.utc).isoformat()
        history.append({"role": "user", "content": user_message, "timestamp": now_iso})
        if len(history) > MAX_HISTORY_TURNS + 1:
            history = [history[0]] + history[-MAX_HISTORY_TURNS:]
        api_messages = [
            {
                "role": m["role"],
                "content": (
                    _condense_assistant_message(m.get("content", ""))
                    if m.get("role") == "assistant"
                    else m.get("content", "")
                ),
            }
            for m in history
        ]

        ai_content, ai_data = await call_ai_with_retry(api_messages, user_id=user_id)
        to_save = full_history + [
            {"role": "user", "content": user_message, "timestamp": now_iso},
            {"role": "assistant", "content": ai_content, "timestamp": now_iso},
        ]
        if len(to_save) > MAX_HISTORY_TURNS + 1:
            to_save = [to_save[0]] + to_save[-MAX_HISTORY_TURNS:]
        asyncio.create_task(save_user_memory(user_id, to_save, tenant_id=tenant_id))

        recipe_name = _safe_str(ai_data.get("recipe_name"), "美味食譜", max_len=80)
        photo_url, video_url = await asyncio.gather(
            generate_recipe_image(recipe_name),
            search_youtube_video(recipe_name),
        )

        g = ai_data.get
        flex_dict = generate_flex_message(
            g("kitchen_talk", []),
            g("theme", ""),
            recipe_name,
            g("ingredients", []),
            g("steps", []),
            g("shopping_list", []),
            g("estimated_total_cost", ""),
            recipe_name_for_postback=recipe_name,
            photo_url=_flex_safe_https_url(photo_url),
            video_url=_flex_safe_https_url(video_url),
            step_preview_count=RECIPE_STEPS_PREVIEW_COUNT,
            recipe_lookup_ts=now_iso,
        )
        return FlexMessage(
            alt_text=f"職人提案：{recipe_name}",
            contents=FlexContainer.from_dict(flex_dict),
        )

    try:
        if tracer:
            with tracer.start_as_current_span("handlers.background_generate_recipe"):
                msg = await _run_flow()
        else:
            msg = await _run_flow()

    except (json.JSONDecodeError, ValueError) as exc:
        incr("handler.ai.errors.json_total")
        logger.error("JSON/Value error for user %s: %s", user_id, exc)
        try:
            raw_content = getattr(exc, "raw_content", "無法取得原始內容")
            msg = build_fallback_recipe_flex(raw_content)
        except Exception:
            msg = TextMessage(
                text=f"👨‍🍳 AI 格式解析失敗：{str(exc)[:100]}\n請輸入「清除記憶」後換個說法試試。"
            )

    except APITimeoutError:
        incr("handler.ai.errors.timeout_total")
        msg = TextMessage(text="👨‍🍳 AI 廚房反應太慢，請稍後再試！")

    except (AuthenticationError, BadRequestError) as exc:
        err_msg = str(exc).lower()
        if "api key" in err_msg and ("expired" in err_msg or "invalid" in err_msg):
            logger.error("API key issue for user %s: %s", user_id, exc)
            msg = TextMessage(text="👨‍🍳 AI 金鑰已過期或無效，請聯繫管理員更新 API Key。")
        else:
            logger.exception("API request error for user %s", user_id)
            msg = TextMessage(
                text=(
                    "👨‍🍳 呼叫 AI 時發生意外：\n"
                    f"{type(exc).__name__}: {str(exc)[:200]}\n\n"
                    "請截圖此錯誤並輸入「清除記憶」重試。"
                )
            )

    except Exception as exc:
        incr("handler.ai.errors.unexpected_total")
        logger.exception("Unexpected error for user %s", user_id)
        msg = TextMessage(text=format_ai_error_for_user(exc))

    try:
        await push_fn(user_id, msg)
        if (
            quota_remaining is not None
            and quota_limit is not None
            and quota_plan_key
            and quota_remaining > 0
            and quota_remaining <= QUOTA_WARN_THRESHOLD
        ):
            await push_fn(
                user_id,
                TextMessage(
                    text=(
                        f"⏳ 今日剩餘額度約 {quota_remaining}/{quota_limit} 次（{quota_plan_key} 方案）。\n"
                        "若需要更多次數，可輸入「升級方案」。"
                    )
                ),
            )
    except Exception as exc:
        incr("handler.ai.errors.push_total")
        logger.exception("Push final message failed for user %s: %s", user_id, exc)
