import type { FieldErrors } from "react-hook-form";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import type { ErrorSummaryItem } from "@/shared/ui";
import { checkoutMessages } from "../i18n/messages";
import type { CheckoutFieldPath, CheckoutValues } from "./checkout.schema";
import type { GuestKind } from "./companions";
import type { CheckoutStep } from "./steps";

export type CheckoutSummaryItem = ErrorSummaryItem<CheckoutFieldPath>;

type SummaryContext = {
  errors: FieldErrors<CheckoutValues>;
  step: CheckoutStep;
  companionKinds: readonly GuestKind[];
  documentType: CheckoutValues["payment"]["documentType"];
  locale?: Locale;
};

const item = (
  id: CheckoutFieldPath,
  label: string,
  message: string | undefined,
): CheckoutSummaryItem[] => (message ? [{ id, label, message }] : []);

const personalItems = ({
  errors,
  companionKinds,
  locale = DEFAULT_LOCALE,
}: SummaryContext): CheckoutSummaryItem[] => {
  const t = checkoutMessages.get(locale);
  const contact = errors.contact;
  const holder = `${t.errorSummary.holder} — `;
  const holderItems = [
    ...item("contact.firstName", `${holder}${t.fields.firstName}`, contact?.firstName?.message),
    ...item("contact.lastName", `${holder}${t.fields.lastName}`, contact?.lastName?.message),
    ...item("contact.email", `${holder}${t.fields.email}`, contact?.email?.message),
    ...item("contact.phone", `${holder}${t.fields.phone}`, contact?.phone?.message),
  ];
  const others = companionKinds.flatMap((kind, index) => {
    const row = errors.companions?.[index];
    const guest = `${t.errorSummary.guest(index + 2)} — `;
    return [
      ...item(
        `companions.${index}.firstName`,
        `${guest}${t.fields.firstName}`,
        row?.firstName?.message,
      ),
      ...item(
        `companions.${index}.lastName`,
        `${guest}${t.fields.lastName}`,
        row?.lastName?.message,
      ),
      ...(kind === "child"
        ? item(`companions.${index}.age`, `${guest}${t.errorSummary.age}`, row?.age?.message)
        : []),
    ];
  });
  return [...holderItems, ...others];
};

const paymentItems = ({
  errors,
  documentType,
  locale = DEFAULT_LOCALE,
}: SummaryContext): CheckoutSummaryItem[] => {
  const t = checkoutMessages.get(locale);
  const payment = errors.payment;
  return [
    ...item("payment.cardNumber", t.payment.number, payment?.cardNumber?.message),
    ...item("payment.cardName", t.errorSummary.cardName, payment?.cardName?.message),
    ...item("payment.expiry", t.payment.expiry, payment?.expiry?.message),
    ...item("payment.cvv", t.payment.cvv, payment?.cvv?.message),
    ...item(
      "payment.document",
      documentType === "cpf" ? t.payment.cpf : t.payment.passport,
      payment?.document?.message,
    ),
  ];
};

/** Erros do passo atual na ordem do DOM, com o rótulo do hóspede (`Hóspede 2 — Nome`). */
export const summarizeCheckoutErrors = (context: SummaryContext): CheckoutSummaryItem[] => {
  switch (context.step) {
    case "personal":
      return personalItems(context);
    case "payment":
      return paymentItems(context);
    case "review":
      return item(
        "termsAccepted",
        checkoutMessages.get(context.locale ?? DEFAULT_LOCALE).errorSummary.terms,
        context.errors.termsAccepted?.message,
      );
    default: {
      const unreachable: never = context.step;
      return unreachable;
    }
  }
};

/** Primeiro passo que contém o campo (para a resposta `invalid` do servidor). */
export const stepOfField = (path: string): CheckoutStep => {
  if (path.startsWith("contact") || path.startsWith("companions")) return "personal";
  if (path.startsWith("payment")) return "payment";
  return "review";
};
