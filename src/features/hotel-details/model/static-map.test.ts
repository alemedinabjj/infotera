import { describe, expect, it } from "vitest";
import { seedHotel } from "@/shared/testing/seed";
import { osmLink, staticMapLayout, tileUrl } from "./static-map";

const hotel = seedHotel(1);
const INPUT = { lat: hotel.latitude, lon: hotel.longitude, zoom: 15, width: 640, height: 320 };

describe("staticMapLayout: hotel 1 (Copacabana, z15)", () => {
  const map = staticMapLayout(INPUT);

  it("cobre o canvas com 3 colunas × 2 linhas de tiles conhecidos", () => {
    // x = (lon+180)/360·2^15 = 12453,73 · y = 18532,98 (Web Mercator, calculado à mão)
    const coordinates = map.tiles.map(({ x, y }) => `${x}/${y}`);
    expect(coordinates).toEqual([
      "12452/18532",
      "12453/18532",
      "12454/18532",
      "12452/18533",
      "12453/18533",
      "12454/18533",
    ]);
    expect(map.tiles.every((tile) => tile.z === 15)).toBe(true);
  });

  it("o marcador fica no centro do canvas (o mapa é centrado no hotel)", () => {
    expect(map.marker.leftPct).toBeCloseTo(50, 6);
    expect(map.marker.topPct).toBeCloseTo(50, 6);
  });

  it("tiles contíguos cobrem 100% do canvas", () => {
    const minLeft = Math.min(...map.tiles.map((tile) => tile.leftPct));
    const minTop = Math.min(...map.tiles.map((tile) => tile.topPct));
    const maxRight = Math.max(...map.tiles.map((tile) => tile.leftPct + tile.sizePct.w));
    const maxBottom = Math.max(...map.tiles.map((tile) => tile.topPct + tile.sizePct.h));
    expect(minLeft).toBeLessThanOrEqual(0);
    expect(minTop).toBeLessThanOrEqual(0);
    expect(maxRight).toBeGreaterThanOrEqual(100);
    expect(maxBottom).toBeGreaterThanOrEqual(100);
    const first = map.tiles[0];
    const second = map.tiles[1];
    expect((first?.leftPct ?? 0) + (first?.sizePct.w ?? 0)).toBeCloseTo(second?.leftPct ?? 0, 6);
    expect(first?.sizePct).toEqual({ w: 40, h: 80 });
  });

  it("o tile do ponto aparece e contém o marcador", () => {
    const own = map.tiles.find((tile) => tile.x === 12453 && tile.y === 18532);
    expect(own).toBeDefined();
    const inside =
      map.marker.leftPct >= (own?.leftPct ?? 0) &&
      map.marker.leftPct <= (own?.leftPct ?? 0) + (own?.sizePct.w ?? 0);
    expect(inside).toBe(true);
  });
});

describe("staticMapLayout: bordas", () => {
  it("em (0, 0) o canvas fica dentro do mundo e o marcador no centro", () => {
    const map = staticMapLayout({ lat: 0, lon: 0, zoom: 1, width: 640, height: 320 });
    expect(map.tiles.every((tile) => tile.x >= 0 && tile.x < 2 && tile.y >= 0 && tile.y < 2)).toBe(
      true,
    );
    expect(map.marker).toEqual({ leftPct: 50, topPct: 50 });
  });

  it("latitude extrema é limitada e a coluna -1 vira a última (mundo se repete)", () => {
    const map = staticMapLayout({ lat: 89, lon: -179.9, zoom: 3, width: 640, height: 320 });
    expect(map.tiles.every((tile) => tile.y >= 0 && tile.y < 8)).toBe(true);
    expect(map.tiles.some((tile) => tile.x === 7)).toBe(true);
  });
});

describe("links", () => {
  it("URL do tile e link do OSM com marcador", () => {
    expect(tileUrl({ z: 15, x: 12453, y: 18532 })).toBe(
      "https://tile.openstreetmap.org/15/12453/18532.png",
    );
    expect(osmLink(-22.9683, -43.1792)).toBe(
      "https://www.openstreetmap.org/?mlat=-22.9683&mlon=-43.1792#map=15/-22.9683/-43.1792",
    );
  });
});
