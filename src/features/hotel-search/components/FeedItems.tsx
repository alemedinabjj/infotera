import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { shouldAnimateItem, staggerDelay } from "@/shared/lib/motion";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { GeoPoint } from "../model/distance";
import { HotelCard } from "./HotelCard";

type FeedItemsProps = {
  feedRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<Window, Element>;
  scrollMargin: number;
  hotels: readonly Hotel[];
  total: number;
  headingId: string;
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  center: GeoPoint | null;
  busy: boolean;
  stale: boolean;
  /** Quantos itens já apareceram: os remontados pela virtualização não piscam. */
  seenCount: number;
};

/**
 * `role="feed"` com só os cards da janela virtual. Cada `article` é posicionado por `transform`
 * (sem `div` extra entre o `feed` e os `article`, que o ARIA exige como filhos diretos).
 */
export const FeedItems = ({
  feedRef,
  virtualizer,
  scrollMargin,
  hotels,
  total,
  headingId,
  criteria,
  selectedAmenities,
  center,
  busy,
  stale,
  seenCount,
}: FeedItemsProps) => (
  <div
    ref={feedRef}
    role="feed"
    aria-labelledby={headingId}
    aria-busy={busy}
    style={{ height: virtualizer.getTotalSize() }}
    className={cn("relative transition-opacity", stale && "opacity-60")}
  >
    {virtualizer.getVirtualItems().map((item) => {
      const hotel = hotels[item.index];
      return hotel ? (
        <HotelCard
          key={item.key}
          hotel={hotel}
          criteria={criteria}
          selectedAmenities={selectedAmenities}
          center={center}
          priority={item.index === 0}
          fade={
            shouldAnimateItem(item.index, seenCount)
              ? { delay: staggerDelay(item.index - seenCount) }
              : null
          }
          feed={{
            posInSet: item.index + 1,
            setSize: total,
            index: item.index,
            ref: virtualizer.measureElement,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${item.start - scrollMargin}px)`,
            },
          }}
        />
      ) : null;
    })}
  </div>
);
