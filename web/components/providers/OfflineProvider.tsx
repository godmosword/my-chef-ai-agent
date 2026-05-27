"use client";

import { useEffect } from "react";
import { flushMutations, migrateLegacyRatingQueue } from "@/platform/sync/mutations";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void migrateLegacyRatingQueue().then(() => flushMutations());

    const onOnline = () => void flushMutations();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return <>{children}</>;
}
