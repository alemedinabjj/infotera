import { useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import { ErrorState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import type { PhotoOpenStatus } from "../model/photo-open-status";
import { StillFailingNotice } from "./StillFailingNotice";

type PhotoOpenErrorProps = { status: PhotoOpenStatus; onRetry: () => void };

/**
 * Corpo do erro ao abrir a foto (rota falhou ou sem internet): cartão **claro** sobre a moldura escura
 * (`fg-muted` sobre `bg-fg` não passa AA). O Dialog `full` pinta o anel de foco de branco; dentro do
 * cartão os botões voltam ao anel `focus` padrão (seletor mais específico que o do Dialog). Se uma
 * tentativa não tira o cartão da tela, um aviso de `aria-live` diz que ainda não foi possível.
 */
export const PhotoOpenError = ({ status, onRetry }: PhotoOpenErrorProps) => {
  const t = useHotelDetailsMessages().gallery;
  const locale = useLocale();
  const [tried, setTried] = useState(false);
  const text = {
    failed: { title: t.openError, body: t.openErrorBody },
    offline: { title: t.offlineTitle, body: t.offlineBody },
    reconnected: { title: t.reconnectedTitle, body: t.reconnectedBody },
  }[status];
  return (
    <div className="flex size-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-fg [&_button:focus-visible]:outline-focus">
        <ErrorState
          locale={locale}
          variant="inline"
          headingLevel={3}
          title={text.title}
          description={text.body}
          onRetry={() => {
            setTried(true);
            onRetry();
          }}
        />
        <StillFailingNotice show={tried} message={t.stillFailing} />
      </div>
    </div>
  );
};
