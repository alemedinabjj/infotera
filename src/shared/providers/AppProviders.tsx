"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "../api/query-client";
import { Toaster } from "../ui/toast/Toaster";
import { BookingDraftHydrator } from "./BookingDraftHydrator";
import { MotionProvider } from "./MotionProvider";

/** Providers globais: TanStack Query, Motion, reidratação do rascunho da reserva e Toaster. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    <MotionProvider>
      {children}
      <BookingDraftHydrator />
      <Toaster />
    </MotionProvider>
  </QueryClientProvider>
);
