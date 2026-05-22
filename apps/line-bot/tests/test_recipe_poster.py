from __future__ import annotations

import os
from io import BytesIO
from unittest.mock import Mock

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from PIL import Image

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


def test_render_recipe_poster_png_falls_back_when_no_cjk_font(monkeypatch):
    monkeypatch.setattr(recipe_poster, "FONT_CANDIDATES", [])
    recipe = {
        "recipe_name": "CI 字型 fallback 測試",
        "steps": ["先備料", "再下鍋"],
    }
    png = recipe_poster.render_recipe_poster_png(recipe)
    assert png.startswith(b"\x89PNG\r\n\x1a\n")


def test_render_recipe_poster_png_uses_dark_michelin_palette():
    recipe = {
        "recipe_name": "暗色主題測試",
        "theme": "Michelin",
        "steps": ["先備料", "再下鍋"],
    }
    png = recipe_poster.render_recipe_poster_png(recipe)
    image = Image.open(BytesIO(png))
    assert image.getpixel((8, 8)) == recipe_poster.BG
    assert image.getpixel((60, 60)) == recipe_poster.CARD


def test_render_recipe_poster_png_pastes_photo_when_photo_url_provided(monkeypatch):
    recipe = {
        "recipe_name": "附圖海報測試",
        "theme": "Michelin",
        "steps": ["先備料", "再下鍋"],
        "photo_url": "https://app.example.com/hero.png",
    }
    fetch_mock = Mock(return_value=Image.new("RGB", (640, 480), (12, 34, 56)))
    monkeypatch.setattr(recipe_poster, "_fetch_recipe_photo", fetch_mock)

    png = recipe_poster.render_recipe_poster_png(recipe)

    fetch_mock.assert_called_once_with("https://app.example.com/hero.png")
    image = Image.open(BytesIO(png))
    assert image.getpixel((900, 180)) == (12, 34, 56)
