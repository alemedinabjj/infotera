import type { ReactNode } from "react";
import type { Hotel, Room } from "@/shared/api/schemas";
import { contentLang, type Locale } from "@/shared/i18n/config";
import { propertyTypeLabel } from "@/shared/lib/labels";
import { CompareCheckbox } from "@/shared/saved/components/CompareCheckbox";
import { FavoriteButton } from "@/shared/saved/components/FavoriteButton";
import { Badge, buttonClassName, ChevronDownIcon, MapPinIcon, RatingScore } from "@/shared/ui";
import type { Settled } from "../api/settled";
import { hotelDetailsMessages } from "../i18n/messages";
import { FromPrice } from "./FromPrice";
import { ShareButton } from "./ShareButton";

type HotelHeaderProps = {
  locale: Locale;
  hotel: Hotel;
  /** Quartos do snapshot do catálogo: o "a partir de" vem deles. */
  rooms: Settled<readonly Room[]>;
  /** Galeria: fica entre o nome e o preço (a mesma ordem em todas as larguras). */
  children: ReactNode;
};

/**
 * Topo da página: contexto, h1, endereço, nota, galeria (slot) e, abaixo, preço "a partir de" +
 * ações. Ordem do DOM = ordem visual (sem `order-*`).
 */
export const HotelHeader = ({ locale, hotel, rooms, children }: HotelHeaderProps) => {
  const t = hotelDetailsMessages.get(locale).header;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <span>
            {propertyTypeLabel(hotel.propertyType, locale)} ·{" "}
            <span lang={contentLang(locale)}>{hotel.destination}</span>
          </span>
          {hotel.featured ? <Badge tone="info">{t.featured}</Badge> : null}
        </p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-fg lg:text-3xl">{hotel.name}</h1>
          <FavoriteButton hotelId={hotel.id} hotelName={hotel.name} variant="secondary" />
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
          <p className="flex items-start gap-1 text-sm text-fg-muted">
            <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span lang={contentLang(locale)}>{hotel.address}</span>
          </p>
          <RatingScore locale={locale} rating={hotel.rating} reviewCount={hotel.reviewCount} />
        </div>
      </div>
      {children}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <FromPrice locale={locale} rooms={rooms} />
        </div>
        <div className="grid grid-cols-2 items-center gap-3 sm:flex">
          <CompareCheckbox hotelId={hotel.id} hotelName={hotel.name} />
          <ShareButton />
          <a
            href="#quartos"
            className={`${buttonClassName()} col-span-2 whitespace-nowrap sm:col-span-1`}
          >
            {t.viewRooms}
            <ChevronDownIcon aria-hidden="true" className="size-5" />
          </a>
        </div>
      </div>
    </div>
  );
};
