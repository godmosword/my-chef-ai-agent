export function remainingMsFromEndAt(endAtMs: number, nowMs: number): number {
  return Math.max(0, endAtMs - nowMs);
}

export function endAtFromRemaining(remainingMs: number, nowMs: number): number {
  return nowMs + remainingMs;
}
