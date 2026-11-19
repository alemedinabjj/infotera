import type { Metadata } from "next";
import { CONFIRMATION_ROBOTS, NewSearchLink } from "@/features/booking-confirmation";
import { EmptyState, FocusOnMount } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Reserva não encontrada | Infotera Hotéis",
  robots: CONFIRMATION_ROBOTS,
};

/** Reserva inexistente ou id fora do formato: nenhuma chamada à API foi feita nesse caso. */
const ConfirmationNotFound = () => (
  <div className="w-full max-w-3xl">
    <EmptyState
      headingLevel={1}
      title="Reserva não encontrada"
      description="Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia."
      action={<NewSearchLink />}
    />
    <FocusOnMount selector="h1" />
  </div>
);

export default ConfirmationNotFound;
