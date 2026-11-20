import { describe, expect, it } from "vitest";
import { summarizeErrors } from "./error-summary";

describe("summarizeErrors", () => {
  it("sem erros devolve lista vazia", () => {
    expect(summarizeErrors({}, "pt-BR")).toEqual([]);
  });

  it("segue a ordem do DOM e rotula cada campo", () => {
    expect(
      summarizeErrors(
        {
          checkOut: { type: "custom", message: "c" },
          destination: { type: "custom", message: "a" },
          checkIn: { type: "custom", message: "b" },
        },
        "pt-BR",
      ),
    ).toEqual([
      { field: "destination", label: "Destino", message: "a" },
      { field: "checkIn", label: "Check-in", message: "b" },
      { field: "checkOut", label: "Check-out", message: "c" },
    ]);
  });

  it("junta adultos, crianças e quartos em um item Hóspedes que foca adults", () => {
    expect(
      summarizeErrors(
        {
          children: { type: "custom", message: "x" },
          rooms: { type: "custom", message: "y" },
        },
        "pt-BR",
      ),
    ).toEqual([{ field: "adults", label: "Hóspedes", message: "x" }]);
  });
});
