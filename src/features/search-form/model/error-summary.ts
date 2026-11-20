import type { FieldErrors } from "react-hook-form";
import type { SearchFormValues } from "./search-form.schema";

export type SummaryField = "destination" | "checkIn" | "checkOut" | "adults";
export type SummaryItem = { field: SummaryField; label: string; message: string };

/**
 * Erros atuais na ordem do DOM (Destino → Check-in → Check-out → Hóspedes). Erros de adultos,
 * crianças e quartos viram um único item "Hóspedes" que foca o grupo (ref de `adults`).
 */
export const summarizeErrors = (errors: FieldErrors<SearchFormValues>): SummaryItem[] => {
  const guests = errors.adults?.message ?? errors.children?.message ?? errors.rooms?.message;
  const candidates: [SummaryField, string, string | undefined][] = [
    ["destination", "Destino", errors.destination?.message],
    ["checkIn", "Check-in", errors.checkIn?.message],
    ["checkOut", "Check-out", errors.checkOut?.message],
    ["adults", "Hóspedes", guests],
  ];
  return candidates.flatMap(([field, label, message]) =>
    message ? [{ field, label, message }] : [],
  );
};
