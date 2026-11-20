import { describe, expect, it } from "vitest";
import { helpfulLabel, initials, reviewsRangeLabel } from "./reviews";

describe("reviewsRangeLabel", () => {
  it("faixa da página quando há mais de uma", () => {
    expect(reviewsRangeLabel(1, 14, 5)).toBe("Mostrando 1–5 de 14 comentários");
    expect(reviewsRangeLabel(2, 14, 5)).toBe("Mostrando 6–10 de 14 comentários");
    expect(reviewsRangeLabel(3, 14, 5)).toBe("Mostrando 11–14 de 14 comentários");
  });

  it("uma página só: só a contagem", () => {
    expect(reviewsRangeLabel(1, 3, 5)).toBe("3 comentários");
    expect(reviewsRangeLabel(1, 5, 5)).toBe("5 comentários");
    expect(reviewsRangeLabel(1, 1, 5)).toBe("1 comentário");
  });
});

describe("helpfulLabel", () => {
  it("plural, singular e omitido", () => {
    expect(helpfulLabel(42)).toBe("42 pessoas acharam útil");
    expect(helpfulLabel(1)).toBe("1 pessoa achou útil");
    expect(helpfulLabel(0)).toBeNull();
  });
});

describe("initials", () => {
  it("primeiro e último nome, em maiúsculas", () => {
    expect(initials("Maria Silva")).toBe("MS");
    expect(initials("ana maria de souza")).toBe("AS");
  });

  it("nome único, espaços e vazio", () => {
    expect(initials("Cher")).toBe("C");
    expect(initials("  joão  ")).toBe("J");
    expect(initials("")).toBe("");
  });
});
