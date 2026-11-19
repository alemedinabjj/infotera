"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "../api/query-client";
import { Toaster } from "../ui/toast/Toaster";
import { BookingDraftHydrator } from "./BookingDraftHydrator";

/** Providers globais: TanStack Query, reidratação do rascunho da reserva e Toaster. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    {children}
    <BookingDraftHydrator />
    <Toaster />
  </QueryClientProvider>
);
