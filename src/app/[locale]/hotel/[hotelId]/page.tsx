import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  HotelDetailsView,
  hotelPageTitle,
  loadHotel,
  parseHotelId,
  STAY_EDIT_TITLE_ID,
} from "@/features/hotel-details";
import { alternatesFor } from "@/shared/i18n/paths";
import { parseSearchCriteria } from "@/shared/lib/search-params";
import { HotelDatesForm } from "./HotelDatesForm";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/hotel/[hotelId]">): Promise<Metadata> => {
  const id = parseHotelId((await params).hotelId);
  if (id === null) return { title: hotelPageTitle({ kind: "not-found" }) };
  const alternates = { languages: alternatesFor(`/hotel/${id}`) };
  try {
    const loaded = await loadHotel(id);
    return {
      alternates,
      title:
        loaded.kind === "found"
          ? hotelPageTitle({ kind: "found", name: loaded.hotel.name })
          : hotelPageTitle({ kind: "not-found" }),
    };
  } catch {
    // Metadata nunca derruba a página: o erro real aparece (com retry) no `error.tsx`.
    return { title: hotelPageTitle({ kind: "error" }), alternates };
  }
};

/**
 * `/hotel/[hotelId]`. Valida o id (sem chamar a API se for inválido), lê os critérios da URL e
 * compõe a feature; o formulário de datas (F2) entra por `renderDatesForm`.
 */
const HotelPage = async ({ params, searchParams }: PageProps<"/[locale]/hotel/[hotelId]">) => {
  const hotelId = parseHotelId((await params).hotelId);
  if (hotelId === null) notFound();
  const parsed = parseSearchCriteria(await searchParams);
  const criteria = parsed.success ? parsed.data : null;

  return (
    <HotelDetailsView
      hotelId={hotelId}
      criteria={criteria}
      renderDatesForm={(destination) => (
        <HotelDatesForm
          hotelId={hotelId}
          destination={destination}
          criteria={criteria}
          labelledBy={STAY_EDIT_TITLE_ID}
        />
      )}
    />
  );
};

export default HotelPage;
