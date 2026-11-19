import { describe, expect, it } from "vitest";
import { hotelSchema } from "@/shared/api/schemas";
import seed from "../../../../mock-api/db.seed.json";
import {
  computeCentroid,
  distanceKm,
  formatDistanceFromCenter,
  type GeoPoint,
  slicePage,
  sortByDistance,
} from "./distance";

const point = (latitude: number, longitude: number): GeoPoint => ({ latitude, longitude });

describe("distanceKm", () => {
  it("um grau de longitude no equador ~ 111,19 km", () => {
    expect(distanceKm(point(0, 0), point(0, 1))).toBeCloseTo(111.19, 2);
  });

  it("é zero entre pontos iguais e simétrica", () => {
    const a = point(-22.97, -43.18);
    const b = point(-22.9, -43.2);
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });
});

describe("computeCentroid", () => {
  it("é a média aritmética de latitude e longitude", () => {
    expect(computeCentroid([point(0, 0), point(2, 4), point(4, 8)])).toEqual(point(2, 4));
  });

  it("devolve null com menos de 2 pontos", () => {
    expect(computeCentroid([])).toBeNull();
    expect(computeCentroid([point(1, 1)])).toBeNull();
  });
});

describe("sortByDistance", () => {
  const items = [
    { id: 3, ...point(0, 3) },
    { id: 2, ...point(0, 1) },
    { id: 1, ...point(0, -1) },
    { id: 4, ...point(0, 0.5) },
  ];

  it("ordena pelo mais perto e desempata por id", () => {
    expect(sortByDistance(items, point(0, 0)).map((item) => item.id)).toEqual([4, 1, 2, 3]);
  });

  it("sem centro mantém a ordem por id", () => {
    expect(sortByDistance(items, null).map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("não muta a lista original", () => {
    const before = items.map((item) => item.id);
    sortByDistance(items, point(0, 0));
    expect(items.map((item) => item.id)).toEqual(before);
  });
});

describe("formatDistanceFromCenter", () => {
  it.each([
    [0.04, "a menos de 100 m do centro"],
    [0.41, "400 m do centro"],
    [0.48, "500 m do centro"],
    [0.975, "1,0 km do centro"],
    [2.04, "2,0 km do centro"],
    [2.31, "2,3 km do centro"],
    [4.89, "4,9 km do centro"],
    [9.96, "10 km do centro"],
    [20.22, "20 km do centro"],
  ])("%s km -> %s", (km, text) => {
    expect(formatDistanceFromCenter(km)).toBe(text);
  });
});

describe("slicePage", () => {
  const list = [1, 2, 3, 4, 5];

  it("fatia a página", () => {
    expect(slicePage(list, 1, 2)).toEqual([1, 2]);
    expect(slicePage(list, 2, 2)).toEqual([3, 4]);
  });

  it("página parcial e fora do intervalo", () => {
    expect(slicePage(list, 3, 2)).toEqual([5]);
    expect(slicePage(list, 4, 2)).toEqual([]);
  });
});

describe("seed (protege contra mudança de fórmula)", () => {
  const hotels = seed.hotels.map((hotel) => hotelSchema.parse(hotel));
  const byDestination = (destination: string) =>
    hotels.filter((hotel) => hotel.destination === destination);
  const textFor = (destination: string, id: number): string | undefined => {
    const list = byDestination(destination);
    const center = computeCentroid(list);
    const hotel = list.find((item) => item.id === id);
    return center && hotel ? formatDistanceFromCenter(distanceKm(center, hotel)) : undefined;
  };

  it("Rio ordena 18, 13, 11, 15, 12, 1, 16, 7, 9, 19, 14, 10, 2, 17", () => {
    const list = byDestination("Rio de Janeiro, RJ");
    const sorted = sortByDistance(list, computeCentroid(list));
    expect(sorted.map((hotel) => hotel.id)).toEqual([
      18, 13, 11, 15, 12, 1, 16, 7, 9, 19, 14, 10, 2, 17,
    ]);
  });

  it("textos do card", () => {
    expect(textFor("Rio de Janeiro, RJ", 18)).toBe("2,0 km do centro");
    expect(textFor("Rio de Janeiro, RJ", 11)).toBe("2,3 km do centro");
    expect(textFor("Rio de Janeiro, RJ", 17)).toBe("4,9 km do centro");
    expect(textFor("Florianópolis, SC", 4)).toBe("20 km do centro");
    expect(textFor("Gramado, RS", 43)).toBe("500 m do centro");
    expect(textFor("Fernando de Noronha, PE", 47)).toBe("400 m do centro");
  });
});
