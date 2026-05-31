/** In-process counters for personalization load/inject (exposed via GET /api/metrics). */

type LoadResult = "ok" | "empty" | "timeout" | "error";
type InjectPath = "text" | "image" | "random" | "cuisine_switch";

const loadTotal: Record<LoadResult, number> = {
  ok: 0,
  empty: 0,
  timeout: 0,
  error: 0,
};

const injectTotal: Record<InjectPath, number> = {
  text: 0,
  image: 0,
  random: 0,
  cuisine_switch: 0,
};

const blockTokenBuckets = new Map<number, number>();
const hardConstraintBuckets = new Map<number, number>();

let lastOtelAttributes: Record<string, string | number | boolean> | null = null;

export function recordPersonalizationLoad(result: LoadResult): void {
  loadTotal[result] += 1;
}

export function recordPersonalizationInject(
  path: InjectPath,
  tokenEstimate: number,
  hardConstraintsCount: number,
): void {
  injectTotal[path] += 1;
  const tokenBucket = Math.floor(tokenEstimate / 50) * 50;
  blockTokenBuckets.set(tokenBucket, (blockTokenBuckets.get(tokenBucket) ?? 0) + 1);
  const hcBucket = Math.min(hardConstraintsCount, 20);
  hardConstraintBuckets.set(
    hcBucket,
    (hardConstraintBuckets.get(hcBucket) ?? 0) + 1,
  );
}

export function recordPersonalizationOtelSpan(attrs: {
  confidence: number;
  hard_constraints_count: number;
  token_estimate: number;
  is_empty: boolean;
}): void {
  if (!process.env.OTEL_SERVICE_NAME?.trim()) return;
  lastOtelAttributes = attrs;
}

export function getPersonalizationMetricsSnapshot(): {
  load_total: Record<LoadResult, number>;
  inject_total: Record<InjectPath, number>;
  block_tokens_histogram: Record<string, number>;
  hard_constraints_histogram: Record<string, number>;
  otel_last_span: Record<string, string | number | boolean> | null;
} {
  const block_tokens_histogram: Record<string, number> = {};
  for (const [k, v] of blockTokenBuckets) {
    block_tokens_histogram[String(k)] = v;
  }
  const hard_constraints_histogram: Record<string, number> = {};
  for (const [k, v] of hardConstraintBuckets) {
    hard_constraints_histogram[String(k)] = v;
  }
  return {
    load_total: { ...loadTotal },
    inject_total: { ...injectTotal },
    block_tokens_histogram,
    hard_constraints_histogram,
    otel_last_span: lastOtelAttributes,
  };
}

export type { InjectPath, LoadResult };
