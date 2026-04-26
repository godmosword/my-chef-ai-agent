"""Shared design tokens for cross-surface visual consistency."""

from __future__ import annotations


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    """Convert #RRGGBB to an RGB tuple."""
    cleaned = value.lstrip("#")
    return tuple(int(cleaned[i : i + 2], 16) for i in (0, 2, 4))


# Base
BACKGROUND = "#FFFAF5"
BACKGROUND_ALT = "#F9F7F4"
SURFACE = "#FFFFFF"
SURFACE_ALT = "#F5EFE6"
SURFACE_MUTED = "#F9F4EE"
BORDER = "#EAE4DC"

# Brand
PRIMARY = "#C8922A"
PRIMARY_DARK = "#A67318"
PRIMARY_LIGHT = "#FDF6E7"
GREEN = "#2A6049"
GREEN_LIGHT = "#EBF5F0"
GREEN_TEXT = "#F5F0E6"
PURPLE = "#7B5EA7"

# Text
TEXT_INK = "#1C1917"
TEXT_BODY = "#3D3530"
TEXT_MUTED = "#9C8F84"

# Cuisine hero backgrounds
CUISINE_TAIWANESE = "#6B3A2A"
CUISINE_THAI = "#2A5C3F"
CUISINE_JAPANESE = "#3A2A4A"
CUISINE_EUROPEAN = "#2A3A4A"
CUISINE_KIDS = "#6B5A2A"

# Role colors
ROLE_EXECUTIVE_CHEF = PRIMARY
ROLE_SOUS_CHEF = GREEN
ROLE_INGREDIENT_MANAGER = PURPLE
