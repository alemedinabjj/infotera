"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { useBookingDraftActions } from "@/shared/stores/booking-draft";

/**
 * "Selecionar quarto": grava `{ hotelId, roomId, criteria }` no `booking-draft` e vai ao checkout
 * dentro de uma transition. `pendingRoomId` marca o quarto em "Selecionando…" até a navegação; com
 * uma seleção em andamento, novos cliques são ignorados. Uma seleção nova sobrescreve a anterior.
 */
export const useSelectRoom = (hotelId: number, criteria: SearchCriteria | null) => {
  const router = useRouter();
  const { selectRoom } = useBookingDraftActions();
  const [isPending, startTransition] = useTransition();
  const [roomId, setRoomId] = useState<number | null>(null);

  const select = (id: number) => {
    if (isPending || criteria === null) return;
    setRoomId(id);
    selectRoom({ hotelId, roomId: id, criteria });
    startTransition(() => router.push("/checkout"));
  };

  return { select, pendingRoomId: isPending ? roomId : null };
};
