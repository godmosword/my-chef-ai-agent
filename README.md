## 職人料理大腦（LINE Bot × FastAPI）

以 **Gemini** 系列（預設 `MODEL_NAME=gemini-3.1-flash-lite-preview`，可改走 OpenAI）為核心的食譜助理：多輪對話、結構化 JSON 食譜、**Flex Message** 卡片、可選 **Vertex Imagen** 主圖、**Render Postgres** 持久化（未設定時優雅降級）。

更完整的維運與測試環境變數見 [`AGENTS.md`](AGENTS.md)；貢獻與里程碑收尾流程見 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

---

## 開源、商標與第三方服務

- **授權**：MIT，全文見根目錄 [`LICENSE`](LICENSE)。第三方 Python 套件摘要見 [`docs/THIRD_PARTY_LICENSES.md`](docs/THIRD_PARTY_LICENSES.md)（更新依賴後請執行 `python3 scripts/generate_third_party_licenses.py` 並一併提交）。
- **商標**：請使用中性品牌名稱並自行評估當地商標法與命名風險。
- **外部 API**：部署者須自備並遵守 **LINE**、**Google／Gemini**、**OpenAI**、**YouTube** 等條款；本倉庫僅提供程式碼。
- **開源前檢查**：[`docs/OPEN_SOURCE_CHECKLIST.md`](docs/OPEN_SOURCE_CHECKLIST.md)

---

## 功能總覽

| 類別 | 說明 |
|------|------|
| 食譜 | 主題、菜名、步驟、採買、估算成本；`kitchen_talk`、`ingredients`、`steps`、`shopping_list` 等由模型輸出。預設**低延遲**；`ENABLE_DEEP_RESEARCH=1` 時於生成前做 Deep Research Grounding；圖／影片由 `IMAGE_PROVIDER`、`YOUTUBE_API_KEY` 等補齊。 |
| 卡片 | 有效 **https** 成品圖才顯示 hero；否則文字色塊標頭。Flex 採**溫暖明亮**主題（`app/flex_theme.py`）。主圖可重試、**fallback 不快取**，避免暫時故障污染快取。 |
| 海報 | 按需 **PNG**：**Playwright + Chromium** 渲染 `recipe_poster_html.py`；失敗回退 **Pillow** `recipe_poster.py`（同系列暖色）。 |
| 兩段式圖卡 | `recipe_card_generator.py`：Stage A 底圖、Stage B 疊繁中；postback `generate_recipe_card`。 |
| 媒體儲存 | `media_storage.py`：`memory`／`gcs` 提供主圖／海報／圖卡之耐久 URL（可選）。 |
| 情境 | 清冰箱、兒童餐、`🍳 隨機配菜`、`🛒 檢視清單`、換菜單／菜系等。 |
| 媒體 | 上傳圖片辨識食材；收藏與刪除。 |
| 營運 | Webhook **記憶體佇列**、event **去重**、**配額**、`GET /metrics`、`GET /ready`、**IP 與 per-user 限流**、可選多租戶 `X-Tenant-ID`。 |
| 法務 | `GET /legal/disclaimer`、`GET /legal/privacy`（[`docs/LEGAL_POLICY.md`](docs/LEGAL_POLICY.md)） |

---

## 技術棧

- **Web**：FastAPI、Uvicorn  
- **訊息**：LINE Messaging API（非同步 SDK）  
- **AI**：OpenAI 相容 `chat.completions`（Gemini 端點或 OpenAI API）；**429／逾時／連線**退避；JSON 截斷修復（`AI_MAX_RETRIES`、`MAX_COMPLETION_TOKENS`）。預設偏快：`AI_TRANSPORT_MAX_RETRIES=1`、`AI_CHAT_TIMEOUT_SEC=18` 等。  
- **Deep Research**（可選）：Google Interactions API **`deep-research-preview-04-2026`**；預設**關閉**（`ENABLE_DEEP_RESEARCH=1` 啟用）；timeout **5–20** 秒、預設 **10**；併入 system 前可依 `DEEP_RESEARCH_MAX_CHARS_IN_SYSTEM` 截斷。  
- **Flex UI**：`design_tokens.py`（單一 token source）→ `flex_theme.py` / `ui_contracts.py`（元件契約）→ `flex_messages.py`。  
- **UX 規範**：互動狀態矩陣、A11y 基線、語氣規範與使用者流程圖見 [`docs/UX_PLAYBOOK.md`](docs/UX_PLAYBOOK.md)。
- **食譜主圖**：按需「🖼 生成主圖」；`IMAGE_PROVIDER=openai_compatible` 時 **GPT-Image-2**；`b64_json` → 本站 `/media/...`。**可重試**；fallback **不快取**。  
- **食譜海報**：`recipe_poster_html.py` + Playwright；失敗回退 Pillow；需 **Chromium** 與 **CJK 字型**（見 `render.yaml`）。  
- **兩段式圖卡**：`recipe_card_generator` postback `generate_recipe_card`；`1200×1500` PNG。  
- **媒體儲存**：`media_storage.py`；`RECIPE_IMAGE_STORAGE_BACKEND=memory|gcs`。  
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

全倉目前 **153** 則測試；`tests/integration/` 內依 Postgres 的測試在設好 `DATABASE_URL` 時應一併通過（**153 passed**）。

兩段式圖卡快速試跑（`--skip-api` 不呼叫 OpenAI 生底圖）：

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
| `OPENAI_API_KEY` | ✅\* | 改走非 gemini 模型時。**若聊天走 Gemini 仍要 GPT Image（主圖、兩段式食譜圖卡 Stage A）**，請在環境變數保留 `OPENAI_API_KEY`，或改設專用 `IMAGE_OPENAI_API_KEY`（解析順序與 `resolve_openai_image_api_key()` 一致） |
| `IMAGE_OPENAI_API_KEY` |  | 專用於圖像 API，優先於環境變數 `OPENAI_API_KEY`；`IMAGE_PROVIDER=openai_compatible` 主圖、食譜圖卡底圖皆用同一解析 |
| `RECIPE_POSTER_RENDERER` |  | 預設 `html`（Playwright 截圖）。設為 `pillow` 可強制走純 Pillow 海報（不中經 Playwright，利於畫面除錯或環境缺字型時） |
| `MODEL_NAME` |  | 預設 `gemini-3.1-flash-lite-preview` |
| `MAX_COMPLETION_TOKENS` |  | 預設 **1024**（下限 512）；可下調省輸出，步驟多時易觸發截斷修復 |
| `MAX_HISTORY_TURNS` |  | 預設 **2** |
| `AI_MAX_RETRIES` |  | JSON 修復輪數，預設 **1** |
| `AI_TRANSPORT_MAX_RETRIES` |  | 傳輸層重試，預設 **1** |
| `AI_TRANSPORT_BASE_DELAY_SEC` |  | 退避起點 |
| `AI_CHAT_TIMEOUT_SEC` |  | 文字食譜，預設 **18** 秒 |
| `AI_IMAGE_TIMEOUT_SEC` |  | 主圖／圖片 API，預設 **25** 秒（程式下限 5） |
| `AI_IMAGE_MAX_RETRIES` / `AI_IMAGE_BASE_DELAY_SEC` |  | 圖片 API 額外重試，預設 **3** / **0.8** |
| `AI_VISION_TIMEOUT_SEC` |  | 圖片辨識，預設 **20** 秒 |
| `ENABLE_DEEP_RESEARCH` |  | 預設 **0**；**1** 啟用 Deep Research |
| `DEEP_RESEARCH_API_KEY` |  | 可選；未設則回退 `GEMINI_API_KEY` |
| `DEEP_RESEARCH_TIMEOUT_SEC` |  | 限 **5–20** 秒，預設 **10** |
| `DEEP_RESEARCH_MAX_CHARS_IN_SYSTEM` |  | 研究報告併入 system 前字元上限，預設 **1200**（400–8000） |
| `DATABASE_URL` |  | Postgres；記憶／收藏／配額 |
| `YOUTUBE_API_KEY` / `YOUTUBE_SEARCH_TIMEOUT_SEC` / `YOUTUBE_CACHE_TTL_SEC` |  | 教學影片 |
| `IMAGE_PROVIDER` |  | `placeholder` / `vertex_imagen` / `openai_compatible` |
| `GCP_PROJECT_ID`、`VERTEX_*`、`GOOGLE_APPLICATION_CREDENTIALS_JSON` 等 | Vertex 時 | 見 [`AGENTS.md`](AGENTS.md) |
| `IMAGE_PUBLIC_BASE_URL` |  | 可選 CDN；`gs://` 改寫用 |
| `IMAGE_CACHE_TTL_SEC` / `IMAGE_CACHE_BACKEND` / `REDIS_URL` / `IMAGE_CACHE_NAMESPACE` |  | 主圖快取 |
| `GCS_SIGNED_URL_TTL_SEC` |  | `gs://` 轉 signed URL |
| `RECIPE_IMAGE_STORAGE_BACKEND` |  | `memory`／`gcs` |
| `RECIPE_IMAGE_GCS_BUCKET` / `RECIPE_IMAGE_GCS_PREFIX` / `RECIPE_IMAGE_GCS_SIGNED_URL_TTL_SEC` | gcs | GCS 儲存食譜圖片 |
| `RECIPE_FALLBACK_HERO_IMAGE_URL` |  | 無 AI 主圖時的 **https** hero |
| `RATE_LIMIT_CALLBACK_PER_MINUTE` 等 |  | IP／公開路由限流，0 關閉 |
| `RATE_LIMIT_USER_PER_MINUTE` / `RATE_LIMIT_USER_BURST` |  | 每 user+tenant |
| `QUOTA_WARN_THRESHOLD` |  | 額度提醒門檻 |
| `RECIPE_STEPS_PREVIEW_COUNT` / `RECIPE_STEPS_MAX_COUNT` / `RECIPE_STEP_MAX_CHARS` |  | Flex 與提示詞步驟約束 |
| `DEFAULT_TENANT_ID` / `PLAN_*_DAILY_LIMIT` |  | 租戶與配額 |
| `QUEUE_WORKER_COUNT` / `QUEUE_MAX_SIZE` / `QUEUE_DEDUPE_TTL_SEC` |  | 佇列；worker 預設 **4** |
| `REQUIRE_ATOMIC_USAGE` |  | `1` 強制 DB 原子扣量 |
| `BILLING_*`、checkout |  | 升級連結與占位金流 |
| `PUBLIC_APP_BASE_URL` |  | **https**；法律連結、主圖／海報／圖卡之 `/media/...` |
| `ADMIN_API_TOKEN` |  | 管理訂閱 API |
| `METRICS_TOKEN` | **建議正式必填** | 未設時 `GET /metrics` **503**；請求帶 `X-Metrics-Token` |
| `LOG_USER_HASH_SALT` |  | user hash |
| `OTEL_*` |  | OpenTelemetry |
| `DEBUG` |  | `1` 較詳 log |

\* `gemini-*` 用 `GEMINI_API_KEY`；其他經 OpenAI 相容端點用 `OPENAI_API_KEY`。圖像（主圖、兩階食譜卡底圖）與**聊天**金鑰分開時，請至少設定 **`IMAGE_OPENAI_API_KEY` 或環境變數 `OPENAI_API_KEY`** 給圖用；只設 `GEMINI_API_KEY` 而完全不設圖用 OpenAI 金鑰時，兩段式圖卡 Stage A 與可選主圖會失敗或僅有備援圖。

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
│   ├── design_tokens.py
│   ├── clients.py
│   ├── routes.py
│   ├── rate_limit.py
│   ├── handlers.py
│   ├── handlers_commands.py
│   ├── handlers_recipe_flow.py
│   ├── job_queue.py
│   ├── ai_service.py
│   ├── deep_research.py
│   ├── flex_theme.py
│   ├── ui_contracts.py
│   ├── flex_messages.py
│   ├── recipe_poster.py
│   ├── recipe_poster_html.py
│   ├── recipe_card_generator.py
│   ├── media_storage.py
│   ├── image_cache.py
│   ├── db.py
│   ├── billing.py
│   ├── helpers.py
│   ├── observability.py
│   └── …
├── tests/
├── docs/
│   ├── UX_PLAYBOOK.md
│   └── UI_COMPONENT_CONTRACT.md
├── migrations/
├── scripts/
│   └── generate_recipe_card_example.py
├── examples/
│   └── sample-recipe.json
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
