# 米其林職人大腦 🍽️

一個以 Claude Sonnet AI 驅動的 LINE Bot，模擬米其林三星廚房團隊，根據使用者需求即時生成食譜、採買清單與成本估算，並以精美的 Flex Message 卡片呈現。

---

## 功能特色

- **廚房角色扮演**：行政主廚、副主廚、食材總管三位角色先進行專業對話，再產出食譜
- **結構化食譜輸出**：食材報價、料理步驟、採買清單、總成本估算一次呈現
- **多輪對話記憶**：支援上下文，可追加需求（如「加一道配菜」）
- **Supabase 持久化**：記憶可跨 session 保存；Supabase 未設定時自動使用記憶體快取
- **飲食偏好**：從 `user_preferences` 讀取（如不吃牛、減脂中），動態注入 AI 指示
- **食譜收藏**：點擊「❤️ 收藏食譜」將食譜存入 `favorite_recipes`
- **速率限制**：每用戶每分鐘最多 5 次請求，防止濫用

---

## 技術棧

| 層級 | 技術 |
|------|------|
| Web 框架 | FastAPI + Uvicorn |
| AI 模型 | Claude Sonnet（透過 OpenRouter.ai） |
| 訊息平台 | LINE Bot SDK v3 |
| 資料庫 | Supabase（可選） |
| 部署 | GCP Cloud Run + GitHub Actions |

---

## 快速開始

### 1. 環境需求

- Python 3.11+
- LINE Bot Channel（需有 Channel Secret 與 Access Token）
- OpenRouter.ai API 金鑰

### 2. 安裝依賴

```bash
pip install -r requirements.txt
```

### 3. 設定環境變數

複製範例檔並填入你的金鑰：

```bash
cp .env.example .env
```

編輯 `.env`，填入以下必要變數：

| 變數名稱 | 說明 | 必填 |
|----------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot Channel Access Token | ✅ |
| `LINE_CHANNEL_SECRET` | LINE Bot Channel Secret | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter.ai API 金鑰 | ✅ |
| `MODEL_NAME` | 使用的 AI 模型（預設：`anthropic/claude-sonnet-4-5`） | ❌ |
| `SUPABASE_URL` | Supabase 專案 URL | ❌ |
| `SUPABASE_KEY` | Supabase anon key | ❌ |

### 4. 本機啟動

```bash
uvicorn main:app --reload --port 8000
```

### 5. 設定 LINE Webhook

將 LINE Developer Console 的 Webhook URL 設為：

```
https://<your-domain>/callback
```

> 本機開發可使用 [ngrok](https://ngrok.com/) 建立公開 tunnel：
> ```bash
> ngrok http 8000
> ```

---

## Supabase 設定（可選）

若需跨 session 保存用戶對話記憶、飲食偏好、食譜收藏，在 Supabase 建立以下資料表：

```sql
-- 對話記憶
create table user_memory (
  user_id text primary key,
  history jsonb not null,
  updated_at timestamptz default now()
);

-- 飲食偏好設定檔（例：不吃牛、減脂中）
create table user_preferences (
  user_id text primary key,
  preferences text,  -- 字串或 JSON，如 "不吃牛、減脂中"
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

## 部署到 GCP Cloud Run

> 📖 **逐步教學**：若需更詳細的圖文步驟，請參考 [docs/DEPLOY_GCP.md](docs/DEPLOY_GCP.md)

### 前置準備

1. GCP 專案已建立，並啟用 **Cloud Run API**、**Artifact Registry API**
2. 建立 Service Account，授予：
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`（Cloud Build 需上傳 image）
3. 下載該 Service Account 的 JSON 金鑰

### GitHub Secrets 設定

在 GitHub repo → **Settings → Secrets and variables → Actions** 新增：

| Secret 名稱 | 說明 |
|-------------|------|
| `GCP_SA_KEY` | Service Account 的 JSON 金鑰內容（整個檔案） |
| `GCP_PROJECT_ID` | GCP 專案 ID（建議設定，確保部署到正確專案） |
| `CLOUD_RUN_SERVICE` | Cloud Run 服務名稱，如 `my-chef-ai-agent` |
| `CLOUD_RUN_REGION` | 區域，如 `asia-east1` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `OPENROUTER_API_KEY` | OpenRouter API 金鑰 |
| `SUPABASE_URL` | Supabase URL（選填） |
| `SUPABASE_KEY` | Supabase anon key（選填） |

### 部署流程

推送到 `main` 分支後，GitHub Actions 會自動：

1. 使用 Dockerfile 建置映像
2. 部署到 Cloud Run
3. 將上述 secrets 設為環境變數

### LINE Webhook 設定

部署完成後，Cloud Run 會提供 URL，格式如：

```
https://<CLOUD_RUN_SERVICE>-xxxxx-uc.a.run.app
```

在 LINE Developer Console 的 Webhook URL 填入：

```
https://<你的 Cloud Run URL>/callback
```

### 手動部署（選用）

若需在本機直接部署：

```bash
gcloud run deploy my-chef-ai-agent \
  --source . \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated
```

環境變數需在 GCP Console 的 Cloud Run 服務設定頁面手動填入。

---

## 使用方式

| 使用者輸入 | Bot 行為 |
|------------|----------|
| 任何食物需求，例如「我想吃番茄牛腩」 | 產生完整 Flex Message 食譜卡片 |
| `你好` / `嗨` / `清除記憶` / `重新開始` / `洗腦` | 清除對話歷史，重置廚房 |
| 超過 500 字的訊息 | 提示縮短需求 |

---

## 開發與測試

安裝開發依賴：

```bash
pip install -r requirements-dev.txt
```

執行單元測試：

```bash
pytest tests/ -v
```

---

## 專案結構

```
my-chef-ai-agent/
├── main.py              # 主應用程式
├── Dockerfile           # Cloud Run 容器映像
├── requirements.txt     # 正式依賴
├── requirements-dev.txt # 開發依賴
├── .env.example         # 環境變數範例
├── tests/
│   └── test_main.py     # 單元測試
└── .github/
    └── workflows/
        └── deploy.yml   # GCP Cloud Run 自動部署
```

---

## 授權

MIT License
