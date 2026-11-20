"use client";

import { Button, MapIcon } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type MapToggleProps = {
  open: boolean;
  /** Id do painel (só quando ele está no DOM). */
  controls: string | undefined;
  onToggle: () => void;
  className?: string;
};

/** Botão do mapa na toolbar: `aria-pressed` e `aria-controls`; continua mesmo quando o painel não aparece. */
export const MapToggle = ({ open, controls, onToggle, className }: MapToggleProps) => {
  const messages = useHotelSearchMessages().map;
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={open}
      aria-controls={controls}
      onClick={onToggle}
      className={className}
    >
      <MapIcon />
      {open ? messages.hide : messages.show}
    </Button>
  );
};
