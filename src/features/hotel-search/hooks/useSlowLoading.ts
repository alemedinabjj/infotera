"use client";

import { useEffect, useState } from "react";

/** Tempo em loading a partir do qual a tela avisa que está demorando. */
export const SLOW_LOADING_MS = 5000;

/** `true` depois de `delayMs` seguidos em loading; volta a `false` assim que o loading acaba. */
export const useSlowLoading = (loading: boolean, delayMs = SLOW_LOADING_MS): boolean => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading, delayMs]);
  return slow;
};
