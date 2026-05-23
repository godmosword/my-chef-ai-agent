# Frontend Wave 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver ABCD frontend polish in three vertical slices (4a → 4b → 4c): first-success generation UX, cook/share depth, then Plan/Shopping/Me parity—without API or schema changes.

**Architecture:** Journey slices on existing Next.js App Router + Tailwind + `@chef/design-tokens`. Reuse `RecipeDetailHero`, `useHeroPolling`, `HeroInput` (Prompt 10). Introduce `StreamingRecipePanel` (hero + result), optional `RecipeDetailLayout`, `SectionHeader` (4c). Dark mode via token.json dark values + `pnpm tokens:build`.

**Tech Stack:** Next.js 15, React 19, Tailwind 3, next-themes (`data-theme`), `@chef/design-tokens`, Vitest.

**Spec:** [`docs/superpowers/specs/2026-05-24-frontend-wave4-design.md`](../specs/2026-05-24-frontend-wave4-design.md)

**Branch:** `cursor/frontend-wave4-8bf7` off `main` (one branch per wave or single branch with wave commits—prefer **3 merge commits** on one branch).

---

## File map (created / modified)

| File | Responsibility |
|------|----------------|
| `web/components/recipe/RecipeResultHero.tsx` | Hero + polling for inline result (4a) |
| `web/components/patterns/StreamingRecipe.tsx` | Result card layout, error/429 copy (4a) |
| `web/components/patterns/HeroInput.tsx` | `streaming` prop → footer「生成中…」(4a) |
| `web/app/(app)/app/page.tsx` | Wire CTAs, pass streaming, quota hint (4a) |
| `web/components/recipe/RecipeDetailLayout.tsx` | Hero-first + sections + sticky cook bar (4a) |
| `web/app/(app)/app/library/[id]/page.tsx` | Use layout (4a) |
| `packages/design-tokens/src/tokens.json` | Dark palette (4a) |
| `web/components/cooking/CookingModeClient.tsx` | Typography polish (4b) |
| `web/app/r/[token]/page.tsx` | Public layout parity (4b) |
| `web/components/patterns/SectionHeader.tsx` | Shared section title (4c) |
| `web/app/(app)/app/plan/**`, `shopping/**`, `me/**` | Visual parity (4c) |

---

# Wave 4a — First successful generation

## Task 1: Dark token minimal palette

**Files:**
- Modify: `packages/design-tokens/src/tokens.json`
- Regenerates: `packages/design-tokens/dist/tokens.css`

- [ ] **Step 1: Set dark values in tokens.json**

In `color.background.default`, `background.alt`, `surface.*`, `border.default`, `text.ink`, `text.body`, `text.muted`, set `"dark"` to distinct values (example):

```json
"default": {
  "$type": "color",
  "$value": {
    "light": "#FFFAF5",
    "dark": "#141210"
  }
}
```

Use: surface `#1F1C19`, muted surface `#2A2622`, border `#3D3530`, text ink `#F5F0E6`, body `#D4C9BC`, muted `#9C8F84`. Keep brand primary/green unchanged.

- [ ] **Step 2: Rebuild tokens**

```bash
cd /workspace && pnpm tokens:build
```

Expected: `Generated N color tokens` without error.

- [ ] **Step 3: Smoke dark theme**

```bash
pnpm -F @chef/web dev
```

Open `/app/me` → switch theme to 深色 → confirm `/app` background is dark, text readable.

- [ ] **Step 4: Commit**

```bash
git add packages/design-tokens/src/tokens.json packages/design-tokens/dist/
git commit -m "feat(tokens): add dark palette for app surfaces (wave 4a-B)"
```

---

## Task 2: Streaming result panel with hero polling

**Files:**
- Create: `web/components/recipe/RecipeResultHero.tsx`
- Modify: `web/components/patterns/StreamingRecipe.tsx`
- Modify: `web/components/patterns/HeroInput.tsx`
- Modify: `web/app/(app)/app/page.tsx`

- [ ] **Step 1: Create RecipeResultHero**

```tsx
"use client";

import Image from "next/image";
import type { RecipePayload } from "@chef/shared-types";
import { HeroPlaceholder } from "@/components/recipe/HeroPlaceholder";
import { useHeroPolling } from "@/hooks/useHeroPolling";

export function RecipeResultHero({ recipe }: { recipe: RecipePayload }) {
  const initialStatus =
    recipe.hero_status ?? (recipe.photo_url ? "ready" : "pending");
  const { status, url } = useHeroPolling(
    recipe.id,
    initialStatus,
    recipe.photo_url,
    Boolean(recipe.id) &&
      (initialStatus === "pending" || initialStatus === "generating"),
  );
  const heroUrl = url ?? recipe.photo_url;

  return (
    <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-border-default">
      {status === "ready" && heroUrl ? (
        <Image src={heroUrl} alt="" fill className="object-cover" unoptimized sizes="640px" />
      ) : (
        <HeroPlaceholder
          status={status}
          cuisine={recipe.cuisine ?? recipe.theme}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Upgrade StreamingRecipe**

- Import `RecipeResultHero`, `Chip` from primitives.
- When `!streaming && recipe.id`: render `RecipeResultHero` at top.
- Error block: if message includes `額度` or `429`, append link `<Link href="/app/me">查看配額</Link>`.
- Section headings stay `text-sm font-medium`; keep ingredient/step lists.

- [ ] **Step 3: HeroInput streaming footer**

Add prop `streaming?: boolean`. When `streaming`, submit button shows `生成中…` and is disabled; quick prompt buttons disabled (already via parent `disabled`).

- [ ] **Step 4: Today page wiring**

In `page.tsx`:
- Pass `streaming={streaming}` to `PrefillHeroInput`.
- Move primary CTAs **inside** or directly under `StreamingRecipe` when `recipe && !streaming` (keep 查看詳情 / 再做一道).
- Remove duplicate CTA block if merged into StreamingRecipe—**or** keep below article; spec: prominent under result—prefer CTAs immediately below `StreamingRecipe` in a `flex gap-2` row.

- [ ] **Step 5: Build & test**

```bash
pnpm -F @chef/web build && pnpm -F @chef/web test
```

Expected: exit 0.

- [ ] **Step 6: Manual check**

Generate recipe on `/app` → see hero placeholder → image (or placeholder ready) within ~10s; click 查看詳情.

- [ ] **Step 7: Commit**

```bash
git add web/components/recipe/RecipeResultHero.tsx web/components/patterns/StreamingRecipe.tsx web/components/patterns/HeroInput.tsx web/app/(app)/app/page.tsx
git commit -m "feat(web): streaming recipe result panel with hero polling (wave 4a-A)"
```

---

## Task 3: Recipe detail hero-first layout

**Files:**
- Create: `web/components/recipe/RecipeDetailLayout.tsx`
- Modify: `web/app/(app)/app/library/[id]/page.tsx`

- [ ] **Step 1: Create RecipeDetailLayout**

Props: `recipe: RecipePayload`, `headerActions?: React.ReactNode`, `children` (ingredients/steps).

Structure:
- `RecipeDetailHero` full width (already exists—use it once at top).
- Header row: `h1` serif `text-3xl`, cuisine as `Chip`.
- `children` with `mt-6 space-y-6`.
- Sticky bottom bar (mobile): `fixed inset-x-0 bottom-0 ... pb-safe` only when `FLAGS.cookingMode && recipe.id` → Link to cook. Add `pb-24` on main content on mobile.

Section titles inside page: `h2 className="text-sm font-medium text-text-ink"` for 食材 / 步驟.

- [ ] **Step 2: Refactor library [id] page**

Replace inline article body with `<RecipeDetailLayout recipe={recipe} headerActions={<RecipeShareMenu ... />}>` wrapping ingredient/step sections.

Remove duplicate `RecipeDetailHero` if layout includes it.

- [ ] **Step 3: Build**

```bash
pnpm -F @chef/web build
```

- [ ] **Step 4: Manual check**

Open `/app/library/[id]` on 375px width: hero on top, cook button visible, no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add web/components/recipe/RecipeDetailLayout.tsx web/app/(app)/app/library/[id]/page.tsx
git commit -m "feat(web): recipe detail hero-first layout (wave 4a-C)"
```

---

## Task 4: Wave 4a docs & milestone

**Files:**
- Modify: `CHANGELOG.md`, `TODOS.md`

- [ ] **Step 1: Add CHANGELOG Unreleased section for Wave 4a**

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md TODOS.md
git commit -m "docs: changelog for frontend wave 4a"
```

- [ ] **Step 3: Push & verify spec checklist 3.5**

```bash
git push -u origin cursor/frontend-wave4-8bf7
```

---

# Wave 4b — Cook + public share

## Task 5: Cooking mode typography polish

**Files:**
- Modify: `web/components/cooking/CookingModeClient.tsx`
- Modify: `web/app/globals.css` (only if `.cooking-mode` needs token bridge)

- [ ] **Step 1: Audit CookingModeClient**

Ensure step text uses `font-serif text-2xl` or larger; timer pill uses `bg-brand-primary`. Replace any `#hex` with CSS variables where touched.

- [ ] **Step 2: Completion toast**

On cook complete / rating saved: `toast({ title: "已記錄完成", description: "這道菜已加入你的料理書紀錄" })` via existing `useToast`.

- [ ] **Step 3: Build + manual cook flow**

`/app/library/[id]/cook` → complete one step → timer → finish.

- [ ] **Step 4: Commit**

```bash
git commit -am "polish(web): cooking mode typography and completion toast (wave 4b-C)"
```

---

## Task 6: Public recipe page layout parity

**Files:**
- Modify: `web/app/r/[token]/page.tsx`

- [ ] **Step 1: Align with detail layout**

Reuse `RecipeDetailLayout` **or** mirror structure: hero image on top (`hero_url` from public payload), serif title, section headers 14px.

Public page is server component—extract `RecipeDetailSections` (server-safe, no polling) for ingredients/steps lists shared with detail.

- [ ] **Step 2: Optional OG** (non-blocking)

If `hero_url` exists, ensure `<img>` or next/image with unoptimized for external URLs.

- [ ] **Step 3: Build + open `/r/<token>`**

- [ ] **Step 4: Commit**

```bash
git commit -am "polish(web): public recipe page layout parity (wave 4b-C)"
```

---

## Task 7: Library meta + wave 4b docs

**Files:**
- Modify: `web/lib/recipe-display.ts` (confirm `lastCookedAt` on cards—already)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Verify library cards show relative time** — fix format if missing.

- [ ] **Step 2: CHANGELOG 4b + commit + push**

---

# Wave 4c — Plan / Shopping / Me + design debt

## Task 8: SectionHeader primitive

**Files:**
- Create: `web/components/patterns/SectionHeader.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";

export function SectionHeader({
  title,
  actionHref,
  actionLabel = "看全部",
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-medium text-text-ink">{title}</h2>
      {actionHref && (
        <Link href={actionHref} className="text-xs text-brand-primary hover:underline">
          {actionLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Replace Today recent header** with `<SectionHeader title="最近做過" actionHref="/app/library" />`.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): shared SectionHeader pattern (wave 4c-B)"
```

---

## Task 9: Plan & Shopping visual parity

**Files:**
- Modify: `web/app/(app)/app/plan/PlanPageClient.tsx`, `WeekGrid.tsx`, `PlanCell.tsx`
- Modify: `web/app/(app)/app/shopping/_components/ShoppingListView.tsx`

- [ ] **Step 1: Plan** — empty cell: dashed border `border-dashed border-border-default bg-surface-muted`; section title via `SectionHeader`.

- [ ] **Step 2: Shopping** — category headings `text-sm font-medium`; list rows `border-b border-border-default`.

- [ ] **Step 3: No logic changes** to DnD or aggregation.

- [ ] **Step 4: Build + manual `/app/plan`, `/app/shopping`**

- [ ] **Step 5: Commit**

```bash
git commit -am "polish(web): plan and shopping visual parity (wave 4c-D)"
```

---

## Task 10: Me page + token cleanup + UX playbook

**Files:**
- Modify: `web/components/settings/MeSettingsPanel.tsx` (section titles → `text-sm font-medium` consistent)
- Modify: `docs/UX_PLAYBOOK.md`
- Grep: `web/app/(app)` for `#[0-9A-Fa-f]{3,6}` hardcode

- [ ] **Step 1: Me** — first section after header: brief line「手機上可在這裡查看今日配額」.

- [ ] **Step 2: Grep hardcode** — fix any hits under `web/app/(app)` (skip cuisine gradients in `HeroPlaceholder`).

- [ ] **Step 3: UX_PLAYBOOK** — add §「Web App 表面」：Today / Library / Cook / Public.

- [ ] **Step 4: Optional `page-enter` on `app/(app)/layout.tsx` wrapper**

- [ ] **Step 5: Final verification**

```bash
pnpm -F @chef/web build && pnpm -F @chef/web test
```

- [ ] **Step 6: CHANGELOG + TODOS + README snippet; merge to main**

```bash
git add -A && git commit -m "polish(web): wave 4c me parity, token cleanup, UX playbook"
git checkout main && git merge cursor/frontend-wave4-8bf7 && git push origin main
```

---

## Spec coverage self-review

| Spec section | Task |
|--------------|------|
| 3.2 A StreamingRecipe | Task 2 |
| 3.3 C Detail v1 | Task 3 |
| 3.4 B dark tokens | Task 1 |
| 4.2 Cook + public | Tasks 5–6 |
| 4.3 A cook toast | Task 5 |
| 5.1 D Plan/Shopping/Me | Tasks 9–10 |
| 5.2 SectionHeader + hardcode | Tasks 8, 10 |
| 7 Error/429 | Task 2 |
| 10 Milestone docs | Tasks 4, 7, 10 |

**Out of scope (documented in spec):** GCS hero persistence, step images, new APIs, framer-motion.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-frontend-wave4-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks  
2. **Inline Execution** — Same session with `executing-plans`, batch by wave (4a → 4b → 4c)

Which approach do you want?
