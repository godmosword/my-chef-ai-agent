export type CuisineMeta = {
  emoji: string;
  bgClass: string;
};

const DEFAULT: CuisineMeta = { emoji: "🍚", bgClass: "bg-brand-primaryLight" };

const MAP: Record<string, CuisineMeta> = {
  家常: { emoji: "🍚", bgClass: "bg-brand-primaryLight" },
  台式: { emoji: "🍚", bgClass: "bg-brand-primaryLight" },
  西式: { emoji: "🍝", bgClass: "bg-surface-muted" },
  歐式: { emoji: "🍝", bgClass: "bg-surface-muted" },
  日式: { emoji: "🍣", bgClass: "bg-surface-alt" },
  韓式: { emoji: "🥘", bgClass: "bg-surface-muted" },
  中式: { emoji: "🥢", bgClass: "bg-surface-muted" },
  泰式: { emoji: "🌶️", bgClass: "bg-surface-muted" },
};

export function getCuisineMeta(cuisine?: string | null): CuisineMeta {
  if (!cuisine) return DEFAULT;
  const key = Object.keys(MAP).find((k) => cuisine.includes(k));
  return key ? MAP[key]! : DEFAULT;
}
