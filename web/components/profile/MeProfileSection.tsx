"use client";

import { useEffect, useState } from "react";
import { fetchUserProfile, type ProfileResponse } from "@/application/api/profile";
import { useDisplayName } from "@/lib/profile/display-name";
import { AchievementsRow } from "./AchievementsRow";
import { ProfileHero } from "./ProfileHero";
import { StatsGrid } from "./StatsGrid";

export function MeProfileSection() {
  const displayName = useDisplayName();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchUserProfile();
        if (!cancelled) setProfile(res);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recipeCount = profile?.recipe_count ?? 0;
  const favoritesCount = profile?.favorites_count ?? 0;
  const sharedCount = profile?.shared_count ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const firstRecipeAt = profile?.first_recipe_at ?? null;

  return (
    <div className="space-y-5">
      <ProfileHero
        displayName={displayName}
        currentStreak={currentStreak}
        firstRecipeAt={firstRecipeAt}
        loading={loading}
      />
      <StatsGrid
        recipeCount={recipeCount}
        favoritesCount={favoritesCount}
        sharedCount={sharedCount}
        longestStreak={longestStreak}
      />
      <AchievementsRow
        recipeCount={recipeCount}
        favoritesCount={favoritesCount}
        sharedCount={sharedCount}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
      />
    </div>
  );
}
