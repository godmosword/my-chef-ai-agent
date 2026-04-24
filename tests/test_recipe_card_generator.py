from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.recipe_card_generator import (
    CANVAS_H,
    CANVAS_W,
    RecipeCardData,
    build_base_image_prompt,
    compose_recipe_card,
    recipe_card_data_from_recipe_json,
)


def _sample_recipe() -> RecipeCardData:
    return RecipeCardData.from_dict(
        {
            "title": "辣炒杏鮑菇高麗菜",
            "subtitle": "香辣入味・脆口下飯・10分鐘上桌！",
            "serving": "2人份",
            "ingredients": ["杏鮑菇", "高麗菜", "蒜頭", "辣椒"],
            "prep": [
                {"name": "杏鮑菇", "note": "切片"},
                {"name": "高麗菜", "note": "手撕"},
            ],
            "steps": [
                {"title": "先炒杏鮑菇", "description": "中火炒到微金黃"},
                {"title": "爆香", "description": "蒜片與辣椒炒香"},
                {"title": "下高麗菜", "description": "大火快炒"},
                {"title": "放回杏鮑菇", "description": "拌炒均勻"},
                {"title": "調味", "description": "醬油鹽糖"},
                {"title": "起鍋", "description": "試味道後起鍋"},
            ],
            "tips": ["大火快炒", "可加米酒"],
            "seasoning": ["醬油1湯匙", "鹽少許"],
            "cookTime": "約10分鐘",
        }
    )


def test_build_base_image_prompt_contains_key_hints() -> None:
    recipe = _sample_recipe()
    prompt = build_base_image_prompt(recipe)
    assert "visual structure only" in prompt.lower()
    assert recipe.title in prompt
    assert "no watermark" in prompt.lower()


def test_recipe_card_data_maps_shopping_list_dicts_to_tip_lines() -> None:
    mapped = recipe_card_data_from_recipe_json(
        {
            "recipe_name": "測試料理",
            "theme": "家常",
            "ingredients": ["蛋"],
            "steps": ["打散"],
            "tips": [],
            "shopping_list": [
                {"name": "雞蛋", "amount": "3顆"},
                {"item": "青蔥", "qty": "2根"},
            ],
        }
    )
    assert mapped.tips == ["雞蛋 3顆", "青蔥 2根"]


def test_recipe_card_data_prefers_explicit_tips_over_shopping_list() -> None:
    mapped = recipe_card_data_from_recipe_json(
        {
            "recipe_name": "測試",
            "ingredients": [],
            "steps": [],
            "tips": ["先熱鍋"],
            "shopping_list": [{"name": "忽略", "amount": "x"}],
        }
    )
    assert mapped.tips == ["先熱鍋"]


def test_compose_recipe_card_outputs_png(tmp_path: Path) -> None:
    recipe = _sample_recipe()
    base_path = tmp_path / "base.png"
    Image.new("RGB", (1200, 1500), (246, 241, 232)).save(base_path)

    final_path = compose_recipe_card(recipe=recipe, base_image_path=str(base_path), output_path=str(tmp_path / "final.png"))
    assert Path(final_path).exists()

    out = Image.open(final_path)
    assert out.size == (CANVAS_W, CANVAS_H)


def test_compose_recipe_card_optional_hero_embed(tmp_path: Path) -> None:
    recipe = _sample_recipe()
    base_path = tmp_path / "base.png"
    Image.new("RGB", (1200, 1500), (246, 241, 232)).save(base_path)
    hero_path = tmp_path / "hero.png"
    Image.new("RGB", (200, 200), (200, 40, 40)).save(hero_path)

    final_path = compose_recipe_card(
        recipe=recipe,
        base_image_path=str(base_path),
        output_path=str(tmp_path / "final-hero.png"),
        hero_image_path=str(hero_path),
    )
    assert Path(final_path).exists()
    out = Image.open(final_path)
    assert out.size == (CANVAS_W, CANVAS_H)
    # Hero is top-right; expect non-background red tint in that region
    px = out.getpixel((900, 120))
    assert px[0] > px[2]
