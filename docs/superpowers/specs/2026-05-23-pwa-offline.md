# Prompt 6 — PWA + 離線快取

**狀態**：已實作（2026-05-23）  
**路徑**：`web/`（非規格草稿中的 `apps/web/`）

## 目標

- 可安裝 PWA（manifest、icons、A2HS 提示）
- Service Worker（Serwist）快取靜態資源與 GET API
- IndexedDB（Dexie）快取最近 20 筆食譜；離線可讀 Library／詳情／烹飪模式
- 離線佇列：收藏、評分（不含週曆寫入、不含 POST 生成）

## 技術決策

| 項目 | 決策 |
|------|------|
| SW | Serwist `@serwist/next`；`app/sw.ts` → `public/sw.js` |
| Dev | SW 預設關閉（`NODE_ENV=development`） |
| 關閉 PWA | build：`ENABLE_PWA=false`；client：`NEXT_PUBLIC_ENABLE_PWA=false` |
| POST `/api/recipes` | NetworkOnly |
| RSC | NetworkOnly |
| 導覽 fallback | `/offline` |
| theme_color | `#FFFAF5`（design tokens） |
| Cook 頁 | Client loader + `fetchRecipeWithOffline` |
| 離線 user_id | `OFFLINE_DEVICE_USER = "device"`（session 為 httpOnly） |
| 評分 | Dexie `mutations` + 遷移 legacy `ratingQueue` |

## 環境變數

| 變數 | 說明 |
|------|------|
| `ENABLE_PWA` | `false` 時 build 不產生 SW |
| `NEXT_PUBLIC_ENABLE_PWA` | `false` 時不註冊 SW（client） |

## 驗收（需真機）

見原 Prompt 6 §13：安裝、離線 Library、離線 cook、上線後評分同步、SW 更新提示等。
