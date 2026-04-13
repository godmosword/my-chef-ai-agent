"""Shared clients: FastAPI, AI (OpenAI-compatible), LINE."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from linebot.v3.messaging import Configuration
from openai import AsyncOpenAI

from app.config import (
    LINE_CHANNEL_ACCESS_TOKEN,
    USE_GEMINI_DIRECT,
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    MODEL_NAME,
    logger,
    _mn,
)
from app.job_queue import start_queue_workers, stop_queue_workers
from app.telemetry import setup_otel

# ─── FastAPI ────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(_: FastAPI):
    await start_queue_workers()
    yield
    await stop_queue_workers()


app = FastAPI(title="米其林職人大腦", version="2.0.0", lifespan=_lifespan)
setup_otel(app)

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
