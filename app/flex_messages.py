"""LINE Flex Message builders for recipe cards, menus, carousels, and favorites."""
from __future__ import annotations

import urllib.parse

from linebot.v3.messaging import FlexContainer, FlexMessage

from app.config import (
    LEGAL_DISCLAIMER_URL,
    LEGAL_PRIVACY_URL,
    LINE_TEXT_MAX,
    RECIPE_STEPS_PREVIEW_COUNT,
)
from app import flex_theme as fx
from app.helpers import _flex_safe_https_url, _safe_str, _parse_to_list


# ─── Cuisine carousel data ──────────────────────────────────────────────────────

CUISINE_CAROUSEL_CARDS = [
    {
        "title": "🇹🇼 台灣小吃",
        "cuisine": "taiwanese",
        "hero_bg": fx.CUISINE_HERO_TAIWANESE,
        "description": "滷肉飯、蚵仔煎、牛肉麵、珍珠奶茶…道地台灣味，家常好上手。",
        "display_text": "已為您切換至台灣小吃情境！",
    },
    {
        "title": "🇹🇭 泰式料理",
        "cuisine": "thai",
        "hero_bg": fx.CUISINE_HERO_THAI,
        "description": "酸辣開胃、香茅檸檬、打拋豬、綠咖哩，南洋風情一次滿足。",
        "display_text": "已為您切換至泰式料理情境！",
    },
    {
        "title": "🇯🇵 日式拉麵與定食",
        "cuisine": "japanese_ramen",
        "hero_bg": fx.CUISINE_HERO_JAPANESE,
        "description": "拉麵、丼飯、定食、壽司，日式職人精神，在家也能重現。",
        "display_text": "已為您切換至日式拉麵與定食情境！",
    },
    {
        "title": "🇪🇺 歐美家常菜",
        "cuisine": "european_american",
        "hero_bg": fx.CUISINE_HERO_EU,
        "description": "義大利麵、牛排、燉飯、烤雞，西式經典輕鬆上桌。",
        "display_text": "已為您切換至歐美家常菜情境！",
    },
    {
        "title": "👶 兒童專屬特餐",
        "cuisine": "kids_meal",
        "hero_bg": fx.CUISINE_HERO_KIDS,
        "description": "溫和不辣、好咀嚼、營養均衡，專為小朋友設計的安心料理。",
        "display_text": "已為您切換至兒童專屬特餐情境！",
    },
]


def _recipe_text_hero_block(recipe_name: str, theme: str) -> dict:
    """無真實成品圖時使用：避免 picsum 等隨機圖與菜名無關造成誤導。"""
    label = _safe_str(theme, "TODAY'S PICK", max_len=40).upper()
    name = _safe_str(recipe_name, "本日料理", max_len=60)
    return {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "xxl",
        "backgroundColor": fx.HERO_BLOCK_BG,
        "height": "200px",
        "justifyContent": "center",
        "alignItems": "center",
        "contents": [
            {"type": "text", "text": "🍽 今日提案", "size": "xs", "color": fx.HERO_KICKER, "weight": "bold"},
            {"type": "text", "text": label, "size": "xxs", "color": fx.HERO_SUB, "margin": "sm", "wrap": True, "align": "center"},
            {"type": "text", "text": name, "size": "xl", "weight": "bold", "color": fx.HERO_TITLE, "wrap": True, "align": "center", "margin": "md"},
            {"type": "text", "text": "（無主圖時：色塊標題為示意，非成品照）", "size": "xxs", "color": fx.HERO_SUB, "wrap": True, "align": "center"},
        ],
    }


def _build_cuisine_selector() -> FlexMessage:
    bubbles = [
        {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "paddingAll": "lg",
                "backgroundColor": fx.SURFACE_CARD,
                "contents": [
                    {"type": "text", "text": c["title"], "weight": "bold", "size": "xl", "color": fx.CUISINE_BODY_TITLE},
                    {"type": "text", "text": c["description"], "size": "sm", "color": fx.CUISINE_BODY_DESC, "wrap": True, "margin": "md"},
                ],
            },
            "hero": {
                "type": "box",
                "layout": "vertical",
                "paddingAll": "xxl",
                "backgroundColor": c["hero_bg"],
                "height": "200px",
                "justifyContent": "center",
                "alignItems": "center",
                "contents": [
                    {"type": "text", "text": "菜系情境", "size": "xs", "color": fx.CUISINE_HERO_LABEL, "weight": "bold"},
                    {"type": "text", "text": c["title"], "size": "xl", "weight": "bold", "color": fx.CUISINE_HERO_TITLE, "wrap": True, "align": "center", "margin": "md"},
                ],
            },
            "footer": {"type": "box", "layout": "vertical", "paddingAll": "lg", "backgroundColor": fx.PRIMARY_BG, "contents": [
                {"type": "button", "style": "primary", "color": fx.CUISINE_FOOTER_BTN, "action": {
                    "type": "postback", "label": "選擇此菜系",
                    "data": f"action=change_cuisine&cuisine={c['cuisine']}", "displayText": c["display_text"],
                }},
            ]},
        }
        for c in CUISINE_CAROUSEL_CARDS
    ]
    return FlexMessage(
        alt_text="請選擇您想探索的菜系",
        contents=FlexContainer.from_dict({"type": "carousel", "contents": bubbles}),
    )


CUISINE_SELECTOR_MSG = _build_cuisine_selector()


def get_main_menu_flex() -> FlexMessage:
    """Main menu with Dark Michelin action buttons."""
    menu_dict = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "lg",
            "contents": [
                {"type": "text", "text": "👨‍🍳 米其林職人服務", "weight": "bold", "size": "lg", "color": fx.MENU_HEADER_TEXT}
            ],
            "backgroundColor": fx.MENU_HEADER_BG,
        },
        "body": {
            "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "lg", "backgroundColor": fx.MENU_BODY_BG,
            "contents": [
                {
                    "type": "button", "style": "primary", "height": "sm", "color": fx.MENU_BTN_CUISINE,
                    "action": {"type": "message", "label": "🍱 各式菜色", "text": "換菜單"},
                },
                {
                    "type": "button", "style": "primary", "height": "sm", "color": fx.MENU_BTN_FRIDGE,
                    "action": {"type": "message", "label": "🏠 生活需求", "text": "清冰箱模式"},
                },
                {
                    "type": "button", "style": "primary", "height": "sm", "color": fx.MENU_BTN_BUDGET,
                    "action": {"type": "message", "label": "💰 預算方案", "text": "幫我規劃預算食譜"},
                },
                {
                    "type": "button", "style": "primary", "height": "sm", "color": fx.MENU_BTN_MOOD,
                    "action": {"type": "message", "label": "☁️ 心情點餐", "text": "我想根據心情點餐"},
                },
                {
                    "type": "button", "style": "secondary", "height": "sm", "color": fx.MENU_BTN_SECONDARY,
                    "action": {"type": "message", "label": "❤️ 我的最愛", "text": "我的最愛"},
                },
                {
                    "type": "button", "style": "secondary", "height": "sm", "color": fx.MENU_BTN_SECONDARY,
                    "action": {"type": "message", "label": "🛒 採買食材", "text": "🛒 檢視清單"},
                },
                {
                    "type": "button", "style": "secondary", "height": "sm", "color": fx.MENU_BTN_TERTIARY,
                    "action": {"type": "message", "label": "🔐 資料政策", "text": "隱私聲明"},
                },
            ],
        },
    }
    return FlexMessage(
        alt_text="開啟米其林職人菜單",
        contents=FlexContainer.from_dict(menu_dict),
    )


def generate_flex_message(
    kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost,
    recipe_name_for_postback: str | None = None,
    *,
    photo_url: str | None = None,
    video_url: str | None = None,
    step_preview_count: int = RECIPE_STEPS_PREVIEW_COUNT,
    recipe_lookup_ts: str | None = None,
) -> dict:
    """Build a recipe Flex Message bubble dict.

    ``photo_url`` / ``video_url`` should already be validated https URLs (see ``_flex_safe_https_url``).
    LINE Flex 不支援 bubble 內嵌影片播放器；影片以 footer 的 URI 按鈕開啟外部連結。
    """
    talk_components = []
    for talk in _parse_to_list(kitchen_talk):
        role = "團隊"
        content = str(talk)
        if isinstance(talk, dict):
            role = talk.get("role", talk.get("角色", "團隊"))
            content = talk.get("content", talk.get("內容", str(talk)))
        color = next((c for k, c in fx.ROLE_COLORS.items() if k in role), fx.ROLE_FALLBACK)
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(role, "團隊"), "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": _safe_str(content, "...", LINE_TEXT_MAX), "color": fx.TALK_CONTENT, "size": "sm", "wrap": True, "flex": 1},
            ],
        })

    ingredient_rows = [
        {
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(
                    item.get("name", item.get("食材", str(item))) if isinstance(item, dict) else str(item), "食材"
                ), "color": fx.ING_NAME, "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": _safe_str(
                    item.get("price", item.get("價格", "-")) if isinstance(item, dict) else "-", "-"
                ), "color": fx.ING_PRICE, "size": "sm", "weight": "bold", "align": "end", "flex": 0},
            ],
        }
        for item in _parse_to_list(ingredients)
    ]

    all_steps = _parse_to_list(steps)
    safe_step_preview_count = max(1, int(step_preview_count))
    visible_steps = all_steps[:safe_step_preview_count]
    has_hidden_steps = len(all_steps) > len(visible_steps)

    step_rows = [
        {
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": fx.STEP_NUM, "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": _safe_str(step, "進行中", LINE_TEXT_MAX).lstrip("0123456789. "), "color": fx.TITLE_PRIMARY, "size": "sm", "wrap": True, "flex": 1},
            ],
        }
        for i, step in enumerate(visible_steps)
    ]

    shop_rows = [{"type": "text", "text": f"• {_safe_str(s, '生鮮')}", "size": "sm", "color": fx.SHOP_BULLET, "margin": "sm"} for s in _parse_to_list(shopping_list)]
    favorite_action = (
        {"type": "postback", "label": "❤️ 收藏食譜", "data": f"save_recipe:{_safe_str(recipe_name_for_postback, '美味食譜')}"[:300]}
        if recipe_name_for_postback else {"type": "message", "label": "❤️ 收藏食譜", "text": "這套食譜很棒"}
    )

    safe_photo = _flex_safe_https_url(photo_url) if photo_url else None
    safe_video = _flex_safe_https_url(video_url) if video_url else None

    bubble: dict = {
        "type": "bubble", "size": "giga",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": fx.SURFACE_CARD,
            "contents": [
                *([] if safe_photo else [_recipe_text_hero_block(recipe_name, theme)]),
                {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": fx.ACCENT_TOP_STRIP, "contents": []},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg", "contents": [
                    {"type": "text", "text": _safe_str(theme, "RECOMMENDATION").upper(), "size": "xs", "color": fx.THEME_LABEL, "weight": "bold", "letterSpacing": "2px"},
                    {"type": "text", "text": _safe_str(recipe_name, "本日料理"), "size": "xxl", "weight": "bold", "color": fx.TITLE_PRIMARY, "margin": "md", "wrap": True},
                ]},
                {"type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": fx.PANEL_CONFERENCE_BG, "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "KITCHEN CONFERENCE", "size": "xxs", "weight": "bold", "color": fx.PANEL_CONFERENCE_LABEL, "margin": "xs"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": talk_components},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "contents": [
                    {"type": "text", "text": "SHOPPING LIST", "size": "xxs", "weight": "bold", "color": fx.SECTION_LABEL, "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows or [{"type": "text", "text": "全聯生鮮"}]},
                ]},
                {"type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": fx.PANEL_COST_OUTER_BG, "borderColor": fx.PANEL_COST_BORDER, "borderWidth": "1px", "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": fx.SECTION_LABEL, "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows or [{"type": "text", "text": "-"}]},
                    {"type": "separator", "margin": "xl", "color": fx.SEP_COLOR},
                    {"type": "box", "layout": "horizontal", "margin": "lg", "paddingAll": "md", "backgroundColor": fx.TOTAL_BAND_BG, "cornerRadius": "md", "contents": [
                        {"type": "text", "text": "TOTAL", "size": "sm", "weight": "bold", "color": fx.TOTAL_LABEL, "flex": 0},
                        {"type": "text", "text": f"NT$ {_safe_str(estimated_total_cost, '估算中')}", "size": "xxl", "weight": "bold", "color": fx.TITLE_PRIMARY, "align": "end"},
                    ]},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none", "contents": [
                    {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": fx.SECTION_LABEL, "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows or [{"type": "text", "text": "-"}]},
                    *(
                        [{
                            "type": "text",
                            "text": f"尚有 {len(all_steps) - len(visible_steps)} 步，點下方按鈕展開",
                            "size": "xxs",
                            "color": fx.MORE_STEPS_HINT,
                            "margin": "md",
                            "wrap": True,
                        }]
                        if has_hidden_steps else []
                    ),
                ]},
            ],
        },
        "footer": {
            "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "xl", "paddingTop": "none", "backgroundColor": fx.PRIMARY_BG,
            "contents": [
                {
                    "type": "box", "layout": "horizontal", "spacing": "md",
                    "contents": [
                        {"type": "button", "style": "secondary", "height": "sm", "color": fx.FOOTER_BTN_SECONDARY, "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                        {"type": "button", "style": "primary", "height": "sm", "color": fx.FOOTER_BTN_FAVORITE, "action": favorite_action},
                    ],
                },
                {
                    "type": "text",
                    "text": "食譜僅供參考，請留意過敏原與食安條件。",
                    "size": "xxs",
                    "color": fx.FOOTER_DISCLAIMER,
                    "wrap": True,
                },
            ],
        },
    }

    if safe_photo:
        bubble["hero"] = {
            "type": "image",
            "url": safe_photo,
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover",
        }

    footer_contents = bubble["footer"]["contents"]
    if safe_video:
        footer_contents.insert(
            0,
            {
                "type": "button",
                "style": "primary",
                "height": "sm",
                "color": fx.VIDEO_BTN,
                "action": {
                    "type": "uri",
                    "label": "▶ 教學影片",
                    "uri": safe_video,
                },
            },
        )

    if has_hidden_steps and recipe_name_for_postback:
        expand_data = f"action=expand_steps&name={urllib.parse.quote(_safe_str(recipe_name_for_postback, '美味食譜'), safe='')}"
        if recipe_lookup_ts:
            expand_data += f"&ts={urllib.parse.quote(recipe_lookup_ts, safe='')}"
        footer_contents.insert(
            0,
            {
                "type": "button",
                "style": "secondary",
                "height": "sm",
                "color": fx.EXPAND_BTN_BG,
                "action": {
                    "type": "postback",
                    "label": "展開完整步驟",
                    "data": expand_data[:300],
                    "displayText": f"展開「{_safe_str(recipe_name_for_postback, '美味食譜', max_len=24)}」完整步驟",
                },
            },
        )

    if recipe_name_for_postback:
        generate_poster_data = (
            f"action=generate_recipe_poster&name="
            f"{urllib.parse.quote(_safe_str(recipe_name_for_postback, '美味食譜'), safe='')}"
        )
        if recipe_lookup_ts:
            generate_poster_data += f"&ts={urllib.parse.quote(recipe_lookup_ts, safe='')}"
        footer_contents.insert(
            0,
            {
                "type": "button",
                "style": "secondary",
                "height": "sm",
                "color": fx.EXPAND_BTN_BG,
                "action": {
                    "type": "postback",
                    "label": "🖼 生成食譜海報",
                    "data": generate_poster_data[:300],
                    "displayText": f"幫「{_safe_str(recipe_name_for_postback, '美味食譜', max_len=24)}」生成食譜海報",
                },
            },
        )

        generate_image_data = (
            f"action=generate_recipe_image&name="
            f"{urllib.parse.quote(_safe_str(recipe_name_for_postback, '美味食譜'), safe='')}"
        )
        if recipe_lookup_ts:
            generate_image_data += f"&ts={urllib.parse.quote(recipe_lookup_ts, safe='')}"
        footer_contents.insert(
            0,
            {
                "type": "button",
                "style": "secondary",
                "height": "sm",
                "color": fx.EXPAND_BTN_BG,
                "action": {
                    "type": "postback",
                    "label": "🖼 生成主圖",
                    "data": generate_image_data[:300],
                    "displayText": f"幫「{_safe_str(recipe_name_for_postback, '美味食譜', max_len=24)}」生成主圖",
                },
            },
        )

    safe_legal_disclaimer = _flex_safe_https_url(LEGAL_DISCLAIMER_URL)
    safe_legal_privacy = _flex_safe_https_url(LEGAL_PRIVACY_URL)
    if safe_legal_disclaimer:
        footer_contents.append(
            {
                "type": "button",
                "style": "link",
                "height": "sm",
                "color": fx.SECONDARY_TEXT,
                "action": {
                    "type": "uri",
                    "label": "完整免責聲明",
                    "uri": safe_legal_disclaimer,
                },
            }
        )
    if safe_legal_privacy:
        footer_contents.append(
            {
                "type": "button",
                "style": "link",
                "height": "sm",
                "color": fx.SECONDARY_TEXT,
                "action": {
                    "type": "uri",
                    "label": "隱私政策",
                    "uri": safe_legal_privacy,
                },
            }
        )

    return bubble


# ─── Favorites carousel ─────────────────────────────────────────────────────────

def build_favorites_carousel(favorites: list[dict]) -> FlexMessage:
    """Build a Flex carousel showing up to 10 saved favorite recipes."""
    bubbles = []
    for fav in favorites[:10]:
        recipe_name = fav.get("recipe_name", "未命名食譜")
        recipe_data = fav.get("recipe_data") or {}
        recipe_id = fav.get("id", 0)
        cost = recipe_data.get("estimated_total_cost", "—")
        theme = recipe_data.get("theme", "收藏食譜")
        ingredients = recipe_data.get("ingredients", [])
        ingredient_preview = "、".join(
            (item.get("name", str(item)) if isinstance(item, dict) else str(item))
            for item in ingredients[:4]
        )
        if len(ingredients) > 4:
            ingredient_preview += f" 等{len(ingredients)}項"

        bubble = {
            "type": "bubble",
            "size": "kilo",
            "body": {
                "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "lg", "backgroundColor": fx.SURFACE_CARD,
                "contents": [
                    {"type": "text", "text": _safe_str(theme, "收藏").upper(), "size": "xxs", "color": fx.FAV_THEME_LABEL, "weight": "bold"},
                    {"type": "text", "text": _safe_str(recipe_name, "美味食譜"), "size": "lg", "weight": "bold", "color": fx.FAV_TITLE, "wrap": True},
                    {"type": "text", "text": f"食材：{ingredient_preview or '—'}", "size": "xs", "color": fx.FAV_ING, "wrap": True, "margin": "md"},
                    {"type": "box", "layout": "horizontal", "margin": "lg", "contents": [
                        {"type": "text", "text": "預估花費", "size": "xs", "color": fx.FAV_COST_LABEL, "flex": 1},
                        {"type": "text", "text": f"NT$ {_safe_str(cost, '—')}", "size": "md", "weight": "bold", "color": fx.FAV_TITLE, "align": "end"},
                    ]},
                ],
            },
            "footer": {
                "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "md", "backgroundColor": fx.PRIMARY_BG,
                "contents": [
                    {
                        "type": "button", "style": "primary", "height": "sm", "color": fx.FAV_REDO_BTN,
                        "action": {
                            "type": "postback",
                            "label": "🔄 再做一次",
                            "data": f"action=redo_recipe&name={recipe_name}"[:300],
                            "displayText": f"再做一次「{recipe_name}」",
                        },
                    },
                    {
                        "type": "button", "style": "secondary", "height": "sm", "color": fx.MENU_BTN_SECONDARY,
                        "action": {
                            "type": "postback",
                            "label": "🗑️ 刪除收藏",
                            "data": f"action=delete_favorite&id={recipe_id}",
                        },
                    },
                ],
            },
        }
        bubbles.append(bubble)

    return FlexMessage(
        alt_text=f"您收藏了 {len(bubbles)} 道食譜",
        contents=FlexContainer.from_dict({"type": "carousel", "contents": bubbles}),
    )


# ─── Fallback Flex for failed AI parse ──────────────────────────────────────────

def build_fallback_recipe_flex(raw_text: str) -> FlexMessage:
    """Create a simple Flex Message from raw AI text when JSON parsing fails."""
    raw = (raw_text or "").strip()
    looks_like_json = raw.startswith("{") and '"kitchen_talk"' in raw[:800]

    # Try to extract a title from the text
    title = "AI 料理建議"
    if looks_like_json:
        title = "回應被截斷或格式不完整"
    lines = raw.split("\n")
    if lines:
        first_line = lines[0].strip()[:50]
        if first_line and not looks_like_json:
            title = first_line

    hint = (
        "模型回傳的 JSON 可能因長度被截斷。請點「再試一次」或輸入「清除記憶」後重說需求；"
        "我們已自動提高長度上限並加入重試。"
        if looks_like_json
        else "⚠️ 格式略有不同，但內容仍可參考："
    )
    # 勿把整段 JSON 塞進 Flex（難讀且易超長）；僅顯示開頭片段供進階使用者對照
    if looks_like_json:
        snippet = raw[:420] + ("…" if len(raw) > 420 else "")
        body_text = f"技術摘要（前幾百字）：\n{snippet}"
    else:
        body_text = raw[:LINE_TEXT_MAX] if len(raw) > LINE_TEXT_MAX else raw

    bubble = {
        "type": "bubble",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "xl", "backgroundColor": fx.SURFACE_CARD,
            "contents": [
                {"type": "box", "layout": "vertical", "height": "4px", "backgroundColor": fx.FALLBACK_STRIP, "contents": []},
                {"type": "text", "text": title, "size": "lg", "weight": "bold", "color": fx.FALLBACK_TITLE, "margin": "lg", "wrap": True},
                {"type": "text", "text": hint, "size": "xs", "color": fx.FALLBACK_HINT, "margin": "md", "wrap": True},
                {"type": "text", "text": body_text, "size": "sm", "color": fx.FALLBACK_BODY, "wrap": True, "margin": "lg"},
            ],
        },
        "footer": {
            "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "lg", "backgroundColor": fx.PRIMARY_BG,
            "contents": [
                {"type": "button", "style": "secondary", "height": "sm", "color": fx.MENU_BTN_SECONDARY, "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                {"type": "button", "style": "primary", "height": "sm", "color": fx.FOOTER_BTN_FAVORITE, "action": {"type": "message", "label": "再試一次", "text": "再來一道"}},
            ],
        },
    }
    return FlexMessage(alt_text=title, contents=FlexContainer.from_dict(bubble))
