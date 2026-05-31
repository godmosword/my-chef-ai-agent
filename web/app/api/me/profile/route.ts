import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { addDaysIsoLocal, todayDateKeyInTimeZone } from "@/lib/locale/datetime";
import { isDatabaseConfigured } from "@/platform/db/client";
import { countFavoritesForUser } from "@/platform/db/favorites";
import { getRecipeActivityForUser } from "@/platform/db/queries/recipes";
import { countSharedRecipesForUser } from "@/platform/db/queries/sharing";
import { getSessionUserId } from "@/platform/identity/session";

interface ProfileResponse {
  ok: true;
  db_configured: boolean;
  recipe_count: number;
  shared_count: number;
  favorites_count: number;
  current_streak: number;
  longest_streak: number;
  first_recipe_at: string | null;
  last_recipe_at: string | null;
}

function computeStreaks(activeDates: string[]): {
  current: number;
  longest: number;
} {
  if (activeDates.length === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(new Set(activeDates)).sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (addDaysIsoLocal(prev, 1) === curr) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const setOfDates = new Set(sorted);
  const todayIso = todayDateKeyInTimeZone();
  const yesterdayIso = addDaysIsoLocal(todayIso, -1);
  let cursor = todayIso;
  if (!setOfDates.has(todayIso) && !setOfDates.has(yesterdayIso)) {
    return { current: 0, longest };
  }
  if (!setOfDates.has(todayIso)) {
    cursor = yesterdayIso;
  }

  let current = 0;
  while (setOfDates.has(cursor)) {
    current += 1;
    cursor = addDaysIsoLocal(cursor, -1);
  }
  return { current, longest };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    const empty: ProfileResponse = {
      ok: true,
      db_configured: false,
      recipe_count: 0,
      shared_count: 0,
      favorites_count: 0,
      current_streak: 0,
      longest_streak: 0,
      first_recipe_at: null,
      last_recipe_at: null,
    };
    return NextResponse.json(empty);
  }

  const [activity, sharedCount, favoritesCount] = await Promise.all([
    getRecipeActivityForUser(userId, DEFAULT_TENANT_ID),
    countSharedRecipesForUser(userId, DEFAULT_TENANT_ID),
    countFavoritesForUser(userId, DEFAULT_TENANT_ID),
  ]);

  const { current, longest } = computeStreaks(activity.active_dates);

  const body: ProfileResponse = {
    ok: true,
    db_configured: true,
    recipe_count: activity.total,
    shared_count: sharedCount,
    favorites_count: favoritesCount,
    current_streak: current,
    longest_streak: longest,
    first_recipe_at: activity.first_recipe_at,
    last_recipe_at: activity.last_recipe_at,
  };

  return NextResponse.json(body);
}
