import Link from "next/link";
import { type CSSProperties, type RefCallback, useId } from "react";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { pluralize } from "@/shared/lib/format";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { CheckIcon } from "@/shared/ui";
import { useHotelRooms } from "../hooks/useHotelRooms";
import { usePrefetchHotel } from "../hooks/usePrefetchHotel";
import { pickCardAmenities } from "../model/card-amenities";
import { deriveCardPricing } from "../model/card-pricing";
import type { GeoPoint } from "../model/distance";
import { amenityLabel, propertyTypeLabel } from "../model/labels";
import { hotelHref } from "../model/search-page";
import { HotelCardDistance } from "./HotelCardDistance";
import { HotelCardFooter } from "./HotelCardFooter";
import { HotelImage } from "./HotelImage";
import { RatingScore } from "./RatingScore";

/** Posição do card no feed (padrão ARIA `feed`): tamanho do conjunto conhecido pelo total da API. */
export type FeedItemProps = {
  /** 1-based. */
  posInSet: number;
  setSize: number;
  /** Índice 0-based (`data-index` do virtualizador). */
  index: number;
  /** Mede o card (`measureElement`). */
  ref?: RefCallback<HTMLElement>;
  /** Posição absoluta do item virtualizado. */
  style?: CSSProperties;
};

type HotelCardProps = {
  hotel: Hotel;
  /** `null` no modo `browse` (sem datas): sem total e link sem critérios. */
  criteria: SearchCriteria | null;
  /** Comodidades filtradas: aparecem primeiro e em destaque. */
  selectedAmenities: readonly Amenity[];
  /** Centroide do destino (distância no card); `null` omite a linha. */
  center: GeoPoint | null;
  /** Primeiro card da lista: foto com `loading="eager"`. */
  priority?: boolean;
  /** Só na rolagem contínua: o `article` vira item do `feed`. */
  feed?: FeedItemProps;
};

const AmenityList = ({
  amenities,
  selected,
}: {
  amenities: readonly Amenity[];
  selected: readonly Amenity[];
}) => {
  const { shown, hiddenCount } = pickCardAmenities(amenities, selected);
  const selectedSet = new Set(selected);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {shown.map((amenity) => (
        <li
          key={amenity}
          className={cn(
            "flex items-center gap-1",
            selectedSet.has(amenity) ? "font-medium text-fg" : "text-fg-muted",
          )}
        >
          <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
          {amenityLabel(amenity)}
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="text-fg-subtle">
          <span aria-hidden="true">+{hiddenCount}</span>
          <span className="sr-only">
            {pluralize(hiddenCount, "comodidade", "comodidades")} a mais
          </span>
        </li>
      ) : null}
    </ul>
  );
};

/**
 * Card do hotel: o nome é o único link (o `::after` o estende ao card inteiro). Hover/foco
 * prefetcham o detalhe. Esgotado continua sendo link (o detalhe explica).
 */
export const HotelCard = ({
  hotel,
  criteria,
  selectedAmenities,
  center,
  priority = false,
  feed,
}: HotelCardProps) => {
  const titleId = useId();
  const prefetch = usePrefetchHotel(hotel.id);
  const pricing = deriveCardPricing(hotel, criteria, useHotelRooms(hotel.id));

  return (
    <article
      ref={feed?.ref}
      style={feed?.style}
      data-index={feed?.index}
      aria-posinset={feed?.posInSet}
      aria-setsize={feed?.setSize}
      aria-labelledby={feed ? titleId : undefined}
      tabIndex={feed ? -1 : undefined}
      className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow duration-150 hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-row"
    >
      <HotelImage
        src={hotel.thumbnail}
        alt={hotel.name}
        muted={pricing.status === "sold-out"}
        eager={priority}
      />
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <h3 id={titleId} className="line-clamp-2 text-lg font-semibold text-fg">
          <Link
            href={hotelHref(hotel.id, criteria)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline"
            {...prefetch}
          >
            {hotel.name}
          </Link>
        </h3>
        <p className="text-sm text-fg-muted">
          {propertyTypeLabel(hotel.propertyType)} · {hotel.destination}
        </p>
        <HotelCardDistance hotel={hotel} center={center} />
        <RatingScore rating={hotel.rating} reviewCount={hotel.reviewCount} />
        <AmenityList amenities={hotel.amenities} selected={selectedAmenities} />
        <HotelCardFooter pricing={pricing} />
      </div>
    </article>
  );
};
