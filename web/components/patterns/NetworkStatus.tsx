"use client";

import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-0 z-[60] bg-brand-primary py-2 text-center text-sm text-text-ink"
    >
      離線中 · 部分功能受限
    </div>
  );
}
