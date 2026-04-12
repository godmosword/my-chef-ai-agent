# 米其林職人大腦

FastAPI 上的 **LINE Messaging API** 機器人：用 **Gemini**（OpenAI 相容 API）產生結構化食譜 JSON，再以 **Flex Message** 回覆。可選持久化：**Render Postgres**（`DATABASE_URL`）或 **Supabase**（`SUPABASE_URL` + `SUPABASE_KEY`）；兩者皆未設定時，服務仍可跑，但對話記憶與收藏不會持久化。

---

## 功能摘要

| 類別 | 說明 |
|------|------|
| 食譜生成 | 自然語言描述料理需求 → 主題、食材、步驟、採買清單、預估成本 |
| 廚房角色 | 行政主廚／副主廚／食材總管對話（`kitchen_talk`） |
| 情境 | 清冰箱、兒童餐、預算、心情等關鍵字觸發（見下方指令表） |
| 圖片 | 傳食材／冰箱照片 → AI 辨識後接續產生食譜 |
| 收藏 | Flex 上的「收藏食譜」與「我的最愛」輪播（需資料庫） |
| 菜系 | 換菜系 postback 會寫入菜系情境並觸發新食譜流程 |

---

## 技術棧

- **執行**：Python 3.11+（Dockerfile 為 3.11）、FastAPI、Uvicorn  
- **AI**：預設 `MODEL_NAME=gemini-3.1-flash-lite-preview`，Gemini 直連；亦可改 OpenRouter（非 `gemini-*` 模型時改 `OPENROUTER_API_KEY`）  
- **LINE**：`line-bot-sdk` v3，`AsyncMessagingApi`  
- **資料**：`psycopg` + `DATABASE_URL` **或** `supabase-py` + URL／Key；見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)  
- **部署**：[`render.yaml`](render.yaml)、可選 [`docs/DEPLOY_GCP.md`](docs/DEPLOY_GCP.md)

---

## 快速開始（本機）

```bash
pip install -r requirements-dev.txt
cp .env.example .env
# 編輯 .env：LINE 與 GEMINI（或 OpenRouter）必填；DATABASE_URL 或 Supabase 選填
```

啟動（環境變數在 **import 時**就會檢查，請一次帶齊或寫入 `.env`）：

```bash
LINE_CHANNEL_ACCESS_TOKEN=… LINE_CHANNEL_SECRET=… GEMINI_API_KEY=… \
  python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- 健康檢查：`GET /` → `status`、`model`、`message`  
- Webhook：`POST /callback`，需有效 `X-Line-Signature`  
- 對外測試：ngrok／Render URL，將 `https://…/callback` 設到 LINE Console

### 測試

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m pytest tests/ -v
```

（未設資料庫時，記憶相關測試驗證安全降級。）

---

## 環境變數

### 必填

| 變數 | 說明 |
|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel access token |
| `LINE_CHANNEL_SECRET` | LINE Channel secret |

### AI（二擇一）

| 變數 | 說明 |
|------|------|
| `GEMINI_API_KEY` | `MODEL_NAME` 為 `gemini-*` 時必填（預設） |
| `OPENROUTER_API_KEY` | 使用非 Gemini 模型經 OpenRouter 時必填 |

| 變數 | 預設 | 說明 |
|------|------|------|
| `MODEL_NAME` | `gemini-3.1-flash-lite-preview` | 決定直連 Gemini 或走 OpenRouter |

### 資料庫（選填，擇一組即可）

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | Render Postgres 等 **PostgreSQL** 連線字串；設定後走 `psycopg`，**不**使用 Supabase client |
| `SUPABASE_URL` + `SUPABASE_KEY` | 僅在 **未**設定 `DATABASE_URL` 時使用 |

### 其他

| 變數 | 說明 |
|------|------|
| `DEBUG` | `1` / `true` 時較詳細 log |

---

## Render 部署（概要）

1. 建立 **Web Service**，連線此 repo；可沿用 [`render.yaml`](render.yaml)。  
2. 在 **Environment** 設定 LINE、Gemini（或 OpenRouter）金鑰。  
3. （建議）新增 **PostgreSQL**，與 Web Service **Link**，或手動設定 `DATABASE_URL`（建議 **Internal** URL），並在 DB 執行建表 SQL：[`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)。  
4. Webhook URL：`https://<你的服務>.onrender.com/callback`。

---

## 資料表 DDL（Postgres／Supabase 相同）

若啟用持久化，需建立下列資料表（完整步驟見 [`docs/RENDER_POSTGRES.md`](docs/RENDER_POSTGRES.md)）：

```sql
CREATE TABLE IF NOT EXISTS user_memory (
  user_id text PRIMARY KEY,
  history jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY,
  preferences text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_recipes (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  recipe_name text NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_cuisine_context (
  user_id text PRIMARY KEY,
  active_cuisine text NOT NULL,
  context_updated_at timestamptz NOT NULL
);
```

未設定任何資料庫時，上述功能會降級（不拋錯、不寫入）。

---

## LINE 指令與行為

| 輸入 | 行為 |
|------|------|
| 一般料理描述 | 產生食譜 Flex |
| `你好`／`清除記憶`／`洗腦`／`重新開始` | 清除記憶並歡迎 |
| `選單`／`開始` | 主選單 Flex |
| `🍳 隨機配菜` | 隨機風格配菜 |
| `🛒 檢視清單` | 上一道菜的採買清單 |
| 清冰箱／剩下／剩食 等 | 清冰箱情境前綴 |
| 小孩／兒童／兒子 等 | 兒童餐情境 |
| `換菜單` | 菜系選擇 |
| `我的最愛`／`收藏`／`最愛食譜` 等 | 收藏輪播（需 DB） |
| 圖片訊息 | 辨識食材後走食譜流程 |
| Flex「❤️ 收藏食譜」 | 寫入 `favorite_recipes`（需 DB） |

---

## 專案結構

```text
├── main.py                 # 入口：載入 app、註冊路由、re-export 測試用符號
├── app/
│   ├── config.py           # 環境與常數
│   ├── clients.py          # FastAPI、LINE、AI、可選 Supabase
│   ├── routes.py           # /、/callback
│   ├── handlers.py         # 文字／圖片／postback
│   ├── ai_service.py       # AI 呼叫、重試、圖片辨識
│   ├── db.py               # Postgres（DATABASE_URL）或 Supabase
│   ├── flex_messages.py    # Flex 組裝
│   ├── helpers.py          # 簽章、JSON、prompt 等
│   └── models.py           # Webhook 事件模型
├── tests/test_main.py
├── requirements.txt
├── requirements-dev.txt
├── render.yaml
├── Dockerfile
├── docs/
│   ├── RENDER_POSTGRES.md
│   └── DEPLOY_GCP.md
├── TODOS.md                # 已知待辦與後續想法
├── CHANGELOG.md
├── AGENTS.md               # Cursor／自動化代理說明
└── .env.example
```

---

## 文件與授權

- 代理／本機注意事項：**[`AGENTS.md`](AGENTS.md)**  
- 變更紀錄：**[`CHANGELOG.md`](CHANGELOG.md)**  
- 待辦：**[`TODOS.md`](TODOS.md)**  

MIT License
