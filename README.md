## 米其林職人大腦（Render / LINE Bot 版）

以 **Gemini 3.1 Flash Lite**（可透過 `MODEL_NAME` 切換）為核心的 FastAPI + LINE Bot 專案，模擬米其林三星廚房團隊，幫你：

- **即時生成食譜**（主題、菜名、步驟）
- **估算採買清單與總成本**
- 以 **Flex Message 卡片** 呈現在 LINE 對話中

---

## 功能總覽

- **廚房角色扮演**：行政主廚、副主廚、食材總管三方討論後給出菜單  
- **結構化輸出**：`kitchen_talk`、`ingredients`、`steps`、`shopping_list`、`estimated_total_cost` 以 JSON 回傳；圖片與影片連結由後端多媒體流程補齊（不是 LLM 憑空產生）。**若無有效成品圖 URL**（例如僅 `placeholder`、產圖失敗），食譜卡 **不顯示與菜名無關的隨機圖**，改為 **文字色塊標頭**；有 **Vertex Imagen／DALL·E 等** 回傳之 `https` 圖時才顯示 hero 大圖。`video_url` 若有則以 footer「▶ 教學影片」URI 外開。
- **多輪對話與情境**：
  - `🍳 隨機配菜`：隨機料理風格配菜
  - `🛒 檢視清單`：查看上一道菜的採買清單
  - 「清冰箱」「剩下」「剩食」：清冰箱模式
  - 「小孩」「兒童」「兒子」：兒童餐模式
- **傳照片辨識食材**：傳送食物或冰箱內食材照片，由 AI 辨識後自動產出對應食譜。
- **我的最愛**：輸入「我的最愛」「收藏」「最愛食譜」可瀏覽收藏食譜輪播，並可刪除單筆收藏。
- **用量配額與方案**：內建每日次數控管（free/pro/enterprise），超額時提供升級連結。
- **可靠佇列處理**：Webhook 事件會先入列（含 event 去重），由背景 worker 消化。
- **觀測與法務端點**：`GET /metrics`（可選 token）、`GET /legal/disclaimer`、`GET /legal/privacy`；詳見 [`docs/LEGAL_POLICY.md`](docs/LEGAL_POLICY.md)。
- **多租戶 HTTP**：Webhook 可帶 `X-Tenant-ID`（未帶則用 `DEFAULT_TENANT_ID`）。
- **狀態管理（可選）**：透過 Supabase 儲存：
  - 對話記憶 `user_memory`
  - 飲食偏好 `user_preferences`
  - 食譜收藏 `favorite_recipes`
  - 目前菜系情境 `user_cuisine_context`
  - 訂閱與配額 `subscriptions` / `usage_daily` / `usage_ledger`

---

## 技術棧

- **Web**：FastAPI + Uvicorn  
- **AI**：Gemini 3.1 Flash Lite（預設透過 `MODEL_NAME=gemini-3.1-flash-lite-preview`）  
- **訊息**：LINE Bot SDK v3（非同步版 `AsyncMessagingApi`）  
- **資料庫**：**Render Postgres**（`DATABASE_URL` + `psycopg`，記憶／收藏）與 **Supabase**（用量／訂閱等 REST，可關閉）；皆未設定時自動降級為無狀態模式  
- **託管環境**：Render（`render.yaml`） / GCP Cloud Run（可選）  

---

## 1. 本機開發

### 1.1 安裝依賴與環境變數

```bash
# 安裝依賴
pip install -r requirements.txt

# 複製範例環境變數
cp .env.example .env
```

編輯 `.env`，至少填入：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `GEMINI_API_KEY`

（若使用 OpenRouter，則改填 `OPENROUTER_API_KEY` 與對應的 `MODEL_NAME`）

### 1.2 啟動開發伺服器

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

建議搭配 `ngrok` 或 Render 自帶 URL，將 `https://.../callback` 設為 LINE Webhook。

---

## 2. 在 Render 上部署

本庫已包含 `render.yaml`，可直接匯入 Render：

- `type: web`
- `env: python`
- `buildCommand: pip install -r requirements.txt`
- `startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.1 重要環境變數（Render Dashboard 設定）

| 變數 | 必填 | 說明 |
|------|:----:|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE Messaging API access token |
| `LINE_CHANNEL_SECRET` | ✅ | LINE Basic settings 的 Channel secret |
| `MODEL_NAME` |  | 預設 `gemini-3.1-flash-lite-preview` |
| `GEMINI_API_KEY` | ✅\* | 使用 Gemini 直連時必填 |
| `OPENROUTER_API_KEY` | ✅\* | 若改走 OpenRouter 模型時必填 |
| `DATABASE_URL` |  | **Render Postgres** Internal URL；若設定則對話記憶／收藏以 **`psycopg` 直連 Postgres**（詳見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)），此時不會用 Supabase REST 讀寫上述核心表。訂閱與每日用量等商業化功能仍建議搭配 Supabase 與專案內 migration。 |
| `SUPABASE_URL` |  | 未設 `DATABASE_URL` 時用於記憶／收藏；有設 `DATABASE_URL` 時仍可用於用量／訂閱等 REST 表。不填則關閉對應 Supabase 功能。 |
| `SUPABASE_KEY` |  | Supabase 金鑰；生產建議 **service role**（僅後端、勿進前端）。 |
| `YOUTUBE_API_KEY` |  | YouTube Data API v3 key（補食譜教學影片） |
| `IMAGE_PROVIDER` |  | 圖片來源策略（`placeholder`/`vertex_imagen`/`openai_compatible`） |
| `GCP_PROJECT_ID` |  | `IMAGE_PROVIDER=vertex_imagen` 時必填 |
| `VERTEX_LOCATION` |  | Vertex 區域（預設 `us-central1`） |
| `VERTEX_IMAGEN_MODEL` |  | Imagen 模型（預設 `imagen-3.0-generate-002`） |
| `VERTEX_SERVICE_ACCOUNT_JSON` |  | 可選；Service Account JSON 單行字串。未設則走 `GOOGLE_APPLICATION_CREDENTIALS` / ADC |
| `VERTEX_IMAGEN_OUTPUT_GCS_URI` |  | 可選；如 `gs://bucket/prefix`，供 Imagen 輸出到 GCS |
| `DEBUG` |  | 設為 `1` 時會輸出較詳細 log |
| `DEFAULT_TENANT_ID` |  | 預設租戶識別（預設 `default`） |
| `PLAN_FREE_DAILY_LIMIT` |  | 免費方案每日上限（預設 `20`） |
| `PLAN_PRO_DAILY_LIMIT` |  | Pro 方案每日上限（預設 `200`） |
| `PLAN_ENTERPRISE_DAILY_LIMIT` |  | Enterprise 每日上限（預設 `2000`） |
| `QUEUE_WORKER_COUNT` |  | 背景 worker 數（預設 `2`） |
| `QUEUE_MAX_SIZE` |  | 佇列容量（預設 `1000`） |
| `QUEUE_DEDUPE_TTL_SEC` |  | event 去重 TTL 秒數（預設 `900`） |
| `REQUIRE_ATOMIC_USAGE` |  | 設為 `1` 時必須使用 DB 原子計數 RPC，否則拒絕扣量 |
| `BILLING_PROVIDER` |  | 訂閱金流識別（`manual`/`linepay`/`ecpay`/`tappay`） |
| `CHECKOUT_URL_TEMPLATE` |  | 升級連結模板（可使用 `{user_id}`、`{tenant_id}`、`{plan_key}`） |
| `BILLING_BASE_URL` |  | 未提供模板時的基底 URL |
| `ADMIN_API_TOKEN` |  | 管理訂閱 API 驗證 token |
| `METRICS_TOKEN` |  | `/metrics` 保護 token（放在 `X-Metrics-Token`） |

> \* 二擇一：  
> - 使用 `gemini-*` 模型 → 設 `GEMINI_API_KEY`  
> - 使用其他模型（經由 OpenRouter） → 設 `OPENROUTER_API_KEY`  
>
> 資料儲存：  
> - **Render Postgres** → 設 `DATABASE_URL`（建表可執行根目錄 `python3 init_db.py`，或見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)）  
> - **Supabase** → 設 `SUPABASE_URL` + `SUPABASE_KEY`（可單獨支撐記憶／收藏，也可與 Postgres 並用於用量／訂閱）  
> - 兩者皆不設則無對話記憶與收藏持久化；商業化用量請見第 3 節 migration。
>
> 圖片生成（可選）：  
> - `IMAGE_PROVIDER=vertex_imagen` + `GCP_PROJECT_ID` 可啟用 Vertex Imagen。  
> - 憑證優先順序：`VERTEX_SERVICE_ACCOUNT_JSON` → `GOOGLE_APPLICATION_CREDENTIALS` / ADC。  
> - 未設定或呼叫失敗時，系統自動 fallback 到 `placehold.co` 佔位圖，不影響食譜主流程。

### 2.2 Render 建立流程（概要）

1. 新增 Web Service，連接此 GitHub repo。  
2. 選擇 Python 環境，Render 會自動讀取 `render.yaml`。  
3. 在「Environment」頁籤填入上表所有需要的變數（尤其是 LINE 與 Gemini/OpenRouter 金鑰）。  
4. 部署完成後，取得 `https://xxx.onrender.com` 類似 URL。  
5. 到 LINE Developer Console → Messaging API → Webhook URL 設定為：  
   `https://xxx.onrender.com/callback` 並啟用 Webhook。  

---

## 3. 資料表結構（可選：Supabase 或 Render Postgres）

若需要對話記憶、偏好與收藏，請在 **Supabase** 或 **Render Postgres** 建立下列核心表（兩者 DDL 相同；Render 步驟見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)）。

### 3.1 套用專案內 migration（建議，商業化／用量）

訂閱、每日用量、`usage_ledger` 與 **`increment_usage_daily`** 原子扣量 RPC 已收錄在：

`supabase/migrations/20260412120000_commercial_schema.sql`

**方式一：Supabase CLI**（本機已 `supabase link` 目標專案）

```bash
supabase db push
```

**方式二：Supabase Dashboard** → **SQL Editor** → 開啟上述檔案，將全文貼上後執行。

補充：

- RPC 回傳欄位為 `requests_count`，與 `app/db.py` 解析邏輯一致。
- 後端若以 **service role** 金鑰（`SUPABASE_KEY`）連線，會繞過 RLS；若改為 anon 搭配 JWT 做多租戶，請依實際 JWT 內容調整該 migration 內的 policy。
- 正式環境若要強制「僅允許原子扣量、不可用非原子 fallback」，請設定 `REQUIRE_ATOMIC_USAGE=1`，並確認已部署此 RPC。

### 3.2 手動 SQL 參考（對話記憶等核心表 + 商業化表）

以下為可一次複製的 DDL 範例；商業化相關部分與 **3.1** 檔案語意相同，維運上建議以 migration 檔為單一來源。

```sql
-- 對話記憶
create table user_memory (
  user_id text primary key,
  history jsonb not null,
  updated_at timestamptz default now()
);

-- 飲食偏好
create table user_preferences (
  user_id text primary key,
  preferences text,
  updated_at timestamptz default now()
);

-- 食譜收藏
create table favorite_recipes (
  id bigserial primary key,
  user_id text not null,
  recipe_name text not null,
  recipe_data jsonb not null,
  created_at timestamptz default now()
);

-- 菜系情境（Carousel 選擇後更新）
create table user_cuisine_context (
  user_id text primary key,
  active_cuisine text not null,
  context_updated_at timestamptz not null
);

-- 每日用量（多租戶）
create table usage_daily (
  tenant_id text not null default 'default',
  user_id text not null,
  usage_date date not null,
  requests_count integer not null default 0,
  updated_at timestamptz default now(),
  primary key (tenant_id, user_id, usage_date)
);

-- 訂閱方案（多租戶）
create table subscriptions (
  tenant_id text not null default 'default',
  user_id text not null,
  plan_key text not null default 'free',
  status text not null default 'active',
  updated_at timestamptz default now(),
  primary key (tenant_id, user_id)
);

-- 用量帳務明細（多租戶）
create table usage_ledger (
  id bigserial primary key,
  tenant_id text not null default 'default',
  user_id text not null,
  units integer not null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 範例 RLS（依 tenant_id 隔離）
alter table usage_daily enable row level security;
alter table subscriptions enable row level security;
alter table usage_ledger enable row level security;

create policy tenant_isolation_usage_daily
on usage_daily for all
using (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

create policy tenant_isolation_subscriptions
on subscriptions for all
using (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

create policy tenant_isolation_usage_ledger
on usage_ledger for all
using (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

-- 建議：原子扣量 RPC（避免多實例競態；回傳欄位名與 migration 一致）
create or replace function increment_usage_daily(
  p_tenant_id text,
  p_user_id text,
  p_usage_date date,
  p_units integer
)
returns table (requests_count integer)
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into usage_daily (tenant_id, user_id, usage_date, requests_count)
  values (p_tenant_id, p_user_id, p_usage_date, p_units)
  on conflict (tenant_id, user_id, usage_date)
  do update set requests_count = usage_daily.requests_count + excluded.requests_count
  returning usage_daily.requests_count into v_count;

  return query select v_count as requests_count;
end;
$$;
```

未設定 `SUPABASE_URL` / `SUPABASE_KEY` 時，相關功能會自動變成 no-op，不會中斷整體服務。

---

## 4. 使用說明（LINE 指令總表）

| 輸入 | 行為 |
|------|------|
| 任意料理需求（例如「番茄牛腩」） | 產出完整食譜 Flex 卡片 |
| `你好` / `清除記憶` / `洗腦` / `重新開始` | 清除對話記憶並重新歡迎 |
| `🍳 隨機配菜` | 由系統隨機選一種料理風格產出配菜 |
| `🛒 檢視清單` | 顯示上一次食譜的採買清單 |
| `升級方案` / `訂閱方案` | 取得方案升級連結 |
| `隱私聲明` / `資料政策` | 查看資料使用與免責說明 |
| `刪除我的資料` / `忘記我` | 清除對話、收藏與用量資料 |
| 「清冰箱」「剩下」「剩食」 | 啟用清冰箱情境，盡量用現有食材 |
| 「小孩」「兒童」「兒子」 | 啟用兒童餐情境，溫和不辣、好咀嚼 |
| 傳送**圖片**（食物／冰箱食材） | AI 辨識食材後產出食譜 |
| `我的最愛` / `收藏` / `最愛食譜` | 顯示收藏食譜輪播，可刪除單筆 |
| Flex 卡片上的「❤️ 收藏食譜」 | 寫入 `favorite_recipes`（有 `DATABASE_URL` 時走 Postgres，否則走 Supabase REST） |

---

## 5. 開發與測試

```bash
pip install -r requirements-dev.txt
python3 -m pytest tests/ -v
```

目前 **51** 則測試全數通過（`tests/test_main.py`、`tests/test_platform_features.py`、`tests/test_ai_errors.py`、`tests/test_multimedia_flow.py`）。涵蓋範例：

- JSON 解析與錯誤處理、Flex Message 組裝、食譜卡 **hero／影片連結** 與 **`_flex_safe_https_url`** 安全過濾、無 Supabase 時記憶／偏好的降級行為
- 配額扣量失敗拒絕、`/callback` 佇列滿回 503、管理訂閱 API 需正確 `X-Admin-Token`
- AI 錯誤對使用者訊息（金鑰過期等不洩漏原始 JSON）

變更紀錄與待辦清單：

- [`CHANGELOG.md`](CHANGELOG.md)
- [`TODOS.md`](TODOS.md)（**唯一**待辦清單：工程、營運、UX）
- [`TODO.md`](TODO.md)（僅轉址至 `TODOS.md`）

營運觀測端點：

- `GET /metrics`：應用內 counters（請求、AI、佇列、錯誤）。
- `GET /billing/checkout`：產生升級連結（可作為前端跳轉入口）。
- `GET /admin/subscriptions/{user_id}` / `PUT /admin/subscriptions/{user_id}`：管理方案（需 `X-Admin-Token`）。
- `GET /legal/disclaimer`、`GET /legal/privacy`：法務與資料政策資訊。

---

## 6. 專案結構概覽

程式採 **`app/` 模組化**，`main.py` 為薄入口，實際邏輯在 `app/` 內：

```text
my-chef-ai-agent/
├── main.py                 # 入口：import app.clients + app.routes，並 re-export 供測試
├── app/
│   ├── config.py           # 環境變數、常數、logging
│   ├── clients.py          # FastAPI app、Supabase、LINE、AI client
│   ├── models.py           # WebhookMessageEvent、WebhookPostbackEvent、WebhookImageEvent
│   ├── routes.py           # /、/callback 路由
│   ├── handlers.py         # process_ai_reply、process_postback_reply、process_image_reply
│   ├── ai_service.py       # AI 呼叫與重試、圖片辨識食材
│   ├── db.py               # Postgres（DATABASE_URL）或 Supabase（記憶、偏好、收藏、菜系、用量／訂閱）
│   ├── billing.py          # 配額檢查與扣量
│   ├── job_queue.py        # Webhook 事件佇列與 worker
│   ├── observability.py    # request_id、metrics counters
│   ├── subscriptions.py    # 升級／結帳連結組裝
│   ├── flex_messages.py    # 食譜卡、主選單、菜系輪播、收藏輪播
│   └── helpers.py          # _safe_str、_extract_json、_build_system_prompt 等
├── Dockerfile
├── render.yaml
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── tests/
│   ├── test_main.py
│   ├── test_platform_features.py
│   ├── test_ai_errors.py
│   └── test_multimedia_flow.py
├── docs/
│   ├── DEPLOY_GCP.md
│   ├── RENDER_POSTGRES.md
│   └── LEGAL_POLICY.md
├── supabase/migrations/   # 商業化 schema + increment_usage_daily RPC
├── CHANGELOG.md
├── TODO.md
├── TODOS.md
├── pytest.ini
├── .github/workflows/deploy.yml
└── AGENTS.md
```

---

## 授權

MIT License
