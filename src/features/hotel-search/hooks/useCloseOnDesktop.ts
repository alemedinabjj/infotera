"use client";

import { useEffect } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Fecha o sheet quando a tela cresce para `lg` (a sidebar assume, com o mesmo estado da URL).
 * Sem `matchMedia` (testes) não faz nada.
 */
export const useCloseOnDesktop = (open: boolean, onClose: () => void): void => {
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const handle = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, [open, onClose]);
};
