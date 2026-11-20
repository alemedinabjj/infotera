"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { assignLocation } from "@/shared/lib/navigation";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { useBookingDraftActions } from "@/shared/stores/booking-draft";

/**
 * "Selecionar quarto": grava `{ hotelId, roomId, criteria }` no `booking-draft` e entra no checkout
 * com **carga de documento** (a CSP com nonce do checkout é do documento; `router.push` manteria a
 * política frouxa). `pendingRoomId` marca o quarto em "Selecionando…" até a página trocar; com uma
 * seleção em andamento, novos cliques são ignorados. Voltar pelo bfcache (`pageshow` persistido)
 * zera o estado. Uma seleção nova sobrescreve a anterior.
 */
export const useSelectRoom = (hotelId: number, criteria: SearchCriteria | null) => {
  const { selectRoom } = useBookingDraftActions();
  const locale = useLocale();
  const [pendingRoomId, setPendingRoomId] = useState<number | null>(null);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPendingRoomId(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const select = (id: number) => {
    if (pendingRoomId !== null || criteria === null) return;
    setPendingRoomId(id);
    // O Zustand persiste de forma síncrona: o storage já está gravado quando o documento troca.
    selectRoom({ hotelId, roomId: id, criteria });
    assignLocation(localizePath(locale, "/checkout"));
  };

  return { select, pendingRoomId };
};
