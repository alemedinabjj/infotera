"use client";

import { type FocusEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";

type RegionPause = {
  /** `true` com hover ou foco na região inteira, ou com a aba oculta. */
  paused: boolean;
  /** Ref da região: o foco é recalculado a partir dele quando os toasts mudam. */
  regionRef: RefObject<HTMLDivElement | null>;
  /** Recalcula o foco (ex.: depois da animação de saída, quando o botão focado some do DOM). */
  resync: () => void;
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
export const useRegionPause = (toastCount: number): RegionPause => {
  const regionRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Remover o elemento focado (fechar/acionar o toast) não dispara `blur`: recalcula pelo DOM.
  const resync = useCallback(() => {
    const region = regionRef.current;
    setFocused(region?.contains(document.activeElement) ?? false);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: recalcula sempre que a lista muda
  useEffect(resync, [resync, toastCount]);

  return {
    regionRef,
    resync,
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
