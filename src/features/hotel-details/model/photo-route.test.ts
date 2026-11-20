import { describe, expect, it } from "vitest";
import { parsePhotoParam, photoHref, photoIndexFromPath, photoPageTitle } from "./photo-route";

describe("parsePhotoParam", () => {
  it.each([
    ["1", 5, 0],
    ["5", 5, 4],
    ["3", 5, 2],
    ["100", 120, 99],
  ])("aceita %s de %i (índice %i)", (raw, total, index) => {
    expect(parsePhotoParam(raw, total)).toBe(index);
  });

  it.each([
    ["0", 5],
    ["6", 5],
    ["01", 5],
    ["1.5", 5],
    ["abc", 5],
    ["", 5],
    ["-1", 5],
    ["1e1", 5],
    ["1234", 5000],
    [" 1", 5],
    ["1", 0],
  ])("rejeita %j com total %i", (raw, total) => {
    expect(parsePhotoParam(raw, total)).toBeNull();
  });
});

describe("photoHref", () => {
  it("é 1-based e sem prefixo em pt-BR", () => {
    expect(photoHref(1, 2, "pt-BR")).toBe("/hotel/1/photos/3");
  });

  it("ganha /en em en-US", () => {
    expect(photoHref(12, 0, "en-US")).toBe("/en/hotel/12/photos/1");
  });
});

describe("photoPageTitle", () => {
  it("monta o título com o índice 1-based", () => {
    expect(
      photoPageTitle(
        { kind: "photo", hotel: "Hotel Copacabana Palace", index: 2, total: 5 },
        "pt-BR",
      ),
    ).toBe("Foto 3 de 5 · Hotel Copacabana Palace | Infotera Hotéis");
  });

  it("traduz em en-US", () => {
    expect(photoPageTitle({ kind: "photo", hotel: "Hotel X", index: 0, total: 2 }, "en-US")).toBe(
      "Photo 1 of 2 · Hotel X | Infotera Hotéis",
    );
  });

  it("tem título para foto não encontrada", () => {
    expect(photoPageTitle({ kind: "not-found" }, "pt-BR")).toBe(
      "Foto não encontrada | Infotera Hotéis",
    );
    expect(photoPageTitle({ kind: "not-found" }, "en-US")).toBe(
      "Photo not found | Infotera Hotéis",
    );
  });
});

describe("photoIndexFromPath", () => {
  it.each([
    ["/hotel/1/photos/3", 5, 2],
    ["/en/hotel/1/photos/5", 5, 4],
    ["/hotel/1/photos/1/", 5, 0],
  ])("lê a foto de %s (índice %i)", (pathname, total, index) => {
    expect(photoIndexFromPath(pathname, total)).toBe(index);
  });

  it.each([
    ["/hotel/1", 5],
    ["/hotel/1/photos/9", 5],
    ["/hotel/1/photos/abc", 5],
    ["/", 5],
    ["", 5],
  ])("devolve null para %j", (pathname, total) => {
    expect(photoIndexFromPath(pathname, total)).toBeNull();
  });
});
