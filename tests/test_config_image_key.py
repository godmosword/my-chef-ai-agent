"""Tests for resolve_openai_image_api_key (image APIs vs Gemini chat routing)."""
from __future__ import annotations


def test_resolve_openai_image_api_key_prefers_image_dedicated_key(monkeypatch) -> None:
    monkeypatch.setenv("IMAGE_OPENAI_API_KEY", "img-only-key")
    monkeypatch.setenv("OPENAI_API_KEY", "other-key")
    from app.config import resolve_openai_image_api_key

    assert resolve_openai_image_api_key() == "img-only-key"


def test_resolve_openai_image_api_key_falls_back_to_openai_env(monkeypatch) -> None:
    monkeypatch.delenv("IMAGE_OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "from-env")
    from app.config import resolve_openai_image_api_key

    assert resolve_openai_image_api_key() == "from-env"
