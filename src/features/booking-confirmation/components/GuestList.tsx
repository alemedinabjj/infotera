import type { GuestLine } from "../model/guests";
import { ReceiptSection } from "./ReceiptSection";

/** Titular e acompanhantes com o tipo. Nunca idade, telefone nem documento. */
export const GuestList = ({ guests }: { guests: GuestLine[] }) => (
  <ReceiptSection titleId="hospedes-titulo" title="Hóspedes">
    <ul className="flex flex-col gap-2">
      {guests.map((guest) => (
        <li key={guest.key} className="text-base font-medium wrap-anywhere text-fg">
          {guest.name} <span className="font-normal text-fg-muted">· {guest.roleLabel}</span>
        </li>
      ))}
    </ul>
  </ReceiptSection>
);
