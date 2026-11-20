"use client";

import { useState } from "react";

type IntentHandlers = {
  onPointerEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
};

/**
 * Prefetch por intenção (`prefetching.md`, "Hover-triggered prefetch", variante com Partial
 * Prefetching): o link começa em `"auto"` (só a casca genérica da rota, barata e compartilhada) e vira
 * `true` quando o mouse entra, o foco chega ou o dedo toca, trazendo o conteúdo cacheado daquele hotel
 * antes do clique. Nunca volta a `"auto"`: o prefetch já saiu.
 */
export const useIntentPrefetch = (): { prefetch: true | "auto"; handlers: IntentHandlers } => {
  const [intent, setIntent] = useState(false);
  const show = () => setIntent(true);
  return {
    prefetch: intent ? true : "auto",
    handlers: { onPointerEnter: show, onFocus: show, onTouchStart: show },
  };
};
