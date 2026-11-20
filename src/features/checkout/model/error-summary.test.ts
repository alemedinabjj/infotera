import type { FieldErrors } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { CheckoutValues } from "./checkout.schema";
import { stepOfField, summarizeCheckoutErrors } from "./error-summary";

const err = (message: string) => ({ type: "custom", message });

describe("summarizeCheckoutErrors", () => {
  it("passo 1 na ordem do DOM com o rótulo do hóspede", () => {
    const errors: FieldErrors<CheckoutValues> = {
      contact: { email: err("e"), firstName: err("n") },
      companions: [{ firstName: err("c1") }, { age: err("idade") }],
    };
    const items = summarizeCheckoutErrors({
      locale: "pt-BR",
      errors,
      step: "personal",
      companionKinds: ["adult", "child"],
      documentType: "cpf",
    });
    expect(items).toEqual([
      { id: "contact.firstName", label: "Titular — Nome", message: "n" },
      { id: "contact.email", label: "Titular — E-mail", message: "e" },
      { id: "companions.0.firstName", label: "Hóspede 2 — Nome", message: "c1" },
      { id: "companions.1.age", label: "Hóspede 3 — Idade", message: "idade" },
    ]);
  });

  it("passo 2 usa o rótulo do tipo de documento", () => {
    const errors: FieldErrors<CheckoutValues> = {
      payment: { document: err("d"), cardNumber: err("c") },
    };
    const run = (documentType: "cpf" | "passport") =>
      summarizeCheckoutErrors({
        locale: "pt-BR",
        errors,
        step: "payment",
        companionKinds: [],
        documentType,
      });
    expect(run("cpf").map((i) => i.label)).toEqual(["Número do cartão", "CPF"]);
    expect(run("passport").map((i) => i.label)).toEqual(["Número do cartão", "Passaporte"]);
  });

  it("passo 3 só olha os termos; erros de outros passos são ignorados", () => {
    const errors: FieldErrors<CheckoutValues> = {
      contact: { email: err("e") },
      termsAccepted: err("t"),
    };
    expect(
      summarizeCheckoutErrors({
        locale: "pt-BR",
        errors,
        step: "review",
        companionKinds: [],
        documentType: "cpf",
      }),
    ).toEqual([{ id: "termsAccepted", label: "Termos", message: "t" }]);
  });

  it("sem erros devolve lista vazia", () => {
    expect(
      summarizeCheckoutErrors({
        locale: "pt-BR",
        errors: {},
        step: "personal",
        companionKinds: [],
        documentType: "cpf",
      }),
    ).toEqual([]);
  });
});

describe("stepOfField", () => {
  it("mapeia o caminho para o passo", () => {
    expect(stepOfField("contact.email")).toBe("personal");
    expect(stepOfField("companions.1.age")).toBe("personal");
    expect(stepOfField("payment.cvv")).toBe("payment");
    expect(stepOfField("termsAccepted")).toBe("review");
  });
});
