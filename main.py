from __future__ import annotations

import os
import json
import ast
import logging
import time
from collections import OrderedDict

from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    ReplyMessageRequest,
    FlexMessage,
    FlexContainer,
    TextMessage,
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from openai import OpenAI
from supabase import create_client, Client

# ─── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chef-agent")

# ─── Environment & Validation ───────────────────────────────────────────────────

def _require_env(name: str) -> str:
    """啟動時若必要環境變數缺失，立即拋出錯誤，避免服務帶著無效設定啟動。"""
    val = os.getenv(name)
    if not val:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return val


LINE_CHANNEL_ACCESS_TOKEN = _require_env("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = _require_env("LINE_CHANNEL_SECRET")
OPENROUTER_API_KEY        = _require_env("OPENROUTER_API_KEY")
MODEL_NAME                = os.getenv("MODEL_NAME", "anthropic/claude-sonnet-4-5")
SUPABASE_URL              = os.getenv("SUPABASE_URL")
SUPABASE_KEY              = os.getenv("SUPABASE_KEY")

# ─── Constants ──────────────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH    = 500   # 用戶輸入字數上限
MAX_HISTORY_TURNS     = 5     # 保留最近幾輪對話
MEMORY_CACHE_LIMIT    = 1000  # 記憶體快取最多儲存多少用戶
RATE_LIMIT_REQUESTS   = 5     # 每個時間窗口最多幾次請求
RATE_LIMIT_WINDOW_SEC = 60    # 時間窗口（秒）

RESET_KEYWORDS = {"清除記憶", "重新開始", "洗腦", "你好", "嗨"}

SYSTEM_PROMPT = (
    "你是一個頂級米其林研發團隊。必須先讓三位主廚(行政主廚、副主廚、食材總管)進行專業對話，再給出食譜。\n"
    "輸出格式必須嚴格遵守以下 JSON 結構，且所有字串內容不可為空：\n"
    '{"kitchen_talk": [{"role": "角色", "content": "內容"}], '
    '"theme": "主題", "recipe_name": "菜名", '
    '"ingredients": [{"name": "食材", "price": "價格"}], '
    '"steps": ["步驟"], "shopping_list": ["區塊"], "estimated_total_cost": "數字"}'
)

ROLE_COLORS: dict[str, str] = {
    "行政主廚": "#9F1239",
    "副主廚":   "#B45309",
    "食材總管": "#166534",
}

# ─── Clients ────────────────────────────────────────────────────────────────────

app = FastAPI(title="米其林職人大腦", version="1.0.0")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase connected successfully.")
    except Exception as exc:
        logger.warning("Supabase init failed, falling back to in-memory cache. Error: %s", exc)

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler       = WebhookHandler(LINE_CHANNEL_SECRET)

ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    default_headers={
        "HTTP-Referer": "https://render.com",
        "X-Title": "My Chef AI Agent",
    },
)

# ─── In-Memory Stores ───────────────────────────────────────────────────────────

memory_cache:     OrderedDict[str, list]       = OrderedDict()
rate_limit_store: dict[str, list[float]]       = {}

# ─── Rate Limiting ──────────────────────────────────────────────────────────────

def is_rate_limited(user_id: str) -> bool:
    """滑動時間窗口速率限制，超過上限回傳 True。"""
    now        = time.monotonic()
    timestamps = [t for t in rate_limit_store.get(user_id, []) if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        rate_limit_store[user_id] = timestamps
        return True
    timestamps.append(now)
    rate_limit_store[user_id] = timestamps
    return False

# ─── Memory Management ──────────────────────────────────────────────────────────

def _evict_cache_if_needed() -> None:
    """當快取超過上限時，以 LRU 策略移除最舊的條目。"""
    while len(memory_cache) >= MEMORY_CACHE_LIMIT:
        memory_cache.popitem(last=False)


def get_user_memory(user_id: str) -> list:
    if supabase:
        try:
            res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
            if res.data:
                return res.data[0]["history"]
        except Exception as exc:
            logger.warning("Supabase read failed for user %s: %s", user_id, exc)
    return memory_cache.get(user_id, [])


def save_user_memory(user_id: str, history: list) -> None:
    if supabase:
        try:
            supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()
        except Exception as exc:
            logger.warning("Supabase write failed for user %s: %s", user_id, exc)
    _evict_cache_if_needed()
    memory_cache[user_id] = history


def clear_user_memory(user_id: str) -> None:
    if supabase:
        try:
            supabase.table("user_memory").delete().eq("user_id", user_id).execute()
        except Exception as exc:
            logger.warning("Supabase delete failed for user %s: %s", user_id, exc)
    memory_cache.pop(user_id, None)

# ─── Helpers ────────────────────────────────────────────────────────────────────

def _safe_str(val: object, fallback: str = "-") -> str:
    """確保 LINE Flex Message 中的文字欄位永不為空字串。"""
    s = str(val).strip()
    if not s or s in ["{}", "[]", "None", "null"]:
        return fallback
    return s


def _parse_to_list(data: object) -> list:
    """將各種型態的 AI 輸出統一轉成 list，提高解析容錯性。"""
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    if isinstance(data, str):
        try:
            parsed = ast.literal_eval(data)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                return [parsed]
        except (ValueError, SyntaxError):
            pass
        return [line for line in data.split("\n") if line.strip()]
    return [str(data)]


def _extract_json(text: str) -> dict:
    """
    透過追蹤大括號深度，從 AI 回傳文字中精確抽取最外層的 JSON 物件，
    避免正則表達式在巢狀結構下誤判邊界。
    """
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

# ─── Flex Message Engine ────────────────────────────────────────────────────────

def generate_flex_message(
    kitchen_talk,
    theme,
    recipe_name,
    ingredients,
    steps,
    shopping_list,
    estimated_total_cost,
) -> dict:
    # 廚房對話區塊
    talk_components = []
    for talk in _parse_to_list(kitchen_talk):
        role    = "團隊"
        content = str(talk)
        if isinstance(talk, dict):
            role    = talk.get("role",    talk.get("角色", "團隊"))
            content = talk.get("content", talk.get("內容", str(talk)))
        color = next((c for k, c in ROLE_COLORS.items() if k in role), "#78350F")
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(role, "團隊"),    "color": color,    "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": _safe_str(content, "..."),  "color": "#431407","size": "sm", "wrap": True, "flex": 1},
            ],
        })

    # 食材報價清單
    ingredient_rows = []
    for item in _parse_to_list(ingredients):
        name  = str(item)
        price = "-"
        if isinstance(item, dict):
            name  = item.get("name",  item.get("食材", str(item)))
            price = item.get("price", item.get("價格", "-"))
        ingredient_rows.append({
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(name, "食材"), "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": _safe_str(price, "-"),   "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0},
            ],
        })

    # 料理步驟
    step_rows = []
    for i, step in enumerate(_parse_to_list(steps)):
        step_rows.append({
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}",                                           "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": _safe_str(step, "進行中").lstrip("0123456789. "), "color": "#431407", "size": "sm", "wrap": True, "flex": 1},
            ],
        })

    # 採買清單
    shop_rows = [
        {"type": "text", "text": f"• {_safe_str(s, '生鮮')}", "size": "sm", "color": "#78350F", "margin": "sm"}
        for s in _parse_to_list(shopping_list)
    ]

    return {
        "type": "bubble",
        "size": "giga",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
            "contents": [
                {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
                {
                    "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg",
                    "contents": [
                        {"type": "text", "text": _safe_str(theme, "RECOMMENDATION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
                        {"type": "text", "text": _safe_str(recipe_name, "本日料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True},
                    ],
                },
                {
                    "type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl",
                    "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg",
                    "contents": [
                        {"type": "text", "text": "KITCHEN CONFERENCE", "size": "xxs", "weight": "bold", "color": "#B45309", "margin": "xs"},
                        {"type": "box", "layout": "vertical", "margin": "md", "contents": talk_components},
                    ],
                },
                {
                    "type": "box", "layout": "vertical", "paddingAll": "xxl",
                    "contents": [
                        {"type": "text", "text": "SHOPPING LIST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                        {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows or [{"type": "text", "text": "全聯生鮮"}]},
                    ],
                },
                {
                    "type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl",
                    "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg",
                    "contents": [
                        {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                        {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows or [{"type": "text", "text": "-"}]},
                        {"type": "separator", "margin": "xl", "color": "#FED7AA"},
                        {
                            "type": "box", "layout": "horizontal", "margin": "lg",
                            "contents": [
                                {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#9A3412", "flex": 0},
                                {"type": "text", "text": f"NT$ {_safe_str(estimated_total_cost, '估算中')}", "size": "xl", "weight": "bold", "color": "#431407", "align": "end"},
                            ],
                        },
                    ],
                },
                {
                    "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none",
                    "contents": [
                        {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                        {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows or [{"type": "text", "text": "-"}]},
                    ],
                },
            ],
        },
        "footer": {
            "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
            "contents": [
                {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                {"type": "button", "style": "primary",   "height": "sm", "color": "#EA580C", "action": {"type": "message", "label": "追加配菜", "text": "這套食譜很棒"}},
            ],
        },
    }

# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.api_route("/", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "ok", "message": "米其林職人大腦 (Claude Sonnet 4.6 穩定版)"}


@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get("X-Line-Signature", "")
    body      = await request.body()
    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        logger.warning("Invalid LINE signature received.")
        raise HTTPException(status_code=400, detail="Invalid signature")
    return "OK"


@handler.add(event=MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_message: str = event.message.text
    user_id:      str = event.source.user_id

    def reply(msg) -> None:
        with ApiClient(configuration) as api_client:
            MessagingApi(api_client).reply_message(
                ReplyMessageRequest(reply_token=event.reply_token, messages=[msg])
            )

    # 速率限制
    if is_rate_limited(user_id):
        logger.info("Rate limited user: %s", user_id)
        reply(TextMessage(text="🍽️ 廚房正在忙碌中，請稍等一分鐘再試試看！"))
        return

    # 輸入長度驗證
    if len(user_message) > MAX_MESSAGE_LENGTH:
        reply(TextMessage(text=f"👨‍🍳 請把需求濃縮在 {MAX_MESSAGE_LENGTH} 字以內，讓廚房更容易發揮！"))
        return

    # 重置指令
    if user_message.strip() in RESET_KEYWORDS:
        clear_user_memory(user_id)
        reply(TextMessage(text="👨‍🍳 歡迎！廚房已備妥，Claude Sonnet 4.6 已就緒。請問想吃什麼？"))
        return

    # 建構對話歷史
    history = get_user_memory(user_id)
    if not history:
        history = [{"role": "system", "content": SYSTEM_PROMPT}]
    history.append({"role": "user", "content": user_message})
    if len(history) > MAX_HISTORY_TURNS + 1:
        history = [history[0]] + history[-MAX_HISTORY_TURNS:]

    try:
        response   = ai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=history,
            temperature=0.3,
        )
        ai_content = response.choices[0].message.content.strip()
        logger.debug("AI raw output for user %s: %s", user_id, ai_content)

        ai_data = _extract_json(ai_content)
        save_user_memory(user_id, history + [{"role": "assistant", "content": ai_content}])

        flex_dict = generate_flex_message(
            ai_data.get("kitchen_talk",        []),
            ai_data.get("theme",               ""),
            ai_data.get("recipe_name",         ""),
            ai_data.get("ingredients",         []),
            ai_data.get("steps",               []),
            ai_data.get("shopping_list",       []),
            ai_data.get("estimated_total_cost",""),
        )
        msg = FlexMessage(
            alt_text=f"職人提案：{ai_data.get('recipe_name', '美味食譜')}",
            contents=FlexContainer.from_dict(flex_dict),
        )

    except json.JSONDecodeError as exc:
        logger.error("JSON parse error for user %s: %s", user_id, exc)
        msg = TextMessage(text="👨‍🍳 廚房筆記有點亂，請輸入「清除記憶」後再試一次！")
    except ValueError as exc:
        logger.error("Value error for user %s: %s", user_id, exc)
        msg = TextMessage(text="👨‍🍳 團隊正在熱烈討論中，請對我輸入「清除記憶」後換個說法試試。")
    except Exception:
        logger.exception("Unexpected error for user %s", user_id)
        msg = TextMessage(text="👨‍🍳 團隊正在熱烈討論中，請對我輸入「清除記憶」後換個說法試試。")

    reply(msg)
