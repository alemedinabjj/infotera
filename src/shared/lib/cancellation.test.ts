import { describe, expect, it } from "vitest";
import { cancellationPolicySchema } from "@/shared/api/schemas";
import { cancellationDetails } from "./cancellation";

describe("cancellationDetails", () => {
  it("free: selo de sucesso e 3 regras", () => {
    const details = cancellationDetails("free", "pt-BR");
    expect(details.label).toBe("Cancelamento grátis");
    expect(details.tone).toBe("success");
    expect(details.details[0]).toBe("Cancele grátis até 48 horas antes do check-in.");
    expect(details.details).toHaveLength(3);
  });

  it("moderate: neutro, reembolso parcial", () => {
    const details = cancellationDetails("moderate", "pt-BR");
    expect(details.label).toBe("Cancelamento com reembolso parcial");
    expect(details.tone).toBe("neutral");
    expect(details.details).toHaveLength(2);
  });

  it("strict: alerta, sem reembolso", () => {
    const details = cancellationDetails("strict", "pt-BR");
    expect(details.label).toBe("Sem reembolso em caso de cancelamento");
    expect(details.tone).toBe("warning");
  });

  it("cobre todas as categorias do contrato", () => {
    for (const policy of cancellationPolicySchema.options) {
      expect(cancellationDetails(policy, "pt-BR").details.length).toBeGreaterThan(0);
    }
  });
});
