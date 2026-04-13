from __future__ import annotations

import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import ai_service, handlers  # noqa: E402
from app.billing import QuotaDecision  # noqa: E402
from app.helpers import _default_recipe_hero_url  # noqa: E402
from app.models import WebhookMessageEvent  # noqa: E402


@pytest.mark.asyncio
async def test_generate_recipe_image_returns_placeholder_on_failure(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setattr(ai_service, "USE_GEMINI_DIRECT", False)
    mock_images = SimpleNamespace(generate=AsyncMock(side_effect=RuntimeError("boom")))
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=mock_images))

    url = await ai_service.generate_recipe_image("番茄炒蛋")
    assert url == _default_recipe_hero_url("番茄炒蛋", "")


@pytest.mark.asyncio
async def test_generate_recipe_image_uses_placeholder_provider_without_api_calls(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "placeholder")
    mock_generate = AsyncMock()
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=SimpleNamespace(generate=mock_generate)))

    url = await ai_service.generate_recipe_image("番茄炒蛋")
    assert url == _default_recipe_hero_url("番茄炒蛋", "")
    mock_generate.assert_not_called()


@pytest.mark.asyncio
async def test_generate_recipe_image_returns_https_url(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setattr(ai_service, "USE_GEMINI_DIRECT", False)
    response = SimpleNamespace(data=[SimpleNamespace(url="https://cdn.example.com/food.png")])
    mock_images = SimpleNamespace(generate=AsyncMock(return_value=response))
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=mock_images))

    url = await ai_service.generate_recipe_image("牛肉麵")
    assert url == "https://cdn.example.com/food.png"


@pytest.mark.asyncio
async def test_generate_recipe_image_skips_dalle_when_gemini_direct(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setattr(ai_service, "USE_GEMINI_DIRECT", True)
    mock_generate = AsyncMock()
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=SimpleNamespace(generate=mock_generate)))

    url = await ai_service.generate_recipe_image("測試菜")
    assert url == _default_recipe_hero_url("測試菜", "")
    mock_generate.assert_not_called()


@pytest.mark.asyncio
async def test_generate_recipe_image_uses_vertex_provider_when_configured(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "vertex_imagen")
    monkeypatch.setattr(
        ai_service,
        "_generate_recipe_image_with_vertex",
        AsyncMock(return_value="https://storage.googleapis.com/demo-bucket/food.png"),
    )

    url = await ai_service.generate_recipe_image("龍蝦燉飯")
    assert url == "https://storage.googleapis.com/demo-bucket/food.png"


@pytest.mark.asyncio
async def test_generate_recipe_image_vertex_second_call_uses_cache(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_CACHE_TTL_SEC", 300)
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "vertex_imagen")
    vertex_mock = AsyncMock(return_value="https://storage.googleapis.com/demo-bucket/food.png")
    monkeypatch.setattr(ai_service, "_generate_recipe_image_with_vertex", vertex_mock)

    name = "龍蝦燉飯"
    u1 = await ai_service.generate_recipe_image(name)
    u2 = await ai_service.generate_recipe_image(name)
    assert u1 == u2 == "https://storage.googleapis.com/demo-bucket/food.png"
    vertex_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_recipe_image_vertex_falls_back_to_placeholder(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "vertex_imagen")
    monkeypatch.setattr(
        ai_service,
        "_generate_recipe_image_with_vertex",
        AsyncMock(return_value=None),
    )

    url = await ai_service.generate_recipe_image("龍蝦燉飯")
    assert url == _default_recipe_hero_url("龍蝦燉飯", "")


@pytest.mark.asyncio
async def test_generate_recipe_image_with_vertex_returns_none_without_project(monkeypatch):
    monkeypatch.setattr(ai_service, "GCP_PROJECT_ID", None)
    assert await ai_service._generate_recipe_image_with_vertex("任意菜名") is None


@pytest.mark.asyncio
async def test_search_youtube_video_returns_none_without_key(monkeypatch):
    monkeypatch.setattr(ai_service, "YOUTUBE_API_KEY", None)
    assert await ai_service.search_youtube_video("番茄炒蛋") is None


@pytest.mark.asyncio
async def test_search_youtube_video_returns_first_result(monkeypatch):
    monkeypatch.setattr(ai_service, "YOUTUBE_API_KEY", "yt-key")

    class _Resp:
        def raise_for_status(self) -> None:
            return

        def json(self) -> dict:
            return {"items": [{"id": {"videoId": "abc123"}}]}

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *_args, **_kwargs):
            return _Resp()

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda **_kwargs: _Client())
    url = await ai_service.search_youtube_video("番茄炒蛋")
    assert url == "https://www.youtube.com/watch?v=abc123"


@pytest.mark.asyncio
async def test_process_ai_reply_replies_loading_and_spawns_background(monkeypatch):
    event = WebhookMessageEvent(
        reply_token="reply-123",
        user_id="U123",
        text="幫我做番茄炒蛋",
        tenant_id="default",
    )

    monkeypatch.setattr(
        handlers,
        "consume_quota",
        AsyncMock(return_value=QuotaDecision(True, "free", 20, 1, 19)),
    )
    reply_mock = AsyncMock()
    monkeypatch.setattr(handlers, "_reply_line", reply_mock)
    background_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(handlers, "_background_generate_recipe", background_mock)

    import asyncio as _asyncio

    original_create_task = _asyncio.create_task
    created = {}

    def _track_task(coro):
        task = original_create_task(coro)
        created["task"] = task
        return task

    monkeypatch.setattr(handlers.asyncio, "create_task", _track_task)

    await handlers.process_ai_reply(event)
    await _asyncio.sleep(0)

    assert reply_mock.await_count == 1
    _reply_token, msg = reply_mock.await_args.args[:2]
    assert _reply_token == "reply-123"
    assert "請稍候片刻" in msg.text
    background_mock.assert_awaited_once_with(
        user_id="U123",
        tenant_id="default",
        user_message="幫我做番茄炒蛋",
    )
    assert "task" in created


@pytest.mark.asyncio
async def test_background_generate_recipe_skips_when_missing_user_id(monkeypatch):
    push_mock = AsyncMock()
    monkeypatch.setattr(handlers, "_push_line_message", push_mock)

    await handlers._background_generate_recipe(
        user_id="",
        tenant_id="default",
        user_message="test",
    )
    push_mock.assert_not_called()
