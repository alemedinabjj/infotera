import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "@/shared/lib/zod";
import { searchCriteriaSchema } from "../lib/search-params";
import { createRawStorage } from "../lib/storage";

const STORAGE_KEY = "infotera:booking-draft";
const STORAGE_VERSION = 1;

const roomSelectionSchema = z.object({
  hotelId: z.number().int(),
  roomId: z.number().int(),
  criteria: searchCriteriaSchema,
});

/** Seleção de quarto + critérios da busca. Só ids e critérios: nunca PII. */
export type RoomSelection = z.infer<typeof roomSelectionSchema>;

const persistedSchema = z.object({ selection: roomSelectionSchema.nullable() });

export type BookingDraftState = { selection: RoomSelection | null };

const initialState: BookingDraftState = { selection: null };

/**
 * Persistido em `sessionStorage` com `skipHydration`: o `StoreHydrator` reidrata no cliente
 * para o HTML do servidor (store vazio) não divergir do primeiro render do cliente.
 */
export const useBookingDraft = create<BookingDraftState>()(
  persist(() => initialState, {
    name: STORAGE_KEY,
    version: STORAGE_VERSION,
    storage: createJSONStorage(() => createRawStorage("session")),
    skipHydration: true,
    partialize: (state): BookingDraftState => ({ selection: state.selection }),
    migrate: () => initialState,
    merge: (persisted, current) => {
      const parsed = persistedSchema.safeParse(persisted);
      return parsed.success ? { ...current, selection: parsed.data.selection } : current;
    },
  }),
);

const actions = {
  selectRoom: (selection: RoomSelection): void => {
    useBookingDraft.setState({ selection });
  },
  /**
   * Muda a quantidade de quartos da seleção (checkout). Valida os critérios resultantes com
   * `searchCriteriaSchema`; inválido (ou sem seleção) não muda nada e devolve `false`.
   */
  setRoomCount: (rooms: number): boolean => {
    const { selection } = useBookingDraft.getState();
    if (!selection) return false;
    const criteria = searchCriteriaSchema.safeParse({ ...selection.criteria, rooms });
    if (!criteria.success) return false;
    useBookingDraft.setState({ selection: { ...selection, criteria: criteria.data } });
    return true;
  },
  clearSelection: (): void => {
    useBookingDraft.setState(initialState);
    useBookingDraft.persist.clearStorage();
  },
};

export const useSelection = (): RoomSelection | null => useBookingDraft((state) => state.selection);

export const useBookingDraftActions = (): typeof actions => actions;

/** `true` depois que o storage foi lido; a F5 só deve redirecionar "sem seleção" quando for `true`. */
export const useBookingDraftHydrated = (): boolean =>
  useSyncExternalStore(
    (onChange) => useBookingDraft.persist.onFinishHydration(onChange),
    () => useBookingDraft.persist.hasHydrated(),
    () => false,
  );
