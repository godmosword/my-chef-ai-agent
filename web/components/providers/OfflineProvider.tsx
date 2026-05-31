"use client";

import { useEffect } from "react";
import { flushMutations, migrateLegacyRatingQueue } from "@/platform/sync/mutations";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void migrateLegacyRatingQueue()
      .then(() => flushMutations())
      .catch(() => {});

    const onOnline = () => void flushMutations().catch(() => {});
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return <>{children}</>;
}
