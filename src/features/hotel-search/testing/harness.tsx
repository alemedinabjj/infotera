import { vi } from "vitest";
import type { Hotel } from "@/shared/api/schemas";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { HotelSearchResults } from "../components/HotelSearchResults";

/** Utilitários dos testes de componente de `/search` (feed, distância): destino, API stubada e render. */
export const RIO = "Rio de Janeiro, RJ";
export const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";
export const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });

/** 14 hotéis em linha (leste-oeste): o centroide fica entre o 7 e o 8. */
export const ALL: Hotel[] = Array.from({ length: 14 }, (_, index) =>
  makeHotel({
    id: index + 1,
    name: `Hotel ${index + 1}`,
    availableRooms: 9,
    latitude: -22.97,
    longitude: -43.2 + (index + 1) * 0.01,
  }),
);

export type Handler = (url: URL) => Response | Promise<Response>;

export const hotelsResponse = (items: Hotel[], total: number): Response =>
  new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Total-Count": String(total) },
  });

/** Responde como a API: com `_page` pagina de 10 em 10 (total no header); sem, devolve tudo. */
export const paged: Handler = (url) => {
  if (!url.searchParams.has("_page")) return hotelsResponse(ALL, ALL.length);
  const page = Number(url.searchParams.get("_page"));
  return hotelsResponse(ALL.slice((page - 1) * 10, page * 10), ALL.length);
};

export const stubApi = (handler: Handler = paged) => {
  const fetchMock = vi.fn(async (input: string) => handler(new URL(input)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

export const requestedUrls = (fetchMock: ReturnType<typeof stubApi>): URL[] =>
  fetchMock.mock.calls.map(([input]) => new URL(input));

export const start = (query = "") => {
  setTestUrl(`/search?${CRITERIA}${query}`);
  return renderWithProviders(<HotelSearchResults destination={RIO} criteria={criteria} />);
};
