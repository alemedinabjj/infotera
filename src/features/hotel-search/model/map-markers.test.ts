import { describe, expect, it } from "vitest";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { enUS } from "../i18n/en-US";
import { ptBR } from "../i18n/pt-BR";
import { buildMapMarkers, hotelIdOfMarker, markerIdOf } from "./map-markers";

const NO_ROOMS = new Map();
const criteria = makeSearchCriteria();

const build = (items: Parameters<typeof buildMapMarkers>[0]["items"], locale = "pt-BR" as const) =>
  buildMapMarkers({
    items,
    criteria,
    roomsById: NO_ROOMS,
    locale,
    messages: ptBR.map,
  });

describe("buildMapMarkers", () => {
  it("um marcador por hotel exibido, na ordem da lista", () => {
    const items = [
      makeHotel({ id: 7, name: "Sete" }),
      makeHotel({ id: 3, name: "Três" }),
      makeHotel({ id: 9, name: "Nove" }),
    ];
    expect(build(items).map((marker) => marker.id)).toEqual(["7", "3", "9"]);
  });

  it("usa a posição do hotel e a pílula de preço compacto (sem centavos) em pt-BR", () => {
    const [marker] = build([makeHotel({ id: 1, pricePerNight: 1200 })]);
    expect(marker).toMatchObject({
      id: "1",
      position: { lat: -22.9683, lng: -43.1792 },
      variant: "pill",
      tone: "default",
    });
    expect(marker?.text.replace(/ /g, " ")).toBe("R$ 1.200");
  });

  it("preço compacto em en-US e nome acessível em inglês", () => {
    const [marker] = buildMapMarkers({
      items: [makeHotel({ id: 1, name: "Copacabana", pricePerNight: 1200 })],
      criteria,
      roomsById: NO_ROOMS,
      locale: "en-US",
      messages: enUS.map,
    });
    expect(marker?.text).toBe("R$1,200");
    expect(marker?.label).toBe("Copacabana, R$1,200 per night");
  });

  it("nome acessível leva o nome e o preço por noite (pt-BR)", () => {
    const [marker] = build([makeHotel({ name: "Hotel X", pricePerNight: 800 })]);
    expect(marker?.label.replace(/ /g, " ")).toBe("Hotel X, R$ 800 por noite");
  });

  it("esgotado mostra o texto, o estilo apagado e o nome acessível de esgotado", () => {
    const [marker] = build([makeHotel({ name: "Hotel Y", availableRooms: 0 })]);
    expect(marker).toMatchObject({ text: "Esgotado", tone: "muted", label: "Hotel Y, esgotado" });
  });

  it("o preço é o do quarto mais barato que serve, igual ao do card", () => {
    const hotel = makeHotel({ id: 5, pricePerNight: 1200 });
    const rooms = [
      makeRoom({ id: 1, hotelId: 5, pricePerNight: 900, maxGuests: 2, available: 3 }),
      makeRoom({ id: 2, hotelId: 5, pricePerNight: 400, maxGuests: 1, available: 3 }),
    ];
    const [marker] = buildMapMarkers({
      items: [hotel],
      criteria,
      roomsById: new Map([[5, rooms]]),
      locale: "pt-BR",
      messages: ptBR.map,
    });
    // 2 adultos: o quarto de 1 hóspede não serve; vale o de R$ 900.
    expect(marker?.text.replace(/ /g, " ")).toBe("R$ 900");
  });

  it("sem hotéis não há marcadores", () => {
    expect(build([])).toEqual([]);
  });
});

describe("ids de marcador", () => {
  it("vai e volta entre id de hotel e id de marcador", () => {
    expect(markerIdOf(42)).toBe("42");
    expect(hotelIdOfMarker("42")).toBe(42);
    expect(hotelIdOfMarker("abc")).toBeNull();
    expect(hotelIdOfMarker("1.5")).toBeNull();
  });
});
