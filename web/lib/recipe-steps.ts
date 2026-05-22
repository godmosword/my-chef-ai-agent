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

export function formatIngredient(ing: unknown): string {
  if (typeof ing === "string") return ing;
  if (ing && typeof ing === "object" && "name" in ing) {
    const row = ing as { name: string; amount?: string };
    return row.amount ? `${row.name} — ${row.amount}` : row.name;
  }
  return String(ing);
}
