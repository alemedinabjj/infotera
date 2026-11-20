import type { Amenity, Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { GeoPoint } from "../model/distance";
import { HotelCard } from "./HotelCard";

type ResultsListProps = {
  hotels: readonly Hotel[];
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  center: GeoPoint | null;
  /** Troca de filtro/página em andamento: lista anterior esmaecida e `aria-busy`. */
  stale: boolean;
};

/** Lista de cards. `role="list"` explícito: o reset de estilo do Tailwind tira a semântica no Safari. */
export const ResultsList = ({
  hotels,
  criteria,
  selectedAmenities,
  center,
  stale,
}: ResultsListProps) => (
  <ul
    // biome-ignore lint/a11y/noRedundantRoles: sem `list-style` o VoiceOver/Safari deixa de anunciar a lista
    role="list"
    aria-busy={stale}
    className={cn("flex flex-col gap-4 transition-opacity lg:gap-6", stale && "opacity-60")}
  >
    {hotels.map((hotel, index) => (
      <li key={hotel.id}>
        <HotelCard
          hotel={hotel}
          criteria={criteria}
          selectedAmenities={selectedAmenities}
          center={center}
          priority={index === 0}
        />
      </li>
    ))}
  </ul>
);
