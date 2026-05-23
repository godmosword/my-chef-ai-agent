# Marketing 靜態圖片

預設 Landing 使用 **CSS 漸層占位**（不請求 `/marketing/*`，避免 400）。

將下列檔案放於此目錄後，在 Vercel 設 `NEXT_PUBLIC_MARKETING_USE_REAL_IMAGES=1` 即改顯示真實圖。

| 檔名 | 尺寸建議 |
|------|----------|
| `hero-three-cup-chicken.jpg` | 800×600 |
| `usecase-fridge-tomato-eggs.jpg` | 800×600 |
| `usecase-kids-rice-bowl.jpg` | 800×600 |
| `usecase-guest-beef-stew.jpg` | 800×600 |
| `screenshot-library.png` | 1200×800 |
| `screenshot-cooking-mode.png` | 1200×800 |

OG 分享卡由 `app/opengraph-image.tsx` 動態產生，無需 `og-image.png`。
