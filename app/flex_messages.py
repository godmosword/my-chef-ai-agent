"""LINE Flex Message builders for recipe cards, menus, carousels, and favorites."""
from __future__ import annotations

from linebot.v3.messaging import FlexContainer, FlexMessage

from app.config import ROLE_COLORS, CUISINE_LABELS, LINE_TEXT_MAX
from app.helpers import _safe_str, _parse_to_list


# ─── Cuisine carousel data ──────────────────────────────────────────────────────

CUISINE_CAROUSEL_CARDS = [
    {
        "title": "🇹🇼 台灣小吃",
        "cuisine": "taiwanese",
        "image_url": "https://placehold.co/400x300/EA580C/FFFFFF?text=%F0%9F%87%B9%F0%9F%87%BC+%E5%8F%B0%E7%81%A3%E5%B0%8F%E5%90%83",
        "description": "滷肉飯、蚵仔煎、牛肉麵、珍珠奶茶…道地台灣味，家常好上手。",
        "display_text": "已為您切換至台灣小吃情境！",
    },
    {
        "title": "🇹🇭 泰式料理",
        "cuisine": "thai",
        "image_url": "https://placehold.co/400x300/166534/FFFFFF?text=%F0%9F%87%B9%F0%9F%87%AD+%E6%B3%B0%E5%BC%8F%E6%96%99%E7%90%86",
        "description": "酸辣開胃、香茅檸檬、打拋豬、綠咖哩，南洋風情一次滿足。",
        "display_text": "已為您切換至泰式料理情境！",
    },
    {
        "title": "🇯🇵 日式拉麵與定食",
        "cuisine": "japanese_ramen",
        "image_url": "https://placehold.co/400x300/9F1239/FFFFFF?text=%F0%9F%87%AF%F0%9F%87%B5+%E6%97%A5%E5%BC%8F%E6%8B%89%E9%BA%B5",
        "description": "拉麵、丼飯、定食、壽司，日式職人精神，在家也能重現。",
        "display_text": "已為您切換至日式拉麵與定食情境！",
    },
    {
        "title": "🇪🇺 歐美家常菜",
        "cuisine": "european_american",
        "image_url": "https://placehold.co/400x300/1E40AF/FFFFFF?text=%F0%9F%87%AA%F0%9F%87%BA+%E6%AD%90%E7%BE%8E%E5%AE%B6%E5%B8%B8%E8%8F%9C",
        "description": "義大利麵、牛排、燉飯、烤雞，西式經典輕鬆上桌。",
        "display_text": "已為您切換至歐美家常菜情境！",
    },
    {
        "title": "👶 兒童專屬特餐",
        "cuisine": "kids_meal",
        "image_url": "https://placehold.co/400x300/F59E0B/FFFFFF?text=%F0%9F%91%B6+%E5%85%92%E7%AB%A5%E5%B0%88%E5%B1%AC%E7%89%B9%E9%A4%90",
        "description": "溫和不辣、好咀嚼、營養均衡，專為小朋友設計的安心料理。",
        "display_text": "已為您切換至兒童專屬特餐情境！",
    },
]


def _build_cuisine_selector() -> FlexMessage:
    bubbles = [
        {
            "type": "bubble",
            "hero": {"type": "image", "url": c["image_url"], "size": "full", "aspectRatio": "20:13", "aspectMode": "cover"},
            "body": {"type": "box", "layout": "vertical", "contents": [
                {"type": "text", "text": c["title"], "weight": "bold", "size": "xl", "color": "#1F2937"},
                {"type": "text", "text": c["description"], "size": "sm", "color": "#6B7280", "wrap": True, "margin": "md"},
            ]},
            "footer": {"type": "box", "layout": "vertical", "contents": [
                {"type": "button", "style": "primary", "color": "#EA580C", "action": {
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
    """Main menu with core action buttons."""
    menu_dict = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": "👨‍🍳 米其林職人服務", "weight": "bold", "color": "#FFFFFF"}
            ],
            "backgroundColor": "#EA580C"
        },
        "body": {
            "type": "box", "layout": "vertical", "spacing": "md",
            "contents": [
                {
                    "type": "button", "style": "primary", "color": "#9F1239",
                    "action": {"type": "message", "label": "🍱 各式菜色", "text": "換菜單"},
                },
                {
                    "type": "button", "style": "primary", "color": "#B45309",
                    "action": {"type": "message", "label": "🏠 生活需求", "text": "清冰箱模式"},
                },
                {
                    "type": "button", "style": "primary", "color": "#166534",
                    "action": {"type": "message", "label": "💰 預算方案", "text": "幫我規劃預算食譜"},
                },
                {
                    "type": "button", "style": "primary", "color": "#1E40AF",
                    "action": {"type": "message", "label": "☁️ 心情點餐", "text": "我想根據心情點餐"},
                },
                {
                    "type": "button", "style": "secondary",
                    "action": {"type": "message", "label": "❤️ 我的最愛", "text": "我的最愛"},
                },
                {
                    "type": "button", "style": "secondary",
                    "action": {"type": "message", "label": "🛒 採買食材", "text": "🛒 檢視清單"},
                },
                {
                    "type": "button", "style": "secondary",
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
) -> dict:
    """Build a recipe Flex Message bubble dict."""
    talk_components = []
    for talk in _parse_to_list(kitchen_talk):
        role = "團隊"
        content = str(talk)
        if isinstance(talk, dict):
            role = talk.get("role", talk.get("角色", "團隊"))
            content = talk.get("content", talk.get("內容", str(talk)))
        color = next((c for k, c in ROLE_COLORS.items() if k in role), "#78350F")
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(role, "團隊"), "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": _safe_str(content, "...", LINE_TEXT_MAX), "color": "#431407", "size": "sm", "wrap": True, "flex": 1},
            ],
        })

    ingredient_rows = [
        {
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": _safe_str(
                    item.get("name", item.get("食材", str(item))) if isinstance(item, dict) else str(item), "食材"
                ), "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": _safe_str(
                    item.get("price", item.get("價格", "-")) if isinstance(item, dict) else "-", "-"
                ), "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0},
            ],
        }
        for item in _parse_to_list(ingredients)
    ]

    step_rows = [
        {
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": _safe_str(step, "進行中", LINE_TEXT_MAX).lstrip("0123456789. "), "color": "#431407", "size": "sm", "wrap": True, "flex": 1},
            ],
        }
        for i, step in enumerate(_parse_to_list(steps))
    ]

    shop_rows = [{"type": "text", "text": f"• {_safe_str(s, '生鮮')}", "size": "sm", "color": "#78350F", "margin": "sm"} for s in _parse_to_list(shopping_list)]
    favorite_action = (
        {"type": "postback", "label": "❤️ 收藏食譜", "data": f"save_recipe:{_safe_str(recipe_name_for_postback, '美味食譜')}"[:300]}
        if recipe_name_for_postback else {"type": "message", "label": "❤️ 收藏食譜", "text": "這套食譜很棒"}
    )

    return {
        "type": "bubble", "size": "giga",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
            "contents": [
                {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg", "contents": [
                    {"type": "text", "text": _safe_str(theme, "RECOMMENDATION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
                    {"type": "text", "text": _safe_str(recipe_name, "本日料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True},
                ]},
                {"type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "KITCHEN CONFERENCE", "size": "xxs", "weight": "bold", "color": "#B45309", "margin": "xs"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": talk_components},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "contents": [
                    {"type": "text", "text": "SHOPPING LIST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows or [{"type": "text", "text": "全聯生鮮"}]},
                ]},
                {"type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg", "contents": [
                    {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows or [{"type": "text", "text": "-"}]},
                    {"type": "separator", "margin": "xl", "color": "#FED7AA"},
                    {"type": "box", "layout": "horizontal", "margin": "lg", "contents": [
                        {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#9A3412", "flex": 0},
                        {"type": "text", "text": f"NT$ {_safe_str(estimated_total_cost, '估算中')}", "size": "xl", "weight": "bold", "color": "#431407", "align": "end"},
                    ]},
                ]},
                {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none", "contents": [
                    {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
                    {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows or [{"type": "text", "text": "-"}]},
                ]},
            ],
        },
        "footer": {
            "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
            "contents": [
                {
                    "type": "box", "layout": "horizontal", "spacing": "md",
                    "contents": [
                        {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                        {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": favorite_action},
                    ],
                },
                {
                    "type": "text",
                    "text": "食譜僅供參考，請留意過敏原與食安條件。",
                    "size": "xxs",
                    "color": "#92400E",
                    "wrap": True,
                },
            ],
        },
    }


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
                "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "lg",
                "contents": [
                    {"type": "text", "text": _safe_str(theme, "收藏").upper(), "size": "xxs", "color": "#D97706", "weight": "bold"},
                    {"type": "text", "text": _safe_str(recipe_name, "美味食譜"), "size": "lg", "weight": "bold", "color": "#431407", "wrap": True},
                    {"type": "text", "text": f"食材：{ingredient_preview or '—'}", "size": "xs", "color": "#78350F", "wrap": True, "margin": "md"},
                    {"type": "box", "layout": "horizontal", "margin": "lg", "contents": [
                        {"type": "text", "text": "預估花費", "size": "xs", "color": "#9A3412", "flex": 1},
                        {"type": "text", "text": f"NT$ {_safe_str(cost, '—')}", "size": "md", "weight": "bold", "color": "#431407", "align": "end"},
                    ]},
                ],
            },
            "footer": {
                "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "md",
                "contents": [
                    {
                        "type": "button", "style": "primary", "height": "sm", "color": "#EA580C",
                        "action": {
                            "type": "postback",
                            "label": "🔄 再做一次",
                            "data": f"action=redo_recipe&name={recipe_name}"[:300],
                            "displayText": f"再做一次「{recipe_name}」",
                        },
                    },
                    {
                        "type": "button", "style": "secondary", "height": "sm",
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
    # Try to extract a title from the text
    title = "AI 料理建議"
    lines = raw_text.strip().split("\n")
    if lines:
        first_line = lines[0].strip()[:50]
        if first_line:
            title = first_line

    # Truncate body
    body_text = raw_text[:LINE_TEXT_MAX] if len(raw_text) > LINE_TEXT_MAX else raw_text

    bubble = {
        "type": "bubble",
        "body": {
            "type": "box", "layout": "vertical", "paddingAll": "xl",
            "contents": [
                {"type": "box", "layout": "vertical", "height": "4px", "backgroundColor": "#F59E0B", "contents": []},
                {"type": "text", "text": title, "size": "lg", "weight": "bold", "color": "#431407", "margin": "lg", "wrap": True},
                {"type": "text", "text": "⚠️ 格式略有不同，但內容仍可參考：", "size": "xs", "color": "#B45309", "margin": "md"},
                {"type": "text", "text": body_text, "size": "sm", "color": "#431407", "wrap": True, "margin": "lg"},
            ],
        },
        "footer": {
            "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "lg",
            "contents": [
                {"type": "button", "style": "secondary", "height": "sm", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
                {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": {"type": "message", "label": "再試一次", "text": "再來一道"}},
            ],
        },
    }
    return FlexMessage(alt_text=title, contents=FlexContainer.from_dict(bubble))
