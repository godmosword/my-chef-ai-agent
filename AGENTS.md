# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**職人料理大腦**（Chef AI Brain）現行產品為 **`web/`**（Next.js on Vercel）：瀏覽器聊天、食譜卡、Neon 記憶／收藏／配額。見 [`web/README.md`](web/README.md)。

**封存路徑**：`main.py` + `app/` 為歷史 **LINE Bot + FastAPI**（Render／GCP webhook）。新功能預設只改 `web/`；Python 路徑見 [`docs/LEGACY_LINE_BOT.md`](docs/LEGACY_LINE_BOT.md)。

### Running the Web dev server（現行）

```bash
cd web && cp .env.example .env.local  # GEMINI_API_KEY
npm install && npm run dev
```

- 首頁聊天：`http://localhost:3000`
- 健康檢查：`GET /api/health`
- Vercel：**Root Directory = `web`**；只需手動設 `GEMINI_API_KEY`（`MODEL_NAME` 等有預設）

### Running the legacy LINE server（封存）

僅在維護舊 LINE 部署時需要。匯入時需 `LINE_CHANNEL_*` 與 `GEMINI_API_KEY`：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m uvicorn main:app --reload --port 8000
```

Webhook：`POST /callback`。其餘見 [`docs/LEGACY_LINE_BOT.md`](docs/LEGACY_LINE_BOT.md)。

### Running tests

```bash
python3 -m pytest tests/ -v
```

目前：`python3 -m pytest tests/ -v` 共 **140** 則收集；有可用 `DATABASE_URL`（Postgres）時應 **140 passed**（含 `tests/integration/`）。模組匯入時需要環境變數；若本機未設 `.env`，可於指令前加上：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
METRICS_TOKEN=test_metrics_token \
  python3 -m pytest tests/ -v
```

### External services (all optional for local dev)

| Service | Required env vars | Notes |
|---------|-------------------|-------|
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Dummy values work for server startup; real values needed for webhook replies |
| Google Gemini AI | `GEMINI_API_KEY` | Required for AI recipe generation |
| OpenAI API | `OPENAI_API_KEY` | Optional; used when `MODEL_NAME` is switched away from `gemini-*` |
| YouTube Data API | `YOUTUBE_API_KEY` | Optional; enables recipe tutorial video lookup |
| Vertex AI Imagen | `IMAGE_PROVIDER=vertex_imagen`, `GCP_PROJECT_ID`（+ `VERTEX_*`、`GCS_SIGNED_URL_TTL_SEC` 預設 3600 以利私桶 `gs://`）；`RECIPE_FALLBACK_HERO_IMAGE_URL` 可自訂無主圖時的 https 備援 | 可選；失敗時仍會用備援圖或色塊標題（見 `README`） |
| Render Postgres | `DATABASE_URL` | Optional; when set, memory/favorites use Postgres (see `docs/RENDER_POSTGRES.md`) |

### Hello world testing (webhook simulation)

Since this is a LINE Bot, end-to-end testing requires real LINE webhook events (via ngrok). For local validation without ngrok, simulate a webhook with a valid HMAC-SHA256 signature:

```python
import hmac, hashlib, base64, json, os, urllib.request
secret = os.environ['LINE_CHANNEL_SECRET']
body = json.dumps({
    'events': [{'type':'message','replyToken':'0000000000000000000000000000dead',
                'source':{'userId':'Utest'},'message':{'type':'text','text':'番茄炒蛋'}}]
}).encode()
sig = base64.b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).decode()
req = urllib.request.Request('http://localhost:8000/callback', data=body,
    headers={'Content-Type':'application/json','X-Line-Signature': sig})
print(urllib.request.urlopen(req).read())
```

The webhook will return `"OK"`. A **queue worker** will call Gemini AI and generate a Flex Message, but the LINE reply will fail with "Invalid reply token" (expected with synthetic tokens). Check server logs for the `AI user=... elapsed=... tokens=...` line to confirm AI integration works.

### Plan／里程碑收尾（必做）

每完成一個工程計畫或較大里程碑（**不論是否另存 plan 檔**），**同一批變更**內應同步更新：

1. **`TODOS.md`**：已交付者勾除或改寫；新發現的缺口補上條目。
2. **`CHANGELOG.md`**：依使用者／部署／營運視角寫摘要（新行為、環境變數、風險、相容性）。
3. **`README.md`**：功能表、環境變數表、測試數量、專案結構等與現況不一致處一併對齊。

避免只改程式而文件仍描述舊架構。對外貢獻的精簡版見根目錄 **`CONTRIBUTING.md`**；Cursor 內建提醒見 **`.cursor/rules/plan-ship-docs.mdc`**。

### Git／部署流程（維護者／Agent 必遵守）

- **所有改動完成後：直接在 `main` 上 commit 並 `git push origin main`。不要開 PR、不要只 push 到 `cursor/*` feature branch 就結束。**
- **不要**為交付開新 branch 再等合併；若誤在 branch 上工作，合併或 cherry-pick 到 `main` 後立刻 push，並刪除多餘遠端 branch（可選）。
- 建議流程：`git checkout main` → `git pull origin main` → 修改 → 測試 → `git commit` → `git push origin main`（CI 監聽 `main` 跑測試並部署）。
- Cloud Agent／本機 Agent 皆同：收尾時確保 `origin/main` 含本次變更，**勿**建立或更新 Draft PR 作為主要出貨方式。
- 直推 `main` 會跳過 GitHub PR 審查；若 branch protection 禁止直推，須在 GitHub 允許維護者推 `main`。

### Gotchas

- Environment variables are validated at **module import time** (not at request time). If they're missing, the app crashes immediately on startup.
- `python-dotenv`：`app/config.py` 會 `load_dotenv()`。可 `cp .env.example .env` 後填值，或直接在 shell 設定環境變數。
- `IMAGE_PROVIDER=vertex_imagen` 時需可用 GCP 憑證（`VERTEX_SERVICE_ACCOUNT_JSON`、`GOOGLE_APPLICATION_CREDENTIALS_JSON` 寫暫存檔，或 `GOOGLE_APPLICATION_CREDENTIALS` / ADC）；缺失時會回退佔位圖。
- The `pytest` binary may not be on PATH; use `python3 -m pytest` instead.
- When killing the dev server, also kill child processes (reloader + server worker). Use `lsof -ti:8000` to find all PIDs on the port.
- AI `chat.completions` 對 **429／逾時／連線錯誤** 會在 `app/ai_service.py` 內做指數退避重試（`AI_TRANSPORT_MAX_RETRIES` 等），並寫入 metrics：`ai.completion.errors.rate_limit_total`、`timeout_total`、`connection_total`。
