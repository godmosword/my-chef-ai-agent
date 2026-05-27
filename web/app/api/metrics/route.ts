import { NextResponse } from "next/server";
import { getPantryMetricsSnapshot } from "@/platform/observability/pantry-metrics";
import { getPantryVisionMetricsSnapshot } from "@/platform/observability/pantry-vision-metrics";
import { getPersonalizationMetricsSnapshot } from "@/platform/observability/personalization-metrics";
import { getNotificationMetricsSnapshot } from "@/platform/observability/notification-metrics";
import { getMealPlanningMetricsSnapshot } from "@/platform/observability/meal-planning-metrics";
import { getShoppingListMetricsSnapshot } from "@/platform/observability/shopping-list-metrics";

function metricsToken(): string | null {
  const raw = process.env.METRICS_TOKEN?.trim();
  return raw || null;
}

export async function GET(request: Request) {
  const token = metricsToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "METRICS_TOKEN not configured" },
      { status: 503 },
    );
  }

  const header = request.headers.get("x-metrics-token")?.trim();
  if (header !== token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    personalization: getPersonalizationMetricsSnapshot(),
    pantry_vision: getPantryVisionMetricsSnapshot(),
    pantry: getPantryMetricsSnapshot(),
    notifications: getNotificationMetricsSnapshot(),
    meal_planning: getMealPlanningMetricsSnapshot(),
    shopping_list: getShoppingListMetricsSnapshot(),
  });
}
