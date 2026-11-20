import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryKey } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { z } from "../lib/zod";

/** Chave do `localStorage` com o cache público das consultas. */
export const PERSIST_KEY = "infotera:query-cache";

/** Validade do cache salvo: 24 h (e o `gcTime` do client no navegador acompanha, senão a consulta sai da memória antes). */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * **Allowlist** (nunca denylist) das raízes de `queryKeys` que podem ir para o `localStorage`: só
 * dado público do catálogo. Raiz nova (cupom, histórico, reserva, qualquer coisa futura) **não**
 * persiste por padrão.
 */
export const PERSISTABLE_ROOTS = ["suggestions", "hotels", "rooms", "reviews"] as const;

type QueryLike = { queryKey: QueryKey; meta?: Record<string, unknown> | undefined };

const isRootAllowed = (root: unknown): boolean =>
  PERSISTABLE_ROOTS.some((allowed) => allowed === root);

/** A raiz da chave está na allowlist? (`bookings` e raízes desconhecidas: não.) */
export const isPersistableQueryKey = (queryKey: QueryKey): boolean => isRootAllowed(queryKey[0]);

/**
 * Esta consulta pode ser gravada? Só com a raiz na allowlist **e** sem a marca `meta.sensitive`
 * (a reserva tem nome, e-mail e telefone): as duas travas valem juntas.
 */
export const isPersistableQuery = ({ queryKey, meta }: QueryLike): boolean =>
  isPersistableQueryKey(queryKey) && meta?.sensitive !== true;

const envelopeSchema = z.object({
  timestamp: z.number(),
  buster: z.string(),
  clientState: z.object({
    mutations: z.array(z.unknown()),
    queries: z.array(
      z.looseObject({
        queryKey: z.array(z.unknown()),
        queryHash: z.string(),
        state: z.record(z.string(), z.unknown()),
      }),
    ),
  }),
});

/**
 * Valida o **envelope** do cache salvo (timestamp, buster, lista de consultas com chave array). O
 * conteúdo de cada consulta não passa de novo pelos schemas da API: o `buster` por versão do app
 * descarta o cache de outro deploy, então o formato salvo sempre bate com o código atual.
 */
export const persistedClientSchema = z.custom<PersistedClient>(
  (value) => envelopeSchema.safeParse(value).success,
);

/** Cliente vazio e expirado (`timestamp: 0`): a restauração o descarta e remove a chave. */
const EMPTY_CLIENT: PersistedClient = {
  timestamp: 0,
  buster: "",
  clientState: { mutations: [], queries: [] },
};

/** JSON corrompido ou fora do envelope vira cliente vazio: o app sobe e as consultas buscam normalmente. */
export const deserializeClient = (cached: string): PersistedClient => {
  try {
    const parsed = persistedClientSchema.safeParse(JSON.parse(cached));
    return parsed.success ? parsed.data : EMPTY_CLIENT;
  } catch {
    return EMPTY_CLIENT;
  }
};

/**
 * Serializa **refiltrando** as consultas (defesa em profundidade: mesmo que o `dehydrate` deixasse
 * passar uma chave fora da allowlist ou uma consulta sensível, ela não chega ao storage).
 */
export const serializeClient = (client: PersistedClient): string =>
  JSON.stringify({
    ...client,
    clientState: {
      mutations: [],
      queries: client.clientState.queries.filter(isPersistableQuery),
    },
  });

/** Persister em `localStorage` (no servidor, `storage` ausente: não faz nada). Falha de gravação é silenciosa. */
export const createQueryPersister = (
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined,
) =>
  createSyncStoragePersister({
    storage,
    key: PERSIST_KEY,
    throttleTime: 1000,
    serialize: serializeClient,
    deserialize: deserializeClient,
  });

/** `dehydrateOptions.shouldDehydrateQuery` do provider: só sucesso e só o que pode ser público. */
export const shouldDehydratePublicQuery = (
  query: QueryLike & { state: { status: string } },
): boolean => query.state.status === "success" && isPersistableQuery(query);
