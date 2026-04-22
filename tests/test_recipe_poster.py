from __future__ import annotations

import os

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app import recipe_poster  # noqa: E402


def test_render_recipe_poster_png_returns_png_bytes():
    recipe = {
        "recipe_name": "辣炒杏鮑菇高麗菜",
        "theme": "香辣下飯",
        "ingredients": [
            {"name": "杏鮑菇", "price": "NT$45"},
            {"name": "高麗菜", "price": "NT$35"},
        ],
        "steps": ["切好食材", "先炒杏鮑菇", "下高麗菜", "調味後起鍋"],
        "shopping_list": ["蔬菜：高麗菜", "菇類：杏鮑菇"],
        "estimated_total_cost": "80",
    }
    png = recipe_poster.render_recipe_poster_png(recipe)
    assert isinstance(png, bytes)
    assert png.startswith(b"\x89PNG\r\n\x1a\n")


def test_render_recipe_poster_png_handles_missing_optional_fields():
    recipe = {
        "recipe_name": "超長超長超長超長超長超長菜名測試版本",
        "steps": [
            "這是一個非常長的步驟描述，需要自動換行並且不能把整張圖撐壞。",
            "第二步也要正常顯示。",
        ],
    }
    png = recipe_poster.render_recipe_poster_png(recipe)
    assert png.startswith(b"\x89PNG\r\n\x1a\n")
