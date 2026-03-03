from __future__ import annotations

import asyncio
import ast
import base64
import functools
import hashlib
import hmac
import json
import logging
import os
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import parse_qs

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from dotenv import load_dotenv
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    AsyncApiClient,
    AsyncMessagingApi,
    Configuration,
    FlexContainer,
    FlexMessage,
    ReplyMessageRequest,
    TextMessage,
)
from openai import AsyncOpenAI, APITimeoutError
from supabase import create_client, Client

# ─── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "").lower() in ("1", "true", "yes") else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chef-agent")

# ─── Environment ────────────────────────────────────────────────────────────────

load_dotenv()

def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return val


LINE_CHANNEL_ACCESS_TOKEN = _require_env("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = _require_env("LINE_CHANNEL_SECRET")
MODEL_NAME                = os.getenv("MODEL_NAME", "gemini-3-flash-preview")
SUPABASE_URL              = os.getenv("SUPABASE_URL")
SUPABASE_KEY              = os.getenv("SUPABASE_KEY")

# 任何 gemini-* 模型使用 GEMINI_API_KEY 直連 Google；其他模型走 OpenRouter
_mn = MODEL_NAME.removeprefix("google/")
USE_GEMINI_DIRECT = _mn.startswith("gemini-")
if USE_GEMINI_DIRECT:
    GEMINI_API_KEY = _require_env("GEMINI_API_KEY")
    OPENROUTER_API_KEY = None
else:
    OPENROUTER_API_KEY = _require_env("OPENROUTER_API_KEY")
    GEMINI_API_KEY = None

# ─── Constants ──────────────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH    = 500
MAX_HISTORY_TURNS     = 3
MAX_COMPLETION_TOKENS = 2048
DEBUG_MODE           = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
MAX_WEBHOOK_BODY     = 1_000_000
LINE_TEXT_MAX        = 5000

RESET_KEYWORDS = {"清除記憶", "重新開始", "洗腦", "你好", "嗨"}
CUISINE_SELECTOR_KEYWORDS = {"換菜單"}
RANDOM_SIDEDISH_CMD = "🍳 隨機配菜"
VIEW_SHOPPING_CMD   = "🛒 檢視清單"

RANDOM_STYLES = [
    "台式熱炒", "日式家常", "法式經典", "義式料理", "韓式料理",
    "泰式風味", "中式川菜", "地中海風情", "美式 comfort food", "越南河粉風格",
]

SCENARIO_CLEAR_FRIDGE = (["清冰箱", "剩下", "剩食"], "以用戶剩餘食材為核心，最少額外採買。")
SCENARIO_KIDS_MEAL = (["小孩", "兒童", "兒子"], "四歲兒童餐：溫和不辣、好咀嚼、營養均衡。")
SCENARIO_BUDGET = (["預算", "便宜", "省錢", "方案"], "預算方案：行政主廚需討論 CP 值，食材總管嚴格控管 NT$ 預算。")
SCENARIO_MOOD   = (["心情", "壓力", "開心", "難過"], "心情點餐：副主廚需根據情緒推薦溫暖或清爽的口感，提供情緒支持。")

SYSTEM_PROMPT = (
    "你是米其林三星廚房(行政主廚/副主廚/食材總管)。三位各一句(≤15字)討論後產出食譜。"
    "僅回傳JSON，不加說明：\n"
    '{"kitchen_talk":[{"role":"角色","content":"≤15字"}],'
    '"theme":"主題","recipe_name":"菜名",'
    '"ingredients":[{"name":"食材","price":"NT$XX"}],'
    '"steps":["步驟"],"shopping_list":["區塊：品項"],'
    '"estimated_total_cost":"數字"}'
)

ROLE_COLORS: dict[str, str] = {"行政主廚": "#9F1239", "副主廚": "#B45309", "食材總管": "#166534"}

CUISINE_LABELS: dict[str, str] = {
    "taiwanese": "台灣小吃",
    "thai": "泰式料理",
    "japanese_ramen": "日式拉麵與定食",
    "european_american": "歐美家常菜",
    "kids_meal": "兒童專屬特餐",
}

# ─── Clients ────────────────────────────────────────────────────────────────────

app = FastAPI(title="米其林職人大腦", version="1.0.0")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase connected successfully.")
    except Exception as exc:
        logger.warning("Supabase init failed: %s", exc)

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)

if USE_GEMINI_DIRECT:
    ai_client = AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=GEMINI_API_KEY,
        max_retries=1,
    )
    AI_MODEL_FOR_CALL = _mn
else:
    ai_client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
        default_headers={"HTTP-Referer": "https://run.app", "X-Title": "My Chef AI Agent"},
        max_retries=1,
    )
    AI_MODEL_FOR_CALL = MODEL_NAME

# ─── Webhook Event Models ────────────────────────────────────────────────────────

@dataclass
class WebhookMessageEvent:
    reply_token: str
    user_id: str
    text: str


@dataclass
class WebhookPostbackEvent:
    reply_token: str
    user_id: str
    data: str

# ─── Safe DB Decorator (DRY) ─────────────────────────────────────────────────────

def safe_db(fallback=None):
    """將同步 Supabase 查詢包成 async，自動處理連線與錯誤。"""
    def deco(sync_fn):
        @functools.wraps(sync_fn)
        async def wrapped(*args, **kwargs):
            if not supabase:
                return fallback
            try:
                return await asyncio.to_thread(sync_fn, *args, **kwargs)
            except Exception as exc:
                logger.warning("DB %s failed: %s", sync_fn.__name__, exc)
                return fallback
        return wrapped
    return deco

# ─── Memory (100% Supabase, Async) ───────────────────────────────────────────────

def _user_memory_select(user_id: str) -> list:
    res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
    return res.data[0]["history"] if res.data else []


def _user_memory_upsert(user_id: str, history: list) -> None:
    supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()


def _user_memory_delete(user_id: str) -> None:
    supabase.table("user_memory").delete().eq("user_id", user_id).execute()


def _user_preferences_select(user_id: str) -> str | None:
    res = supabase.table("user_preferences").select("preferences").eq("user_id", user_id).execute()
    if not res.data:
        return None
    prefs = res.data[0].get("preferences")
    if prefs is None:
        return None
    if isinstance(prefs, list):
        return "、".join(str(p) for p in prefs) if prefs else None
    return str(prefs).strip() or None


def _favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    supabase.table("favorite_recipes").insert({
        "user_id": user_id,
        "recipe_name": recipe_name,
        "recipe_data": recipe_data,
    }).execute()
    return True


@safe_db([])
def get_user_memory(user_id: str) -> list:
    return _user_memory_select(user_id)


@safe_db((None, None))
def get_user_cuisine_context(user_id: str) -> tuple[str | None, str | None]:
    """回傳 (active_cuisine, context_updated_at)，若無則 (None, None)。"""
    return _user_cuisine_context_select(user_id)


def _filter_history_after_context(history: list, context_updated_at: str | None) -> list:
    """
    依 context_updated_at 過濾歷史，只保留時間戳記大於該時間的訊息。
    無 timestamp 的舊訊息視為早於任何 context_updated_at，予以排除。
    """
    if not context_updated_at:
        return history
    cutoff = context_updated_at
    return [m for m in history if (m.get("timestamp") or "") > cutoff]


async def _fetch_ai_context(user_id: str) -> tuple[list, list, str | None, str | None]:
    """
    一次查詢取得 full_history、filtered_history、active_cuisine、preferences。
    三個 DB 查詢平行執行，避免串行延遲。
    """
    full_history, (active_cuisine, context_updated_at), prefs = await asyncio.gather(
        get_user_memory(user_id),
        get_user_cuisine_context(user_id),
        get_user_preferences(user_id),
    )
    filtered = _filter_history_after_context(full_history, context_updated_at)
    return full_history, filtered, active_cuisine, prefs


@safe_db(None)
def save_user_memory(user_id: str, history: list) -> None:
    return _user_memory_upsert(user_id, history)


@safe_db(None)
def clear_user_memory(user_id: str) -> None:
    return _user_memory_delete(user_id)


@safe_db(None)
def get_user_preferences(user_id: str) -> str | None:
    return _user_preferences_select(user_id)


@safe_db(False)
def save_favorite_recipe(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    return _favorite_recipes_insert(user_id, recipe_name, recipe_data)


def _user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    """同步查詢使用者的 active_cuisine 與 context_updated_at。回傳 (cuisine, context_updated_at)。"""
    res = supabase.table("user_cuisine_context").select("active_cuisine, context_updated_at").eq("user_id", user_id).execute()
    if not res.data:
        return None, None
    row = res.data[0]
    return row.get("active_cuisine"), row.get("context_updated_at")


def _user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
    """同步更新使用者的 active_cuisine 與 context_updated_at。"""
    supabase.table("user_cuisine_context").upsert(
        {
            "user_id": user_id,
            "active_cuisine": active_cuisine,
            "context_updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


async def update_user_cuisine_context(user_id: str, cuisine: str) -> None:
    """
    非同步更新使用者的菜系情境。
    使用 asyncio.to_thread 包裝 Supabase 同步操作，更新 active_cuisine 與 context_updated_at。
    """
    if not supabase:
        logger.warning("Supabase not configured, skip update_user_cuisine_context")
        return
    try:
        await asyncio.to_thread(_user_cuisine_context_upsert, user_id, cuisine)
        logger.info("Updated cuisine context for user %s: %s", user_id, cuisine)
    except Exception as exc:
        logger.warning("update_user_cuisine_context failed: %s", exc)

# ─── Helpers ────────────────────────────────────────────────────────────────────

def _build_system_prompt(prefs: str | None = None, current_cuisine: str | None = None) -> str:
    base = SYSTEM_PROMPT
    # 預算與心情相關指示，協助 AI 理解額外維度
    base += "\n若涉及「預算方案」，請在 kitchen_talk 中討論 CP 值與採買策略，並嚴格控制 estimated_total_cost。"
    base += "\n若涉及「心情點餐」，請副主廚針對該心情提供具情緒價值與儀式感的料理建議。"
    if prefs:
        base += f"\n飲食禁忌：{prefs}。"
    if current_cuisine and current_cuisine != "不拘":
        base += f"\n料理情境：{current_cuisine}。聚焦此風格。"
    return base


def _build_scenario_instructions(text: str) -> str:
    labeled_scenarios = [
        ("清冰箱", SCENARIO_CLEAR_FRIDGE),
        ("兒童餐", SCENARIO_KIDS_MEAL),
        ("預算方案", SCENARIO_BUDGET),
        ("心情點餐", SCENARIO_MOOD),
    ]
    parts = [
        f"【{label}模式】{scenario[1]}"
        for label, scenario in labeled_scenarios
        if any(k in text for k in scenario[0])
    ]
    return "\n\n".join(parts) + "\n\n" if parts else ""


def _safe_str(val: object, fallback: str = "-", max_len: int | None = None) -> str:
    s = str(val).strip()
    if not s or s in ("{}", "[]", "None", "null"):
        return fallback
    if max_len and len(s) > max_len:
        return s[: max_len - 1] + "…"
    return s


def _parse_to_list(data: object) -> list:
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    if isinstance(data, str):
        try:
            parsed = ast.literal_eval(data)
            return parsed if isinstance(parsed, list) else [parsed] if isinstance(parsed, dict) else [str(parsed)]
        except (ValueError, SyntaxError):
            return [line for line in data.split("\n") if line.strip()]
    return [str(data)]


def _extract_json(text: str) -> dict:
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in AI response")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("Malformed JSON in AI response")


def _parse_ai_json(text: str) -> dict:
    """優先直接解析 JSON，失敗時從回應文字中擷取。"""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return _extract_json(text)


def _condense_assistant_message(content: str, max_chars: int = 80) -> str:
    """將長回覆壓縮為摘要，減少 token 消耗。"""
    if not content or len(content) <= max_chars:
        return content
    try:
        data = _extract_json(content)
        name = data.get("recipe_name", "")
        if name:
            return f"【上次食譜】{name}"
    except (ValueError, json.JSONDecodeError):
        pass
    return content[: max_chars - 2] + "…"


async def _get_last_recipe_json(user_id: str) -> dict | None:
    history = await get_user_memory(user_id)
    for msg in reversed(history):
        if msg.get("role") != "assistant":
            continue
        try:
            return _extract_json(msg.get("content") or "")
        except (ValueError, json.JSONDecodeError):
            continue
    return None

# ─── Signature ──────────────────────────────────────────────────────────────────

def _validate_signature(body: bytes, signature: str) -> None:
    if not LINE_CHANNEL_SECRET or not signature:
        raise InvalidSignatureError()
    hash_val = hmac.new(LINE_CHANNEL_SECRET.encode("utf-8"), body, hashlib.sha256).digest()
    expected = base64.b64encode(hash_val).decode("utf-8")
    if not hmac.compare_digest(signature, expected):
        raise InvalidSignatureError()

# ─── LINE Reply (Async) ─────────────────────────────────────────────────────────

async def _reply_line(reply_token: str, msg: TextMessage | FlexMessage) -> None:
    async with AsyncApiClient(configuration) as api_client:
        await AsyncMessagingApi(api_client).reply_message(
            ReplyMessageRequest(reply_token=reply_token, messages=[msg])
        )

# ─── Flex Message Engine ────────────────────────────────────────────────────────

CUISINE_CAROUSEL_CARDS = [
    {
        "title": "🇹🇼 台灣小吃",
        "cuisine": "taiwanese",
        "image_url": "https://placehold.co/400x300/EA580C/FFFFFF?text=%F0%9F%87%B9%F0%9F%87%BC+%E5%8F%B0%E7%81%A3%E5%B0%8F%E5%90%83",
        "description": "滷肉飯、蚵仔煎、牛肉麵、珍珠奶茶…道地台灣味，家常好上手。",
        "display_text": "已為您切換至台灣小吃情境！",
    },
    {
        "title": "🇹🇭 泰式料理",
        "cuisine": "thai",
        "image_url": "https://placehold.co/400x300/166534/FFFFFF?text=%F0%9F%87%B9%F0%9F%87%AD+%E6%B3%B0%E5%BC%8F%E6%96%99%E7%90%86",
        "description": "酸辣開胃、香茅檸檬、打拋豬、綠咖哩，南洋風情一次滿足。",
        "display_text": "已為您切換至泰式料理情境！",
    },
    {
        "title": "🇯🇵 日式拉麵與定食",
        "cuisine": "japanese_ramen",
        "image_url": "https://placehold.co/400x300/9F1239/FFFFFF?text=%F0%9F%87%AF%F0%9F%87%B5+%E6%97%A5%E5%BC%8F%E6%8B%89%E9%BA%B5",
        "description": "拉麵、丼飯、定食、壽司，日式職人精神，在家也能重現。",
        "display_text": "已為您切換至日式拉麵與定食情境！",
    },
    {
        "title": "🇪🇺 歐美家常菜",
        "cuisine": "european_american",
        "image_url": "https://placehold.co/400x300/1E40AF/FFFFFF?text=%F0%9F%87%AA%F0%9F%87%BA+%E6%AD%90%E7%BE%8E%E5%AE%B6%E5%B8%B8%E8%8F%9C",
        "description": "義大利麵、牛排、燉飯、烤雞，西式經典輕鬆上桌。",
        "display_text": "已為您切換至歐美家常菜情境！",
    },
    {
        "title": "👶 兒童專屬特餐",
        "cuisine": "kids_meal",
        "image_url": "https://placehold.co/400x300/F59E0B/FFFFFF?text=%F0%9F%91%B6+%E5%85%92%E7%AB%A5%E5%B0%88%E5%B1%AC%E7%89%B9%E9%A4%90",
        "description": "溫和不辣、好咀嚼、營養均衡，專為小朋友設計的安心料理。",
        "display_text": "已為您切換至兒童專屬特餐情境！",
    },
]


def get_cuisine_selector_flex_message() -> FlexMessage:
    """
    回傳 LINE Carousel Flex Message，供使用者選擇菜系情境。
    每張卡片的「選擇此菜系」按鈕綁定 PostbackAction，data 格式為 query string。
    """
    bubbles = []
    for card in CUISINE_CAROUSEL_CARDS:
        bubble = {
            "type": "bubble",
            "hero": {
                "type": "image",
                "url": card["image_url"],
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": card["title"],
                        "weight": "bold",
                        "size": "xl",
                        "color": "#1F2937",
                    },
                    {
                        "type": "text",
                        "text": card["description"],
                        "size": "sm",
                        "color": "#6B7280",
                        "wrap": True,
                        "margin": "md",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#EA580C",
                        "action": {
                            "type": "postback",
                            "label": "選擇此菜系",
                            "data": f"action=change_cuisine&cuisine={card['cuisine']}",
                            "displayText": card["display_text"],
                        },
                    },
                ],
            },
        }
        bubbles.append(bubble)

    carousel_dict = {"type": "carousel", "contents": bubbles}
    return FlexMessage(
        alt_text="請選擇您想探索的菜系",
        contents=FlexContainer.from_dict(carousel_dict),
    )


def get_main_menu_flex() -> FlexMessage:
    """產出五大核心功能的主選單"""
    menu_dict = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "👨‍🍳 米其林職人服務", "weight": "bold", "color": "#FFFFFF"}
            ],
            "backgroundColor": "#EA580C"
        },
        "body": {
            "type": "box", "layout": "vertical", "spacing": "md",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#9F1239",
                    "action": {
                        "type": "message",
                        "label": "🍱 各式菜色",
                        "text": "換菜單",
                    },
                },
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#B45309",
                    "action": {
                        "type": "message",
                        "label": "🏠 生活需求",
                        "text": "清冰箱模式",
                    },
                },
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#166534",
                    "action": {
                        "type": "message",
                        "label": "💰 預算方案",
                        "text": "幫我規劃預算食譜",
                    },
                },
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#1E40AF",
                    "action": {
                        "type": "message",
                        "label": "☁️ 心情點餐",
                        "text": "我想根據心情點餐",
                    },
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "action": {
                        "type": "message",
                        "label": "🛒 採買食材",
                        "text": "🛒 檢視清單",
                    },
                },
            ],
        },
    }
    return FlexMessage(
        alt_text="開啟米其林職人菜單",
        contents=FlexContainer.from_dict(menu_dict),
    )


def generate_flex_message(
    kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost,
    recipe_name_for_postback: str | None = None,
) -> dict:
    talk_components = []
    for talk in _parse_to_list(kitchen_talk):
        role = "團隊"
        content = str(talk)
        if isinstance(talk, dict):
            role = talk.get("role", talk.get("角色", "團隊"))
            content = talk.get("content", talk.get("內容", str(talk)))
        color = next((c for k, c in ROLE_COLORS.items() if k in role), "#78350F")
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(role, "團隊"), "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": _safe_str(content, "...", LINE_TEXT_MAX), "color": "#431407", "size": "sm", "wrap": True, "flex": 1},
            ],
        })

    ingredient_rows = [
        {
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(
                    item.get("name", item.get("食材", str(item))) if isinstance(item, dict) else str(item), "食材"
                ), "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": _safe_str(
                    item.get("price", item.get("價格", "-")) if isinstance(item, dict) else "-", "-"
                ), "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0},
            ],
        }
        for item in _parse_to_list(ingredients)
    ]

    step_rows = [
        {
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": _safe_str(step, "進行中", LINE_TEXT_MAX).lstrip("0123456789. "), "color": "#431407", "size": "sm", "wrap": True, "flex": 1},
            ],
        }
        for i, step in enumerate(_parse_to_list(steps))
    ]

    shop_rows = [{"type": "text", "text": f"• {_safe_str(s, '生鮮')}", "size": "sm", "color": "#78350F", "margin": "sm"} for s in _parse_to_list(shopping_list)]
    favorite_action = (
        {"type": "postback", "label": "❤️ 收藏食譜", "data": f"save_recipe:{_safe_str(recipe_name_for_postback, '美味食譜')}"[:300]}
        if recipe_name_for_postback else {"type": "message", "label": "❤️ 收藏食譜", "text": "這套食譜很棒"}
    )

    return {
        "type": "bubble", "size": "giga",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
            "contents": [
                {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg", "contents": [
                    {"type": "text", "text": _safe_str(theme, "RECOMMENDATION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
                    {"type": "text", "text": _safe_str(recipe_name, "本日料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True},
                ]},
                {"type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "KITCHEN CONFERENCE", "size": "xxs", "weight": "bold", "color": "#B45309", "margin": "xs"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": talk_components},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "contents": [
                    {"type": "text", "text": "SHOPPING LIST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows or [{"type": "text", "text": "全聯生鮮"}]},
                ]},
                {"type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows or [{"type": "text", "text": "-"}]},
                    {"type": "separator", "margin": "xl", "color": "#FED7AA"},
                    {"type": "box", "layout": "horizontal", "margin": "lg", "contents": [
                        {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#9A3412", "flex": 0},
                        {"type": "text", "text": f"NT$ {_safe_str(estimated_total_cost, '估算中')}", "size": "xl", "weight": "bold", "color": "#431407", "align": "end"},
                    ]},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none", "contents": [
                    {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows or [{"type": "text", "text": "-"}]},
                ]},
            ],
        },
        "footer": {
            "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
            "contents": [
                {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": favorite_action},
            ],
        },
    }

# ─── Background: AI Reply ───────────────────────────────────────────────────────

async def process_ai_reply(event: WebhookMessageEvent) -> None:
    user_id, reply_token = event.user_id, event.reply_token
    user_message = event.text
    stripped = user_message.strip()

    async def reply(msg):
        await _reply_line(reply_token, msg)

    if len(user_message) > MAX_MESSAGE_LENGTH:
        await reply(TextMessage(text=f"👨‍🍳 請把需求濃縮在 {MAX_MESSAGE_LENGTH} 字以內，讓廚房更容易發揮！"))
        return

    if stripped in RESET_KEYWORDS:
        await clear_user_memory(user_id)
        await reply(TextMessage(text="👨‍🍳 歡迎！廚房已備妥，Gemini 3 Flash 已就緒。請問想吃什麼？"))
        return

    if stripped in {"選單", "開始"}:
        await reply(get_main_menu_flex())
        return

    # 主選單按鈕對應邏輯
    if stripped == "清冰箱模式":
        await reply(
            TextMessage(
                text=(
                    "👨‍🍳 生活需求模式開啟！\n\n"
                    "你可以直接描述目前的情境，例如：\n"
                    "・清冰箱：冰箱只剩下哪些食材？\n"
                    "・兒童餐：小朋友幾歲、有沒有特別不吃的？\n\n"
                    "我會自動套用「清冰箱」或「兒童餐」情境來設計菜單。"
                )
            )
        )
        return

    if stripped == "幫我規劃預算食譜":
        await reply(
            TextMessage(
                text=(
                    "👨‍🍳 預算方案模式開啟！\n\n"
                    "請告訴我：預算金額、人數與大概想吃的料理方向，例如：\n"
                    "「兩個人，預算 200 元內，想吃家常菜」\n\n"
                    "我會以「成本控制優先」為原則，幫你規劃食譜與採買清單。"
                )
            )
        )
        return

    if stripped == "我想根據心情點餐":
        await reply(
            TextMessage(
                text=(
                    "☁️ 心情點餐模式開啟！\n\n"
                    "請用幾個字描述現在的心情或場合，例如：\n"
                    "「壓力超大」「想慶祝升遷」「今天很疲累只想快煮」\n\n"
                    "我會把這個心情轉換成合適的料理風格與菜單。"
                )
            )
        )
        return

    if stripped in CUISINE_SELECTOR_KEYWORDS:
        await reply(get_cuisine_selector_flex_message())
        return

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

    if stripped == RANDOM_SIDEDISH_CMD:
        user_message = f"請用「{random.choice(RANDOM_STYLES)}」風格研發一道隨機配菜，不需要我先指定食材。"
    scenario_prefix = _build_scenario_instructions(user_message)
    if scenario_prefix:
        user_message = scenario_prefix + user_message

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
        {"role": m["role"], "content": _condense_assistant_message(m.get("content", "")) if m.get("role") == "assistant" else m.get("content", "")}
        for m in history
    ]

    try:
        t0 = time.perf_counter()
        response = await ai_client.chat.completions.create(
            model=AI_MODEL_FOR_CALL,
            messages=api_messages,
            temperature=0.3,
            max_tokens=MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            timeout=45.0,
        )
        elapsed = time.perf_counter() - t0
        ai_content = response.choices[0].message.content.strip()
        usage = getattr(response, "usage", None)
        if DEBUG_MODE:
            logger.debug("AI user=%s elapsed=%.2fs input_tokens=%s output_tokens=%s", user_id, elapsed,
                         getattr(usage, "prompt_tokens", "-") if usage else "-", getattr(usage, "completion_tokens", "-") if usage else "-")
            logger.debug("AI raw output for user %s: %s", user_id, ai_content[:200])
        elif usage and (usage.prompt_tokens or usage.completion_tokens):
            logger.info("AI user=%s elapsed=%.2fs tokens=%s+%s", user_id, elapsed, usage.prompt_tokens or 0, usage.completion_tokens or 0)
        ai_data = _parse_ai_json(ai_content)
        to_save = full_history + [
            {"role": "user", "content": user_message, "timestamp": now_iso},
            {"role": "assistant", "content": ai_content, "timestamp": now_iso},
        ]
        if len(to_save) > MAX_HISTORY_TURNS + 1:
            to_save = [to_save[0]] + to_save[-MAX_HISTORY_TURNS:]
        await save_user_memory(user_id, to_save)  # 存完整歷史，不刪除舊紀錄
        recipe_name = ai_data.get("recipe_name", "美味食譜")
        g = ai_data.get
        flex_dict = generate_flex_message(
            g("kitchen_talk", []), g("theme", ""), recipe_name,
            g("ingredients", []), g("steps", []), g("shopping_list", []), g("estimated_total_cost", ""),
            recipe_name_for_postback=recipe_name,
        )
        msg = FlexMessage(alt_text=f"職人提案：{recipe_name}", contents=FlexContainer.from_dict(flex_dict))
    except json.JSONDecodeError as exc:
        logger.error("JSON parse error for user %s: %s", user_id, exc)
        msg = TextMessage(
            text=f"👨‍🍳 廚房筆記有點亂 (JSONDecodeError): {str(exc)}\n請輸入「清除記憶」後再試一次！"
        )
    except ValueError as exc:
        logger.error("Value error for user %s: %s", user_id, exc)
        msg = TextMessage(
            text=f"👨‍🍳 AI 格式解析失敗 (ValueError): {str(exc)}\n請輸入「清除記憶」後換個說法試試。"
        )
    except Exception as exc:
        logger.exception("Unexpected error for user %s", user_id)
        if isinstance(exc, APITimeoutError):
            msg = TextMessage(text="👨‍🍳 AI 廚房反應太慢，請稍後再試！")
        else:
            msg = TextMessage(
                text=(
                    "👨‍🍳 呼叫 AI 時發生意外：\n"
                    f"{type(exc).__name__}: {str(exc)}\n\n"
                    "請截圖此錯誤並輸入「清除記憶」重試。"
                )
            )

    await reply(msg)


async def process_postback_reply(event: WebhookPostbackEvent) -> None:
    data = event.data.strip()
    if not data.startswith("save_recipe:"):
        return
    recipe_name = _safe_str(data[len("save_recipe:"):].strip(), "美味食譜", max_len=200)
    recipe_data = await _get_last_recipe_json(event.user_id) or {"recipe_name": recipe_name}
    if await save_favorite_recipe(event.user_id, recipe_name, recipe_data):
        await _reply_line(event.reply_token, TextMessage(text=f"✅ 食譜『{recipe_name}』已成功收入您的專屬米其林收藏庫！"))
    else:
        await _reply_line(event.reply_token, TextMessage(text="👨‍🍳 收藏失敗，請稍後再試或確認已設定 Supabase。"))

# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.api_route("/", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "ok", "message": "米其林職人大腦 (Gemini 3 Flash 驅動中)"}


@app.post("/callback")
async def callback(
    request: Request,
    background_tasks: BackgroundTasks,
    x_line_signature: str | None = Header(None, alias="X-Line-Signature"),
):
    body = await request.body()
    if len(body) > MAX_WEBHOOK_BODY:
        raise HTTPException(status_code=413, detail="Request entity too large")
    if not x_line_signature:
        logger.warning("Missing LINE signature header.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        _validate_signature(body, x_line_signature)
    except InvalidSignatureError:
        logger.warning("Invalid LINE signature.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Invalid webhook body: %s", exc)
        raise HTTPException(status_code=400, detail="Bad request")

    events = payload.get("events", [])
    for ev in events:
        ev_type = ev.get("type")
        reply_token = ev.get("replyToken", "")
        user_id = (ev.get("source") or {}).get("userId", "")
        if not reply_token or not user_id:
            continue
        if ev_type == "message":
            msg = ev.get("message") or {}
            if msg.get("type") == "text":
                background_tasks.add_task(process_ai_reply, WebhookMessageEvent(reply_token, user_id, msg.get("text", "")))
        elif ev_type == "postback":
            data = (ev.get("postback") or {}).get("data", "")
            parsed = parse_qs(data)
            action = (parsed.get("action") or [None])[0]
            if action == "change_cuisine":
                cuisine = (parsed.get("cuisine") or [""])[0]
                if cuisine:
                    await update_user_cuisine_context(user_id, cuisine)
                    fake_text = f"請根據 {CUISINE_LABELS.get(cuisine, '該')} 風格推薦一道料理"
                    background_tasks.add_task(
                        process_ai_reply,
                        WebhookMessageEvent(reply_token=reply_token, user_id=user_id, text=fake_text),
                    )
            else:
                background_tasks.add_task(process_postback_reply, WebhookPostbackEvent(reply_token, user_id, data))

    return "OK"
