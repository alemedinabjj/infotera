import type { FieldErrors } from "react-hook-form";
import type { Locale } from "@/shared/i18n/config";
import { searchFormMessages } from "../i18n/messages";
import type { SearchFormValues } from "./search-form.schema";

export type SummaryField = "destination" | "checkIn" | "checkOut" | "adults";
export type SummaryItem = { field: SummaryField; label: string; message: string };

/**
 * Erros atuais na ordem do DOM (Destino → Check-in → Check-out → Hóspedes). Erros de adultos,
 * crianças e quartos viram um único item "Hóspedes" que foca o grupo (ref de `adults`).
 */
export const summarizeErrors = (
  errors: FieldErrors<SearchFormValues>,
  locale: Locale,
): SummaryItem[] => {
  const t = searchFormMessages.get(locale).form;
  const guests = errors.adults?.message ?? errors.children?.message ?? errors.rooms?.message;
  const candidates: [SummaryField, string, string | undefined][] = [
    ["destination", t.destination, errors.destination?.message],
    ["checkIn", t.checkIn, errors.checkIn?.message],
    ["checkOut", t.checkOut, errors.checkOut?.message],
    ["adults", t.guestsSummary, guests],
  ];
  return candidates.flatMap(([field, label, message]) =>
    message ? [{ field, label, message }] : [],
  );
};
