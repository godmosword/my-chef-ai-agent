# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a modular Python FastAPI LINE Bot called **米其林職人大腦** (Michelin Chef AI Brain).
`main.py` 是薄入口，核心邏輯在 `app/`：`routes`（webhook／健康檢查）、`handlers`（文字／圖片／postback）、`ai_service`（食譜與圖片辨識）、`db`（**Render Postgres** 或 **Supabase**，可優雅降級）。

預設以 Gemini 系列走 OpenAI 相容端點；亦可依 `MODEL_NAME` 改走 OpenRouter。

### Running the dev server

The app requires three environment variables at module import time. For local dev without real credentials:

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m uvicorn main:app --reload --port 8000
```

Health check: `GET /` returns `{"status":"ok","message":"..."}`.

Webhook endpoint: `POST /callback` (requires valid `X-Line-Signature` header).

### Running tests

```bash
python3 -m pytest tests/ -v
```

目前：`python3 -m pytest tests/ -v` 通過 **35/35**。模組匯入時需要環境變數；若本機未設 `.env`，可於指令前加上：

```bash
LINE_CHANNEL_ACCESS_TOKEN=test_token LINE_CHANNEL_SECRET=test_secret GEMINI_API_KEY=test_key \
  python3 -m pytest tests/ -v
```

### External services (all optional for local dev)

| Service | Required env vars | Notes |
|---------|-------------------|-------|
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Dummy values work for server startup; real values needed for webhook replies |
| Google Gemini AI | `GEMINI_API_KEY` | Required for AI recipe generation |
| Render Postgres | `DATABASE_URL` | Optional; when set, memory/favorites use Postgres (see `docs/RENDER_POSTGRES.md`) |
| Supabase | `SUPABASE_URL`, `SUPABASE_KEY` | Optional if `DATABASE_URL` unset; app degrades gracefully without either |

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

### Gotchas

- Environment variables are validated at **module import time** (not at request time). If they're missing, the app crashes immediately on startup.
- `python-dotenv`：`app/config.py` 會 `load_dotenv()`。可 `cp .env.example .env` 後填值，或直接在 shell 設定環境變數。
- The `pytest` binary may not be on PATH; use `python3 -m pytest` instead.
- When killing the dev server, also kill child processes (reloader + server worker). Use `lsof -ti:8000` to find all PIDs on the port.
