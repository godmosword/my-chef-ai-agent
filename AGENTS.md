# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a modular Python FastAPI LINE Bot called **米其林職人大腦** (Michelin Chef AI Brain).
`main.py` 是薄入口，核心邏輯在 `app/`：`routes`（webhook／健康檢查）、`handlers`（文字／圖片／postback）、`ai_service`（食譜與圖片辨識）、`db`（**Render Postgres**，可優雅降級）。

預設以 Gemini 系列走 OpenAI 相容端點；亦可依 `MODEL_NAME` 改走 OpenRouter。

### Running the dev server

The app requires three environment variables at module import time. For local dev without real credentials:

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m uvicorn main:app --reload --port 8000
```

Health check: `GET /` returns `{"status":"ok","message":"..."}` (liveness，不檢查外部依賴)。

Readiness: `GET /ready` 在已設定 `DATABASE_URL` 時會做輕量 DB ping；失敗回 **503**（見 `docs/SCHEMA_MIGRATIONS.md`）。

Webhook endpoint: `POST /callback` (requires valid `X-Line-Signature` header). 對外 `POST /callback`、`GET /billing/checkout`、`GET /legal/*` 有每 IP 每分鐘速率限制（`RATE_LIMIT_*`，0 關閉）。

### Running tests

```bash
python3 -m pytest tests/ -v
```

目前：`python3 -m pytest tests/ -v` 共 **65** 則收集；有可用 `DATABASE_URL`（Postgres）時應 **65 passed**，未設定時 `tests/integration/` 兩則 **skip**、其餘 **63 passed**。模組匯入時需要環境變數；若本機未設 `.env`，可於指令前加上：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m pytest tests/ -v
```

### External services (all optional for local dev)

| Service | Required env vars | Notes |
|---------|-------------------|-------|
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Dummy values work for server startup; real values needed for webhook replies |
| Google Gemini AI | `GEMINI_API_KEY` | Required for AI recipe generation |
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

### Git／部署流程（維護者偏好）

- **之後若要觸發 deploy：請直接 commit／push 到 `main`，不要為此另開 PR。**
- 建議流程：`git checkout main` → `git pull origin main` → 修改 → `git commit` → `git push origin main`（或由 CI 監聽 `main` 自動部署）。
- 直接推 `main` 會跳過 PR 審查；若需保留審查，可改回 feature branch + PR 模式。

### Gotchas

- Environment variables are validated at **module import time** (not at request time). If they're missing, the app crashes immediately on startup.
- `python-dotenv`：`app/config.py` 會 `load_dotenv()`。可 `cp .env.example .env` 後填值，或直接在 shell 設定環境變數。
- `IMAGE_PROVIDER=vertex_imagen` 時需可用 GCP 憑證（`VERTEX_SERVICE_ACCOUNT_JSON`、`GOOGLE_APPLICATION_CREDENTIALS_JSON` 寫暫存檔，或 `GOOGLE_APPLICATION_CREDENTIALS` / ADC）；缺失時會回退佔位圖。
- The `pytest` binary may not be on PATH; use `python3 -m pytest` instead.
- When killing the dev server, also kill child processes (reloader + server worker). Use `lsof -ti:8000` to find all PIDs on the port.
- AI `chat.completions` 對 **429／逾時／連線錯誤** 會在 `app/ai_service.py` 內做指數退避重試（`AI_TRANSPORT_MAX_RETRIES` 等），並寫入 metrics：`ai.completion.errors.rate_limit_total`、`timeout_total`、`connection_total`。
