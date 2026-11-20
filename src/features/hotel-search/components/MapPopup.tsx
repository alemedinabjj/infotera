"use client";

import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { cn } from "@/shared/lib/cn";
import { formatBRL } from "@/shared/lib/currency";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Badge, Button, buttonClassName, RatingScore } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import type { CardPricing } from "../model/card-pricing";

type MapPopupProps = {
  hotel: Hotel;
  pricing: CardPricing;
  criteria: SearchCriteria | null;
  /** Id do título: nomeia o diálogo (vem do mapa). */
  titleId: string;
  /** "Mostrar na lista": fecha o popup e leva o foco ao card. */
  onShowInList: () => void;
};

// `leaflet.css` pinta todo `a` dentro do mapa e vence os utilitários: a cor do link usa `!`.
const VIEW_HOTEL = cn(
  buttonClassName({ variant: "primary", fullWidth: true }),
  "text-fg-on-primary!",
);

/**
 * Conteúdo do popup do marcador: nome, nota, preço por noite e os dois destinos. O botão "×" e a
 * ordem do teclado (Ver hotel, Mostrar na lista, Fechar) são do mapa; aqui só o conteúdo.
 */
export const MapPopup = ({ hotel, pricing, criteria, titleId, onShowInList }: MapPopupProps) => {
  const locale = useLocale();
  const messages = useHotelSearchMessages().map;
  const perNight = useCommonMessages().price.perNight;
  const price = formatBRL(pricing.nightly, { cents: false, locale });
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 id={titleId} className="line-clamp-2 pr-11 text-sm font-semibold text-fg">
        {hotel.name}
      </h3>
      <RatingScore rating={hotel.rating} size="sm" />
      {pricing.status === "sold-out" ? (
        <Badge tone="danger" className="self-start">
          {messages.soldOut}
        </Badge>
      ) : (
        <p>
          <span className="font-semibold text-fg tabular-nums">{price}</span>{" "}
          <span className="text-sm text-fg-muted">{perNight}</span>
        </p>
      )}
      <Link href={localizePath(locale, hotelHref(hotel.id, criteria))} className={VIEW_HOTEL}>
        {messages.viewHotel}
      </Link>
      <Button variant="secondary" fullWidth onClick={onShowInList}>
        {messages.showInList}
      </Button>
    </div>
  );
};
