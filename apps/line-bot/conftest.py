"""Pytest configuration for LINE Bot (apps/line-bot)."""

from __future__ import annotations

import sys
from pathlib import Path

_LINE_BOT_ROOT = Path(__file__).resolve().parent
if str(_LINE_BOT_ROOT) not in sys.path:
    sys.path.insert(0, str(_LINE_BOT_ROOT))
