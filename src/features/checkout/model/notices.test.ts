import { describe, expect, it } from "vitest";
import { noticeText } from "./notices";

describe("noticeText", () => {
  it("restauração pede a idade só quando há crianças", () => {
    expect(noticeText("restored", false)).toBe(
      "Recuperamos os dados que você preencheu nesta sessão.",
    );
    expect(noticeText("restored", true)).toContain("Confira a idade das crianças.");
  });

  it("pagamento apagado", () => {
    expect(noticeText("payment-wiped", true)).toContain("os dados do cartão não ficam salvos");
  });
});
