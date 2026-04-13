"""FastAPI route definitions."""
from __future__ import annotations

import json

from fastapi import Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import (
    ADMIN_API_TOKEN,
    DATABASE_URL,
    DEFAULT_TENANT_ID,
    LOG_USER_HASH_SALT,
    MAX_WEBHOOK_BODY,
    METRICS_TOKEN,
    logger,
)
from app.clients import AI_MODEL_FOR_CALL, app
from app.db import get_daily_usage, get_user_subscription, ping_database, set_user_subscription
from app.models import WebhookMessageEvent, WebhookPostbackEvent, WebhookImageEvent
from app.helpers import _validate_signature
from app.job_queue import QueueJob, enqueue_job
from app.observability import (
    get_request_id,
    hash_user_id,
    incr,
    new_request_id,
    reset_request_id,
    set_request_id,
    snapshot,
)
from app.rate_limit import enforce_callback_rate_limit, enforce_public_rate_limit, enforce_user_rate_limit
from app.subscriptions import build_checkout_url

from linebot.v3.exceptions import InvalidSignatureError


class SubscriptionUpdatePayload(BaseModel):
    plan_key: str = Field(default="free")
    status: str = Field(default="active")
    tenant_id: str = Field(default=DEFAULT_TENANT_ID)


def _build_trace_carrier() -> dict[str, str]:
    carrier: dict[str, str] = {}
    try:
        from opentelemetry.propagate import inject

        inject(carrier)
    except Exception:
        return {}
    return carrier


def _require_admin_token(header_token: str | None) -> None:
    if not ADMIN_API_TOKEN:
        raise HTTPException(status_code=503, detail="Admin API disabled")
    if header_token != ADMIN_API_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or new_request_id()
    token = set_request_id(request_id)
    try:
        response = await call_next(request)
    except Exception:
        incr("http.errors_total")
        raise
    finally:
        reset_request_id(token)
    response.headers["X-Request-ID"] = request_id
    incr("http.requests_total")
    return response


@app.api_route("/", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok",
        "model": AI_MODEL_FOR_CALL,
        "message": "米其林職人大腦 (Gemini 3.1 Flash Lite 驅動中)",
    }


@app.get("/ready")
async def readiness():
    """
    Readiness: when a database is configured, require a successful lightweight query.
    Liveness remains GET / (no dependency checks). AI smoke is intentionally omitted.
    """
    ok_db = await ping_database()
    if not DATABASE_URL:
        checks = {"database": "skipped_not_configured"}
        return {"ready": True, "checks": checks}
    checks = {"database": "ok" if ok_db else "error"}
    if not ok_db:
        return JSONResponse(
            status_code=503,
            content={"ready": False, "checks": checks},
        )
    return {"ready": True, "checks": checks}


@app.post("/callback")
async def callback(
    request: Request,
    x_line_signature: str | None = Header(None, alias="X-Line-Signature"),
    _rate_limit: None = Depends(enforce_callback_rate_limit),
):
    tenant_id = request.headers.get("X-Tenant-ID") or DEFAULT_TENANT_ID
    body = await request.body()
    incr("webhook.requests_total")
    incr("webhook.bytes_total", len(body))
    if len(body) > MAX_WEBHOOK_BODY:
        incr("webhook.errors.request_too_large")
        raise HTTPException(status_code=413, detail="Request entity too large")
    if not x_line_signature:
        incr("webhook.errors.missing_signature")
        logger.warning("Missing LINE signature header.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        _validate_signature(body, x_line_signature)
    except InvalidSignatureError:
        incr("webhook.errors.invalid_signature")
        logger.warning("Invalid LINE signature.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        incr("webhook.errors.invalid_body")
        logger.warning("Invalid webhook body: %s", exc)
        raise HTTPException(status_code=400, detail="Bad request")

    events = payload.get("events", [])
    incr("webhook.events_total", len(events))
    for ev in events:
        ev_type = ev.get("type")
        if ev_type:
            incr(f"webhook.events.{ev_type}")
        reply_token = ev.get("replyToken", "")
        user_id = (ev.get("source") or {}).get("userId", "")
        if not reply_token or not user_id:
            incr("webhook.events.skipped_missing_identity")
            continue
        await enforce_user_rate_limit(user_id=user_id, tenant_id=tenant_id)

        if ev_type == "message":
            msg = ev.get("message") or {}
            msg_type = msg.get("type")

            if msg_type == "text":
                enqueue_result = await enqueue_job(QueueJob(
                    job_type="text",
                    event=WebhookMessageEvent(reply_token, user_id, msg.get("text", ""), tenant_id=tenant_id),
                    event_id=(ev.get("webhookEventId") or f"text:{reply_token}:{user_id}:{msg.get('id', '')}"),
                    request_id=get_request_id(),
                    user_hash=hash_user_id(user_id, LOG_USER_HASH_SALT),
                    trace_carrier=_build_trace_carrier(),
                ))
                if enqueue_result == "queue_full":
                    raise HTTPException(status_code=503, detail="Queue overloaded")
            elif msg_type == "image":
                # New: handle image messages for ingredient recognition
                message_id = msg.get("id", "")
                if message_id:
                    enqueue_result = await enqueue_job(QueueJob(
                        job_type="image",
                        event=WebhookImageEvent(reply_token, user_id, message_id, tenant_id=tenant_id),
                        event_id=(ev.get("webhookEventId") or f"image:{reply_token}:{user_id}:{message_id}"),
                        request_id=get_request_id(),
                        user_hash=hash_user_id(user_id, LOG_USER_HASH_SALT),
                        trace_carrier=_build_trace_carrier(),
                    ))
                    if enqueue_result == "queue_full":
                        raise HTTPException(status_code=503, detail="Queue overloaded")
                else:
                    incr("webhook.events.skipped_missing_message_id")
            else:
                incr("webhook.events.skipped_unknown_message_type")

        elif ev_type == "postback":
            data = (ev.get("postback") or {}).get("data", "")
            enqueue_result = await enqueue_job(QueueJob(
                job_type="postback",
                event=WebhookPostbackEvent(reply_token, user_id, data, tenant_id=tenant_id),
                event_id=(ev.get("webhookEventId") or f"postback:{reply_token}:{user_id}:{data}"),
                request_id=get_request_id(),
                user_hash=hash_user_id(user_id, LOG_USER_HASH_SALT),
                trace_carrier=_build_trace_carrier(),
            ))
            if enqueue_result == "queue_full":
                raise HTTPException(status_code=503, detail="Queue overloaded")
        else:
            incr("webhook.events.skipped_unknown_event_type")

    return "OK"


@app.get("/metrics")
async def metrics(x_metrics_token: str | None = Header(None, alias="X-Metrics-Token")):
    if METRICS_TOKEN and x_metrics_token != METRICS_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    return snapshot()


@app.get("/admin/subscriptions/{user_id}")
async def get_subscription(
    user_id: str,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
    tenant_id: str = DEFAULT_TENANT_ID,
):
    _require_admin_token(x_admin_token)
    plan_key, status = await get_user_subscription(user_id=user_id, tenant_id=tenant_id)
    usage_today = await get_daily_usage(user_id=user_id, tenant_id=tenant_id)
    return {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "plan_key": plan_key,
        "status": status,
        "usage_today": usage_today,
    }


@app.put("/admin/subscriptions/{user_id}")
async def update_subscription(
    user_id: str,
    payload: SubscriptionUpdatePayload,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
):
    _require_admin_token(x_admin_token)
    await set_user_subscription(
        user_id=user_id,
        tenant_id=payload.tenant_id,
        plan_key=payload.plan_key,
        status=payload.status,
    )
    return {"ok": True}


@app.get("/billing/checkout")
async def checkout(
    user_id: str,
    plan_key: str = "pro",
    tenant_id: str = DEFAULT_TENANT_ID,
    _rate_limit: None = Depends(enforce_public_rate_limit),
):
    return {
        "checkout_url": build_checkout_url(user_id=user_id, tenant_id=tenant_id, plan_key=plan_key),
        "plan_key": plan_key,
        "tenant_id": tenant_id,
    }


@app.get("/legal/disclaimer")
async def legal_disclaimer(_rate_limit: None = Depends(enforce_public_rate_limit)):
    return {
        "message": "本服務提供 AI 食譜建議，僅供參考；請自行評估過敏原、飲食限制與食品安全條件。",
    }


@app.get("/legal/privacy")
async def legal_privacy(_rate_limit: None = Depends(enforce_public_rate_limit)):
    return {
        "data_collected": ["對話內容", "圖片訊息（若上傳）", "收藏食譜", "用量與訂閱狀態"],
        "retention": "依營運需求保存，使用者可透過「刪除我的資料」提出刪除要求。",
        "contact": "請由營運方客服管道受理個資請求。",
    }
