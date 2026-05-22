"""Webhook event data models."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class WebhookMessageEvent:
    reply_token: str
    user_id: str
    text: str
    tenant_id: str = "default"


@dataclass
class WebhookPostbackEvent:
    reply_token: str
    user_id: str
    data: str
    tenant_id: str = "default"


@dataclass
class WebhookImageEvent:
    """Represents an image message from LINE."""
    reply_token: str
    user_id: str
    message_id: str
    tenant_id: str = "default"
