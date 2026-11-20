import { describe, expect, it } from "vitest";
import { type CheckoutValues, defaultCheckoutValues } from "./checkout.schema";
import {
  CHECKOUT_DRAFT_KEY,
  fromPersistedDraft,
  persistedDraftSchema,
  toPersistedDraft,
} from "./checkout-draft";

const values: CheckoutValues = {
  ...defaultCheckoutValues,
  contact: {
    firstName: "Ana",
    lastName: "Souza",
    email: "ana@exemplo.com",
    phoneCountry: "BR",
    phone: "(11) 98765-4321",
  },
  companions: [
    { kind: "adult", firstName: "Bruno", lastName: "Souza", age: "" },
    { kind: "child", firstName: "Clara", lastName: "Souza", age: "7" },
  ],
  payment: {
    cardNumber: "4111111111111111",
    cardName: "ANA SOUZA",
    expiry: "12/30",
    cvv: "123",
    documentType: "cpf",
    document: "52998224725",
  },
  termsAccepted: true,
};

describe("toPersistedDraft", () => {
  it("não contém nenhum dado de pagamento, idade nem aceite", () => {
    const serialized = JSON.stringify(toPersistedDraft(values, "payment"));
    for (const forbidden of [
      "4111111111111111",
      "123",
      "12/30",
      "52998224725",
      "ANA SOUZA",
      "termsAccepted",
      "age",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("grava nomes, e-mail, país, telefone e passo", () => {
    expect(toPersistedDraft(values, "payment")).toEqual({
      v: 1,
      step: "payment",
      contact: {
        firstName: "Ana",
        lastName: "Souza",
        email: "ana@exemplo.com",
        phoneCountry: "BR",
        phone: "(11) 98765-4321",
      },
      companions: [
        { kind: "adult", firstName: "Bruno", lastName: "Souza" },
        { kind: "child", firstName: "Clara", lastName: "Souza" },
      ],
    });
  });

  it("round-trip pelo schema devolve contato e acompanhantes (idade vazia)", () => {
    const serialized = JSON.stringify(toPersistedDraft(values, "review"));
    const parsed = persistedDraftSchema.parse(JSON.parse(serialized));
    const restored = fromPersistedDraft(parsed);
    expect(restored.step).toBe("review");
    expect(restored.contact).toEqual(values.contact);
    expect(restored.companions.map((c) => c.age)).toEqual(["", ""]);
    expect(restored.companions.map((c) => c.firstName)).toEqual(["Bruno", "Clara"]);
  });
});

describe("persistedDraftSchema", () => {
  const valid = toPersistedDraft(values, "personal");

  it("ignora versão antiga e lixo", () => {
    expect(persistedDraftSchema.safeParse({ ...valid, v: 0 }).success).toBe(false);
    expect(persistedDraftSchema.safeParse({ ...valid, step: "done" }).success).toBe(false);
    expect(persistedDraftSchema.safeParse({ v: 1 }).success).toBe(false);
    expect(persistedDraftSchema.safeParse("texto").success).toBe(false);
    expect(persistedDraftSchema.safeParse(null).success).toBe(false);
  });

  it("a chave fica sob o prefixo do app", () => {
    expect(CHECKOUT_DRAFT_KEY).toBe("checkout-draft");
  });
});
