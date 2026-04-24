"""Reserved constants for Tier-B multi-image recipe visuals (not active by default).

When ``RECIPE_VISUAL_TIER=B`` is implemented, use these limits to cap cost/latency
and to shape LINE UX.

Design notes
------------
- Each step image is an extra ``images.generate`` (or equivalent) call; total
  wall time grows roughly linearly with count. Keep generation off the first
  reply path; use postback + progress text + ``push`` batches.
- LINE allows multiple ``ImageMessage`` objects in one push, but long trains of
  images hurt UX; prefer a single stitched PNG or at most a small batch.
- On partial failure: still deliver text steps + any successful images; log
  and increment observability counters for retries.
"""
from __future__ import annotations

# Maximum AI step images per recipe (matches typical step grid in recipe card).
MAX_STEP_IMAGE_GENERATIONS: int = 6

# Prefer one composite push over many separate images when possible.
LINE_IMAGE_MESSAGES_PER_PUSH_SOFT_CAP: int = 5

# Seconds budget for the whole multi-image job before user-facing timeout message.
MULTI_IMAGE_JOB_BUDGET_SEC: float = 120.0
