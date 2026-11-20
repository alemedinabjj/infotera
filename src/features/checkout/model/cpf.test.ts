import { describe, expect, it } from "vitest";
import { cpfDigits, formatCpf, isValidCpf, maskCpf } from "./cpf";

describe("isValidCpf", () => {
  it.each(["529.982.247-25", "52998224725", "111.444.777-35"])("aceita %s", (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each(["529.982.247-24", "529.982.247-35", "123.456.789-00"])("rejeita DV errado %s", (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])("rejeita 11 dígitos repetidos (%i)", (digit) => {
    expect(isValidCpf(String(digit).repeat(11))).toBe(false);
  });

  it.each(["", "5299822472", "529982247250", "abc"])("rejeita tamanho errado %j", (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe("formatCpf / cpfDigits / maskCpf", () => {
  it("aplica a máscara aos poucos", () => {
    expect(formatCpf("5")).toBe("5");
    expect(formatCpf("5299")).toBe("529.9");
    expect(formatCpf("529982")).toBe("529.982");
    expect(formatCpf("5299822")).toBe("529.982.2");
    expect(formatCpf("529982247")).toBe("529.982.247");
    expect(formatCpf("5299822472")).toBe("529.982.247-2");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });

  it("descarta o excesso e o que não é dígito", () => {
    expect(cpfDigits("529.982.247-25999")).toBe("52998224725");
    expect(formatCpf("529.982.247-25999")).toBe("529.982.247-25");
  });

  it("mascara só o que não aparece na revisão", () => {
    expect(maskCpf("529.982.247-25")).toBe("***.982.247-**");
  });
});
