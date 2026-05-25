# Landing 精緻化 Implementation Plan

**Goal:** Replace Hero decorative food image with product mocks; add three-step how-it-works band; remove dead marketing components.

**Spec:** [`docs/superpowers/specs/2026-05-25-landing-refine-design.md`](../specs/2026-05-25-landing-refine-design.md)

**Branch:** `cursor/landing-refine-design-a559`

## Tasks

- [x] `LandingHeroMock.tsx` + wire in `Hero.tsx`
- [x] `CookingModeMock.tsx` + `LandingHowItWorks.tsx` + wire in `LandingPage.tsx`
- [x] `content.ts` — `howItWorks`, remove images/screenshots/pills
- [x] Delete `DemoRecipeCard`, `FeatureSplit`, `FeaturePills`, `FeaturePreviewMocks`, `MarketingVisual`, `MarketingImage`
- [x] Update `public/marketing/README.md`
- [ ] `pnpm -F @chef/web test` + typecheck
- [ ] `CHANGELOG.md` / `TODOS.md`

## Verify (Vercel)

- Hero right: input + recipe card mock, no `<img>`
- How-it-works: 3 columns stack on mobile
- Use case cards still link to `/app?prefill=`
