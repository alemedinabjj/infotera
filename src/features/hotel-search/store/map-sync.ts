import { create } from "zustand";

/** Levanta o card do hotel para o foco (modo de lista ativo: páginas ou feed virtualizado). */
export type RevealCard = (hotelId: number) => void;

type MapSyncState = {
  /** Hotel em destaque por hover/foco em card **ou** marcador. */
  activeHotelId: number | null;
  /** Registrado pelo modo de lista ativo; `null` quando não há lista montada. */
  revealCard: RevealCard | null;
  setActive: (hotelId: number | null) => void;
  registerReveal: (reveal: RevealCard | null) => void;
};

/**
 * Sincronização lista ↔ mapa. Cada card/marcador assina só `s.activeHotelId === id` (seletor
 * booleano): passar o mouse re-renderiza dois itens, não a lista inteira.
 */
export const useMapSync = create<MapSyncState>()((set) => ({
  activeHotelId: null,
  revealCard: null,
  setActive: (hotelId) => set({ activeHotelId: hotelId }),
  registerReveal: (reveal) => set({ revealCard: reveal }),
}));

/** `true` quando este hotel é o destacado (re-renderiza só quando o resultado muda). */
export const useIsActiveHotel = (hotelId: number): boolean =>
  useMapSync((state) => state.activeHotelId === hotelId);

/** Estado inicial (testes e desmontagem do painel). */
export const resetMapSync = (): void => {
  useMapSync.setState({ activeHotelId: null, revealCard: null });
};

/** Hotel em destaque (para quem precisa do valor; prefira `useIsActiveHotel` por card/marcador). */
export const useIsActiveHotelId = (): number | null => useMapSync((state) => state.activeHotelId);
