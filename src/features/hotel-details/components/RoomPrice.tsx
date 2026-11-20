import type { Room } from "@/shared/api/schemas";
import { nightsBetween } from "@/shared/lib/dates";
import { stayTotalWithFees } from "@/shared/lib/pricing";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { PriceTag } from "@/shared/ui";
import type { RoomSelectability } from "../model/room-selectability";

type RoomPriceProps = {
  room: Room;
  criteria: SearchCriteria | null;
  selectability: RoomSelectability;
};

/** Preço do quarto: total em destaque quando dá para reservar; só a diária nos outros casos. */
export const RoomPrice = ({ room, criteria, selectability }: RoomPriceProps) => {
  if (criteria === null) return <PriceTag variant="room-nightly" nightly={room.pricePerNight} />;
  if (selectability.kind !== "selectable") {
    return <PriceTag variant="nightly-line" nightly={room.pricePerNight} exact />;
  }
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  return (
    <PriceTag
      variant="stay"
      total={stayTotalWithFees({
        pricePerNight: room.pricePerNight,
        nights,
        rooms: criteria.rooms,
      })}
      nights={nights}
      rooms={criteria.rooms}
      nightly={room.pricePerNight}
      exactNightly
    />
  );
};
