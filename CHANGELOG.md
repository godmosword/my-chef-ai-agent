# 變更紀錄

本檔案遵循「由新到舊」排列；版本號可依 release 策略自行標註。

---

## [Unreleased]

### 新增

- **Render Postgres**：支援環境變數 `DATABASE_URL`，以 `psycopg` 讀寫與 Supabase 相同 schema；設定時不初始化 Supabase client（[`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)）。
- **使用者可讀錯誤**：Gemini API key 過期／無效時改顯示簡短中文提示，避免整段 `BadRequestError` 原文。

### 變更

- **收藏失敗提示**：改為同時提及 `DATABASE_URL`（Render Postgres）與 Supabase。
- **依賴**：`requirements.txt` 新增 `psycopg[binary]`。

### 文件

- 重寫 **`README.md`**（環境變數、部署、DDL、指令表、目錄結構）。
- 重寫 **`CHANGELOG.md`**（由新到舊、`[Unreleased]` 與歷史摘要）。
- 新增根目錄 **`TODOS.md`**（專案待辦與已知限制）。
- **`AGENTS.md`**：補充 `DATABASE_URL`、測試需帶 env、與實際模組化結構一致之描述。

---

## 2.0.0 — 2026-03-01

### 架構

- 拆分 **`app/`** 套件：`config`、`clients`、`models`、`routes`、`handlers`、`ai_service`、`db`、`flex_messages`、`helpers`。
- **`main.py`** 僅負責載入與向後相容 re-export（供測試 `from main import …`）。
- FastAPI `app` 版本標記為 **2.0.0**。

### 功能

- **圖片訊息**：`process_image_reply`、從 LINE 下載圖片、`identify_ingredients_from_image` 後串接食譜流程。
- **收藏**：關鍵字瀏覽收藏、`build_favorites_carousel`、postback 刪除／重做。
- **AI 重試**：JSON 解析失敗時重試並注入 `AI_RETRY_EXTRA_PROMPT`。
- **菜系輪播**：預建 `CUISINE_SELECTOR_MSG` 減少重複組裝。

### 其他

- Health check 回傳 `model` 等欄位。
- 新增 **`httpx`** 以下載 LINE 圖片。

---

## 較早摘要（2026-02 以前）

- **Render**：新增 `render.yaml`、`.env.example` 範本；敏感變數改由 Dashboard 設定。
- **主選單與情境**：`get_main_menu_flex`、清冰箱／預算／心情等引導文案與 system prompt 延伸。
- **非同步與穩定性**：LINE 改用 `AsyncMessagingApi`；Supabase 以 `asyncio.to_thread` + `@safe_db` 包裝；webhook 本體用 `BackgroundTasks` 處理 AI 與回覆。
- **菜系 postback**：`change_cuisine` 先寫入 `user_cuisine_context` 再觸發 `process_ai_reply`。
- **逾時與 token**：`max_retries=1`、completion timeout、降低 `MAX_COMPLETION_TOKENS`、歷史訊息濃縮。

---

## 格式說明

- **新增**：新功能  
- **變更**：既有行為或介面調整  
- **修正**：錯誤修復  
- **文件**：僅文件或註解  
