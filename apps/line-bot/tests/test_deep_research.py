from __future__ import annotations

import os

import pytest

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import deep_research  # noqa: E402


def test_build_research_prompt_mentions_required_dimensions():
    prompt = deep_research._build_research_prompt("番茄炒蛋")
    assert "黃金比例" in prompt
    assert "烹飪化學與食安" in prompt
    assert "台灣當地市場近期食材時價與季節性" in prompt
    assert "番茄炒蛋" in prompt


@pytest.mark.asyncio
async def test_perform_recipe_deep_research_returns_empty_string_without_intent():
    assert await deep_research.perform_recipe_deep_research("") == ""


@pytest.mark.asyncio
async def test_perform_recipe_deep_research_skips_placeholder_api_key(monkeypatch):
    monkeypatch.setattr(deep_research, "ENABLE_DEEP_RESEARCH", True)
    monkeypatch.setattr(deep_research, "_deep_research_api_key", lambda: "test_key")
    sync_mock_called = False

    def _unexpected_sync(*_args, **_kwargs):
        nonlocal sync_mock_called
        sync_mock_called = True
        return "should not happen"

    monkeypatch.setattr(deep_research, "_perform_recipe_deep_research_sync", _unexpected_sync)

    assert await deep_research.perform_recipe_deep_research("三杯雞") == ""
    assert sync_mock_called is False


@pytest.mark.asyncio
async def test_perform_recipe_deep_research_returns_empty_string_on_failure(monkeypatch):
    monkeypatch.setattr(deep_research, "ENABLE_DEEP_RESEARCH", True)
    monkeypatch.setattr(deep_research, "_deep_research_api_key", lambda: "test_key")
    monkeypatch.setattr(deep_research, "_is_placeholder_api_key", lambda _key: False)
    monkeypatch.setattr(
        deep_research,
        "_perform_recipe_deep_research_sync",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("boom")),
    )

    report = await deep_research.perform_recipe_deep_research("三杯雞")
    assert report == ""


@pytest.mark.asyncio
async def test_perform_recipe_deep_research_returns_report(monkeypatch):
    monkeypatch.setattr(deep_research, "ENABLE_DEEP_RESEARCH", True)
    monkeypatch.setattr(deep_research, "_deep_research_api_key", lambda: "test_key")
    monkeypatch.setattr(deep_research, "_is_placeholder_api_key", lambda _key: False)
    monkeypatch.setattr(
        deep_research,
        "_perform_recipe_deep_research_sync",
        lambda *_args, **_kwargs: "重點結論：雞腿肉 600g 對九層塔 30g。",
    )

    report = await deep_research.perform_recipe_deep_research("三杯雞")
    assert "雞腿肉 600g" in report


@pytest.mark.asyncio
async def test_perform_recipe_deep_research_skips_when_disabled(monkeypatch):
    monkeypatch.setattr(deep_research, "ENABLE_DEEP_RESEARCH", False)
    sync_mock_called = False

    def _unexpected_sync(*_args, **_kwargs):
        nonlocal sync_mock_called
        sync_mock_called = True
        return "should not happen"

    monkeypatch.setattr(deep_research, "_perform_recipe_deep_research_sync", _unexpected_sync)

    assert await deep_research.perform_recipe_deep_research("三杯雞") == ""
    assert sync_mock_called is False
