import {
  createQueryPersister,
  getBrowserStorage,
  PERSIST_MAX_AGE,
  shouldDehydratePublicQuery,
} from "../api/persist";
import { APP_VERSION } from "../lib/app-version";

/** Persistência do cache: só consultas públicas por allowlist, 24 h, descartado a cada versão do app. */
export const persistOptions = {
  persister: createQueryPersister(getBrowserStorage()),
  maxAge: PERSIST_MAX_AGE,
  buster: APP_VERSION,
  dehydrateOptions: { shouldDehydrateQuery: shouldDehydratePublicQuery },
};

export type PersistOptions = typeof persistOptions;
