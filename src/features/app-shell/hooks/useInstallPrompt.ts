"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createStorage } from "@/shared/lib/storage";
import {
  INSTALL_DISMISSED_KEY,
  type InstallPromptView,
  installDismissedSchema,
  installPromptView,
} from "../model/install-prompt";
import { useInstallStore } from "../store/install-store";

const STANDALONE_QUERY = "(display-mode: standalone)";

/** `matchMedia` falta em ambientes sem ele (jsdom): vale "não é standalone". */
const standaloneMedia = (): MediaQueryList | null =>
  typeof window.matchMedia === "function" ? window.matchMedia(STANDALONE_QUERY) : null;

const subscribeStandalone = (notify: () => void): (() => void) => {
  const media = standaloneMedia();
  media?.addEventListener("change", notify);
  return () => media?.removeEventListener("change", notify);
};

const storage = createStorage("local");

type InstallPrompt = {
  view: InstallPromptView;
  /** Chama `prompt()` do navegador e espera a escolha (um uso só). */
  install: () => Promise<void>;
  /** "Agora não": grava o momento e esconde por 30 dias. */
  dismiss: () => void;
  /** O cartão acabou de ser dispensado (por "Agora não" ou pelo prompt nativo): vale o aviso falado. */
  dismissedNow: boolean;
};

/**
 * Estado do cartão de instalação: evento guardado, modo standalone e a dispensa de 30 dias. O cartão
 * fica na tela enquanto o prompt nativo está aberto; "dispensar" no prompt nativo vale como "Agora
 * não" (o evento não pode ser reutilizado), e aceitar o esconde (o app passa a estar instalado).
 */
export const useInstallPrompt = (): InstallPrompt => {
  const event = useInstallStore((state) => state.event);
  const clearEvent = useInstallStore((state) => state.clearEvent);
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => standaloneMedia()?.matches ?? false,
    () => false,
  );
  const [dismissedAt, setDismissedAt] = useState<string | null>(() =>
    storage.read(INSTALL_DISMISSED_KEY, installDismissedSchema, null),
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const [now] = useState(() => Date.now());
  const prompting = useRef(false);

  const dismiss = () => {
    const stamp = new Date().toISOString();
    storage.write(INSTALL_DISMISSED_KEY, stamp);
    setDismissedAt(stamp);
    setDismissedNow(true);
  };

  const install = async () => {
    if (!event || prompting.current) return;
    prompting.current = true;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      // O navegador invalida o evento depois de `prompt()`: o cartão some, aceito ou não.
      if (choice.outcome === "dismissed") dismiss();
      clearEvent();
    } finally {
      prompting.current = false;
    }
  };

  return {
    view: installPromptView({
      hasPrompt: event !== null,
      isStandalone: standalone,
      dismissedAt,
      now,
    }),
    install,
    dismiss,
    dismissedNow,
  };
};
