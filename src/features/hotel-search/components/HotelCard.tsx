import Link from "next/link";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { pluralize } from "@/shared/lib/format";
import { amenityLabel, propertyTypeLabel } from "@/shared/lib/labels";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { CheckIcon, cardClassName, RatingScore, RemoteImage } from "@/shared/ui";
import { usePrefetchHotel } from "../hooks/usePrefetchHotel";
import { pickCardAmenities } from "../model/card-amenities";
import { deriveCardPricing } from "../model/card-pricing";
import { CARD_IMAGE_SIZES } from "../model/image";
import { HotelCardFooter } from "./HotelCardFooter";

type HotelCardProps = {
  hotel: Hotel;
  /** `null` no modo `browse` (sem datas): sem total e link sem critérios. */
  criteria: SearchCriteria | null;
  /** Comodidades filtradas: aparecem primeiro e em destaque. */
  selectedAmenities: readonly Amenity[];
  /** Primeiro card da lista: foto com `loading="eager"`. */
  priority?: boolean;
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
  priority = false,
}: HotelCardProps) => {
  const prefetch = usePrefetchHotel(hotel.id);
  const pricing = deriveCardPricing(hotel, criteria);

  return (
    <li>
      <article className={cardClassName({ variant: "interactive", className: "sm:flex-row" })}>
        <RemoteImage
          src={hotel.thumbnail}
          alt={hotel.name}
          sizes={CARD_IMAGE_SIZES}
          className="aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:min-h-42 sm:w-56"
          muted={pricing.status === "sold-out"}
          priority={priority}
        />
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          <h3 className="line-clamp-2 text-lg font-semibold text-fg">
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
          <RatingScore rating={hotel.rating} reviewCount={hotel.reviewCount} />
          <AmenityList amenities={hotel.amenities} selected={selectedAmenities} />
          <HotelCardFooter pricing={pricing} />
        </div>
      </article>
    </li>
  );
};
