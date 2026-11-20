import Link from "next/link";
import type { ReactNode } from "react";
import type { Hotel } from "../../api/schemas";
import { availabilityStatus, describeAvailability } from "../../lib/availability";
import { cn } from "../../lib/cn";
import { propertyTypeLabel } from "../../lib/labels";
import { hotelHref } from "../../lib/links";
import type { SearchCriteria } from "../../lib/search-params";
import { Badge } from "../atoms/Badge";
import { RemoteImage } from "../atoms/RemoteImage";
import { cardClassName } from "./card-styles";
import { PriceTag } from "./PriceTag";
import { RatingScore } from "./RatingScore";

type CompactHotelCardProps = {
  hotel: Hotel;
  /** Os critérios da busca seguem no link (o detalhe já abre com as datas). */
  criteria: SearchCriteria | null;
  /** `compact`: horizontal no celular e vertical a partir de `sm`. `vertical`: sempre vertical. */
  layout?: "compact" | "vertical";
  headingLevel?: 2 | 3;
  /** Mostra `Tipo · Destino` em vez de só o tipo. */
  showDestination?: boolean;
  /** Sobre a foto (ex.: coração). Controle secundário: `relative z-10`, depois do link no DOM. */
  media?: ReactNode;
  /** Preço no lugar do padrão (`pricePerNight` do hotel, que diverge dos quartos em alguns hotéis). */
  price?: ReactNode;
  /** Linha no fim do card (ex.: "Comparar"). Controle secundário: `relative z-10`. */
  actions?: ReactNode;
  className?: string;
};

const IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 6rem";

const PHOTO: Record<NonNullable<CompactHotelCardProps["layout"]>, string> = {
  compact: "aspect-square w-24 shrink-0 sm:aspect-[4/3] sm:w-full",
  vertical: "aspect-[4/3] w-full shrink-0",
};

/**
 * Card compacto de hotel (recomendações e favoritos). O nome é o único link (o `::after` o estende
 * ao card inteiro); `media` e `actions` são os até 2 controles secundários do DS §5.2, que vêm
 * depois do link no DOM e ficam acima do `::after`.
 */
export const CompactHotelCard = ({
  hotel,
  criteria,
  layout = "compact",
  headingLevel = 3,
  showDestination = false,
  media,
  price,
  actions,
  className,
}: CompactHotelCardProps) => {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { badge } = describeAvailability({
    status: availabilityStatus(hotel.availableRooms, 1),
    availableRooms: hotel.availableRooms,
    requestedRooms: 1,
    hasDates: criteria !== null,
  });
  const type = propertyTypeLabel(hotel.propertyType);
  return (
    <article
      className={cardClassName({
        variant: "interactive",
        className: cn(
          "flex-1",
          layout === "compact" ? "flex-row sm:flex-col" : "flex-col",
          className,
        ),
      })}
    >
      <RemoteImage src={hotel.thumbnail} alt="" sizes={IMAGE_SIZES} className={PHOTO[layout]} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
        <Heading className="line-clamp-2 text-base font-semibold text-fg">
          <Link
            href={hotelHref(hotel.id, criteria)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline"
          >
            {hotel.name}
          </Link>
        </Heading>
        <p className="text-sm text-fg-muted">
          {showDestination ? `${type} · ${hotel.destination}` : type}
        </p>
        <RatingScore
          rating={hotel.rating}
          reviewCount={hotel.reviewCount}
          size="sm"
          showLabel={false}
        />
        <div className="mt-auto flex flex-col gap-1 pt-1">
          {price ?? <PriceTag variant="nightly-line" nightly={hotel.pricePerNight} />}
          {badge ? (
            <Badge tone={badge.tone} className="w-fit">
              {badge.text}
            </Badge>
          ) : null}
        </div>
        {actions ? <div className="relative z-10 flex min-h-11 items-center">{actions}</div> : null}
      </div>
      {media ? <div className="absolute top-2 right-2 z-10">{media}</div> : null}
    </article>
  );
};
