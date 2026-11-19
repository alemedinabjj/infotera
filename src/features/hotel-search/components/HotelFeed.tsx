"use client";

import { useCallback, useRef } from "react";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { revealBelowHeader } from "@/shared/lib/scroll";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { FeedState } from "../hooks/results-model";
import { useAutoLoadMore } from "../hooks/useAutoLoadMore";
import { useFocusFeedItem } from "../hooks/useFocusFeedItem";
import { focusResultsHeading } from "../hooks/useFocusOnPageChange";
import type { GeoPoint } from "../model/distance";
import { FeedFooter } from "./FeedFooter";
import { HotelCard } from "./HotelCard";

type HotelFeedProps = {
  hotels: readonly Hotel[];
  total: number;
  /** Id do h2 da contagem (rótulo do feed e destino de "Voltar ao topo"). */
  headingId: string;
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  center: GeoPoint | null;
  /** Troca de filtro em andamento: lista anterior esmaecida e `aria-busy`. */
  stale: boolean;
  feed: FeedState;
};

/**
 * Rolagem contínua: `role="feed"` com um `article` por hotel + rodapé (botão "Carregar mais hotéis",
 * carregamento automático perto do fim). O foco vai ao 1º card novo quando o lote chega pelo botão.
 */
export const HotelFeed = ({
  hotels,
  total,
  headingId,
  criteria,
  selectedAmenities,
  center,
  stale,
  feed,
}: HotelFeedProps) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLParagraphElement>(null);
  const fetching = feed.isFetchingNextPage;

  const focusIndex = useCallback((index: number) => {
    const card = feedRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    card?.focus({ preventScroll: true });
    revealBelowHeader(card ?? null);
  }, []);
  const loadMore = useFocusFeedItem({
    loaded: feed.loaded,
    buttonRef,
    loadMore: feed.loadMore,
    focusIndex,
  });
  useAutoLoadMore({ sentinelRef, enabled: feed.footer.kind === "more", onLoadMore: loadMore });

  return (
    <>
      <div
        ref={feedRef}
        role="feed"
        aria-labelledby={headingId}
        aria-busy={stale || fetching}
        className={cn("flex flex-col gap-4 transition-opacity lg:gap-6", stale && "opacity-60")}
      >
        {hotels.map((hotel, index) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            criteria={criteria}
            selectedAmenities={selectedAmenities}
            center={center}
            priority={index === 0}
            feed={{ posInSet: index + 1, setSize: total, index }}
          />
        ))}
      </div>
      <FeedFooter
        footer={feed.footer}
        loaded={feed.loaded}
        total={total}
        fetching={fetching}
        onLoadMore={loadMore}
        onBackToTop={() => focusResultsHeading(document.getElementById(headingId))}
        sentinelRef={sentinelRef}
        buttonRef={buttonRef}
        endRef={endRef}
      />
    </>
  );
};
