import { describe, expect, it } from "vitest";
import { boundsOf, FIT_MAX_ZOOM, fitPlan, osmLink } from "./geo";
import { MAX_ZOOM, TILE_ORIGIN, TILE_URL, tileUrl } from "./map-tiles";

const RIO = { lat: -22.9683, lng: -43.1792 };
const SAMPA = { lat: -23.5505, lng: -46.6333 };
const SALVADOR = { lat: -12.9714, lng: -38.5014 };

describe("boundsOf", () => {
  it("sem pontos não há limites", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("um ponto vira um retângulo degenerado", () => {
    expect(boundsOf([RIO])).toEqual({
      south: RIO.lat,
      north: RIO.lat,
      west: RIO.lng,
      east: RIO.lng,
    });
  });

  it("vários pontos: sul/oeste mínimos e norte/leste máximos, em qualquer ordem", () => {
    const expected = {
      south: SAMPA.lat,
      north: SALVADOR.lat,
      west: SAMPA.lng,
      east: SALVADOR.lng,
    };
    expect(boundsOf([RIO, SAMPA, SALVADOR])).toEqual(expected);
    expect(boundsOf([SALVADOR, RIO, SAMPA])).toEqual(expected);
  });
});

describe("fitPlan", () => {
  it("0 pontos: não mexe", () => {
    expect(fitPlan([])).toEqual({ kind: "none" });
  });

  it("1 ponto: centraliza com o zoom máximo de enquadramento", () => {
    expect(fitPlan([RIO])).toEqual({ kind: "center", center: RIO, zoom: FIT_MAX_ZOOM });
  });

  it("pontos repetidos contam como um lugar só", () => {
    expect(fitPlan([RIO, { ...RIO }])).toEqual({ kind: "center", center: RIO, zoom: 15 });
  });

  it("n pontos: ajusta aos limites", () => {
    expect(fitPlan([RIO, SAMPA])).toEqual({
      kind: "fit",
      bounds: { south: SAMPA.lat, north: RIO.lat, west: SAMPA.lng, east: RIO.lng },
    });
  });
});

describe("osmLink e tiles", () => {
  it("link do OpenStreetMap com marcador", () => {
    expect(osmLink(-22.9683, -43.1792)).toBe(
      "https://www.openstreetmap.org/?mlat=-22.9683&mlon=-43.1792#map=15/-22.9683/-43.1792",
    );
    expect(osmLink(1, 2, 12)).toContain("#map=12/1/2");
  });

  it("a URL dos tiles nasce da origem única", () => {
    expect(TILE_URL).toBe(`${TILE_ORIGIN}/{z}/{x}/{y}.png`);
    expect(tileUrl({ z: 15, x: 12453, y: 18532 })).toBe(
      "https://tile.openstreetmap.org/15/12453/18532.png",
    );
    expect(MAX_ZOOM).toBe(19);
  });
});
