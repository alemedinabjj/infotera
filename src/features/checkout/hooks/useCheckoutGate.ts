"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  type RoomSelection,
  useBookingDraftHydrated,
  useSelection,
} from "@/shared/stores/booking-draft";
import { toast } from "@/shared/ui";
import { type CheckoutGate, selectionGate } from "../model/checkout-gate";
import { useStrictDocument } from "./useStrictDocument";

export const NO_SELECTION_MESSAGE =
  "Nenhum quarto selecionado. Escolha um hotel e um quarto para reservar.";

/**
 * Qual tela mostrar. Só redireciona para `/` depois da hidratação do `booking-draft` (o store do
 * servidor é vazio) e com `router.replace` + toast. `leaving` (a seleção congelada de uma reserva
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
  const leaveToHome = useCallback(() => router.replace("/"), [router]);

  useEffect(() => {
    if (gate !== "redirect-empty" || redirected.current) return;
    redirected.current = true;
    toast.info(NO_SELECTION_MESSAGE);
    leaveToHome();
  }, [gate, leaveToHome]);

  return { gate, selection: leaving ?? live };
};
