"use client";

import { Alert, Button } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type FiltersErrorProps = { onRetry: () => void };

/** Fallback compacto da seção de filtros: a lista continua funcionando sem eles. */
export const FiltersError = ({ onRetry }: FiltersErrorProps) => {
  const t = useHotelSearchMessages();
  return (
    <Alert
      tone="danger"
      title={t.controls.filtersError}
      action={
        <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
          {t.map.retry}
        </Button>
      }
    />
  );
};
