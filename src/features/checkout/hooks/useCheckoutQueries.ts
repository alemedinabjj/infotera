"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { isApiError } from "@/shared/api/http";
import { hotelQueryOptions, roomQueryOptions } from "@/shared/api/queries";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import { type RoomSelection, useBookingDraftActions } from "@/shared/stores/booking-draft";
import { type RoomEligibility, roomEligibility } from "../model/checkout-gate";

const isNotFound = (error: unknown): boolean => isApiError(error) && error.isNotFound();

/**
 * Hotel e quarto relidos da API (nunca do storage). O quarto usa `staleTime: 0`: a disponibilidade
 * importa aqui. 404 ou quarto de outro hotel limpam a seleção (storage adulterado ou dado sumiu).
 */
export const useCheckoutQueries = (selection: RoomSelection) => {
  const hotel = useQuery(hotelQueryOptions(selection.hotelId));
  const room = useQuery({ ...roomQueryOptions(selection.roomId), staleTime: 0 });
  const { clearSelection } = useBookingDraftActions();

  // Datas passadas não dependem de dados remotos: o bloqueio aparece sem esperar a API.
  const stale = isBeforeToday(selection.criteria.checkIn, todayISO());
  const eligibility: RoomEligibility | "pending" =
    hotel.data && room.data
      ? roomEligibility({ selection, hotel: hotel.data, room: room.data, today: todayISO() })
      : stale
        ? "stale-dates"
        : "pending";

  const gone = isNotFound(hotel.error) || isNotFound(room.error) || eligibility === "mismatch";
  useEffect(() => {
    if (gone) clearSelection();
  }, [gone, clearSelection]);

  return { hotel, room, eligibility };
};
