"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";

export function SwUpdateToast() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NEXT_PUBLIC_ENABLE_PWA === "false"
    ) {
      return;
    }

    const onControllerChange = () => window.location.reload();

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(installing);
          }
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaiting(reg.waiting);
      }
    };

    void check();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[55] mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-default p-3 shadow-card md:bottom-6">
      <p className="text-sm text-text-ink">有新版本可用</p>
      <Button
        size="sm"
        onClick={() => {
          waiting.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        更新
      </Button>
    </div>
  );
}
