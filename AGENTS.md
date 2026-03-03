# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a single-file Python FastAPI LINE Bot called **米其林職人大腦** (Michelin Chef AI Brain). It uses Gemini 3.1 Pro to generate structured recipe cards in LINE Flex Message format. The entire application lives in `main.py`.

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

Note: `test_get_empty_memory_returns_empty_list_when_no_supabase` fails (pre-existing issue — async function called synchronously). 28/29 tests pass.

### External services (all optional for local dev)

| Service | Required env vars | Notes |
|---------|-------------------|-------|
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Dummy values work for server startup; real values needed for webhook replies |
| Google Gemini AI | `GEMINI_API_KEY` | Required for AI recipe generation |
| Supabase | `SUPABASE_URL`, `SUPABASE_KEY` | Optional; app degrades gracefully without it |

### Gotchas

- Environment variables are validated at **module import time** (not at request time). If they're missing, the app crashes immediately on startup.
- There is no `.env` auto-loading (no `python-dotenv`). Set env vars directly or use `cp .env.example .env` and export them.
- The `pytest` binary may not be on PATH; use `python3 -m pytest` instead.
