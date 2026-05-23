"use client";

import { useEffect } from "react";
import { recordShareView } from "@/lib/api/sharing";
import { track } from "@/lib/analytics/track";

export function ShareViewTracker({ token }: { token: string }) {
  useEffect(() => {
    void recordShareView(token);
    track("shared_recipe_viewed", { token });
  }, [token]);

  return null;
}
