"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import {
  createQueryPersister,
  getBrowserStorage,
  PERSIST_MAX_AGE,
  shouldDehydratePublicQuery,
} from "../api/persist";
import { getQueryClient } from "../api/query-client";
import { APP_VERSION } from "../lib/app-version";
import { Toaster } from "../ui/toast/Toaster";
import { MotionProvider } from "./MotionProvider";
import { NavigationTracker } from "./NavigationTracker";
import { StoreHydrator } from "./StoreHydrator";

/** Persistência do cache: só consultas públicas por allowlist, 24 h, descartado a cada versão do app. */
const persistOptions = {
  persister: createQueryPersister(getBrowserStorage()),
  maxAge: PERSIST_MAX_AGE,
  buster: APP_VERSION,
  dehydrateOptions: { shouldDehydrateQuery: shouldDehydratePublicQuery },
};

/**
 * Providers globais: TanStack Query com cache público persistido (modo offline), Motion, reidratação
 * dos stores persistidos (rascunho, favoritos, comparação) e Toaster.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <PersistQueryClientProvider client={getQueryClient()} persistOptions={persistOptions}>
    <MotionProvider>
      <NavigationTracker />
      {children}
      <StoreHydrator />
      <Toaster />
    </MotionProvider>
  </PersistQueryClientProvider>
);
