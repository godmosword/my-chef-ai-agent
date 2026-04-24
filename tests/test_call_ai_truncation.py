"""Tests for completion truncation recovery and MAX_COMPLETION_TOKENS wiring."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from app import ai_service


@pytest.mark.asyncio
async def test_call_ai_with_retry_uses_max_completion_tokens(monkeypatch):
    captured: dict = {}

    async def fake_chat(*, max_tokens, **kwargs):
        captured["max_tokens"] = max_tokens
        payload = (
            '{"kitchen_talk":[],"theme":"x","recipe_name":"T","ingredients":[],"steps":["a"],'
            '"shopping_list":[],"estimated_total_cost":"0"}'
        )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=payload), finish_reason="stop")],
            usage=SimpleNamespace(prompt_tokens=10, completion_tokens=20),
        )

    monkeypatch.setattr(ai_service, "_chat_completions_create_resilient", fake_chat)
    monkeypatch.setattr(ai_service, "MAX_COMPLETION_TOKENS", 896)
    messages = [{"role": "user", "content": "hi"}]
    raw, data = await ai_service.call_ai_with_retry(messages, user_id="U1")
    assert captured["max_tokens"] == 896
    assert data.get("recipe_name") == "T"
    assert "T" in raw


@pytest.mark.asyncio
async def test_call_ai_with_retry_truncation_recovery_prompt(monkeypatch):
    """After invalid JSON with finish_reason=length, recovery user message is sent on next attempt."""
    second_messages: list | None = None
    call_n = 0

    async def fake_chat(*, messages, **kwargs):
        nonlocal second_messages, call_n
        call_n += 1
        if call_n == 1:
            bad = '{"recipe_name":"截斷測試","kitchen_talk":[],"theme":"","ingredients":['
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=bad), finish_reason="length")],
                usage=None,
            )
        second_messages = list(messages)
        ok = (
            '{"kitchen_talk":[],"theme":"家常","recipe_name":"截斷測試","ingredients":[],"steps":["x"],'
            '"shopping_list":[],"estimated_total_cost":"99"}'
        )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=ok), finish_reason="stop")],
            usage=None,
        )

    monkeypatch.setattr(ai_service, "_chat_completions_create_resilient", fake_chat)
    monkeypatch.setattr(ai_service, "AI_MAX_RETRIES", 1)
    messages = [{"role": "user", "content": "請給食譜"}]
    raw, data = await ai_service.call_ai_with_retry(messages, user_id="U_trunc")
    assert second_messages is not None
    joined = "\n".join(m.get("content", "") for m in second_messages)
    assert ai_service.AI_TRUNCATION_RECOVERY_PROMPT in joined
    assert data.get("recipe_name") == "截斷測試"
    assert "99" in raw
