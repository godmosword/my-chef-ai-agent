## 米其林職人大腦（LINE Bot × FastAPI）

以 **Gemini** 系列（預設 `MODEL_NAME=gemini-3.1-flash-lite-preview`，可改 OpenRouter）為核心的食譜助理：多輪對話、結構化 JSON 食譜、**Flex Message** 卡片、可選 **Vertex Imagen** 主圖、**Render Postgres** 持久化（未設定時優雅降級）。

更完整的維運說明見 [`AGENTS.md`](AGENTS.md)（Cursor Cloud／本機 pytest 環境變數）；貢獻與 plan 收尾流程見 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

---

## 功能總覽

| 類別 | 說明 |
|------|------|
| 食譜 | 主題／菜名／步驟、採買清單與估算成本；`kitchen_talk`、`ingredients`、`steps`、`shopping_list` 等欄位由模型輸出，圖／影片由後端依 `IMAGE_PROVIDER`、`YOUTUBE_API_KEY` 補齊。 |
| 卡片 | 僅在有效 **https** 成品圖時顯示 hero；否則文字色塊標頭，避免與菜名無關的隨機圖。 |
| 情境 | 清冰箱、兒童餐、`🍳 隨機配菜`、`🛒 檢視清單`、菜系輪播等。 |
| 媒體 | 傳圖辨識食材後產食譜；收藏輪播與刪除。 |
| 營運 | Webhook **記憶體佇列**、event **去重**、每日**配額**（`app/billing.py`）、`GET /metrics`、`GET /ready`、可選 **IP 與 per-user webhook 限流**、多租戶 `X-Tenant-ID`。 |
| 法務 | `GET /legal/disclaimer`、`GET /legal/privacy`（見 [`docs/LEGAL_POLICY.md`](docs/LEGAL_POLICY.md)）。 |

---

## 技術棧

- **Web**：FastAPI、Uvicorn  
- **訊息**：LINE Messaging API（非同步 SDK）  
- **AI**：OpenAI 相容 `chat.completions`（Gemini 端點或 OpenRouter）；具 **429／逾時／連線** 退避（`AI_TRANSPORT_*`）與 JSON **截斷修復**（`AI_MAX_RETRIES`、`MAX_COMPLETION_TOKENS`）  
- **資料**：`DATABASE_URL` → **psycopg** 直連 Postgres；見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)、[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md)  
- **部署**：`render.yaml`；可選 GCP Cloud Run（[`docs/DEPLOY_GCP.md`](docs/DEPLOY_GCP.md)）

---

## 本機開發

### 依賴與環境

```bash
pip install -r requirements.txt
cp .env.example .env
```

模組匯入時會驗證 **`LINE_CHANNEL_ACCESS_TOKEN`**、**`LINE_CHANNEL_SECRET`**、**`GEMINI_API_KEY`**（或 OpenRouter 路徑所需變數）。本機無真金鑰可填占位值僅供啟動／測試：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m uvicorn main:app --reload --port 8000
```

- 健康檢查：`GET /` → `{"status":"ok",...}`  
- **Readiness**（可選 DB）：`GET /ready` → Postgres 可連時 200，否則 503  
- Webhook：`POST /callback`（需有效 `X-Line-Signature`）

### 測試

```bash
pip install -r requirements-dev.txt
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m pytest tests/ -v
```

目前套件 **65** 則測試（涵蓋 Flex、佇列、配額、`/ready`、IP／per-user rate limit、AI transport、多媒體等）。其中 `tests/integration/` 兩則需可連的 Postgres（`DATABASE_URL`）；未設定時會 **skip**，其餘 63 則仍應全數通過。

---

## Render 部署

1. 建立 Web Service，連線本 repo；Render 會讀取 `render.yaml`。  
2. 在 Environment 填入 LINE、AI、可選 `DATABASE_URL`、Vertex 等（下表）。  
3. Webhook URL：`https://<你的服務>.onrender.com/callback`。

---

## 環境變數速查

| 變數 | 必填 | 說明 |
|------|:----:|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE Messaging API token |
| `LINE_CHANNEL_SECRET` | ✅ | Channel secret |
| `GEMINI_API_KEY` | ✅\* | Gemini 直連 |
| `OPENROUTER_API_KEY` | ✅\* | 改走 OpenRouter 時 |
| `MODEL_NAME` |  | 預設 `gemini-3.1-flash-lite-preview` |
| `MAX_COMPLETION_TOKENS` |  | 預設 4096，避免長 JSON 截斷 |
| `AI_MAX_RETRIES` |  | JSON 解析／截斷修復輪數 |
| `AI_TRANSPORT_MAX_RETRIES` |  | 傳輸層額外重試 |
| `AI_TRANSPORT_BASE_DELAY_SEC` |  | 退避起始秒數 |
| `DATABASE_URL` |  | Render Postgres 等；記憶／收藏／配額與訂閱走 psycopg（多租戶 `tenant_id`） |
| `YOUTUBE_API_KEY` |  | 教學影片連結 |
| `IMAGE_PROVIDER` |  | `placeholder` / `vertex_imagen` / `openai_compatible` |
| `GCP_PROJECT_ID` | Vertex 時 | Vertex 專案 |
| `VERTEX_LOCATION` / `VERTEX_IMAGEN_MODEL` |  | 區域與 Imagen 模型 |
| `VERTEX_SERVICE_ACCOUNT_JSON` |  | 單行 SA JSON（擇一） |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` |  | 單行 SA JSON；啟動寫暫存檔並設 `GOOGLE_APPLICATION_CREDENTIALS` |
| `VERTEX_IMAGEN_OUTPUT_GCS_URI` |  | 可選 `gs://...` 輸出 |
| `IMAGE_PUBLIC_BASE_URL` |  | 可選 CDN / 公網圖床前綴；有值時 `gs://` 會改寫成此網域 |
| `IMAGE_CACHE_TTL_SEC` |  | 主圖 in-memory 快取秒數，0 關閉 |
| `IMAGE_CACHE_BACKEND` |  | `auto` / `memory` / `redis` |
| `REDIS_URL` |  | 跨實例圖片快取（Redis / Upstash） |
| `IMAGE_CACHE_NAMESPACE` |  | Redis key 前綴（預設 `recipe_image`） |
| `GCS_SIGNED_URL_TTL_SEC` |  | `gs://` 轉 signed URL 的有效秒數（預設 3600）；0 關閉 |
| `RECIPE_FALLBACK_HERO_IMAGE_URL` |  | 無 AI 主圖時的公開 **https** hero；未設用內建圖；`none`／`-` 關閉 |
| `RATE_LIMIT_CALLBACK_PER_MINUTE` |  | `POST /callback` 每 IP 分鐘上限，0 關閉 |
| `RATE_LIMIT_PUBLIC_PER_MINUTE` |  | checkout／legal 等公開路由，0 關閉 |
| `RATE_LIMIT_USER_PER_MINUTE` / `RATE_LIMIT_USER_BURST` |  | webhook 每 user+tenant 限流 |
| `QUOTA_WARN_THRESHOLD` |  | 接近每日額度時的提醒門檻（預設 3） |
| `RECIPE_STEPS_PREVIEW_COUNT` |  | Flex 預設顯示前幾步（其餘可 postback 展開） |
| `RECIPE_STEPS_MAX_COUNT` / `RECIPE_STEP_MAX_CHARS` |  | 提示模型輸出步驟數與每步長度上限 |
| `DEFAULT_TENANT_ID` |  | 預設租戶 |
| `PLAN_*_DAILY_LIMIT` |  | 各方案每日上限 |
| `QUEUE_WORKER_COUNT` / `QUEUE_MAX_SIZE` / `QUEUE_DEDUPE_TTL_SEC` |  | 佇列與去重 |
| `REQUIRE_ATOMIC_USAGE` |  | `1` 時強制 DB 原子扣量 |
| `BILLING_PROVIDER` / `CHECKOUT_URL_TEMPLATE` / `BILLING_BASE_URL` |  | 升級連結與金流占位 |
| `PUBLIC_APP_BASE_URL` |  | 產生 Flex 內 legal URI 按鈕網址（`/legal/*`） |
| `ADMIN_API_TOKEN` |  | 管理訂閱 API |
| `METRICS_TOKEN` |  | `GET /metrics` 的 `X-Metrics-Token` |
| `LOG_USER_HASH_SALT` |  | 結構化 log 的 user hash salt |
| `OTEL_ENABLED` / `OTEL_SERVICE_NAME` / `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_SAMPLING_RATIO` |  | OpenTelemetry 設定 |
| `DEBUG` |  | `1` 較詳 log |

\* `gemini-*` 用 `GEMINI_API_KEY`；其他模型經 OpenRouter 用 `OPENROUTER_API_KEY`。

**Vertex 憑證優先序**：`VERTEX_SERVICE_ACCOUNT_JSON` → `GOOGLE_APPLICATION_CREDENTIALS_JSON`（寫暫存檔）→ 既有 **`GOOGLE_APPLICATION_CREDENTIALS`**／ADC。失敗時主圖回退佔位，不阻斷食譜流程。

---

## 資料庫與 migration

- **核心 migration**：`migrations/20260414_postgres_multitenant.sql`  
- **Render Postgres 建表**：`python3 init_db.py` 或依 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)  
- **Schema 演進策略**：[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md)  

完整 DDL 範例仍可在舊版 README 或 migration 中取得；維運建議以 **migration 檔為單一來源**，避免 README 與 SQL 雙份漂移（見 [`TODOS.md`](TODOS.md)）。

---

## LINE 指令摘要

| 輸入 | 行為 |
|------|------|
| 料理需求（例：番茄牛腩） | 產出食譜 Flex |
| `你好`／`清除記憶`／`洗腦`／`重新開始` | 重置對話 |
| `🍳 隨機配菜` | 隨機風格配菜 |
| `🛒 檢視清單` | 上一道採買清單 |
| `升級方案`／`訂閱方案` | 升級連結 |
| `隱私聲明`／`資料政策` | 法務說明 |
| `刪除我的資料`／`忘記我` | 清除使用者資料 |
| 清冰箱／小孩餐等關鍵字 | 情境模式 |
| 傳圖 | 食材辨識 → 食譜 |
| 我的最愛／收藏 | 收藏輪播 |

---

## HTTP 端點（摘要）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | Liveness |
| GET | `/ready` | Readiness（可選 DB ping） |
| POST | `/callback` | LINE Webhook |
| GET | `/metrics` | 可選 `X-Metrics-Token` |
| GET | `/billing/checkout` | 升級導向 |
| GET | `/legal/disclaimer`、`/legal/privacy` | 法務 |
| GET/PUT | `/admin/subscriptions/{user_id}` | 需 `X-Admin-Token` |

---

## Rich Menu 更新流程

完整規格、bounds 對照、參考連結與 413 排查請見 **[`docs/RICH_MENU.md`](docs/RICH_MENU.md)**。

- Rich Menu 資產：[`richmenu.jpg`](richmenu.jpg)（或 `richmenu.png`，須 **≤1 MB** 以符合 LINE 上限）+ [`richmenu_config.json`](richmenu_config.json)  
- 重新部署到 LINE：

```bash
python3 setup_richmenu.py
```

- 若你使用不同路徑或多環境檔名，可設：
  - `RICHMENU_IMAGE_PATH`
  - `RICHMENU_CONFIG_PATH`
- 圖或 config 只要有改，都要重新執行一次上傳腳本才會生效。

---

## 專案結構

```text
my-chef-ai-agent/
├── main.py                 # 薄入口
├── app/
│   ├── config.py           # 環境變數、JSON logging、GCP JSON 暫存檔、OTEL 開關
│   ├── clients.py          # FastAPI、LINE、AI、lifespan（佇列 worker）
│   ├── telemetry.py        # OpenTelemetry 初始化（可選）
│   ├── routes.py           # /、/callback、/ready、metrics、billing、legal、admin
│   ├── rate_limit.py       # IP 與 per-user webhook 限流
│   ├── handlers.py         # 文字／postback／圖片（LINE 事件入口）
│   ├── handlers_commands.py   # 配額與食譜派發等小塊邏輯
│   ├── handlers_recipe_flow.py # 背景食譜生成編排
│   ├── ai_service.py
│   ├── image_cache.py      # 圖片快取（memory / redis）
│   ├── db.py
│   ├── billing.py
│   ├── job_queue.py        # 佇列、trace carrier、request/user hash 傳遞
│   ├── observability.py    # request id、metrics、user hash context
│   ├── flex_messages.py
│   └── ...
├── tests/
│   ├── integration/        # 需 DATABASE_URL：多租戶／用量隔離
│   └── ...
├── docs/
├── migrations/             # Postgres schema 單一來源（例：多租戶）
├── .github/workflows/      # CI：migration + pytest；push main 通過後同次執行 Cloud Run 部署
├── CHANGELOG.md
├── CONTRIBUTING.md         # 貢獻指南與 plan 收尾必做項目
├── TODOS.md                # 工程／產品 backlog（TODO.md 轉址至此）
├── AGENTS.md
├── .cursor/rules/          # Cursor：plan 收尾同步文件提醒
├── setup_richmenu.py
├── richmenu_config.json
├── richmenu.jpg            # 圖文選單圖（預設；須 ≤1 MB）
├── render.yaml
└── init_db.py
```

---

## 變更紀錄與待辦

- [`CHANGELOG.md`](CHANGELOG.md)  
- [`TODOS.md`](TODOS.md)  

每完成一項較大工程計畫或里程碑，請**一併**更新 **`CHANGELOG.md`**、**`TODOS.md`** 與本檔 **`README.md`**（避免文件落後）；細項清單見 [`AGENTS.md`](AGENTS.md) 的「Plan／里程碑收尾」。

---

## 授權

MIT License
