"""Tests for user-facing AI error formatting."""
from __future__ import annotations

import pytest

from app import ai_errors


class _FakeAPIError(Exception):
    def __init__(self, status_code: int, msg: str):
        super().__init__(msg)
        self.status_code = status_code


def test_api_key_expired_400_no_raw_json_in_prod(monkeypatch):
    monkeypatch.setattr(ai_errors, "DEBUG_MODE", False)
    exc = _FakeAPIError(
        400,
        "{'error': {'message': 'API key expired. Please renew the API key.', 'code': 400}}",
    )
    text = ai_errors.format_ai_error_for_user(exc)
    assert "API key expired" not in text
    assert "GEMINI_API_KEY" in text or "金鑰" in text


def test_api_key_invalid_reason_no_debug(monkeypatch):
    monkeypatch.setattr(ai_errors, "DEBUG_MODE", False)
    exc = _FakeAPIError(400, "Error code: 400 - reason: API_KEY_INVALID")
    text = ai_errors.format_ai_error_for_user(exc)
    assert "API_KEY_INVALID" not in text
    assert "清除記憶" not in text


def test_debug_appends_detail(monkeypatch):
    monkeypatch.setattr(ai_errors, "DEBUG_MODE", True)
    exc = ValueError("something obscure")
    text = ai_errors.format_ai_error_for_user(exc)
    assert "[DEBUG]" in text
    assert "ValueError" in text
