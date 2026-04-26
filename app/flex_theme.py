"""LINE Flex design tokens — MUJI minimal theme."""

from __future__ import annotations

from app import design_tokens as dt

# ── 核心色板 ────────────────────────────────────────────────────────────────────
PRIMARY_BG = dt.BACKGROUND
SURFACE_BG = dt.SURFACE
SECONDARY_TEXT = dt.TEXT_MUTED
ACCENT_ORANGE = dt.PRIMARY
NEUTRAL_TEXT = dt.TEXT_INK
SURFACE_ALT = dt.SURFACE_ALT
SURFACE_MUTED = dt.SURFACE_MUTED

# ── 三廚角色標籤色 ──────────────────────────────────────────────────────────────
ROLE_COLORS: dict[str, str] = {
    "行政主廚": dt.ROLE_EXECUTIVE_CHEF,
    "副主廚": dt.ROLE_SOUS_CHEF,
    "食材總管": dt.ROLE_INGREDIENT_MANAGER,
}

# ── 文字階層 ────────────────────────────────────────────────────────────────────
TEXT_INK    = NEUTRAL_TEXT
TEXT_BODY = dt.TEXT_BODY
TEXT_MUTED  = SECONDARY_TEXT
TEXT_STRONG = NEUTRAL_TEXT

# ── 無主圖時文字 hero ───────────────────────────────────────────────────────────
HERO_BLOCK_BG = dt.GREEN
HERO_KICKER = dt.PRIMARY
HERO_SUB = dt.GREEN_TEXT
HERO_TITLE = dt.GREEN_TEXT

# ── 主選單 ──────────────────────────────────────────────────────────────────────
MENU_HEADER_BG = dt.GREEN
MENU_HEADER_TEXT = dt.GREEN_TEXT
MENU_BODY_BG         = PRIMARY_BG
MENU_BTN_CUISINE = dt.PRIMARY
MENU_BTN_FRIDGE = dt.PRIMARY
MENU_BTN_BUDGET = dt.PRIMARY
MENU_BTN_MOOD = dt.PRIMARY
MENU_BTN_SECONDARY = dt.GREEN
MENU_BTN_TERTIARY = dt.TEXT_MUTED

# ── 菜系輪播 ────────────────────────────────────────────────────────────────────
CUISINE_HERO_TAIWANESE = dt.CUISINE_TAIWANESE
CUISINE_HERO_THAI = dt.CUISINE_THAI
CUISINE_HERO_JAPANESE = dt.CUISINE_JAPANESE
CUISINE_HERO_EU = dt.CUISINE_EUROPEAN
CUISINE_HERO_KIDS = dt.CUISINE_KIDS

CUISINE_HERO_LABEL = dt.GREEN_TEXT
CUISINE_HERO_TITLE = dt.GREEN_TEXT
CUISINE_BODY_TITLE  = TEXT_INK
CUISINE_BODY_DESC   = TEXT_MUTED
CUISINE_FOOTER_BTN = dt.PRIMARY

# ── 食譜主卡 ────────────────────────────────────────────────────────────────────
SURFACE_CARD        = SURFACE_BG
ACCENT_TOP_STRIP    = ACCENT_ORANGE
THEME_LABEL         = SECONDARY_TEXT
TITLE_PRIMARY       = TEXT_INK
TALK_CONTENT        = TEXT_BODY

PANEL_CONFERENCE_BG    = SURFACE_ALT
PANEL_CONFERENCE_LABEL = SECONDARY_TEXT

SECTION_LABEL = dt.GREEN
SHOP_BULLET   = TEXT_BODY

ING_NAME  = TEXT_BODY
ING_PRICE = dt.PRIMARY

PANEL_COST_OUTER_BG = SURFACE_ALT
PANEL_COST_BORDER = dt.BORDER
SEP_COLOR = dt.BORDER
TOTAL_BAND_BG       = SURFACE_MUTED
TOTAL_LABEL         = SECONDARY_TEXT

STEP_NUM        = ACCENT_ORANGE
MORE_STEPS_HINT = SECONDARY_TEXT

FOOTER_BTN_SECONDARY = SECONDARY_TEXT
FOOTER_BTN_FAVORITE  = ACCENT_ORANGE
FOOTER_DISCLAIMER    = SECONDARY_TEXT

VIDEO_BTN = dt.PRIMARY
EXPAND_BTN_BG = dt.GREEN

ROLE_FALLBACK = TEXT_MUTED

# ── 收藏輪播 ────────────────────────────────────────────────────────────────────
FAV_THEME_LABEL = THEME_LABEL
FAV_TITLE       = TITLE_PRIMARY
FAV_ING         = TEXT_MUTED
FAV_COST_LABEL  = SECONDARY_TEXT
FAV_REDO_BTN    = ACCENT_ORANGE

# ── Fallback / 截斷提示 ─────────────────────────────────────────────────────────
FALLBACK_STRIP = ACCENT_ORANGE
FALLBACK_TITLE = TEXT_INK
FALLBACK_HINT  = SECONDARY_TEXT
FALLBACK_BODY  = TEXT_BODY
