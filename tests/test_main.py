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


# ─── Memory (Stateless, 100% Supabase) ───────────────────────────────────────────

class TestMemoryManagement:
    def test_get_empty_memory_returns_empty_list_when_no_supabase(self):
        """無 Supabase 時 get_user_memory 回傳空陣列。"""
        assert get_user_memory("new_user") == []

    def test_save_and_clear_do_not_raise_without_supabase(self):
        """無 Supabase 時 save/clear 不拋錯。"""
        save_user_memory("user_x", [{"role": "user", "content": "test"}])
        clear_user_memory("user_x")


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
