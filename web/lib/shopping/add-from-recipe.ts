const STORAGE_KEY = "chef_shopping_draft";

export type ShoppingDraftItem = {
  name: string;
  quantity?: string;
  unit?: string;
  recipeId?: string;
};

export function addIngredientsToShoppingDraft(
  items: ShoppingDraftItem[],
): { added: number } {
  if (typeof window === "undefined") return { added: 0 };
  let existing: ShoppingDraftItem[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) existing = JSON.parse(raw) as ShoppingDraftItem[];
  } catch {
    existing = [];
  }
  const merged = [...existing, ...items];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return { added: items.length };
}
