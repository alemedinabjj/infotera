"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { useLocale } from "@/shared/i18n/client";
import { commonMessages } from "@/shared/i18n/common/messages";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import { Badge, ErrorBoundary, PriceTag, Skeleton } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

const MUTED = "text-sm text-fg-muted";

const FromPriceContent = ({ hotelId }: { hotelId: number }) => {
  const t = useHotelDetailsMessages().fromPrice;
  const locale = useLocale();
  const soldOut = commonMessages.get(locale).availability.soldOut;
  const { data: rooms } = useSuspenseQuery(hotelRoomsQueryOptions(hotelId));
  const from = lowestNightlyPrice(rooms);
  if (from === null) return <p className={MUTED}>{t.noRooms}</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <PriceTag locale={locale} variant="nightly-inline" nightly={from.price} />
      {from.soldOut ? <Badge tone="danger">{soldOut}</Badge> : null}
    </div>
  );
};

/**
 * Falha dos quartos: texto discreto. Observa a mesma query (sem disparar request) e, quando o
 * "Tentar de novo" da seção Quartos der certo, reseta a própria boundary para o preço entrar.
 */
const FromPriceError = ({ hotelId, reset }: { hotelId: number; reset: () => void }) => {
  const t = useHotelDetailsMessages().fromPrice;
  const query = useQuery({ ...hotelRoomsQueryOptions(hotelId), enabled: false });
  const recovered = query.isSuccess;
  useEffect(() => {
    if (recovered) reset();
  }, [recovered, reset]);
  return <p className={MUTED}>{t.unavailable}</p>;
};

/**
 * "a partir de R$ 800 por noite", calculado pelos quartos (não pelo `pricePerNight` do hotel, que
 * diverge). Ilha própria com Suspense: lê o mesmo cache da seção Quartos.
 */
export const FromPrice = ({ hotelId }: { hotelId: number }) => (
  <div className="min-h-8">
    <ErrorBoundary fallback={({ reset }) => <FromPriceError hotelId={hotelId} reset={reset} />}>
      <Suspense fallback={<Skeleton className="h-8 w-56" />}>
        <FromPriceContent hotelId={hotelId} />
      </Suspense>
    </ErrorBoundary>
  </div>
);
