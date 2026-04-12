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
MAX_COMPLETION_TOKENS = 2048
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

# ─── AI retry configuration ────────────────────────────────────────────────────

AI_MAX_RETRIES = 1          # Number of retries on JSON parse failure
AI_RETRY_EXTRA_PROMPT = "請務必只回傳純JSON，不要加任何markdown或解釋文字。"

PLAN_DAILY_LIMITS = {
    "free": int(os.getenv("PLAN_FREE_DAILY_LIMIT", "20")),
    "pro": int(os.getenv("PLAN_PRO_DAILY_LIMIT", "200")),
    "enterprise": int(os.getenv("PLAN_ENTERPRISE_DAILY_LIMIT", "2000")),
}
