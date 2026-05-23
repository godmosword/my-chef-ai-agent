# Marketing 靜態圖片

預設 Landing 使用 **CSS 漸層占位**（不請求 `/marketing/*`）。

本 repo 已含 **`pnpm -F @chef/web marketing:images`** 產生的漸層占位圖（可提交）。在 Vercel 設 **`NEXT_PUBLIC_MARKETING_USE_REAL_IMAGES=1`** 即改以 `<img>` 顯示下列檔案。

若要換成真實攝影／截圖，覆寫同名檔案即可。

| 檔名 | 尺寸建議 |
|------|----------|
| `hero-three-cup-chicken.jpg` | 800×600 |
| `usecase-fridge-tomato-eggs.jpg` | 800×600 |
| `usecase-kids-rice-bowl.jpg` | 800×600 |
| `usecase-guest-beef-stew.jpg` | 800×600 |
| `screenshot-library.png` | 1200×800 |
| `screenshot-cooking-mode.png` | 1200×800 |

OG 分享卡由 `app/opengraph-image.tsx` 動態產生，無需 `og-image.png`。
