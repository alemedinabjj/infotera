import { describe, expect, it } from "vitest";
import { termsSections } from "./terms";

describe("termsSections", () => {
  it("tem as 5 seções na ordem e usa horários e política do hotel", () => {
    const sections = termsSections(
      { policy: "free", checkInTime: "14:00", checkOutTime: "11:00" },
      "pt-BR",
    );
    expect(sections.map((s) => s.title)).toEqual([
      "Reserva",
      "Pagamento",
      "Cancelamento",
      "Horários",
      "Seus dados",
    ]);
    expect(sections[2]?.paragraphs[0]).toBe("Cancele grátis até 48 horas antes do check-in.");
    expect(sections[3]?.paragraphs[0]).toContain("a partir de 14:00 e check-out até 11:00");
  });

  it("antes do hotel carregar usa horários padrão", () => {
    const sections = termsSections(
      { policy: null, checkInTime: null, checkOutTime: null },
      "pt-BR",
    );
    expect(sections[3]?.paragraphs[0]).toContain("15:00");
  });
});
