import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { contentLang } from "@/shared/i18n/config";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { cardClassName, RemoteImage } from "@/shared/ui";
import { roomSelectability } from "../model/room-selectability";
import { RoomCardFooter } from "./RoomCardFooter";
import { RoomAmenities, RoomCancellation, RoomFacts } from "./RoomDetails";

type RoomCardProps = {
  room: Room;
  criteria: SearchCriteria | null;
  pastDates: boolean;
  /** O hotel tem outro tipo de quarto (os motivos de bloqueio só sugerem "outro" nesse caso). */
  otherRooms: boolean;
  cancellationPolicy: CancellationPolicy;
  /** Este quarto está em "Selecionando…". */
  selecting: boolean;
  /** Algum quarto está sendo selecionado: os outros botões ignoram o clique. */
  locked: boolean;
  onSelect: (roomId: number) => void;
  onPickDates: () => void;
};

const ROOM_IMAGE_SIZES = "(min-width: 640px) 14rem, 100vw";

/** Card do quarto: foto, nome, fatos, comodidades, cancelamento e o bloco de preço + ação. */
export const RoomCard = ({
  room,
  criteria,
  pastDates,
  otherRooms,
  cancellationPolicy,
  selecting,
  locked,
  onSelect,
  onPickDates,
}: RoomCardProps) => {
  const lang = contentLang(useLocale());
  const selectability = roomSelectability(room, criteria, pastDates);
  const [photo] = room.images;
  return (
    <li>
      <article
        className={cardClassName({
          variant: selecting ? "selected" : "static",
          className: "sm:flex-row",
        })}
      >
        {photo ? (
          <RemoteImage
            src={photo}
            alt=""
            sizes={ROOM_IMAGE_SIZES}
            muted={selectability.kind === "sold-out"}
            className="aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:min-h-42 sm:w-56"
          />
        ) : null}
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          <h3 lang={lang} className="text-lg font-semibold text-fg">
            {room.name}
          </h3>
          <p lang={lang} className="text-sm text-fg-muted">
            {room.description}
          </p>
          <RoomFacts room={room} />
          <RoomAmenities room={room} />
          <RoomCancellation policy={cancellationPolicy} />
          <RoomCardFooter
            room={room}
            criteria={criteria}
            selectability={selectability}
            otherRooms={otherRooms}
            loading={selecting}
            onSelect={() => {
              if (!locked) onSelect(room.id);
            }}
            onPickDates={onPickDates}
          />
        </div>
      </article>
    </li>
  );
};
