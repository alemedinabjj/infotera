import { describe, expect, it } from "vitest";
import {
  type CheckoutValues,
  defaultCheckoutValues,
  isPersonalValid,
  MESSAGES,
  makeCheckoutSchema,
  makePaymentSchema,
} from "./checkout.schema";

const TODAY = "2026-11-19";
const schema = makeCheckoutSchema(TODAY);

const validContact = {
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@exemplo.com",
  phoneCountry: "BR",
  phone: "(11) 98765-4321",
} as const;

const validPayment = {
  cardNumber: "4111 1111 1111 1111",
  cardName: "ANA SOUZA",
  expiry: "12/28",
  cvv: "123",
  documentType: "cpf",
  document: "529.982.247-25",
} as const;

const valid = (): CheckoutValues => ({
  contact: { ...validContact },
  companions: [],
  payment: { ...validPayment },
  termsAccepted: true,
});

/** Primeira mensagem de erro por caminho (`contact.email`) do schema completo. */
const errorsOf = (values: CheckoutValues): Record<string, string> => {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const byPath: Record<string, string> = {};
  for (const issue of result.error.issues) {
    byPath[issue.path.join(".")] ??= issue.message;
  }
  return byPath;
};

const withContact = (contact: Partial<CheckoutValues["contact"]>): CheckoutValues => ({
  ...valid(),
  contact: { ...validContact, ...contact },
});
const withPayment = (payment: Partial<CheckoutValues["payment"]>): CheckoutValues => ({
  ...valid(),
  payment: { ...validPayment, ...payment },
});

describe("schema completo", () => {
  it("aceita um pedido válido", () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it("os valores padrão não passam, mas todo campo obrigatório tem mensagem", () => {
    const errors = errorsOf(defaultCheckoutValues);
    expect(errors["contact.firstName"]).toBe("Informe o nome.");
    expect(errors["contact.lastName"]).toBe("Informe o sobrenome.");
    expect(errors["contact.email"]).toBe(MESSAGES.emailRequired);
    expect(errors["contact.phone"]).toBe(MESSAGES.phoneRequired);
    expect(errors["payment.cardNumber"]).toBe(MESSAGES.cardRequired);
    expect(errors["payment.cardName"]).toBe(MESSAGES.cardNameRequired);
    expect(errors["payment.expiry"]).toBe(MESSAGES.expiryRequired);
    expect(errors["payment.cvv"]).toBe(MESSAGES.cvvRequired);
    expect(errors["payment.document"]).toBe(MESSAGES.cpfRequired);
    expect(errors.termsAccepted).toBe(MESSAGES.terms);
  });
});

describe("passo 1: contato", () => {
  it.each([
    ["nome com dígitos", { firstName: "Ana2" }, "contact.firstName", "Use só letras"],
    ["nome de 1 letra", { firstName: "A" }, "contact.firstName", "Use pelo menos 2 letras."],
    ["nome muito longo", { firstName: "a".repeat(61) }, "contact.firstName", "no máximo 60"],
    ["e-mail inválido", { email: "ana@" }, "contact.email", MESSAGES.email],
    ["DDD inexistente", { phone: "(20) 98765-4321" }, "contact.phone", "O DDD 20 não existe"],
    ["celular sem o 9", { phone: "(11) 88765-4321" }, "contact.phone", "Celular tem 9"],
    [
      "US com área iniciando em 1",
      { phoneCountry: "US", phone: "(101) 555-0123" },
      "contact.phone",
      "dos EUA",
    ],
    ["PT inválido", { phoneCountry: "PT", phone: "812 345 678" }, "contact.phone", "Portugal"],
    ["ES inválido", { phoneCountry: "ES", phone: "512 34 56 78" }, "contact.phone", "Espanha"],
  ] as const)("%s", (_name, patch, path, message) => {
    expect(errorsOf(withContact(patch))[path]).toContain(message);
  });

  it("aceita acentos, apóstrofo e hífen", () => {
    const errors = errorsOf(withContact({ firstName: "Maria-José", lastName: "D'Ávila" }));
    expect(errors["contact.firstName"]).toBeUndefined();
    expect(errors["contact.lastName"]).toBeUndefined();
  });
});

describe("passo 1: acompanhantes", () => {
  const withCompanions = (companions: CheckoutValues["companions"]): CheckoutValues => ({
    ...valid(),
    companions,
  });

  it("criança sem idade falha; adulto não precisa de idade", () => {
    const errors = errorsOf(
      withCompanions([
        { kind: "adult", firstName: "Bruno", lastName: "Souza", age: "" },
        { kind: "child", firstName: "Clara", lastName: "Souza", age: "" },
      ]),
    );
    expect(errors["companions.0.age"]).toBeUndefined();
    expect(errors["companions.1.age"]).toBe(MESSAGES.age);
  });

  it("idade 0 e 17 valem; 18 não", () => {
    const child = (age: string) =>
      errorsOf(withCompanions([{ kind: "child", firstName: "Clara", lastName: "Souza", age }]));
    expect(child("0")["companions.0.age"]).toBeUndefined();
    expect(child("17")["companions.0.age"]).toBeUndefined();
    expect(child("18")["companions.0.age"]).toBe(MESSAGES.age);
  });

  it("cada acompanhante valida sozinho", () => {
    const errors = errorsOf(
      withCompanions([
        { kind: "adult", firstName: "", lastName: "Souza", age: "" },
        { kind: "adult", firstName: "Bia", lastName: "", age: "" },
      ]),
    );
    expect(errors["companions.0.firstName"]).toBe("Informe o nome.");
    expect(errors["companions.0.lastName"]).toBeUndefined();
    expect(errors["companions.1.lastName"]).toBe("Informe o sobrenome.");
  });
});

describe("passo 2: pagamento", () => {
  it.each([
    ["cartão incompleto", { cardNumber: "4111 1111" }, "payment.cardNumber", "incompleto"],
    [
      "Luhn",
      { cardNumber: "4111 1111 1111 1112" },
      "payment.cardNumber",
      "Número de cartão inválido.",
    ],
    ["vencido", { expiry: "01/20" }, "payment.expiry", "Cartão vencido."],
    ["mês 13", { expiry: "13/30" }, "payment.expiry", "Mês inválido."],
    ["formato", { expiry: "1/3" }, "payment.expiry", "MM/AA"],
    ["ano distante", { expiry: "12/60" }, "payment.expiry", "Confira o ano"],
    ["CVV curto", { cvv: "12" }, "payment.cvv", "3 números do verso"],
    ["CPF repetido", { document: "111.111.111-11" }, "payment.document", "CPF inválido."],
    ["CPF com DV errado", { document: "529.982.247-24" }, "payment.document", "CPF inválido."],
    [
      "passaporte curto",
      { documentType: "passport", document: "ABC" },
      "payment.document",
      "Passaporte inválido.",
    ],
    ["nome do cartão com dígito", { cardName: "ANA 2" }, "payment.cardName", "só letras"],
  ] as const)("%s", (_name, patch, path, message) => {
    expect(errorsOf(withPayment(patch))[path]).toContain(message);
  });

  it("mês atual da validade vale", () => {
    expect(errorsOf(withPayment({ expiry: "11/26" }))["payment.expiry"]).toBeUndefined();
  });

  it("Amex exige CVV de 4 dígitos", () => {
    const amex = { cardNumber: "3782 822463 10005" };
    expect(errorsOf(withPayment({ ...amex, cvv: "123" }))["payment.cvv"]).toContain("4 números");
    expect(errorsOf(withPayment({ ...amex, cvv: "1234" }))["payment.cvv"]).toBeUndefined();
  });

  it("passaporte válido passa", () => {
    const patch = { documentType: "passport", document: "FZ123456" } as const;
    expect(errorsOf(withPayment(patch))["payment.document"]).toBeUndefined();
  });

  it("makePaymentSchema usa o today recebido", () => {
    const payment = { ...validPayment, expiry: "11/26" };
    expect(makePaymentSchema("2026-11-30").safeParse(payment).success).toBe(true);
    expect(makePaymentSchema("2026-12-01").safeParse(payment).success).toBe(false);
  });
});

describe("passo 3: termos", () => {
  it("exige o aceite", () => {
    expect(errorsOf({ ...valid(), termsAccepted: false }).termsAccepted).toBe(MESSAGES.terms);
  });
});

describe("isPersonalValid", () => {
  it("ignora o pagamento e os termos", () => {
    expect(
      isPersonalValid(
        { ...valid(), payment: defaultCheckoutValues.payment, termsAccepted: false },
        TODAY,
      ),
    ).toBe(true);
  });

  it("contato incompleto ou criança sem idade é inválido", () => {
    expect(isPersonalValid(withContact({ email: "" }), TODAY)).toBe(false);
    const child = { kind: "child", firstName: "Clara", lastName: "Souza", age: "" } as const;
    expect(isPersonalValid({ ...valid(), companions: [child] }, TODAY)).toBe(false);
  });
});
