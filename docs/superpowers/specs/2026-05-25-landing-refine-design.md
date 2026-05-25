# Landing 精緻化：產品 mock 取代裝飾圖

**狀態**：設計已核准（2026-05-25）  
**優先序**：A（Hero 假主圖）→ B（全站行銷區避免食物照）→ C（補「怎麼用」區，避免頁面過瘦）  
**約束**：不改 API、不改路由、Landing 不新增 client 互動（靜態 mock）；不引入動畫庫

---

## 1. 問題與目標

### 現況

- `LandingPage` 僅 **Hero + UseCaseGrid + Footer**（`99dc88d` 瘦身後）。
- Hero 右側：`PhoneFrame` + `DemoRecipeCard`，內含 **4:3 主圖**（`MarketingVisual` → 預設 CSS 漸層，或 `NEXT_PUBLIC_MARKETING_USE_REAL_IMAGES=1` 載入 `hero-three-cup-chicken.jpg`）。
- 使用者感受：像 **裝飾用假食譜照**，未說明「輸入 → 生成食譜」；與產品價值脫節。
- `UseCaseCard` 已是 **純文字編輯風**（無圖）；`content.ts` 的 `useCases[].image` 為死資料。
- `FeatureSplit` / `FeaturePills` 仍存在於 repo 但 **未 import**（死碼）。

### 北極星

> 訪客在 Hero 5 秒內理解：**打一句話 → 得到結構化食譜**；全程無「假食物攝影／漸層占位主圖」。

### 成功指標

| 指標 | 目標 |
|------|------|
| Hero 右側 | 無 `<img>`、無 `/marketing/*` 請求（Landing Hero 區） |
| 產品對齊 | Mock 視覺與 `/app` 的 `HeroInput`、食譜卡摘要語言一致 |
| 資訊完整 | 新增 **三步驟帶**，說明輸入 → 料理書 → 廚房模式 |
| 死碼 | 移除未使用之 `DemoRecipeCard`、恢復用之舊 section 元件（見 §5） |
| 靜態驗證 | `pnpm -F @chef/web test`、型別檢查通過 |

### 明確不做（YAGNI）

- Landing 上 **真實 API 生成** 或假 loading 動畫循環
- 恢復 Prompt 9 完整五段式（含 `FeaturePills` 四格）
- 行銷食物攝影、`marketing:images` 新圖需求（Landing 路徑）
- 改 OG 動態圖、改 `/app` 行為
- `framer-motion` 或 scroll 動畫

---

## 2. 方案摘要（已選）

**做法 1 + 精簡做法 3**：Hero 保留 `PhoneFrame`，內容改 **靜態產品 mock**；主線下方加 **一條三步驟帶**（純 CSS mock，無截圖 PNG）。

---

## 3. Hero 右側（§1）

### 3.1 新元件 `LandingHeroMock`

**位置**：`web/components/marketing/LandingHeroMock.tsx`  
**用途**：取代 `DemoRecipeCard`，由 `Hero.tsx` 在 `PhoneFrame` 內 render。

**結構（自上而下，靜態）：**

1. **輸入列 mock**
   - 外觀對齊 `HeroInput`：`rounded-lg`、`border-border-default`、`bg-surface-default`、內距與字級接近真實輸入。
   - 顯示固定文案：`MARKETING_SECTION.hero.demoPrefill`（「台式三杯雞，30 分鐘內」），樣式為 `text-text-muted`（唯讀感）。
   - 右側或下方小按鈕樣式「生成」（`pointer-events-none`，不可點）。

2. **結果卡 mock**（緊接輸入下方，`mt-3`）
   - **無圖片**。
   - 頂部 **4px** 橫向漸層色條（沿用三杯雞色：`#E5A33D` → `#C8881A`，與現有 `DemoRecipeCard` fallback 一致）。
   - 標題：`demoRecipe.title`（三杯雞）、菜系 pill「台式」。
   - 副文：`{ingredientCount} 樣食材 · {stepCount} 個步驟`。

**無障礙：**

- 外層 mock 容器：`aria-hidden="true"`（裝飾性預覽）。
- 真實 CTA 維持 Hero 左側 `<Link href="/app">`、`<Link href={appPrefillHref(...)}>`，語意不變。

**互動：**

- 無 state、無 `useEffect`、無 fetch。
- `prefers-reduced-motion`：不加入動畫。

### 3.2 `Hero.tsx` 變更

```text
PhoneFrame
  └── LandingHeroMock   // 取代 DemoRecipeCard
```

左側文案與 CTA **不變**（`MARKETING_SECTION.hero`）。

### 3.3 `content.ts` 調整

- 保留 `demoRecipe.title`、`cuisine`、`ingredientCount`、`stepCount`、`demoPrefill`。
- **移除** `demoRecipe.image`、`demoRecipe.imageAlt`（Landing 不再使用）。
- **保留** `/marketing/hero-three-cup-chicken.jpg` 於 **API 主圖 placeholder**（`lib/media/hero-image.ts`），與 Landing 脫鉤。

---

## 4. 三步驟帶（§2）

### 4.1 新元件 `LandingHowItWorks`

**位置**：`web/components/marketing/LandingHowItWorks.tsx`  
**插入**：`LandingPage.tsx`，於 Hero `sectionY` 與 `UseCaseGrid` 之間。

**區塊標題（建議 copy，可微調）：**

- H2：`從一句話到上桌`
- 副標：`輸入想法、存入料理書、進廚房跟著做——不必來回聊天。`

**三欄（`grid`：`1 col` → `md:grid-cols-3`）：**

| 步驟 | 標題 | Mock 內容 | 文案來源 |
|------|------|-----------|----------|
| 1 | 輸入想法 | 縮小版輸入框 + 一行假送出按鈕 | 對齊 Tonight；無圖 |
| 2 | 存入料理書 | 2–3 行列表項（標題 + 菜系小字），無縮圖欄 | `MARKETING_SECTION.features.library` 文案 |
| 3 | 廚房模式 | **重用** `CookingMock`（自 `FeaturePreviewMocks.tsx` 抽出或 import） | `features.cooking` 文案 |

每欄下方：**標題（h3）+ 一句 body**（取自 `content.ts` 的 `library` / `cooking`；步驟 1 用新一句或 hero.body 精簡句）。

**視覺規範：**

- 每格：`rounded-xl border border-border-default bg-surface-default p-4 shadow-card`。
- Mock 區高度一致（建議 `aspect-[3/2]` 或 `min-h-[140px]`），**禁止** `MarketingVisual` 載入 `screenshot-library.png`。
- 步驟序號：可選 `01` `02` `03` 小字（`text-xs uppercase tracking-widest text-text-muted`）。

### 4.2 `FeaturePreviewMocks.tsx` 重構

- 將 `CookingMock` 抽至 `web/components/marketing/CookingModeMock.tsx`（或同檔 export），供 `LandingHowItWorks` 與（若仍需要）舊 `CookingFeatureShot` 共用。
- `LibraryFeatureShot`：**不再用於 Landing**；若僅被將刪除的 `FeatureSplit` 使用，隨 §5 一併移除。

---

## 5. 清理與資產（§3）

### 5.1 刪除檔案（實作時）

| 檔案 | 理由 |
|------|------|
| `DemoRecipeCard.tsx` | 由 `LandingHeroMock` 取代 |
| `FeatureSplit.tsx` | 未 import；三步驟帶取代其敘事 |
| `FeaturePills.tsx` | 未 import；與情境卡重複 |
| `FeaturePreviewMocks.tsx` | 拆分後刪除原檔，或僅留共用 mock 子檔 |

### 5.2 `content.ts`

- 自 `useCases[]` **刪除** `image` 欄位。
- 自 `features` **刪除** `screenshot` 路徑（`screenshot-library.png`、`screenshot-cooking-mode.png`），僅留 `title` + `body`。
- 可新增 `howItWorks.step1.body` 等三句，或內聯於元件（偏好集中於 `content.ts`）。

### 5.3 環境變數與 README

- `NEXT_PUBLIC_MARKETING_USE_REAL_IMAGES`：**Landing 不再讀取**。
- 更新 `web/public/marketing/README.md`：註明 Landing 不用行銷圖；`hero-three-cup-chicken.jpg` 仍供 **食譜主圖 API fallback**。
- 若全 repo 無其他 `MarketingVisual` 用於 UI：評估是否保留 `MarketingVisual.tsx`（僅 API/legacy）；本輪至少 Hero/三步驟不引用。

### 5.4 測試

- 若有 marketing 元件 snapshot／render 測試則更新。
- 手動驗收清單（Vercel Production）：
  - [ ] Hero 右側無食物圖、有輸入+結果 mock
  - [ ] 三步驟帶三欄在手機直向可讀（堆疊）
  - [ ] 情境卡 CTA 仍連 `/app?prefill=`
  - [ ] Lighthouse / Network：Landing 不請求 `/marketing/*.jpg`（Hero 區）

---

## 6. 檔案變更清單（實作參考）

| 動作 | 路徑 |
|------|------|
| 新增 | `components/marketing/LandingHeroMock.tsx` |
| 新增 | `components/marketing/LandingHowItWorks.tsx` |
| 新增 | `components/marketing/CookingModeMock.tsx`（可選拆分） |
| 修改 | `components/marketing/Hero.tsx` |
| 修改 | `components/marketing/LandingPage.tsx` |
| 修改 | `lib/marketing/content.ts` |
| 修改 | `components/marketing/UseCaseCard.tsx`（型別移除 `image`） |
| 刪除 | `DemoRecipeCard.tsx`、`FeatureSplit.tsx`、`FeaturePills.tsx`、… |
| 文件 | `CHANGELOG.md`、`TODOS.md`（里程碑收尾時） |

---

## 7. 風險與緩解

| 風險 | 緩解 |
|------|------|
| Mock 與真實 `HeroInput` 日後漂移 | 共用 token class；註解指向 `HeroInput.tsx` |
| 頁面變長影響 LCP | 無額外圖片請求；mock 為輕量 DOM |
| 刪 `FeatureSplit` 誤傷其他 import | `rg FeatureSplit` 確認零引用後刪 |

---

## 8. 核准紀錄

- 使用者確認：**做法 1（Hero 產品 mock + PhoneFrame）**、範圍 **Hero + 三步驟帶**。
- 下一步：實作計畫（`writing-plans` skill）→ 實作 → `pnpm -F @chef/web test` → push → Vercel 驗收。
