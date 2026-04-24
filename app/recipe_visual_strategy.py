"""Recipe visual product tier (single-card vs multi-image roadmap).

Tier A (default): one two-stage recipe card PNG — one image API call for the base,
programmatic Traditional Chinese overlay, optional embedded hero photo when
``photo_url`` is available on the recipe dict.

Tier B (future): multiple image generations per recipe (higher cost/latency);
see ``app.recipe_multi_image_spec`` for numeric limits and UX notes. Not wired
into LINE handlers until explicitly enabled.
"""
from __future__ import annotations

import os

_VALID = frozenset({"A", "B"})

_tier = (os.getenv("RECIPE_VISUAL_TIER") or "A").strip().upper()
if _tier not in _VALID:
    _tier = "A"

RECIPE_VISUAL_TIER: str = _tier
