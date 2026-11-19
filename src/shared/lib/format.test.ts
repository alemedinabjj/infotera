import { describe, expect, it } from "vitest";
import { formatGuests, formatRating, pluralize, ratingLabel } from "./format";

describe("pluralize", () => {
  it("trata 0, 1 e n", () => {
    expect(pluralize(1, "noite", "noites")).toBe("1 noite");
    expect(pluralize(0, "noite", "noites")).toBe("0 noites");
    expect(pluralize(2, "noite", "noites")).toBe("2 noites");
  });

  it("separa milhares em pt-BR", () => {
    expect(pluralize(1234, "avaliação", "avaliações")).toBe("1.234 avaliações");
  });
});

describe("formatRating", () => {
  it("usa uma casa e vírgula", () => {
    expect(formatRating(4.5)).toBe("4,5");
    expect(formatRating(4)).toBe("4,0");
    expect(formatRating(4.66)).toBe("4,7");
  });
});

describe("formatGuests", () => {
  it("descreve hóspedes e quartos", () => {
    expect(formatGuests({ adults: 2, children: 1, rooms: 1 })).toBe(
      "2 adultos, 1 criança · 1 quarto",
    );
  });

  it("omite crianças quando zero e pluraliza", () => {
    expect(formatGuests({ adults: 1, children: 0, rooms: 1 })).toBe("1 adulto · 1 quarto");
    expect(formatGuests({ adults: 4, children: 2, rooms: 2 })).toBe(
      "4 adultos, 2 crianças · 2 quartos",
    );
  });
});

describe("ratingLabel", () => {
  it.each([
    [5, "Excelente"],
    [4.5, "Excelente"],
    [4.49, "Muito bom"],
    [4, "Muito bom"],
    [3.99, "Bom"],
    [3.5, "Bom"],
    [3.49, "Regular"],
    [0, "Regular"],
  ])("nota %s é %s", (rating, label) => {
    expect(ratingLabel(rating)).toBe(label);
  });
});
