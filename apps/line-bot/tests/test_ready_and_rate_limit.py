"""Tests for /ready and HTTP rate limiting."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app.clients import app  # noqa: E402


def test_ready_ok_when_no_database_configured(monkeypatch):
    """Isolate from developer .env that may set DATABASE_URL."""
    monkeypatch.setattr("app.routes.DATABASE_URL", None)
    monkeypatch.setattr("app.db.DATABASE_URL", None)

    client = TestClient(app)
    r = client.get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body.get("ready") is True
    assert body.get("checks", {}).get("database") == "skipped_not_configured"


def test_public_rate_limit_returns_429(monkeypatch):
    from app import rate_limit

    rate_limit._timestamps.clear()
    monkeypatch.setattr("app.rate_limit.RATE_LIMIT_PUBLIC_PER_MINUTE", 2)
    client = TestClient(app)
    for i in range(2):
        r = client.get("/legal/disclaimer")
        assert r.status_code == 200, f"iteration {i}"
    r = client.get("/legal/disclaimer")
    assert r.status_code == 429


def test_metrics_returns_503_when_token_not_configured(monkeypatch):
    monkeypatch.setattr("app.routes.METRICS_TOKEN", None)
    client = TestClient(app)
    r = client.get("/metrics")
    assert r.status_code == 503


def test_metrics_returns_403_when_token_wrong(monkeypatch):
    monkeypatch.setattr("app.routes.METRICS_TOKEN", "expected-metrics-token")
    client = TestClient(app)
    r = client.get("/metrics", headers={"X-Metrics-Token": "wrong"})
    assert r.status_code == 403


def test_metrics_returns_200_when_token_matches(monkeypatch):
    monkeypatch.setattr("app.routes.METRICS_TOKEN", "expected-metrics-token")
    client = TestClient(app)
    r = client.get("/metrics", headers={"X-Metrics-Token": "expected-metrics-token"})
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_callback_user_rate_limit_returns_429(monkeypatch):
    from app import rate_limit, routes

    rate_limit._timestamps.clear()
    monkeypatch.setattr("app.rate_limit.RATE_LIMIT_USER_PER_MINUTE", 1)
    monkeypatch.setattr("app.rate_limit.RATE_LIMIT_USER_BURST", 0)
    monkeypatch.setattr(routes, "_validate_signature", lambda *_: None)

    async def _ok_enqueue(_job):
        return "text"

    monkeypatch.setattr(routes, "enqueue_job", _ok_enqueue)
    client = TestClient(app)
    payload = {
        "events": [
            {
                "type": "message",
                "replyToken": "token123",
                "source": {"userId": "Urate"},
                "message": {"type": "text", "id": "m1", "text": "番茄炒蛋"},
            }
        ]
    }
    r1 = client.post("/callback", json=payload, headers={"X-Line-Signature": "ok", "X-Tenant-ID": "t1"})
    assert r1.status_code == 200
    r2 = client.post("/callback", json=payload, headers={"X-Line-Signature": "ok", "X-Tenant-ID": "t1"})
    assert r2.status_code == 429
