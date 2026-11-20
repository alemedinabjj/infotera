"use client";

import { cn } from "@/shared/lib/cn";
import { Button, MapIcon } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type MapToggleProps = {
  open: boolean;
  /** Id do painel; só enquanto ele está no DOM (ligado sem painel não aponta para nada). */
  controls: string | undefined;
  onToggle: () => void;
  className?: string;
};

const PRESSED =
  "border-primary bg-primary-soft text-primary ring-1 ring-primary ring-inset " +
  "hover:border-primary-active hover:ring-primary-active";

/**
 * Botão do mapa na toolbar. O rótulo é fixo ("Mapa"): o estado sai só do `aria-pressed`, então o
 * leitor de tela não ouve o estado duas vezes. Ligado sem painel (lista carregando, vazia ou
 * offline) continua pressionado, sem `aria-controls`; clicar desliga.
 */
export const MapToggle = ({ open, controls, onToggle, className }: MapToggleProps) => {
  const messages = useHotelSearchMessages().map;
  return (
    <Button
      variant="secondary"
      leftIcon={<MapIcon aria-hidden="true" />}
      aria-pressed={open}
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
      className={cn("w-full min-[23rem]:w-auto", open && PRESSED, className)}
    >
      {messages.toggle}
    </Button>
  );
};
