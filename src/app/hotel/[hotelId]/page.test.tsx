import { isValidElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HotelDetailsView } from "@/features/hotel-details";
import { seedHotel } from "@/shared/testing/seed";
import HotelPage, { generateMetadata } from "./page";

vi.mock("next/navigation", async () => ({
  ...(await import("@/shared/testing/next-navigation")).navigationMock,
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  },
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const props = (hotelId: string, search: Record<string, string> = {}) => ({
  params: Promise.resolve({ hotelId }),
  searchParams: Promise.resolve(search),
});

const CRITERIA = {
  destination: "Rio de Janeiro, RJ",
  checkIn: "2099-12-12",
  checkOut: "2099-12-15",
  rooms: "1",
  adults: "2",
  children: "0",
};

afterEach(() => vi.unstubAllGlobals());

describe("HotelPage", () => {
  it("id inválido: notFound sem chamar a API (critério 2)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const id of ["abc", "0", "01", "1.5"]) {
      await expect(HotelPage(props(id))).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("id válido: compõe a view com o id e os critérios da URL", async () => {
    const element = await HotelPage(props("1", CRITERIA));
    expect(isValidElement(element)).toBe(true);
    if (!isValidElement<{ hotelId: number; criteria: unknown }>(element)) return;
    expect(element.type).toBe(HotelDetailsView);
    expect(element.props.hotelId).toBe(1);
    expect(element.props.criteria).toMatchObject({ checkIn: "2099-12-12", adults: 2 });
  });

  it("critérios inválidos ou ausentes viram null (a página pede as datas)", async () => {
    for (const search of [{}, { ...CRITERIA, adults: "x" }]) {
      const element = await HotelPage(props("1", search));
      if (!isValidElement<{ criteria: unknown }>(element)) throw new Error("elemento esperado");
      expect(element.props.criteria).toBeNull();
    }
  });
});

describe("generateMetadata (critérios 1 e 2)", () => {
  it("título com o nome do hotel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(seedHotel(1))),
    );
    expect(await generateMetadata(props("1"))).toEqual({
      title: "Hotel Copacabana Palace | Infotera Hotéis",
    });
  });

  it("id inválido e 404: 'Hotel não encontrado'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Not Found" }, 404)),
    );
    const expected = { title: "Hotel não encontrado | Infotera Hotéis" };
    expect(await generateMetadata(props("abc"))).toEqual(expected);
    expect(await generateMetadata(props("999"))).toEqual(expected);
  });

  it("erro da API: título padrão, sem derrubar a página", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "x" }, 500)),
    );
    expect(await generateMetadata(props("1"))).toEqual({ title: "Hotel | Infotera Hotéis" });
  });
});
