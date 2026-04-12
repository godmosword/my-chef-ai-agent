"""Shared clients: FastAPI, Supabase, AI (OpenAI-compatible), LINE."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from linebot.v3.messaging import Configuration
from openai import AsyncOpenAI
from supabase import create_client, Client

from app.config import (
    LINE_CHANNEL_ACCESS_TOKEN,
    DATABASE_URL,
    SUPABASE_URL,
    SUPABASE_KEY,
    USE_GEMINI_DIRECT,
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    MODEL_NAME,
    logger,
    _mn,
)
from app.job_queue import start_queue_workers, stop_queue_workers

# ─── FastAPI ────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(_: FastAPI):
    await start_queue_workers()
    yield
    await stop_queue_workers()


app = FastAPI(title="米其林職人大腦", version="2.0.0", lifespan=_lifespan)

# ─── Supabase（僅在未設定 DATABASE_URL 時啟用；Render Postgres 請用 DATABASE_URL）──

supabase: Client | None = None
if DATABASE_URL:
    logger.info("DATABASE_URL is set; app data uses PostgreSQL (Supabase client not used).")
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase connected successfully.")
    except Exception as exc:
        logger.warning("Supabase init failed: %s", exc)

# ─── LINE ───────────────────────────────────────────────────────────────────────

line_configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)

# ─── AI (OpenAI-compatible) ─────────────────────────────────────────────────────

if USE_GEMINI_DIRECT:
    ai_client = AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=GEMINI_API_KEY,
        max_retries=1,
    )
    AI_MODEL_FOR_CALL = _mn
else:
    ai_client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
        default_headers={"HTTP-Referer": "https://run.app", "X-Title": "My Chef AI Agent"},
        max_retries=1,
    )
    AI_MODEL_FOR_CALL = MODEL_NAME
