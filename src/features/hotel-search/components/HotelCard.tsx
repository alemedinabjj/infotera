import { m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type CSSProperties, type RefCallback, useId } from "react";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { formatUnit } from "@/shared/i18n/units";
import { cn } from "@/shared/lib/cn";
import { amenityLabel, propertyTypeLabel } from "@/shared/lib/labels";
import { hotelHref } from "@/shared/lib/links";
import { motionPreset } from "@/shared/lib/motion";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { CompareCheckbox, FavoriteButton } from "@/shared/saved";
import { CheckIcon, cardClassName, RatingScore, RemoteImage } from "@/shared/ui";
import { useCardMapSync } from "../hooks/useCardMapSync";
import { useHotelRooms } from "../hooks/useHotelRooms";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { useIntentPrefetch } from "../hooks/useIntentPrefetch";
import { pickCardAmenities } from "../model/card-amenities";
import { deriveCardPricing } from "../model/card-pricing";
import type { GeoPoint } from "../model/distance";
import { CARD_IMAGE_SIZES } from "../model/image";
import { HotelCardDistance } from "./HotelCardDistance";
import { HotelCardFooter } from "./HotelCardFooter";
import { OpeningIndicator } from "./OpeningIndicator";

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
  /** Entrada em fade (só opacidade) no primeiro mount, com este atraso (s); `null` não anima. */
  fade?: { delay: number } | null;
};

const AmenityList = ({
  amenities,
  selected,
}: {
  amenities: readonly Amenity[];
  selected: readonly Amenity[];
}) => {
  const locale = useLocale();
  const t = useHotelSearchMessages().page;
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
          {amenityLabel(amenity, locale)}
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="text-fg-subtle">
          <span aria-hidden="true">+{hiddenCount}</span>
          <span className="sr-only">
            {formatUnit(hiddenCount, "amenity", locale)} {t.more}
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
  fade = null,
}: HotelCardProps) => {
  const preset = motionPreset("list-item", useReducedMotion() ?? false);
  const titleId = useId();
  const { prefetch, handlers } = useIntentPrefetch();
  const locale = useLocale();
  const pricing = deriveCardPricing(hotel, criteria, useHotelRooms(hotel.id), locale);
  const sync = useCardMapSync(hotel.id);

  return (
    <m.article
      ref={feed?.ref}
      initial={fade ? preset.initial : false}
      animate={preset.animate}
      transition={{ ...preset.transition, delay: fade?.delay ?? 0 }}
      style={feed?.style}
      data-index={feed?.index}
      aria-posinset={feed?.posInSet}
      aria-setsize={feed?.setSize}
      aria-labelledby={feed ? titleId : undefined}
      tabIndex={feed ? -1 : undefined}
      {...sync.handlers}
      className={cardClassName({
        variant: "interactive",
        className: cn(
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-row [--card-image-w:14rem] [--card-fav-size:2.75rem]",
          sync.active && "ring-2 ring-primary",
        ),
      })}
    >
      <RemoteImage
        src={hotel.thumbnail}
        alt={hotel.name}
        sizes={CARD_IMAGE_SIZES}
        className="aspect-[5/2] w-full shrink-0 sm:aspect-auto sm:min-h-42 sm:w-(--card-image-w)"
        muted={pricing.status === "sold-out"}
        priority={priority}
      />
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <h3 id={titleId} className="line-clamp-2 text-lg font-semibold text-fg">
          <Link
            href={localizePath(locale, hotelHref(hotel.id, criteria))}
            data-hotel-link={hotel.id}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline"
            prefetch={prefetch}
            {...handlers}
          >
            {hotel.name}
            <OpeningIndicator />
          </Link>
        </h3>
        {/* Controle secundário: depois do link no DOM, acima do ::after. Em sm+ o canto da foto vem da
            mesma variável que dá a largura da foto (`--card-image-w`), sem número solto. */}
        <div className="absolute top-2 right-2 z-10 sm:right-auto sm:left-[calc(var(--card-image-w)-var(--card-fav-size)-0.5rem)]">
          <FavoriteButton hotelId={hotel.id} hotelName={hotel.name} variant="overlay" />
        </div>
        <p className="text-sm text-fg-muted">
          {propertyTypeLabel(hotel.propertyType, locale)} · {hotel.destination}
        </p>
        <HotelCardDistance hotel={hotel} center={center} />
        <RatingScore locale={locale} rating={hotel.rating} reviewCount={hotel.reviewCount} />
        <AmenityList amenities={hotel.amenities} selected={selectedAmenities} />
        <HotelCardFooter locale={locale} pricing={pricing} />
        <div className="relative z-10 flex min-h-11 items-center">
          <CompareCheckbox hotelId={hotel.id} hotelName={hotel.name} className="min-h-11" />
        </div>
      </div>
    </m.article>
  );
};
