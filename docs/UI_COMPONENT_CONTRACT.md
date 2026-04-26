# UI Component Contract

本文件定義跨渲染層（LINE Flex / 海報 HTML / Pillow / 圖卡）的視覺契約，避免後續改版風格漂移。

## Token Source

- 單一設計 token：`app/design_tokens.py`
- Flex 主題映射：`app/flex_theme.py`
- 元件契約常數：`app/ui_contracts.py`

## Button Contract

- `primary`：主要 CTA（送出、收藏、重試）
  - 背景：`PRIMARY`
  - 文字：`SURFACE`
- `secondary`：次要操作（展開、刪除、重新構思）
  - 背景：`GREEN`
  - 文字：`GREEN_TEXT`
- `tertiary/link`：低優先連結（法規、輔助）
  - 文字：`TEXT_MUTED`

## Badge Contract

- `StepBadge`：步驟序號圓章
  - 背景：`GREEN`（Flex / 海報可視需求改為 `PRIMARY`，但需在同一表面保持一致）
  - 文字：`GREEN_TEXT`

## SectionTitle Contract

- `SectionTitle`（食材、步驟、調味等）
  - 顏色：`GREEN`
  - 語意：區段導覽，不作為 CTA 顏色使用

## RoleTag Contract

- `行政主廚`：`PRIMARY`
- `副主廚`：`GREEN`
- `食材總管`：`PURPLE`

## 維護規則

1. 新增色票先改 `app/design_tokens.py`，再調用層映射。
2. 不在業務檔案硬編 HEX；優先使用 token 或契約常數。
3. 更新元件樣式時，同步檢查：
   - `app/flex_messages.py`
   - `app/recipe_poster_html.py`
   - `app/recipe_poster.py`
   - `app/recipe_card_generator.py`
4. PR / 里程碑需跑 `tests/test_design_token_consistency.py`。
