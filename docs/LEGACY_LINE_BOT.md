# 封存：LINE Bot + Render／GCP（Python FastAPI）

> **現行產品**為 [`apps/web/`](../apps/web/) 網頁版（Vercel）。本文件僅供維護舊部署、對照實作或執行 Python 測試時參考。  
> **新功能預設只加在 `apps/web/`**；`apps/line-bot/` 封存維護，不建議新開 LINE webhook 上線。

---

## 何時還需要這份文件

- 既有 LINE 官方帳號仍指向 Render `POST /callback`
- 需要 Playwright 海報 PNG、兩段式圖卡、圖片上傳辨識等 **尚未移植到 Web** 的能力
- 執行 `pnpm line:test` 或 `cd apps/line-bot && python3 -m pytest tests/` 驗證共用模組

---

## 本機啟動（Python）

```bash
cd apps/line-bot
pip install -r requirements.txt
cp ../../.env.example .env
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  uvicorn main:app --reload --port 8000
```

- Liveness：`GET /`
- Readiness：`GET /ready`（需 `DATABASE_URL`）
- Webhook：`POST /callback`（`X-Line-Signature`）

---

## Render 部署

1. Web Service + [`apps/line-bot/render.yaml`](../apps/line-bot/render.yaml)（`rootDir: apps/line-bot`）
2. 環境變數：LINE、Gemini、可選 `DATABASE_URL`、Vertex 等（見根目錄 [`.env.example`](../.env.example)）
3. Webhook URL：`https://<服務>.onrender.com/callback`
4. Build 需 **Playwright + Noto CJK**（`render.yaml` 已含）

替代教學：[`docs/DEPLOY_GCP.md`](DEPLOY_GCP.md)（Cloud Run）。

---

## LINE 指令與 Rich Menu

| 輸入／動作 | 行為 |
|------------|------|
| 自然語言 | 食譜 Flex |
| 清除記憶／重新開始 | 重置對話 |
| 換菜單關鍵字 | 菜系 |
| 上傳圖片 | 食材辨識 |
| 收藏／主圖／海報／圖卡 | postback |

Rich Menu：[`docs/RICH_MENU.md`](RICH_MENU.md)、`python3 setup_richmenu.py`

---

## Python HTTP 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | Liveness |
| GET | `/ready` | Readiness |
| POST | `/callback` | LINE Webhook |
| GET | `/metrics` | 需 `METRICS_TOKEN` |
| GET | `/billing/checkout` | 升級 |
| GET | `/legal/*` | 法務 HTML |
| GET/PUT | `/admin/subscriptions/{user_id}` | 管理訂閱 |

---

## 與 Web 版差異（摘要）

| 能力 | Web（`web/`） | LINE（`app/`） |
|------|---------------|----------------|
| 入口 | 瀏覽器 | LINE 聊天 |
| 部署 | Vercel | Render／GCP |
| 海報 | HTML 下載 | Playwright PNG |
| 圖卡兩段式 | 未移植 | 有 |
| 圖片上傳辨識 | 未移植 | 有 |
| Deep Research | 未移植 | 可選 |
| 資料庫 schema | 共用 Postgres | 共用 |

---

## 測試

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```
