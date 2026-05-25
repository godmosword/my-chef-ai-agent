"use client";

import { useEffect } from "react";
import { recordShareView } from "@/lib/api/sharing";
import { capture } from "@/lib/analytics/events";

export function ShareViewTracker({ token }: { token: string }) {
  useEffect(() => {
    void recordShareView(token);
    capture("shared_recipe_viewed", { source: "public_recipe" });
  }, [token]);

  return null;
}
