import { describe, expect, it } from "vitest";
import { ageLabel, buildCompanions, type CompanionValues, companionLabel } from "./companions";

const adult = (firstName: string): CompanionValues => ({
  kind: "adult",
  firstName,
  lastName: "",
  age: "",
});
const child = (firstName: string, age = ""): CompanionValues => ({
  kind: "child",
  firstName,
  lastName: "",
  age,
});

describe("buildCompanions", () => {
  it("1 adulto e nenhuma criança não tem acompanhantes", () => {
    expect(buildCompanions({ adults: 1, children: 0 }, [])).toEqual([]);
  });

  it("2 adultos e 1 criança: um adulto e depois a criança", () => {
    expect(buildCompanions({ adults: 2, children: 1 }, []).map((c) => c.kind)).toEqual([
      "adult",
      "child",
    ]);
  });

  it("preserva o que foi digitado por posição dentro de cada tipo", () => {
    const previous = [adult("Bruno"), child("Clara", "7")];
    const next = buildCompanions({ adults: 3, children: 2 }, previous);
    expect(next.map((c) => [c.kind, c.firstName, c.age])).toEqual([
      ["adult", "Bruno", ""],
      ["adult", "", ""],
      ["child", "Clara", "7"],
      ["child", "", ""],
    ]);
  });

  it("diminuir adultos mantém as crianças", () => {
    const previous = [adult("A"), adult("B"), child("C", "3")];
    const next = buildCompanions({ adults: 2, children: 1 }, previous);
    expect(next.map((c) => c.firstName)).toEqual(["A", "C"]);
  });
});

describe("rótulos", () => {
  it("companionLabel numera a partir do hóspede 2", () => {
    expect(companionLabel(0, "adult")).toBe("Hóspede 2 · adulto");
    expect(companionLabel(1, "child")).toBe("Hóspede 3 · criança");
  });

  it("ageLabel", () => {
    expect(ageLabel(0)).toBe("Menos de 1 ano");
    expect(ageLabel(1)).toBe("1 ano");
    expect(ageLabel(7)).toBe("7 anos");
  });
});
