"use client";

import { Alert, Button, WifiOffIcon } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

/** O mapa não carrega sem internet: a moldura some e a lista abaixo segue sendo a alternativa. */
export const MapOfflineAlert = () => {
  const messages = useHotelSearchMessages().map;
  return (
    <Alert
      tone="warning"
      icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
    >
      {messages.offline}
    </Alert>
  );
};

type MapLoadAlertProps = { retrying: boolean; onRetry: () => void };

/** Falha do chunk do mapa: o painel encolhe para este alerta (sem moldura vazia) com "Tentar de novo". */
export const MapLoadAlert = ({ retrying, onRetry }: MapLoadAlertProps) => {
  const messages = useHotelSearchMessages().map;
  return (
    <Alert
      tone="danger"
      title={messages.loadError}
      action={
        <Button
          variant="secondary"
          loading={retrying}
          loadingText={messages.retrying}
          onClick={onRetry}
          className="w-full sm:w-auto sm:self-start"
        >
          {messages.retry}
        </Button>
      }
    >
      {messages.loadErrorBody}
    </Alert>
  );
};
