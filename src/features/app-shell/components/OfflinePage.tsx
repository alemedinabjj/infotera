"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { WifiOffIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";
import { useAppShellMessages } from "../hooks/useAppShellMessages";

/**
 * Página offline (`/offline`, `/en/offline`): o que o service worker mostra quando uma rota não
 * está salva e não há rede. "Tentar de novo" recarrega (o service worker volta a tentar a rede).
 */
export const OfflinePage = () => {
  const messages = useAppShellMessages().offlinePage;
  const locale = useLocale();
  return (
    <EmptyState
      headingLevel={1}
      title={messages.title}
      description={messages.description}
      icon={<WifiOffIcon className="size-8" />}
      action={
        <>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClassName({ variant: "primary" })}
          >
            {messages.retry}
          </button>
          <Link
            href={localizePath(locale, "/")}
            className={buttonClassName({ variant: "secondary" })}
          >
            {messages.home}
          </Link>
        </>
      }
    />
  );
};
