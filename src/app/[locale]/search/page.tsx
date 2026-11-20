import type { Metadata } from "next";
import {
  describeSearchSummary,
  HotelSearchResults,
  MISSING_DESTINATION_HEADING_ID,
  MissingDestination,
  parseSearchPage,
  SEARCH_EDIT_HEADING_ID,
  SearchHeader,
  searchPageKey,
  searchPageTitle,
} from "@/features/hotel-search";
import { SearchForm } from "@/features/search-form";
import { isLocale } from "@/shared/i18n/config";
import { alternatesFor } from "@/shared/i18n/paths";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import { SearchEditForm } from "./SearchEditForm";

export const generateMetadata = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/search">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: searchPageTitle(
      parseSearchPage(await searchParams),
      isLocale(locale) ? locale : "pt-BR",
    ),
    alternates: { languages: alternatesFor("/search") },
  };
};

/**
 * `/search`. O servidor só lê os critérios (destino, datas, hóspedes) e monta a casca; a lista, os
 * filtros, a ordenação e a página vivem na URL e são lidos no cliente (`HotelSearchResults`).
 */
const SearchPage = async ({ params, searchParams }: PageProps<"/[locale]/search">) => {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "pt-BR";
  const page = parseSearchPage(await searchParams);

  if (page.kind === "missing-destination") {
    return (
      <MissingDestination>
        <SearchForm labelledBy={MISSING_DESTINATION_HEADING_ID} />
      </MissingDestination>
    );
  }

  const stay = page.kind === "stay" ? page.criteria : null;
  const destination = stay?.destination ?? (page.kind === "browse" ? page.destination : "");
  const key = searchPageKey(page);
  const today = todayISO();

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <SearchHeader
        key={key}
        destination={destination}
        summary={describeSearchSummary(stay, today, locale)}
        mode={stay ? "stay" : "browse"}
        pastDates={stay ? isBeforeToday(stay.checkIn, today) : false}
        editForm={
          <SearchEditForm
            key={key}
            criteria={stay}
            destination={destination}
            labelledBy={SEARCH_EDIT_HEADING_ID}
          />
        }
      />
      <HotelSearchResults destination={destination} criteria={stay} />
    </div>
  );
};

export default SearchPage;
