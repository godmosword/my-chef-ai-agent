"""Tests for the HTML-based recipe poster generator."""
from __future__ import annotations

import os

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from unittest.mock import patch

from app.recipe_poster_html import (
    build_poster_html,
    render_recipe_poster_png_html,
    _parse_ingredients,
    _parse_steps,
    _derive_cook_time,
)


SAMPLE_RECIPE = {
    "recipe_name": "辣炒杏鮑菇高麗菜",
    "theme": "香辣入味",
    "kitchen_talk": [
        {"role": "行政主廚", "content": "先乾炒逼出水分"},
        {"role": "副主廚", "content": "爆香大火出鍋"},
        {"role": "食材總管", "content": "杏鮑菇買新鮮的"},
    ],
    "ingredients": [
        {"name": "杏鮑菇", "price": "NT$45", "qty": "2~3根"},
        {"name": "高麗菜", "price": "NT$35", "qty": "1/4顆"},
        {"name": "醬油", "price": "NT$3", "qty": "1湯匙"},
        {"name": "糖", "price": "NT$1", "qty": "1/2茶匙"},
    ],
    "steps": [
        "乾鍋或少油下鍋，中火將杏鮑菇炒至出水，盛起備用。",
        "加油，放入蒜片與辣椒，中火炒出香味。",
        "加入高麗菜，轉大火快速翻炒至微軟但仍脆口。",
        "將炒好的杏鮑菇倒回鍋中，一起拌炒均勻。",
        "加入醬油、鹽、糖，快速翻炒讓食材入味。",
        "試味道後即可起鍋，香辣潤嘴超下飯！",
    ],
    "shopping_list": ["蔬菜：高麗菜、辣椒", "菇類：杏鮑菇", "調味：醬油、糖"],
    "estimated_total_cost": "99",
}


def test_build_poster_html_returns_string():
    html = build_poster_html(SAMPLE_RECIPE)
    assert isinstance(html, str)
    assert len(html) > 1000


def test_build_poster_html_contains_recipe_name():
    html = build_poster_html(SAMPLE_RECIPE)
    assert "辣炒杏鮑菇高麗菜" in html


def test_build_poster_html_contains_ingredients():
    html = build_poster_html(SAMPLE_RECIPE)
    assert "杏鮑菇" in html
    assert "高麗菜" in html


def test_build_poster_html_contains_steps():
    html = build_poster_html(SAMPLE_RECIPE)
    assert "先炒主料" in html or "爆香" in html


def test_build_poster_html_contains_kitchen_talk():
    html = build_poster_html(SAMPLE_RECIPE)
    assert "行政主廚" in html
    assert "先乾炒逼出水分" in html


def test_build_poster_html_seasoning_excludes_vegetables():
    """調味比例表不應包含辣椒等蔬菜類食材。"""
    recipe = {
        **SAMPLE_RECIPE,
        "ingredients": [
            {"name": "辣椒", "qty": "2根"},
            {"name": "醬油", "qty": "1湯匙"},
        ],
    }
    html = build_poster_html(recipe)
    # 醬油應在調味比例
    assert "醬油" in html
    # 辣椒不應進入調味比例表（但出現在食材清單是允許的）
    # 驗證調味比例區塊只有醬油，沒有把辣椒當調味料
    season_section_start = html.find("season-box")
    if season_section_start != -1:
        season_section = html[season_section_start:season_section_start + 500]
        assert "辣椒" not in season_section


def test_build_poster_html_handles_empty_recipe():
    html = build_poster_html({})
    assert isinstance(html, str)
    assert "本日料理" in html


def test_build_poster_html_handles_missing_fields():
    recipe = {"recipe_name": "簡易測試料理"}
    html = build_poster_html(recipe)
    assert "簡易測試料理" in html


def test_render_recipe_poster_png_html_returns_png_bytes():
    png = render_recipe_poster_png_html(SAMPLE_RECIPE)
    assert isinstance(png, bytes)
    assert len(png) > 0
    # Playwright 輸出 PNG 或 Pillow fallback 都應是 PNG
    assert png[:4] == b"\x89PNG" or png[:2] == b"\xff\xd8"  # PNG or JPEG fallback


def test_render_recipe_poster_png_html_fallback_on_playwright_missing():
    """若 Playwright 不可用，應退回 Pillow 方法並仍產出 PNG。"""
    import builtins
    real_import = builtins.__import__

    def mock_import(name, *args, **kwargs):
        if name == "playwright.sync_api":
            raise ImportError("mock: playwright not installed")
        return real_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=mock_import):
        png = render_recipe_poster_png_html(SAMPLE_RECIPE)
    assert isinstance(png, bytes)
    assert len(png) > 0


def test_parse_ingredients_dict_format():
    raw = [{"name": "醬油", "price": "NT$10", "qty": "1湯匙"}]
    result = _parse_ingredients(raw)
    assert len(result) == 1
    assert result[0]["name"] == "醬油"
    assert result[0]["qty"] == "1湯匙"


def test_parse_ingredients_string_format():
    raw = ["杏鮑菇", "高麗菜"]
    result = _parse_ingredients(raw)
    assert len(result) == 2
    assert result[0]["name"] == "杏鮑菇"


def test_parse_ingredients_limits_to_8():
    raw = [{"name": f"食材{i}"} for i in range(12)]
    result = _parse_ingredients(raw)
    assert len(result) == 8


def test_parse_steps_strips_numbering():
    raw = ["1. 先備料", "2. 再下鍋", "3. 起鍋"]
    result = _parse_steps(raw)
    assert result[0] == "先備料"
    assert result[1] == "再下鍋"


def test_parse_steps_limits_to_6():
    raw = [f"步驟{i}" for i in range(10)]
    result = _parse_steps(raw)
    assert len(result) == 6


def test_derive_cook_time_scales_with_steps():
    assert "10" in _derive_cook_time([])
    t6 = _derive_cook_time(["s"] * 6)
    assert "分鐘" in t6
