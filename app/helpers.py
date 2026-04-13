"""Pure utility functions (no I/O, no external deps beyond stdlib)."""
from __future__ import annotations

import ast
import base64
import hashlib
import hmac
import json
from urllib.parse import urlparse

from app.config import LINE_CHANNEL_SECRET

from linebot.v3.exceptions import InvalidSignatureError


# ─── Text helpers ────────────────────────────────────────────────────────────────

def _safe_str(val: object, fallback: str = "-", max_len: int | None = None) -> str:
    s = str(val).strip()
    if not s or s in ("{}", "[]", "None", "null"):
        return fallback
    if max_len and len(s) > max_len:
        return s[: max_len - 1] + "…"
    return s


def _parse_to_list(data: object) -> list:
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    if isinstance(data, str):
        try:
            parsed = ast.literal_eval(data)
            return parsed if isinstance(parsed, list) else [parsed] if isinstance(parsed, dict) else [str(parsed)]
        except (ValueError, SyntaxError):
            return [line for line in data.split("\n") if line.strip()]
    return [str(data)]


# ─── JSON extraction ────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in AI response")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("Malformed JSON in AI response")


def _parse_ai_json(text: str) -> dict:
    """Try direct JSON parse first, then extract from surrounding text."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return _extract_json(text)


# ─── Prompt helpers ──────────────────────────────────────────────────────────────

def _build_system_prompt(
    prefs: str | None = None,
    current_cuisine: str | None = None,
    *,
    base_prompt: str | None = None,
) -> str:
    from app.config import SYSTEM_PROMPT
    base = base_prompt or SYSTEM_PROMPT
    base += "\n若涉及「預算方案」，請在 kitchen_talk 中討論 CP 值與採買策略，並嚴格控制 estimated_total_cost。"
    base += "\n若涉及「心情點餐」，請副主廚針對該心情提供具情緒價值與儀式感的料理建議。"
    if prefs:
        base += f"\n飲食禁忌：{prefs}。"
    if current_cuisine and current_cuisine != "不拘":
        base += f"\n料理情境：{current_cuisine}。聚焦此風格。"
    return base


def _build_scenario_instructions(text: str) -> str:
    from app.config import (
        SCENARIO_CLEAR_FRIDGE,
        SCENARIO_KIDS_MEAL,
        SCENARIO_BUDGET,
        SCENARIO_MOOD,
    )
    labeled_scenarios = [
        ("清冰箱", SCENARIO_CLEAR_FRIDGE),
        ("兒童餐", SCENARIO_KIDS_MEAL),
        ("預算方案", SCENARIO_BUDGET),
        ("心情點餐", SCENARIO_MOOD),
    ]
    parts = [
        f"【{label}模式】{scenario[1]}"
        for label, scenario in labeled_scenarios
        if any(k in text for k in scenario[0])
    ]
    return "\n\n".join(parts) + "\n\n" if parts else ""


def _condense_assistant_message(content: str, max_chars: int = 80) -> str:
    """Shorten long assistant messages to save tokens in history."""
    if not content or len(content) <= max_chars:
        return content
    try:
        name = _parse_ai_json(content).get("recipe_name", "")
        if name:
            return f"【上次食譜】{name}"
    except (ValueError, json.JSONDecodeError):
        pass
    return content[: max_chars - 2] + "…"


def _filter_history_after_context(history: list, context_updated_at: str | None) -> list:
    if not context_updated_at:
        return history
    return [m for m in history if (m.get("timestamp") or "") > context_updated_at]


# ─── Signature ──────────────────────────────────────────────────────────────────

def _flex_safe_https_url(raw: object, *, max_len: int = 2000) -> str | None:
    """
    LINE Flex hero image / URI button 僅接受可公開存取的 https URL。
    若格式不符或過長則回傳 None（略過顯示，避免 API 錯誤）。
    """
    s = str(raw or "").strip()
    if not s or s in ("-", "null", "None"):
        return None
    if len(s) > max_len:
        return None
    parsed = urlparse(s)
    if parsed.scheme != "https" or not parsed.netloc:
        return None
    return s


def _validate_signature(body: bytes, signature: str) -> None:
    if not LINE_CHANNEL_SECRET or not signature:
        raise InvalidSignatureError()
    hash_val = hmac.new(LINE_CHANNEL_SECRET.encode("utf-8"), body, hashlib.sha256).digest()
    expected = base64.b64encode(hash_val).decode("utf-8")
    if not hmac.compare_digest(signature, expected):
        raise InvalidSignatureError()
