## 變更紀錄

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
  - Webhook `/callback` 僅做簽章驗證與 JSON 解析，實際 AI 呼叫與回覆放入 `BackgroundTasks`，避免阻塞。
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

