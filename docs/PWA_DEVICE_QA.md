# PWA 真機驗收清單

在 **Production build**（非 `next dev`）於手機或平板驗收。本機可先：

```bash
pnpm -F @chef/web build && pnpm -F @chef/web start
```

開啟 `http://<LAN-IP>:3000` 或部署網域。確認 Vercel **未**設 `NEXT_PUBLIC_ENABLE_PWA=false`。

規格：[`superpowers/specs/2026-05-23-pwa-offline.md`](superpowers/specs/2026-05-23-pwa-offline.md)

---

## 1. 安裝與更新

| # | 步驟 | 預期 |
|---|------|------|
| 1.1 | iOS Safari / Android Chrome 開啟站點 | 可正常載入 |
| 1.2 | 加入主畫面（A2HS） | 圖示與名稱正確 |
| 1.3 | 從主畫面啟動 | 全螢幕或獨立視窗，非瀏覽器分頁感 |
| 1.4 | 部署新版本後再開啟 | 出現 SW 更新提示或重整後為新版 |

---

## 2. 離線 — 料理書

| # | 步驟 | 預期 |
|---|------|------|
| 2.1 | 線上開啟 `/app/library`，瀏覽數道食譜詳情 | 食譜寫入 IndexedDB 快取 |
| 2.2 | 開啟飛航模式 | 頂部顯示離線狀態 |
| 2.3 | 再開 `/app/library` | 顯示「離線模式：僅顯示已快取的食譜」；已快取項目可開 |
| 2.4 | 開未快取食譜 ID | 合理錯誤，不白屏 |

---

## 3. 離線 — 烹飪模式

| # | 步驟 | 預期 |
|---|------|------|
| 3.1 | 線上進入 `/app/library/[id]/cook` | 步驟與計時器正常 |
| 3.2 | 飛航模式下開**已快取**食譜的 cook | 可讀步驟、可切換 |
| 3.3 | 完成並評分（1–5） | 離線時「評分稍後同步」；恢復網路後評分同步成功 |

### 3.5 烹飪 GA（Wave 1，產線 build）

> **CI 自動覆蓋**（不需真機）：`pnpm -F @chef/web test:e2e` 含示範烹飪走完＋mock 完整漏斗（生成→收藏→烹飪→完成→分享）。下列 3.5.3–3.5.5 仍須 **iPhone 真機** 勾選。

| # | 步驟 | 預期 | 自動 |
|---|------|------|------|
| 3.5.1 | 詳情頁主按鈕進入 cook（`?source=detail`） | `cooking_mode_started` 含 `source: detail` | 部分（mock 漏斗） |
| 3.5.2 | 滾動後 sticky CTA 進入 cook（`?source=sticky_cta`） | `source: sticky_cta` | 人工 |
| 3.5.3 | 螢幕鎖定約 5 分鐘（Wake Lock） | 計時持續 | 人工 |
| 3.5.4 | 切到背景再回前景 | 計時／步驟狀態仍正確 | 人工 |
| 3.5.5 | 語音朗讀 toggle | 可開關，不中斷步驟 | 人工 |
| 3.5.6 | 走完步驟並評分 | `cooking_mode_completed` 含 `duration_bucket`、`rating_bucket` | ✅ E2E |
| 3.5.7 | 生成結果頂部決策卡 | 顯示分鐘／人數／需購買或「不必採買」 | 人工 |
| 3.5.8 | 步驟 `step_tip` 一行提示 | 詳情／烹飪／生成結果可見 💡 文案 | ✅ E2E（demo） |

---

## 4. 晚餐推播（Periodic Sync + client timer）

| # | 步驟 | 預期 |
|---|------|------|
| 4.1 | `/app/me` 開啟晚餐提醒並允許通知 | 設定寫入 Cache + SW |
| 4.2 | 設定時間為數分鐘後（測試用） | client timer 或 SW `periodicsync` 觸發 |
| 4.3 | 關閉 PWA／分頁後到點 | 收到「今晚想吃什麼？」通知（同日僅一次） |
| 4.4 | 點擊通知 | 開啟 `/app` |
| 4.5 | PostHog（可選） | `dinner_reminder_fired` 含 `channel: sw` 或 `client` |

> `periodicSync` 需 Chromium 系瀏覽器且已安裝 PWA；不支援時仍依 client `setTimeout` 與 SW `activate` 備援。

---

## 5. 離線 — 收藏

| # | 步驟 | 預期 |
|---|------|------|
| 5.1 | 離線在料理書點 ♥ 收藏 | UI 立即切換（optimistic） |
| 5.2 | 恢復網路 | Dexie `mutations` flush；重整後收藏狀態正確 |

---

## 6. 廚房計時（線上）

| # | 步驟 | 預期 |
|---|------|------|
| 6.1 | 步驟內啟動計時器 | 倒數正確 |
| 6.2 | 螢幕鎖定約 5 分鐘（Wake Lock） | 計時持續（機型允許時） |
| 6.3 | 計時結束 | 震動／提示音（若瀏覽器允許） |

---

## 7. Playwright E2E（開發者）

```bash
pnpm -F @chef/web build
NEXT_PUBLIC_NEW_UI=1 NEXT_PUBLIC_COOKING_MODE_ENABLED=1 pnpm -F @chef/web test:e2e
```

| 規格檔 | 涵蓋 |
|--------|------|
| `web/e2e/demo-cook-funnel.spec.ts` | 示範烹飪完成 + step_tip |
| `web/e2e/recipe-funnel-mocked.spec.ts` | 生成→收藏→烹飪→完成→分享（API mock） |

---

## 8. 刻意不支援（已知）

- 離線 **POST 生成食譜**（NetworkOnly）
- 離線 **週曆 PUT**（未入佇列）
- **開發模式** `pnpm dev:web` 預設不註冊 SW

---

## 回報格式

```
裝置 / 瀏覽器：
Build URL：
失敗項編號（如 3.2）：
現象：
```
