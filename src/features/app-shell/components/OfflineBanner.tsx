"use client";

import { cn } from "@/shared/lib/cn";
import { CheckCircleIcon, WifiOffIcon } from "@/shared/ui/icons";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import { useConnectivityView } from "../hooks/useConnectivityView";

/**
 * Banner global de conexão, em fluxo logo abaixo do cabeçalho (nunca sticky: o `scroll-padding-top`
 * e o foco programático contam com a altura fixa do header). A região `role="status"` fica sempre
 * montada, vazia quando online, para o leitor de tela anunciar a mudança uma vez. Os avisos por
 * seção (busca, hotel, checkout) continuam: o banner diz "o app está offline", a seção diz o que isso afeta.
 */
export const OfflineBanner = () => {
  const view = useConnectivityView();
  const messages = useAppShellMessages().offlineBanner;
  const offline = view === "offline";

  return (
    <div role="status" className="print:hidden">
      {view === "hidden" ? null : (
        <div
          className={cn(
            "border-b text-sm text-fg",
            offline ? "border-warning bg-warning-soft" : "border-success bg-success-soft",
          )}
        >
          <p className="mx-auto flex w-full max-w-6xl items-start gap-2 px-4 py-2 md:px-6 xl:px-8">
            {offline ? (
              <WifiOffIcon className="mt-0.5 size-5 shrink-0 text-warning" />
            ) : (
              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-success" />
            )}
            {offline ? messages.offline : messages.restored}
          </p>
        </div>
      )}
    </div>
  );
};
