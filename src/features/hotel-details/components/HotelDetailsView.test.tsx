import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hotelQueryOptions, hotelRoomsQueryOptions } from "@/shared/api/queries";
import { makeReview, makeSearchCriteria } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { reviewsQueryOptions } from "../api/reviews";
import { HotelDetailsView } from "./HotelDetailsView";

vi.mock("next/navigation", async () => ({
  ...(await import("@/shared/testing/next-navigation")).navigationMock,
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  },
}));
// O RSC assíncrono dos similares tem teste próprio; aqui só importa a ordem das seções.
vi.mock("./SimilarHotels", () => ({ SimilarHotels: () => <p>similares</p> }));

type Deferred = { resolve: (response: Response) => void };

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });

const stubApi = () => {
  const hotel: Deferred = { resolve: () => undefined };
  const fetchMock = vi.fn((url: string) => {
    const path = new URL(url).pathname;
    if (path === "/hotels/1") {
      return new Promise<Response>((resolve) => {
        hotel.resolve = resolve;
      });
    }
    if (path === "/rooms") return Promise.resolve(json(seedRooms(1)));
    if (path === "/reviews") {
      return Promise.resolve(json([makeReview()], { "X-Total-Count": "1" }));
    }
    return Promise.resolve(new Response("{}", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, hotel };
};

const urls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map((call) => new URL(String(call[0])));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HotelDetailsView: fetch paralelo (critério 5)", () => {
  it("hotel, quartos e a 1ª página de avaliações saem juntos, antes de o hotel resolver", async () => {
    const { fetchMock, hotel } = stubApi();
    const rendering = HotelDetailsView({ hotelId: 1, criteria: null, datesForm: <p>form</p> });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const started = urls(fetchMock);
    expect(started.map((url) => url.pathname).sort()).toEqual(["/hotels/1", "/reviews", "/rooms"]);
    const reviews = started.find((url) => url.pathname === "/reviews");
    expect(reviews?.searchParams.get("_page")).toBe("1");
    expect(reviews?.searchParams.get("hotelId")).toBe("1");
    expect(started.find((url) => url.pathname === "/rooms")?.searchParams.get("hotelId")).toBe("1");

    hotel.resolve(json(seedHotel(1)));
    await rendering;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("hotel 404 vira notFound()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        new URL(url).pathname === "/hotels/999"
          ? new Response('{"error":"Not Found"}', { status: 404 })
          : json([]),
      ),
    );
    await expect(
      HotelDetailsView({ hotelId: 999, criteria: null, datesForm: null }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("erro do hotel é relançado (error.tsx da rota)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    await expect(
      HotelDetailsView({ hotelId: 1, criteria: null, datesForm: null }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("HotelDetailsView: composição", () => {
  const renderView = async (criteria: ReturnType<typeof makeSearchCriteria> | null) => {
    const { hotel } = stubApi();
    const rendering = HotelDetailsView({
      hotelId: 1,
      criteria,
      datesForm: <p>formulário de datas</p>,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    hotel.resolve(json(seedHotel(1)));
    const view = await rendering;
    const queryClient = makeTestQueryClient();
    return {
      queryClient,
      ...render(<QueryClientProvider client={queryClient}>{view}</QueryClientProvider>),
    };
  };

  it("um h1, sem <main>, e as 6 seções na ordem da página", async () => {
    const { container } = await renderView(null);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hotel Copacabana Palace");
    expect(container.querySelector("main")).toBeNull();
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(h2).toEqual([
      "Visão geral",
      "Quartos",
      "Localização",
      "Políticas",
      "Avaliações",
      "Hotéis similares em Rio de Janeiro, RJ",
    ]);
    const ids = [...container.querySelectorAll("section[id]")].map((section) => section.id);
    expect(ids).toEqual([
      "visao-geral",
      "quartos",
      "localizacao",
      "politicas",
      "avaliacoes",
      "similares",
    ]);
  });

  it("sem critérios: aviso e formulário de datas no slot; com critérios: resumo da estadia", async () => {
    const without = await renderView(null);
    expect(screen.getByText("Escolha as datas para reservar")).toBeInTheDocument();
    expect(screen.getByText("formulário de datas")).toBeInTheDocument();
    without.unmount();

    await renderView(makeSearchCriteria({ checkIn: "2099-12-12", checkOut: "2099-12-15" }));
    expect(screen.getAllByText(/3 noites · 2 adultos · 1 quarto/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Alterar datas e hóspedes" })).toBeInTheDocument();
  });

  it("o hotel e as consultas pendentes vão para o cache do cliente (hidratação)", async () => {
    const { queryClient } = await renderView(null);
    expect(queryClient.getQueryData(hotelQueryOptions(1).queryKey)).toMatchObject({ id: 1 });
    expect(queryClient.getQueryState(hotelRoomsQueryOptions(1).queryKey)).toBeDefined();
    expect(queryClient.getQueryState(reviewsQueryOptions(1, 1).queryKey)).toBeDefined();
  });
});
