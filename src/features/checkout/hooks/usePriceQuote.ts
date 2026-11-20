"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Room } from "@/shared/api/schemas";
import { nightsBetween, todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { Coupon } from "../model/coupons";
import { buildQuote } from "../model/quote";
import type { CheckoutPrice } from "./checkout-price";

/**
 * Preço calculado no cliente a partir de `room.pricePerNight` relido da API (nunca do storage):
 * quarto + noites + quartos + cupom. Os estados loading/erro alimentam os skeletons e o retry.
 */
export const usePriceQuote = (
  room: UseQueryResult<Room>,
  criteria: SearchCriteria,
  coupon: Coupon | null,
): CheckoutPrice => {
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const pricePerNight = room.data?.pricePerNight;
  const result = useMemo(
    () =>
      pricePerNight === undefined
        ? null
        : buildQuote({ pricePerNight, nights, rooms: criteria.rooms, coupon, today: todayISO() }),
    [pricePerNight, nights, criteria.rooms, coupon],
  );
  if (result) return { status: "ready", nights, result };
  if (room.isError) {
    return {
      status: "error",
      nights,
      retry: () => void room.refetch(),
      retrying: room.isFetching,
    };
  }
  return { status: "loading", nights };
};
