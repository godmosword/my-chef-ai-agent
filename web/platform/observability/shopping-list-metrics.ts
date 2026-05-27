/** MP-3 shopping list metrics (counts only — no item names in labels). */

type Counter = { ok: number; error: number };

const generation: Record<string, Counter> = {};
let checkLine = 0;
let checkWeb = 0;
let checkShared = 0;
let completeTotal = 0;

export function recordShoppingListGeneration(
  trigger: string,
  result: "ok" | "error",
  _durationMs: number,
  inputCount: number,
  outputCount: number,
): void {
  if (!generation[trigger]) generation[trigger] = { ok: 0, error: 0 };
  generation[trigger][result] += 1;
  void inputCount;
  void outputCount;
}

export function recordShoppingListCheck(path: "line" | "web" | "shared"): void {
  if (path === "line") checkLine += 1;
  else if (path === "web") checkWeb += 1;
  else checkShared += 1;
}

export function recordShoppingListComplete(): void {
  completeTotal += 1;
}

export function getShoppingListMetricsSnapshot(): Record<string, unknown> {
  return {
    shopping_list_generation_total: { ...generation },
    shopping_list_check_total: {
      line: checkLine,
      web: checkWeb,
      shared: checkShared,
    },
    shopping_list_complete_total: completeTotal,
  };
}
