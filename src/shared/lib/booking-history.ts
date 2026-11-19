import { z } from "zod";
import { createStorage, STORAGE_PREFIX } from "./storage";

/** Chave no `localStorage` (`infotera:booking-history`). */
export const BOOKING_HISTORY_KEY = "booking-history";
export const BOOKING_HISTORY_LIMIT = 10;

const SHORT_ID = /^[A-Za-z0-9_-]{6,36}$/;
const ONLY_DIGITS = /^\d+$/;
const UUID_SHAPE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/**
 * Id aceito no histórico: UUID v4 (formato da F5) ou o id curto do json-server para reservas
 * criadas por `POST` direto. Nunca só dígitos (fecharia a enumeração) nem UUID de outra versão.
 */
export const bookingHistoryIdSchema = z.union([
  z.uuid({ version: "v4" }),
  z
    .string()
    .regex(SHORT_ID)
    .refine((value) => !ONLY_DIGITS.test(value) && !UUID_SHAPE.test(value)),
]);

/** Só o id e quando foi aberto: nenhum dado da reserva (PII, hotel, datas ou valor) fica no disco. */
export const bookingHistoryEntrySchema = z.object({
  id: bookingHistoryIdSchema,
  savedAt: z.iso.datetime({ offset: true }),
});
export type BookingHistoryEntry = z.infer<typeof bookingHistoryEntrySchema>;

const storedSchema = z.array(z.unknown());

const storage = createStorage("local");

/** Evento interno: o `storage` nativo só dispara em **outras** abas. */
const CHANGE_EVENT = "infotera:booking-history-change";

const write = (list: readonly BookingHistoryEntry[]): void => {
  storage.write(BOOKING_HISTORY_KEY, list);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
};

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
  if (!bookingHistoryIdSchema.safeParse(id).success) return;
  write(addBookingToHistory(readBookingHistory(), id, now));
};

/** Tira um id do histórico (usado pela F7: "Remover do histórico"). */
export const removeFromHistory = (id: string): void => removeManyFromHistory([id]);

/** Tira vários ids de uma vez (reservas que deram 404). */
export const removeManyFromHistory = (ids: readonly string[]): void => {
  if (ids.length === 0) return;
  const removed = new Set(ids);
  write(readBookingHistory().filter((item) => !removed.has(item.id)));
};

/** Apaga o histórico inteiro (a reserva continua válida no servidor). */
export const clearBookingHistory = (): void => {
  storage.remove(BOOKING_HISTORY_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
};

/** Desfazer: reinsere pela ordem de `savedAt` (mais recente primeiro), no teto de 10, sem duplicar. */
export const restoreHistoryEntry = (
  list: readonly BookingHistoryEntry[],
  entry: BookingHistoryEntry,
): BookingHistoryEntry[] => {
  if (list.some((item) => item.id === entry.id)) return [...list];
  return [...list, entry]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, BOOKING_HISTORY_LIMIT);
};

/** Desfazer remoção ou limpeza: devolve as entradas ao storage, cada uma na sua posição. */
export const restoreBookingHistory = (entries: readonly BookingHistoryEntry[]): void => {
  write(entries.reduce(restoreHistoryEntry, readBookingHistory()));
};

/** Assina mudanças: escrita nesta aba (evento interno) ou em outra (`storage`). */
export const subscribeBookingHistory = (notify: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_PREFIX + BOOKING_HISTORY_KEY) notify();
  };
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
};

const EMPTY: readonly BookingHistoryEntry[] = [];
let cache: { raw: string | null; list: readonly BookingHistoryEntry[] } = {
  raw: null,
  list: EMPTY,
};

const rawHistory = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + BOOKING_HISTORY_KEY);
  } catch {
    return null;
  }
};

/** Snapshot estável para `useSyncExternalStore`: a mesma referência enquanto o storage não muda. */
export const getBookingHistorySnapshot = (): readonly BookingHistoryEntry[] => {
  const raw = rawHistory();
  if (raw === cache.raw) return cache.list;
  const list = raw === null ? EMPTY : readBookingHistory();
  cache = { raw, list: list.length === 0 ? EMPTY : list };
  return cache.list;
};

export const getServerBookingHistorySnapshot = (): readonly BookingHistoryEntry[] => EMPTY;
