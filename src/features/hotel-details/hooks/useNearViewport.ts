"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * `true` (e continua `true`) quando o elemento chega a `margin` da viewport. Sem
 * `IntersectionObserver` assume "perto", para o mapa ainda poder carregar.
 */
export const useNearViewport = (ref: RefObject<Element | null>, margin = "200px"): boolean => {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, near]);

  return near;
};
