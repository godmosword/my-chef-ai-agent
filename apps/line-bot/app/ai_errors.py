"""Map AI HTTP/client errors to LINE-safe user text (no raw provider payloads by default)."""
from __future__ import annotations

from app.config import DEBUG_MODE


def format_ai_error_for_user(exc: BaseException) -> str:
    """
    Return Traditional Chinese text for LINE. Never include API secrets.
    When DEBUG_MODE is on, append a truncated technical line for operators.
    """
    status = getattr(exc, "status_code", None)
    lowered = f"{type(exc).__name__} {exc!s}".lower()

    if status == 401 or "api_key_invalid" in lowered or "invalid api key" in lowered:
        base = (
            "👨‍🍳 AI 金鑰無效或已過期，無法呼叫模型。\n"
            "請由管理員在部署平台（例如 Render）更新 **GEMINI_API_KEY**。"
        )
    elif (
        status == 400
        and (
            "api key expired" in lowered
            or "please renew the api key" in lowered
            or "api key not valid" in lowered
        )
    ) or ("api key expired" in lowered and "renew" in lowered):
        base = (
            "👨‍🍳 AI 金鑰已過期，無法呼叫模型。\n"
            "請由管理員至 Google AI Studio（https://aistudio.google.com/apikey）"
            "或 Cloud 控制台重新建立金鑰，並更新部署環境的 **GEMINI_API_KEY**。"
        )
    elif status == 429 or "rate_limit" in lowered or "resource exhausted" in lowered:
        base = "👨‍🍳 AI 服務目前流量較高，請稍後再試。"
    elif status == 403 or "permission" in lowered:
        base = "👨‍🍳 沒有權限使用目前的 AI 模型，請管理員檢查專案與金鑰權限。"
    else:
        base = (
            "👨‍🍳 暫時無法完成 AI 請求，請稍後再試。\n"
            "若持續發生，請通知管理員查看伺服器記錄。"
        )

    if DEBUG_MODE:
        detail = f"{type(exc).__name__}: {exc!s}"[:800]
        return f"{base}\n\n[DEBUG]\n{detail}"
    return base
