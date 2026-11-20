"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { cn } from "@/shared/lib/cn";
import { reloadPage } from "@/shared/lib/navigation";
import { Button } from "@/shared/ui/atoms/Button";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { WifiOffIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import type { OfflineVariant } from "../model/cache-rules";

type OfflinePageProps = {
  /** Qual página offline: o service worker escolhe pela rota que falhou. */
  variant: OfflineVariant;
};

/**
 * Página offline (`/offline`, `/offline/checkout`, `/offline/bookings` e as de `/en`): o que o service
 * worker mostra quando a rota não está salva e não há rede. O h1 diz o que isso afeta **aqui** (nunca
 * repete o banner "Você está sem internet"). "Tentar de novo" recarrega a URL original (o service
 * worker serve esta página de novo se a conexão continuar fora).
 */
export const OfflinePage = ({ variant }: OfflinePageProps) => {
  const messages = useAppShellMessages().offlinePage;
  const locale = useLocale();
  const [retrying, setRetrying] = useState(false);
  const content = messages[variant];
  return (
    <EmptyState
      headingLevel={1}
      title={content.title}
      description={content.description}
      icon={<WifiOffIcon className="size-8" />}
      className="mx-auto max-w-prose"
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            loading={retrying}
            loadingText={messages.retrying}
            onClick={() => {
              setRetrying(true);
              reloadPage();
            }}
            className="w-full sm:w-auto"
          >
            {messages.retry}
          </Button>
          <Link
            href={localizePath(locale, "/")}
            className={cn(buttonClassName({ variant: "ghost" }), "w-full sm:w-auto")}
          >
            {messages.home}
          </Link>
        </div>
      }
    />
  );
};
