import type { Hotel } from "@/shared/api/schemas";
import { amenityLabel } from "@/shared/lib/labels";
import { CheckIcon } from "@/shared/ui";
import { Section } from "./Section";

/** Descrição e comodidades do hotel (RSC, sem JS). */
export const HotelOverview = ({ hotel }: { hotel: Hotel }) => (
  <Section id="visao-geral" title="Visão geral">
    <p className="max-w-prose text-fg">{hotel.description}</p>
    {hotel.amenities.length > 0 ? (
      <>
        <h3 className="text-lg font-semibold text-fg">Comodidades</h3>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-fg lg:grid-cols-3">
          {hotel.amenities.map((amenity) => (
            <li key={amenity} className="flex items-center gap-2">
              <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
              {amenityLabel(amenity)}
            </li>
          ))}
        </ul>
      </>
    ) : null}
  </Section>
);
