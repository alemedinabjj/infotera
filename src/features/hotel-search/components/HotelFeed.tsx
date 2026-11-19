import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { GeoPoint } from "../model/distance";
import { HotelCard } from "./HotelCard";

type HotelFeedProps = {
  hotels: readonly Hotel[];
  total: number;
  /** Id do h2 da contagem (rótulo do feed). */
  headingId: string;
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  center: GeoPoint | null;
  /** Troca de filtro em andamento, ou lote novo chegando: `aria-busy`. */
  busy: boolean;
  /** Lista dos filtros anteriores esmaecida. */
  stale: boolean;
};

/** Feed (padrão ARIA `feed`): cada card é um `article` com posição e tamanho do conjunto. */
export const HotelFeed = ({
  hotels,
  total,
  headingId,
  criteria,
  selectedAmenities,
  center,
  busy,
  stale,
}: HotelFeedProps) => (
  <div
    role="feed"
    aria-labelledby={headingId}
    aria-busy={busy}
    className={cn("flex flex-col gap-4 transition-opacity lg:gap-6", stale && "opacity-60")}
  >
    {hotels.map((hotel, index) => (
      <HotelCard
        key={hotel.id}
        hotel={hotel}
        criteria={criteria}
        selectedAmenities={selectedAmenities}
        center={center}
        priority={index === 0}
        feed={{ posInSet: index + 1, setSize: total, index }}
      />
    ))}
  </div>
);
