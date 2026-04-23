---
version: "alpha"
name: 米其林職人大腦 — 溫暖明亮食譜主題
description: >
  LINE Bot 食譜助理的視覺設計系統。
  涵蓋 LINE Flex Message、HTML/CSS 食譜海報（Playwright）與 Pillow fallback 三個渲染層，
  以相同 token 保持跨輸出一致的暖系質感。
colors:
  # ── 基礎底色 ──────────────────────────────────────────────────────────────────
  background:       "#FFFAF5"   # 溫暖米白底色（Flex 主畫布）
  background-alt:   "#F9F7F4"   # 海報底色（略偏灰米白）
  surface:          "#FFFFFF"   # 卡片白
  surface-alt:      "#F5EFE6"   # 淡金底（次要區塊）
  surface-muted:    "#F9F4EE"   # 更淡米色
  border:           "#EAE4DC"   # 米色邊框
  # ── 主色 / 強調色 ──────────────────────────────────────────────────────────────
  primary:          "#C8922A"   # 琥珀金（主要 CTA、食材價格、步驟序號）
  primary-dark:     "#A67318"   # 深金（hover / 深化）
  primary-light:    "#FDF6E7"   # 淡金底色
  # ── 輔助色 ─────────────────────────────────────────────────────────────────────
  green:            "#2A6049"   # 深森綠（區塊標籤、步驟徽章、hero 底）
  green-light:      "#EBF5F0"   # 淡綠底色
  green-text:       "#F5F0E6"   # 深綠上的米白文字
  purple:           "#7B5EA7"   # 食材總管角色標籤
  # ── 文字色 ─────────────────────────────────────────────────────────────────────
  text-ink:         "#1C1917"   # 深棕黑主標題
  text-body:        "#3D3530"   # 溫暖深棕內文
  text-muted:       "#9C8F84"   # 暖灰輔助文字
  # ── 菜系 hero 背景（深色調） ───────────────────────────────────────────────────
  cuisine-taiwanese: "#6B3A2A"
  cuisine-thai:      "#2A5C3F"
  cuisine-japanese:  "#3A2A4A"
  cuisine-european:  "#2A3A4A"
  cuisine-kids:      "#6B5A2A"
typography:
  h1:
    fontFamily: "Noto Serif TC, Noto Serif CJK TC, PingFang TC, Microsoft JhengHei, serif"
    fontSize: "2rem"
    fontWeight: "700"
  h2:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "1.25rem"
    fontWeight: "600"
  body-md:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.6"
  body-sm:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "0.875rem"
  label-caps:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: "500"
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  cta-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  cta-secondary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.green-text}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  section-label:
    textColor: "{colors.green}"
    typography: "{typography.label-caps}"
  step-badge:
    backgroundColor: "{colors.green}"
    textColor: "{colors.green-text}"
    rounded: "{rounded.full}"
  role-chef:
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
  role-sous-chef:
    textColor: "{colors.green}"
    typography: "{typography.label-caps}"
  role-ingredient-manager:
    textColor: "{colors.purple}"
    typography: "{typography.label-caps}"
  hero-block:
    backgroundColor: "{colors.green}"
    textColor: "{colors.green-text}"
  hero-kicker:
    textColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  ingredient-price:
    textColor: "{colors.primary}"
    typography: "{typography.body-sm}"
---

## Overview

**溫暖明亮食譜主題**（Warm Bright Recipe Theme）— 以米白為底、琥珀金為主調，搭配深森綠作為強調色，傳遞台灣家常料理的溫度感與米其林廚房的精緻感。

整體視覺定位：**溫暖雜誌風** — 乾淨、明亮、不刺眼，適合長時閱讀的食譜內容，並與 LINE 對話環境的高頻率使用場景相容。

此設計系統同時服務三個渲染層：
1. **LINE Flex Message**（`app/flex_theme.py`）— 互動式卡片
2. **HTML/CSS 食譜海報**（`app/recipe_poster_html.py`）— Playwright 截圖，1080×1920
3. **Pillow fallback 海報**（`app/recipe_poster.py`）— 1200×1800，無 Playwright 時啟用

---

## Colors

核心色板以**低飽和溫暖中性色**為基礎，加入單一暖系互補對——琥珀金（主要）與深森綠（輔助）。

- **`background` (#FFFAF5)**：Flex 主畫布底色，帶淡暖調，比純白更放鬆。
- **`background-alt` (#F9F7F4)**：海報底色，略深一階，提供層次感。
- **`surface` (#FFFFFF)**：卡片白，作為內容模組的容器。
- **`surface-alt` (#F5EFE6)**：淡金底，用於次要資訊面板（對話區、成本區）。
- **`border` (#EAE4DC)**：米色邊框，柔和分隔，不強烈對比。
- **`primary` (#C8922A)**：琥珀金，唯一的強互動驅動色——CTA 按鈕、食材價格、步驟序號、收藏按鈕。
- **`primary-dark` (#A67318)**：深金，用於 hover 或深化需求。
- **`green` (#2A6049)**：深森綠，區塊標題標籤、步驟徽章、hero 底色、次要按鈕。避免用在大面積背景之外的純裝飾用途。
- **`text-ink` (#1C1917)**：深棕黑，大標題與主要文字，高對比。
- **`text-body` (#3D3530)**：溫暖深棕，段落與步驟說明，比純黑柔和。
- **`text-muted` (#9C8F84)**：暖灰，輔助標籤、時間、金額單位等降調資訊。

### 三廚角色色

| 角色 | 色碼 | 意義 |
|------|------|------|
| 行政主廚 | `#C8922A` 琥珀金 | 決策者、主導 |
| 副主廚 | `#2A6049` 深森綠 | 執行者、平衡 |
| 食材總管 | `#7B5EA7` 紫羅蘭 | 管控者、精準 |

三色互不重疊且各具辨識度，在小字標籤尺寸下仍可區分。

---

## Typography

以 **Noto CJK** 系列為主體，海報標題使用 **Noto Serif TC**（宋體），正文與標籤使用 **Noto Sans TC**（黑體）。系統字型依序 fallback 至 PingFang TC（macOS）、Microsoft JhengHei（Windows）。

Render（Linux）部署環境需透過 `buildCommand` 安裝 `fonts-noto-cjk`，並以 CSS `@font-face` + `local()` 橋接，**不依賴 Google Fonts CDN**（headless 截圖環境下不可靠）。

字型選用邏輯：
- **標題**（食譜名稱）：Noto Serif TC — 提升高級質感
- **段落、清單、按鈕**：Noto Sans TC — 閱讀舒適、清晰
- **小標籤（廚師角色、區塊 label）**：Noto Sans TC，較小字號 + 字距略寬

---

## Layout

海報尺寸：
- Playwright HTML/CSS 版：**1080 × 1920 px**（Instagram 直式比例）
- Pillow fallback 版：**1200 × 1800 px**

卡片欄距：水平 padding `24px`，區塊間距 `16px`（`md`），食材採**兩欄並列**佈局。

---

## Components

### CTA 主按鈕（`cta-primary`）

琥珀金底 + 白字，`border-radius: 8px`，用於「生成主圖」、「生成海報」、「收藏」等主要操作。LINE Flex 中所有一級 CTA 均採此配置。

**注意**：LINE Flex Message API 僅支援 HEX 格式色碼；禁用 `rgba()` 等格式，否則 API 拒絕整張卡片。

### CTA 次要按鈕（`cta-secondary`）

深森綠底 + 米白字，用於「換菜單」、「展開步驟」等次要操作。

### Section Label（`section-label`）

深森綠文字 + 全大寫字距，用於「食材」、「步驟」、「採買清單」等區塊標題；Flex 與 HTML 海報共用此視覺語言。

### Step Badge（`step-badge`）

深森綠圓形徽章 + 米白數字，用於步驟序號。圓角設為 `full`（圓形）。

### Hero Block（無成品圖時的文字 hero）

深森綠背景，上方琥珀金 kicker 文字（菜系標籤），中央米白大標（菜名），下方淡綠輔助說明。作為缺圖時的品質 fallback，不顯示不相關的隨機圖。

---

## Do's and Don'ts

**Do**
- CTA 顏色統一使用 `primary`（琥珀金）或 `green`（深森綠），非此二者不得另立互動色。
- Flex Message 中所有顏色欄位使用 **6 位 HEX 格式**（`#RRGGBB`），不用 `rgba`、`rgb()`、顏色名稱。
- 區塊標題標籤（section label）固定使用 `green`，與主 CTA 的琥珀金形成分工。
- 新增或修改色彩時，以此文件為**單一來源**，再同步更新 `flex_theme.py`、`recipe_poster_html.py`、`recipe_poster.py`。

**Don't**
- 不在新 UI 元素上引入暖色系以外的飽和色（如純紅、藍、亮綠），以免破壞整體溫暖質感。
- 不對步驟徽章以外的地方使用 `green-light`（#EBF5F0）作為文字底色——僅作為輕量背景面板。
- 不在 Playwright headless 環境中使用遠端 `@import` Google Fonts——改用 `@font-face` + `local()`。
- 不在多個 Python 模組中各自重複定義相同色碼；應以 `flex_theme.py` 為 Flex 端的 token 來源，海報端以本文件為設計參考。
