# Marketing 靜態圖片

**Landing 首頁**已改為純 UI mock，**不會**請求本目錄檔案。

## API 主圖備援

`hero-three-cup-chicken.jpg` 仍供生圖 API fallback（`lib/media/hero-image.ts`），與 Landing 無關。

## 其餘檔案（legacy）

下列檔案可由 `pnpm -F @chef/web marketing:images` 產生漸層占位圖；目前 **無** Landing 元件引用。保留僅供日後行銷或腳本使用。

| 檔名 | 備註 |
|------|------|
| `hero-three-cup-chicken.jpg` | API placeholder |
| `usecase-*.jpg` | 已自 Landing 移除 |
| `screenshot-*.png` | 已自 Landing 移除 |

OG 分享卡由 `app/opengraph-image.tsx` 動態產生，無需 `og-image.png`。
