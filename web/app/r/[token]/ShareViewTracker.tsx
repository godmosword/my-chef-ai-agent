"use client";

import { useEffect } from "react";
import { recordShareView } from "@/application/api/sharing";
import { capture } from "@/platform/analytics/events";

export function ShareViewTracker({ token }: { token: string }) {
  useEffect(() => {
    void recordShareView(token);
    capture("shared_recipe_viewed", { source: "public_recipe" });
  }, [token]);

  return null;
}
