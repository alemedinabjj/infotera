"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import type { Hotel, Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { assignLocation } from "@/shared/lib/navigation";
import { type RoomSelection, useBookingDraftActions } from "@/shared/stores/booking-draft";
import { readDraftCouponCode } from "./checkout-initial";
import { useCheckoutForm } from "./useCheckoutForm";
import { useCoupon } from "./useCoupon";
import { usePriceQuote } from "./usePriceQuote";
import { useRoomCount } from "./useRoomCount";
import { useSubmitBooking } from "./useSubmitBooking";

type FlowOptions = {
  selection: RoomSelection;
  hotel: UseQueryResult<Hotel>;
  room: UseQueryResult<Room>;
  /** Reserva criada: a página congela a seleção antes de o store ser limpo. */
  onLeaving: (selection: RoomSelection) => void;
};

/**
 * Junta as peças do checkout: quartos (optimistic), cupom, preço, formulário de 3 passos e envio.
 * Ao criar a reserva: congela a seleção, apaga o rascunho, carga de documento para a confirmação (`assignLocation`) e
 * só então limpa o `booking-draft` (a página não redireciona para `/`: o gate está em `leaving`).
 */
export const useCheckoutFlow = ({ selection, hotel, room, onLeaving }: FlowOptions) => {
  const locale = useLocale();
  const { clearSelection } = useBookingDraftActions();
  const roomCount = useRoomCount(selection, room.data);
  const [restoredCoupon] = useState(readDraftCouponCode);
  const coupon = useCoupon(selection.roomId, roomCount.criteria, restoredCoupon);
  const price = usePriceQuote(room, roomCount.criteria, coupon.coupon);
  const checkout = useCheckoutForm(roomCount.criteria, coupon.savedCode);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const current: RoomSelection = { ...selection, criteria: roomCount.criteria };

  const submit = useSubmitBooking({
    selection: current,
    price,
    onCreated: (bookingId) => {
      onLeaving(current);
      checkout.clearDraft();
      // Carga de documento: descarta o heap da página que tinha o cartão (Activity, F7c Decisão 10).
      assignLocation(localizePath(locale, `/confirmation/${bookingId}`));
      clearSelection();
    },
    onCouponRejected: (code, reason) => {
      coupon.reject(code, reason);
      setSummaryOpen(true);
    },
    onInvalidField: checkout.showFieldError,
  });

  return {
    hotel,
    room,
    selection: current,
    roomCount,
    coupon,
    price,
    checkout,
    submit,
    summaryOpen,
    setSummaryOpen,
  };
};

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>;
