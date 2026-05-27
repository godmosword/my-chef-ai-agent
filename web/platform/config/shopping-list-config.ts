/** MP-3 shopping list feature flags and limits. */

export function isShoppingListEnabled(): boolean {
  return process.env.ENABLE_SHOPPING_LIST !== "0";
}

export function shoppingAutoRegenOnSwap(): boolean {
  return process.env.SHOPPING_AUTO_REGEN_ON_SWAP !== "0";
}

export function shoppingAutoSyncToPantry(): boolean {
  return process.env.SHOPPING_AUTO_SYNC_TO_PANTRY !== "0";
}

export function shoppingShareTokenTtlDays(): number {
  const n = Number(process.env.SHOPPING_SHARE_TOKEN_TTL_DAYS ?? "7");
  return Number.isFinite(n) && n > 0 ? n : 7;
}

export function shoppingSharedCheckRateLimitPerMin(): number {
  const n = Number(process.env.SHOPPING_SHARED_CHECK_RATE_LIMIT_PER_MIN ?? "60");
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function shoppingListMaxItems(): number {
  const n = Number(process.env.SHOPPING_LIST_MAX_ITEMS ?? "200");
  return Number.isFinite(n) && n > 0 ? n : 200;
}

export function shoppingPriceBookVersion(): string {
  return process.env.SHOPPING_PRICE_BOOK_VERSION ?? "2026Q2";
}
