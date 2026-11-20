import type { Metadata } from "next";
import { connection } from "next/server";
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
import { localeOf } from "@/shared/i18n/params";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import { SearchEditForm } from "./SearchEditForm";

export const generateMetadata = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/search">): Promise<Metadata> => {
  const locale = await localeOf(params);
  // Sem `alternates`: `/search` só faz sentido com a query (destino, datas); um hreflang
  // para `/search` sem ela apontaria para uma página vazia.
  return { title: searchPageTitle(parseSearchPage(await searchParams), locale) };
};

/**
 * `/search`. O servidor só lê os critérios (destino, datas, hóspedes) e monta a casca; a lista, os
 * filtros, a ordenação e a página vivem na URL e são lidos no cliente (`HotelSearchResults`).
 */
const SearchPage = async ({ params, searchParams }: PageProps<"/[locale]/search">) => {
  const locale = await localeOf(params);
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
  // O relógio só é lido no pedido: sem isto, o prerender de runtime (1ª visita no `next start`)
  // avisa "unstable value new Date()". Só o miolo dinâmico espera; a casca do layout não muda.
  await connection();
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
