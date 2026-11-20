import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
import { availabilityStatus, describeAvailability } from "@/shared/lib/availability";
import { propertyTypeLabel } from "@/shared/lib/labels";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Badge, cardClassName, PriceTag, RatingScore, RemoteImage } from "@/shared/ui";

type SimilarHotelCardProps = {
  hotel: Hotel;
  /** Os critérios da busca seguem no link (o detalhe do similar já abre com as datas). */
  criteria: SearchCriteria | null;
};

const IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 6rem";

/**
 * Card compacto de recomendação: horizontal no celular, vertical a partir de `sm`. O nome é o
 * único link (o `::after` o estende ao card inteiro).
 */
export const SimilarHotelCard = ({ hotel, criteria }: SimilarHotelCardProps) => {
  const { badge } = describeAvailability({
    status: availabilityStatus(hotel.availableRooms, 1),
    availableRooms: hotel.availableRooms,
    requestedRooms: 1,
    hasDates: criteria !== null,
  });
  return (
    <li className="flex">
      <article
        className={cardClassName({
          variant: "interactive",
          className: "flex-1 flex-row sm:flex-col",
        })}
      >
        <RemoteImage
          src={hotel.thumbnail}
          alt=""
          sizes={IMAGE_SIZES}
          className="aspect-square w-24 shrink-0 sm:aspect-[4/3] sm:w-full"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-fg">
            <Link
              href={hotelHref(hotel.id, criteria)}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline"
            >
              {hotel.name}
            </Link>
          </h3>
          <p className="text-sm text-fg-muted">{propertyTypeLabel(hotel.propertyType)}</p>
          <RatingScore
            rating={hotel.rating}
            reviewCount={hotel.reviewCount}
            size="sm"
            showLabel={false}
          />
          <div className="mt-auto flex flex-col gap-1 pt-1">
            <PriceTag variant="nightly-line" nightly={hotel.pricePerNight} />
            {badge ? (
              <Badge tone={badge.tone} className="w-fit">
                {badge.text}
              </Badge>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
};
