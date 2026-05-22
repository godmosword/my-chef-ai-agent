"""Subscription and checkout helpers."""
from __future__ import annotations

from urllib.parse import urlencode

from app.config import BILLING_BASE_URL, BILLING_PROVIDER, CHECKOUT_URL_TEMPLATE


def build_checkout_url(user_id: str, tenant_id: str, plan_key: str = "pro") -> str:
    if CHECKOUT_URL_TEMPLATE:
        return CHECKOUT_URL_TEMPLATE.format(
            user_id=user_id,
            tenant_id=tenant_id,
            plan_key=plan_key,
            provider=BILLING_PROVIDER,
        )
    params = urlencode({"user_id": user_id, "tenant_id": tenant_id, "plan_key": plan_key})
    base = BILLING_BASE_URL.rstrip("/")
    return f"{base}/billing/mock/{BILLING_PROVIDER}?{params}"
