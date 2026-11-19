"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "../api/query-client";
import { Toaster } from "../ui/toast/Toaster";
import { MotionProvider } from "./MotionProvider";
import { StoreHydrator } from "./StoreHydrator";

/** Providers globais: TanStack Query, Motion, reidratação dos stores persistidos (rascunho, favoritos, comparação) e Toaster. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    <MotionProvider>
      {children}
      <StoreHydrator />
      <Toaster />
    </MotionProvider>
  </QueryClientProvider>
);
