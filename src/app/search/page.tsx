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
import { todayISO } from "@/shared/lib/dates";

export const generateMetadata = async ({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> => ({
  title: searchPageTitle(parseSearchPage(await searchParams)),
});

/**
 * `/search`. O servidor só lê os critérios (destino, datas, hóspedes) e monta a casca; a lista, os
 * filtros, a ordenação e a página vivem na URL e são lidos no cliente (`HotelSearchResults`).
 */
const SearchPage = async ({ searchParams }: PageProps<"/search">) => {
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

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <SearchHeader
        key={key}
        destination={destination}
        summary={describeSearchSummary(stay, todayISO())}
        mode={stay ? "stay" : "browse"}
        checkIn={stay?.checkIn ?? null}
        editForm={
          <SearchForm
            key={key}
            initialCriteria={stay ?? { destination }}
            showRecentSearches={false}
            labelledBy={SEARCH_EDIT_HEADING_ID}
          />
        }
      />
      <HotelSearchResults destination={destination} criteria={stay} />
    </div>
  );
};

export default SearchPage;
