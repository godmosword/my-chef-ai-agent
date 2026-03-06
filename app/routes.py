"""FastAPI route definitions."""
from __future__ import annotations

import json

from fastapi import BackgroundTasks, Header, HTTPException, Request

from app.config import MAX_WEBHOOK_BODY, logger
from app.clients import app, AI_MODEL_FOR_CALL
from app.models import WebhookMessageEvent, WebhookPostbackEvent, WebhookImageEvent
from app.helpers import _validate_signature
from app.handlers import process_ai_reply, process_postback_reply, process_image_reply

from linebot.v3.exceptions import InvalidSignatureError


@app.api_route("/", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok",
        "model": AI_MODEL_FOR_CALL,
        "message": "米其林職人大腦 (Gemini 3.1 Flash Lite 驅動中)",
    }


@app.post("/callback")
async def callback(
    request: Request,
    background_tasks: BackgroundTasks,
    x_line_signature: str | None = Header(None, alias="X-Line-Signature"),
):
    body = await request.body()
    if len(body) > MAX_WEBHOOK_BODY:
        raise HTTPException(status_code=413, detail="Request entity too large")
    if not x_line_signature:
        logger.warning("Missing LINE signature header.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        _validate_signature(body, x_line_signature)
    except InvalidSignatureError:
        logger.warning("Invalid LINE signature.")
        raise HTTPException(status_code=400, detail="Bad request")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Invalid webhook body: %s", exc)
        raise HTTPException(status_code=400, detail="Bad request")

    events = payload.get("events", [])
    for ev in events:
        ev_type = ev.get("type")
        reply_token = ev.get("replyToken", "")
        user_id = (ev.get("source") or {}).get("userId", "")
        if not reply_token or not user_id:
            continue

        if ev_type == "message":
            msg = ev.get("message") or {}
            msg_type = msg.get("type")

            if msg_type == "text":
                background_tasks.add_task(
                    process_ai_reply,
                    WebhookMessageEvent(reply_token, user_id, msg.get("text", "")),
                )
            elif msg_type == "image":
                # New: handle image messages for ingredient recognition
                message_id = msg.get("id", "")
                if message_id:
                    background_tasks.add_task(
                        process_image_reply,
                        WebhookImageEvent(reply_token, user_id, message_id),
                    )

        elif ev_type == "postback":
            data = (ev.get("postback") or {}).get("data", "")
            background_tasks.add_task(
                process_postback_reply,
                WebhookPostbackEvent(reply_token, user_id, data),
            )

    return "OK"
