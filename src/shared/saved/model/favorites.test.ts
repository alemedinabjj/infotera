import { describe, expect, it } from "vitest";
import {
  FAVORITES_LIMIT,
  type FavoriteEntry,
  restoreFavorite,
  sanitizeFavorites,
  toggleFavorite,
} from "./favorites";

const NOW = new Date("2026-11-19T12:00:00.000Z");
const entry = (id: number, addedAt = "2026-11-01T10:00:00.000Z"): FavoriteEntry => ({
  id,
  addedAt,
});

describe("toggleFavorite", () => {
  it("adiciona no topo com a data de agora", () => {
    const { list, result } = toggleFavorite([entry(1)], 2, NOW);
    expect(result).toBe("added");
    expect(list.map((item) => item.id)).toEqual([2, 1]);
    expect(list[0]?.addedAt).toBe(NOW.toISOString());
  });

  it("remove quando já existe", () => {
    const { list, result } = toggleFavorite([entry(1), entry(2)], 1, NOW);
    expect(result).toBe("removed");
    expect(list.map((item) => item.id)).toEqual([2]);
  });

  it("recusa o 101º favorito sem mudar a lista", () => {
    const full = Array.from({ length: FAVORITES_LIMIT }, (_, index) => entry(index + 1));
    const { list, result } = toggleFavorite(full, 999, NOW);
    expect(result).toBe("limit");
    expect(list).toHaveLength(FAVORITES_LIMIT);
    expect(list.some((item) => item.id === 999)).toBe(false);
  });

  it("no teto ainda deixa remover", () => {
    const full = Array.from({ length: FAVORITES_LIMIT }, (_, index) => entry(index + 1));
    expect(toggleFavorite(full, 5, NOW).result).toBe("removed");
  });
});

describe("restoreFavorite", () => {
  it("volta com o addedAt original, na posição por data", () => {
    const list = [entry(3, "2026-11-03T00:00:00.000Z"), entry(1, "2026-11-01T00:00:00.000Z")];
    const restored = restoreFavorite(list, entry(2, "2026-11-02T00:00:00.000Z"));
    expect(restored.map((item) => item.id)).toEqual([3, 2, 1]);
    expect(restored[1]?.addedAt).toBe("2026-11-02T00:00:00.000Z");
  });

  it("não duplica", () => {
    expect(restoreFavorite([entry(1)], entry(1))).toHaveLength(1);
  });
});

describe("sanitizeFavorites", () => {
  it.each([null, undefined, "x", 4, {}])("%s vira lista vazia", (raw) => {
    expect(sanitizeFavorites(raw)).toEqual([]);
  });

  it("descarta só o item inválido e mantém os válidos", () => {
    const raw = [
      entry(1),
      { id: -3, addedAt: "2026-11-01T10:00:00.000Z" },
      { id: 2, addedAt: "ontem" },
      { id: 1.5, addedAt: "2026-11-01T10:00:00.000Z" },
      "lixo",
      null,
      entry(4),
    ];
    expect(sanitizeFavorites(raw).map((item) => item.id)).toEqual([1, 4]);
  });

  it("deduplica por id e ordena do mais recente para o mais antigo", () => {
    const raw = [
      entry(1, "2026-11-01T00:00:00.000Z"),
      entry(2, "2026-11-05T00:00:00.000Z"),
      entry(1, "2026-11-09T00:00:00.000Z"),
    ];
    expect(sanitizeFavorites(raw).map((item) => item.id)).toEqual([2, 1]);
  });

  it("corta em 100 itens", () => {
    const raw = Array.from({ length: 150 }, (_, index) => entry(index + 1));
    expect(sanitizeFavorites(raw)).toHaveLength(FAVORITES_LIMIT);
  });
});
