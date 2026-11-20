"use client";

import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { formatBRL } from "@/shared/lib/currency";
import { formatRating } from "@/shared/lib/format";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import type { CardPricing } from "../model/card-pricing";

type MapPopupProps = {
  hotel: Hotel;
  pricing: CardPricing;
  criteria: SearchCriteria | null;
  /** "Mostrar na lista": leva o foco ao card (e o popup fecha). */
  onShowInList: () => void;
};

// `leaflet.css` pinta todo `a` dentro do mapa e vence os utilitários: a cor do link usa `!`.
const PRIMARY_LINK =
  "inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-3 font-medium text-fg-on-primary! hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-primary px-3 font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Conteúdo do popup do marcador: nome, nota, preço por noite e os dois destinos. */
export const MapPopup = ({ hotel, pricing, criteria, onShowInList }: MapPopupProps) => {
  const locale = useLocale();
  const messages = useHotelSearchMessages().map;
  const soldOut = pricing.status === "sold-out";
  const rating = formatRating(hotel.rating, locale);
  const price = formatBRL(pricing.nightly, { cents: false, locale });
  return (
    <div className="flex min-w-48 flex-col gap-2">
      <h3 className="pr-8 text-sm font-semibold text-fg">{hotel.name}</h3>
      <p className="text-fg-muted">
        <span aria-hidden="true">★ {rating}</span>
        <span className="sr-only">{messages.popupRating({ rating })}</span>
      </p>
      <p className="font-medium text-fg">
        {soldOut ? messages.soldOut : messages.popupPerNight({ price })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href={localizePath(locale, hotelHref(hotel.id, criteria))} className={PRIMARY_LINK}>
          {messages.viewHotel}
        </Link>
        <button type="button" onClick={onShowInList} className={SECONDARY_BUTTON}>
          {messages.showInList}
        </button>
      </div>
    </div>
  );
};
