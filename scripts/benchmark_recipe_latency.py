#!/usr/bin/env python3
"""Operational hints for measuring first-recipe latency (P95).

The app logs structured JSON lines containing ``recipe_flow_timing_sec`` with
fields:

- ``fetch_ctx``: user context / memory fetch
- ``deep_research``: Deep Research phase (0 when disabled)
- ``ai_call``: main recipe model completion
- ``total``: end-to-end inside ``background_generate_recipe`` core path

Suggested procedure
--------------------
1. Deploy or run locally with ``DEBUG=1`` if you need plaintext logs instead of JSON.
2. Toggle knobs and repeat the same user prompt 20+ times:

   - ``ENABLE_DEEP_RESEARCH`` (default off): largest win when you do not need grounding.
   - ``DEEP_RESEARCH_TIMEOUT_SEC`` (clamped 5–20): caps worst-case wait when research is on.
   - ``MODEL_NAME`` / ``MAX_HISTORY_TURNS`` / ``MAX_COMPLETION_TOKENS`` / ``AI_CHAT_TIMEOUT_SEC``.

3. Grep logs::

     rg 'recipe_flow_timing_sec' your-log-file

4. Compute P95 offline (e.g. small Python one-liner or spreadsheet) on the ``total`` field.

This script only prints current effective defaults from environment (no network calls).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def main() -> None:
    from app import config
    from app.recipe_visual_strategy import RECIPE_VISUAL_TIER

    print("recipe latency knobs (resolved defaults)")
    print(f"  ENABLE_DEEP_RESEARCH={config.ENABLE_DEEP_RESEARCH}")
    print("  DEEP_RESEARCH_TIMEOUT_SEC: env 5–20s (see app/deep_research.py) when research enabled")
    print(f"  MODEL_NAME={config.MODEL_NAME}")
    print(f"  MAX_HISTORY_TURNS={config.MAX_HISTORY_TURNS}")
    print(f"  MAX_COMPLETION_TOKENS={config.MAX_COMPLETION_TOKENS}")
    print(f"  AI_CHAT_TIMEOUT_SEC={config.AI_CHAT_TIMEOUT_SEC}")
    print(f"  RECIPE_VISUAL_TIER={RECIPE_VISUAL_TIER}")
    print()
    print("Log grep:")
    print("  rg 'recipe_flow_timing_sec' <logfile>")


if __name__ == "__main__":
    # Allow running without full env (LINE secrets) only when already configured.
    if not (os.getenv("LINE_CHANNEL_ACCESS_TOKEN") or "").strip():
        print("Note: load_dotenv + LINE secrets required for full app.config import in some setups.")
    main()
