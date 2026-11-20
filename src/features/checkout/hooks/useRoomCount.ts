"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer } from "react";
import { roomQueryOptions } from "@/shared/api/queries";
import type { Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { type RoomSelection, useBookingDraftActions } from "@/shared/stores/booking-draft";
import {
  availableHint,
  confirmFailedHint,
  confirmingHint,
  initialRoomCountState,
  limitHint,
  roomCountBounds,
  roomCountReducer,
} from "../model/room-count";

/**
 * Quantidade de quartos com **optimistic update**: o valor (e o preço) mudam na hora; em paralelo
 * a API confirma `available >= n`. Se não confirmar, volta ao último valor **confirmado** com o
 * motivo. O reducer com `seq` resolve cliques rápidos (o último vence). O valor é persistido no
 * `booking-draft` para o rascunho refletir a escolha.
 */
export const useRoomCount = (selection: RoomSelection, room: Room | undefined) => {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const { setRoomCount } = useBookingDraftActions();
  const [state, dispatch] = useReducer(
    roomCountReducer,
    selection.criteria.rooms,
    initialRoomCountState,
  );

  useEffect(() => {
    setRoomCount(state.value);
  }, [state.value, setRoomCount]);

  const bounds = room ? roomCountBounds(selection.criteria, room, locale) : null;

  const change = (value: number) => {
    if (!room) return;
    const seq = state.seq + 1;
    dispatch({ type: "change", value });
    queryClient
      .fetchQuery({ ...roomQueryOptions(room.id), staleTime: 0 })
      .then((fresh) =>
        fresh.available >= value
          ? dispatch({ type: "confirmed", seq, value })
          : dispatch({ type: "rejected", seq, note: availableHint(fresh.available, locale) }),
      )
      .catch(() => dispatch({ type: "rejected", seq, note: confirmFailedHint(locale) }));
  };

  let hint: string | null = null;
  if (state.status === "confirming") hint = confirmingHint(locale);
  else if (state.note) hint = state.note;
  else if (bounds) hint = limitHint(bounds, state.value);

  const criteria: SearchCriteria = { ...selection.criteria, rooms: state.value };
  return { rooms: state.value, criteria, bounds, hint, change, ready: room !== undefined };
};
