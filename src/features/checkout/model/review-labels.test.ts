import { describe, expect, it } from "vitest";
import { defaultCheckoutValues } from "./checkout.schema";
import { describeCard, describeDocument, describeGuests } from "./review-labels";

const payment = {
  ...defaultCheckoutValues.payment,
  cardNumber: "4111 1111 1111 1111",
  expiry: "12/28",
  document: "529.982.247-25",
};

describe("review labels", () => {
  it("cartão mascarado, só os 4 últimos", () => {
    const text = describeCard(payment);
    expect(text).toBe("Visa •••• 1111 · validade 12/28");
    expect(text).not.toContain("4111 1111");
  });

  it("cartão de bandeira desconhecida", () => {
    expect(describeCard({ ...payment, cardNumber: "9999 9999 9999 9995" })).toMatch(
      /^Cartão •••• 9995/,
    );
  });

  it("documento mascarado", () => {
    expect(describeDocument(payment)).toBe("CPF ***.982.247-**");
    expect(describeDocument({ ...payment, documentType: "passport", document: "AB1234567" })).toBe(
      "Passaporte ******567",
    );
  });

  it("hóspedes: titular com contato, acompanhantes com tipo e idade", () => {
    const guests = describeGuests({
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
        { kind: "child", firstName: "Davi", lastName: "Souza", age: "0" },
      ],
    });
    expect(guests.map((g) => g.name)).toEqual([
      "Ana Souza · titular",
      "Bruno Souza · adulto",
      "Clara Souza · criança, 7 anos",
      "Davi Souza · criança, menos de 1 ano",
    ]);
    expect(guests[0]?.detail).toBe("ana@exemplo.com · +55 (11) 98765-4321");
  });
});
