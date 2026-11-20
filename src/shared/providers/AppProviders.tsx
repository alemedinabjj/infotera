"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, Suspense } from "react";
import { getQueryClient } from "../api/query-client";
import { Toaster } from "../ui/toast/Toaster";
import { MotionProvider } from "./MotionProvider";
import { NavigationTracker } from "./NavigationTracker";
import { PersistFlush } from "./PersistFlush";
import { persistOptions } from "./persist-options";
import { StoreHydrator } from "./StoreHydrator";

/**
 * Providers globais: TanStack Query com cache público persistido (modo offline), Motion, reidratação
 * dos stores persistidos (rascunho, favoritos, comparação) e Toaster.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <PersistQueryClientProvider client={getQueryClient()} persistOptions={persistOptions}>
    <PersistFlush options={persistOptions} />
    <MotionProvider>
      {/* `usePathname` só existe em runtime nas rotas com segmento dinâmico: fora da casca (F7c). */}
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      {children}
      <StoreHydrator />
      <Toaster />
    </MotionProvider>
  </PersistQueryClientProvider>
);
