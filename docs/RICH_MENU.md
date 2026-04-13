# LINE 圖文選單（Rich Menu）維護指南

本專案 Rich Menu 由 **`richmenu_config.json`**（熱區與動作）+ **`richmenu.jpg`**（底圖，可改 `richmenu.png`）組成，透過 **[`setup_richmenu.py`](../setup_richmenu.py)** 呼叫 LINE API 上傳。程式庫無法替你「選品牌風格」；視覺定稿應在 **Figma／設計工具** 完成後再匯出圖檔，本文件說明規格、對齊方式與排查。

---

## LINE 官方限制（必讀）

| 項目 | 本專案設定 |
|------|------------|
| 圖檔寬高 | 須與 JSON `size` 一致：**2500 × 1686**（px） |
| 格式 | **JPEG** 或 **PNG** |
| 檔案大小 | **最大 1 MB**；超過會回 **413 Request Entity Too Large**（常見為 nginx 回應） |
| 熱區 | 每個 `area` 的 `bounds` 須與畫面上可點區域對齊；改版型必同步改座標 |

官方文件：[使用 Rich menus](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)

---

## `bounds` 與按鈕對照表（Figma 參考線）

以下摘自根目錄 [`richmenu_config.json`](../richmenu_config.json)。在 Figma 建 **2500×1686** 畫框後，請依 **x, y, width, height** 拉參考矩形，確保視覺按鈕落在矩形內（建議內縮 **8–16 px** 安全邊，避免邊緣誤觸）。

版面為 **上列 3 格、下列 3 格**；每格約 **822×766**，上列 **y=138**，下列 **y=912**，左右欄起點 **x=8 / 838 / 1668**。

| 列 | 順序 | x | y | width | height | label（顯示） | 送出 `text`（勿隨意改，與 handler 對齊） |
|:--:|:----:|:-:|:-:|:-:|:-:|:--|:--|
| 上 | 左 | 8 | 138 | 822 | 766 | 主選單 | `選單` |
| 上 | 中 | 838 | 138 | 822 | 766 | 隨機配菜 | `🍳 隨機配菜` |
| 上 | 右 | 1668 | 138 | 822 | 766 | 我的最愛 | `我的最愛` |
| 下 | 左 | 8 | 912 | 822 | 766 | 清冰箱模式 | `清冰箱模式` |
| 下 | 中 | 838 | 912 | 822 | 766 | 預算方案 | `幫我規劃預算食譜` |
| 下 | 右 | 1668 | 912 | 822 | 766 | 查看採買清單 | `🛒 檢視清單` |

**警告**：若只改 `label` 而不改 `text`，使用者看到的字與實際觸發指令可能不一致。若要改 **觸發文字**，必須一併檢查 [`app/handlers.py`](../app/handlers.py) 等指令路由，避免行為斷裂。

`chatBarText` 目前為：`👨‍🍳 一鍵叫主廚`（可於 JSON 內調整，再上傳）。

---

## 為什麼不靠「某個 UI repo 直接產圖」？

GitHub 上多數專案處理的是 **Rich Menu API**（建立 ID、上傳二進位、綁預設），例如：

- [line/demo-rich-menu-bot](https://github.com/line/demo-rich-menu-bot) — 官方行為與版型靈感  
- [line/line-api-use-case-messaging-api](https://github.com/line/line-api-use-case-messaging-api) — 文件與流程（含 rich menu 建立）  
- [line-developer-community/xaml-richMenu-maker](https://github.com/line-developer-community/xaml-richMenu-maker) — 以 XAML 對齊區塊  

**視覺風格**（色票、字體、插畫）建議參考通用設計系統後在 Figma 手動定稿，例如：

- [primer/design](https://github.com/primer/design) — 對比、層級、可讀性  
- [shadcn-ui/ui](https://github.com/shadcn-ui/ui) — 現代元件與間距語彙  

Rich Menu 在 LINE 內是 **單張點擊圖 + 座標**，不是 React 元件；上述 repo 用於 **設計決策**，不是下載即用的底圖檔。

---

## 上傳到 LINE

### 前置

- `.env` 或環境變數已設定 **`LINE_CHANNEL_ACCESS_TOKEN`**
- 建議：`pip install -r requirements-dev.txt`（含 **Pillow**，供 `setup_richmenu.py` 在 PNG 超過 1 MB 時嘗試轉 JPEG）

### 指令

```bash
python3 setup_richmenu.py
```

### 自訂路徑

| 環境變數 | 說明 |
|----------|------|
| `RICHMENU_IMAGE_PATH` | 圖檔路徑（預設：專案根目錄 `richmenu.jpg`，若不存在則 `richmenu.png`） |
| `RICHMENU_CONFIG_PATH` | JSON 路徑（預設：`richmenu_config.json`） |

腳本會依副檔名設定 **`Content-Type`**：`image/jpeg` 或 `image/png`。

---

## 常見錯誤

### 413 Request Entity Too Large

- **原因**：圖檔超過 **1 MB**。  
- **處理**：匯出 **JPEG** 並降品質／略縮（仍須 **2500×1686**）；或安裝 Pillow 後再執行腳本，讓大 PNG 自動嘗試轉 JPEG。目標建議 **≤ 800 KB**，預留余量。

### 點了沒反應或觸發錯指令

- **原因**：底圖按鈕與 `bounds` 沒對齊。  
- **處理**：在 Figma 用本節對照表重對參考線；若改格線，同步修改 `richmenu_config.json` 內每區 `bounds`。

### 手機上看不到新選單

- 成功上傳後，嘗試 **離開聊天室再進入**，或稍等快取更新。

---

## 迭代檢核表（設計／匯出／驗證）

適用於「Figma 定稿 → 覆蓋倉庫圖檔 → 上傳 LINE」每一輪（由設計或維運在本機執行）。

1. [ ] Figma 畫板 **2500×1686**，已依上表拉出 **六個 bounds** 參考矩形  
2. [ ] 視覺主題已定（建議：**淺底深字** 或 **線框格**，避免過重底色不利閱讀）  
3. [ ] 匯出 **JPEG**，確認檔案 **遠小於 1 MB**  
4. [ ] 覆蓋專案根目錄 **`richmenu.jpg`**（或設 `RICHMENU_IMAGE_PATH`）  
5. [ ] 執行 **`python3 setup_richmenu.py`** 全綠  
6. [ ] 在 LINE 開啟 Official Account 聊天，**重進** 後逐格點擊，確認訊息與 bot 行為正確  

（若僅改 `chatBarText` 或 `label` 而未改圖，仍須重新跑腳本以更新 LINE 端設定。）

---

## 與食譜 Flex 的關係

食譜卡片樣式在 **`app/flex_messages.py`**，與 Rich Menu **無共用程式檔**；若希望品牌一致，請在設計規格中統一 **色票與字體**，分別套用在 Figma（Rich Menu）與 Flex 設計稿／程式常數。
