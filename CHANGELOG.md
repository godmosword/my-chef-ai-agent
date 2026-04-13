## 變更紀錄

### 2026-04-13（食譜 Flex：參考圖與教學影片連結）

- **AI JSON**：`SYSTEM_PROMPT` 新增選填欄位 `photo_url`、`video_url`（須為可公開存取之 **https**）。
- **Flex**：`generate_flex_message` 若有有效 `photo_url` 則設 **hero 大圖**；若有有效 `video_url` 則在 footer 顯示 **「▶ 教學影片」** URI 按鈕（LINE 不支援 bubble 內嵌影片播放器，僅能外開連結）。
- **`_flex_safe_https_url`**（`helpers.py`）：過濾非 https 或過長 URL，避免 LINE API 拒絕。
- **測試**：`tests/test_main.py` 擴充 Flex 安全 URL 與食譜卡欄位等；全套件 **40** 則通過。

### 2026-04-12（Render Postgres 直連與文件）

- **資料層**
  - 支援 **`DATABASE_URL`**：對話記憶、偏好、收藏、菜系情境以 **`psycopg`** 直連 **PostgreSQL**（例如 Render Postgres）；設定時不初始化 Supabase REST client 處理上述核心表。
  - `requirements.txt` 新增 `psycopg[binary]`。
  - 根目錄 **`init_db.py`**：以 `DATABASE_URL` 建立核心四表（與 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md) 方式 A 一致）。
- **使用者訊息**
  - 收藏失敗提示同時提及 `DATABASE_URL` 與 Supabase（`handlers.py`）。
- **文件**
  - [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md) 建表與 Render 綁定步驟；[`TODOS.md`](TODOS.md) 為**唯一**工程／UX backlog；[`TODO.md`](TODO.md) 改為導向 `TODOS.md`。
  - `README.md`：技術棧與 `DATABASE_URL` 行為與 `db.py` 對齊。
  - [`TODOS.md`](TODOS.md)：新增 **LINE Flex 食譜卡／Rich Menu** UX 待辦（視覺層級、步驟長度、按鈕與品牌一致、配額提示等）。

### 2026-04-12（v2.1 商業化與平台化）

- **佇列與可靠性**
  - Webhook `/callback` 改為將文字／圖片／postback 事件 **`enqueue_job`** 入列，由 lifespan 啟動的 **async worker** 處理（取代僅依 `BackgroundTasks` 的模式）。
  - 支援 **event 去重**（TTL 可調）、佇列滿時回 **503** 以利 LINE 重試。
- **用量與訂閱（Supabase）**
  - `app/billing.py`：`check_quota` / `consume_quota`；進入 AI 前短路，超額時 LINE 文案含升級連結。
  - `usage_daily`、`subscriptions`、`usage_ledger`；可選 **`increment_usage_daily`** RPC 與 `REQUIRE_ATOMIC_USAGE`。
  - 多租戶：`X-Tenant-ID` 或 `DEFAULT_TENANT_ID`；事件模型含 `tenant_id`。
- **營運與管理 API**
  - `GET /metrics`（可選 `METRICS_TOKEN` + `X-Metrics-Token`）、`request_id` middleware。
  - `GET /billing/checkout`、`GET|PUT /admin/subscriptions/{user_id}`（`X-Admin-Token`）。
  - `GET /legal/disclaimer`、`GET /legal/privacy`；`docs/LEGAL_POLICY.md` 草案；食譜卡 footer 免責；`reply` 失敗時嘗試 `push`。
- **設定與資料庫**
  - `python-dotenv`：`app/config.py` 於載入時 `load_dotenv()`。
  - `supabase/migrations/20260412120000_commercial_schema.sql`：商業化表 + RPC + RLS 範例。
- **測試**
  - `tests/test_platform_features.py`（配額、佇列滿 503、admin token）；`tests/test_ai_errors.py`（AI 錯誤使用者文案）。
  - 該版釋出時全套件 **35** 則通過（後續見 2026-04-13 條目擴充至 **40** 則）。
- **LINE 錯誤訊息**
  - `app/ai_errors.py`：金鑰過期／無效、429、權限等改為中文說明；`DEBUG=1` 時才附技術細節。避免將 Google API 整段 JSON 貼給使用者。
- **CI／Cloud Run 部署**
  - `.github/workflows/deploy.yml`：加入 `concurrency`，同一分支序列化部署，避免 `gcloud run deploy` 回報 resource version 衝突。
  - `google-github-actions/auth@v3`、`deploy-cloudrun@v3`（Node 24）。

### 2026-03-01（v2.0 模組化與新功能）

- **架構重構**
  - 主程式拆成 `app/` 套件：`config`、`clients`、`models`、`routes`、`handlers`、`ai_service`、`db`、`flex_messages`、`helpers`。
  - `main.py` 改為薄入口（import app、re-export 供既有單元測試使用）。
  - FastAPI 版本標為 `2.0.0`。

- **新功能**
  - **傳照片辨識食材**：支援 image 訊息，下載 LINE 圖片後以 AI 視覺辨識食材，再產出食譜（`process_image_reply`、`identify_ingredients_from_image`）。
  - **我的最愛**：輸入「我的最愛」「收藏」「最愛食譜」可顯示收藏食譜輪播（`build_favorites_carousel`），並支援刪除單筆收藏。
  - **AI 重試**：JSON 解析失敗時可重試，並注入 `AI_RETRY_EXTRA_PROMPT` 要求純 JSON。
  - **菜系選單快取**：菜系輪播改為預建 `CUISINE_SELECTOR_MSG`，減少重複組裝。

- **API 與依賴**
  - Health check 回傳 `status`、`model`、`message`（可讀文案）。
  - 新增 `httpx` 依賴，用於下載 LINE 圖片。

### 2026-02-28

- **Render 與環境設定**
  - 新增 `render.yaml`，統一設定：
    - `PORT=8000`
    - `MODEL_NAME=gemini-3-flash-preview`
    - 其餘敏感金鑰（LINE、Supabase、Gemini/OpenRouter）改由 Render Dashboard 設定，避免寫死在版本庫中。
  - 簡化 `.env.example`，僅保留實際需要的變數：
    - `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`
    - `SUPABASE_URL`、`SUPABASE_KEY`
    - `GEMINI_API_KEY`、`OPENROUTER_API_KEY`
    - `MODEL_NAME=gemini-3-flash-preview`、`DEBUG=1`

- **主選單與情境模式**
  - 新增 `get_main_menu_flex()`，提供五大核心功能按鈕：
    - 🍱 各式菜色（切換菜系選單）
    - 🏠 生活需求（導向清冰箱／兒童餐說明）
    - 💰 預算方案（預算導向食譜）
    - ☁️ 心情點餐（依心情推薦料理風格）
    - 🛒 採買食材（對應「🛒 檢視清單」）
  - 在 `process_ai_reply` 中新增對應三個模式的說明邏輯：
    - 「清冰箱模式」
    - 「幫我規劃預算食譜」
    - 「我想根據心情點餐」

- **System Prompt 強化**
  - 在 `_build_system_prompt` 中加入：
    - 預算方案：要求在 `kitchen_talk` 中討論性價比並嚴格控制 `estimated_total_cost`。
    - 心情點餐：要求副主廚依據心情推薦適合的食材與口感。

- **文案微調**
  - Reset 歡迎詞更新為：`👨‍🍳 歡迎！廚房已備妥，Gemini 3 Flash 已就緒。請問想吃什麼？`
  - `health_check` 保持：`米其林職人大腦 (Gemini 3 Flash 驅動中)`。

### 2025-02-28

- **效能與非同步**
  - 將 LINE Messaging API 改為使用 `AsyncApiClient` / `AsyncMessagingApi` 非同步客戶端。
  - 將 Supabase 同步 SDK 以 `asyncio.to_thread` 包裝，並透過 `@safe_db` decorator 統一錯誤處理與降級行為。
  - Webhook `/callback` 僅做簽章驗證與 JSON 解析，實際 AI 呼叫與回覆放入 `BackgroundTasks`，避免阻塞。（**歷史紀錄**：後續 v2.1 已改為記憶體佇列 + worker，見上方 2026-04-12。）
  - 將 `AsyncOpenAI` 的 `max_retries` 設為 `1`，並對 `chat.completions.create` 設定 `timeout=45.0`，避免在 Render 或 Cloud Run 中長時間重試。
  - 將 `MAX_COMPLETION_TOKENS` 從 `4096` 降為 `2048`，並透過 `_condense_assistant_message` 對歷史訊息做摘要，以降低 token 使用量。

- **資料庫與狀態管理**
  - 將所有 Supabase 存取集中在 `main.py` 前段（`_user_memory_*`、`_user_preferences_select`、`_user_cuisine_context_*`、`save_favorite_recipe`）。
  - 若未設定 `SUPABASE_URL` 或 `SUPABASE_KEY`，相關函式自動回傳預設值而不拋例外，服務仍可無狀態運行。
  - 新增 `user_cuisine_context` 表的存取邏輯，以支援菜系情境切換。

- **UX 與路由行為**
  - `/callback` 使用 header 依賴注入 `x_line_signature: Header(..., alias="X-Line-Signature")`，提高安全性與可讀性。
  - `action=change_cuisine`：
    - 改為 `await update_user_cuisine_context(user_id, cuisine)`，確保 Supabase 寫入完成後再進行後續動作。
    - 不再回傳純文字提示，而是立刻透過 `background_tasks.add_task` 觸發 `process_ai_reply`，偽造 `WebhookMessageEvent` 讓使用者「點卡片即產出食譜」。
  - Reset 指令（例如「清除記憶」）的歡迎詞更新為：`👨‍🍳 歡迎！廚房已淨空，Gemini 3 Flash 準備就緒。今天想來點什麼風味？`
  - Health check 訊息更新為：`米其林職人大腦 (Gemini 3 Flash 驅動中)`。

- **錯誤處理與除錯體驗**
  - `process_ai_reply` 中的例外處理顯示具體錯誤類型與內容：
    - `JSONDecodeError`：提示 JSON 解析錯誤，建議使用者「清除記憶」後重試。
    - `ValueError`：提示 AI 格式解析失敗，建議換個說法並清除記憶。
    - 一般 `Exception`（含 `APITimeoutError`）：分別顯示「AI 廚房反應太慢」或錯誤類別與訊息，便於在 LINE 端與伺服器 log 雙向除錯。

- **文件與專案結構**
  - 重寫 `README.md`：
    - 以 Render + LINE Bot 為主要部署情境。
    - 明確列出必要環境變數與 Render 部署步驟。
    - 說明 Supabase 為可選項目，未設定時自動降級為無狀態模式。
  - 保留 `docs/DEPLOY_GCP.md` 與 `.github/workflows/deploy.yml`，作為 Cloud Run 部署的可選方案。

