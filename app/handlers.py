"""LINE message and postback event handlers."""
from __future__ import annotations

import asyncio
import json
import random
from urllib.parse import parse_qs

from linebot.v3.messaging import (
    AsyncApiClient,
    AsyncMessagingApi,
    FlexMessage,
    ImageMessage,
    PushMessageRequest,
    ReplyMessageRequest,
    TextMessage,
)

from app.config import (
    CUISINE_LABELS,
    CUISINE_SELECTOR_KEYWORDS,
    FAVORITES_KEYWORDS,
    MAX_MESSAGE_LENGTH,
    PUBLIC_APP_BASE_URL,
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
    get_user_memory,
    is_database_configured,
    save_favorite_recipe,
    update_user_cuisine_context,
)
from app.helpers import (
    _extract_json,
    _parse_to_list,
    _safe_str,
)
from app.handlers_commands import dispatch_recipe_generation
from app.handlers_recipe_flow import background_generate_recipe
from app.handlers_recipe_flow import build_recipe_flex_message
from app.flex_messages import (
    CUISINE_SELECTOR_MSG,
    build_favorites_carousel,
    get_main_menu_flex,
)
from app.ai_service import (
    _get_last_recipe_json,
    download_line_image,
    generate_recipe_image,
    get_cached_recipe_image,
    identify_ingredients_from_image,
    search_youtube_video,
)
from app.billing import consume_quota
from app.observability import incr
from app.recipe_hero_media import register_recipe_hero_png
from app.recipe_poster_html import render_recipe_poster_png_html as render_recipe_poster_png
from app.subscriptions import build_checkout_url


# ─── LINE Reply helper ──────────────────────────────────────────────────────────

def _normalize_line_messages(msg: TextMessage | FlexMessage | ImageMessage | list[TextMessage | FlexMessage | ImageMessage]):
    return msg if isinstance(msg, list) else [msg]


async def _reply_line(
    reply_token: str,
    msg: TextMessage | FlexMessage | ImageMessage | list[TextMessage | FlexMessage | ImageMessage],
    user_id: str | None = None,
) -> None:
    async with AsyncApiClient(line_configuration) as api_client:
        api = AsyncMessagingApi(api_client)
        messages = _normalize_line_messages(msg)
        try:
            await api.reply_message(ReplyMessageRequest(reply_token=reply_token, messages=messages))
            incr("line.reply.success_total")
            return
        except Exception as exc:
            logger.warning("Reply API failed; trying push fallback: %s", exc)
            incr("line.reply.errors_total")
            if user_id:
                await api.push_message(PushMessageRequest(to=user_id, messages=messages))
                incr("line.push_fallback.success_total")
                return
            raise


async def _push_line_message(
    user_id: str,
    msg: TextMessage | FlexMessage | ImageMessage | list[TextMessage | FlexMessage | ImageMessage],
) -> None:
    """Send a push message to LINE user with a lightweight retry."""
    messages = _normalize_line_messages(msg)
    for attempt in range(2):
        try:
            async with AsyncApiClient(line_configuration) as api_client:
                api = AsyncMessagingApi(api_client)
                await api.push_message(PushMessageRequest(to=user_id, messages=messages))
            incr("line.push.success_total")
            return
        except Exception as exc:
            if attempt == 0:
                logger.warning("Push retry user=%s due to: %s", user_id, exc)
                await asyncio.sleep(0.3)
                continue
            raise


async def _get_recipe_json_by_timestamp(user_id: str, timestamp: str, tenant_id: str = "default") -> dict | None:
    if not timestamp:
        return None
    history = await get_user_memory(user_id, tenant_id=tenant_id)
    for msg in reversed(history):
        if msg.get("role") != "assistant":
            continue
        if (msg.get("timestamp") or "") != timestamp:
            continue
        try:
            return _extract_json(msg.get("content") or "")
        except (ValueError, json.JSONDecodeError):
            return None
    return None


async def _background_generate_recipe(
    *,
    user_id: str,
    tenant_id: str,
    user_message: str,
    quota_remaining: int | None = None,
    quota_limit: int | None = None,
    quota_plan_key: str | None = None,
) -> None:
    await background_generate_recipe(
        user_id=user_id,
        tenant_id=tenant_id,
        user_message=user_message,
        push_fn=_push_line_message,
        quota_remaining=quota_remaining,
        quota_limit=quota_limit,
        quota_plan_key=quota_plan_key,
    )


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
        await clear_user_memory(user_id, tenant_id=tenant_id)
        await reply(TextMessage(
            text=(
                f"👨‍🍳 歡迎！廚房已備妥，{AI_MODEL_FOR_CALL} 已就緒。\n"
                "可直接輸入料理需求，或點螢幕下方圖文選單快速開始。"
            )
        ))
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
        favorites = await get_favorite_recipes(user_id, tenant_id=tenant_id)
        if not favorites:
            await reply(TextMessage(
                text="👨‍🍳 您還沒有收藏任何食譜呢！\n在食譜卡片上按「❤️ 收藏食譜」就能存下喜歡的菜色。"
            ))
            return
        await reply(build_favorites_carousel(favorites))
        return

    # ── Shopping list ──

    if stripped == VIEW_SHOPPING_CMD:
        last_recipe = await _get_last_recipe_json(user_id, tenant_id=tenant_id)
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

    await dispatch_recipe_generation(
        user_id=user_id,
        tenant_id=tenant_id,
        user_message=user_message,
        reply_fn=reply,
        background_fn=_background_generate_recipe,
        skip_quota_check=skip_quota_check,
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
        recipe_data = await _get_last_recipe_json(event.user_id, tenant_id=event.tenant_id) or {"recipe_name": recipe_name}
        if not is_database_configured():
            await _reply_line(
                event.reply_token,
                TextMessage(
                    text=(
                        "👨‍🍳 尚未連結資料庫，無法收藏食譜。\n"
                        "請管理員在部署環境設定 **DATABASE_URL**（Render Postgres）。"
                    )
                ),
                user_id=event.user_id,
            )
        elif await save_favorite_recipe(event.user_id, recipe_name, recipe_data, tenant_id=event.tenant_id):
            await _reply_line(
                event.reply_token,
                TextMessage(text=f"✅ 食譜『{recipe_name}』已成功收入您的專屬米其林收藏庫！"),
                user_id=event.user_id,
            )
        else:
            await _reply_line(
                event.reply_token,
                TextMessage(
                    text=(
                        "👨‍🍳 收藏寫入失敗（資料庫連線或表格異常）。\n"
                        "請稍後再試；若持續發生，請管理員檢查 Postgres 連線與 migration。"
                    )
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

    # ── Expand recipe steps ──
    if action == "expand_steps":
        requested_ts = (parsed.get("ts") or [""])[0]
        if requested_ts:
            recipe = await _get_recipe_json_by_timestamp(
                event.user_id,
                requested_ts,
                tenant_id=event.tenant_id,
            )
        else:
            recipe = await _get_last_recipe_json(event.user_id, tenant_id=event.tenant_id)
        if not recipe:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 找不到最近食譜，請先生成一道新料理。"),
                user_id=event.user_id,
            )
            return
        name = _safe_str((parsed.get("name") or [recipe.get("recipe_name") or "這道料理"])[0], "這道料理", max_len=48)
        steps = _parse_to_list(recipe.get("steps", []))
        if not steps:
            await _reply_line(
                event.reply_token,
                TextMessage(text=f"👨‍🍳「{name}」目前沒有可展開的步驟。"),
                user_id=event.user_id,
            )
            return
        requested_name = _safe_str((parsed.get("name") or [""])[0], "")
        if requested_name and _safe_str(recipe.get("recipe_name"), "") and requested_name != _safe_str(recipe.get("recipe_name"), ""):
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 這張卡片的步驟已過期，請重新開啟最新食譜再試一次。"),
                user_id=event.user_id,
            )
            return
        lines = [f"📋 {name} 完整步驟"] + [
            f"{i + 1}. {_safe_str(step, '步驟內容待補')}" for i, step in enumerate(steps)
        ]
        await _reply_line(
            event.reply_token,
            TextMessage(text="\n".join(lines)[:5000]),
            user_id=event.user_id,
        )
        return

    # ── Generate recipe hero image on demand ──
    if action == "generate_recipe_image":
        requested_ts = (parsed.get("ts") or [""])[0]
        if requested_ts:
            recipe = await _get_recipe_json_by_timestamp(
                event.user_id,
                requested_ts,
                tenant_id=event.tenant_id,
            )
        else:
            recipe = await _get_last_recipe_json(event.user_id, tenant_id=event.tenant_id)
        if not recipe:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 找不到最近食譜，請先生成一道新料理。"),
                user_id=event.user_id,
            )
            return
        recipe_name = _safe_str(recipe.get("recipe_name"), "這道料理", max_len=48)
        requested_name = _safe_str((parsed.get("name") or [""])[0], "")
        if requested_name and recipe_name and requested_name != recipe_name:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 這張卡片已過期，請先重新開啟最新食譜再試一次。"),
                user_id=event.user_id,
            )
            return
        cached_photo = await get_cached_recipe_image(recipe_name)
        if not cached_photo:
            await _reply_line(
                event.reply_token,
                TextMessage(text=f"👨‍🍳 主廚正在為「{recipe_name}」準備擺盤照，請稍候片刻..."),
                user_id=event.user_id,
            )
            photo_url = await generate_recipe_image(recipe_name)
        else:
            photo_url = cached_photo
        video_url = await search_youtube_video(recipe_name)
        recipe_lookup_ts = requested_ts or _safe_str(recipe.get("timestamp"), "")
        flex_msg = build_recipe_flex_message(
            recipe,
            recipe_lookup_ts=recipe_lookup_ts,
            photo_url=photo_url,
            video_url=video_url,
        )
        if cached_photo:
            await _reply_line(event.reply_token, flex_msg, user_id=event.user_id)
        else:
            await _push_line_message(event.user_id, flex_msg)
        return

    # ── Generate recipe poster on demand ──
    if action == "generate_recipe_poster":
        requested_ts = (parsed.get("ts") or [""])[0]
        if requested_ts:
            recipe = await _get_recipe_json_by_timestamp(
                event.user_id,
                requested_ts,
                tenant_id=event.tenant_id,
            )
        else:
            recipe = await _get_last_recipe_json(event.user_id, tenant_id=event.tenant_id)
        if not recipe:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 找不到最近食譜，請先生成一道新料理。"),
                user_id=event.user_id,
            )
            return
        recipe_name = _safe_str(recipe.get("recipe_name"), "這道料理", max_len=48)
        requested_name = _safe_str((parsed.get("name") or [""])[0], "")
        if requested_name and recipe_name and requested_name != recipe_name:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 這張卡片已過期，請先重新開啟最新食譜再試一次。"),
                user_id=event.user_id,
            )
            return
        await _reply_line(
            event.reply_token,
            TextMessage(text=f"👨‍🍳 正在為「{recipe_name}」排版食譜海報，請稍候片刻..."),
            user_id=event.user_id,
        )
        try:
            photo_url = await get_cached_recipe_image(recipe_name)
            poster_recipe = dict(recipe)
            if photo_url:
                poster_recipe["photo_url"] = photo_url
            poster_png = await asyncio.to_thread(render_recipe_poster_png, poster_recipe)
            poster_url = await register_recipe_hero_png(poster_png)
            if not poster_url or not poster_url.startswith("https://"):
                raise RuntimeError("PUBLIC_APP_BASE_URL missing")
            await _push_line_message(
                event.user_id,
                ImageMessage(original_content_url=poster_url, preview_image_url=poster_url),
            )
        except Exception as exc:
            logger.exception("Recipe poster generation failed for user %s: %s", event.user_id, exc)
            if not PUBLIC_APP_BASE_URL.startswith("https://"):
                await _push_line_message(
                    event.user_id,
                    TextMessage(text="👨‍🍳 食譜海報需要公開網址才能回傳圖片，請管理員設定 PUBLIC_APP_BASE_URL 為 https 網址。"),
                )
                return
            await _push_line_message(
                event.user_id,
                TextMessage(text="👨‍🍳 食譜海報生成失敗，請稍後再試。"),
            )
        return

    # ── Delete favorite ──
    if action == "delete_favorite":
        recipe_id_str = (parsed.get("id") or ["0"])[0]
        try:
            recipe_id = int(recipe_id_str)
        except ValueError:
            recipe_id = 0
        if not is_database_configured():
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 尚未連結資料庫，無法變更收藏。請管理員設定 DATABASE_URL。"),
                user_id=event.user_id,
            )
        elif recipe_id and await delete_favorite_recipe(event.user_id, recipe_id, tenant_id=event.tenant_id):
            await _reply_line(event.reply_token, TextMessage(text="🗑️ 已從收藏中移除！"), user_id=event.user_id)
        else:
            await _reply_line(
                event.reply_token,
                TextMessage(text="👨‍🍳 刪除失敗（連線或資料異常），請稍後再試。"),
                user_id=event.user_id,
            )
        return

    # ── Change cuisine ──
    if action == "change_cuisine":
        cuisine = (parsed.get("cuisine") or [""])[0]
        if cuisine:
            await update_user_cuisine_context(event.user_id, cuisine, tenant_id=event.tenant_id)
            fake_event = WebhookMessageEvent(
                reply_token=event.reply_token,
                user_id=event.user_id,
                text=f"請根據 {CUISINE_LABELS.get(cuisine, '該')} 風格推薦一道料理",
                tenant_id=event.tenant_id,
            )
            await process_ai_reply(fake_event)
        return

    # Other unknown postbacks are silently ignored
