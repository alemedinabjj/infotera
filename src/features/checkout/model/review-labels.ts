import type { Locale } from "@/shared/i18n/config";
import { checkoutMessages } from "../i18n/messages";
import { brandLabel, cardLast4, detectCardBrand } from "./card";
import type { CheckoutValues } from "./checkout.schema";
import { maskCpf } from "./cpf";
import { maskPassport } from "./passport";
import { formatInternational } from "./phone";
import { ageText } from "./summary-labels";

type Payment = CheckoutValues["payment"];

/** `Visa •••• 1111 · validade 12/28` (nunca o número completo). */
export const describeCard = (payment: Payment, locale: Locale): string => {
  const t = checkoutMessages.get(locale).review;
  const brand = detectCardBrand(payment.cardNumber);
  const name = brand ? brandLabel(brand) : t.cardFallback;
  return t.card(name, cardLast4(payment.cardNumber), payment.expiry);
};

/** `CPF ***.982.247-**` / `Passaporte ******456`. */
export const describeDocument = (payment: Payment, locale: Locale): string => {
  const t = checkoutMessages.get(locale).review;
  return payment.documentType === "cpf"
    ? t.cpf(maskCpf(payment.document))
    : t.passport(maskPassport(payment.document));
};

export type ReviewGuest = { key: string; name: string; detail: string | null };

const fullName = (first: string, last: string): string => `${first.trim()} ${last.trim()}`;

/** Linhas da seção "Hóspedes": titular (com contato) e acompanhantes. */
export const describeGuests = (values: CheckoutValues, locale: Locale): ReviewGuest[] => {
  const t = checkoutMessages.get(locale).guests;
  const { contact, companions } = values;
  return [
    {
      key: "holder",
      name: `${fullName(contact.firstName, contact.lastName)} · ${t.holder}`,
      detail: `${contact.email.trim()} · ${formatInternational(contact.phoneCountry, contact.phone)}`,
    },
    ...companions.map((companion, index) => ({
      // Posição estável: a lista não reordena na revisão.
      key: `companion-${index}`,
      name: `${fullName(companion.firstName, companion.lastName)} · ${
        companion.kind === "adult" ? t.adult : t.child(ageText(companion.age, locale))
      }`,
      detail: null,
    })),
  ];
};
