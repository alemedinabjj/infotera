import type { FieldErrors } from "react-hook-form";
import type { ErrorSummaryItem } from "@/shared/ui";
import type { CheckoutFieldPath, CheckoutValues } from "./checkout.schema";
import type { GuestKind } from "./companions";
import type { CheckoutStep } from "./steps";

export type CheckoutSummaryItem = ErrorSummaryItem<CheckoutFieldPath>;

type SummaryContext = {
  errors: FieldErrors<CheckoutValues>;
  step: CheckoutStep;
  companionKinds: readonly GuestKind[];
  documentType: CheckoutValues["payment"]["documentType"];
};

const item = (
  id: CheckoutFieldPath,
  label: string,
  message: string | undefined,
): CheckoutSummaryItem[] => (message ? [{ id, label, message }] : []);

const personalItems = ({ errors, companionKinds }: SummaryContext): CheckoutSummaryItem[] => {
  const contact = errors.contact;
  const holder = [
    ...item("contact.firstName", "Titular — Nome", contact?.firstName?.message),
    ...item("contact.lastName", "Titular — Sobrenome", contact?.lastName?.message),
    ...item("contact.email", "Titular — E-mail", contact?.email?.message),
    ...item("contact.phone", "Titular — Telefone", contact?.phone?.message),
  ];
  const others = companionKinds.flatMap((kind, index) => {
    const row = errors.companions?.[index];
    const guest = `Hóspede ${index + 2}`;
    return [
      ...item(`companions.${index}.firstName`, `${guest} — Nome`, row?.firstName?.message),
      ...item(`companions.${index}.lastName`, `${guest} — Sobrenome`, row?.lastName?.message),
      ...(kind === "child"
        ? item(`companions.${index}.age`, `${guest} — Idade`, row?.age?.message)
        : []),
    ];
  });
  return [...holder, ...others];
};

const paymentItems = ({ errors, documentType }: SummaryContext): CheckoutSummaryItem[] => {
  const payment = errors.payment;
  return [
    ...item("payment.cardNumber", "Número do cartão", payment?.cardNumber?.message),
    ...item("payment.cardName", "Nome no cartão", payment?.cardName?.message),
    ...item("payment.expiry", "Validade", payment?.expiry?.message),
    ...item("payment.cvv", "CVV", payment?.cvv?.message),
    ...item(
      "payment.document",
      documentType === "cpf" ? "CPF" : "Passaporte",
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
      return item("termsAccepted", "Termos", context.errors.termsAccepted?.message);
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
