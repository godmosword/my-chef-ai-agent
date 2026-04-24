## 米其林職人大腦（LINE Bot × FastAPI）

以 **Gemini** 系列（預設 `MODEL_NAME=gemini-3.1-flash-lite-preview`，可改走 OpenAI）為核心的食譜助理：多輪對話、結構化 JSON 食譜、**Flex Message** 卡片、可選 **Vertex Imagen** 主圖、**Render Postgres** 持久化（未設定時優雅降級）。

更完整的維運與測試環境變數見 [`AGENTS.md`](AGENTS.md)；貢獻與里程碑收尾流程見 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

---

## 開源、商標與第三方服務

- **授權**：MIT，全文見根目錄 [`LICENSE`](LICENSE)。第三方 Python 套件摘要見 [`docs/THIRD_PARTY_LICENSES.md`](docs/THIRD_PARTY_LICENSES.md)（更新依賴後請執行 `python3 scripts/generate_third_party_licenses.py` 並一併提交）。
- **商標**：專案展示名稱中的「米其林」為產品行銷用語，**與米其林指南（MICHELIN Guide）或其權利人無關**；若你 fork 或對外發布，請自行評估中性品牌名稱與當地商標法。
- **外部 API**：部署者須自備並遵守 **LINE**、**Google／Gemini**、**OpenAI**、**YouTube** 等條款；本倉庫僅提供程式碼。
- **開源前檢查**：[`docs/OPEN_SOURCE_CHECKLIST.md`](docs/OPEN_SOURCE_CHECKLIST.md)

---

## 功能總覽

| 類別 | 說明 |
|------|------|
| 食譜 | 主題／菜名／步驟、採買清單與估算成本；`kitchen_talk`、`ingredients`、`steps`、`shopping_list` 等欄位由模型輸出，並可在生成前用 Google Deep Research 做研究式 Grounding，圖／影片由後端依 `IMAGE_PROVIDER`、`YOUTUBE_API_KEY` 補齊。 |
| 卡片 | 僅在有效 **https** 成品圖時顯示 hero；否則文字色塊標頭，避免與菜名無關的隨機圖。主圖改為「可重試、失敗不污染快取」策略。 |
| 海報 | 可從食譜卡按鈕按需生成單張 **PNG 食譜資訊圖**；沿用現有 recipe JSON，以 **Pillow** 模板排版輸出。 |
| 食譜圖卡（兩段式） | 新增可重用「先生底圖、後疊繁中」流程：Stage A 以 `gpt-image-2` 產生高質感版面底圖，Stage B 由程式穩定疊上繁中標題／食材／步驟／小撇步／調味與時間，降低模型中文字亂碼風險。 |
| 情境 | 清冰箱、兒童餐、`🍳 隨機配菜`、`🛒 檢視清單`、菜系輪播等。 |
| 媒體 | 傳圖辨識食材後產食譜；收藏輪播與刪除。 |
| 營運 | Webhook **記憶體佇列**、event **去重**、每日**配額**（`app/billing.py`）、`GET /metrics`、`GET /ready`、可選 **IP 與 per-user webhook 限流**、多租戶 `X-Tenant-ID`。 |
| 法務 | `GET /legal/disclaimer`、`GET /legal/privacy`（見 [`docs/LEGAL_POLICY.md`](docs/LEGAL_POLICY.md)）。 |

---

## 技術棧

- **Web**：FastAPI、Uvicorn  
- **訊息**：LINE Messaging API（非同步 SDK）  
- **AI**：OpenAI 相容 `chat.completions`（Gemini 端點或 OpenAI API）；具 **429／逾時／連線** 退避（`AI_TRANSPORT_*`）與 JSON **截斷修復**（`AI_MAX_RETRIES`、`MAX_COMPLETION_TOKENS`）  
- **Deep Research Grounding**：可選用 Google Interactions API 的 **`deep-research-preview-04-2026`** agent，在食譜生成前補充比例、食安與近期市場時價研究摘要；超時或失敗時會自動回退到原本無 Grounding 的生成流程。  
- **Flex 介面**：LINE Flex 主選單、菜系輪播、食譜卡與 fallback 卡片統一採 **Dark Michelin Theme**，以深墨背景、石板卡片、暖白文字與 Michelin 橘 CTA 建立一致視覺。  
- **食譜主圖**：recipe card 預設**不自動生圖**；使用者於 Flex 卡片按下「🖼 生成主圖」時，`IMAGE_PROVIDER=openai_compatible` 才會使用 **GPT-Image-2** snapshot（`gpt-image-2-2026-04-21`）生成主圖，並將 `b64_json` 轉成本站短期公開 URL 供 Flex hero 使用。  
- **主圖穩定性**：主圖 API 走 `AI_IMAGE_TIMEOUT_SEC`（預設 60 秒）+ 傳輸錯誤重試（rate limit / timeout / connection）。失敗時可回退 fallback 圖，但 **不會把 fallback 寫入快取**，避免短暫故障放大成長時間壞狀態。  
- **食譜海報**：以 **Pillow** 將既有 recipe JSON 渲染成可分享的 PNG 資訊圖，海報會優先嵌入既有主圖（快取命中時直接使用，否則按目前 provider 補圖）；若主圖下載失敗則自動退回純文字版，不阻斷海報生成。沿用既有 `/media/recipe-hero/{token}` 短期媒體機制對外提供；目前預設為 Dark Michelin 深色石板版型，在 CI / Linux 環境找不到 CJK 字型時會自動退回內建字型，避免渲染直接失敗。  
- **媒體儲存抽象**：新增 `app/media_storage.py`，可選 `RECIPE_IMAGE_STORAGE_BACKEND=memory|gcs`。`gcs` 設定完整時，主圖／海報／雙階段食譜圖卡可走 durable URL（公桶或 signed URL）。  
- **兩段式食譜圖卡**：`app/recipe_card_generator.py` 已接到產品 postback（`action=generate_recipe_card`）。先由 `gpt-image-2` 產生少文字底圖，再以程式疊繁中標題／食材／步驟／調味／時間，輸出 `1200x1500` PNG。  
- **資料**：`DATABASE_URL` → **psycopg** 直連 Postgres；見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)、[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md)  
- **部署**：`render.yaml`；可選 GCP（[`docs/DEPLOY_GCP.md`](docs/DEPLOY_GCP.md)）

---

## 本機開發

### 依賴與啟動

```bash
pip install -r requirements.txt
cp .env.example .env
```

匯入時需 **`LINE_CHANNEL_ACCESS_TOKEN`**、**`LINE_CHANNEL_SECRET`**、**`GEMINI_API_KEY`**（或 OpenAI 路徑變數）。本機可填占位僅供啟動／測試：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m uvicorn main:app --reload --port 8000
```

- Liveness：`GET /`  
- Readiness（可選 DB）：`GET /ready`  
- Webhook：`POST /callback`（需有效 `X-Line-Signature`）

### 測試

```bash
pip install -r requirements-dev.txt
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```

全倉目前 **122** 則測試；`tests/integration/` 內依 Postgres 的測試在設好 `DATABASE_URL` 時應一併通過（**122 passed**）。

兩段式圖卡快速試跑（`--skip-api` 不呼叫 OpenAI 生底圖）：

```bash
python3 scripts/generate_recipe_card_example.py --recipe examples/sample-recipe.json --skip-api
```

可用以下指令快速驗證兩段式食譜圖卡（`--skip-api` 代表先用本機佔位底圖，不呼叫 OpenAI）：

```bash
python3 scripts/generate_recipe_card_example.py --recipe examples/sample-recipe.json --skip-api
```

---

## Render 部署

1. 建立 Web Service，綁定本 repo；讀取 **`render.yaml`**。  
2. 環境變數填入 LINE、AI、可選 `DATABASE_URL`、Vertex 等（下表）。  
3. Webhook：`https://<你的服務>.onrender.com/callback`。  
4. **建置**須能執行 **`python -m playwright install --with-deps chromium`** 並安裝 **Noto CJK**（`render.yaml` 的 `buildCommand` 已兩者皆含），否則海報易退回 Pillow 或中文字在截圖中異常。

---

## 環境變數速查

| 變數 | 必填 | 說明 |
|------|:----:|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE Messaging API token |
| `LINE_CHANNEL_SECRET` | ✅ | Channel secret |
| `GEMINI_API_KEY` | ✅\* | 走 Gemini 直連 |
| `OPENAI_API_KEY` | ✅\* | 改走非 gemini 模型時 |
| `IMAGE_OPENAI_API_KEY` |  | 可選；`IMAGE_PROVIDER=openai_compatible` 時主圖優先使用，否則回退 `OPENAI_API_KEY` |
| `MODEL_NAME` |  | 預設 `gemini-3.1-flash-lite-preview` |
| `MAX_COMPLETION_TOKENS` |  | 預設 **1024**；控制文字食譜輸出成本，遇截斷會觸發修復提示，必要時可拉高 |
| `MAX_HISTORY_TURNS` |  | 送入模型的對話輪數（不含 system），預設 **2** |
| `AI_MAX_RETRIES` |  | JSON 解析／截斷修復輪數，預設 **1** |
| `AI_TRANSPORT_MAX_RETRIES` |  | 傳輸層額外重試 |
| `AI_TRANSPORT_BASE_DELAY_SEC` |  | 退避起始秒數 |
| `DEEP_RESEARCH_API_KEY` |  | 可選；若設置則 Deep Research 優先使用它，未設時會回退使用 `GEMINI_API_KEY` |
| `DEEP_RESEARCH_TIMEOUT_SEC` |  | 可選；Deep Research timeout，程式會限制在 **45-60 秒** 間，預設 **55** 秒 |
| `DATABASE_URL` |  | Render Postgres 等；記憶／收藏／配額與訂閱走 psycopg（多租戶 `tenant_id`） |
| `YOUTUBE_API_KEY` |  | 教學影片連結 |
| `IMAGE_PROVIDER` |  | `placeholder` / `vertex_imagen` / `openai_compatible`（預設 `openai_compatible`；點擊「🖼 生成主圖」時才生成） |
| `AI_IMAGE_TIMEOUT_SEC` |  | 圖片 API timeout（預設 **60** 秒） |
| `AI_IMAGE_MAX_RETRIES` / `AI_IMAGE_BASE_DELAY_SEC` |  | 圖片 API 額外重試次數與退避起始秒數（預設 3 / 0.8） |
| `GCP_PROJECT_ID` | Vertex 時 | Vertex 專案 |
| `VERTEX_LOCATION` / `VERTEX_IMAGEN_MODEL` |  | 區域與 Imagen 模型 |
| `VERTEX_SERVICE_ACCOUNT_JSON` |  | 單行 SA JSON（擇一） |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` |  | 單行 SA JSON；啟動寫暫存檔並設 `GOOGLE_APPLICATION_CREDENTIALS` |
| `VERTEX_IMAGEN_OUTPUT_GCS_URI` |  | 可選 `gs://...` 輸出 |
| `IMAGE_PUBLIC_BASE_URL` |  | 可選 CDN / 公網圖床前綴；有值時 `gs://` 會改寫成此網域 |
| `IMAGE_CACHE_TTL_SEC` |  | 主圖快取秒數，預設 **3600**；0 關閉（fallback 圖不快取） |
| `IMAGE_CACHE_BACKEND` |  | `auto` / `memory` / `redis` |
| `REDIS_URL` |  | 跨實例圖片快取（Redis / Upstash） |
| `IMAGE_CACHE_NAMESPACE` |  | Redis key 前綴（預設 `recipe_image`） |
| `GCS_SIGNED_URL_TTL_SEC` |  | `gs://` 轉 signed URL 的有效秒數（預設 3600）；0 關閉 |
| `RECIPE_IMAGE_STORAGE_BACKEND` |  | `memory` / `gcs`（主圖、海報、食譜圖卡輸出 URL 後端） |
| `RECIPE_IMAGE_GCS_BUCKET` | gcs 時 | recipe 圖片儲存 bucket |
| `RECIPE_IMAGE_GCS_PREFIX` |  | gcs 物件前綴（預設 `recipe-hero`） |
| `RECIPE_IMAGE_GCS_SIGNED_URL_TTL_SEC` |  | gcs 非公桶時簽名網址有效秒數（預設 3600） |
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
| `PUBLIC_APP_BASE_URL` |  | 產生 Flex 內 legal URI 按鈕網址（`/legal/*`），也用於主圖與食譜海報回傳 `/media/recipe-hero/{token}` 公開網址；需為 **https** |
| `ADMIN_API_TOKEN` |  | 管理訂閱 API |
| `METRICS_TOKEN` | **建議正式必填** | 未設時 `GET /metrics` **503**；請求帶 `X-Metrics-Token` |
| `LOG_USER_HASH_SALT` |  | user hash |
| `OTEL_*` |  | OpenTelemetry |
| `DEBUG` |  | `1` 較詳 log |

\* `gemini-*` 用 `GEMINI_API_KEY`；其他經 OpenAI 相容端點用 `OPENAI_API_KEY`。主圖若用 GPT-Image-2 請設 `IMAGE_OPENAI_API_KEY` 或 `OPENAI_API_KEY`。

**Vertex 憑證優先序**：`VERTEX_SERVICE_ACCOUNT_JSON` → `GOOGLE_APPLICATION_CREDENTIALS_JSON`（寫暫存檔）→ 既有 `GOOGLE_APPLICATION_CREDENTIALS`／ADC。失敗回退佔位圖，不中斷食譜。

---

## 資料庫與 migration

- 範例／遷移：`migrations/*.sql`（以倉內實際檔案為準）  
- 建表：`python3 init_db.py` 或 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)  
- 策略：[`docs/SCHEMA_MIGRATIONS.md`](docs/SCHEMA_MIGRATIONS.md)  

**單一來源**：以 migration 與 `init_db` 為準；避免 README 與手抄 SQL 雙份（見 [`TODOS.md`](TODOS.md)）。

---

## LINE 指令與圖文選單

| 輸入／動作 | 行為 |
|------------|------|
| 自然語言需求 | 產生食譜 Flex |
| `你好`／`清除記憶`／`洗腦`／`重新開始` | 重置對話 |
| `🍳 隨機配菜` | 隨機風格配菜 |
| `🛒 檢視清單` | 上一道採買清單 |
| 換菜單／相關關鍵字 | 菜系選擇等（Flex 內用色須符合 LINE 規範，勿用不支援的 `rgba` 於需 HEX 的欄位） |
| `升級方案` 等 | 升級導向 |
| 法務關鍵字 | 隱私／免責說明 |
| `刪除我的資料` 等 | 刪除使用者資料 |
| 清冰箱、小孩餐 等關鍵字 | 情境模式 |
| 上傳圖片 | 辨識食材 → 食譜 |
| 我的最愛／收藏 | 收藏輪播 |
| `🖼 生成主圖` / `🖼 生成食譜海報` | 對最近食譜按需生圖 |

**Rich Menu**：規格、熱區、上傳流程見 [`docs/RICH_MENU.md`](docs/RICH_MENU.md)：

```bash
python3 setup_richmenu.py
```

僅 `git push` **不會**更新 LINE 上選單；圖或 `richmenu_config.json` 變更須重跑腳本。

---

## HTTP 端點（摘要）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | Liveness |
| GET | `/ready` | Readiness（可選 DB） |
| POST | `/callback` | Webhook |
| GET | `/metrics` | 需 `METRICS_TOKEN` + `X-Metrics-Token` |
| GET | `/billing/checkout` | 升級 |
| GET | `/legal/*` | 法務 |
| GET/PUT | `/admin/subscriptions/{user_id}` | 需管理 token |

---

## 專案結構

```text
my-chef-ai-agent/
├── main.py
├── app/
│   ├── config.py
│   ├── clients.py
│   ├── routes.py
│   ├── rate_limit.py
│   ├── handlers.py
│   ├── handlers_commands.py
│   ├── handlers_recipe_flow.py
│   ├── job_queue.py
│   ├── ai_service.py
│   ├── deep_research.py    # Google Interactions API Deep Research 預處理
│   ├── recipe_poster.py    # Pillow 食譜資訊圖海報渲染（含主圖嵌入與純文字 fallback）
│   ├── recipe_card_generator.py # 兩段式食譜圖卡：gpt-image-2 底圖 + 繁中文字疊字
│   ├── media_storage.py    # recipe 圖片儲存抽象（memory / gcs）
│   ├── image_cache.py      # 圖片快取（memory / redis）
│   ├── db.py
│   ├── billing.py
│   ├── helpers.py
│   ├── observability.py
│   └── …
├── tests/
├── docs/
├── migrations/
├── scripts/
├── examples/
├── render.yaml
├── init_db.py
├── setup_richmenu.py
├── richmenu_config.json
├── richmenu.jpg            # 圖文選單圖（預設；須 ≤1 MB）
├── examples/sample-recipe.json  # 兩段式食譜圖卡範例輸入
├── scripts/generate_recipe_card_example.py # 範例 runner（可 --skip-api）
├── render.yaml
└── init_db.py
```

---

## 變更紀錄與待辦

- [`CHANGELOG.md`](CHANGELOG.md)  
- [`TODOS.md`](TODOS.md)  

每完成一輪**可上線的變更**，建議一併更新上列兩檔與本 README；細項見 [`AGENTS.md`](AGENTS.md)。

---

## 授權

**MIT** — 見 [`LICENSE`](LICENSE)。
