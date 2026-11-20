import type { FieldPath } from "react-hook-form";
import type { ISODate } from "@/shared/lib/dates";
import { z } from "@/shared/lib/zod";
import { cardDigits, cvvLength, detectCardBrand, isValidLuhn, MIN_CARD_DIGITS } from "./card";
import { isValidCpf } from "./cpf";
import { expiryIssue } from "./expiry";
import { personNameSchema } from "./names";
import { isValidPassport } from "./passport";
import { isValidPhone, PHONE_COUNTRY_CODES, type PhoneCountry } from "./phone";

export const MESSAGES = {
  email: "Digite um e-mail válido, como nome@exemplo.com.",
  emailRequired: "Informe o e-mail.",
  phoneRequired: "Informe o telefone.",
  age: "Informe a idade da criança no check-in.",
  cardRequired: "Informe o número do cartão.",
  cardIncomplete: "O número do cartão está incompleto.",
  cardLuhn: "Número de cartão inválido. Confira os dígitos.",
  cardNameRequired: "Informe o nome como está impresso no cartão.",
  cardName: "Use só letras e espaços.",
  expiryRequired: "Informe a validade do cartão.",
  expiryFormat: "Use o formato MM/AA.",
  expiryMonth: "Mês inválido. Use de 01 a 12.",
  expiryExpired: "Cartão vencido. Use um cartão com validade futura.",
  expiryYear: "Confira o ano da validade.",
  cvvRequired: "Informe o CVV.",
  cpfRequired: "Informe o CPF.",
  cpf: "CPF inválido. Confira os 11 números.",
  passportRequired: "Informe o número do passaporte.",
  passport: "Passaporte inválido. Use de 6 a 9 letras e números, como FZ123456.",
  terms: "Para continuar, aceite os termos da reserva.",
} as const;

const PHONE_MESSAGES: Record<PhoneCountry, string> = {
  BR: "Digite o telefone com DDD, como (11) 98765-4321.",
  US: "Digite um número dos EUA com 10 dígitos, como (201) 555-0123.",
  PT: "Digite um número de Portugal com 9 dígitos, começando com 9 ou 2.",
  ES: "Digite um número da Espanha com 9 dígitos, começando com 6, 7, 8 ou 9.",
};

/** Mensagem de telefone para o país e o motivo devolvido por `isValidPhone`. */
export const phoneMessage = (
  country: PhoneCountry,
  check: ReturnType<typeof isValidPhone>,
): string | null => {
  if (check.ok) return null;
  if (country === "BR" && check.reason === "area-code") {
    return `O DDD ${check.areaCode ?? ""} não existe. Confira o código da cidade.`;
  }
  if (country === "BR" && check.reason === "mobile-nine") {
    return "Celular tem 9 depois do DDD, como (11) 98765-4321.";
  }
  return PHONE_MESSAGES[country];
};

const contactSchema = z
  .object({
    firstName: personNameSchema("Informe o nome."),
    lastName: personNameSchema("Informe o sobrenome."),
    email: z
      .string()
      .trim()
      .min(1, MESSAGES.emailRequired)
      .refine((value) => value === "" || z.email().safeParse(value).success, MESSAGES.email),
    phoneCountry: z.enum(PHONE_COUNTRY_CODES),
    phone: z.string(),
  })
  .superRefine((contact, ctx) => {
    if (contact.phone.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["phone"], message: MESSAGES.phoneRequired });
      return;
    }
    const message = phoneMessage(
      contact.phoneCountry,
      isValidPhone(contact.phoneCountry, contact.phone),
    );
    if (message) ctx.addIssue({ code: "custom", path: ["phone"], message });
  });

const companionSchema = z
  .object({
    kind: z.enum(["adult", "child"]),
    firstName: personNameSchema("Informe o nome."),
    lastName: personNameSchema("Informe o sobrenome."),
    age: z.string(),
  })
  .superRefine((companion, ctx) => {
    if (companion.kind === "child" && !/^(?:\d|1[0-7])$/.test(companion.age)) {
      ctx.addIssue({ code: "custom", path: ["age"], message: MESSAGES.age });
    }
  });

const CARD_NAME_CHARS = /^[\p{L}\s.'’-]+$/u;

const addExpiryIssue = (value: string, today: ISODate, ctx: z.RefinementCtx): void => {
  if (value.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["expiry"], message: MESSAGES.expiryRequired });
    return;
  }
  const issue = expiryIssue(value, today);
  if (issue === null) return;
  const messages = {
    format: MESSAGES.expiryFormat,
    month: MESSAGES.expiryMonth,
    expired: MESSAGES.expiryExpired,
    year: MESSAGES.expiryYear,
  } as const;
  ctx.addIssue({ code: "custom", path: ["expiry"], message: messages[issue] });
};

type PaymentFields = {
  cardNumber: string;
  cvv: string;
  documentType: "cpf" | "passport";
  document: string;
};

const addCardIssue = (payment: PaymentFields, ctx: z.RefinementCtx): void => {
  const digits = cardDigits(payment.cardNumber);
  const message =
    digits.length === 0
      ? MESSAGES.cardRequired
      : digits.length < MIN_CARD_DIGITS
        ? MESSAGES.cardIncomplete
        : isValidLuhn(digits)
          ? null
          : MESSAGES.cardLuhn;
  if (message) ctx.addIssue({ code: "custom", path: ["cardNumber"], message });
};

const addCvvIssue = (payment: PaymentFields, ctx: z.RefinementCtx): void => {
  const brand = detectCardBrand(payment.cardNumber);
  const length = cvvLength(brand);
  if (payment.cvv.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["cvv"], message: MESSAGES.cvvRequired });
  } else if (!new RegExp(`^\\d{${length}}$`).test(payment.cvv)) {
    const message =
      length === 4
        ? "Digite os 4 números da frente do cartão."
        : "Digite os 3 números do verso do cartão.";
    ctx.addIssue({ code: "custom", path: ["cvv"], message });
  }
};

const addDocumentIssue = (payment: PaymentFields, ctx: z.RefinementCtx): void => {
  const isCpf = payment.documentType === "cpf";
  if (payment.document.trim() === "") {
    const message = isCpf ? MESSAGES.cpfRequired : MESSAGES.passportRequired;
    ctx.addIssue({ code: "custom", path: ["document"], message });
    return;
  }
  const valid = isCpf ? isValidCpf(payment.document) : isValidPassport(payment.document);
  if (!valid) {
    ctx.addIssue({
      code: "custom",
      path: ["document"],
      message: isCpf ? MESSAGES.cpf : MESSAGES.passport,
    });
  }
};

/** Pagamento (simulado): nada disto sai do navegador nem é persistido. */
export const makePaymentSchema = (today: ISODate) =>
  z
    .object({
      cardNumber: z.string(),
      cardName: z
        .string()
        .trim()
        .min(1, MESSAGES.cardNameRequired)
        .regex(CARD_NAME_CHARS, MESSAGES.cardName),
      expiry: z.string(),
      cvv: z.string(),
      documentType: z.enum(["cpf", "passport"]),
      document: z.string(),
    })
    .superRefine((payment, ctx) => {
      addCardIssue(payment, ctx);
      addExpiryIssue(payment.expiry, today, ctx);
      addCvvIssue(payment, ctx);
      addDocumentIssue(payment, ctx);
    });

/** Schema completo, a única fonte da verdade dos 3 passos. `today` (`YYYY-MM-DD`) por parâmetro. */
export const makeCheckoutSchema = (today: ISODate) =>
  z.object({
    contact: contactSchema,
    companions: z.array(companionSchema),
    payment: makePaymentSchema(today),
    termsAccepted: z.boolean().refine((accepted) => accepted, MESSAGES.terms),
  });

export type CheckoutValues = z.infer<ReturnType<typeof makeCheckoutSchema>>;
export type CheckoutFieldPath = FieldPath<CheckoutValues>;

export const defaultCheckoutValues: CheckoutValues = {
  contact: { firstName: "", lastName: "", email: "", phoneCountry: "BR", phone: "" },
  companions: [],
  payment: {
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
    documentType: "cpf",
    document: "",
  },
  termsAccepted: false,
};

/**
 * Os dados pessoais (passo 1) estão completos? Usado ao restaurar o rascunho: se não, volta para o
 * passo 1. Criança sem idade conta como incompleto (a idade nunca é persistida).
 */
export const isPersonalValid = (values: CheckoutValues, today: ISODate): boolean => {
  const result = makeCheckoutSchema(today).safeParse(values);
  if (result.success) return true;
  return !result.error.issues.some(
    (issue) => issue.path[0] === "contact" || issue.path[0] === "companions",
  );
};
