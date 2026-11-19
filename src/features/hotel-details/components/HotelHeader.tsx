import type { ReactNode } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { propertyTypeLabel } from "@/shared/lib/labels";
import { Badge, buttonClassName, ChevronDownIcon, MapPinIcon, RatingScore } from "@/shared/ui";
import { FromPrice } from "./FromPrice";
import { ShareButton } from "./ShareButton";

type HotelHeaderProps = {
  hotel: Hotel;
  /** `12–15 dez · 3 noites · 2 adultos · 1 quarto`; `null` sem critérios. */
  stayLabel: string | null;
  /** Galeria: fica entre o nome e o preço (a mesma ordem em todas as larguras). */
  children: ReactNode;
};

/**
 * Topo da página: contexto, h1, endereço, nota, galeria (slot) e, abaixo, preço "a partir de" +
 * ações. Ordem do DOM = ordem visual (sem `order-*`).
 */
export const HotelHeader = ({ hotel, stayLabel, children }: HotelHeaderProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        <span>
          {propertyTypeLabel(hotel.propertyType)} · {hotel.destination}
        </span>
        {hotel.featured ? <Badge tone="info">Destaque</Badge> : null}
      </p>
      <h1 className="text-2xl font-bold text-fg lg:text-3xl">{hotel.name}</h1>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
        <p className="flex items-start gap-1 text-sm text-fg-muted">
          <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {hotel.address}
        </p>
        <RatingScore rating={hotel.rating} reviewCount={hotel.reviewCount} />
      </div>
    </div>
    {children}
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1">
        <FromPrice hotelId={hotel.id} />
        {stayLabel ? (
          <p className="text-sm text-fg-muted tabular-nums">Sua estadia: {stayLabel}</p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <ShareButton />
        <a href="#quartos" className={`${buttonClassName()} flex-1 whitespace-nowrap lg:flex-none`}>
          Ver quartos
          <ChevronDownIcon aria-hidden="true" className="size-5" />
        </a>
      </div>
    </div>
  </div>
);
