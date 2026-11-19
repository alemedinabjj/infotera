import { describe, expect, it } from "vitest";
import { formatCardNumber } from "./card";
import { formatCpf } from "./cpf";
import { applyMask } from "./masked-input";
import { formatPhone } from "./phone";

const br = (text: string) => formatPhone("BR", text);

describe("applyMask", () => {
  it("digitar no fim mantém o cursor no fim", () => {
    expect(applyMask("(11) 98", 7, br)).toEqual({ value: "(11) 98", caret: 7 });
  });

  it("digitar o 3º dígito abre o parêntese e o espaço", () => {
    expect(applyMask("(119", 4, br)).toEqual({ value: "(11) 9", caret: 6 });
  });

  it("inserir no meio mantém o cursor depois do dígito digitado", () => {
    // "(11) 9876-5432" com um 0 digitado depois do "9" (cursor em 6)
    expect(applyMask("(11) 90876-5432", 7, br)).toEqual({ value: "(11) 90876-5432", caret: 7 });
  });

  it("apagar no meio não pula o cursor", () => {
    // apagou o "8" de "(11) 98765-4321": cursor em 6
    expect(applyMask("(11) 9765-4321", 6, br)).toEqual({ value: "(11) 9765-4321", caret: 6 });
  });

  it("apagar o primeiro dígito leva o cursor ao início", () => {
    expect(applyMask("", 0, br)).toEqual({ value: "", caret: 0 });
    expect(applyMask("1) 98765-4321", 0, br)).toMatchObject({ caret: 0 });
  });

  it("colar texto formatado funciona", () => {
    expect(applyMask("(11) 98765-4321", 15, br)).toEqual({ value: "(11) 98765-4321", caret: 15 });
    expect(applyMask("4111-1111-1111-1111", 19, formatCardNumber)).toEqual({
      value: "4111 1111 1111 1111",
      caret: 19,
    });
  });

  it("excesso de dígitos é descartado e o cursor fica no fim", () => {
    expect(applyMask("529.982.247-259", 15, formatCpf)).toEqual({
      value: "529.982.247-25",
      caret: 14,
    });
  });
});
