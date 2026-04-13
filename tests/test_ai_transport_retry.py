"""Tests for AI chat completion transport retries."""
from __future__ import annotations

import os
from unittest.mock import MagicMock

import pytest
from openai import RateLimitError

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import ai_service  # noqa: E402


@pytest.mark.asyncio
async def test_chat_completions_resilient_retries_then_succeeds(monkeypatch):
    monkeypatch.setattr(ai_service, "AI_TRANSPORT_MAX_RETRIES", 2)
    monkeypatch.setattr(ai_service, "AI_TRANSPORT_BASE_DELAY_SEC", 0.01)

    msg = MagicMock()
    msg.content = '{"a":1}'
    msg.strip = MagicMock(return_value='{"a":1}')
    ok_response = MagicMock(choices=[MagicMock(message=msg)], usage=None)

    calls = {"n": 0}

    async def fake_create(**_kwargs):
        calls["n"] += 1
        if calls["n"] < 2:
            raise RateLimitError("429", response=MagicMock(status_code=429), body=None)
        return ok_response

    monkeypatch.setattr(ai_service.ai_client.chat.completions, "create", fake_create)

    out = await ai_service._chat_completions_create_resilient(
        user_id="U1",
        model="gemini-test",
        messages=[{"role": "user", "content": "hi"}],
        temperature=0.1,
        max_tokens=10,
        timeout=5.0,
    )
    assert out is ok_response
    assert calls["n"] == 2
