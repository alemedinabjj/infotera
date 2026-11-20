import { isValidElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HotelNotFound, PhotoNotFoundView, PhotoPage } from "@/features/hotel-details";
import { seedHotel } from "@/shared/testing/seed";
import PhotoRoute, { generateMetadata } from "./page";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const props = (hotelId: string, photo: string) => ({
  params: Promise.resolve({ locale: "pt-BR", hotelId, photo }),
  searchParams: Promise.resolve({}),
});

const stubHotel = (status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => (status === 200 ? json(seedHotel(1)) : json({ error: "x" }, status))),
  );

const typeOf = async (hotelId: string, photo: string) => {
  const element = await PhotoRoute(props(hotelId, photo));
  return isValidElement(element) ? element.type : null;
};

afterEach(() => vi.unstubAllGlobals());

describe("PhotoRoute: 'não encontrado' renderizado no servidor, sem notFound()", () => {
  it("hotel inexistente ou id inválido: 'Hotel não encontrado' da F4", async () => {
    stubHotel(404);
    expect(await typeOf("999", "1")).toBe(HotelNotFound);
    expect(await typeOf("abc", "1")).toBe(HotelNotFound);
  });

  it("foto fora da faixa ou inválida: 'Foto não encontrada' com o hotel", async () => {
    stubHotel();
    for (const photo of ["9", "0", "abc"]) {
      expect(await typeOf("1", photo)).toBe(PhotoNotFoundView);
    }
  });

  it("foto válida: a página cheia", async () => {
    stubHotel();
    expect(await typeOf("1", "2")).toBe(PhotoPage);
  });
});

describe("generateMetadata da foto", () => {
  it("hotel inexistente: título do hotel; foto inválida: título da foto; ambos noindex", async () => {
    stubHotel(404);
    expect(await generateMetadata(props("999", "1"))).toEqual({
      title: "Hotel não encontrado | Infotera Hotéis",
      robots: { index: false },
    });
    stubHotel();
    expect(await generateMetadata(props("1", "9"))).toEqual({
      title: "Foto não encontrada | Infotera Hotéis",
      robots: { index: false },
    });
  });
});
