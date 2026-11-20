import { notFound } from "next/navigation";
import { getLocale } from "@/shared/i18n/server";
import { todayISO } from "@/shared/lib/dates";
import { loadBooking, loadStayDetails } from "../api/confirmation.server";
import type { BookingId } from "../model/booking-id";
import { ConfirmationView } from "./ConfirmationView";
import { UnreadableBooking } from "./UnreadableBooking";

/**
 * Lê a reserva no servidor a cada request (nunca do store) e escolhe o estado: `404` →
 * `notFound()`, corpo ilegível → "Não foi possível exibir", senão o recibo. Hotel e quarto
 * começam juntos logo depois da reserva (os ids estão nela) e **não** são aguardados aqui: a
 * promessa vai para a seção em streaming, então o número da reserva não espera por eles.
 */
export const BookingConfirmation = async ({ id }: { id: BookingId }) => {
  const load = await loadBooking(id);
  const locale = await getLocale();
  switch (load.kind) {
    case "found":
      return (
        <ConfirmationView
          booking={load.booking}
          details={loadStayDetails(load.booking)}
          today={todayISO()}
          locale={locale}
        />
      );
    case "not-found":
      return notFound();
    case "unreadable":
      return <UnreadableBooking locale={locale} />;
    default: {
      const unreachable: never = load;
      return unreachable;
    }
  }
};
