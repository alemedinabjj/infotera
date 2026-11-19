import { useSyncExternalStore } from "react";
import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { searchCriteriaSchema } from "../lib/search-params";

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
 * Persistido em `sessionStorage` com `skipHydration`: o `BookingDraftHydrator` reidrata no cliente
 * para o HTML do servidor (store vazio) não divergir do primeiro render do cliente.
 */
export const useBookingDraft = create<BookingDraftState>()(
  persist(() => initialState, {
    name: STORAGE_KEY,
    version: STORAGE_VERSION,
    storage: createJSONStorage(() => sessionStorage),
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
