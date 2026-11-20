import { Suspense } from "react";
import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import { contentLang, type Locale } from "@/shared/i18n/config";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Badge, cardClassName, PriceTag, RemoteImage } from "@/shared/ui";
import { roomStaticBadge } from "../model/room-selectability";
import { RoomAmenities, RoomCancellation, RoomFacts } from "./RoomDetails";
import { RoomStayAction } from "./RoomStayAction";
import { RoomStayActionSkeleton } from "./RoomStayActionSkeleton";

type RoomCardProps = {
  locale: Locale;
  hotelId: number;
  room: Room;
  /** O hotel tem outro tipo de quarto (os motivos de bloqueio só sugerem "outro" nesse caso). */
  otherRooms: boolean;
  cancellationPolicy: CancellationPolicy;
  criteria: Promise<SearchCriteria | null>;
};

const ROOM_IMAGE_SIZES = "(min-width: 640px) 14rem, 100vw";

/**
 * Card do quarto (Server Component). Tudo o que é do quarto vem na casca estática: foto, nome, fatos,
 * comodidades, cancelamento, selo e a diária (`R$ 800 por noite, sem taxas`). Só o que depende da
 * estadia entra pelo `RoomStayAction` (total, motivo e botão), com o mesmo rodapé como fallback.
 */
export const RoomCard = ({
  locale,
  hotelId,
  room,
  otherRooms,
  cancellationPolicy,
  criteria,
}: RoomCardProps) => {
  const [photo] = room.images;
  const badge = roomStaticBadge(room, locale);
  const badgeNode = badge ? <Badge tone={badge.tone}>{badge.text}</Badge> : null;
  const nightly = (
    <PriceTag
      locale={locale}
      variant="nightly-line"
      nightly={room.pricePerNight}
      exact
      withoutFees
    />
  );
  return (
    <li>
      <article
        className={cardClassName({
          className:
            "has-[[data-selecting]]:ring-1 has-[[data-selecting]]:ring-primary sm:flex-row",
        })}
      >
        {photo ? (
          <RemoteImage
            src={photo}
            alt=""
            sizes={ROOM_IMAGE_SIZES}
            muted={room.available <= 0}
            className="aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:min-h-42 sm:w-56"
          />
        ) : null}
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          <h3 lang={contentLang(locale)} className="text-lg font-semibold text-fg">
            {room.name}
          </h3>
          <p lang={contentLang(locale)} className="text-sm text-fg-muted">
            {room.description}
          </p>
          <RoomFacts room={room} />
          <RoomAmenities room={room} />
          <RoomCancellation policy={cancellationPolicy} />
          <Suspense fallback={<RoomStayActionSkeleton badge={badgeNode} nightly={nightly} />}>
            <RoomStayAction
              hotelId={hotelId}
              room={room}
              otherRooms={otherRooms}
              criteria={criteria}
              badge={badgeNode}
              nightly={nightly}
            />
          </Suspense>
        </div>
      </article>
    </li>
  );
};
