"use client";

import { type FocusEvent, useEffect, useState } from "react";

type RegionPause = {
  /** `true` com hover ou foco na região inteira, ou com a aba oculta. */
  paused: boolean;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
};

/**
 * Pausa o tempo dos toasts na região inteira: se um toast sumisse enquanto o ponteiro está em outro,
 * os vizinhos se moveriam sob o mouse. Também pausa quando a aba fica oculta.
 */
export const useRegionPause = (): RegionPause => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return {
    paused: hovered || focused || hidden,
    handlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      },
    },
  };
};
