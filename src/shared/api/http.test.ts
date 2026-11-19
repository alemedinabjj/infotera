import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiGet, apiGetPage, apiPost, buildQuery, isApiError } from "./http";
import { hotelSchema } from "./schemas";

const fetchMock = vi.fn<typeof fetch>();

const useFetch = (impl: () => Promise<Response>) => {
  fetchMock.mockImplementation(impl);
  vi.stubGlobal("fetch", fetchMock);
};

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const hotel = {
  id: 1,
  name: "Hotel",
  slug: "hotel",
  destination: "Rio de Janeiro, RJ",
  description: "d",
  rating: 4.5,
  reviewCount: 10,
  pricePerNight: 100,
  currency: "BRL",
  propertyType: "hotel",
  address: "a",
  latitude: 1,
  longitude: 2,
  images: ["https://example.com/a.jpg"],
  thumbnail: "https://example.com/t.jpg",
  amenities: ["wifi"],
  checkInTime: "14:00",
  checkOutTime: "12:00",
  cancellationPolicy: "free",
  availableRooms: 3,
  featured: false,
};

const catchError = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("esperava rejeição");
};

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("buildQuery", () => {
  it("repete chaves de array e omite vazios", () => {
    const query = buildQuery({
      propertyType: ["hotel", "pousada"],
      rating_gte: 4,
      q: "",
      x: undefined,
      y: null,
      featured: false,
    });
    expect(query.toString()).toBe(
      "propertyType=hotel&propertyType=pousada&rating_gte=4&featured=false",
    );
  });
});

describe("apiGet", () => {
  it("chama a URL base + path e devolve o objeto tipado", async () => {
    useFetch(async () => json(hotel));
    const result = await apiGet("/hotels/1", hotelSchema);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/hotels/1", expect.any(Object));
    expect(result.name).toBe("Hotel");
  });

  it("anexa a query string", async () => {
    useFetch(async () => json({}));
    await apiGet("/x", z.object({}), { query: { a: [1, 2], b: "c" } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/x?a=1&a=2&b=c");
  });

  it("404 vira ApiError http com isNotFound", async () => {
    useFetch(async () => json({}, { status: 404 }));
    const error = await catchError(apiGet("/hotels/999", hotelSchema));
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ kind: "http", status: 404 });
    expect(error instanceof ApiError && error.isNotFound()).toBe(true);
  });

  it("500 com corpo { error } mantém o status", async () => {
    useFetch(async () => json({ error: "Falha simulada pela mock API" }, { status: 500 }));
    const error = await catchError(apiGet("/hotels", hotelSchema));
    expect(error).toMatchObject({ kind: "http", status: 500 });
  });

  it("fetch rejeitando TypeError vira network", async () => {
    useFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await catchError(apiGet("/hotels/1", hotelSchema))).toMatchObject({
      kind: "network",
      status: null,
    });
  });

  it("corpo fora do schema vira parse", async () => {
    useFetch(async () => json({ id: "nope" }));
    expect(await catchError(apiGet("/hotels/1", hotelSchema))).toMatchObject({ kind: "parse" });
  });

  it("JSON inválido vira parse", async () => {
    useFetch(async () => new Response("<html>", { status: 200 }));
    expect(await catchError(apiGet("/hotels/1", hotelSchema))).toMatchObject({ kind: "parse" });
  });

  it("timeout vira timeout", async () => {
    useFetch(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    expect(await catchError(apiGet("/hotels/1", hotelSchema))).toMatchObject({
      kind: "timeout",
      status: null,
    });
  });

  it("abort do chamador é relançado como o AbortError original", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("aborted", "AbortError");
    useFetch(async () => {
      controller.abort();
      throw abortError;
    });
    const error = await catchError(apiGet("/hotels/1", hotelSchema, { signal: controller.signal }));
    expect(error).toBe(abortError);
    expect(isApiError(error)).toBe(false);
  });
});

describe("apiGetPage", () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ ...hotel, id: index + 1 }));

  it("lê X-Total-Count", async () => {
    useFetch(async () => json(items, { headers: { "X-Total-Count": "14" } }));
    const page = await apiGetPage("/hotels", hotelSchema);
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(14);
  });

  it.each([[undefined], ["abc"], ["-3"]])(
    "sem header válido (%s) usa items.length",
    async (value) => {
      const headers: Record<string, string> = value === undefined ? {} : { "X-Total-Count": value };
      useFetch(async () => json(items, { headers }));
      expect((await apiGetPage("/hotels", hotelSchema)).total).toBe(10);
    },
  );
});

describe("apiPost", () => {
  it("envia JSON e valida a resposta", async () => {
    useFetch(async () => json({ id: 5 }, { status: 201 }));
    const result = await apiPost("/bookings", { a: 1 }, z.object({ id: z.number() }));
    expect(result).toEqual({ id: 5 });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://api.test/bookings");
    expect(init).toMatchObject({ method: "POST", body: '{"a":1}' });
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });
});
