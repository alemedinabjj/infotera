import { describe, expect, it } from "vitest";
import { makeBooking } from "@/shared/testing/fixtures";
import { describeGuests } from "./guests";

describe("describeGuests", () => {
  it("titular, adulto e criança com o papel", () => {
    const view = describeGuests(makeBooking());
    expect(view.holderEmail).toBe("ana.souza@exemplo.com");
    expect(view.lines.map((line) => [line.name, line.roleLabel])).toEqual([
      ["Ana Souza", "titular"],
      ["Bruno Souza", "adulto"],
      ["Clara Souza", "criança"],
    ]);
  });

  it("a saída nunca leva idade nem telefone", () => {
    const text = JSON.stringify(describeGuests(makeBooking()));
    expect(text).not.toContain("98765");
    expect(text).not.toContain('"age"');
    expect(text).not.toContain('"phone"');
  });

  it("formato do README (guests vazio): sem titular e sem e-mail", () => {
    expect(describeGuests(makeBooking({ guests: [] }))).toEqual({ holderEmail: null, lines: [] });
  });

  it("acompanhante sem tipo conta como adulto", () => {
    const booking = makeBooking({
      guests: [
        { firstName: "Ana", lastName: "Souza" },
        { firstName: "Bruno", lastName: "Souza" },
      ],
    });
    expect(describeGuests(booking).lines.map((line) => line.role)).toEqual(["holder", "adult"]);
    expect(describeGuests(booking).holderEmail).toBeNull();
  });

  it("nomes repetidos têm keys distintas e estáveis", () => {
    const twin = { firstName: "Bia", lastName: "Lima", kind: "adult" as const };
    const view = describeGuests(
      makeBooking({ guests: [{ firstName: "Ana", lastName: "Souza" }, twin, twin] }),
    );
    expect(new Set(view.lines.map((line) => line.key)).size).toBe(3);
    expect(
      describeGuests(
        makeBooking({ guests: [{ firstName: "Ana", lastName: "Souza" }, twin, twin] }),
      ).lines.map((l) => l.key),
    ).toEqual(view.lines.map((l) => l.key));
  });

  it("e-mail vazio não vira frase", () => {
    const booking = makeBooking({ guests: [{ firstName: "Ana", lastName: "Souza", email: "" }] });
    expect(describeGuests(booking).holderEmail).toBeNull();
  });
});
