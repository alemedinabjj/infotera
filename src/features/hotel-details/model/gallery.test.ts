import { describe, expect, it } from "vitest";
import {
  GALLERY_PREVIEW_COUNT,
  galleryNavigation,
  galleryPreview,
  mainPhotoSpan,
  photoAlt,
  photoCounter,
  photoOpenLabel,
  thumbPlacement,
} from "./gallery";

describe("galleryNavigation", () => {
  it("next dá a volta no fim e prev no início", () => {
    expect(galleryNavigation(0, 5, "next")).toBe(1);
    expect(galleryNavigation(4, 5, "next")).toBe(0);
    expect(galleryNavigation(0, 5, "prev")).toBe(4);
    expect(galleryNavigation(3, 5, "prev")).toBe(2);
  });

  it("first e last vão às pontas", () => {
    expect(galleryNavigation(2, 5, "first")).toBe(0);
    expect(galleryNavigation(2, 5, "last")).toBe(4);
  });

  it("com 1 foto fica sempre nela; sem fotos devolve 0", () => {
    expect(galleryNavigation(0, 1, "next")).toBe(0);
    expect(galleryNavigation(0, 1, "prev")).toBe(0);
    expect(galleryNavigation(0, 0, "last")).toBe(0);
  });
});

describe("textos", () => {
  it("alt, rótulo do botão e contador (índice base 0)", () => {
    expect(photoAlt("Hotel X", 1, 5)).toBe("Hotel X, foto 2 de 5");
    expect(photoOpenLabel(1, 5)).toBe("Abrir foto 2 de 5");
    expect(photoCounter(1, 5)).toBe("Foto 2 de 5");
  });
});

describe("galleryPreview e grade", () => {
  it.each([
    [0, [], 0],
    [1, [], 0],
    [2, [1], 0],
    [3, [1, 2], 0],
    [5, [1, 2, 3, 4], 0],
    [8, [1, 2, 3, 4], 3],
  ])("%i fotos", (total, thumbs, hidden) => {
    expect(galleryPreview(total)).toEqual({ thumbs, hiddenCount: hidden });
    expect(GALLERY_PREVIEW_COUNT).toBe(5);
  });

  it("a grade nunca deixa buraco: cada total de miniaturas ocupa as 8 células", () => {
    // células ocupadas por miniaturas = 4 colunas×2 linhas − 4 da principal (2×2) = 4
    expect(mainPhotoSpan(0)).toBe("col-span-4 row-span-2");
    expect(mainPhotoSpan(3)).toBe("col-span-2 row-span-2");
    expect(thumbPlacement(1, 0)).toBe("col-span-2 row-span-2");
    expect(thumbPlacement(2, 0)).toContain("row-span-2");
    expect(thumbPlacement(2, 1)).toContain("row-span-2");
    expect(thumbPlacement(3, 0)).toBe("col-start-3 row-start-1");
    expect(thumbPlacement(3, 1)).toBe("col-start-3 row-start-2");
    expect(thumbPlacement(3, 2)).toContain("row-span-2");
    expect(thumbPlacement(4, 2)).toBe("");
    expect(thumbPlacement(0, 0)).toBe("");
  });
});
