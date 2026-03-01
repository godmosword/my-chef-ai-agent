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
from dataclasses import dataclass

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
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
from openai import AsyncOpenAI
from supabase import create_client, Client

# ─── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chef-agent")

# ─── Environment ────────────────────────────────────────────────────────────────

def _require_env(name: str) -> str:
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

MAX_MESSAGE_LENGTH   = 500
MAX_HISTORY_TURNS    = 5
MAX_WEBHOOK_BODY     = 1_000_000
LINE_TEXT_MAX        = 5000

RESET_KEYWORDS = {"清除記憶", "重新開始", "洗腦", "你好", "嗨"}
RANDOM_SIDEDISH_CMD = "🍳 隨機配菜"
VIEW_SHOPPING_CMD   = "🛒 檢視清單"

RANDOM_STYLES = [
    "台式熱炒", "日式家常", "法式經典", "義式料理", "韓式料理",
    "泰式風味", "中式川菜", "地中海風情", "美式 comfort food", "越南河粉風格",
]

SCENARIO_CLEAR_FRIDGE = (["清冰箱", "剩下", "剩食"], "行政主廚務必以用戶提供的剩餘食材為核心，搭配最少量的額外採買來設計創意料理。")
SCENARIO_KIDS_MEAL = (["小孩", "兒童", "兒子"], "這是一份專為四歲小男童設計的餐點，口味必須溫和不辣、好咀嚼，食材總管須優先考慮營養均衡。")

SYSTEM_PROMPT = (
    "你是一個頂級米其林研發團隊。必須先讓三位主廚(行政主廚、副主廚、食材總管)進行專業對話，再給出食譜。\n"
    "無論使用者提出何種情境或額外指示，輸出格式必須嚴格遵守以下 JSON 結構，且所有字串內容不可為空：\n"
    '{"kitchen_talk": [{"role": "角色", "content": "內容"}], '
    '"theme": "主題", "recipe_name": "菜名", '
    '"ingredients": [{"name": "食材", "price": "價格"}], '
    '"steps": ["步驟"], "shopping_list": ["區塊"], "estimated_total_cost": "數字"}'
)

ROLE_COLORS: dict[str, str] = {"行政主廚": "#9F1239", "副主廚": "#B45309", "食材總管": "#166534"}

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

ai_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    default_headers={"HTTP-Referer": "https://run.app", "X-Title": "My Chef AI Agent"},
)

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

# ─── Helpers ────────────────────────────────────────────────────────────────────

async def _build_system_prompt_with_preferences(user_id: str) -> str:
    prefs = await get_user_preferences(user_id)
    if not prefs:
        return SYSTEM_PROMPT
    return SYSTEM_PROMPT + (
        f"\n\n客戶有以下特殊飲食偏好，請絕對嚴格遵守：{prefs}\n"
        "行政主廚、副主廚、食材總管在設計食譜時，必須避開雷區，不可使用或用戶明確排除的食材與烹調方式。\n"
    )


def _build_scenario_instructions(text: str) -> str:
    scenarios = [SCENARIO_CLEAR_FRIDGE, SCENARIO_KIDS_MEAL]
    labels = ("清冰箱", "兒童餐")
    parts = [f"【{labels[i]}模式】{s[1]}" for i, s in enumerate(scenarios) if any(k in text for k in s[0])]
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
        await reply(TextMessage(text="👨‍🍳 歡迎！廚房已備妥，Claude Sonnet 4.6 已就緒。請問想吃什麼？"))
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

    effective_system = await _build_system_prompt_with_preferences(user_id)
    history = await get_user_memory(user_id)
    if not history:
        history = [{"role": "system", "content": effective_system}]
    elif history[0].get("role") == "system":
        history[0] = {"role": "system", "content": effective_system}
    else:
        history = [{"role": "system", "content": effective_system}] + history
    history.append({"role": "user", "content": user_message})
    if len(history) > MAX_HISTORY_TURNS + 1:
        history = [history[0]] + history[-MAX_HISTORY_TURNS:]

    try:
        response = await ai_client.chat.completions.create(model=MODEL_NAME, messages=history, temperature=0.3)
        ai_content = response.choices[0].message.content.strip()
        logger.debug("AI raw output for user %s: %s", user_id, ai_content[:200])
        ai_data = _extract_json(ai_content)
        await save_user_memory(user_id, history + [{"role": "assistant", "content": ai_content}])
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
        msg = TextMessage(text="👨‍🍳 廚房筆記有點亂，請輸入「清除記憶」後再試一次！")
    except ValueError as exc:
        logger.error("Value error for user %s: %s", user_id, exc)
        msg = TextMessage(text="👨‍🍳 團隊正在熱烈討論中，請對我輸入「清除記憶」後換個說法試試。")
    except Exception:
        logger.exception("Unexpected error for user %s", user_id)
        msg = TextMessage(text="👨‍🍳 團隊正在熱烈討論中，請對我輸入「清除記憶」後換個說法試試。")

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
    return {"status": "ok", "message": "米其林職人大腦 (Claude Sonnet 4.6 穩定版)"}


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
            background_tasks.add_task(process_postback_reply, WebhookPostbackEvent(reply_token, user_id, data))

    return "OK"
