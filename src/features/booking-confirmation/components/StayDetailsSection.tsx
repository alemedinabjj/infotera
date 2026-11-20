import type { Booking } from "@/shared/api/schemas";
import { ErrorState } from "@/shared/ui";
import type { StayDetails } from "../api/confirmation.server";
import { toStayView } from "../model/confirmation-view";
import { CancellationBlock, HotelBlock } from "./HotelBlock";
import { RefreshButton } from "./RefreshButton";
import { RoomBlock } from "./RoomBlock";

type StayDetailsSectionProps = {
  booking: Booking;
  /** Promessa de `loadStayDetails` (nunca rejeita), criada na página. */
  details: Promise<StayDetails>;
};

/**
 * Hotel, quarto e cancelamento em streaming. Falha de hotel e/ou quarto vira **um** `ErrorState`
 * com **um** retry no topo; o que carregou (ou `missing`) aparece abaixo, normalmente.
 */
export const StayDetailsSection = async ({ booking, details }: StayDetailsSectionProps) => {
  const { hotel, room } = await details;
  const view = toStayView(booking, hotel, room);
  return (
    <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
      {view.errorTitle ? (
        <ErrorState
          headingLevel={3}
          title={view.errorTitle}
          description="Sua reserva está confirmada. Verifique sua conexão e tente de novo."
          action={<RefreshButton />}
        />
      ) : null}
      <HotelBlock hotel={view.hotel} />
      <RoomBlock room={view.room} />
      <CancellationBlock hotel={view.hotel} />
    </div>
  );
};
