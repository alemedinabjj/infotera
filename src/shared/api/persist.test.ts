import { dehydrate, QueryClient } from "@tanstack/react-query";
import {
  type PersistedClient,
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { describe, expect, it, vi } from "vitest";
import {
  createQueryPersister,
  deserializeClient,
  isPersistableQuery,
  isPersistableQueryKey,
  PERSIST_KEY,
  PERSIST_MAX_AGE,
  serializeClient,
  shouldDehydratePublicQuery,
} from "./persist";
import { bookingQueryOptions } from "./queries";
import { queryKeys } from "./query-keys";

class MemoryStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("isPersistableQueryKey: allowlist por raiz de queryKeys", () => {
  it.each([
    ["suggestions", queryKeys.suggestions("sao"), true],
    ["hotels.all", queryKeys.hotels.all, true],
    ["hotels.list", queryKeys.hotels.list({ destination: "Rio" }), true],
    ["hotels.infinite", queryKeys.hotels.infinite({ destination: "Rio" }), true],
    ["hotels.detail", queryKeys.hotels.detail(1), true],
    ["hotels.byIds", queryKeys.hotels.byIds([2, 1]), true],
    ["rooms.byHotel", queryKeys.rooms.byHotel(1), true],
    ["rooms.detail", queryKeys.rooms.detail(1), true],
    ["rooms.byHotels", queryKeys.rooms.byHotels([1, 2]), true],
    ["reviews.byHotel", queryKeys.reviews.byHotel(1, 1), true],
    ["coupons.detail", queryKeys.coupons.detail("BEMVINDO10"), false],
    ["bookings.all", queryKeys.bookings.all, false],
    ["bookings.detail (uuid)", queryKeys.bookings.detail("3f2a9c1e"), false],
    ["bookings.detail (id curto)", queryKeys.bookings.detail(1), false],
  ])("%s → %s", (_name, key, expected) => {
    expect(isPersistableQueryKey(key)).toBe(expected);
  });

  it("raiz desconhecida, vazia ou que não é texto nunca persiste", () => {
    expect(isPersistableQueryKey(["history", 1])).toBe(false);
    expect(isPersistableQueryKey(["favorites"])).toBe(false);
    expect(isPersistableQueryKey([])).toBe(false);
    expect(isPersistableQueryKey([42])).toBe(false);
    expect(isPersistableQueryKey([{ hotels: true }])).toBe(false);
    expect(isPersistableQueryKey(["HOTELS"])).toBe(false);
  });
});

describe("isPersistableQuery: a marca meta.sensitive vence a allowlist", () => {
  it("raiz permitida sem marca persiste", () => {
    expect(isPersistableQuery({ queryKey: queryKeys.hotels.detail(1) })).toBe(true);
    expect(isPersistableQuery({ queryKey: queryKeys.hotels.detail(1), meta: {} })).toBe(true);
    expect(
      isPersistableQuery({ queryKey: queryKeys.hotels.detail(1), meta: { sensitive: false } }),
    ).toBe(true);
  });

  it("raiz permitida com meta.sensitive === true não persiste", () => {
    expect(
      isPersistableQuery({ queryKey: queryKeys.hotels.detail(1), meta: { sensitive: true } }),
    ).toBe(false);
  });

  it("a consulta de reserva real (bookingQueryOptions) nunca persiste", () => {
    for (const id of [1, "3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57"]) {
      const options = bookingQueryOptions(id);
      expect(isPersistableQuery({ queryKey: options.queryKey, meta: options.meta })).toBe(false);
    }
  });
});

const seedClient = (): QueryClient => {
  const client = new QueryClient();
  client.setQueryData(queryKeys.hotels.detail(1), { id: 1, name: "Hotel" });
  client.setQueryData(queryKeys.rooms.byHotel(1), [{ id: 1 }]);
  client.setQueryData(queryKeys.suggestions("sao"), ["São Paulo"]);
  client.setQueryData(queryKeys.reviews.byHotel(1, 1), []);
  client.setQueryData(queryKeys.bookings.detail("abc"), { holder: { email: "ana@exemplo.com" } });
  client.setQueryData(queryKeys.coupons.detail("X"), { code: "X" });
  return client;
};

describe("o que o cliente grava", () => {
  it("dehydrate com a regra pública guarda só sucesso de chave permitida", () => {
    const state = dehydrate(seedClient(), { shouldDehydrateQuery: shouldDehydratePublicQuery });
    const roots = state.queries.map((query) => query.queryKey[0]).sort();
    expect(roots).toEqual(["hotels", "reviews", "rooms", "suggestions"]);
  });

  it("consulta em erro ou pendente não é gravada", async () => {
    const client = new QueryClient();
    await client.prefetchQuery({
      queryKey: queryKeys.hotels.detail(9),
      queryFn: () => Promise.reject(new Error("falhou")),
      retry: false,
    });
    void client.prefetchQuery({
      queryKey: queryKeys.hotels.detail(10),
      queryFn: () => new Promise(() => undefined),
    });
    const state = dehydrate(client, { shouldDehydrateQuery: shouldDehydratePublicQuery });
    expect(state.queries).toEqual([]);
  });

  it("serializeClient refiltra: uma reserva infiltrada no estado não chega ao storage", () => {
    const client = seedClient();
    // Estado desidratado SEM filtro (simula um filtro quebrado): contém `bookings` e `coupons`.
    const unfiltered = dehydrate(client, { shouldDehydrateQuery: () => true });
    const persisted: PersistedClient = {
      buster: "v1",
      timestamp: Date.now(),
      clientState: unfiltered,
    };
    const text = serializeClient(persisted);
    expect(text).not.toContain("bookings");
    expect(text).not.toContain("ana@exemplo.com");
    expect(text).not.toContain("coupons");
    expect(text).toContain("hotels");
  });

  it("serializeClient também remove consulta marcada como sensível de raiz permitida", () => {
    const client = new QueryClient();
    client.setQueryDefaults(queryKeys.hotels.detail(3), { meta: { sensitive: true } });
    client.setQueryData(queryKeys.hotels.detail(3), { secret: "x" });
    const state = dehydrate(client, { shouldDehydrateQuery: () => true });
    const text = serializeClient({ buster: "v1", timestamp: 1, clientState: state });
    expect(text).not.toContain("secret");
  });
});

describe("restauração: envelope, buster e validade", () => {
  const save = async (storage: MemoryStorage, buster: string, timestamp?: number) => {
    const persister = createQueryPersister(storage);
    vi.useFakeTimers();
    await persistQueryClientSave({
      queryClient: seedClient(),
      persister,
      buster,
      dehydrateOptions: { shouldDehydrateQuery: shouldDehydratePublicQuery },
    });
    await vi.advanceTimersByTimeAsync(1500);
    vi.useRealTimers();
    if (timestamp !== undefined) {
      const stored = JSON.parse(storage.getItem(PERSIST_KEY) ?? "{}");
      storage.setItem(PERSIST_KEY, JSON.stringify({ ...stored, timestamp }));
    }
  };
  const restore = async (storage: MemoryStorage, buster: string) => {
    const client = new QueryClient();
    await persistQueryClientRestore({
      queryClient: client,
      persister: createQueryPersister(storage),
      buster,
      maxAge: PERSIST_MAX_AGE,
    });
    return client;
  };

  it("cliente salvo e válido volta para o cache", async () => {
    const storage = new MemoryStorage();
    await save(storage, "v1");
    const client = await restore(storage, "v1");
    expect(client.getQueryData(queryKeys.hotels.detail(1))).toEqual({ id: 1, name: "Hotel" });
    expect(client.getQueryData(queryKeys.bookings.detail("abc"))).toBeUndefined();
  });

  it("o storage nunca contém reserva nem dado pessoal", async () => {
    const storage = new MemoryStorage();
    await save(storage, "v1");
    const raw = storage.getItem(PERSIST_KEY) ?? "";
    expect(raw).not.toContain("ana@exemplo.com");
    expect(raw).not.toContain("bookings");
  });

  it("buster de outra versão descarta e remove a chave", async () => {
    const storage = new MemoryStorage();
    await save(storage, "v1");
    const client = await restore(storage, "v2");
    expect(client.getQueryData(queryKeys.hotels.detail(1))).toBeUndefined();
    expect(storage.getItem(PERSIST_KEY)).toBeNull();
  });

  it("cache com mais de 24 h é descartado", async () => {
    const storage = new MemoryStorage();
    await save(storage, "v1", Date.now() - PERSIST_MAX_AGE - 1000);
    const client = await restore(storage, "v1");
    expect(client.getQueryData(queryKeys.hotels.detail(1))).toBeUndefined();
    expect(storage.getItem(PERSIST_KEY)).toBeNull();
  });

  it.each([
    ["JSON corrompido", "{nao-e-json"],
    ["tipo errado", JSON.stringify([1, 2, 3])],
    ["sem clientState", JSON.stringify({ timestamp: Date.now(), buster: "v1" })],
    [
      "chave de consulta que não é array",
      JSON.stringify({
        timestamp: Date.now(),
        buster: "v1",
        clientState: {
          mutations: [],
          queries: [{ queryKey: "hotels", queryHash: "x", state: {} }],
        },
      }),
    ],
  ])("%s sobe sem erro, sem dados, e limpa a chave", async (_name, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(PERSIST_KEY, raw);
    const client = await restore(storage, "v1");
    expect(client.getQueryCache().getAll()).toEqual([]);
    expect(storage.getItem(PERSIST_KEY)).toBeNull();
  });
});

describe("deserializeClient e persister sem storage", () => {
  it("devolve cliente vazio e expirado para entrada inválida", () => {
    expect(deserializeClient("lixo")).toMatchObject({ timestamp: 0, buster: "" });
    expect(deserializeClient("null")).toMatchObject({ timestamp: 0 });
  });

  it("no servidor (sem storage) o persister não faz nada", async () => {
    const persister = createQueryPersister(undefined);
    expect(await persister.restoreClient()).toBeUndefined();
    expect(await persister.removeClient()).toBeUndefined();
  });

  it("storage cheio ou bloqueado não derruba o app", async () => {
    const storage = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    vi.useFakeTimers();
    await expect(
      persistQueryClientSave({
        queryClient: seedClient(),
        persister: createQueryPersister(storage),
        buster: "v1",
      }),
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(1500);
    vi.useRealTimers();
  });
});
