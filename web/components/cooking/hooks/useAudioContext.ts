"use client";

import { useCallback, useRef } from "react";

export function useAudioContext() {
  const ctxRef = useRef<AudioContext | null>(null);

  const unlock = useCallback(() => {
    if (typeof AudioContext === "undefined") return;
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  }, []);

  const chime = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const playOnce = (delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + delay;
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.3);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    };

    playOnce(0);
    playOnce(0.35);
    playOnce(0.7);
  }, []);

  return { unlock, chime };
}
