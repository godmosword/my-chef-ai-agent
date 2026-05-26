/**
 * Scale ingredient amount strings by a multiplier.
 *
 * Handles common cases:
 *  - "2 顆"      → "4 顆"   (multiplier 2)
 *  - "1/2 杯"    → "1 杯"   (multiplier 2)
 *  - "150g"      → "300g"
 *  - "適量"       → "適量"   (untouched — qualitative)
 *  - "少許"       → "少許"
 *  - undefined   → undefined
 *
 * Returns a formatted string with reasonable rounding (2 decimal max,
 * trailing zeros stripped).
 */
const QUALITATIVE = ["適量", "少許", "依口味", "酌量", "少量", "適中"];

function scaleAmount(amount: string | undefined, multiplier: number): string | undefined {
  if (!amount) return amount;
  if (multiplier === 1) return amount;
  const trimmed = amount.trim();
  if (!trimmed) return amount;
  if (QUALITATIVE.some((q) => trimmed.includes(q))) return amount;

  // Match leading number (int, decimal, or fraction like "1/2" or "1 1/2")
  const fractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/);
  if (fractionMatch) {
    const [, whole, num, den, rest] = fractionMatch;
    const value = Number(whole) + Number(num) / Number(den);
    return `${formatNumber(value * multiplier)}${rest}`;
  }

  const simpleFraction = trimmed.match(/^(\d+)\/(\d+)(.*)$/);
  if (simpleFraction) {
    const [, num, den, rest] = simpleFraction;
    const value = Number(num) / Number(den);
    return `${formatNumber(value * multiplier)}${rest}`;
  }

  const decimal = trimmed.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (decimal) {
    const [, num, rest] = decimal;
    const value = Number(num);
    return `${formatNumber(value * multiplier)}${rest}`;
  }

  return amount;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function scaleIngredient(
  ing: unknown,
  multiplier: number,
): unknown {
  if (multiplier === 1) return ing;
  if (typeof ing === "string") return ing;
  if (ing && typeof ing === "object" && "name" in ing) {
    const row = ing as { name: string; amount?: string; [k: string]: unknown };
    return { ...row, amount: scaleAmount(row.amount, multiplier) };
  }
  return ing;
}
