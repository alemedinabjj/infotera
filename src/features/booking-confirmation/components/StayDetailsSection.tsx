import type { Booking } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import { ErrorState } from "@/shared/ui";
import type { StayDetails } from "../api/confirmation.server";
import { confirmationMessages } from "../i18n/messages";
import { toStayView } from "../model/confirmation-view";
import { CancellationBlock, HotelBlock } from "./HotelBlock";
import { RefreshButton } from "./RefreshButton";
import { RoomBlock } from "./RoomBlock";

type StayDetailsSectionProps = {
  booking: Booking;
  /** Promessa de `loadStayDetails` (nunca rejeita), criada na página. */
  details: Promise<StayDetails>;
  locale: Locale;
};

/**
 * Hotel, quarto e cancelamento em streaming. Falha de hotel e/ou quarto vira **um** `ErrorState`
 * com **um** retry no topo; o que carregou (ou `missing`) aparece abaixo, normalmente.
 */
export const StayDetailsSection = async ({ booking, details, locale }: StayDetailsSectionProps) => {
  const { hotel, room } = await details;
  const view = toStayView(booking, hotel, room, locale);
  return (
    <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
      {view.errorTitle ? (
        <ErrorState
          headingLevel={3}
          title={view.errorTitle}
          description={confirmationMessages.get(locale).stay.errorDescription}
          action={<RefreshButton />}
        />
      ) : null}
      <HotelBlock hotel={view.hotel} locale={locale} />
      <RoomBlock room={view.room} locale={locale} />
      <CancellationBlock hotel={view.hotel} locale={locale} />
    </div>
  );
};
