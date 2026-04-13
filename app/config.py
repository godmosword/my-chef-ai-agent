"""Environment, constants, and logging configuration."""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

from app.observability import get_request_id

# ─── Logging ────────────────────────────────────────────────────────────────────


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True

logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "").lower() in ("1", "true", "yes") else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s [req:%(request_id)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chef-agent")
_request_filter = RequestIdFilter()
logging.getLogger().addFilter(_request_filter)
for _handler in logging.getLogger().handlers:
    _handler.addFilter(_request_filter)
logger.addFilter(_request_filter)

# ─── Environment ────────────────────────────────────────────────────────────────

load_dotenv()


def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return val


LINE_CHANNEL_ACCESS_TOKEN = _require_env("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = _require_env("LINE_CHANNEL_SECRET")
MODEL_NAME                = os.getenv("MODEL_NAME", "gemini-3.1-flash-lite-preview")
SUPABASE_URL              = os.getenv("SUPABASE_URL")
SUPABASE_KEY              = os.getenv("SUPABASE_KEY")
# Render Postgres（或任何 PostgreSQL）連線字串；若設定則資料層優先使用 Postgres，不必再設 Supabase
DATABASE_URL              = (os.getenv("DATABASE_URL") or "").strip() or None
DEFAULT_TENANT_ID         = os.getenv("DEFAULT_TENANT_ID", "default")
ADMIN_API_TOKEN           = os.getenv("ADMIN_API_TOKEN")
METRICS_TOKEN             = os.getenv("METRICS_TOKEN")
BILLING_PROVIDER          = os.getenv("BILLING_PROVIDER", "manual").lower()
CHECKOUT_URL_TEMPLATE     = os.getenv("CHECKOUT_URL_TEMPLATE")
BILLING_BASE_URL          = os.getenv("BILLING_BASE_URL", "https://example.com")
YOUTUBE_API_KEY           = os.getenv("YOUTUBE_API_KEY")
IMAGE_PROVIDER            = os.getenv("IMAGE_PROVIDER", "placeholder").lower()
GCP_PROJECT_ID            = os.getenv("GCP_PROJECT_ID")
VERTEX_LOCATION           = os.getenv("VERTEX_LOCATION", "us-central1")
VERTEX_IMAGEN_MODEL       = os.getenv("VERTEX_IMAGEN_MODEL", "imagen-3.0-generate-002")
VERTEX_SERVICE_ACCOUNT_JSON = os.getenv("VERTEX_SERVICE_ACCOUNT_JSON")
VERTEX_IMAGEN_OUTPUT_GCS_URI = os.getenv("VERTEX_IMAGEN_OUTPUT_GCS_URI")
# 食譜主圖 URL in-memory 快取（秒）；0 表示關閉。僅對 vertex_imagen / openai_compatible 生效。
IMAGE_CACHE_TTL_SEC = max(0, int(os.getenv("IMAGE_CACHE_TTL_SEC", "300")))
# AI chat.completions 遇 429／逾時／連線錯誤時的額外重試次數（不含第一次請求）
AI_TRANSPORT_MAX_RETRIES = max(0, int(os.getenv("AI_TRANSPORT_MAX_RETRIES", "3")))
AI_TRANSPORT_BASE_DELAY_SEC = max(0.05, float(os.getenv("AI_TRANSPORT_BASE_DELAY_SEC", "0.5")))
# 每 IP 每分鐘請求上限；0 關閉該類型限制
RATE_LIMIT_CALLBACK_PER_MINUTE = max(0, int(os.getenv("RATE_LIMIT_CALLBACK_PER_MINUTE", "120")))
RATE_LIMIT_PUBLIC_PER_MINUTE = max(0, int(os.getenv("RATE_LIMIT_PUBLIC_PER_MINUTE", "90")))

# Gemini direct vs OpenRouter routing
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
# 食譜 JSON 較長；2048 易在 Gemini 上被截斷成不合法 JSON。可用環境變數覆寫。
MAX_COMPLETION_TOKENS = max(512, int(os.getenv("MAX_COMPLETION_TOKENS", "4096")))
DEBUG_MODE           = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
MAX_WEBHOOK_BODY     = 1_000_000
LINE_TEXT_MAX        = 5000
QUEUE_WORKER_COUNT   = int(os.getenv("QUEUE_WORKER_COUNT", "2"))
QUEUE_MAX_SIZE       = int(os.getenv("QUEUE_MAX_SIZE", "1000"))
QUEUE_DEDUPE_TTL_SEC = int(os.getenv("QUEUE_DEDUPE_TTL_SEC", "900"))
REQUIRE_ATOMIC_USAGE = os.getenv("REQUIRE_ATOMIC_USAGE", "0").lower() in ("1", "true", "yes")

RESET_KEYWORDS = {"清除記憶", "重新開始", "洗腦", "你好", "嗨"}
CUISINE_SELECTOR_KEYWORDS = {"換菜單"}
RANDOM_SIDEDISH_CMD = "🍳 隨機配菜"
VIEW_SHOPPING_CMD   = "🛒 檢視清單"
VIEW_FAVORITES_CMD  = "我的最愛"
FAVORITES_KEYWORDS  = {"我的最愛", "收藏", "最愛食譜", "我的收藏"}

RANDOM_STYLES = [
    "台式熱炒", "日式家常", "法式經典", "義式料理", "韓式料理",
    "泰式風味", "中式川菜", "地中海風情", "美式 comfort food", "越南河粉風格",
]

SCENARIO_CLEAR_FRIDGE = (["清冰箱", "剩下", "剩食"], "以用戶剩餘食材為核心，最少額外採買。")
SCENARIO_KIDS_MEAL = (["小孩", "兒童", "兒子"], "四歲兒童餐：溫和不辣、好咀嚼、營養均衡。")
SCENARIO_BUDGET = (["預算", "便宜", "省錢", "方案"], "預算方案：行政主廚需討論 CP 值，食材總管嚴格控管 NT$ 預算。")
SCENARIO_MOOD   = (["心情", "壓力", "開心", "難過"], "心情點餐：副主廚需根據情緒推薦溫暖或清爽的口感，提供情緒支持。")

SYSTEM_PROMPT = (
    "你是米其林三星廚房(行政主廚/副主廚/食材總管)。先由三人各一句（每句≤12字），再產出精簡食譜。"
    "僅回傳 JSON，勿 markdown。為避免輸出過長被截斷：kitchen_talk 固定 3 筆；ingredients 最多 6 項；"
    "steps 最多 6 步（每步一句）；shopping_list 最多 8 字串；字數盡量精簡。\n"
    '{"kitchen_talk":['
    '{"role":"行政主廚","content":"≤12字"},'
    '{"role":"副主廚","content":"≤12字"},'
    '{"role":"食材總管","content":"≤12字"}],'
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

# ─── AI retry configuration ────────────────────────────────────────────────────

AI_MAX_RETRIES = max(0, int(os.getenv("AI_MAX_RETRIES", "2")))  # JSON 解析失敗時額外呼叫次數（不含首次）
AI_RETRY_EXTRA_PROMPT = "請務必只回傳純JSON，不要加任何markdown或解釋文字。"
# 當 API 回傳 finish_reason=length（輸出被截斷）時，追加此提示再請模型重出精簡完整 JSON
AI_TRUNCATION_RECOVERY_PROMPT = (
    "上一則回應可能因長度被截斷，導致 JSON 不完整。請**重新輸出一份完整且可解析**的 JSON（同一料理主題），並嚴格遵守："
    "kitchen_talk 固定 3 筆、每則 content ≤12 字；ingredients ≤6 項；steps ≤6 步；shopping_list ≤8 字串。"
    "字數盡量精簡。僅 JSON，勿 markdown、勿註解。"
)

PLAN_DAILY_LIMITS = {
    "free": int(os.getenv("PLAN_FREE_DAILY_LIMIT", "20")),
    "pro": int(os.getenv("PLAN_PRO_DAILY_LIMIT", "200")),
    "enterprise": int(os.getenv("PLAN_ENTERPRISE_DAILY_LIMIT", "2000")),
}
