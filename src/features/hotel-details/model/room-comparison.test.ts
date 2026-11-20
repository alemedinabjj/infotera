import { describe, expect, it } from "vitest";
import { formatBRL } from "@/shared/lib/currency";
import { makeRoom } from "@/shared/testing/fixtures";
import { seedRooms } from "@/shared/testing/seed";
import {
  buildRoomComparison,
  canCompare,
  comparisonAnnouncement,
  onlyDifferences,
} from "./room-comparison";

describe("buildRoomComparison: hotel 18 (seed)", () => {
  const rooms = seedRooms(18);
  const { rows } = buildRoomComparison(rooms);

  it("tem uma célula por quarto em cada linha", () => {
    expect(rooms).toHaveLength(4);
    for (const row of rows) expect(row.cells).toHaveLength(4);
  });

  it("linhas fixas primeiro e depois as comodidades presentes em algum quarto, na ordem do enum", () => {
    expect(rows.map((row) => row.key)).toEqual([
      "price",
      "size",
      "guests",
      "beds",
      "availability",
      "ocean_view",
      "balcony",
      "terrace",
      "minibar",
      "safe",
      "aircon",
      "desk",
      "kitchen",
      "living_room",
    ]);
  });

  it("valores formatados", () => {
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.price?.cells).toEqual(
      [1000, 800, 900, 880].map((value) => formatBRL(value, { cents: false })),
    );
    expect(byKey.size?.cells).toEqual(["38 m²", "22 m²", "30 m²", "28 m²"]);
    expect(byKey.guests?.cells).toEqual(["Até 3", "Até 2", "Até 3", "Até 2"]);
    expect(byKey.beds?.cells[0]).toBe("1 cama king e 1 sofá-cama");
    expect(byKey.availability?.cells).toEqual([
      "6 disponíveis",
      "4 disponíveis",
      "1 disponível",
      "12 disponíveis",
    ]);
    expect(byKey.kitchen?.cells).toEqual(["no", "yes", "no", "no"]);
    expect(byKey.kitchen?.kind).toBe("boolean");
  });

  it("todas as linhas diferem neste hotel", () => {
    expect(rows.every((row) => row.differs)).toBe(true);
  });
});

describe("differs e onlyDifferences", () => {
  const a = makeRoom({ id: 1, maxGuests: 2, size: 30, amenities: ["aircon", "safe"] });
  const b = makeRoom({ id: 2, maxGuests: 2, size: 45, amenities: ["aircon"] });
  const { rows } = buildRoomComparison([a, b]);

  it("marca só as linhas com valores diferentes", () => {
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.differs]));
    expect(byKey.guests).toBe(false);
    expect(byKey.size).toBe(true);
    expect(byKey.aircon).toBe(false);
    expect(byKey.safe).toBe(true);
  });

  it("onlyDifferences filtra as iguais", () => {
    const filtered = onlyDifferences(rows);
    expect(filtered.every((row) => row.differs)).toBe(true);
    expect(filtered.length).toBeLessThan(rows.length);
    expect(filtered.map((row) => row.key)).toContain("size");
    expect(filtered.map((row) => row.key)).not.toContain("guests");
  });
});

describe("1 quarto", () => {
  it("nenhuma linha difere e a comparação não se aplica", () => {
    const rooms = seedRooms(2);
    expect(rooms).toHaveLength(1);
    const { rows } = buildRoomComparison(rooms);
    expect(onlyDifferences(rows)).toEqual([]);
    expect(canCompare(rooms)).toBe(false);
    expect(canCompare([makeRoom({ id: 1 }), makeRoom({ id: 2 })])).toBe(true);
  });

  it("esgotado e preço com centavos", () => {
    const { rows } = buildRoomComparison([makeRoom({ available: 0, pricePerNight: 99.5 })]);
    expect(rows.find((row) => row.key === "availability")?.cells).toEqual(["Esgotado"]);
    expect(rows.find((row) => row.key === "price")?.cells).toEqual([formatBRL(99.5)]);
  });
});

describe("comparisonAnnouncement", () => {
  it("todas ou parte das características", () => {
    expect(comparisonAnnouncement(12, 12)).toBe("Mostrando todas as 12 características");
    expect(comparisonAnnouncement(6, 12)).toBe("Mostrando 6 de 12 características");
  });
});
