"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { CHOOSE_ROOM_HREF } from "@/shared/lib/links";
import {
  type RoomSelection,
  useBookingDraftHydrated,
  useSelection,
} from "@/shared/stores/booking-draft";
import { type CheckoutGate, selectionGate } from "../model/checkout-gate";
import { useStrictDocument } from "./useStrictDocument";

/**
 * Qual tela mostrar. Só redireciona para a home (com o aviso "Escolha um quarto para continuar.") depois da hidratação do `booking-draft` (o store do
 * servidor é vazio) e com `router.replace` (o aviso é visível na home, não um toast). `leaving` (a seleção congelada de uma reserva
 * criada) impede que limpar o store dispare esse redirect.
 */
export const useCheckoutGate = (
  leaving: RoomSelection | null,
): { gate: CheckoutGate; selection: RoomSelection | null } => {
  const router = useRouter();
  const hydrated = useBookingDraftHydrated();
  const live = useSelection();
  const document = useStrictDocument();
  const gate = selectionGate({ hydrated, selection: live, submitted: leaving !== null, document });
  const redirected = useRef(false);
  // Só dá para saber que não há seleção depois de hidratar o `sessionStorage` (cliente): não existe
  // alternativa de redirect no servidor. `replace` para o checkout não ficar no histórico.
  const leaveToHome = useCallback(() => router.replace(CHOOSE_ROOM_HREF), [router]);

  useEffect(() => {
    if (gate !== "redirect-empty" || redirected.current) return;
    redirected.current = true;
    leaveToHome();
  }, [gate, leaveToHome]);

  return { gate, selection: leaving ?? live };
};
