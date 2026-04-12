"""
setup_richmenu.py — 一鍵部署 LINE Bot 圖文選單

使用方式：
    python3 setup_richmenu.py

需要在 .env 中設定 LINE_CHANNEL_ACCESS_TOKEN，
或直接在環境變數中設定。
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
HEADERS_BINARY = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "image/png",
}

BASE = "https://api.line.me/v2/bot/richmenu"
IMAGE_PATH = os.path.join(os.path.dirname(__file__), "richmenu.png")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "richmenu_config.json")


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
with open(IMAGE_PATH, "rb") as f:
    img_data = f.read()

resp = requests.post(
    f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
    headers=HEADERS_BINARY,
    data=img_data,
)
if not resp.ok:
    err("圖片上傳失敗", resp)
ok(f"圖片上傳成功（{len(img_data) // 1024} KB）")


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
