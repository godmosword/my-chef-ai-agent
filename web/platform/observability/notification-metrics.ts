/** PT-4 notification metrics (GET /api/metrics). */

type Kind = "expiry" | "digest";
type Decision = "sent" | "skipped";

const sweepTotal: Record<string, number> = {};
const decisionTotal: Record<string, number> = {};
const pushTotal: Record<string, number> = {};
const engagementTotal: Record<string, number> = {};
const useItUpTotal: Record<string, number> = {};
const useItUpCallTotal: Record<string, number> = {};
let lastSweepDurationMs = 0;
let otelLastSpan: Record<string, string | number | boolean> | null = null;

function key(...parts: string[]): string {
  return parts.join("|");
}

export function recordNotificationSweep(
  kind: Kind,
  result: "ok" | "error",
  usersChecked: number,
  durationMs?: number,
): void {
  const k = key("notification_sweep_total", kind, result);
  sweepTotal[k] = (sweepTotal[k] ?? 0) + 1;
  if (durationMs != null) lastSweepDurationMs = durationMs;
  otelLastSpan = {
    "notification.sweep": true,
    kind,
    users_checked: usersChecked,
    duration_ms: durationMs ?? 0,
  };
}

export function recordNotificationDecision(
  kind: Kind,
  decision: Decision,
  reason: string,
): void {
  const k = key("notification_decision_total", kind, decision, reason);
  decisionTotal[k] = (decisionTotal[k] ?? 0) + 1;
}

export function recordNotificationPush(
  result: "ok" | "line_api_error" | "cost_cap",
  userHash: string,
): void {
  const k = key("notification_push_total", result);
  pushTotal[k] = (pushTotal[k] ?? 0) + 1;
  otelLastSpan = {
    "notification.send": true,
    user_id_hash: userHash,
    result,
  };
}

export function recordNotificationEngagement(
  event: string,
): void {
  const k = key("notification_engagement_total", event);
  engagementTotal[k] = (engagementTotal[k] ?? 0) + 1;
}

export function recordUseItUp(
  trigger: string,
  suggestionsCount: number,
): void {
  const k = key("use_it_up_total", trigger, String(suggestionsCount));
  useItUpTotal[k] = (useItUpTotal[k] ?? 0) + 1;
}

export function recordUseItUpCall(
  call: "candidates" | "full_recipe",
  result: string,
  latencyMs: number,
): void {
  const k = key("use_it_up_call_total", call, result);
  useItUpCallTotal[k] = (useItUpCallTotal[k] ?? 0) + 1;
  otelLastSpan = {
    "use_it_up.suggest": true,
    call,
    result,
    latency_ms: latencyMs,
  };
}

export function getNotificationMetricsSnapshot(): Record<string, unknown> {
  return {
    notification_sweep_total: { ...sweepTotal },
    notification_sweep_duration_ms: lastSweepDurationMs,
    notification_decision_total: { ...decisionTotal },
    notification_push_total: { ...pushTotal },
    notification_engagement_total: { ...engagementTotal },
    use_it_up_total: { ...useItUpTotal },
    use_it_up_call_total: { ...useItUpCallTotal },
    otel_last_span: otelLastSpan,
  };
}

export function resetNotificationMetricsForTests(): void {
  for (const o of [
    sweepTotal,
    decisionTotal,
    pushTotal,
    engagementTotal,
    useItUpTotal,
    useItUpCallTotal,
  ]) {
    for (const k of Object.keys(o)) delete o[k];
  }
  lastSweepDurationMs = 0;
  otelLastSpan = null;
}
