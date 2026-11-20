import type { Locale } from "@/shared/i18n/config";
import { confirmationMessages } from "../i18n/messages";
import type { GuestLine } from "../model/guests";
import { ReceiptSection } from "./ReceiptSection";

/** Titular e acompanhantes com o tipo. Nunca idade, telefone nem documento. */
type GuestListProps = { guests: GuestLine[]; locale: Locale };

export const GuestList = ({ guests, locale }: GuestListProps) => (
  <ReceiptSection titleId="hospedes-titulo" title={confirmationMessages.get(locale).guests.title}>
    <ul className="flex flex-col gap-2">
      {guests.map((guest) => (
        <li key={guest.key} className="text-base font-medium wrap-anywhere text-fg">
          {guest.name} <span className="font-normal text-fg-muted">· {guest.roleLabel}</span>
        </li>
      ))}
    </ul>
  </ReceiptSection>
);
