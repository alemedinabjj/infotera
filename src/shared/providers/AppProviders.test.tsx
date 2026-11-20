import { useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSIST_KEY, PERSIST_MAX_AGE } from "../api/persist";
import { getQueryClient } from "../api/query-client";
import { queryKeys } from "../api/query-keys";
import { APP_VERSION } from "../lib/app-version";
import { useBookingDraft } from "../stores/booking-draft";
import { makeHotel } from "../testing/fixtures";
import { AppProviders } from "./AppProviders";

const Probe = () => {
  const client = useQueryClient();
  return (
    <p>{client.getDefaultOptions().queries?.staleTime === 60_000 ? "client ok" : "client?"}</p>
  );
};

describe("AppProviders", () => {
  it("disponibiliza o QueryClient e monta as regiões do Toaster", () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText("client ok")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("reidrata o rascunho no mount", () => {
    window.sessionStorage.setItem(
      "infotera:booking-draft",
      JSON.stringify({ state: { selection: null }, version: 1 }),
    );
    render(<AppProviders>{null}</AppProviders>);
    expect(useBookingDraft.persist.hasHydrated()).toBe(true);
  });
});

const HOTEL = makeHotel({ id: 1, name: "Hotel Restaurado" });

const savedClient = (overrides: { buster?: string; timestamp?: number; key?: unknown[] } = {}) =>
  JSON.stringify({
    timestamp: overrides.timestamp ?? Date.now(),
    buster: overrides.buster ?? APP_VERSION,
    clientState: {
      mutations: [],
      queries: [
        {
          queryKey: overrides.key ?? queryKeys.hotels.detail(1),
          queryHash: JSON.stringify(overrides.key ?? queryKeys.hotels.detail(1)),
          state: {
            data: HOTEL,
            dataUpdateCount: 1,
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: "success",
            fetchStatus: "idle",
          },
        },
      ],
    },
  });

const HotelProbe = ({ fetcher }: { fetcher: () => Promise<typeof HOTEL> }) => {
  const query = useQuery({
    queryKey: queryKeys.hotels.detail(1),
    queryFn: fetcher,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return <p>{query.data ? query.data.name : "sem dado"}</p>;
};

describe("AppProviders: cache público persistido", () => {
  beforeEach(() => {
    getQueryClient().clear();
    window.localStorage.clear();
  });

  it("restaura do storage sem pedir de novo", async () => {
    window.localStorage.setItem(PERSIST_KEY, savedClient());
    const fetcher = vi.fn(async () => HOTEL);
    render(
      <AppProviders>
        <HotelProbe fetcher={fetcher} />
      </AppProviders>,
    );
    expect(await screen.findByText("Hotel Restaurado")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["buster de outra versão", savedClient({ buster: "0.0.0+antigo" })],
    ["cache com mais de 24 h", savedClient({ timestamp: Date.now() - PERSIST_MAX_AGE - 5000 })],
    ["JSON corrompido", "{quebrado"],
    ["raiz fora da allowlist restaurada", savedClient({ key: ["bookings", "detail", "x"] })],
  ])("%s: o app sobe e a consulta busca normalmente", async (_name, raw) => {
    window.localStorage.setItem(PERSIST_KEY, raw);
    const fetcher = vi.fn(async () => HOTEL);
    render(
      <AppProviders>
        <HotelProbe fetcher={fetcher} />
      </AppProviders>,
    );
    expect(await screen.findByText("Hotel Restaurado")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("grava consultas públicas e nunca a reserva", async () => {
    const client = getQueryClient();
    render(<AppProviders>{null}</AppProviders>);
    // Depois da restauração o provider passa a assinar o cache.
    await waitFor(() => expect(window.localStorage.getItem(PERSIST_KEY)).toBeNull());
    client.setQueryData(queryKeys.hotels.detail(7), { id: 7 });
    client.setQueryData(queryKeys.bookings.detail("abc"), { holder: { email: "ana@exemplo.com" } });
    await waitFor(() => expect(window.localStorage.getItem(PERSIST_KEY)).not.toBeNull(), {
      timeout: 4000,
    });
    const raw = window.localStorage.getItem(PERSIST_KEY) ?? "";
    expect(raw).toContain('"hotels"');
    expect(raw).not.toContain("bookings");
    expect(raw).not.toContain("ana@exemplo.com");
  });

  it("grava o que já estava no cache antes da restauração (hidratação do servidor)", async () => {
    // O servidor pré-busca hotel e avaliações: o `HydrationBoundary` coloca as consultas no cache
    // no 1º render, antes de o provider assinar o cache. Sem evento depois, nada seria gravado.
    const client = getQueryClient();
    client.setQueryData(queryKeys.hotels.detail(5), makeHotel({ id: 5 }));
    client.setQueryData(queryKeys.reviews.byHotel(5, 1), { items: [], total: 0 });
    render(<AppProviders>{null}</AppProviders>);
    await waitFor(() => expect(window.localStorage.getItem(PERSIST_KEY)).not.toBeNull(), {
      timeout: 4000,
    });
    const raw = window.localStorage.getItem(PERSIST_KEY) ?? "";
    expect(raw).toContain('"hotels"');
    expect(raw).toContain('"reviews"');
  });

  it("o client do navegador mantém a consulta 24 h na memória (gcTime)", () => {
    expect(getQueryClient().getDefaultOptions().queries?.gcTime).toBe(PERSIST_MAX_AGE);
  });
});
