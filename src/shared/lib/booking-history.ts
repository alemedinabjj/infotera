import { z } from "zod";
import { createStorage } from "./storage";

/** Chave no `localStorage` (`infotera:booking-history`). */
export const BOOKING_HISTORY_KEY = "booking-history";
export const BOOKING_HISTORY_LIMIT = 10;

/** Só o id e quando foi aberto: nenhum dado da reserva (PII, hotel, datas ou valor) fica no disco. */
export const bookingHistoryEntrySchema = z.object({
  id: z.uuid({ version: "v4" }),
  savedAt: z.iso.datetime({ offset: true }),
});
export type BookingHistoryEntry = z.infer<typeof bookingHistoryEntrySchema>;

const storedSchema = z.array(z.unknown());

const storage = createStorage("local");

/** Adiciona no topo, sem duplicar o id, e mantém só as `BOOKING_HISTORY_LIMIT` mais recentes. */
export const addBookingToHistory = (
  list: readonly BookingHistoryEntry[],
  id: string,
  now: Date,
): BookingHistoryEntry[] => {
  const entry = bookingHistoryEntrySchema.parse({ id, savedAt: now.toISOString() });
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, BOOKING_HISTORY_LIMIT);
};

/** Lê o histórico. Storage corrompido vira `[]`; entrada inválida é descartada. */
export const readBookingHistory = (): BookingHistoryEntry[] =>
  storage
    .read(BOOKING_HISTORY_KEY, storedSchema, [])
    .flatMap((item) => {
      const parsed = bookingHistoryEntrySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, BOOKING_HISTORY_LIMIT);

/** Registra a reserva aberta. Nunca lança (storage é best-effort); id inválido é ignorado. */
export const recordBooking = (id: string, now: Date): void => {
  if (!bookingHistoryEntrySchema.shape.id.safeParse(id).success) return;
  storage.write(BOOKING_HISTORY_KEY, addBookingToHistory(readBookingHistory(), id, now));
};

/** Tira um id do histórico (usado pela F7: "Remover do histórico" e reservas que deram 404). */
export const removeFromHistory = (id: string): void => {
  storage.write(
    BOOKING_HISTORY_KEY,
    readBookingHistory().filter((item) => item.id !== id),
  );
};
