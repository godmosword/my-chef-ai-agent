"""Environment, constants, and logging configuration."""
from __future__ import annotations

import json
import logging
import os
import tempfile
import atexit
from datetime import datetime, timezone

from dotenv import load_dotenv

from app.observability import get_request_id, get_user_hash

# ─── Logging ────────────────────────────────────────────────────────────────────


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        record.user_hash = get_user_hash()
        trace_id = "-"
        span_id = "-"
        try:
            from opentelemetry import trace

            span = trace.get_current_span()
            span_ctx = span.get_span_context() if span else None
            if span_ctx and span_ctx.is_valid:
                trace_id = f"{span_ctx.trace_id:032x}"
                span_id = f"{span_ctx.span_id:016x}"
        except Exception:
            pass
        record.trace_id = trace_id
        record.span_id = span_id
        return True


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "user_hash": getattr(record, "user_hash", "-"),
            "trace_id": getattr(record, "trace_id", "-"),
            "span_id": getattr(record, "span_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)

logging.basicConfig(level=logging.DEBUG if os.getenv("DEBUG", "").lower() in ("1", "true", "yes") else logging.INFO)
logger = logging.getLogger("chef-agent")
_request_filter = RequestIdFilter()
logging.getLogger().addFilter(_request_filter)
for _handler in logging.getLogger().handlers:
    _handler.setFormatter(JsonLogFormatter())
    _handler.addFilter(_request_filter)
logger.addFilter(_request_filter)

# ─── Environment ────────────────────────────────────────────────────────────────

load_dotenv()

# ─── GCP Vertex AI 憑證處理 ──────────────────────────────────────────────────────
# 若提供 GOOGLE_APPLICATION_CREDENTIALS_JSON，啟動時寫入暫存檔並設定
# GOOGLE_APPLICATION_CREDENTIALS，供 google-auth、Vertex SDK（google-cloud-aiplatform）
# 與 ADC 讀取。
# 另可設定 VERTEX_SERVICE_ACCOUNT_JSON（單行 JSON）；兩者皆無則依賴既有
# GOOGLE_APPLICATION_CREDENTIALS 檔案路徑或執行環境 ADC。

GCP_JSON_STR = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON") or "").strip()

if GCP_JSON_STR:
    _gcp_temp_creds_path: str | None = None
    try:
        json.loads(GCP_JSON_STR)
        temp_creds = tempfile.NamedTemporaryFile(
            suffix=".json",
            delete=False,
            mode="w",
            encoding="utf-8",
        )
        temp_creds.write(GCP_JSON_STR)
        temp_creds.close()
        _gcp_temp_creds_path = temp_creds.name
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _gcp_temp_creds_path
        logger.info("✅ GCP 憑證已動態寫入暫存檔")

        def _cleanup_gcp_temp_creds() -> None:
            if not _gcp_temp_creds_path:
                return
            try:
                if os.path.exists(_gcp_temp_creds_path):
                    os.remove(_gcp_temp_creds_path)
            except Exception:
                pass

        atexit.register(_cleanup_gcp_temp_creds)
    except Exception as e:
        logger.error("❌ 無法處理 GCP 憑證 JSON: %s", e)


def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return val


LINE_CHANNEL_ACCESS_TOKEN = _require_env("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = _require_env("LINE_CHANNEL_SECRET")
MODEL_NAME                = os.getenv("MODEL_NAME", "gemini-3.1-flash-lite-preview")
# Render Postgres（或任何 PostgreSQL）連線字串
DATABASE_URL              = (os.getenv("DATABASE_URL") or "").strip() or None
DEFAULT_TENANT_ID         = os.getenv("DEFAULT_TENANT_ID", "default")
ADMIN_API_TOKEN           = os.getenv("ADMIN_API_TOKEN")
# 非空時，GET /metrics 必須帶正確的 X-Metrics-Token；未設定時回 503（避免對外暴露營運指標）
METRICS_TOKEN             = (os.getenv("METRICS_TOKEN") or "").strip() or None
LOG_USER_HASH_SALT        = os.getenv("LOG_USER_HASH_SALT", "local-dev-salt")
BILLING_PROVIDER          = os.getenv("BILLING_PROVIDER", "manual").lower()
CHECKOUT_URL_TEMPLATE     = os.getenv("CHECKOUT_URL_TEMPLATE")
BILLING_BASE_URL          = os.getenv("BILLING_BASE_URL", "https://example.com")
PUBLIC_APP_BASE_URL       = (os.getenv("PUBLIC_APP_BASE_URL") or "").strip().rstrip("/")
YOUTUBE_API_KEY           = os.getenv("YOUTUBE_API_KEY")
IMAGE_PROVIDER            = os.getenv("IMAGE_PROVIDER", "placeholder").lower()
GCP_PROJECT_ID            = os.getenv("GCP_PROJECT_ID")
VERTEX_LOCATION           = os.getenv("VERTEX_LOCATION", "us-central1")
VERTEX_IMAGEN_MODEL       = os.getenv("VERTEX_IMAGEN_MODEL", "imagen-3.0-generate-002")
VERTEX_SERVICE_ACCOUNT_JSON = os.getenv("VERTEX_SERVICE_ACCOUNT_JSON")
VERTEX_IMAGEN_OUTPUT_GCS_URI = os.getenv("VERTEX_IMAGEN_OUTPUT_GCS_URI")
# 食譜主圖 URL in-memory 快取（秒）；0 表示關閉。僅對 vertex_imagen / openai_compatible 生效。
IMAGE_CACHE_TTL_SEC = max(0, int(os.getenv("IMAGE_CACHE_TTL_SEC", "86400")))
IMAGE_CACHE_BACKEND = (os.getenv("IMAGE_CACHE_BACKEND", "auto") or "auto").strip().lower()
REDIS_URL = (os.getenv("REDIS_URL") or "").strip()
IMAGE_CACHE_NAMESPACE = (os.getenv("IMAGE_CACHE_NAMESPACE", "recipe_image") or "recipe_image").strip()
IMAGE_PUBLIC_BASE_URL = (os.getenv("IMAGE_PUBLIC_BASE_URL") or "").strip().rstrip("/")
if IMAGE_PUBLIC_BASE_URL and not IMAGE_PUBLIC_BASE_URL.startswith("https://"):
    logger.warning("IMAGE_PUBLIC_BASE_URL 必須為 https，已忽略目前設定")
    IMAGE_PUBLIC_BASE_URL = ""
# Vertex 輸出 gs:// 且 bucket 非公開時需簽名 URL；0 關閉簽名（僅能依賴公開 URL 或 IMAGE_PUBLIC_BASE_URL）
GCS_SIGNED_URL_TTL_SEC = max(0, int(os.getenv("GCS_SIGNED_URL_TTL_SEC", "3600")))
# 無 AI 主圖時 Flex hero 使用的公開 https 圖；設為 none/- 可關閉（改回純文字區塊）
_DEFAULT_RECIPE_HERO_FALLBACK = (
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/"
    "Good_Food_Display_-_NCI_Visuals_Online.jpg/1200px-Good_Food_Display_-_NCI_Visuals_Online.jpg"
)
_raw_recipe_fb = (os.getenv("RECIPE_FALLBACK_HERO_IMAGE_URL") or "").strip()
if not _raw_recipe_fb:
    RECIPE_FALLBACK_HERO_IMAGE_URL = _DEFAULT_RECIPE_HERO_FALLBACK
elif _raw_recipe_fb.lower() in ("-", "none", "0", "off", "false"):
    RECIPE_FALLBACK_HERO_IMAGE_URL = ""
elif _raw_recipe_fb.startswith("https://"):
    RECIPE_FALLBACK_HERO_IMAGE_URL = _raw_recipe_fb
else:
    logger.warning(
        "RECIPE_FALLBACK_HERO_IMAGE_URL 必為 https，或設 none 關閉；已改用內建預設圖"
    )
    RECIPE_FALLBACK_HERO_IMAGE_URL = _DEFAULT_RECIPE_HERO_FALLBACK
OTEL_ENABLED = os.getenv("OTEL_ENABLED", "0").lower() in ("1", "true", "yes")
OTEL_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "my-chef-ai-agent")
OTEL_EXPORTER_OTLP_ENDPOINT = (os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip()
OTEL_SAMPLING_RATIO = max(0.0, min(1.0, float(os.getenv("OTEL_SAMPLING_RATIO", "1.0"))))
# AI chat.completions 遇 429／逾時／連線錯誤時的額外重試次數（不含第一次請求）
AI_TRANSPORT_MAX_RETRIES = max(0, int(os.getenv("AI_TRANSPORT_MAX_RETRIES", "3")))
AI_TRANSPORT_BASE_DELAY_SEC = max(0.05, float(os.getenv("AI_TRANSPORT_BASE_DELAY_SEC", "0.5")))
# 每 IP 每分鐘請求上限；0 關閉該類型限制
RATE_LIMIT_CALLBACK_PER_MINUTE = max(0, int(os.getenv("RATE_LIMIT_CALLBACK_PER_MINUTE", "120")))
RATE_LIMIT_PUBLIC_PER_MINUTE = max(0, int(os.getenv("RATE_LIMIT_PUBLIC_PER_MINUTE", "90")))
RATE_LIMIT_USER_PER_MINUTE = max(0, int(os.getenv("RATE_LIMIT_USER_PER_MINUTE", "30")))
RATE_LIMIT_USER_BURST = max(0, int(os.getenv("RATE_LIMIT_USER_BURST", "5")))
QUOTA_WARN_THRESHOLD = max(0, int(os.getenv("QUOTA_WARN_THRESHOLD", "3")))

# Gemini direct vs OpenAI routing
_mn = MODEL_NAME.removeprefix("google/")
USE_GEMINI_DIRECT = _mn.startswith("gemini-")
if USE_GEMINI_DIRECT:
    GEMINI_API_KEY = _require_env("GEMINI_API_KEY")
    OPENAI_API_KEY = None
else:
    OPENAI_API_KEY = _require_env("OPENAI_API_KEY")
    GEMINI_API_KEY = None

# ─── Constants ──────────────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH    = 500
# 送入模型的對話輪數（不含 system）；預設 2 以降低 prompt token；必要時以 MAX_HISTORY_TURNS 提高。
MAX_HISTORY_TURNS     = max(1, int(os.getenv("MAX_HISTORY_TURNS", "2")))
# 食譜 JSON 長度上限；預設 2048 平衡成本與截斷風險，遇截斷會觸發修復提示（見 AI_TRUNCATION_RECOVERY_PROMPT）。
MAX_COMPLETION_TOKENS = max(512, int(os.getenv("MAX_COMPLETION_TOKENS", "1024")))
DEBUG_MODE           = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
MAX_WEBHOOK_BODY     = 1_000_000
LINE_TEXT_MAX        = 5000
QUEUE_WORKER_COUNT   = int(os.getenv("QUEUE_WORKER_COUNT", "2"))
QUEUE_MAX_SIZE       = int(os.getenv("QUEUE_MAX_SIZE", "1000"))
QUEUE_DEDUPE_TTL_SEC = int(os.getenv("QUEUE_DEDUPE_TTL_SEC", "900"))
REQUIRE_ATOMIC_USAGE = os.getenv("REQUIRE_ATOMIC_USAGE", "0").lower() in ("1", "true", "yes")
RECIPE_STEPS_PREVIEW_COUNT = max(1, int(os.getenv("RECIPE_STEPS_PREVIEW_COUNT", "3")))
RECIPE_STEPS_MAX_COUNT = max(1, int(os.getenv("RECIPE_STEPS_MAX_COUNT", "6")))
RECIPE_STEP_MAX_CHARS = max(10, int(os.getenv("RECIPE_STEP_MAX_CHARS", "24")))

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

CUISINE_LABELS: dict[str, str] = {
    "taiwanese": "台灣小吃",
    "thai": "泰式料理",
    "japanese_ramen": "日式拉麵與定食",
    "european_american": "歐美家常菜",
    "kids_meal": "兒童專屬特餐",
}

# ─── AI retry configuration ────────────────────────────────────────────────────

AI_MAX_RETRIES = max(0, int(os.getenv("AI_MAX_RETRIES", "1")))  # JSON 解析失敗時額外呼叫次數（不含首次）
AI_RETRY_EXTRA_PROMPT = "請務必只回傳純JSON，不要加任何markdown或解釋文字。"
# 當 API 回傳 finish_reason=length（輸出被截斷）時，追加此提示再請模型重出精簡完整 JSON
AI_TRUNCATION_RECOVERY_PROMPT = (
    "上一則可能被截斷。請重出**一份完整可解析 JSON**（同一料理），遵守："
    "kitchen_talk 3 筆≤12字／ingredients≤6／steps≤6／shopping_list≤8。僅 JSON。"
)

PLAN_DAILY_LIMITS = {
    "free": int(os.getenv("PLAN_FREE_DAILY_LIMIT", "20")),
    "pro": int(os.getenv("PLAN_PRO_DAILY_LIMIT", "200")),
    "enterprise": int(os.getenv("PLAN_ENTERPRISE_DAILY_LIMIT", "2000")),
}

LEGAL_DISCLAIMER_URL = (
    f"{PUBLIC_APP_BASE_URL}/legal/disclaimer" if PUBLIC_APP_BASE_URL else None
)
LEGAL_PRIVACY_URL = (
    f"{PUBLIC_APP_BASE_URL}/legal/privacy" if PUBLIC_APP_BASE_URL else None
)
