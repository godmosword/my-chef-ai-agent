"""LINE Flex design tokens — 溫暖明亮食譜主題。"""

from __future__ import annotations

# ── 核心色板 ────────────────────────────────────────────────────────────────────
PRIMARY_BG     = "#FFFAF5"   # 溫暖米白底色
SURFACE_BG     = "#FFFFFF"   # 卡片白
SECONDARY_TEXT = "#9C8F84"   # 暖灰輔助文字
ACCENT_ORANGE  = "#C8922A"   # 琥珀金主色（取代橙紅）
NEUTRAL_TEXT   = "#1C1917"   # 深棕黑主文字
SURFACE_ALT    = "#F5EFE6"   # 淡金底（次要區塊）
SURFACE_MUTED  = "#F9F4EE"   # 更淡的米色

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
HERO_BLOCK_BG = "#2A6049"    # 深森綠 hero 底色
HERO_KICKER   = "#C8922A"    # 琥珀金標語
HERO_SUB      = "#EBF5F0"    # 淡綠輔助文字
HERO_TITLE    = "#F5F0E6"    # 米白標題

# ── 主選單 ──────────────────────────────────────────────────────────────────────
MENU_HEADER_BG       = "#2A6049"
MENU_HEADER_TEXT     = "#F5F0E6"
MENU_BODY_BG         = PRIMARY_BG
MENU_BTN_CUISINE     = ACCENT_ORANGE
MENU_BTN_FRIDGE      = ACCENT_ORANGE
MENU_BTN_BUDGET      = ACCENT_ORANGE
MENU_BTN_MOOD        = ACCENT_ORANGE
MENU_BTN_SECONDARY   = "#2A6049"
MENU_BTN_TERTIARY    = SECONDARY_TEXT

# ── 菜系輪播 ────────────────────────────────────────────────────────────────────
CUISINE_HERO_TAIWANESE = "#6B3A2A"
CUISINE_HERO_THAI      = "#2A5C3F"
CUISINE_HERO_JAPANESE  = "#3A2A4A"
CUISINE_HERO_EU        = "#2A3A4A"
CUISINE_HERO_KIDS      = "#6B5A2A"

CUISINE_HERO_LABEL  = "rgba(245,240,230,0.8)"
CUISINE_HERO_TITLE  = "#F5F0E6"
CUISINE_BODY_TITLE  = TEXT_INK
CUISINE_BODY_DESC   = TEXT_MUTED
CUISINE_FOOTER_BTN  = ACCENT_ORANGE

# ── 食譜主卡 ────────────────────────────────────────────────────────────────────
SURFACE_CARD        = SURFACE_BG
ACCENT_TOP_STRIP    = ACCENT_ORANGE
THEME_LABEL         = SECONDARY_TEXT
TITLE_PRIMARY       = TEXT_INK
TALK_CONTENT        = TEXT_BODY

PANEL_CONFERENCE_BG    = SURFACE_ALT
PANEL_CONFERENCE_LABEL = SECONDARY_TEXT

SECTION_LABEL = "#2A6049"    # 深森綠區塊標題
SHOP_BULLET   = TEXT_BODY

ING_NAME  = TEXT_BODY
ING_PRICE = ACCENT_ORANGE

PANEL_COST_OUTER_BG = SURFACE_ALT
PANEL_COST_BORDER   = "#EAE4DC"
SEP_COLOR           = "#EAE4DC"
TOTAL_BAND_BG       = SURFACE_MUTED
TOTAL_LABEL         = SECONDARY_TEXT

STEP_NUM        = ACCENT_ORANGE
MORE_STEPS_HINT = SECONDARY_TEXT

FOOTER_BTN_SECONDARY = SECONDARY_TEXT
FOOTER_BTN_FAVORITE  = ACCENT_ORANGE
FOOTER_DISCLAIMER    = SECONDARY_TEXT

VIDEO_BTN      = ACCENT_ORANGE
EXPAND_BTN_BG  = SECONDARY_TEXT

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
