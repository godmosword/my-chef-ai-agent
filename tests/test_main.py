"""
單元測試：涵蓋所有不依賴外部服務的純函式。
在 import main 之前先設定假環境變數，確保 _require_env 不會在測試時報錯。
"""
import json
import os
import pytest

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET",       "test_secret")
os.environ.setdefault("GEMINI_API_KEY",            "test_key")

from main import (
    _safe_str,
    _parse_to_list,
    _extract_json,
    generate_flex_message,
    get_user_memory,
    save_user_memory,
    clear_user_memory,
)
from app import flex_theme
from app.flex_messages import build_fallback_recipe_flex
import app.flex_messages as flex_messages
from app.helpers import _flex_safe_https_url


# ─── _safe_str ───────────────────────────────────────────────────────────────────

class TestSafeStr:
    def test_normal_string_returned_as_is(self):
        assert _safe_str("番茄牛腩") == "番茄牛腩"

    def test_empty_string_returns_fallback(self):
        assert _safe_str("") == "-"

    def test_whitespace_only_returns_fallback(self):
        assert _safe_str("   ") == "-"

    def test_none_value_returns_fallback(self):
        assert _safe_str("None") == "-"

    def test_null_string_returns_fallback(self):
        assert _safe_str("null") == "-"

    def test_empty_dict_string_returns_fallback(self):
        assert _safe_str("{}") == "-"

    def test_empty_list_string_returns_fallback(self):
        assert _safe_str("[]") == "-"

    def test_custom_fallback(self):
        assert _safe_str("", fallback="未填寫") == "未填寫"

    def test_strips_surrounding_whitespace(self):
        assert _safe_str("  牛肉  ") == "牛肉"


# ─── _parse_to_list ──────────────────────────────────────────────────────────────

class TestParseToList:
    def test_list_returned_unchanged(self):
        data = [{"role": "主廚", "content": "好的"}]
        assert _parse_to_list(data) == data

    def test_dict_wrapped_in_list(self):
        data = {"name": "番茄", "price": "30"}
        assert _parse_to_list(data) == [data]

    def test_none_returns_empty_list(self):
        assert _parse_to_list(None) == []

    def test_empty_string_returns_empty_list(self):
        assert _parse_to_list("") == []

    def test_multiline_string_split_by_newline(self):
        result = _parse_to_list("步驟一\n步驟二\n步驟三")
        assert result == ["步驟一", "步驟二", "步驟三"]

    def test_json_like_string_parsed_to_list(self):
        result = _parse_to_list('[{"name": "洋蔥"}]')
        assert result == [{"name": "洋蔥"}]

    def test_arbitrary_value_wrapped_in_list(self):
        assert _parse_to_list(42) == ["42"]


# ─── _extract_json ───────────────────────────────────────────────────────────────

class TestExtractJson:
    def test_clean_json_extracted(self):
        text = '{"recipe_name": "番茄炒蛋", "theme": "家常"}'
        result = _extract_json(text)
        assert result["recipe_name"] == "番茄炒蛋"

    def test_json_with_surrounding_text(self):
        text = '好的，以下是食譜：{"recipe_name": "牛腩麵"} 請享用！'
        result = _extract_json(text)
        assert result["recipe_name"] == "牛腩麵"

    def test_nested_json_parsed_correctly(self):
        text = '{"kitchen_talk": [{"role": "行政主廚", "content": "開始"}], "theme": "法式"}'
        result = _extract_json(text)
        assert result["kitchen_talk"][0]["role"] == "行政主廚"

    def test_no_json_raises_value_error(self):
        with pytest.raises(ValueError, match="No JSON object found"):
            _extract_json("這裡沒有 JSON")

    def test_malformed_json_missing_brace_raises_value_error(self):
        with pytest.raises(ValueError, match="Malformed JSON"):
            _extract_json('{"recipe_name": "缺少結束括號"')

    def test_malformed_json_invalid_content_raises_json_decode_error(self):
        with pytest.raises(json.JSONDecodeError):
            _extract_json('{"recipe_name": 無效內容}')


# ─── Memory (no DB configured fallback, Async) ─────────────────────────────────

class TestMemoryManagement:
    @pytest.mark.asyncio
    async def test_get_empty_memory_returns_empty_list_when_no_database(self):
        """無 DATABASE_URL 時 get_user_memory 回傳空陣列。"""
        assert await get_user_memory("new_user") == []

    @pytest.mark.asyncio
    async def test_save_and_clear_do_not_raise_without_database(self):
        """無 DATABASE_URL 時 save/clear 不拋錯。"""
        await save_user_memory("user_x", [{"role": "user", "content": "test"}])
        await clear_user_memory("user_x")


# ─── generate_flex_message ───────────────────────────────────────────────────────

class TestGenerateFlexMessage:
    SAMPLE_ARGS = dict(
        kitchen_talk=[{"role": "行政主廚", "content": "今天做番茄炒蛋"}],
        theme="台式家常",
        recipe_name="番茄炒蛋",
        ingredients=[{"name": "番茄", "price": "30"}, {"name": "雞蛋", "price": "20"}],
        steps=["番茄切塊", "雞蛋打散", "熱鍋下油，先炒蛋"],
        shopping_list=["蔬果區：番茄", "冷藏區：雞蛋"],
        estimated_total_cost="50",
    )

    def test_returns_dict_with_bubble_type(self):
        result = generate_flex_message(**self.SAMPLE_ARGS)
        assert result["type"] == "bubble"

    def test_has_body_and_footer(self):
        result = generate_flex_message(**self.SAMPLE_ARGS)
        assert "body" in result
        assert "footer" in result

    def test_empty_inputs_do_not_raise(self):
        result = generate_flex_message(
            kitchen_talk=[], theme="", recipe_name="",
            ingredients=[], steps=[], shopping_list=[], estimated_total_cost=""
        )
        assert result["type"] == "bubble"

    def test_none_inputs_do_not_raise(self):
        result = generate_flex_message(
            kitchen_talk=None, theme=None, recipe_name=None,
            ingredients=None, steps=None, shopping_list=None, estimated_total_cost=None
        )
        assert result["type"] == "bubble"

    def test_string_inputs_parsed_gracefully(self):
        result = generate_flex_message(
            kitchen_talk="行政主廚說：開始\n副主廚說：好",
            theme="義式", recipe_name="義大利麵",
            ingredients="[{'name': '麵條', 'price': '50'}]",
            steps="1. 煮水\n2. 放麵",
            shopping_list="乾貨區：義大利麵",
            estimated_total_cost="150",
        )
        assert result["type"] == "bubble"

    def test_hero_and_video_button_when_https_urls(self):
        photo = "https://placehold.co/800x520/EA580C/FFFFFF?text=demo"
        video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "photo_url": photo, "video_url": video},
        )
        assert result.get("hero", {}).get("type") == "image"
        assert result["hero"]["url"] == photo
        footer_btns = [c for c in result["footer"]["contents"] if c.get("type") == "button"]
        uri_btn = next((b for b in footer_btns if b.get("action", {}).get("type") == "uri"), None)
        assert uri_btn is not None
        assert uri_btn["action"]["uri"] == video

    def test_invalid_photo_uses_text_banner_not_random_image(self):
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "photo_url": "http://insecure.example/x.jpg", "video_url": "not-a-url"},
        )
        assert "hero" not in result
        first = result["body"]["contents"][0]
        assert first["type"] == "box"
        assert first.get("backgroundColor") == flex_theme.HERO_BLOCK_BG
        assert not any(
            c.get("action", {}).get("type") == "uri"
            for c in result["footer"]["contents"]
            if isinstance(c, dict)
        )

    def test_dark_michelin_theme_uses_dark_surfaces_and_orange_cta(self):
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "recipe_name_for_postback": "番茄炒蛋", "recipe_lookup_ts": "2026-04-22T00:00:00+00:00"}
        )
        assert result["body"]["backgroundColor"] == flex_theme.SURFACE_CARD
        assert result["footer"]["backgroundColor"] == flex_theme.PRIMARY_BG
        assert result["body"]["contents"][1]["backgroundColor"] == flex_theme.ACCENT_TOP_STRIP
        cost_panel = result["body"]["contents"][5]
        assert cost_panel["backgroundColor"] == flex_theme.PANEL_COST_OUTER_BG
        assert cost_panel["contents"][2]["color"] == flex_theme.SEP_COLOR
        primary_btn = next(
            c for c in result["footer"]["contents"]
            if c.get("type") == "box"
        )["contents"][1]
        assert primary_btn["style"] == "primary"
        assert primary_btn["color"] == flex_theme.FOOTER_BTN_FAVORITE

    def test_video_button_uses_michelin_orange(self):
        photo = "https://placehold.co/800x520/EA580C/FFFFFF?text=demo"
        video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "photo_url": photo, "video_url": video},
        )
        video_btn = result["footer"]["contents"][0]
        assert video_btn["style"] == "primary"
        assert video_btn["color"] == flex_theme.VIDEO_BTN

    def test_no_photo_kwarg_shows_text_banner_not_picsum(self):
        result = generate_flex_message(**self.SAMPLE_ARGS)
        assert "hero" not in result
        assert result["body"]["contents"][0]["type"] == "box"

    def test_long_steps_show_expand_postback_button(self):
        result = generate_flex_message(
            **{
                **self.SAMPLE_ARGS,
                "steps": ["步驟一", "步驟二", "步驟三", "步驟四"],
                "recipe_name_for_postback": "番茄炒蛋",
                "step_preview_count": 2,
            }
        )
        footer = result["footer"]["contents"]
        expand_btn = next(
            (
                c for c in footer
                if c.get("type") == "button"
                and c.get("action", {}).get("type") == "postback"
                and "expand_steps" in c.get("action", {}).get("data", "")
            ),
            None,
        )
        assert expand_btn is not None

    def test_footer_adds_generate_image_postback_button(self):
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "recipe_name_for_postback": "番茄炒蛋", "recipe_lookup_ts": "2026-04-22T00:00:00+00:00"}
        )
        footer = result["footer"]["contents"]
        image_btn = next(
            (
                c for c in footer
                if c.get("type") == "button"
                and c.get("action", {}).get("type") == "postback"
                and "generate_recipe_image" in c.get("action", {}).get("data", "")
            ),
            None,
        )
        assert image_btn is not None
        assert "ts=" in image_btn["action"]["data"]

    def test_footer_adds_generate_poster_postback_button(self):
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "recipe_name_for_postback": "番茄炒蛋", "recipe_lookup_ts": "2026-04-22T00:00:00+00:00"}
        )
        footer = result["footer"]["contents"]
        poster_btn = next(
            (
                c for c in footer
                if c.get("type") == "button"
                and c.get("action", {}).get("type") == "postback"
                and "generate_recipe_poster" in c.get("action", {}).get("data", "")
            ),
            None,
        )
        assert poster_btn is not None
        assert "ts=" in poster_btn["action"]["data"]

    def test_footer_adds_legal_uri_buttons_when_configured(self, monkeypatch):
        monkeypatch.setattr(flex_messages, "LEGAL_DISCLAIMER_URL", "https://app.example.com/legal/disclaimer")
        monkeypatch.setattr(flex_messages, "LEGAL_PRIVACY_URL", "https://app.example.com/legal/privacy")
        result = generate_flex_message(
            **{**self.SAMPLE_ARGS, "recipe_name_for_postback": "番茄炒蛋"}
        )
        uris = [
            c.get("action", {}).get("uri")
            for c in result["footer"]["contents"]
            if c.get("type") == "button" and c.get("action", {}).get("type") == "uri"
        ]
        assert "https://app.example.com/legal/disclaimer" in uris
        assert "https://app.example.com/legal/privacy" in uris


class TestBuildFallbackRecipeFlex:
    def test_truncated_json_shows_short_snippet_not_full_dump(self):
        raw = '{"kitchen_talk":[{"role":"副主廚","content":"選用當季時'
        flex = build_fallback_recipe_flex(raw)
        d = flex.contents.dict()
        body = d["body"]["contents"]
        texts = [c.get("text", "") for c in body if c.get("type") == "text"]
        joined = "\n".join(texts)
        assert "截斷" in joined
        assert "技術摘要" in joined
        assert len(joined) < len(raw) + 500

    def test_fallback_flex_uses_dark_surfaces(self):
        flex = build_fallback_recipe_flex("一般文字內容")
        d = flex.contents.dict()
        assert d["body"]["background_color"] == flex_theme.SURFACE_CARD
        assert d["footer"]["background_color"] == flex_theme.PRIMARY_BG


class TestFlexSafeHttpsUrl:
    def test_accepts_https(self):
        u = "https://example.com/path?x=1"
        assert _flex_safe_https_url(u) == u

    def test_rejects_http(self):
        assert _flex_safe_https_url("http://example.com/x") is None

    def test_rejects_empty(self):
        assert _flex_safe_https_url("") is None
        assert _flex_safe_https_url(None) is None
