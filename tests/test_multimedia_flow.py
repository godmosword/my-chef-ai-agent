from __future__ import annotations

import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import ai_service, config, handlers, recipe_hero_media  # noqa: E402
from app.clients import app  # noqa: E402
from app.billing import QuotaDecision  # noqa: E402
from app.models import WebhookMessageEvent  # noqa: E402
from app.models import WebhookPostbackEvent  # noqa: E402


@pytest.mark.asyncio
async def test_generate_recipe_image_returns_placeholder_on_failure(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setattr(ai_service, "USE_GEMINI_DIRECT", False)
    mock_images = SimpleNamespace(generate=AsyncMock(side_effect=RuntimeError("boom")))
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=mock_images))

    url = await ai_service.generate_recipe_image("番茄炒蛋")
    assert url == config.RECIPE_FALLBACK_HERO_IMAGE_URL
    assert url.startswith("https://")


@pytest.mark.asyncio
async def test_generate_recipe_image_uses_placeholder_provider_without_api_calls(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "placeholder")
    mock_generate = AsyncMock()
    monkeypatch.setattr(ai_service, "ai_client", SimpleNamespace(images=SimpleNamespace(generate=mock_generate)))

    url = await ai_service.generate_recipe_image("番茄炒蛋")
    assert url == config.RECIPE_FALLBACK_HERO_IMAGE_URL
    assert url.startswith("https://")
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
    assert url == config.RECIPE_FALLBACK_HERO_IMAGE_URL
    assert url.startswith("https://")
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
    assert url == config.RECIPE_FALLBACK_HERO_IMAGE_URL
    assert url.startswith("https://")


@pytest.mark.asyncio
async def test_generate_recipe_image_with_vertex_returns_none_without_project(monkeypatch):
    monkeypatch.setattr(ai_service, "GCP_PROJECT_ID", None)
    assert await ai_service._generate_recipe_image_with_vertex("任意菜名") is None


@pytest.mark.asyncio
async def test_register_recipe_hero_png_roundtrip(monkeypatch):
    monkeypatch.setattr(recipe_hero_media, "PUBLIC_APP_BASE_URL", "https://cdn.example.com")
    recipe_hero_media.clear_recipe_hero_media_for_tests()
    png = b"\x89PNG\r\n\x1a\n" + b"x" * 8
    url = await recipe_hero_media.register_recipe_hero_png(png)
    assert url.startswith("https://cdn.example.com/media/recipe-hero/")
    token = url.rsplit("/", 1)[-1]
    data, status = await recipe_hero_media.get_recipe_hero_png(token)
    assert status == 200
    assert data == png
    recipe_hero_media.clear_recipe_hero_media_for_tests()


def test_media_recipe_hero_http_404():
    client = TestClient(app)
    assert client.get("/media/recipe-hero/not-a-real-token").status_code == 404


@pytest.mark.asyncio
async def test_generate_recipe_image_vertex_inline_bytes_uses_media_url(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_CACHE_TTL_SEC", 300)
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "vertex_imagen")
    monkeypatch.setattr(ai_service, "GCP_PROJECT_ID", "demo-proj")
    monkeypatch.setattr(recipe_hero_media, "PUBLIC_APP_BASE_URL", "https://app.example.com")
    recipe_hero_media.clear_recipe_hero_media_for_tests()
    monkeypatch.setattr(
        ai_service,
        "vertex_imagen_generate_sync",
        lambda _name: b"\x89PNG\r\n\x1a\nfake",
    )

    url = await ai_service.generate_recipe_image("測試圖")
    assert url.startswith("https://app.example.com/media/recipe-hero/")
    client = TestClient(app)
    token = url.rsplit("/", 1)[-1]
    r = client.get(f"/media/recipe-hero/{token}")
    assert r.status_code == 200
    assert r.content.startswith(b"\x89PNG")
    recipe_hero_media.clear_recipe_hero_media_for_tests()


@pytest.mark.asyncio
async def test_generate_recipe_image_vertex_bytes_falls_back_without_public_base(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_CACHE_TTL_SEC", 300)
    monkeypatch.setattr(ai_service, "IMAGE_PROVIDER", "vertex_imagen")
    monkeypatch.setattr(ai_service, "GCP_PROJECT_ID", "demo-proj")
    monkeypatch.setattr(recipe_hero_media, "PUBLIC_APP_BASE_URL", "")
    recipe_hero_media.clear_recipe_hero_media_for_tests()
    monkeypatch.setattr(
        ai_service,
        "vertex_imagen_generate_sync",
        lambda _name: b"\x89PNG\r\n\x1a\nonly-bytes",
    )

    url = await ai_service.generate_recipe_image("無公開網址")
    assert url == config.RECIPE_FALLBACK_HERO_IMAGE_URL
    recipe_hero_media.clear_recipe_hero_media_for_tests()


@pytest.mark.asyncio
async def test_resolve_public_image_url_uses_cdn_base(monkeypatch):
    monkeypatch.setattr(ai_service, "IMAGE_PUBLIC_BASE_URL", "https://cdn.example.com/images")
    monkeypatch.setattr(ai_service, "GCS_SIGNED_URL_TTL_SEC", 0)
    out = await ai_service._resolve_public_image_url("gs://bucket-a/folder/food image.png")
    assert out == "https://cdn.example.com/images/bucket-a/folder/food%20image.png"


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
        "app.handlers_commands.consume_quota",
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

    monkeypatch.setattr("app.handlers_commands.asyncio.create_task", _track_task)

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
        quota_remaining=19,
        quota_limit=20,
        quota_plan_key="free",
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


@pytest.mark.asyncio
async def test_background_generate_recipe_warns_when_quota_low(monkeypatch):
    monkeypatch.setattr("app.handlers_recipe_flow.QUOTA_WARN_THRESHOLD", 3)
    monkeypatch.setattr(
        "app.handlers_recipe_flow._fetch_ai_context",
        AsyncMock(return_value=([], [], "不拘", None)),
    )
    monkeypatch.setattr(
        "app.handlers_recipe_flow.call_ai_with_retry",
        AsyncMock(return_value=(
            '{"recipe_name":"番茄炒蛋","kitchen_talk":[],"theme":"家常","ingredients":[],"steps":["a","b"],"shopping_list":[],"estimated_total_cost":"88"}',
            {
                "recipe_name": "番茄炒蛋",
                "kitchen_talk": [],
                "theme": "家常",
                "ingredients": [],
                "steps": ["a", "b"],
                "shopping_list": [],
                "estimated_total_cost": "88",
            },
        )),
    )
    monkeypatch.setattr("app.handlers_recipe_flow.save_user_memory", AsyncMock())
    monkeypatch.setattr("app.handlers_recipe_flow.generate_recipe_image", AsyncMock(return_value=""))
    monkeypatch.setattr("app.handlers_recipe_flow.search_youtube_video", AsyncMock(return_value=None))

    pushed = []

    async def _push(_user_id, msg):
        pushed.append(msg)

    monkeypatch.setattr(handlers, "_push_line_message", _push)

    await handlers._background_generate_recipe(
        user_id="U123",
        tenant_id="default",
        user_message="幫我做番茄炒蛋",
        quota_remaining=2,
        quota_limit=20,
        quota_plan_key="free",
    )
    assert len(pushed) == 2
    assert "剩餘額度約 2/20 次" in pushed[1].text


@pytest.mark.asyncio
async def test_postback_expand_steps_returns_full_steps_text(monkeypatch):
    monkeypatch.setattr(
        handlers,
        "_get_last_recipe_json",
        AsyncMock(return_value={"recipe_name": "番茄炒蛋", "steps": ["切番茄", "炒蛋", "拌炒"]}),
    )
    reply_mock = AsyncMock()
    monkeypatch.setattr(handlers, "_reply_line", reply_mock)

    event = WebhookPostbackEvent(
        reply_token="r1",
        user_id="U123",
        data="action=expand_steps&name=%E7%95%AA%E8%8C%84%E7%82%92%E8%9B%8B",
        tenant_id="default",
    )
    await handlers.process_postback_reply(event)

    assert reply_mock.await_count == 1
    _token, message = reply_mock.await_args.args[:2]
    assert _token == "r1"
    assert "完整步驟" in message.text
    assert "1. 切番茄" in message.text
