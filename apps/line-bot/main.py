"""
職人料理大腦 — 封存：LINE Bot FastAPI 入口。

現行產品為 web/（Next.js on Vercel）。本檔僅供舊部署與 pytest 使用。
見 docs/LEGACY_LINE_BOT.md

Run: uvicorn main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

# Import the FastAPI app instance (triggers client setup)
from app.clients import app  # noqa: F401

# Register routes (side-effect import)
from app import routes  # noqa: F401

# ─── Backward-compatible re-exports for tests ───────────────────────────────────
# These allow existing tests to keep `from main import ...` without changes.

from app.helpers import _safe_str, _parse_to_list, _extract_json  # noqa: F401
from app.flex_messages import generate_flex_message  # noqa: F401
from app.db import get_user_memory, save_user_memory, clear_user_memory  # noqa: F401
