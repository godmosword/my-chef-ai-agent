"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | undefined>();

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      setSupported(false);
      setBannerMessage("此裝置可能無法保持螢幕常亮，請到系統設定關閉自動鎖定。");
      return;
    }
    setSupported(true);
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
      setActive(true);
      setBannerMessage(undefined);
      lockRef.current.addEventListener("release", () => {
        setActive(false);
        if (document.visibilityState === "visible") {
          navigator.wakeLock.request("screen").then((l) => {
            lockRef.current = l;
            setActive(true);
          }).catch(() => {});
        }
      });
    } catch {
      setActive(false);
      setBannerMessage("無法啟用螢幕常亮，請手動調整自動鎖定。");
    }
  }, []);

  const release = useCallback(async () => {
    await lockRef.current?.release();
    lockRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    void request().catch(() => {});
    const onVis = () => {
      if (document.visibilityState === "visible" && !lockRef.current) {
        void request().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void release().catch(() => {});
    };
  }, [request, release]);

  return { supported, active, bannerMessage, request, release };
}
