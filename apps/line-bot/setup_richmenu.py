"""
setup_richmenu.py — 一鍵部署 LINE Bot 圖文選單

使用方式：
    python3 setup_richmenu.py

需要在 .env 中設定 LINE_CHANNEL_ACCESS_TOKEN，
或直接在環境變數中設定。

圖檔預設為同目錄 **richmenu.jpg**（無則 **richmenu.png**）。LINE 上限 **1 MB**；
超過時若為 PNG 可 ``pip install Pillow`` 後由本程式嘗試轉 JPEG 再上傳。
"""
from __future__ import annotations

import json
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("❌ 找不到 LINE_CHANNEL_ACCESS_TOKEN，請確認 .env 設定")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}
BASE = "https://api.line.me/v2/bot/richmenu"
_DIR = os.path.dirname(__file__)
_default_img = os.path.join(_DIR, "richmenu.jpg")
if not os.path.isfile(_default_img):
    _default_img = os.path.join(_DIR, "richmenu.png")
IMAGE_PATH = os.getenv("RICHMENU_IMAGE_PATH", _default_img)
CONFIG_PATH = os.getenv("RICHMENU_CONFIG_PATH", os.path.join(_DIR, "richmenu_config.json"))

# LINE 圖文選單圖檔上限 1MB（超過會 413）
LINE_RICHMENU_IMAGE_MAX_BYTES = 1024 * 1024


def _binary_headers(content_type: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": content_type}


def _load_menu_image(path: str) -> tuple[bytes, str]:
    """讀取選單圖；超過 1MB 時嘗試轉成 JPEG（需 Pillow）。"""
    ext = os.path.splitext(path)[1].lower()
    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
    with open(path, "rb") as f:
        data = f.read()
    if len(data) <= LINE_RICHMENU_IMAGE_MAX_BYTES:
        return data, mime
    if mime == "image/jpeg":
        sys.exit(
            f"❌ 圖片約 {len(data) // 1024} KB，超過 LINE 上限 1 MB。\n"
            "   請降低 JPEG 品質或縮小檔案後再試。"
        )
    try:
        from io import BytesIO

        from PIL import Image
    except ImportError:
        sys.exit(
            f"❌ 圖片約 {len(data) // 1024} KB，超過 LINE 上限 1 MB。\n"
            "   請改存為壓縮 JPEG（建議 richmenu.jpg），或安裝 Pillow 後再執行：pip install Pillow"
        )
    im = Image.open(BytesIO(data))
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        im = bg
    else:
        im = im.convert("RGB")
    buf = BytesIO()
    for quality in range(88, 34, -8):
        buf.seek(0)
        buf.truncate(0)
        im.save(buf, format="JPEG", quality=quality, optimize=True)
        blob = buf.getvalue()
        if len(blob) <= LINE_RICHMENU_IMAGE_MAX_BYTES:
            return blob, "image/jpeg"
    sys.exit("❌ 無法將圖壓到 1 MB 以下，請縮小解析度（仍須符合 richmenu_config 的 size）。")


def step(msg: str):
    print(f"\n{'─'*50}\n🔧 {msg}")


def ok(msg: str):
    print(f"   ✅ {msg}")


def err(msg: str, resp: requests.Response):
    print(f"   ❌ {msg}")
    print(f"      Status: {resp.status_code}")
    try:
        print(f"      Body:   {resp.json()}")
    except Exception:
        print(f"      Body:   {resp.text[:200]}")
    sys.exit(1)


# ─── Step 1: Delete existing rich menus ─────────────────────────────────────────

step("清除舊的圖文選單…")
resp = requests.get(f"{BASE}s", headers=HEADERS)
if resp.ok:
    menus = resp.json().get("richmenus", [])
    for m in menus:
        mid = m["richMenuId"]
        del_resp = requests.delete(f"{BASE}/{mid}", headers=HEADERS)
        if del_resp.ok:
            ok(f"已刪除舊選單：{mid}")
        else:
            print(f"   ⚠️  刪除 {mid} 失敗（跳過）")
else:
    print("   ⚠️  取得舊選單失敗（繼續）")


# ─── Step 2: Create rich menu ────────────────────────────────────────────────────

step("建立圖文選單設定…")
with open(CONFIG_PATH, encoding="utf-8") as f:
    config = json.load(f)

resp = requests.post(BASE, headers=HEADERS, json=config)
if not resp.ok:
    err("建立圖文選單失敗", resp)

rich_menu_id = resp.json()["richMenuId"]
ok(f"選單 ID：{rich_menu_id}")


# ─── Step 3: Upload image ────────────────────────────────────────────────────────

step(f"上傳圖文選單圖片：{IMAGE_PATH}")
img_data, content_type = _load_menu_image(IMAGE_PATH)
headers_binary = _binary_headers(content_type)

resp = requests.post(
    f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
    headers=headers_binary,
    data=img_data,
)
if not resp.ok:
    err("圖片上傳失敗", resp)
ok(f"圖片上傳成功（{len(img_data) // 1024} KB，{content_type}）")


# ─── Step 4: Set as default rich menu ───────────────────────────────────────────

step("設為預設圖文選單（所有使用者）…")
resp = requests.post(
    f"{BASE}/{rich_menu_id}/users/all",
    headers=HEADERS,
)
if not resp.ok:
    # Fallback: try setting as default menu
    resp2 = requests.post(
        f"https://api.line.me/v2/bot/user/all/richmenu/{rich_menu_id}",
        headers=HEADERS,
    )
    if not resp2.ok:
        err("設定預設選單失敗", resp2)

ok("已設為所有使用者的預設圖文選單")


# ─── Done ────────────────────────────────────────────────────────────────────────

print(f"""
{'═'*50}
🎉  圖文選單部署完成！

   選單 ID : {rich_menu_id}
   按鈕數量 : 6 個（3×2 格局）

   ┌──────────────┬──────────────┬──────────────┐
   │  🍱 換菜單   │ 🎲 隨機配菜  │ ❤️ 我的最愛  │
   ├──────────────┼──────────────┼──────────────┤
   │  🏠 清冰箱   │ 💰 預算方案  │ 🛒 採買清單  │
   └──────────────┴──────────────┴──────────────┘

   開啟 LINE，傳訊息給你的 Bot 即可看到選單！
{'═'*50}
""")
