import os
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import billing, routes  # noqa: E402
from app.clients import app  # noqa: E402


@pytest.mark.asyncio
async def test_consume_quota_denies_when_increment_fails(monkeypatch):
    monkeypatch.setattr(billing, "DATABASE_URL", "")
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
