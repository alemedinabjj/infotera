"use client";

import { useState } from "react";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { useCheckoutGate } from "../hooks/useCheckoutGate";
import { useCheckoutQueries } from "../hooks/useCheckoutQueries";
import type { BlockedReason } from "../model/blocked";
import { BlockedCheckout } from "./BlockedCheckout";
import { CheckoutReady } from "./CheckoutReady";
import { CheckoutSkeleton } from "./CheckoutSkeleton";

const BLOCKED: readonly string[] = ["sold-out", "insufficient", "too-small", "stale-dates"];

const isBlocked = (value: string): value is BlockedReason => BLOCKED.includes(value);

/** Com seleção: relê hotel e quarto, bloqueia o que não dá para reservar e senão mostra o checkout. */
const CheckoutRoute = ({
  selection,
  onLeaving,
}: {
  selection: RoomSelection;
  onLeaving: (selection: RoomSelection) => void;
}) => {
  const { hotel, room, eligibility } = useCheckoutQueries(selection);
  if (isBlocked(eligibility)) {
    return <BlockedCheckout reason={eligibility} selection={selection} room={room.data} />;
  }
  return <CheckoutReady selection={selection} hotel={hotel} room={room} onLeaving={onLeaving} />;
};

/**
 * `/checkout`. O gate decide a tela: skeleton (hidratando, recarregando para a CSP estrita ou
 * redirecionando para `/`), ou o checkout com a seleção. `leaving` congela a seleção da reserva
 * criada para o formulário não sumir enquanto a rota troca.
 */
export const CheckoutPage = () => {
  const [leaving, setLeaving] = useState<RoomSelection | null>(null);
  const { gate, selection } = useCheckoutGate(leaving);

  switch (gate) {
    case "hydrating":
    case "reloading":
    case "redirect-empty":
      return <CheckoutSkeleton />;
    case "ready":
    case "leaving":
      return selection ? (
        <CheckoutRoute selection={selection} onLeaving={setLeaving} />
      ) : (
        <CheckoutSkeleton />
      );
    default: {
      const unreachable: never = gate;
      return unreachable;
    }
  }
};
