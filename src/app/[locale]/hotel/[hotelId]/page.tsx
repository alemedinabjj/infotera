import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  datesFormLabels,
  getHotelSnapshot,
  HotelDetailsView,
  hotelPageTitle,
  listPrerenderHotelIds,
  parseHotelId,
  STAY_EDIT_TITLE_ID,
  toStayCriteria,
} from "@/features/hotel-details";
import { localeOf } from "@/shared/i18n/params";
import { alternatesFor } from "@/shared/i18n/paths";
import { HotelDatesForm } from "./HotelDatesForm";

/**
 * ISR: todos os hotéis que a API lista viram HTML no build (com retry por causa do cold start da
 * mock-api). Id fora da lista (`/hotel/61`) recebe a casca de fallback e é gerado sob demanda.
 */
export const generateStaticParams = () => listPrerenderHotelIds();

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/hotel/[hotelId]">): Promise<Metadata> => {
  const [{ hotelId }, locale] = await Promise.all([params, localeOf(params)]);
  const id = parseHotelId(hotelId);
  if (id === null) return { title: hotelPageTitle({ kind: "not-found" }, locale) };
  const alternates = { languages: alternatesFor(`/hotel/${id}`) };
  try {
    const snapshot = await getHotelSnapshot(id);
    return {
      alternates,
      title:
        snapshot.kind === "found"
          ? hotelPageTitle({ kind: "found", name: snapshot.hotel.name }, locale)
          : hotelPageTitle({ kind: "not-found" }, locale),
    };
  } catch {
    // Metadata nunca derruba a página: o erro real aparece (com retry) no `error.tsx`.
    return { title: hotelPageTitle({ kind: "error" }, locale), alternates };
  }
};

/**
 * `/hotel/[hotelId]`. Valida o id (sem chamar a API se for inválido) e compõe a feature. Os critérios
 * da URL seguem como **promessa sem `await`** (PPR): tudo o que depende deles é buraco na casca. O
 * formulário de datas (F2) entra por `renderDatesForm`.
 */
const HotelPage = async ({ params, searchParams }: PageProps<"/[locale]/hotel/[hotelId]">) => {
  const [{ hotelId: rawId }, locale] = await Promise.all([params, localeOf(params)]);
  const hotelId = parseHotelId(rawId);
  if (hotelId === null) notFound();
  // Chamada sem `await`: a promessa só resolve por request (no prerender `searchParams` nunca resolve).
  const stayCriteria = async () => toStayCriteria(await searchParams);
  const criteria = stayCriteria();

  return (
    <HotelDetailsView
      locale={locale}
      hotelId={hotelId}
      criteria={criteria}
      renderDatesForm={(destination, resolved) => (
        <HotelDatesForm
          hotelId={hotelId}
          destination={destination}
          criteria={resolved}
          labelledBy={STAY_EDIT_TITLE_ID}
          labels={datesFormLabels(locale)}
        />
      )}
    />
  );
};

export default HotelPage;
