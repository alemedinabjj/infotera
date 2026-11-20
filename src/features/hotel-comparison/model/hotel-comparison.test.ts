import { describe, expect, it } from "vitest";
import { makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { buildHotelComparison } from "./hotel-comparison";

const seedRows = () => {
  const hotels = [seedHotel(1), seedHotel(4), seedHotel(11)];
  const rooms = [...seedRooms(1), ...seedRooms(4), ...seedRooms(11)];
  return buildHotelComparison(hotels, rooms, "pt-BR");
};

const row = (rows: ReturnType<typeof buildHotelComparison>["rows"], key: string) => {
  const found = rows.find((item) => item.key === key);
  if (!found) throw new Error(`linha ${key} ausente`);
  return found;
};

describe("buildHotelComparison (seed 1, 4 e 11)", () => {
  it("o preço vem dos quartos: hotel 1 = R$ 800 e hotel 4 = R$ 720 (não os do hotel)", () => {
    const { rows } = seedRows();
    const price = row(rows, "price");
    expect(price.cells[0]).toContain("R$");
    expect(price.cells[0]).toMatch(/a partir de R\$\s800/);
    expect(price.cells[1]).toMatch(/a partir de R\$\s720/);
  });

  it("menor preço e melhor nota ganham o selo na coluna certa", () => {
    const { rows } = seedRows();
    expect(row(rows, "price").best).toEqual([1]);
    expect(row(rows, "price").bestLabel).toBe("Menor preço");
    expect(row(rows, "rating").bestLabel).toBe("Melhor nota");
    expect(row(rows, "rating").best?.length).toBe(1);
  });

  it("tem as linhas fixas e comodidades como Sim/Não na ordem do enum", () => {
    const { rows } = seedRows();
    const keys = rows.map((item) => item.key);
    expect(keys.slice(0, 11)).toEqual([
      "price",
      "rating",
      "reviews",
      "type",
      "destination",
      "cancellation",
      "check-in",
      "check-out",
      "availability",
      "room-types",
      "guests",
    ]);
    const amenity = rows.find((item) => item.kind === "boolean");
    expect(amenity?.cells.every((cell) => cell === "yes" || cell === "no")).toBe(true);
  });

  it("differs reflete diferença real", () => {
    const { rows } = seedRows();
    expect(row(rows, "destination").differs).toBe(
      new Set(seedRows().hotels.map((hotel) => hotel.destination)).size > 1,
    );
  });
});

describe("buildHotelComparison: casos de borda", () => {
  const a = makeHotel({ id: 1, rating: 4.5, pricePerNight: 500 });
  const b = makeHotel({ id: 2, rating: 4.5, pricePerNight: 500 });

  it("empate total: nenhum selo", () => {
    const { rows } = buildHotelComparison(
      [a, b],
      [
        makeRoom({ id: 1, hotelId: 1, pricePerNight: 300 }),
        makeRoom({ id: 2, hotelId: 2, pricePerNight: 300 }),
      ],
      "pt-BR",
    );
    expect(row(rows, "price").best).toEqual([]);
    expect(row(rows, "rating").best).toEqual([]);
  });

  it("hotel sem quartos usa o preço do hotel", () => {
    const { rows } = buildHotelComparison(
      [a, b],
      [makeRoom({ id: 2, hotelId: 2, pricePerNight: 300 })],
      "pt-BR",
    );
    expect(row(rows, "price").cells[0]).toMatch(/R\$\s500/);
    expect(row(rows, "room-types").cells[0]).toBe("—");
  });

  it("todos os quartos esgotados: nota Esgotado e fora do selo de menor preço", () => {
    const { rows } = buildHotelComparison(
      [a, b],
      [
        makeRoom({ id: 1, hotelId: 1, pricePerNight: 100, available: 0 }),
        makeRoom({ id: 2, hotelId: 2, pricePerNight: 300, available: 2 }),
      ],
      "pt-BR",
    );
    expect(row(rows, "price").cells[0]).toContain("Esgotado");
    expect(row(rows, "price").best).toEqual([]);
  });
});
