"""Request context and lightweight in-process metrics helpers."""
from __future__ import annotations

import contextvars
import threading
from collections import defaultdict
from datetime import datetime, timezone
from uuid import uuid4

_request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_metrics_lock = threading.Lock()
_counters: dict[str, float] = defaultdict(float)


def new_request_id() -> str:
    return uuid4().hex


def set_request_id(request_id: str) -> contextvars.Token:
    return _request_id_var.set(request_id or "-")


def reset_request_id(token: contextvars.Token) -> None:
    _request_id_var.reset(token)


def get_request_id() -> str:
    return _request_id_var.get()


def incr(metric: str, value: float = 1) -> None:
    with _metrics_lock:
        _counters[metric] += value


def snapshot() -> dict:
    with _metrics_lock:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": dict(_counters),
        }
