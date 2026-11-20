"use client";

import { Serwist } from "@serwist/window";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { reloadPage } from "@/shared/lib/navigation";
import { toast } from "@/shared/ui/toast/toast-store";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import { canShowUpdateToast, UPDATE_TOAST_KEY } from "../model/update-toast";
import { useInstallStore } from "../store/install-store";

export const SW_URL = "/serwist/sw.js";

/**
 * Registra o service worker (escopo `/`) só no build de produção e onde o navegador suporta. Quando uma
 * versão nova fica em espera, avisa com um toast persistente "Nova versão disponível." e a ação
 * "Atualizar agora" pede `SKIP_WAITING` e recarrega quando a versão nova assume (`controlling`): a
 * troca nunca acontece sozinha no meio de uma sessão. No checkout o aviso fica pendente (o reload
 * perderia o formulário) e aparece na próxima rota. Também confirma "App instalado.".
 */
export const ServiceWorkerRegistrar = () => {
  const messages = useAppShellMessages().update;
  const installedMessage = useAppShellMessages().install.installed;
  const installed = useInstallStore((state) => state.installed);
  const [waiting, setWaiting] = useState<Serwist | null>(null);
  // Só gatilho: o pathname do navegador (não o do rewrite do proxy) é lido no efeito, nunca no render.
  const route = usePathname();

  // O módulo do store escuta `beforeinstallprompt`/`appinstalled` desde o carregamento (importá-lo aqui
  // o põe no chunk do layout, em toda página); `appinstalled` mostra a confirmação.
  useEffect(() => {
    if (installed) toast.success(installedMessage);
  }, [installed, installedMessage]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const serwist = new Serwist(SW_URL, { scope: "/", type: "classic" });
    const onWaiting = () => setWaiting(serwist);
    serwist.addEventListener("waiting", onWaiting);
    void serwist.register();
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `route` só reavalia o aviso pendente a cada rota
  useEffect(() => {
    if (!waiting || !canShowUpdateToast(window.location.pathname)) return;
    toast.info(messages.available, {
      key: UPDATE_TOAST_KEY,
      persistent: true,
      action: {
        label: messages.reload,
        onClick: () => {
          waiting.addEventListener("controlling", reloadPage);
          waiting.messageSkipWaiting();
        },
      },
    });
  }, [waiting, route, messages]);

  return null;
};
