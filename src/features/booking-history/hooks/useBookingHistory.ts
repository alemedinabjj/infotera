"use client";

import { useSyncExternalStore } from "react";
import {
  type BookingHistoryEntry,
  getBookingHistorySnapshot,
  getServerBookingHistorySnapshot,
  subscribeBookingHistory,
} from "@/shared/lib/booking-history";

/** Ids guardados pela F6, reativos (escrita nesta aba ou em outra). Vazio no servidor. */
export const useBookingHistory = (): readonly BookingHistoryEntry[] =>
  useSyncExternalStore(
    subscribeBookingHistory,
    getBookingHistorySnapshot,
    getServerBookingHistorySnapshot,
  );

const noopSubscribe = (): (() => void) => () => undefined;

/** `false` no servidor e na hidratação; `true` depois (o storage só existe no cliente). */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
