"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Amenity, Hotel } from "@/shared/api/schemas";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { FeedState } from "../hooks/results-model";
import { useAutoLoadMore } from "../hooks/useAutoLoadMore";
import { useFeedKeyboard } from "../hooks/useFeedKeyboard";
import { useFeedVirtualizer } from "../hooks/useFeedVirtualizer";
import { useFocusFeedItem } from "../hooks/useFocusFeedItem";
import { focusResultsHeading } from "../hooks/useFocusOnPageChange";
import { useSeenCount } from "../hooks/useSeenCount";
import type { GeoPoint } from "../model/distance";
import { useMapSync } from "../store/map-sync";
import { FeedFooter } from "./FeedFooter";
import { FeedItems } from "./FeedItems";

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
 * Rolagem contínua virtualizada: só os cards perto da janela ficam no DOM. Carregamento automático
 * perto do fim + botão "Carregar mais hotéis"; o foco vai ao 1º card novo quando o lote chega pelo
 * botão; teclado do padrão ARIA `feed`.
 */
export const HotelFeed = ({ hotels, headingId, feed, ...rest }: HotelFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLParagraphElement>(null);
  const keys = useMemo(() => hotels.map((hotel) => hotel.id), [hotels]);
  const { virtualizer, scrollMargin, focusIndex } = useFeedVirtualizer({ feedRef, keys });
  const seenCount = useSeenCount(feed.queryKey, virtualizer.getVirtualItems());
  const footerTargets = useMemo(() => [buttonRef, endRef], []);

  // "Mostrar na lista" do mapa: rola até o card (mesmo se virtualizado fora da janela) e foca.
  const registerReveal = useMapSync((state) => state.registerReveal);
  useEffect(() => {
    registerReveal((hotelId) => {
      const index = keys.indexOf(hotelId);
      if (index >= 0) focusIndex(index);
    });
    return () => registerReveal(null);
  }, [keys, focusIndex, registerReveal]);

  const loadMore = useFocusFeedItem({
    loaded: feed.loaded,
    buttonRef,
    queryKey: feed.queryKey,
    failed: feed.footer.kind === "error-more",
    loadMore: feed.loadMore,
    focusIndex,
  });
  // Com troca de filtro em andamento (`stale`) o rodapé é do resultado antigo: nada de lote.
  useAutoLoadMore({
    sentinelRef,
    enabled: feed.footer.kind === "more" && !rest.stale,
    onLoadMore: loadMore,
  });
  useFeedKeyboard({ containerRef, count: hotels.length, focusIndex, headingId, footerTargets });

  return (
    <div ref={containerRef}>
      <FeedItems
        {...rest}
        feedRef={feedRef}
        virtualizer={virtualizer}
        scrollMargin={scrollMargin}
        seenCount={seenCount}
        hotels={hotels}
        headingId={headingId}
        busy={rest.stale || feed.isFetchingNextPage}
      />
      <FeedFooter
        footer={feed.footer}
        loaded={feed.loaded}
        total={rest.total}
        fetching={feed.isFetchingNextPage}
        onLoadMore={loadMore}
        onBackToTop={() => focusResultsHeading(document.getElementById(headingId))}
        sentinelRef={sentinelRef}
        buttonRef={buttonRef}
        endRef={endRef}
        stale={rest.stale}
      />
    </div>
  );
};
