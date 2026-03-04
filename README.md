## 米其林職人大腦（Render / LINE Bot 版）

以 **Gemini 3 Flash** 為核心的 FastAPI + LINE Bot 專案，模擬米其林三星廚房團隊，幫你：

- **即時生成食譜**（主題、菜名、步驟）
- **估算採買清單與總成本**
- 以 **Flex Message 卡片** 呈現在 LINE 對話中

---

## 功能總覽

- **廚房角色扮演**：行政主廚、副主廚、食材總管三方討論後給出菜單  
- **結構化輸出**：`kitchen_talk`、`ingredients`、`steps`、`shopping_list`、`estimated_total_cost` 全部以 JSON 回傳  
- **多輪對話與情境**：
  - `🍳 隨機配菜`：隨機料理風格配菜
  - `🛒 檢視清單`：查看上一道菜的採買清單
  - 「清冰箱」「剩下」「剩食」：清冰箱模式
  - 「小孩」「兒童」「兒子」：兒童餐模式
- **狀態管理（可選）**：透過 Supabase 儲存：
  - 對話記憶 `user_memory`
  - 飲食偏好 `user_preferences`
  - 食譜收藏 `favorite_recipes`
  - 目前菜系情境 `user_cuisine_context`

---

## 技術棧

- **Web**：FastAPI + Uvicorn  
- **AI**：Gemini 3 Flash（預設透過 `MODEL_NAME=gemini-3-flash-preview`）  
- **訊息**：LINE Bot SDK v3（非同步版 `AsyncMessagingApi`）  
- **資料庫**：Supabase（可關閉，未設定時自動降級為無狀態模式）  
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
| `MODEL_NAME` |  | 預設 `gemini-3-flash-preview` |
| `GEMINI_API_KEY` | ✅\* | 使用 Gemini 直連時必填 |
| `OPENROUTER_API_KEY` | ✅\* | 若改走 OpenRouter 模型時必填 |
| `SUPABASE_URL` |  | Supabase URL（不填則關閉 DB 功能） |
| `SUPABASE_KEY` |  | Supabase anon key |
| `DEBUG` |  | 設為 `1` 時會輸出較詳細 log |

> \* 二擇一：  
> - 使用 `gemini-*` 模型 → 設 `GEMINI_API_KEY`  
> - 使用其他模型（經由 OpenRouter） → 設 `OPENROUTER_API_KEY`

### 2.2 Render 建立流程（概要）

1. 新增 Web Service，連接此 GitHub repo。  
2. 選擇 Python 環境，Render 會自動讀取 `render.yaml`。  
3. 在「Environment」頁籤填入上表所有需要的變數（尤其是 LINE 與 Gemini/OpenRouter 金鑰）。  
4. 部署完成後，取得 `https://xxx.onrender.com` 類似 URL。  
5. 到 LINE Developer Console → Messaging API → Webhook URL 設定為：  
   `https://xxx.onrender.com/callback` 並啟用 Webhook。  

---

## 3. Supabase 資料表結構（可選）

若需要對話記憶、偏好與收藏功能，可於 Supabase 建立下列表：

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
| 「清冰箱」「剩下」「剩食」 | 啟用清冰箱情境，盡量用現有食材 |
| 「小孩」「兒童」「兒子」 | 啟用兒童餐情境，溫和不辣、好咀嚼 |
| Flex 卡片上的「❤️ 收藏食譜」 | 透過 Supabase 寫入 `favorite_recipes` |

---

## 5. 開發與測試

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

測試涵蓋：

- JSON 解析與錯誤處理（`_extract_json`、`_parse_ai_json`）
- Flex Message 組裝（`generate_flex_message`）
- 記憶體相關函式在「無 Supabase」情境下的降級行為

---

## 6. 專案結構概覽

```text
my-chef-ai-agent/
├── main.py                 # FastAPI + LINE Bot 主程式
├── Dockerfile              # 容器化設定（可用於本地 / Cloud Run）
├── render.yaml             # Render 部署設定
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── tests/
│   └── test_main.py        # 單元測試
├── docs/
│   └── DEPLOY_GCP.md       # GCP Cloud Run 部署教學（可選）
├── .github/
│   └── workflows/deploy.yml# Cloud Run CI/CD（可選）
└── AGENTS.md               # 給 AI 助手的協作說明
```

---

## 授權

MIT License
