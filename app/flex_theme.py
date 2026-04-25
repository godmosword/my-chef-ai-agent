"""LINE Flex design tokens — MUJI minimal theme."""

from __future__ import annotations

# ── 核心色板 ────────────────────────────────────────────────────────────────────
PRIMARY_BG     = "#F8F5F0"   # 無印米白
SURFACE_BG     = "#FFFCF8"   # 卡片底
SECONDARY_TEXT = "#8C857B"   # 暖灰輔助
ACCENT_ORANGE  = "#A78A67"   # 木質棕
NEUTRAL_TEXT   = "#3A3631"   # 深棕灰主文字
SURFACE_ALT    = "#F2ECE2"   # 次要底
SURFACE_MUTED  = "#EEE7DC"   # 帶暖中性

# ── 三廚角色標籤色 ──────────────────────────────────────────────────────────────
ROLE_COLORS: dict[str, str] = {
    "行政主廚": "#C8922A",
    "副主廚":   "#2A6049",
    "食材總管": "#7B5EA7",
}

# ── 文字階層 ────────────────────────────────────────────────────────────────────
TEXT_INK    = NEUTRAL_TEXT
TEXT_BODY   = "#3D3530"      # 溫暖深棕內文
TEXT_MUTED  = SECONDARY_TEXT
TEXT_STRONG = NEUTRAL_TEXT

# ── 無主圖時文字 hero ───────────────────────────────────────────────────────────
HERO_BLOCK_BG = "#EDE6DA"    # 無印暖灰 hero 底色
HERO_KICKER   = "#8F7758"    # 深木色標語
HERO_SUB      = "#8C857B"    # 暖灰輔助文字
HERO_TITLE    = "#3A3631"    # 深棕灰標題

# ── 主選單 ──────────────────────────────────────────────────────────────────────
MENU_HEADER_BG       = "#6B7A6B"  # 沉穩鼠尾草綠
MENU_HEADER_TEXT     = "#F7F4EE"
MENU_BODY_BG         = PRIMARY_BG
MENU_BTN_CUISINE     = "#B89450"
MENU_BTN_FRIDGE      = "#B89450"
MENU_BTN_BUDGET      = "#B89450"
MENU_BTN_MOOD        = "#B89450"
MENU_BTN_SECONDARY   = "#6B7A6B"
MENU_BTN_TERTIARY    = "#9E9589"

# ── 菜系輪播 ────────────────────────────────────────────────────────────────────
CUISINE_HERO_TAIWANESE = "#8D7760"
CUISINE_HERO_THAI      = "#6E8A74"
CUISINE_HERO_JAPANESE  = "#7A748A"
CUISINE_HERO_EU        = "#6E7F8E"
CUISINE_HERO_KIDS      = "#8D8571"

CUISINE_HERO_LABEL  = "#F6F1E9"
CUISINE_HERO_TITLE  = "#FFFDF9"
CUISINE_BODY_TITLE  = TEXT_INK
CUISINE_BODY_DESC   = TEXT_MUTED
CUISINE_FOOTER_BTN  = "#A78A67"

# ── 食譜主卡 ────────────────────────────────────────────────────────────────────
SURFACE_CARD        = SURFACE_BG
ACCENT_TOP_STRIP    = ACCENT_ORANGE
THEME_LABEL         = SECONDARY_TEXT
TITLE_PRIMARY       = TEXT_INK
TALK_CONTENT        = TEXT_BODY

PANEL_CONFERENCE_BG    = SURFACE_ALT
PANEL_CONFERENCE_LABEL = SECONDARY_TEXT

SECTION_LABEL = "#6B7A6B"    # 沉穩綠
SHOP_BULLET   = TEXT_BODY

ING_NAME  = TEXT_BODY
ING_PRICE = "#8F7758"

PANEL_COST_OUTER_BG = SURFACE_ALT
PANEL_COST_BORDER   = "#E1D8CB"
SEP_COLOR           = "#E1D8CB"
TOTAL_BAND_BG       = SURFACE_MUTED
TOTAL_LABEL         = SECONDARY_TEXT

STEP_NUM        = ACCENT_ORANGE
MORE_STEPS_HINT = SECONDARY_TEXT

FOOTER_BTN_SECONDARY = SECONDARY_TEXT
FOOTER_BTN_FAVORITE  = ACCENT_ORANGE
FOOTER_DISCLAIMER    = SECONDARY_TEXT

VIDEO_BTN      = "#A78A67"
EXPAND_BTN_BG  = "#9E9589"

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
