import { describe, expect, it } from "vitest";
import {
  isStepDone,
  nextStep,
  previousStep,
  restoreStep,
  stepCounter,
  stepDocumentTitle,
  stepTitle,
} from "./steps";

describe("steps", () => {
  it("avança e volta sem passar das pontas", () => {
    expect(nextStep("personal")).toBe("payment");
    expect(nextStep("payment")).toBe("review");
    expect(nextStep("review")).toBe("review");
    expect(previousStep("review")).toBe("payment");
    expect(previousStep("personal")).toBe("personal");
  });

  it("textos de cada passo", () => {
    expect(stepCounter("payment")).toBe("Passo 2 de 3");
    expect(stepTitle("review")).toBe("Revise e confirme");
    expect(stepDocumentTitle("personal")).toBe("Passo 1 de 3: Dados dos hóspedes");
  });

  it("isStepDone", () => {
    expect(isStepDone("personal", "payment")).toBe(true);
    expect(isStepDone("payment", "payment")).toBe(false);
    expect(isStepDone("review", "payment")).toBe(false);
  });

  it.each([
    ["personal", true, "personal"],
    ["payment", true, "payment"],
    ["review", true, "payment"], // pagamento nunca é restaurado
    ["payment", false, "personal"],
    ["review", false, "personal"],
  ] as const)("restoreStep(%s, personalValid=%s) → %s", (step, valid, expected) => {
    expect(restoreStep(step, valid)).toBe(expected);
  });
});
