# 米其林職人大腦 🍽️

以 Gemini 3.1 Pro AI 驅動的 LINE Bot，模擬米其林三星廚房團隊，即時生成食譜、採買清單與成本估算，並以 Flex Message 卡片呈現。

## 功能特色

| 功能 | 說明 |
|------|------|
| 廚房角色扮演 | 行政主廚、副主廚、食材總管先進行專業對話，再產出食譜 |
| 結構化食譜 | 食材報價、料理步驟、採買清單、總成本估算一次呈現 |
| 多輪對話 | 支援上下文，可追加需求（如「加一道配菜」） |
| 隨機配菜 | 輸入 `🍳 隨機配菜` 隨機指定料理風格 |
| 檢視清單 | 輸入 `🛒 檢視清單` 取得上次食譜的採買清單 |
| 飲食偏好 | 從 Supabase 讀取（不吃牛、減脂中等），動態注入 AI |
| 食譜收藏 | 點擊「❤️ 收藏食譜」存入 `favorite_recipes` |
| 情境模式 | 「清冰箱」「兒童餐」關鍵字觸發對應指示 |

## 技術棧

- **Web**：FastAPI + Uvicorn  
- **AI**：Gemini 3.1 Pro（Google AI API）  
- **訊息**：LINE Bot SDK v3  
- **資料庫**：Supabase（可選）  
- **部署**：GCP Cloud Run + GitHub Actions  

---

## 快速開始

### 本機開發

```bash
# 1. 安裝依賴
pip install -r requirements.txt

# 2. 複製環境變數
cp .env.example .env
# 編輯 .env，填入 LINE_CHANNEL_ACCESS_TOKEN、LINE_CHANNEL_SECRET、GEMINI_API_KEY

# 3. 啟動
uvicorn main:app --reload --port 8000
```

本機開發可搭配 [ngrok](https://ngrok.com/) 取得 HTTPS，供 LINE Webhook 使用。

### 環境變數

| 變數 | 必填 | 說明 |
|------|:----:|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE Messaging API |
| `LINE_CHANNEL_SECRET` | ✅ | LINE Basic settings |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey)（預設模型使用） |
| `MODEL_NAME` | | 預設 `gemini-3.1-pro-preview`，使用 GEMINI_API_KEY 直連 |
| `SUPABASE_URL` | | Supabase 專案 URL |
| `SUPABASE_KEY` | | Supabase anon key |

---

## 部署到 GCP Cloud Run

> 📖 完整逐步教學：[docs/DEPLOY_GCP.md](docs/DEPLOY_GCP.md)

1. 啟用 Cloud Run、Artifact Registry、Cloud Build API  
2. 建立 Service Account（Cloud Run Admin、Service Account User、Storage Admin）  
3. 在 GitHub Secrets 設定 `GCP_SA_KEY`、`GCP_PROJECT_ID`、`CLOUD_RUN_SERVICE`、`CLOUD_RUN_REGION` 與 LINE、Gemini、Supabase 金鑰  
4. Push 到 `main`，GitHub Actions 會自動部署  
5. 取得 Cloud Run URL，於 LINE Developer Console 設定 Webhook：`https://<你的URL>/callback`  

---

## Supabase 資料表（可選）

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
```

---

## 使用方式

| 輸入 | 行為 |
|------|------|
| 食物需求（如「番茄牛腩」） | 產生食譜卡片 |
| `你好` / `清除記憶` / `洗腦` | 清除對話、重置 |
| `🍳 隨機配菜` | 隨機風格配菜 |
| `🛒 檢視清單` | 上次食譜的採買清單 |
| 「清冰箱」「剩下」「剩食」 | 清冰箱模式 |
| 「小孩」「兒童」「兒子」 | 兒童餐模式 |

---

## 開發與測試

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

---

## 專案結構

```
my-chef-ai-agent/
├── main.py                 # 主程式
├── Dockerfile              # Cloud Run 映像
├── requirements.txt
├── .env.example
├── tests/test_main.py
├── docs/DEPLOY_GCP.md      # GCP 部署教學
└── .github/workflows/deploy.yml
```

---

MIT License
