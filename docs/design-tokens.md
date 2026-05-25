# Design Tokens（Web）

單一來源：`packages/design-tokens/src/tokens.json` → `pnpm tokens:build` → `@chef/design-tokens/tokens.css`。

## UX 規格別名（`web/app/globals.css`）

規格中的 `bg-*`、`fg-*`、`accent-*` 在 `:root` 對應至現有 `--color-*` token，Tailwind 類別如 `text-fg-secondary`、`bg-accent-100` 可直接使用。

## 主色方案

產品採 **方案 A（醬油棕／琥珀）**，與 `tokens.json` 的 `brand.primary`（`#C8922A`）一致。

## 修改流程

1. 編輯 `packages/design-tokens/src/tokens.json`
2. `pnpm tokens:build`
3. 必要時更新 `web/app/globals.css` 別名對照
4. 在 Vercel Production 驗收（不以 localhost 為 deploy 目標）

詳見 [`docs/ux-spec.md`](ux-spec.md) P1-4。
