"use client";

import { useEffect } from "react";
import { revealNearest } from "@/shared/lib/scroll";
import { useMapSync } from "../store/map-sync";

/** Foca o link do card do hotel e o traz à vista (instantâneo, abaixo do header). */
export const revealHotelCard = (hotelId: number): void => {
  const link = document.querySelector<HTMLElement>(`[data-hotel-link="${hotelId}"]`);
  if (!link) return;
  link.focus({ preventScroll: true });
  revealNearest(link.closest("article") ?? link);
};

/** Modo "Em páginas": registra como o mapa leva o foco a um card ("Mostrar na lista"). */
export const usePagesReveal = (enabled: boolean): void => {
  const register = useMapSync((state) => state.registerReveal);
  useEffect(() => {
    if (!enabled) return;
    register(revealHotelCard);
    return () => register(null);
  }, [enabled, register]);
};
