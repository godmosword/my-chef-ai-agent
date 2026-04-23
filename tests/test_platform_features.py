import os
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import billing, routes  # noqa: E402
from app.clients import app  # noqa: E402
from app import clients  # noqa: E402
from app import config  # noqa: E402


@pytest.mark.asyncio
async def test_consume_quota_denies_when_increment_fails(monkeypatch):
    monkeypatch.setattr(
        billing,
        "check_quota",
        AsyncMock(return_value=billing.QuotaDecision(True, "free", 20, 3, 17)),
    )
    monkeypatch.setattr(billing, "increment_daily_usage", AsyncMock(return_value=None))
    monkeypatch.setattr(billing, "append_usage_ledger", AsyncMock())

    result = await billing.consume_quota("U123", tenant_id="default")
    assert result.allowed is False
    assert result.used == 3


def test_callback_returns_503_when_queue_full(monkeypatch):
    monkeypatch.setattr(routes, "_validate_signature", lambda *_: None)
    monkeypatch.setattr(routes, "enqueue_job", AsyncMock(return_value="queue_full"))
    client = TestClient(app)
    payload = {
        "events": [
            {
                "type": "message",
                "replyToken": "token123",
                "source": {"userId": "U123"},
                "message": {"type": "text", "id": "m1", "text": "番茄炒蛋"},
            }
        ]
    }
    response = client.post("/callback", json=payload, headers={"X-Line-Signature": "ok"})
    assert response.status_code == 503


def test_admin_subscription_requires_token_and_updates(monkeypatch):
    monkeypatch.setattr(routes, "ADMIN_API_TOKEN", "secret-token")
    monkeypatch.setattr(routes, "set_user_subscription", AsyncMock())
    monkeypatch.setattr(routes, "get_user_subscription", AsyncMock(return_value=("pro", "active")))
    monkeypatch.setattr(routes, "get_daily_usage", AsyncMock(return_value=5))

    client = TestClient(app)

    blocked = client.get("/admin/subscriptions/U123")
    assert blocked.status_code == 403

    updated = client.put(
        "/admin/subscriptions/U123",
        json={"plan_key": "pro", "status": "active", "tenant_id": "default"},
        headers={"X-Admin-Token": "secret-token"},
    )
    assert updated.status_code == 200

    fetched = client.get("/admin/subscriptions/U123", headers={"X-Admin-Token": "secret-token"})
    assert fetched.status_code == 200
    assert fetched.json()["plan_key"] == "pro"


def test_cost_control_defaults_are_tightened():
    assert config.IMAGE_CACHE_TTL_SEC == 86400
    assert config.MAX_COMPLETION_TOKENS == 1024
    assert config.MAX_HISTORY_TURNS == 2
    assert config.AI_MAX_RETRIES == 1
    assert config.AI_TRANSPORT_MAX_RETRIES == 1
    assert config.AI_CHAT_TIMEOUT_SEC == 18
    assert config.YOUTUBE_SEARCH_TIMEOUT_SEC == 3
    assert config.QUEUE_WORKER_COUNT == 4
    assert config.ENABLE_DEEP_RESEARCH is False


def test_build_ai_client_uses_gemini_openai_compatible_endpoint(monkeypatch):
    calls = []

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(clients, "AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr(clients, "USE_GEMINI_DIRECT", True)
    monkeypatch.setattr(clients, "GEMINI_API_KEY", "gemini-key")
    monkeypatch.setattr(clients, "_mn", "gemini-3.1-flash-lite-preview")

    _client, model = clients._build_ai_client()

    assert model == "gemini-3.1-flash-lite-preview"
    assert calls[0]["api_key"] == "gemini-key"
    assert calls[0]["base_url"] == "https://generativelanguage.googleapis.com/v1beta/openai/"


def test_build_ai_client_uses_openai_for_non_gemini_models(monkeypatch):
    calls = []

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(clients, "AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr(clients, "USE_GEMINI_DIRECT", False)
    monkeypatch.setattr(clients, "OPENAI_API_KEY", "sk-openai")
    monkeypatch.setattr(clients, "MODEL_NAME", "gpt-4.1-mini")

    _client, model = clients._build_ai_client()

    assert model == "gpt-4.1-mini"
    assert calls[0]["api_key"] == "sk-openai"
    assert "base_url" not in calls[0]
