"""高品質 HTML → PNG 食譜海報生成器（Playwright headless）。

對比舊版 Pillow 純文字排版，此模組採用 HTML + CSS 渲染，
達到雜誌級食譜圖表效果：漸層標題、步驟卡片、食材清單、調味比例表。

公開 API：
    render_recipe_poster_png_html(recipe_data: dict) -> bytes
        從 AI 回傳的食譜 JSON 渲染 1080×1920 PNG。
        若 Playwright 不可用，自動退回舊版 Pillow 方法。
"""
from __future__ import annotations

import html
import io
import logging
import os
import re
import urllib.error
import urllib.request
import base64
from typing import Any

from app.helpers import _parse_to_list, _safe_str
from app.recipe_poster import _derive_cook_time, _derive_quick_tips

logger = logging.getLogger("chef-agent")

# ── 版面尺寸 ────────────────────────────────────────────────────────────────────
POSTER_WIDTH  = 1080
POSTER_HEIGHT = 1920

# ── 調色盤（精緻食譜雜誌風）────────────────────────────────────────────────────
COLOR_ACCENT       = "#C8922A"   # 琥珀金主色
COLOR_ACCENT_DARK  = "#A67318"   # 深金
COLOR_ACCENT_LIGHT = "#FDF6E7"   # 淡金底色
COLOR_GREEN        = "#2A6049"   # 深森綠（標籤、標題）
COLOR_GREEN_LIGHT  = "#EBF5F0"   # 淡綠底色
COLOR_BODY_BG      = "#F9F7F4"   # 溫暖米白底色
COLOR_CARD_BG      = "#FFFFFF"
COLOR_TITLE_TEXT   = "#1C1917"   # 深棕黑
COLOR_BODY_TEXT    = "#3D3530"   # 溫暖深棕
COLOR_MUTED        = "#9C8F84"   # 溫暖灰
COLOR_BORDER       = "#EAE4DC"   # 米色邊框
COLOR_STEP_BADGE   = "#2A6049"   # 深森綠徽章
COLOR_TIP_STAR     = "#C8922A"   # 琥珀金星號


def _esc(text: object, max_len: int = 200) -> str:
    """HTML-escape 並截斷。"""
    return html.escape(str(text or "")[:max_len])


def _parse_ingredients(raw: Any) -> list[dict]:
    items = _parse_to_list(raw)
    result = []
    for item in items:
        if isinstance(item, dict):
            name  = _safe_str(item.get("name", item.get("食材", "")), "")
            price = _safe_str(item.get("price", item.get("價格", "")), "")
            qty   = _safe_str(item.get("qty", item.get("份量", "")), "")
        else:
            name, price, qty = _safe_str(item, ""), "", ""
        if name:
            result.append({"name": name, "price": price, "qty": qty})
    return result[:8]


def _parse_steps(raw: Any) -> list[str]:
    items = _parse_to_list(raw)
    results = []
    for item in items:
        s = str(item).strip()
        if s:
            results.append(s.lstrip("0123456789. 、"))
    return results[:6]


def _parse_shopping(raw: Any) -> list[str]:
    items = _parse_to_list(raw)
    return [str(s).strip() for s in items if str(s).strip()][:8]



def _fetch_photo_as_data_uri(photo_url: str) -> str | None:
    """下載食譜主圖並轉為 data URI（避免 Playwright 外部網路限制）。"""
    if not photo_url or not photo_url.startswith("https://"):
        return None
    req = urllib.request.Request(
        photo_url,
        headers={"User-Agent": "my-chef-ai-agent/poster-gen", "Accept": "image/*"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            data = resp.read(5 * 1024 * 1024 + 1)
        if not data or len(data) > 5 * 1024 * 1024:
            return None
        b64 = base64.b64encode(data).decode()
        return f"data:{content_type};base64,{b64}"
    except Exception:
        return None


def _step_title(idx: int) -> str:
    titles = ["先炒主料", "爆香", "下蔬菜", "放回主料", "調味", "起鍋"]
    return titles[idx] if idx < len(titles) else f"步驟 {idx+1}"


def build_poster_html(recipe_data: dict) -> str:
    """從食譜 JSON 建構 HTML 字串（含 inline CSS，無外部依賴）。"""
    recipe_name    = _safe_str(recipe_data.get("recipe_name"), "本日料理", max_len=40)
    theme          = _safe_str(recipe_data.get("theme"), "家常上桌", max_len=30)
    ingredients    = _parse_ingredients(recipe_data.get("ingredients", []))
    steps          = _parse_steps(recipe_data.get("steps", []))
    shopping       = _parse_shopping(recipe_data.get("shopping_list", []))
    cost           = _safe_str(recipe_data.get("estimated_total_cost"), "估算中", max_len=20)
    cook_time      = _derive_cook_time(steps)
    tips           = _derive_quick_tips(recipe_data)
    photo_url      = _safe_str(recipe_data.get("photo_url"), "", max_len=2000)
    photo_data_uri = _fetch_photo_as_data_uri(photo_url) if photo_url else None
    kitchen_talk   = _parse_to_list(recipe_data.get("kitchen_talk", []))

    # ── 食材標籤 HTML（分兩欄）────────────────────────────────────────────────
    def _ing_tag(ing: dict) -> str:
        qty_str = f"<span class='ing-qty'>{_esc(ing['qty'])}</span>" if ing["qty"] else ""
        price_str = f"<span class='ing-price'>{_esc(ing['price'])}</span>" if ing["price"] else ""
        return (
            f"<div class='ing-item'>"
            f"<span class='ing-dot'></span>"
            f"<span class='ing-name'>{_esc(ing['name'])}</span>"
            f"{qty_str}{price_str}"
            f"</div>"
        )

    left_ings  = [_ing_tag(i) for i in ingredients[::2]]
    right_ings = [_ing_tag(i) for i in ingredients[1::2]]
    left_html  = "\n".join(left_ings)
    right_html = "\n".join(right_ings)
    servings   = _safe_str(recipe_data.get("servings", ""), "2")

    # ── 步驟格 HTML（最多 6 步，2×3 排列）──────────────────────────────────────
    step_cards = []
    for idx, step in enumerate(steps):
        step_cards.append(
            f"""<div class='step-card'>
                <div class='step-badge'>{idx+1}</div>
                <div class='step-body'>
                    <div class='step-subtitle'>{_step_title(idx)}</div>
                    <div class='step-text'>{_esc(step, 60)}</div>
                </div>
            </div>"""
        )
    steps_html = "\n".join(step_cards)

    # ── 小撇步 HTML ────────────────────────────────────────────────────────────
    tips_html = "\n".join(
        f"<div class='tip-row'><span class='tip-star'>★</span><span class='tip-text'>{_esc(t, 60)}</span></div>"
        for t in tips
    )

    # ── 採買提示 ────────────────────────────────────────────────────────────────
    shopping_preview = " ／ ".join(shopping[:4])

    # ── 廚師對話（可選）──────────────────────────────────────────────────────────
    talk_html = ""
    if kitchen_talk:
        rows = []
        role_colors = {"行政主廚": "#E85C2A", "副主廚": "#4A7C59", "食材總管": "#7B5EA7"}
        for talk in kitchen_talk[:3]:
            if isinstance(talk, dict):
                role    = _safe_str(talk.get("role", ""), "廚師", max_len=10)
                content = _safe_str(talk.get("content", ""), "", max_len=30)
            else:
                role, content = "廚師", str(talk)[:30]
            color = role_colors.get(role, "#888888")
            rows.append(
                f"<div class='talk-row'>"
                f"<span class='talk-role' style='color:{color}'>{_esc(role)}</span>"
                f"<span class='talk-content'>{_esc(content)}</span>"
                f"</div>"
            )
        talk_html = f"<div class='talk-section'><div class='talk-inner'>{''.join(rows)}</div></div>"

    # ── 主圖區 ────────────────────────────────────────────────────────────────
    if photo_data_uri:
        hero_right_html = f"<img class='hero-img' src='{photo_data_uri}' alt='成品主圖'/>"
    else:
        hero_right_html = "<div class='hero-img-placeholder'><div class='placeholder-text'>📸 成品主圖</div></div>"

    # ── 調味比例（從食材中篩出真正的調味料，不含蔬菜類）────────────────────────
    SEASONING_KEYWORDS = ["醬油", "鹽", "糖", "米酒", "醋", "蠔油", "味醂", "胡椒", "味噌", "豆瓣醬", "辣豆瓣"]
    seasoning_map: dict[str, str] = {}
    for ing in ingredients:
        n = ing["name"]
        qty_val = ing.get("qty", "") or "適量"
        for keyword in SEASONING_KEYWORDS:
            if keyword in n and keyword not in seasoning_map:
                seasoning_map[keyword] = qty_val
    # 補預設至少 3 項
    defaults = [("醬油", "1 湯匙"), ("鹽", "少許"), ("糖", "1/2 茶匙")]
    for k, v in defaults:
        if k not in seasoning_map and len(seasoning_map) < 3:
            seasoning_map[k] = v

    seasoning_rows_html = "\n".join(
        f"<div class='season-row'><span class='season-name'>{_esc(k)}</span><span class='season-val'>{_esc(v)}</span></div>"
        for k, v in list(seasoning_map.items())[:4]
    )

    # ── 動態標語 ────────────────────────────────────────────────────────────────
    tagline_parts = []
    if len(steps) <= 3:
        tagline_parts.append("快手料理")
    tagline_parts.append(f"⏱ {cook_time}上桌")
    if ingredients:
        tagline_parts.append("食材易取")
    tagline = "・".join(tagline_parts)

    html_content = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @font-face {{
    font-family: 'Noto Sans TC';
    src: local('Noto Sans CJK TC'), local('Noto Sans TC'), local('NotoSansCJKtc');
    font-weight: 100 900;
  }}
  @font-face {{
    font-family: 'Noto Serif TC';
    src: local('Noto Serif CJK TC'), local('Noto Serif TC'), local('NotoSerifCJKtc');
    font-weight: 100 900;
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    width: {POSTER_WIDTH}px;
    background: {COLOR_BODY_BG};
    font-family: 'Noto Sans TC', 'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
    color: {COLOR_BODY_TEXT};
    -webkit-font-smoothing: antialiased;
  }}

  .poster {{
    width: {POSTER_WIDTH}px;
    min-height: {POSTER_HEIGHT}px;
    display: flex;
    flex-direction: column;
    background: {COLOR_BODY_BG};
  }}

  /* ── 頂部標題區 ────────────────────────────────────────────── */
  .header {{
    background: linear-gradient(160deg, {COLOR_GREEN} 0%, #1A4030 55%, #12302A 100%);
    padding: 52px 52px 44px;
    position: relative;
    overflow: hidden;
  }}
  .header::before {{
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 85% 10%, rgba(200,146,42,0.20) 0%, transparent 55%);
  }}
  .header::after {{
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, {COLOR_ACCENT} 0%, {COLOR_ACCENT_DARK} 50%, {COLOR_ACCENT} 100%);
  }}
  .header-tagline {{
    font-size: 23px; font-weight: 600; color: {COLOR_ACCENT};
    background: rgba(200,146,42,0.15); border: 1px solid rgba(200,146,42,0.35);
    border-radius: 4px;
    padding: 5px 16px; display: inline-block; margin-bottom: 22px;
    letter-spacing: 3px; text-transform: uppercase;
  }}
  .header-title {{
    font-family: 'Noto Serif TC', 'Noto Serif CJK TC', 'PingFang TC', serif;
    font-size: 72px; font-weight: 700; color: #F5F0E6;
    line-height: 1.2; text-shadow: 0 2px 12px rgba(0,0,0,0.3);
    margin-bottom: 20px; letter-spacing: 2px;
    max-width: 580px;
  }}
  .header-meta {{
    display: flex; gap: 20px; align-items: center; flex-wrap: wrap;
  }}
  .header-meta-tag {{
    font-size: 22px; color: rgba(245,240,230,0.82); font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    border-left: 2px solid rgba(200,146,42,0.5); padding-left: 12px;
  }}
  .header-meta-tag:first-child {{ border-left: none; padding-left: 0; }}
  .header-hero-wrap {{
    position: absolute; right: 44px; top: 38px;
    width: 330px; height: 270px;
  }}
  .hero-img {{
    width: 330px; height: 270px; object-fit: cover;
    border-radius: 12px;
    border: 2px solid rgba(200,146,42,0.5);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
  }}
  .hero-img-placeholder {{
    width: 330px; height: 270px;
    background: rgba(255,255,255,0.06);
    border-radius: 12px; border: 1px dashed rgba(200,146,42,0.4);
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 8px;
  }}
  .placeholder-text {{ color: rgba(200,146,42,0.7); font-size: 20px; }}

  /* ── 區塊標題 ────────────────────────────────────────────────── */
  .section {{
    margin: 36px 48px 0;
  }}
  .section-header {{
    display: flex; align-items: center; gap: 16px; margin-bottom: 22px;
  }}
  .section-label {{
    font-family: 'Noto Serif TC', 'Noto Serif CJK TC', serif;
    font-size: 28px; font-weight: 700; color: {COLOR_TITLE_TEXT};
    letter-spacing: 2px;
    position: relative; padding-bottom: 6px;
  }}
  .section-label::after {{
    content: '';
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 2px;
    background: linear-gradient(90deg, {COLOR_ACCENT} 0%, transparent 100%);
  }}
  .section-badge {{
    background: {COLOR_GREEN}; color: #F5F0E6;
    font-size: 19px; font-weight: 600;
    padding: 4px 16px; border-radius: 3px;
    letter-spacing: 1px;
  }}
  .section-sub {{
    font-size: 19px; color: {COLOR_MUTED}; font-weight: 400;
  }}

  /* ── 食材清單 ────────────────────────────────────────────────── */
  .ing-grid {{
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }}
  .ing-col {{ display: flex; flex-direction: column; gap: 12px; }}
  .ing-item {{
    display: flex; align-items: center; gap: 12px;
    background: {COLOR_CARD_BG}; border-radius: 8px;
    padding: 14px 18px;
    border: 1px solid {COLOR_BORDER};
    border-left: 3px solid {COLOR_ACCENT};
  }}
  .ing-dot {{
    width: 8px; height: 8px; min-width: 8px; border-radius: 50%;
    background: {COLOR_ACCENT};
  }}
  .ing-name {{ font-size: 24px; font-weight: 600; flex: 1; color: {COLOR_TITLE_TEXT}; }}
  .ing-qty  {{ font-size: 20px; color: {COLOR_MUTED}; }}
  .ing-price {{ font-size: 20px; color: {COLOR_ACCENT}; font-weight: 700; margin-left: auto; }}

  /* ── 步驟格 ──────────────────────────────────────────────────── */
  .steps-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }}
  .step-card {{
    background: {COLOR_CARD_BG}; border-radius: 10px;
    padding: 20px 22px;
    border: 1px solid {COLOR_BORDER};
    display: flex; align-items: flex-start; gap: 16px;
    min-height: 120px;
    position: relative; overflow: hidden;
  }}
  .step-card::before {{
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, {COLOR_GREEN} 0%, transparent 80%);
  }}
  .step-badge {{
    width: 48px; height: 48px; min-width: 48px;
    background: {COLOR_STEP_BADGE}; color: #F5F0E6;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 26px; font-weight: 800;
    flex-shrink: 0;
  }}
  .step-body {{ flex: 1; }}
  .step-subtitle {{
    font-size: 18px; font-weight: 700; color: {COLOR_GREEN};
    margin-bottom: 6px; letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .step-text {{ font-size: 21px; color: {COLOR_BODY_TEXT}; line-height: 1.55; }}

  /* ── 廚師對話 ────────────────────────────────────────────────── */
  .talk-section {{
    margin: 32px 48px 0;
    background: #F5F2FA; border-radius: 10px; padding: 22px 28px;
    border-left: 4px solid #7B5EA7;
  }}
  .talk-inner {{ display: flex; flex-direction: column; gap: 12px; }}
  .talk-row {{ display: flex; align-items: flex-start; gap: 12px; }}
  .talk-role {{ font-size: 21px; font-weight: 800; min-width: 80px; }}
  .talk-content {{ font-size: 21px; color: {COLOR_BODY_TEXT}; }}

  /* ── 小撇步 ──────────────────────────────────────────────────── */
  .tips-box {{
    background: {COLOR_ACCENT_LIGHT};
    border-radius: 10px;
    padding: 24px 28px; flex: 1;
    border: 1px solid rgba(200,146,42,0.2);
  }}
  .tip-row {{ display: flex; gap: 10px; margin-bottom: 14px; align-items: flex-start; }}
  .tip-star {{ color: {COLOR_TIP_STAR}; font-size: 22px; line-height: 1.4; flex-shrink: 0; }}
  .tip-text {{ font-size: 21px; line-height: 1.55; color: {COLOR_BODY_TEXT}; }}

  /* ── 調味比例 & 烹調時間 ──────────────────────────────────────── */
  .bottom-row {{
    display: flex; gap: 20px; margin: 32px 48px 0;
  }}
  .season-box {{
    flex: 1; background: {COLOR_CARD_BG}; border-radius: 10px;
    padding: 24px 28px;
    border: 1px solid {COLOR_BORDER};
  }}
  .season-title {{
    font-family: 'Noto Serif TC', 'Noto Serif CJK TC', serif;
    font-size: 22px; font-weight: 700; color: {COLOR_TITLE_TEXT};
    margin-bottom: 6px; letter-spacing: 1px;
  }}
  .season-sub   {{ font-size: 17px; color: {COLOR_MUTED}; margin-bottom: 16px; }}
  .season-row   {{ display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid {COLOR_BORDER}; }}
  .season-row:last-child {{ border-bottom: none; }}
  .season-name  {{ font-size: 21px; color: {COLOR_BODY_TEXT}; }}
  .season-val   {{ font-size: 21px; font-weight: 700; color: {COLOR_ACCENT}; }}
  .time-box {{
    width: 240px; background: {COLOR_GREEN}; border-radius: 10px;
    padding: 24px 24px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 0;
  }}
  .time-icon  {{ font-size: 48px; margin-bottom: 14px; }}
  .time-label {{ font-size: 18px; color: rgba(245,240,230,0.7); margin-bottom: 4px; letter-spacing: 1px; }}
  .time-value {{ font-size: 32px; font-weight: 900; color: #F5F0E6; margin-bottom: 20px; }}

  /* ── 採買提示 ──────────────────────────────────────────────────── */
  .shopping-bar {{
    margin: 24px 48px 0;
    background: {COLOR_GREEN_LIGHT}; border-radius: 8px;
    padding: 16px 22px; display: flex; align-items: center; gap: 12px;
    border: 1px solid rgba(42,96,73,0.2);
  }}
  .shopping-icon {{ font-size: 26px; }}
  .shopping-text {{ font-size: 21px; color: {COLOR_BODY_TEXT}; }}

  /* ── 底部署名 ──────────────────────────────────────────────────── */
  .footer {{
    margin: 36px 48px 32px;
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 20px;
    border-top: 1px solid {COLOR_BORDER};
  }}
  .footer-brand {{ font-size: 20px; color: {COLOR_MUTED}; font-weight: 500; letter-spacing: 1px; }}
  .footer-tag   {{ font-size: 19px; color: {COLOR_ACCENT}; font-weight: 600; letter-spacing: 1px; }}

  /* ── 分隔線 ──────────────────────────────────────────────────── */
  .divider {{ height: 1px; background: {COLOR_BORDER}; margin: 0 48px; }}
</style>
</head>
<body>
<div class="poster">

  <!-- ══ 頂部標題區 ══ -->
  <div class="header">
    <div class="header-tagline">{_esc(tagline)}</div>
    <div class="header-title">{_esc(recipe_name)}</div>
    <div class="header-meta">
      <span class="header-meta-tag">{_esc(theme)}</span>
      <span class="header-meta-tag">⏱ {_esc(cook_time)}</span>
    </div>
    <div class="header-hero-wrap">
      {hero_right_html}
    </div>
  </div>

  <!-- ══ 食材清單 ══ -->
  <div class="section">
    <div class="section-header">
      <span class="section-label">食材</span>
      <span class="section-badge">{_esc(servings)} 人份</span>
      <span class="section-sub">含採買建議</span>
    </div>
    <div class="ing-grid">
      <div class="ing-col">{left_html}</div>
      <div class="ing-col">{right_html}</div>
    </div>
  </div>

  <!-- ══ 廚師對話（可選）══ -->
  {talk_html}

  <!-- ══ 料理步驟 ══ -->
  <div class="section" style="margin-top:36px">
    <div class="section-header">
      <span class="section-label">料理步驟</span>
    </div>
    <div class="steps-grid">
      {steps_html}
    </div>
  </div>

  <!-- ══ 採買提示 ══ -->
  {'<div class="shopping-bar"><span class="shopping-icon">🛒</span><span class="shopping-text">'+_esc(shopping_preview)+'</span></div>' if shopping_preview else ''}

  <!-- ══ 小撇步 ══ -->
  <div class="bottom-row">
    <div class="tips-box">
      <div class="section-header" style="margin-bottom:16px">
        <span class="section-label" style="font-size:24px">小撇步</span>
      </div>
      {tips_html}
    </div>
  </div>

  <!-- ══ 調味比例 & 烹調時間 ══ -->
  <div class="bottom-row">
    <div class="season-box">
      <div class="season-title">調味比例</div>
      <div class="season-sub">可依口味調整</div>
      {seasoning_rows_html}
    </div>
    <div class="time-box">
      <div class="time-icon">🕐</div>
      <div class="time-label">烹調時間</div>
      <div class="time-value">{_esc(cook_time)}</div>
      <div class="time-label">預估花費</div>
      <div class="time-value" style="font-size:26px; margin-bottom:0">NT$ {_esc(cost)}</div>
    </div>
  </div>

  <!-- ══ 底部署名 ══ -->
  <div class="footer">
    <span class="footer-brand">米其林職人大腦</span>
    <span class="footer-tag">✦ Recipe Poster</span>
  </div>

</div>
</body>
</html>"""
    return html_content


def render_recipe_poster_png_html(recipe_data: dict) -> bytes:
    """同步介面：用 Playwright headless Chromium 截圖，輸出 PNG bytes。

    若 Playwright 無法載入，自動退回舊版 Pillow 方法。
    """
    try:
        from playwright.sync_api import sync_playwright  # noqa: PLC0415
    except ImportError:
        logger.warning("Playwright 未安裝，退回 Pillow 海報")
        from app.recipe_poster import render_recipe_poster_png  # noqa: PLC0415
        return render_recipe_poster_png(recipe_data)

    html_str = build_poster_html(recipe_data)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
            )
            page = browser.new_page(
                viewport={"width": POSTER_WIDTH, "height": POSTER_HEIGHT},
                device_scale_factor=1,
            )
            page.set_content(html_str, wait_until="networkidle")
            # 等待字型載入
            page.wait_for_timeout(800)
            element = page.query_selector(".poster")
            if element:
                png_bytes = element.screenshot(type="png")
            else:
                png_bytes = page.screenshot(type="png", full_page=True)
            browser.close()
        return png_bytes
    except Exception as exc:
        logger.error("Playwright 海報截圖失敗，退回 Pillow: %s", exc)
        from app.recipe_poster import render_recipe_poster_png  # noqa: PLC0415
        return render_recipe_poster_png(recipe_data)
