"use client";

import { useLocale } from "@/shared/i18n/client";
import { cn } from "@/shared/lib/cn";
import { ChevronLeftIcon, ChevronRightIcon, IconButton } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { type GalleryAction, photoCounter } from "../model/gallery";

type PhotoControlsProps = {
  index: number;
  total: number;
  onGo: (action: GalleryAction) => void;
  /** `overlay` sobre o fundo escuro do modal; `secondary` na página cheia (tema claro). */
  variant: "overlay" | "secondary";
  /** `id` do contador (descreve o diálogo no modal). */
  counterId?: string;
  className?: string;
};

/** Anterior · "Foto 3 de 5" · Próxima. O contador é `aria-live` e tem largura fixa (nada pula). */
export const PhotoControls = ({
  index,
  total,
  onGo,
  variant,
  counterId,
  className,
}: PhotoControlsProps) => {
  const t = useHotelDetailsMessages().gallery;
  const locale = useLocale();
  // Anel branco no modal (o `primary` sobre `bg-fg` não passa 3:1); na página, o anel `focus` padrão.
  const arrow = variant === "overlay" ? "text-fg" : undefined;
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <IconButton
        aria-label={t.previous}
        variant={variant}
        className={arrow}
        icon={<ChevronLeftIcon className="size-6" />}
        onClick={() => onGo("prev")}
      />
      <p
        id={counterId}
        aria-live="polite"
        className={cn("w-28 text-center tabular-nums", variant === "secondary" && "text-fg-muted")}
      >
        {photoCounter(index, total, locale)}
      </p>
      <IconButton
        aria-label={t.next}
        variant={variant}
        className={arrow}
        data-photo-next=""
        icon={<ChevronRightIcon className="size-6" />}
        onClick={() => onGo("next")}
      />
    </div>
  );
};
