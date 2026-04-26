"""Cross-surface UI component contracts.

This module defines semantic visual contracts to prevent style drift across
LINE Flex, poster, and static web pages.
"""

from __future__ import annotations

from app import design_tokens as dt


# Buttons
BUTTON_PRIMARY_BG = dt.PRIMARY
BUTTON_PRIMARY_TEXT = dt.SURFACE
BUTTON_SECONDARY_BG = dt.GREEN
BUTTON_SECONDARY_TEXT = dt.GREEN_TEXT
BUTTON_TERTIARY_BG = dt.SURFACE_ALT
BUTTON_TERTIARY_TEXT = dt.TEXT_BODY
BUTTON_LINK_TEXT = dt.TEXT_MUTED

# Badges and section labels
BADGE_BG = dt.GREEN
BADGE_TEXT = dt.GREEN_TEXT
SECTION_TITLE_TEXT = dt.GREEN

# Role labels
ROLE_EXECUTIVE_CHEF = dt.ROLE_EXECUTIVE_CHEF
ROLE_SOUS_CHEF = dt.ROLE_SOUS_CHEF
ROLE_INGREDIENT_MANAGER = dt.ROLE_INGREDIENT_MANAGER
