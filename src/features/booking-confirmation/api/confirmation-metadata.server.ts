import "server-only";
import type { Metadata } from "next";
import type { Locale } from "@/shared/i18n/config";
import { parseBookingId } from "../model/booking-id";
import {
  CONFIRMATION_ROBOTS,
  confirmationTitle,
  fallbackConfirmationTitle,
} from "../model/metadata";
import { loadBooking } from "./confirmation.server";

const withRobots = (title: string): Metadata => ({ title, robots: CONFIRMATION_ROBOTS });

/**
 * Metadata da rota: título genérico por estado (nunca com nome, e-mail ou id) e sempre
 * `noindex, nofollow`. Compartilha o `GET /bookings/:id` com a página (`React.cache`). Erro na
 * leitura não derruba a página: o `error.tsx` mostra o erro real, com retry.
 */
export const generateConfirmationMetadata = async (
  rawId: string,
  locale: Locale,
): Promise<Metadata> => {
  const id = parseBookingId(rawId);
  if (id === null) return withRobots(confirmationTitle({ kind: "not-found" }, locale));
  try {
    return withRobots(confirmationTitle(await loadBooking(id), locale));
  } catch {
    return withRobots(fallbackConfirmationTitle(locale));
  }
};
