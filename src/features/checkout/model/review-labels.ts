import { brandLabel, cardLast4, detectCardBrand } from "./card";
import type { CheckoutValues } from "./checkout.schema";
import { maskCpf } from "./cpf";
import { maskPassport } from "./passport";
import { formatInternational } from "./phone";
import { ageText } from "./summary-labels";

type Payment = CheckoutValues["payment"];

/** `Visa •••• 1111 · validade 12/28` (nunca o número completo). */
export const describeCard = (payment: Payment): string => {
  const brand = detectCardBrand(payment.cardNumber);
  const name = brand ? brandLabel(brand) : "Cartão";
  return `${name} •••• ${cardLast4(payment.cardNumber)} · validade ${payment.expiry}`;
};

/** `CPF ***.982.247-**` / `Passaporte ******456`. */
export const describeDocument = (payment: Payment): string =>
  payment.documentType === "cpf"
    ? `CPF ${maskCpf(payment.document)}`
    : `Passaporte ${maskPassport(payment.document)}`;

export type ReviewGuest = { key: string; name: string; detail: string | null };

const fullName = (first: string, last: string): string => `${first.trim()} ${last.trim()}`;

/** Linhas da seção "Hóspedes": titular (com contato) e acompanhantes. */
export const describeGuests = (values: CheckoutValues): ReviewGuest[] => {
  const { contact, companions } = values;
  return [
    {
      key: "holder",
      name: `${fullName(contact.firstName, contact.lastName)} · titular`,
      detail: `${contact.email.trim()} · ${formatInternational(contact.phoneCountry, contact.phone)}`,
    },
    ...companions.map((companion, index) => ({
      // Posição estável: a lista não reordena na revisão.
      key: `companion-${index}`,
      name: `${fullName(companion.firstName, companion.lastName)} · ${
        companion.kind === "adult" ? "adulto" : `criança, ${ageText(companion.age)}`
      }`,
      detail: null,
    })),
  ];
};
