import type { Metadata } from "next";
import { parseBookingId } from "../model/booking-id";
import {
  CONFIRMATION_ROBOTS,
  confirmationTitle,
  FALLBACK_CONFIRMATION_TITLE,
} from "../model/metadata";
import { loadBooking } from "./confirmation.server";

const withRobots = (title: string): Metadata => ({ title, robots: CONFIRMATION_ROBOTS });

/**
 * Metadata da rota: título genérico por estado (nunca com nome, e-mail ou id) e sempre
 * `noindex, nofollow`. Compartilha o `GET /bookings/:id` com a página (`React.cache`). Erro na
 * leitura não derruba a página: o `error.tsx` mostra o erro real, com retry.
 */
export const generateConfirmationMetadata = async (rawId: string): Promise<Metadata> => {
  const id = parseBookingId(rawId);
  if (id === null) return withRobots(confirmationTitle({ kind: "not-found" }));
  try {
    return withRobots(confirmationTitle(await loadBooking(id)));
  } catch {
    return withRobots(FALLBACK_CONFIRMATION_TITLE);
  }
};
