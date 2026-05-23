"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VOICE_KEY = "cooking_voice_enabled";

export function useSpeech(initial?: boolean) {
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(VOICE_KEY);
    const on = initial ?? stored === "1";
    setEnabledState(on);
    enabledRef.current = on;
  }, [initial]);

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setReady(speechSynthesis.getVoices().length > 0);
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
    setEnabledState(v);
    localStorage.setItem(VOICE_KEY, v ? "1" : "0");
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabledRef.current || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-TW";
    u.rate = 1;
    const voices = speechSynthesis.getVoices();
    const tw =
      voices.find((v) => v.lang === "zh-TW") ??
      voices.find((v) => v.lang.startsWith("zh"));
    if (tw) u.voice = tw;
    speechSynthesis.speak(u);
  }, []);

  return { enabled, setEnabled, speak, ready };
}
