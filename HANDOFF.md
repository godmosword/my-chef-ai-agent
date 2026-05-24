# Session Handoff — 2026-05-24

For the next Claude / Cursor session picking up this branch.

## Just shipped (16 commits, all on `main`, Vercel auto-deployed)

### Round 1 — UX feedback v1 (C1–C10)
- C1 `8f2bff7` sticky header removed + quota copy clarified
- C2 `ce55c14` typography.md scale + sidebar/Me/Quota tidied
- C3 `a609d6a` RecipeDetailHero → `aspect-[16/9] max-w-[480px]`
- C4 `767c191` header gear → settings Sheet
- C5 `f6af762` library inspiration chips (8 scenarios)
- C6 `8015a96` 「已永久保存」hero badge + card tooltip
- C7 `a8adc09` Today 桌面右側 sticky 「今日靈感」18rem 卡
- C8 `41b020f` `text-[11px]` → `text-xs` cleanup
- C9 `c990b51` `web/scripts/audit-hero-persistence.ts` (needs DATABASE_URL)
- C10 `ef96742` `/app/settings` standalone route + nav gear

### Round 1.5 — Landing slim
- `99dc88d` 砍掉 FeatureSplit + FeaturePills（components 還在 tree、未 import）

### Round 2 — UX feedback v2 (D1–D10)
- D1 `c45036c` share icon `size-4 → size-5`
- D2 `f1363d9` **sidebar 文學語感**：今晚吃什麼 / 我的食譜 / 週菜單 / 買菜清單 / 你 / 偏好
- D3 `ef8c2cf` `BackLink` 元件統一返回鍵
- D4 `3990b1c` **料理書當機修復** — IndexedDB fire-and-forget + bulkPut + strip data URL hero
- D5 `56487e8` 詳情頁步驟收合（預設 2 步）
- D6 `8a2d985` **prep/cook/servings 端到端**（含 migration 0009）
- D7 `eca31b2` 食材分量 0.5x/1x/2x/4x scaling
- D8 `31956f8` 食材 + 步驟 checkbox（24h localStorage TTL）
- D9 `1676ce7` 「我的筆記」textarea + 營養標示 placeholder
- D10 `e750446` 分享按鈕第一次點擊自動發布

---

## CRITICAL: 必做動作

### 1. 跑 prod DB migration
D6 加了三個 column。**直到 migration 跑完，新生成的食譜會 insert fail**（因為 Drizzle schema 已寫入但 DB column 不存在）。
```bash
DATABASE_URL=<prod_url> pnpm -F @chef/web db:migrate
```
Migration 是 idempotent（`ADD COLUMN IF NOT EXISTS`），重複跑安全。

### 2. 跑一次 audit 確認 hero 持久性
```bash
DATABASE_URL=<prod_url> pnpm -F @chef/web tsx scripts/audit-hero-persistence.ts
```
回報「過去 30 天 hero_status=ready 但 hero_url 為 NULL」的食譜數。期望 = 0。

---

## 已知風險 / 未做的事

| 風險 | 影響 | 後續處理 |
|---|---|---|
| Marketing/SEO copy (opengraph-image, page metadata, FeaturePreviewMocks, AppOnboardingOverlay) 還用舊詞「料理書 / 今晚 / 採買」 | 站外搜尋結果/分享預覽不一致 | 下輪一起整 |
| `FeatureSplit` / `FeaturePills` components 還在 `web/components/marketing/` 但已不 import | 死碼，bundler 會 tree-shake，不會進 prod bundle | 確認沒問題後可刪 |
| 烹飪模式 `CookingModeClient` 進度 **沒** 跟詳情頁 D8 checkbox sync | 兩邊獨立勾選 | 後續 wire 起來：cooking 完成一步 → 寫 `recipe-${id}-progress.steps`；詳情頁 mount 時讀 |
| 營養標示只是 placeholder | 使用者期待落差 | LLM 估算或 USDA FoodData API；2 小時左右；準度不高 |
| `RecipeDetailSections` 已是 client component；舊版是 server component | 多了 hydration cost，但範圍很小 | 監測 LCP，若退化考慮拆分 |
| Migration 沒在 CI/CD 自動跑 | 每次 schema 變更要手動跑 | 加 Vercel build hook 或 GitHub Action |

---

## Future plan — 排序 by ROI

### Quick wins (各 < 30 min)
1. **Marketing copy 跟著 D2 改字** — 一致性 (opengraph-image / page metadata / AppOnboardingOverlay / UseCaseGrid)
2. **刪掉 FeatureSplit + FeaturePills + 相關 mocks** — 死碼清理
3. **Cooking mode 進度同步詳情頁 checkbox** — D8 的延伸
4. **詳情頁加列印按鈕** — `window.print()` + `@media print` CSS，5 分鐘
5. **「Jump to recipe」錨點按鈕** — 詳情頁長文章常見模式，scroll to ingredients

### Medium (30–90 min)
6. **scaleAmount 處理單位轉換**（150g × 2 = 300g, 但 12 oz × 2 應該 = 1.5 lb）— 食譜網站常見
7. **份量直接打數字輸入框**（不只 0.5/1/2/4x）— 自由縮放
8. **詳情頁 hero 縮圖快取**（取代 data URL strip 後的 NULL）— 例如 generate 80×80 thumbnail 存在 IndexedDB
9. **評分系統**（recipes.rating 已有欄位但前端沒接） — 1–5 星 + 平均顯示
10. **Recipe versions 對比 diff** — 已有 versions API GET，前端 UI 沒做

### Large (> 2 hr)
11. **真實營養標示** — LLM 估算 prompt + per-ingredient table + 響應式快取
12. **Print/PDF 匯出（樣式化）** — 印表用 CSS、無 sidebar、份量勾選保留
13. **相關食譜推薦** — embeddings on recipe_name + cuisine + ingredients
14. **Cooking mode 加入「靜默計時器」聲音** — Web Audio API
15. **多人協作食譜** — 需要 auth + sharing schema 升級

### 商業向（user 自己決定）
16. **付費 plan 升級 CTA** — 在 quota indicator 旁
17. **食譜公開市集** — 已有 share token 機制，可擴成市集
18. **AI 圖片重生額度分開計費** — 目前跟 text 共用 daily limit

---

## Workflow rules（per `CLAUDE.md`）

- **永不**啟動 dev server / 用 localhost 給 user 看
- Edit → `npx tsc -p web --noEmit` → commit specific files → `git push origin main`
- 不開 PR、不開 feature branch
- Vercel auto-deploy；user 自己上 prod 看
- 視覺/runtime 風險高的改動：明說「我沒辦法靜態驗證，已推 main，請去 Vercel 試」
- Conventional commit prefix: `feat(web): / fix(web): / refactor(web): / chore: / perf(web):`
- 不加 Co-Authored-By trailer

## Memory 位置

`/Users/godmosword.eth/.claude/projects/-Users-godmosword-eth-Downloads-my-chef-ai-agent/memory/`
目前只有一條：deploy workflow（即上面這節）。

## Plan 檔位置

`/Users/godmosword.eth/.claude/plans/https-github-com-nexu-io-open-design-rep-toasty-thompson.md`
（檔名歷史殘留，已被覆寫 2 輪。內含 v2 計畫的完整詳述。）
