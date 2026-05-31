import { useEffect } from "react";

/**
 * Runs async work when deps change; callers should guard setState with isActive().
 */
export function useMountAsync(
  effect: (isActive: () => boolean) => void | Promise<void>,
  deps: readonly unknown[],
): void {
  useEffect(() => {
    let active = true;
    const isActive = () => active;
    void Promise.resolve(effect(isActive)).catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
