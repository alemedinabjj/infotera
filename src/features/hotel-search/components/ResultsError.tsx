"use client";

import { useLocale } from "@/shared/i18n/client";
import { ErrorState } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type ResultsErrorProps = { onRetry: () => void; retrying: boolean };

/** Erro da lista: mensagem fixa (nunca o texto da API) + "Tentar de novo". */
export const ResultsError = ({ onRetry, retrying }: ResultsErrorProps) => {
  const t = useHotelSearchMessages();
  const locale = useLocale();
  return (
    <ErrorState
      locale={locale}
      title={t.list.errorTitle}
      description={t.list.errorDescription}
      onRetry={onRetry}
      retrying={retrying}
      headingLevel={2}
    />
  );
};
