"use client";

import { useCallback, useState } from "react";

export function useFullscreen() {
  const [isCssCover, setIsCssCover] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const enter = useCallback(async () => {
    setIsCssCover(true);
    try {
      await document.documentElement.requestFullscreen();
      setIsNativeFullscreen(true);
    } catch {
      setIsNativeFullscreen(false);
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
    setIsNativeFullscreen(false);
  }, []);

  return { isCssCover, isNativeFullscreen, enter, exit };
}
