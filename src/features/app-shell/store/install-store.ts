import { create } from "zustand";

/** `beforeinstallprompt` (Chromium): não está no `lib.dom`. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isInstallPromptEvent = (event: Event): event is BeforeInstallPromptEvent =>
  "prompt" in event && typeof event.prompt === "function";

type InstallState = {
  /** O evento guardado (um uso só: depois de `prompt()` o navegador o invalida). */
  event: BeforeInstallPromptEvent | null;
  /** `appinstalled` chegou nesta sessão. */
  installed: boolean;
  clearEvent: () => void;
};

export const useInstallStore = create<InstallState>()((set) => ({
  event: null,
  installed: false,
  clearEvent: () => set({ event: null }),
}));

// Escopo do módulo, antes de qualquer efeito: o navegador dispara `beforeinstallprompt` cedo e
// quem registrar depois perde o evento. Sem listener o navegador ainda oferece a instalação nativa.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!isInstallPromptEvent(event)) return;
    // Sem isto o mini-infobar do Chrome aparece por conta própria e o cartão perde o controle.
    event.preventDefault();
    useInstallStore.setState({ event });
  });
  window.addEventListener("appinstalled", () => {
    useInstallStore.setState({ event: null, installed: true });
  });
}
