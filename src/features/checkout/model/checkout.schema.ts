import type { FieldPath } from "react-hook-form";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import type { ISODate } from "@/shared/lib/dates";
import { z } from "@/shared/lib/zod";
import { checkoutMessages } from "../i18n/messages";
import type { CheckoutMessages } from "../i18n/pt-BR";
import { cardDigits, cvvLength, detectCardBrand, isValidLuhn, MIN_CARD_DIGITS } from "./card";
import { isValidCpf } from "./cpf";
import { expiryIssue } from "./expiry";
import { personNameSchema } from "./names";
import { isValidPassport } from "./passport";
import { isValidPhone, PHONE_COUNTRY_CODES, type PhoneCountry } from "./phone";

/** Mensagens de validação no idioma (`pt-BR` por padrão). */
export const validationMessages = (locale: Locale = DEFAULT_LOCALE) =>
  checkoutMessages.get(locale).validation;

/** Mensagem de telefone para o país e o motivo devolvido por `isValidPhone`. */
export const phoneMessage = (
  country: PhoneCountry,
  check: ReturnType<typeof isValidPhone>,
  locale: Locale = DEFAULT_LOCALE,
): string | null => {
  if (check.ok) return null;
  const t = validationMessages(locale);
  if (country === "BR" && check.reason === "area-code") return t.areaCode(check.areaCode ?? "");
  if (country === "BR" && check.reason === "mobile-nine") return t.mobileNine;
  return t.phone[country];
};

type Messages = CheckoutMessages["validation"];

const contactSchema = (t: Messages, locale: Locale) =>
  z
    .object({
      firstName: personNameSchema(t.firstNameRequired, locale),
      lastName: personNameSchema(t.lastNameRequired, locale),
      email: z
        .string()
        .trim()
        .min(1, t.emailRequired)
        .refine((value) => value === "" || z.email().safeParse(value).success, t.email),
      phoneCountry: z.enum(PHONE_COUNTRY_CODES),
      phone: z.string(),
    })
    .superRefine((contact, ctx) => {
      if (contact.phone.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["phone"], message: t.phoneRequired });
        return;
      }
      const message = phoneMessage(
        contact.phoneCountry,
        isValidPhone(contact.phoneCountry, contact.phone),
        locale,
      );
      if (message) ctx.addIssue({ code: "custom", path: ["phone"], message });
    });

const companionSchema = (t: Messages, locale: Locale) =>
  z
    .object({
      kind: z.enum(["adult", "child"]),
      firstName: personNameSchema(t.firstNameRequired, locale),
      lastName: personNameSchema(t.lastNameRequired, locale),
      age: z.string(),
    })
    .superRefine((companion, ctx) => {
      if (companion.kind === "child" && !/^(?:\d|1[0-7])$/.test(companion.age)) {
        ctx.addIssue({ code: "custom", path: ["age"], message: t.age });
      }
    });

const CARD_NAME_CHARS = /^[\p{L}\s.'’-]+$/u;

const addExpiryIssue = (value: string, today: ISODate, ctx: z.RefinementCtx, t: Messages): void => {
  if (value.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["expiry"], message: t.expiryRequired });
    return;
  }
  const issue = expiryIssue(value, today);
  if (issue === null) return;
  const messages = {
    format: t.expiryFormat,
    month: t.expiryMonth,
    expired: t.expiryExpired,
    year: t.expiryYear,
  } as const;
  ctx.addIssue({ code: "custom", path: ["expiry"], message: messages[issue] });
};

type PaymentFields = {
  cardNumber: string;
  cvv: string;
  documentType: "cpf" | "passport";
  document: string;
};

const addCardIssue = (payment: PaymentFields, ctx: z.RefinementCtx, t: Messages): void => {
  const digits = cardDigits(payment.cardNumber);
  const message =
    digits.length === 0
      ? t.cardRequired
      : digits.length < MIN_CARD_DIGITS
        ? t.cardIncomplete
        : isValidLuhn(digits)
          ? null
          : t.cardLuhn;
  if (message) ctx.addIssue({ code: "custom", path: ["cardNumber"], message });
};

const addCvvIssue = (payment: PaymentFields, ctx: z.RefinementCtx, t: Messages): void => {
  const brand = detectCardBrand(payment.cardNumber);
  const length = cvvLength(brand);
  if (payment.cvv.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["cvv"], message: t.cvvRequired });
  } else if (!new RegExp(`^\\d{${length}}$`).test(payment.cvv)) {
    const message = length === 4 ? t.cvvFour : t.cvvThree;
    ctx.addIssue({ code: "custom", path: ["cvv"], message });
  }
};

const addDocumentIssue = (payment: PaymentFields, ctx: z.RefinementCtx, t: Messages): void => {
  const isCpf = payment.documentType === "cpf";
  if (payment.document.trim() === "") {
    const message = isCpf ? t.cpfRequired : t.passportRequired;
    ctx.addIssue({ code: "custom", path: ["document"], message });
    return;
  }
  const valid = isCpf ? isValidCpf(payment.document) : isValidPassport(payment.document);
  if (!valid) {
    ctx.addIssue({ code: "custom", path: ["document"], message: isCpf ? t.cpf : t.passport });
  }
};

/** Pagamento (simulado): nada disto sai do navegador nem é persistido. */
export const makePaymentSchema = (today: ISODate, locale: Locale = DEFAULT_LOCALE) => {
  const t = validationMessages(locale);
  return z
    .object({
      cardNumber: z.string(),
      cardName: z.string().trim().min(1, t.cardNameRequired).regex(CARD_NAME_CHARS, t.cardName),
      expiry: z.string(),
      cvv: z.string(),
      documentType: z.enum(["cpf", "passport"]),
      document: z.string(),
    })
    .superRefine((payment, ctx) => {
      addCardIssue(payment, ctx, t);
      addExpiryIssue(payment.expiry, today, ctx, t);
      addCvvIssue(payment, ctx, t);
      addDocumentIssue(payment, ctx, t);
    });
};

/**
 * Schema completo, a única fonte da verdade dos 3 passos. `today` (`YYYY-MM-DD`) e o idioma das
 * mensagens entram por parâmetro.
 */
export const makeCheckoutSchema = (today: ISODate, locale: Locale = DEFAULT_LOCALE) => {
  const t = validationMessages(locale);
  return z.object({
    contact: contactSchema(t, locale),
    companions: z.array(companionSchema(t, locale)),
    payment: makePaymentSchema(today, locale),
    termsAccepted: z.boolean().refine((accepted) => accepted, t.terms),
  });
};

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
