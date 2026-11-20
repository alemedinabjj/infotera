"use client";

import { Serwist } from "@serwist/window";
import { useEffect } from "react";
import { reloadPage } from "@/shared/lib/navigation";
import { toast } from "@/shared/ui/toast/toast-store";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import { useInstallStore } from "../store/install-store";

export const SW_URL = "/serwist/sw.js";
const UPDATE_TOAST_KEY = "sw-update";

/**
 * Registra o service worker (escopo `/`) só no build de produção e onde o navegador suporta. Quando uma
 * versão nova fica em espera, avisa com um toast persistente "Nova versão disponível." e a ação
 * "Atualizar" pede `SKIP_WAITING` e recarrega quando a versão nova assume (`controlling`): a troca
 * nunca acontece sozinha no meio de uma sessão (nem no checkout). Também confirma "App instalado.".
 */
export const ServiceWorkerRegistrar = () => {
  const messages = useAppShellMessages().update;
  const installedMessage = useAppShellMessages().install.installed;
  const installed = useInstallStore((state) => state.installed);

  // O módulo do store escuta `beforeinstallprompt`/`appinstalled` desde o carregamento (importá-lo aqui
  // o põe no chunk do layout, em toda página); `appinstalled` mostra a confirmação.
  useEffect(() => {
    if (installed) toast.success(installedMessage);
  }, [installed, installedMessage]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const serwist = new Serwist(SW_URL, { scope: "/", type: "classic" });
    const onWaiting = () => {
      toast.info(messages.available, {
        key: UPDATE_TOAST_KEY,
        persistent: true,
        action: {
          label: messages.reload,
          onClick: () => {
            serwist.addEventListener("controlling", reloadPage);
            serwist.messageSkipWaiting();
          },
        },
      });
    };
    serwist.addEventListener("waiting", onWaiting);
    void serwist.register();
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [messages]);

  return null;
};
