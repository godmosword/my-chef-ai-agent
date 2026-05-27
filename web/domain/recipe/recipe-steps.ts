export function formatStep(step: unknown): string {
  if (typeof step === "string") return step;
  if (step && typeof step === "object" && "text" in step) {
    return String((step as { text: string }).text);
  }
  if (step && typeof step === "object" && "instruction" in step) {
    return String((step as { instruction: string }).instruction);
  }
  return String(step);
}

type IngredientRow = {
  name: string;
  amount?: string;
  unit?: string;
  price?: string;
};

/** e.g. `白米 — 1.5 杯` (unit omitted when empty). */
export function formatIngredientQuantity(
  amount?: string,
  unit?: string,
): string | null {
  const a = amount?.trim();
  const u = unit?.trim();
  if (a && u) return `${a} ${u}`;
  if (a) return a;
  if (u) return u;
  return null;
}

export function formatIngredient(ing: unknown): string {
  if (typeof ing === "string") return ing;
  if (ing && typeof ing === "object" && "name" in ing) {
    const row = ing as IngredientRow;
    const qty = formatIngredientQuantity(row.amount, row.unit);
    if (qty && row.price) {
      return `${row.name} — ${qty}（${row.price}）`;
    }
    if (qty) return `${row.name} — ${qty}`;
    if (row.price) return `${row.name}（${row.price}）`;
    return row.name;
  }
  return String(ing);
}
