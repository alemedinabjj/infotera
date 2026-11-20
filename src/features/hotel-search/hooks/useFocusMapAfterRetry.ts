"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Quando o chunk do mapa falha e o "Tentar de novo" dá certo, o alerta (onde estava o foco) some:
 * o foco vai para o contêiner do mapa, em vez de cair no `body`.
 */
export const useFocusMapAfterRetry = (
  panelRef: RefObject<HTMLElement | null>,
  status: "idle" | "loading" | "error" | "ready",
): void => {
  const failed = useRef(false);
  useEffect(() => {
    if (status === "error") {
      failed.current = true;
    } else if (status === "ready" && failed.current) {
      failed.current = false;
      panelRef.current
        ?.querySelector<HTMLElement>(".leaflet-container")
        ?.focus({ preventScroll: true });
    }
  }, [panelRef, status]);
};
