"use client";

import { useEffect } from "react";
import { useBookingDraft } from "../stores/booking-draft";

/** Reidrata o rascunho da reserva a partir do `sessionStorage` depois da montagem no cliente. */
export const BookingDraftHydrator = () => {
  useEffect(() => {
    void useBookingDraft.persist.rehydrate();
  }, []);
  return null;
};
