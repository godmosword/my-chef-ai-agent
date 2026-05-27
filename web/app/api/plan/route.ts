import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getWeekPlan } from "@/platform/db/queries/meal-plans";
import { getSessionUserId } from "@/platform/identity/session";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const url = new URL(request.url);
  const weekOf = url.searchParams.get("week_of");
  if (!weekOf || !/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
    return NextResponse.json(
      { ok: false, error: "week_of required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const plan = await getWeekPlan(userId, DEFAULT_TENANT_ID, weekOf);
  return NextResponse.json({ ok: true, ...plan });
}
