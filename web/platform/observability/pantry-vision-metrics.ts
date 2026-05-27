/** In-process pantry vision metrics (exposed via GET /api/metrics). */

type VisionType = "fridge" | "receipt" | "classifier";
type VisionResult = "ok" | "timeout" | "error" | "low_quality";

const visionTotal: Record<string, number> = {};
const itemsRecognizedBuckets = new Map<number, number>();
const itemsCommittedBuckets = new Map<number, number>();
const userEditsBuckets = new Map<number, number>();
let cacheHits = 0;

function key(type: VisionType, result: VisionResult): string {
  return `${type}:${result}`;
}

export function recordPantryVisionCall(
  type: VisionType,
  result: VisionResult,
  itemsRecognized?: number,
): void {
  visionTotal[key(type, result)] = (visionTotal[key(type, result)] ?? 0) + 1;
  if (itemsRecognized != null && result === "ok") {
    const bucket = Math.min(Math.floor(itemsRecognized / 5) * 5, 30);
    itemsRecognizedBuckets.set(
      bucket,
      (itemsRecognizedBuckets.get(bucket) ?? 0) + 1,
    );
  }
}

export function recordPantryVisionCommitted(count: number, userEdits: number): void {
  const bucket = Math.min(Math.floor(count / 5) * 5, 30);
  itemsCommittedBuckets.set(bucket, (itemsCommittedBuckets.get(bucket) ?? 0) + 1);
  const editBucket = Math.min(userEdits, 20);
  userEditsBuckets.set(editBucket, (userEditsBuckets.get(editBucket) ?? 0) + 1);
}

export function recordPantryVisionCacheHit(): void {
  cacheHits += 1;
}

export function getPantryVisionMetricsSnapshot(): Record<string, unknown> {
  const pantry_vision_total: Record<string, number> = { ...visionTotal };
  const histogram = (m: Map<number, number>) => {
    const out: Record<string, number> = {};
    for (const [k, v] of m) out[String(k)] = v;
    return out;
  };
  return {
    pantry_vision_total,
    pantry_vision_items_recognized: histogram(itemsRecognizedBuckets),
    pantry_vision_items_committed: histogram(itemsCommittedBuckets),
    pantry_vision_user_edits_per_session: histogram(userEditsBuckets),
    pantry_vision_cache_hits_total: cacheHits,
  };
}

export function resetPantryVisionMetricsForTests(): void {
  for (const k of Object.keys(visionTotal)) delete visionTotal[k];
  itemsRecognizedBuckets.clear();
  itemsCommittedBuckets.clear();
  userEditsBuckets.clear();
  cacheHits = 0;
}
