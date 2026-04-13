"""LINE message and postback event handlers."""
from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timezone
from urllib.parse import parse_qs

from linebot.v3.messaging import (
    AsyncApiClient,
    AsyncMessagingApi,
    FlexContainer,
    FlexMessage,
    PushMessageRequest,
    ReplyMessageRequest,
    TextMessage,
)
from openai import APITimeoutError, AuthenticationError, BadRequestError

from app.config import (
    CUISINE_LABELS,
    CUISINE_SELECTOR_KEYWORDS,
    FAVORITES_KEYWORDS,
    MAX_HISTORY_TURNS,
    MAX_MESSAGE_LENGTH,
    RANDOM_SIDEDISH_CMD,
    RANDOM_STYLES,
    RESET_KEYWORDS,
    VIEW_SHOPPING_CMD,
    logger,
)
from app.clients import line_configuration, AI_MODEL_FOR_CALL
from app.models import WebhookMessageEvent, WebhookPostbackEvent, WebhookImageEvent
from app.db import (
    clear_user_memory,
    delete_user_data,
    delete_favorite_recipe,
    get_favorite_recipes,
    save_favorite_recipe,
    save_user_memory,
    update_user_cuisine_context,
)
from app.helpers import (
    _build_scenario_instructions,
    _build_system_prompt,
    _condense_assistant_message,
    _flex_safe_https_url,
    _parse_to_list,
    _safe_str,
)
from app.flex_messages import (
    CUISINE_SELECTOR_MSG,
    build_fallback_recipe_flex,
    build_favorites_carousel,
    generate_flex_message,
    get_main_menu_flex,
)
from app.ai_errors import format_ai_error_for_user
from app.ai_service import (
    _fetch_ai_context,
    _get_last_recipe_json,
    call_ai_with_retry,
    download_line_image,
    generate_recipe_image,
    identify_ingredients_from_image,
    search_youtube_video,
)
from app.billing import consume_quota
from app.observability import incr
from app.subscriptions import build_checkout_url


# ─── LINE Reply helper ──────────────────────────────────────────────────────────

async def _reply_line(reply_token: str, msg: TextMessage | FlexMessage, user_id: str | None = None) -> None:
    async with AsyncApiClient(line_configuration) as api_client:
        api = AsyncMessagingApi(api_client)
        try:
            await api.reply_message(ReplyMessageRequest(reply_token=reply_token, messages=[msg]))
            incr("line.reply.success_total")
            return
        except Exception as exc:
            logger.warning("Reply API failed; trying push fallback: %s", exc)
            incr("line.reply.errors_total")
            if user_id:
                await api.push_message(PushMessageRequest(to=user_id, messages=[msg]))
                incr("line.push_fallback.success_total")
                return
            raise


async def _push_line_message(user_id: str, msg: TextMessage | FlexMessage) -> None:
    """Send a push message to LINE user with a lightweight retry."""
    for attempt in range(2):
        try:
            async with AsyncApiClient(line_configuration) as api_client:
                api = AsyncMessagingApi(api_client)
                await api.push_message(PushMessageRequest(to=user_id, messages=[msg]))
            incr("line.push.success_total")
            return
        except Exception as exc:
            if attempt == 0:
                await asyncio.sleep(0.3)
                continue
            raise


async def _background_generate_recipe(
    *,
    user_id: str,
    tenant_id: str,
    user_message: str,
) -> None:
    """
    Generate recipe in background, fetch media in parallel, then push final result.
    This avoids reply token timeout for long-running generation.
    """
    if not user_id:
        logger.warning("Skip background generation: missing user_id")
        return
    logger.info("Start background recipe generation for user=%s tenant=%s", user_id, tenant_id)

    try:
        full_history, filtered_history, active_cuisine, prefs = await _fetch_ai_context(user_id)
        current_cuisine = CUISINE_LABELS.get(active_cuisine or "", active_cuisine or "不拘")
        effective_system = _build_system_prompt(prefs, current_cuisine)

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
        asyncio.create_task(save_user_memory(user_id, to_save))

        recipe_name = _safe_str(ai_data.get("recipe_name"), "美味食譜", max_len=80)
        photo_url, video_url = await asyncio.gather(
            generate_recipe_image(recipe_name),
            search_youtube_video(recipe_name),
        )

        g = ai_data.get
        flex_dict = generate_flex_message(
            g("kitchen_talk", []), g("theme", ""), recipe_name,
            g("ingredients", []), g("steps", []), g("shopping_list", []),
            g("estimated_total_cost", ""),
            recipe_name_for_postback=recipe_name,
            photo_url=_flex_safe_https_url(photo_url),
            video_url=_flex_safe_https_url(video_url),
        )
        msg: TextMessage | FlexMessage = FlexMessage(
            alt_text=f"職人提案：{recipe_name}",
            contents=FlexContainer.from_dict(flex_dict),
        )

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
            msg = TextMessage(text=(
                "👨‍🍳 呼叫 AI 時發生意外：\n"
                f"{type(exc).__name__}: {str(exc)[:200]}\n\n"
                "請截圖此錯誤並輸入「清除記憶」重試。"
            ))

    except Exception as exc:
        incr("handler.ai.errors.unexpected_total")
        logger.exception("Unexpected error for user %s", user_id)
        msg = TextMessage(text=format_ai_error_for_user(exc))

    try:
        await _push_line_message(user_id, msg)
    except Exception as exc:
        incr("handler.ai.errors.push_total")
        logger.exception("Push final message failed for user %s: %s", user_id, exc)


# ─── Image message handler ──────────────────────────────────────────────────────

async def process_image_reply(event: WebhookImageEvent) -> None:
    """Handle image messages: identify ingredients and generate a recipe."""
    user_id, reply_token, tenant_id = event.user_id, event.reply_token, event.tenant_id

    async def reply(msg):
        await _reply_line(reply_token, msg, user_id=user_id)

    try:
        image_quota = await consume_quota(
            user_id=user_id,
            tenant_id=tenant_id,
            units=1,
            event_type="image_recipe_generation",
        )
        if not image_quota.allowed:
            upgrade_url = build_checkout_url(user_id=user_id, tenant_id=tenant_id, plan_key="pro")
            await reply(TextMessage(
                text=(
                    "👨‍🍳 今日免費額度已用完。\n"
                    f"目前方案：{image_quota.plan_key}，每日上限 {image_quota.limit} 次。\n"
                    f"請明天再試，或升級方案解鎖更多次數：{upgrade_url}"
                )
            ))
            return

        # Download the image from LINE
        image_bytes = await download_line_image(event.message_id)
        logger.info("Downloaded image %s for user %s (%d bytes)", event.message_id, user_id, len(image_bytes))

        # Identify ingredients using AI vision
        ingredients_text = await identify_ingredients_from_image(image_bytes)
        logger.info("Identified ingredients for user %s: %s", user_id, ingredients_text)

        if "無法辨識" in ingredients_text or not ingredients_text:
            await reply(TextMessage(
                text="👨‍🍳 這張照片看起來不太像食材呢…\n請拍一張冰箱裡的食材或食物的照片，我來幫你想菜單！"
            ))
            return

        # Feed identified ingredients into the recipe generation flow
        fake_text = f"我有這些食材：{ingredients_text}，可以做什麼料理？"
        fake_event = WebhookMessageEvent(
            reply_token=reply_token,
            user_id=user_id,
            text=fake_text,
            tenant_id=tenant_id,
        )
        await process_ai_reply(fake_event, skip_quota_check=True)

    except Exception as exc:
        incr("handler.image.errors_total")
        logger.exception("Image processing failed for user %s: %s", user_id, exc)
        await reply(TextMessage(
            text="👨‍🍳 照片處理時發生了問題，請稍後再試，或直接告訴我你有哪些食材！"
        ))


# ─── Text message handler ───────────────────────────────────────────────────────

async def process_ai_reply(event: WebhookMessageEvent, *, skip_quota_check: bool = False) -> None:
    incr("handler.ai.calls_total")
    user_id, reply_token, tenant_id = event.user_id, event.reply_token, event.tenant_id
    user_message = event.text
    stripped = user_message.strip()

    async def reply(msg):
        await _reply_line(reply_token, msg, user_id=user_id)

    # ── Quick commands ──

    if len(user_message) > MAX_MESSAGE_LENGTH:
        await reply(TextMessage(text=f"👨‍🍳 請把需求濃縮在 {MAX_MESSAGE_LENGTH} 字以內，讓廚房更容易發揮！"))
        return

    if stripped in RESET_KEYWORDS:
        await clear_user_memory(user_id)
        await reply(TextMessage(text=f"👨‍🍳 歡迎！廚房已備妥，{AI_MODEL_FOR_CALL} 已就緒。請問想吃什麼？"))
        return

    if stripped in {"選單", "開始"}:
        await reply(get_main_menu_flex())
        return

    if stripped in {"升級方案", "訂閱方案", "我要升級"}:
        upgrade_url = build_checkout_url(user_id=user_id, tenant_id=tenant_id, plan_key="pro")
        await reply(TextMessage(
            text=(
                "💳 升級方案\n"
                f"請點擊：{upgrade_url}\n"
                "完成後即可提升每日可生成次數。"
            )
        ))
        return

    if stripped in {"隱私聲明", "資料政策"}:
        await reply(TextMessage(
            text=(
                "🔐 資料使用說明\n"
                "1) 我們會儲存對話、收藏與用量資料以提供功能。\n"
                "2) 食譜建議僅供參考，請自行評估過敏原與食安風險。\n"
                "3) 輸入「刪除我的資料」可要求刪除您的資料。"
            )
        ))
        return

    if stripped in {"刪除我的資料", "忘記我"}:
        await delete_user_data(user_id=user_id, tenant_id=tenant_id)
        await reply(TextMessage(text="🧹 已受理並清除您的資料（含對話、收藏與用量記錄）。"))
        return

    if stripped == "清冰箱模式":
        await reply(TextMessage(text=(
            "👨‍🍳 生活需求模式開啟！\n\n"
            "你可以直接描述目前的情境，例如：\n"
            "・清冰箱：冰箱只剩下哪些食材？\n"
            "・兒童餐：小朋友幾歲、有沒有特別不吃的？\n\n"
            "我會自動套用「清冰箱」或「兒童餐」情境來設計菜單。"
        )))
        return

    if stripped == "幫我規劃預算食譜":
        await reply(TextMessage(text=(
            "👨‍🍳 預算方案模式開啟！\n\n"
            "請告訴我：預算金額、人數與大概想吃的料理方向，例如：\n"
            "「兩個人，預算 200 元內，想吃家常菜」\n\n"
            "我會以「成本控制優先」為原則，幫你規劃食譜與採買清單。"
        )))
        return

    if stripped == "我想根據心情點餐":
        await reply(TextMessage(text=(
            "☁️ 心情點餐模式開啟！\n\n"
            "請用幾個字描述現在的心情或場合，例如：\n"
            "「壓力超大」「想慶祝升遷」「今天很疲累只想快煮」\n\n"
            "我會把這個心情轉換成合適的料理風格與菜單。"
        )))
        return

    if stripped in CUISINE_SELECTOR_KEYWORDS:
        await reply(CUISINE_SELECTOR_MSG)
        return

    # ── Browse favorites ──

    if stripped in FAVORITES_KEYWORDS:
        favorites = await get_favorite_recipes(user_id)
        if not favorites:
            await reply(TextMessage(
                text="👨‍🍳 您還沒有收藏任何食譜呢！\n在食譜卡片上按「❤️ 收藏食譜」就能存下喜歡的菜色。"
            ))
            return
        await reply(build_favorites_carousel(favorites))
        return

    # ── Shopping list ──

    if stripped == VIEW_SHOPPING_CMD:
        last_recipe = await _get_last_recipe_json(user_id)
        if not last_recipe:
            await reply(TextMessage(text="👨‍🍳 尚未有食譜紀錄，請先輸入想吃的料理！"))
            return
        items = _parse_to_list(last_recipe.get("shopping_list", []))
        if not items:
            await reply(TextMessage(text="👨‍🍳 這份食譜沒有採買清單，請重新生成一份。"))
            return
        lines = ["🛒 採買清單"] + [f"• {_safe_str(s, '生鮮').lstrip('• ').strip()}" for s in items]
        await reply(TextMessage(text="\n".join(lines)))
        return

    # ── Random side dish ──

    if stripped == RANDOM_SIDEDISH_CMD:
        user_message = f"請用「{random.choice(RANDOM_STYLES)}」風格研發一道隨機配菜，不需要我先指定食材。"

    if not skip_quota_check:
        quota = await consume_quota(
            user_id=user_id,
            tenant_id=tenant_id,
            units=1,
            event_type="text_recipe_generation",
        )
        if not quota.allowed:
            upgrade_url = build_checkout_url(user_id=user_id, tenant_id=tenant_id, plan_key="pro")
            await reply(TextMessage(
                text=(
                    "👨‍🍳 今日免費額度已用完。\n"
                    f"目前方案：{quota.plan_key}，每日上限 {quota.limit} 次。\n"
                    f"你可以明天再來，或升級方案解鎖更多配方次數：{upgrade_url}"
                )
            ))
            return

    # ── Scenario detection ──

    scenario_prefix = _build_scenario_instructions(user_message)
    if scenario_prefix:
        user_message = scenario_prefix + user_message

    await reply(TextMessage(text="👨‍🍳 主廚正在為您研發菜單與擺盤，請稍候片刻..."))
    asyncio.create_task(
        _background_generate_recipe(
            user_id=user_id,
            tenant_id=tenant_id,
            user_message=user_message,
        )
    )


# ─── Postback handler ────────────────────────────────────────────────────────────

async def process_postback_reply(event: WebhookPostbackEvent) -> None:
    incr("handler.postback.calls_total")
    data = event.data.strip()
    parsed = parse_qs(data)
    action = (parsed.get("action") or [None])[0]

    # ── Save recipe ──
    if data.startswith("save_recipe:"):
        recipe_name = _safe_str(data[len("save_recipe:"):].strip(), "美味食譜", max_len=200)
        recipe_data = await _get_last_recipe_json(event.user_id) or {"recipe_name": recipe_name}
        if await save_favorite_recipe(event.user_id, recipe_name, recipe_data):
            await _reply_line(
                event.reply_token,
                TextMessage(text=f"✅ 食譜『{recipe_name}』已成功收入您的專屬米其林收藏庫！"),
                user_id=event.user_id,
            )
        else:
            await _reply_line(
                event.reply_token,
                TextMessage(
                    text="👨‍🍳 收藏失敗，請稍後再試，或確認已設定 DATABASE_URL（Render Postgres）或 Supabase。"
                ),
                user_id=event.user_id,
            )
        return

    # ── Redo recipe ──
    if action == "redo_recipe":
        name = (parsed.get("name") or ["美味食譜"])[0]
        fake_event = WebhookMessageEvent(
            reply_token=event.reply_token,
            user_id=event.user_id,
            text=f"請重新製作「{name}」這道菜",
            tenant_id=event.tenant_id,
        )
        await process_ai_reply(fake_event)
        return

    # ── Delete favorite ──
    if action == "delete_favorite":
        recipe_id_str = (parsed.get("id") or ["0"])[0]
        try:
            recipe_id = int(recipe_id_str)
        except ValueError:
            recipe_id = 0
        if recipe_id and await delete_favorite_recipe(event.user_id, recipe_id):
            await _reply_line(event.reply_token, TextMessage(text="🗑️ 已從收藏中移除！"), user_id=event.user_id)
        else:
            await _reply_line(event.reply_token, TextMessage(text="👨‍🍳 刪除失敗，請稍後再試。"), user_id=event.user_id)
        return

    # ── Change cuisine ──
    if action == "change_cuisine":
        cuisine = (parsed.get("cuisine") or [""])[0]
        if cuisine:
            await update_user_cuisine_context(event.user_id, cuisine)
            fake_event = WebhookMessageEvent(
                reply_token=event.reply_token,
                user_id=event.user_id,
                text=f"請根據 {CUISINE_LABELS.get(cuisine, '該')} 風格推薦一道料理",
                tenant_id=event.tenant_id,
            )
            await process_ai_reply(fake_event)
        return

    # Other unknown postbacks are silently ignored
