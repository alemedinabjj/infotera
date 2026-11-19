import { create } from "zustand";

type AnnouncerState = { message: string };

/** Mensagem da região viva da bandeja (sempre montada no layout). */
export const useCompareAnnouncer = create<AnnouncerState>(() => ({ message: "" }));

export const announceCompare = (message: string): void => {
  useCompareAnnouncer.setState({ message });
};
