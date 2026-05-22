from __future__ import annotations

import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import media_storage, recipe_hero_media  # noqa: E402


@pytest.mark.asyncio
async def test_store_recipe_png_memory_roundtrip(monkeypatch):
    recipe_hero_media.clear_recipe_hero_media_for_tests()
    monkeypatch.setattr(recipe_hero_media, "PUBLIC_APP_BASE_URL", "https://app.example.com")
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_STORAGE_BACKEND", "memory")
    out = await media_storage.store_recipe_png(payload=b"\x89PNG\r\n\x1a\nabc", purpose="hero")
    assert out is not None
    assert out.url.startswith("https://app.example.com/media/recipe-hero/")


@pytest.mark.asyncio
async def test_store_recipe_png_gcs_missing_bucket_falls_back_memory(monkeypatch):
    recipe_hero_media.clear_recipe_hero_media_for_tests()
    monkeypatch.setattr(recipe_hero_media, "PUBLIC_APP_BASE_URL", "https://app.example.com")
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_STORAGE_BACKEND", "gcs")
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_GCS_BUCKET", "")
    out = await media_storage.store_recipe_png(payload=b"\x89PNG\r\n\x1a\nabc", purpose="hero")
    assert out is not None
    assert out.backend == "memory"


@pytest.mark.asyncio
async def test_store_recipe_png_gcs_success(monkeypatch):
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_STORAGE_BACKEND", "gcs")
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_GCS_BUCKET", "demo-bucket")
    monkeypatch.setattr(media_storage, "_upload_to_gcs_sync", lambda **_kwargs: "https://storage.googleapis.com/demo-bucket/a.png")
    out = await media_storage.store_recipe_png(payload=b"\x89PNG\r\n\x1a\nabc", purpose="hero")
    assert out is not None
    assert out.backend == "gcs"
    assert out.url == "https://storage.googleapis.com/demo-bucket/a.png"


@pytest.mark.asyncio
async def test_store_recipe_png_gcs_error_falls_back(monkeypatch):
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_STORAGE_BACKEND", "gcs")
    monkeypatch.setattr(media_storage, "RECIPE_IMAGE_GCS_BUCKET", "demo-bucket")
    monkeypatch.setattr(media_storage, "_upload_to_gcs_sync", lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("down")))
    monkeypatch.setattr(media_storage, "register_recipe_hero_png", AsyncMock(return_value="https://app.example.com/media/recipe-hero/t"))

    out = await media_storage.store_recipe_png(payload=b"\x89PNG\r\n\x1a\nabc", purpose="hero")
    assert out is not None
    assert out.backend == "memory"
