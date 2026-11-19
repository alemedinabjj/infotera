import type { GuestKind } from "../model/companions";
import { CompanionFields } from "./CompanionFields";
import { ContactFields } from "./ContactFields";

/** Passo 1: titular + acompanhantes (adultos e crianças da busca). */
export const PersonalStep = ({ companions }: { companions: { id: string; kind: GuestKind }[] }) => (
  <div className="flex flex-col gap-6">
    <ContactFields />
    <CompanionFields companions={companions} />
  </div>
);
