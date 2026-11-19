"use client";

import { useSyncExternalStore } from "react";

const supported = (): boolean => typeof window.matchMedia === "function";

/** `matchMedia` reativo (falso no servidor e em ambientes sem `matchMedia`). */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (notify) => {
      if (!supported()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => supported() && window.matchMedia(query).matches,
    () => false,
  );
