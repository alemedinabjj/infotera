"use client";

import { ErrorState } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type ResultsErrorProps = { onRetry: () => void; retrying: boolean };

/** Erro da lista: mensagem fixa (nunca o texto da API) + "Tentar de novo". */
export const ResultsError = ({ onRetry, retrying }: ResultsErrorProps) => {
  const t = useHotelSearchMessages();
  return (
    <ErrorState
      title={t.list.errorTitle}
      description={t.list.errorDescription}
      onRetry={onRetry}
      retrying={retrying}
      headingLevel={2}
    />
  );
};
